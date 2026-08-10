import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as socialApi from "../services/social.js";
import { SocialContext, useSocialData } from "./socialContext.js";
import { SocialModalHost } from "./SocialModal.jsx";

const emptyCollection = () => ({ ids: [], nextCursor: null, loaded: false, loading: false, error: "" });
const userPostsKey = (userId) => `user:${userId}`;

function mergeIds(current, additions) {
  return [...new Set([...current, ...additions])];
}

function asMessage(error) {
  return error?.message || "请求失败，请稍后重试。";
}

export { useSocialData };

export default function SocialProvider({
  accessToken,
  currentUser,
  children,
  api = socialApi,
  onAuthError,
  onToast,
  renderModalHost = true,
}) {
  const [postsById, setPostsById] = useState({});
  const [commentsById, setCommentsById] = useState({});
  const [profilesById, setProfilesById] = useState({});
  const [collections, setCollections] = useState({ feed: emptyCollection(), bookmarks: emptyCollection() });
  const [threadsByPost, setThreadsByPost] = useState({});
  const [repliesByRoot, setRepliesByRoot] = useState({});
  const [profileStatus, setProfileStatus] = useState({});
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState({ incoming: [], outgoing: [] });
  const [suggestions, setSuggestions] = useState([]);
  const [peopleStatus, setPeopleStatus] = useState({
    friends: { loading: false, error: "" },
    incoming: { loading: false, error: "" },
    outgoing: { loading: false, error: "" },
    suggestions: { loading: false, error: "" },
  });
  const [pending, setPending] = useState(() => new Set());
  const [modal, setModal] = useState({ type: null, userId: null, returnFocus: null });
  const collectionsRef = useRef(collections);
  const threadsRef = useRef(threadsByPost);
  const repliesRef = useRef(repliesByRoot);
  const postsRef = useRef(postsById);
  const commentsRef = useRef(commentsById);

  useEffect(() => {
    collectionsRef.current = collections;
  }, [collections]);
  useEffect(() => {
    threadsRef.current = threadsByPost;
  }, [threadsByPost]);
  useEffect(() => {
    repliesRef.current = repliesByRoot;
  }, [repliesByRoot]);
  useEffect(() => {
    postsRef.current = postsById;
  }, [postsById]);
  useEffect(() => {
    commentsRef.current = commentsById;
  }, [commentsById]);

  useEffect(() => {
    setPostsById({});
    setCommentsById({});
    setProfilesById({});
    setCollections({ feed: emptyCollection(), bookmarks: emptyCollection() });
    setThreadsByPost({});
    setRepliesByRoot({});
    setProfileStatus({});
    setFriends([]);
    setFriendRequests({ incoming: [], outgoing: [] });
    setSuggestions([]);
    setPeopleStatus({
      friends: { loading: false, error: "" },
      incoming: { loading: false, error: "" },
      outgoing: { loading: false, error: "" },
      suggestions: { loading: false, error: "" },
    });
    setPending(new Set());
    setModal({ type: null, userId: null, returnFocus: null });
  }, [accessToken]);

  const reportError = useCallback(
    (error) => {
      if (error?.status === 401) onAuthError?.(error);
      else onToast?.(asMessage(error));
    },
    [onAuthError, onToast],
  );

  const markPending = useCallback((key, value) => {
    setPending((current) => {
      const next = new Set(current);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const ingestUsers = useCallback((users) => {
    setProfilesById((current) => {
      const next = { ...current };
      users.filter(Boolean).forEach((user) => {
        if (user.userId) next[user.userId] = { ...next[user.userId], ...user };
      });
      return next;
    });
  }, []);

  const ingestComments = useCallback((comments, fallbackPostId = null) => {
    const flatComments = [];
    comments.filter(Boolean).forEach((comment) => {
      flatComments.push(comment);
      comment.repliesPreview?.forEach((reply) => flatComments.push(reply));
    });
    setCommentsById((current) => {
      const next = { ...current };
      flatComments.forEach((comment) => {
        next[comment.commentId] = { ...next[comment.commentId], ...comment };
      });
      return next;
    });
    ingestUsers(flatComments.map((comment) => comment.author));
    setThreadsByPost((current) => {
      const next = { ...current };
      comments.forEach((root) => {
        const postId = root.postId ?? fallbackPostId;
        if (!postId || root.rootCommentId) return;
        const thread = next[postId] ?? { rootIds: [], nextCursor: null, loaded: false, loading: false, error: "" };
        next[postId] = { ...thread, rootIds: mergeIds(thread.rootIds, [root.commentId]) };
      });
      return next;
    });
    setRepliesByRoot((current) => {
      const next = { ...current };
      comments.forEach((root) => {
        if (root.rootCommentId) return;
        const replyState = next[root.commentId] ?? {
          ids: [],
          nextCursor: null,
          loaded: false,
          loading: false,
          error: "",
        };
        const previewIds = (root.repliesPreview ?? []).map((reply) => reply.commentId);
        next[root.commentId] = {
          ...replyState,
          ids: mergeIds(replyState.ids, previewIds),
          nextCursor: replyState.loaded ? replyState.nextCursor : root.hasMoreReplies ? "preview" : null,
        };
      });
      return next;
    });
  }, [ingestUsers]);

  const ingestPosts = useCallback(
    (posts) => {
      setPostsById((current) => {
        const next = { ...current };
        posts.filter(Boolean).forEach((post) => {
          next[post.postId] = { ...next[post.postId], ...post };
        });
        return next;
      });
      ingestUsers(posts.map((post) => post.author));
      posts.forEach((post) => ingestComments(post.commentsPreview ?? [], post.postId));
    },
    [ingestComments, ingestUsers],
  );

  const patchPost = useCallback((postId, patch) => {
    setPostsById((current) => ({
      ...current,
      [postId]: { ...current[postId], ...(typeof patch === "function" ? patch(current[postId]) : patch) },
    }));
  }, []);

  const patchComment = useCallback((commentId, patch) => {
    setCommentsById((current) => ({
      ...current,
      [commentId]: {
        ...current[commentId],
        ...(typeof patch === "function" ? patch(current[commentId]) : patch),
      },
    }));
  }, []);

  const putCollectionPage = useCallback(
    (key, page, reset) => {
      ingestPosts(page.items);
      setCollections((current) => {
        const previous = current[key] ?? emptyCollection();
        return {
          ...current,
          [key]: {
            ids: reset ? page.items.map((post) => post.postId) : mergeIds(previous.ids, page.items.map((post) => post.postId)),
            nextCursor: page.nextCursor,
            loaded: true,
            loading: false,
            error: "",
          },
        };
      });
    },
    [ingestPosts],
  );

  const loadCollection = useCallback(
    async (key, loader, { reset = false } = {}) => {
      const current = collectionsRef.current[key] ?? emptyCollection();
      if (current.loading || (!reset && current.loaded && !current.nextCursor)) return null;
      setCollections((state) => ({
        ...state,
        [key]: { ...(state[key] ?? emptyCollection()), loading: true, error: "" },
      }));
      try {
        const page = await loader(reset ? null : current.nextCursor);
        putCollectionPage(key, page, reset);
        return page;
      } catch (error) {
        setCollections((state) => ({
          ...state,
          [key]: { ...(state[key] ?? emptyCollection()), loading: false, error: asMessage(error) },
        }));
        reportError(error);
        return null;
      }
    },
    [putCollectionPage, reportError],
  );

  const loadFeed = useCallback(
    ({ reset = false, commentScope = "friends" } = {}) =>
      loadCollection("feed", (cursor) => api.getFeed(accessToken, { cursor, commentScope }), { reset }),
    [accessToken, api, loadCollection],
  );

  const loadBookmarks = useCallback(
    ({ reset = false } = {}) =>
      loadCollection("bookmarks", (cursor) => api.getBookmarks(accessToken, { cursor }), { reset }),
    [accessToken, api, loadCollection],
  );

  const loadUserPosts = useCallback(
    (userId, { reset = false } = {}) => {
      const key = userPostsKey(userId);
      return loadCollection(key, (cursor) => api.getUserPosts(accessToken, userId, { cursor }), { reset });
    },
    [accessToken, api, loadCollection],
  );

  const loadProfile = useCallback(
    async (userId, { force = false } = {}) => {
      if (!force && profilesById[userId]) return profilesById[userId];
      setProfileStatus((current) => ({ ...current, [userId]: { loading: true, error: "" } }));
      try {
        const profile = await api.getUser(accessToken, userId);
        ingestUsers([profile]);
        setProfileStatus((current) => ({ ...current, [userId]: { loading: false, error: "" } }));
        return profile;
      } catch (error) {
        setProfileStatus((current) => ({
          ...current,
          [userId]: { loading: false, error: asMessage(error) },
        }));
        reportError(error);
        return null;
      }
    },
    [accessToken, api, ingestUsers, profilesById, reportError],
  );

  const publishPost = useCallback(
    async (draft) => {
      if (pending.has("post:create")) return null;
      markPending("post:create", true);
      try {
        const post = await api.createPost(accessToken, draft);
        ingestPosts([post]);
        const ownerId = currentUser?.userId ?? currentUser?.user_id ?? currentUser?.id;
        setCollections((current) => {
          const next = { ...current };
          ["feed", ownerId ? userPostsKey(ownerId) : null].filter(Boolean).forEach((key) => {
            const collection = next[key] ?? emptyCollection();
            next[key] = { ...collection, loaded: true, ids: mergeIds([post.postId], collection.ids) };
          });
          return next;
        });
        onToast?.("动态发布成功");
        return post;
      } catch (error) {
        reportError(error);
        throw error;
      } finally {
        markPending("post:create", false);
      }
    },
    [accessToken, api, currentUser, ingestPosts, markPending, onToast, pending, reportError],
  );

  const togglePostLike = useCallback(
    async (postId) => {
      const key = `post:${postId}:like`;
      if (pending.has(key)) return;
      const before = postsRef.current[postId];
      if (!before || before.deleted) return;
      const desired = !before.isLiked;
      markPending(key, true);
      patchPost(postId, { isLiked: desired, likeCount: Math.max(0, before.likeCount + (desired ? 1 : -1)) });
      try {
        const result = await api.setPostLiked(accessToken, postId, desired);
        patchPost(postId, {
          isLiked: Boolean(result.liked),
          likeCount: result.like_count ?? postsRef.current[postId]?.likeCount ?? 0,
        });
      } catch (error) {
        patchPost(postId, { isLiked: before.isLiked, likeCount: before.likeCount });
        reportError(error);
      } finally {
        markPending(key, false);
      }
    },
    [accessToken, api, markPending, patchPost, pending, reportError],
  );

  const togglePostBookmark = useCallback(
    async (postId) => {
      const key = `post:${postId}:bookmark`;
      if (pending.has(key)) return;
      const before = postsRef.current[postId];
      if (!before || before.deleted) return;
      const desired = !before.isBookmarked;
      markPending(key, true);
      patchPost(postId, { isBookmarked: desired });
      setCollections((current) => {
        const bookmarks = current.bookmarks ?? emptyCollection();
        return {
          ...current,
          bookmarks: {
            ...bookmarks,
            ids: desired ? mergeIds([postId], bookmarks.ids) : bookmarks.ids.filter((id) => id !== postId),
          },
        };
      });
      try {
        const result = await api.setPostBookmarked(accessToken, postId, desired);
        patchPost(postId, { isBookmarked: Boolean(result.bookmarked) });
      } catch (error) {
        patchPost(postId, { isBookmarked: before.isBookmarked });
        setCollections((current) => {
          const bookmarks = current.bookmarks ?? emptyCollection();
          return {
            ...current,
            bookmarks: {
              ...bookmarks,
              ids: before.isBookmarked ? mergeIds([postId], bookmarks.ids) : bookmarks.ids.filter((id) => id !== postId),
            },
          };
        });
        reportError(error);
      } finally {
        markPending(key, false);
      }
    },
    [accessToken, api, markPending, patchPost, pending, reportError],
  );

  const removePost = useCallback(
    async (postId) => {
      const key = `post:${postId}:delete`;
      if (pending.has(key)) return false;
      markPending(key, true);
      try {
        const result = await api.deletePost(accessToken, postId);
        patchPost(postId, {
          deleted: true,
          content: "",
          images: [],
          linkUrl: null,
          deletedAt: result?.deleted_at ?? new Date().toISOString(),
        });
        setCollections((current) => Object.fromEntries(Object.entries(current).map(([collectionKey, collection]) => [
          collectionKey,
          { ...collection, ids: collection.ids.filter((id) => id !== postId) },
        ])));
        onToast?.("动态已删除");
        return true;
      } catch (error) {
        reportError(error);
        return false;
      } finally {
        markPending(key, false);
      }
    },
    [accessToken, api, markPending, onToast, patchPost, pending, reportError],
  );

  const loadPostComments = useCallback(
    async (postId, { reset = false } = {}) => {
      const current = threadsRef.current[postId] ?? {
        rootIds: [], nextCursor: null, loaded: false, loading: false, error: "",
      };
      if (current.loading || (!reset && current.loaded && !current.nextCursor)) return null;
      setThreadsByPost((state) => ({ ...state, [postId]: { ...current, loading: true, error: "" } }));
      try {
        const page = await api.getPostComments(accessToken, postId, { cursor: reset ? null : current.nextCursor });
        ingestComments(page.items, postId);
        setThreadsByPost((state) => ({
          ...state,
          [postId]: {
            rootIds: reset ? page.items.map((item) => item.commentId) : mergeIds(current.rootIds, page.items.map((item) => item.commentId)),
            nextCursor: page.nextCursor,
            loaded: true,
            loading: false,
            error: "",
          },
        }));
        return page;
      } catch (error) {
        setThreadsByPost((state) => ({
          ...state,
          [postId]: { ...current, loading: false, error: asMessage(error) },
        }));
        reportError(error);
        return null;
      }
    },
    [accessToken, api, ingestComments, reportError],
  );

  const loadReplies = useCallback(
    async (rootCommentId, { reset = false } = {}) => {
      const current = repliesRef.current[rootCommentId] ?? {
        ids: [], nextCursor: null, loaded: false, loading: false, error: "",
      };
      if (current.loading || (!reset && current.loaded && !current.nextCursor)) return null;
      setRepliesByRoot((state) => ({ ...state, [rootCommentId]: { ...current, loading: true, error: "" } }));
      try {
        const page = await api.getCommentReplies(accessToken, rootCommentId, {
          cursor: reset || current.nextCursor === "preview" ? null : current.nextCursor,
        });
        ingestComments(page.items);
        setRepliesByRoot((state) => ({
          ...state,
          [rootCommentId]: {
            ids: reset || current.nextCursor === "preview"
              ? page.items.map((item) => item.commentId)
              : mergeIds(current.ids, page.items.map((item) => item.commentId)),
            nextCursor: page.nextCursor,
            loaded: true,
            loading: false,
            error: "",
          },
        }));
        return page;
      } catch (error) {
        setRepliesByRoot((state) => ({
          ...state,
          [rootCommentId]: { ...current, loading: false, error: asMessage(error) },
        }));
        reportError(error);
        return null;
      }
    },
    [accessToken, api, ingestComments, reportError],
  );

  const submitComment = useCallback(
    async (postId, content, replyToCommentId = null) => {
      if (!content.trim()) return null;
      const key = `comment:${postId}:create`;
      if (pending.has(key)) return null;
      markPending(key, true);
      try {
        const comment = await api.createComment(accessToken, postId, content, replyToCommentId);
        ingestComments([comment], postId);
        if (comment.rootCommentId) {
          const rootId = comment.rootCommentId;
          setRepliesByRoot((state) => {
            const replies = state[rootId] ?? { ids: [], nextCursor: null, loaded: true, loading: false, error: "" };
            return { ...state, [rootId]: { ...replies, ids: mergeIds(replies.ids, [comment.commentId]) } };
          });
          patchComment(rootId, (root) => ({ replyCount: (root?.replyCount ?? 0) + 1 }));
        } else {
          setThreadsByPost((state) => {
            const thread = state[postId] ?? { rootIds: [], nextCursor: null, loaded: true, loading: false, error: "" };
            return { ...state, [postId]: { ...thread, rootIds: mergeIds([comment.commentId], thread.rootIds) } };
          });
        }
        patchPost(postId, (post) => ({ commentCount: (post?.commentCount ?? 0) + 1 }));
        return comment;
      } catch (error) {
        reportError(error);
        throw error;
      } finally {
        markPending(key, false);
      }
    },
    [accessToken, api, ingestComments, markPending, patchComment, patchPost, pending, reportError],
  );

  const toggleCommentLike = useCallback(
    async (commentId) => {
      const key = `comment:${commentId}:like`;
      if (pending.has(key)) return;
      const before = commentsRef.current[commentId];
      if (!before || before.deleted) return;
      const desired = !before.isLiked;
      markPending(key, true);
      patchComment(commentId, { isLiked: desired, likeCount: Math.max(0, before.likeCount + (desired ? 1 : -1)) });
      try {
        const result = await api.setCommentLiked(accessToken, commentId, desired);
        patchComment(commentId, { isLiked: Boolean(result.liked), likeCount: result.like_count ?? before.likeCount });
      } catch (error) {
        patchComment(commentId, { isLiked: before.isLiked, likeCount: before.likeCount });
        reportError(error);
      } finally {
        markPending(key, false);
      }
    },
    [accessToken, api, markPending, patchComment, pending, reportError],
  );

  const removeComment = useCallback(
    async (commentId) => {
      const key = `comment:${commentId}:delete`;
      if (pending.has(key)) return false;
      const before = commentsRef.current[commentId];
      if (!before) return false;
      markPending(key, true);
      try {
        const result = await api.deleteComment(accessToken, commentId);
        const tombstone = result?.comment_id ? api.normalizeComment?.(result) : null;
        patchComment(commentId, tombstone ?? {
          content: null,
          deleted: true,
          deletedAt: result?.deleted_at ?? new Date().toISOString(),
          isLiked: false,
          likeCount: 0,
          canDelete: false,
        });
        patchPost(before.postId, (post) => ({ commentCount: Math.max(0, (post?.commentCount ?? 1) - 1) }));
        return true;
      } catch (error) {
        reportError(error);
        return false;
      } finally {
        markPending(key, false);
      }
    },
    [accessToken, api, markPending, patchComment, patchPost, pending, reportError],
  );

  const jumpToComment = useCallback(
    async (commentId) => {
      let target = commentsRef.current[commentId];
      if (!target) {
        try {
          const context = await api.getCommentContext(accessToken, commentId);
          const additions = [context.root, context.comment].filter(Boolean);
          ingestComments(additions, context.comment?.postId);
          target = context.comment;
        } catch (error) {
          reportError(error);
          return;
        }
      }
      window.requestAnimationFrame(() => {
        const selectorId = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(commentId) : commentId.replaceAll('"', '\\"');
        const node = document.querySelector(`[data-comment-id="${selectorId}"]`);
        if (!node) return;
        node.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
        node.focus({ preventScroll: true });
        node.dataset.highlighted = "true";
        window.setTimeout(() => delete node.dataset.highlighted, 1600);
      });
    },
    [accessToken, api, ingestComments, reportError],
  );

  const updateRelationship = useCallback((userId, relationshipStatus, pendingRequestId = null) => {
    setProfilesById((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        relationshipStatus,
        pendingRequestId,
      },
    }));
  }, []);

  const requestFriendship = useCallback(
    async (userId) => {
      const result = await api.sendFriendRequest(accessToken, userId);
      updateRelationship(userId, "outgoing_pending", result.request_id ?? result.pending_request_id);
      return result;
    },
    [accessToken, api, updateRelationship],
  );

  const decideFriendship = useCallback(
    async (requestId, decision, userId) => {
      const result = await api.decideFriendRequest(accessToken, requestId, decision);
      updateRelationship(userId, decision === "accept" ? "friends" : "none", null);
      if (decision === "accept") loadFeed({ reset: true });
      return result;
    },
    [accessToken, api, loadFeed, updateRelationship],
  );

  const cancelFriendship = useCallback(
    async (requestId, userId) => {
      await api.cancelFriendRequest(accessToken, requestId);
      updateRelationship(userId, "none", null);
    },
    [accessToken, api, updateRelationship],
  );

  const unfriend = useCallback(
    async (userId) => {
      await api.removeFriend(accessToken, userId);
      updateRelationship(userId, "none", null);
      setCollections((current) => ({
        ...current,
        feed: {
          ...(current.feed ?? emptyCollection()),
          ids: (current.feed?.ids ?? []).filter((postId) => postsRef.current[postId]?.author?.userId !== userId),
        },
      }));
    },
    [accessToken, api, updateRelationship],
  );

  const openProfile = useCallback((userId, returnFocus = document.activeElement) => {
    setModal({ type: "profile", userId, returnFocus });
  }, []);
  const openBookmarks = useCallback((returnFocus = document.activeElement) => {
    setModal({ type: "bookmarks", userId: null, returnFocus });
  }, []);
  const closeSocialModal = useCallback(() => {
    setModal((current) => {
      const focusTarget = current.returnFocus;
      window.requestAnimationFrame(() => {
        if (focusTarget?.isConnected) focusTarget.focus();
      });
      return { type: null, userId: null, returnFocus: null };
    });
  }, []);

  const getPostsForCollection = useCallback(
    (key) => (collections[key]?.ids ?? []).map((id) => postsById[id]).filter((post) => post && !post.deleted),
    [collections, postsById],
  );

  const value = useMemo(
    () => ({
      accessToken,
      currentUser,
      postsById,
      commentsById,
      profilesById,
      collections,
      threadsByPost,
      repliesByRoot,
      profileStatus,
      pending,
      modal,
      feedPosts: getPostsForCollection("feed"),
      bookmarkedPosts: getPostsForCollection("bookmarks"),
      getUserPosts: (userId) => getPostsForCollection(userPostsKey(userId)),
      loadFeed,
      loadBookmarks,
      loadUserPosts,
      loadProfile,
      publishPost,
      togglePostLike,
      togglePostBookmark,
      removePost,
      loadPostComments,
      loadReplies,
      submitComment,
      toggleCommentLike,
      removeComment,
      jumpToComment,
      requestFriendship,
      decideFriendship,
      cancelFriendship,
      unfriend,
      openProfile,
      openBookmarks,
      closeSocialModal,
    }),
    [
      accessToken, cancelFriendship, closeSocialModal, collections, commentsById, currentUser,
      decideFriendship, getPostsForCollection, jumpToComment, loadBookmarks, loadFeed, loadPostComments,
      loadProfile, loadReplies, loadUserPosts, modal, openBookmarks, openProfile, pending, postsById,
      profileStatus, profilesById, publishPost, removeComment, removePost, repliesByRoot, requestFriendship,
      submitComment, threadsByPost, toggleCommentLike, togglePostBookmark, togglePostLike, unfriend,
    ],
  );

  return (
    <SocialContext.Provider value={value}>
      {children}
      {renderModalHost ? <SocialModalHost social={value} /> : null}
    </SocialContext.Provider>
  );
}
