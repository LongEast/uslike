import { apiRequest, resolveApiAssetUrl } from "./auth.js";

export const MAX_POST_IMAGES = 9;
export const DEFAULT_PAGE_SIZE = 20;

const authHeaders = (accessToken) => ({ Authorization: `Bearer ${accessToken}` });

function withQuery(path, query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

function socialRequest(accessToken, path, options = {}) {
  return apiRequest(path, {
    ...options,
    headers: {
      ...authHeaders(accessToken),
      ...options.headers,
    },
  });
}

export function normalizeUser(rawUser) {
  if (!rawUser) return null;
  return {
    ...rawUser,
    userId: rawUser.user_id ?? rawUser.userId ?? rawUser.id,
    nickname: rawUser.nickname ?? rawUser.name ?? "已注销用户",
    avatar: resolveApiAssetUrl(rawUser.avatar),
    region: rawUser.region ?? "",
    age: rawUser.age ?? null,
    gender: rawUser.gender ?? null,
    interests: rawUser.interests ?? [],
    bio: rawUser.bio ?? rawUser.vibe ?? "",
    relationshipStatus: rawUser.relationship_status ?? rawUser.relationshipStatus ?? "none",
    pendingRequestId: rawUser.pending_request_id ?? rawUser.pendingRequestId ?? null,
  };
}

function normalizeReplyTo(rawReplyTo) {
  if (!rawReplyTo) return null;
  return {
    commentId: rawReplyTo.comment_id ?? rawReplyTo.commentId ?? rawReplyTo.id,
    author: normalizeUser(rawReplyTo.author),
    content: rawReplyTo.content ?? null,
    deleted: Boolean(rawReplyTo.deleted),
  };
}

export function normalizeComment(rawComment, includeReplies = true) {
  if (!rawComment) return null;
  const replies = includeReplies
    ? (rawComment.replies_preview ?? rawComment.replies ?? []).map((reply) => normalizeComment(reply, false))
    : [];
  return {
    ...rawComment,
    commentId: rawComment.comment_id ?? rawComment.commentId ?? rawComment.id,
    postId: rawComment.post_id ?? rawComment.postId,
    rootCommentId: rawComment.root_comment_id ?? rawComment.rootCommentId ?? null,
    author: normalizeUser(rawComment.author),
    content: rawComment.content ?? null,
    deleted: Boolean(rawComment.deleted),
    createdAt: rawComment.created_at ?? rawComment.createdAt,
    deletedAt: rawComment.deleted_at ?? rawComment.deletedAt ?? null,
    replyTo: normalizeReplyTo(rawComment.reply_to ?? rawComment.replyTo),
    likeCount: rawComment.like_count ?? rawComment.likeCount ?? 0,
    isLiked: Boolean(rawComment.is_liked ?? rawComment.isLiked),
    canDelete: Boolean(rawComment.can_delete ?? rawComment.canDelete),
    replyCount: rawComment.reply_count ?? rawComment.replyCount ?? replies.length,
    repliesPreview: replies,
    hasMoreReplies: Boolean(rawComment.has_more_replies ?? rawComment.hasMoreReplies),
  };
}

function normalizeImage(rawImage, index) {
  return {
    ...rawImage,
    imageId: rawImage.image_id ?? rawImage.imageId ?? rawImage.id ?? `image-${index}`,
    url: resolveApiAssetUrl(rawImage.url),
    contentType: rawImage.content_type ?? rawImage.contentType ?? "image/*",
    alt: rawImage.alt ?? "",
  };
}

export function normalizePost(rawPost) {
  if (!rawPost) return null;
  const commentsPreview = (rawPost.comments_preview ?? rawPost.commentsPreview ?? []).map((comment) =>
    normalizeComment(comment),
  );
  return {
    ...rawPost,
    postId: rawPost.post_id ?? rawPost.postId ?? rawPost.id,
    author: normalizeUser(rawPost.author),
    content: rawPost.content ?? rawPost.body ?? rawPost.text ?? "",
    tags: rawPost.tags ?? [],
    images: (rawPost.images ?? []).map(normalizeImage),
    linkUrl: rawPost.link_url ?? rawPost.linkUrl ?? null,
    createdAt: rawPost.created_at ?? rawPost.createdAt,
    likeCount: rawPost.like_count ?? rawPost.likeCount ?? 0,
    commentCount: rawPost.comment_count ?? rawPost.commentCount ?? 0,
    isLiked: Boolean(rawPost.is_liked ?? rawPost.isLiked),
    isBookmarked: Boolean(rawPost.is_bookmarked ?? rawPost.isBookmarked),
    canDelete: Boolean(rawPost.can_delete ?? rawPost.canDelete),
    deleted: Boolean(rawPost.deleted),
    deletedAt: rawPost.deleted_at ?? rawPost.deletedAt ?? null,
    commentsPreview,
    hasMoreComments: Boolean(rawPost.has_more_comments ?? rawPost.hasMoreComments),
  };
}

export function normalizePage(payload, normalizeItem = (item) => item) {
  const rawItems = Array.isArray(payload) ? payload : payload?.items ?? [];
  return {
    items: rawItems.map(normalizeItem).filter(Boolean),
    nextCursor: Array.isArray(payload) ? null : payload?.next_cursor ?? payload?.nextCursor ?? null,
    meta: Array.isArray(payload) ? {} : payload?.meta ?? {},
  };
}

export function mergeUniqueById(existing, incoming, idKey) {
  const merged = [...existing];
  const indexById = new Map(existing.map((item, index) => [item[idKey], index]));
  incoming.forEach((item) => {
    const existingIndex = indexById.get(item[idKey]);
    if (existingIndex === undefined) {
      indexById.set(item[idKey], merged.length);
      merged.push(item);
    } else {
      merged[existingIndex] = { ...merged[existingIndex], ...item };
    }
  });
  return merged;
}

export function updateById(items, idKey, id, updater) {
  return items.map((item) => (item[idKey] === id ? updater(item) : item));
}

export function isHttpUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validatePostDraft({ content = "", images = [], linkUrl = "" }) {
  const errors = {};
  if (images.length > MAX_POST_IMAGES) errors.images = `最多只能添加 ${MAX_POST_IMAGES} 张图片。`;
  if (images.some((image) => image?.type && !image.type.startsWith("image/"))) {
    errors.images = "只能上传图片文件。";
  }
  if (linkUrl && !isHttpUrl(linkUrl)) errors.linkUrl = "链接必须以 http:// 或 https:// 开头。";
  if (!content.trim() && images.length === 0 && !linkUrl.trim()) errors.content = "写点内容、添加图片或链接后再发布。";
  return errors;
}

export function createPostFormData({ content = "", linkUrl = "", tags = [], images = [] }) {
  const errors = validatePostDraft({ content, images, linkUrl });
  if (Object.keys(errors).length) {
    const error = new Error(Object.values(errors)[0]);
    error.validation = errors;
    throw error;
  }
  const body = new FormData();
  body.append("content", content.trim());
  if (linkUrl.trim()) body.append("link_url", linkUrl.trim());
  [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))].forEach((tag) => body.append("tags", tag));
  images.forEach((image) => body.append("images", image));
  return body;
}

export async function getFeed(
  accessToken,
  { cursor, limit = DEFAULT_PAGE_SIZE, commentScope = "friends" } = {},
) {
  const payload = await socialRequest(
    accessToken,
    withQuery("/api/feed", { cursor, limit, comment_scope: commentScope }),
    { method: "GET" },
  );
  return normalizePage(payload, normalizePost);
}

export async function createPost(accessToken, draft) {
  const payload = await socialRequest(accessToken, "/api/posts", {
    method: "POST",
    body: createPostFormData(draft),
  });
  return normalizePost(payload);
}

export async function getPost(accessToken, postId) {
  return normalizePost(await socialRequest(accessToken, `/api/posts/${postId}`, { method: "GET" }));
}

export function deletePost(accessToken, postId) {
  return socialRequest(accessToken, `/api/posts/${postId}`, { method: "DELETE" });
}

export async function setPostLiked(accessToken, postId, liked) {
  return socialRequest(accessToken, `/api/posts/${postId}/like`, { method: liked ? "PUT" : "DELETE" });
}

export async function setPostBookmarked(accessToken, postId, bookmarked) {
  return socialRequest(accessToken, `/api/posts/${postId}/bookmark`, {
    method: bookmarked ? "PUT" : "DELETE",
  });
}

export async function getBookmarks(accessToken, { cursor, limit = DEFAULT_PAGE_SIZE } = {}) {
  const payload = await socialRequest(accessToken, withQuery("/api/bookmarks", { cursor, limit }), { method: "GET" });
  return normalizePage(payload, normalizePost);
}

export async function getPostComments(accessToken, postId, { cursor, limit = DEFAULT_PAGE_SIZE } = {}) {
  const payload = await socialRequest(
    accessToken,
    withQuery(`/api/posts/${postId}/comments`, { cursor, limit }),
    { method: "GET" },
  );
  return normalizePage(payload, normalizeComment);
}

export async function createComment(accessToken, postId, content, replyToCommentId = null) {
  const payload = await socialRequest(accessToken, `/api/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content: content.trim(), reply_to_comment_id: replyToCommentId }),
  });
  return normalizeComment(payload);
}

export async function getCommentReplies(accessToken, rootCommentId, { cursor, limit = DEFAULT_PAGE_SIZE } = {}) {
  const payload = await socialRequest(
    accessToken,
    withQuery(`/api/comments/${rootCommentId}/replies`, { cursor, limit }),
    { method: "GET" },
  );
  return normalizePage(payload, normalizeComment);
}

export async function getCommentContext(accessToken, commentId) {
  const payload = await socialRequest(accessToken, `/api/comments/${commentId}`, { method: "GET" });
  if (payload?.comment) {
    return {
      ...payload,
      comment: normalizeComment(payload.comment),
      root: normalizeComment(payload.root),
    };
  }
  return { comment: normalizeComment(payload), root: null };
}

export function deleteComment(accessToken, commentId) {
  return socialRequest(accessToken, `/api/comments/${commentId}`, { method: "DELETE" });
}

export function setCommentLiked(accessToken, commentId, liked) {
  return socialRequest(accessToken, `/api/comments/${commentId}/like`, {
    method: liked ? "PUT" : "DELETE",
  });
}

export async function getUser(accessToken, userId) {
  return normalizeUser(await socialRequest(accessToken, `/api/users/${userId}`, { method: "GET" }));
}

export async function getUserPosts(accessToken, userId, { cursor, limit = DEFAULT_PAGE_SIZE } = {}) {
  const payload = await socialRequest(
    accessToken,
    withQuery(`/api/users/${userId}/posts`, { cursor, limit }),
    { method: "GET" },
  );
  return normalizePage(payload, normalizePost);
}

export async function getUserSuggestions(accessToken, { cursor, limit = DEFAULT_PAGE_SIZE } = {}) {
  const payload = await socialRequest(
    accessToken,
    withQuery("/api/users/suggestions", { cursor, limit }),
    { method: "GET" },
  );
  return normalizePage(payload, normalizeUser);
}

export async function getFriends(accessToken, { cursor, limit = DEFAULT_PAGE_SIZE } = {}) {
  const payload = await socialRequest(accessToken, withQuery("/api/friends", { cursor, limit }), { method: "GET" });
  return normalizePage(payload, normalizeUser);
}

export async function getFriendRequests(accessToken, direction, { cursor, limit = DEFAULT_PAGE_SIZE } = {}) {
  return normalizePage(
    await socialRequest(
      accessToken,
      withQuery("/api/friend-requests", { direction, cursor, limit }),
      { method: "GET" },
    ),
  );
}

export function sendFriendRequest(accessToken, recipientUserId) {
  return socialRequest(accessToken, "/api/friend-requests", {
    method: "POST",
    body: JSON.stringify({ recipient_user_id: recipientUserId }),
  });
}

export function decideFriendRequest(accessToken, requestId, decision) {
  return socialRequest(accessToken, `/api/friend-requests/${requestId}`, {
    method: "PATCH",
    body: JSON.stringify({ decision }),
  });
}

export function cancelFriendRequest(accessToken, requestId) {
  return socialRequest(accessToken, `/api/friend-requests/${requestId}`, { method: "DELETE" });
}

export function removeFriend(accessToken, userId) {
  return socialRequest(accessToken, `/api/friends/${userId}`, { method: "DELETE" });
}

export function getShareUrl(postId, location = window.location) {
  return new URL(`/mvp/posts/${encodeURIComponent(postId)}`, location.origin).toString();
}
