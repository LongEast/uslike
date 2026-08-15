import {
  ArrowLeft,
  Bell,
  Box,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  Gamepad2,
  Gift,
  Image,
  ImagePlus,
  Link,
  LogOut,
  MessageCircle,
  Mic,
  Minus,
  MoreHorizontal,
  PenLine,
  PhoneCall,
  Plus,
  QrCode,
  Radio,
  RefreshCw,
  Search,
  Send,
  Settings,
  Share2,
  Smile,
  Smartphone,
  Star,
  Store,
  ThumbsUp,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { filterFeedByChannel, filterInteractionsByFriendship } from "../utils/feedFilter.js";
import { FRIEND_INDEX_LABELS, groupFriendsByInitial } from "../utils/friendIndex.js";
import Avatar from "./Avatar.jsx";
import AccountSettingsView from "./AccountSettingsView.jsx";
import { CheckInCard } from "./CoinWalletUI.jsx";
import Modal from "./Modal.jsx";
import PublicProfileDetails, { normalizePublicProfile } from "./PublicProfileDetails.jsx";

const getFeedAuthorProfile = (item) => normalizePublicProfile({
  id: item.authorId || `feed-author-${item.user}`,
  nickname: item.user,
  avatar: item.avatar,
  age: item.age,
  gender: item.gender,
  region: item.region,
  interests: item.interests || item.tags,
  vibe: item.bio || item.status,
  status: item.status,
});

export function FeedView({ feed, onOpenUser }) {
  const [showNonFriendComments, setShowNonFriendComments] = useState(false);
  const visibleFeed = useMemo(
    () => filterFeedByChannel(feed, "friends"),
    [feed],
  );

  return (
    <section className="mx-auto w-full max-w-3xl pb-32 pt-24">
      <div className="mb-5">
        <div>
          <h2 className="text-3xl font-semibold text-stone-800">空间动态</h2>
          <p className="mt-1.5 text-sm text-stone-500">看看好友最近在分享什么</p>
        </div>
      </div>

      <div className="mb-5 overflow-hidden rounded-[28px] border border-white/76 bg-white/72 shadow-soft backdrop-blur-xl">
        <div className="flex min-h-[96px] border-b border-stone-100/90">
          <textarea
            placeholder="说点儿什么吧"
            className="min-w-0 flex-1 resize-none bg-transparent px-5 py-4 text-lg text-stone-700 outline-none placeholder:text-stone-400"
          />
          <div className="flex shrink-0 border-l border-stone-100/90">
            <button
              className="grid w-[72px] place-items-center px-5 text-stone-500 transition hover:bg-white/70 hover:text-[#6966dd]"
              title="添加图片"
            >
              <Camera size={28} />
            </button>
            <button
              className="grid w-[72px] place-items-center border-l border-stone-100/90 px-5 text-stone-500 transition hover:bg-white/70 hover:text-[#6966dd]"
              title="添加链接"
            >
              <Link size={28} />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <button className="text-base font-semibold text-stone-800 transition hover:text-[#6966dd]">
            与我相关
          </button>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setShowNonFriendComments((value) => !value)}
              aria-pressed={showNonFriendComments}
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 transition hover:text-stone-900"
            >
              <span
                className={`grid h-5 w-5 place-items-center rounded border ${
                  showNonFriendComments
                    ? "glass-choice-active"
                    : "border-stone-300 bg-white/48 text-transparent backdrop-blur-xl"
                }`}
              >
                <Check size={14} />
              </span>
              显示非好友互动
            </button>
            <button
              className="rounded-full p-2 text-stone-400 transition hover:bg-white/70 hover:text-[#6966dd]"
              title="刷新"
            >
              <RefreshCw size={21} />
            </button>
            <button className="aurora-dark rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:brightness-110">
              发布
            </button>
          </div>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-[34px] border border-white/76 bg-white/58 shadow-soft backdrop-blur-xl"
        aria-label="好友动态"
      >
        <div className="flex items-center justify-between border-b border-white/70 bg-white/42 px-5 py-3 text-sm">
          <span className="font-semibold text-stone-700">只看好友</span>
          <span className="text-stone-400" aria-live="polite">
            {visibleFeed.length} 条动态
          </span>
        </div>
        {visibleFeed.length ? visibleFeed.map((item) => {
          const visibleLikes = filterInteractionsByFriendship(item.likes, showNonFriendComments);
          const visibleComments = filterInteractionsByFriendship(item.comments, showNonFriendComments);
          const author = getFeedAuthorProfile(item);

          return (
          <article key={item.id} className="border-b border-stone-100/90 bg-white/64 px-5 py-6 last:border-b-0">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={(event) => onOpenUser?.(author, event.currentTarget)}
                aria-label={`查看 ${item.user} 的动态`}
                data-profile-user-id={author.id}
                data-profile-trigger="avatar"
                className="shrink-0 rounded-full transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7770d8]/55"
              >
                <Avatar src={item.avatar} name={item.user} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3>
                        <button
                          type="button"
                          onClick={(event) => onOpenUser?.(author, event.currentTarget)}
                          data-profile-user-id={author.id}
                          data-profile-trigger="name"
                          className="rounded text-lg font-semibold text-stone-800 transition hover:text-[#6966dd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7770d8]/55"
                        >
                          {item.user}
                        </button>
                      </h3>
                      {item.badge ? (
                        <span className="glass-choice-active rounded-full px-2 py-1 text-[11px] font-semibold">
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-stone-400">{item.status}</p>
                  </div>
                  <button className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700">
                    <MoreHorizontal size={20} />
                  </button>
                </div>

                <p className="mt-4 whitespace-pre-line text-[22px] leading-9 text-stone-900">{item.text}</p>

                {item.tags?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-white/58 px-3 py-1.5 text-xs font-semibold text-[#5d6387] backdrop-blur-xl">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex items-center justify-between gap-4 text-sm text-stone-400">
                  <span>{item.time}</span>
                  <div className="flex items-center gap-5 text-stone-700">
                    <button className="transition hover:text-[#6966dd]" title="赞">
                      <ThumbsUp size={25} />
                    </button>
                    <button className="transition hover:text-[#6966dd]" title="评论">
                      <MessageCircle size={25} />
                    </button>
                    <button className="transition hover:text-[#6966dd]" title="分享">
                      <Share2 size={25} />
                    </button>
                  </div>
                </div>

                {visibleLikes.length ? (
                  <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#587097]">
                    <ThumbsUp size={16} />
                    {visibleLikes.map((like) => like.user).join("、")} 赞了
                  </div>
                ) : null}

                {visibleComments.length ? (
                  <div className="mt-4 space-y-2 rounded-2xl bg-white/48 px-4 py-3 backdrop-blur-xl">
                    {visibleComments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-2.5 text-sm">
                        <p className="min-w-0 flex-1 leading-6 text-stone-600">
                          <span className="font-semibold text-stone-800">{comment.user}：</span>
                          {comment.text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-stone-100/80 px-3 py-3">
                  <Avatar src={item.viewerAvatar} name="我" size="sm" />
                  <span className="text-stone-400">说点什么吧...</span>
                </div>
              </div>
            </div>
          </article>
          );
        }) : (
          <div className="grid min-h-52 place-items-center bg-white/54 px-6 py-12 text-center">
            <div>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/76 text-[#7770d8] shadow-sm">
                <Users size={22} />
              </div>
              <p className="mt-4 font-semibold text-stone-700">好友们还没有发布动态</p>
              <p className="mt-1 text-sm text-stone-400">稍后回来看看，会有新的同频故事。</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function UserDynamicsView({ profile, feed, onBack }) {
  const normalized = normalizePublicProfile(profile);
  const userPosts = useMemo(
    () => feed.filter((item) => {
      const author = getFeedAuthorProfile(item);
      return author.id === normalized.id || author.nickname === normalized.nickname;
    }),
    [feed, normalized.id, normalized.nickname],
  );

  return (
    <section className="mx-auto w-full max-w-6xl pb-32 pt-24">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/64 px-4 py-2.5 text-sm font-semibold text-stone-700 shadow-sm backdrop-blur-xl transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7770d8]/55"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        返回动态
      </button>

      <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside
          className="selected-galaxy-card rounded-[32px] border border-white/80 p-6 shadow-soft backdrop-blur-xl lg:sticky lg:top-24"
          style={{ "--room-color": "#8b82e8" }}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <Avatar src={normalized.avatar} name={normalized.nickname} size="xl" glow />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#6b5ee7]">用户主页</p>
                <h1 className="mt-1 truncate text-3xl font-semibold text-stone-900">
                  {normalized.nickname}
                </h1>
                <p className="mt-1 text-sm text-stone-500">{normalized.region}</p>
              </div>
            </div>
            <p className="mt-5 rounded-2xl bg-[#f4f6ff]/90 px-4 py-3 text-sm leading-6 text-stone-600">
              {normalized.vibe}
            </p>
            <PublicProfileDetails profile={normalized} className="mt-4" />
          </div>
        </aside>

        <div className="overflow-hidden rounded-[34px] border border-white/76 bg-white/58 shadow-soft backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/70 bg-white/48 px-5 py-4">
            <div>
              <h2 className="text-xl font-semibold text-stone-800">{normalized.nickname} 的动态</h2>
              <p className="mt-1 text-xs text-stone-400">从相遇到日常，继续认识 TA</p>
            </div>
            <span className="rounded-full bg-[#f4f2ff] px-3 py-1.5 text-xs font-semibold text-[#6b5ee7]">
              {userPosts.length} 条
            </span>
          </div>

          {userPosts.length ? userPosts.map((item) => (
            <article key={item.id} className="border-b border-stone-100/90 bg-white/64 px-6 py-6 last:border-b-0">
              <div className="flex items-center justify-between gap-4 text-sm text-stone-400">
                <span>{item.time}</span>
                {item.badge ? (
                  <span className="glass-choice-active rounded-full px-2.5 py-1 text-[11px] font-semibold">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <p className="mt-4 whitespace-pre-line text-xl leading-8 text-stone-900">{item.text}</p>
              {item.tags?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-[#f4f6ff] px-3 py-1.5 text-xs font-semibold text-[#5d6387]">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-5 flex justify-end gap-5 text-stone-600">
                <button type="button" className="rounded-full p-2 transition hover:bg-white hover:text-[#6966dd]" aria-label="赞">
                  <ThumbsUp size={22} />
                </button>
                <button type="button" className="rounded-full p-2 transition hover:bg-white hover:text-[#6966dd]" aria-label="评论">
                  <MessageCircle size={22} />
                </button>
                <button type="button" className="rounded-full p-2 transition hover:bg-white hover:text-[#6966dd]" aria-label="分享">
                  <Share2 size={22} />
                </button>
              </div>
            </article>
          )) : (
            <div className="grid min-h-64 place-items-center px-6 py-12 text-center">
              <div>
                <Bell className="mx-auto text-[#7770d8]" size={28} aria-hidden="true" />
                <p className="mt-3 font-semibold text-stone-700">TA 还没有发布动态</p>
                <p className="mt-1 text-sm text-stone-400">以后再回来看看吧。</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function MessagesView({
  threads,
  games = [],
  activeThreadId: requestedActiveThreadId,
  onActiveThreadChange,
  drafts = {},
  onDraftChange,
  scrollPositions = {},
  onScrollPositionChange,
  onSendMessage,
  onStartWaveRoom,
  onToast,
  onOpenStore,
  wallet,
  onOpenCheckIn,
  onCheckIn,
  onOpenStory,
}) {
  const [friendActions, setFriendActions] = useState(null);
  const [gamePicker, setGamePicker] = useState(null);
  const [waveRoomPicker, setWaveRoomPicker] = useState(null);
  const [toolPanelOpen, setToolPanelOpen] = useState(false);
  const [callOptionsOpen, setCallOptionsOpen] = useState(false);
  const imageInputRef = useRef(null);
  const messageListRef = useRef(null);
  const activeThreadId = threads.some((thread) => thread.id === requestedActiveThreadId)
    ? requestedActiveThreadId
    : threads[0]?.id || null;
  const activeThread = threads.find((thread) => thread.id === activeThreadId) || null;
  const draft = drafts[activeThreadId] || "";

  useEffect(() => {
    setToolPanelOpen(false);
    setCallOptionsOpen(false);
    setWaveRoomPicker(null);
  }, [activeThreadId]);

  useLayoutEffect(() => {
    const list = messageListRef.current;
    if (!list || !activeThreadId) return undefined;
    const frame = window.requestAnimationFrame(() => {
      list.scrollTop = scrollPositions[activeThreadId] ?? list.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  // Restore once when the routed thread mounts/changes. Scroll events update the
  // parent cache, but must not continually drive the live scroll position.
  }, [activeThreadId]);

  const submitMessage = () => {
    if (!activeThread || !draft.trim()) return;
    onSendMessage(activeThread.friendId, { type: "text", text: draft.trim() });
    onDraftChange?.(activeThread.id, "");
    setToolPanelOpen(false);
    setCallOptionsOpen(false);
  };

  const uploadImage = (event) => {
    const file = event.target.files?.[0];
    if (!activeThread || !file) return;
    onSendMessage(activeThread.friendId, {
      type: "image",
      text: `分享了一张图片：${file.name}`,
      imageName: file.name,
    });
    event.target.value = "";
    setToolPanelOpen(false);
    setCallOptionsOpen(false);
  };

  const startCall = (type) => {
    if (!activeThread) return;
    onToast(`正在向 ${activeThread.name} 发起${type}邀请。`);
  };

  const chatTools = [
    {
      label: "相册",
      icon: Image,
      action: () => imageInputRef.current?.click(),
    },
    {
      label: "相机",
      icon: Camera,
      action: () => onToast("相机功能稍后开放。"),
    },
    {
      label: "通话",
      icon: PhoneCall,
      action: () => setCallOptionsOpen((open) => !open),
    },
    {
      label: "礼物",
      icon: Gift,
      action: () => onToast("礼物功能稍后开放。"),
    },
    {
      label: "语音输入",
      icon: Mic,
      action: () => onToast("语音输入功能稍后开放。"),
    },
  ];

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-5 pb-32 pt-24 md:h-[100dvh] md:min-h-0 md:grid-cols-[280px_minmax(0,1fr)] md:overflow-hidden lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)] mt-5">
      <div className="card-scroll space-y-5 md:min-h-0 md:overflow-y-auto md:overscroll-contain md:pr-1 [scrollbar-gutter:stable]">
        <CheckInCard wallet={wallet} onOpen={onOpenCheckIn} onClaim={onCheckIn} />
        <div className="glass-panel rounded-[32px] p-5">
          <h2 className="mb-4 text-2xl font-semibold text-stone-800">消息</h2>
          <div className="space-y-3">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => {
                  onActiveThreadChange?.(thread);
                }}
                className={`flex w-full items-center gap-3 rounded-3xl p-3 text-left transition ${
                  activeThreadId === thread.id ? "ink-glass" : "glass-choice"
                }`}
              >
                <Avatar src={thread.avatar} name={thread.name} />
                <span>
                  <span className="block font-semibold text-stone-800">
                    {thread.name}
                  </span>
                  <span className="mt-1 block text-xs text-stone-500">
                    {thread.subtitle}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-panel min-h-[560px] min-w-0 rounded-[32px] p-5 md:-mt-24 md:min-h-0 md:overflow-hidden">
        {activeThread ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex shrink-0 items-center gap-3 border-b border-white/70 pb-4">
              <button
                type="button"
                onClick={() => setFriendActions(activeThread)}
                aria-label={`打开 ${activeThread.name} 的好友操作`}
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7770d8]/55"
              >
                <Avatar src={activeThread.avatar} name={activeThread.name} />
              </button>
              <div>
                <h3 className="text-xl font-semibold text-stone-800">{activeThread.name}</h3>
                <p className="text-xs text-stone-500">{activeThread.subtitle}</p>
              </div>
            </div>

            {activeThread.decorHint ? (
              <div className="mb-4 flex h-24 items-center justify-center rounded-[28px] border border-dashed border-[#9ca3d6]/60 bg-white/42 text-sm text-stone-500">
                开始装点属于你们的空间吧！
              </div>
            ) : null}
            <div
              ref={messageListRef}
              onScroll={(event) => onScrollPositionChange?.(activeThread.id, event.currentTarget.scrollTop)}
              className="card-scroll min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain py-4 pr-1 [scrollbar-gutter:stable]"
            >
              {activeThread.messages.map((message, index) => {
                if (message.from === "system") {
                  return (
                    <div
                      key={`${message.from}-${index}`}
                      className="mx-auto max-w-[78%] px-3 py-1 text-center text-xs font-medium leading-5 text-stone-400"
                    >
                      {message.text}
                    </div>
                  );
                }

                return (
                  <div
                    key={`${message.from}-${index}`}
                    className={`max-w-[72%] rounded-3xl px-4 py-3 text-sm ${
                      message.from === "me"
                        ? "chat-bubble-me ml-auto text-white"
                        : "mr-auto border border-black bg-white/58 text-stone-700 backdrop-blur-xl"
                    }`}
                  >
                    {message.type === "image" ? (
                      <span className="block">
                        <span className="mb-2 flex h-28 items-center justify-center rounded-2xl bg-white/30">
                          <ImagePlus size={24} />
                        </span>
                        {message.imageName || message.text}
                      </span>
                    ) : (
                      message.text
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 shrink-0 border-t border-white/70 pt-4">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={uploadImage}
              />
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setGamePicker(activeThread)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                    gamePicker
                      ? "glass-choice-active"
                      : "border border-stone-200 bg-white/[.82] text-stone-800 shadow-sm hover:bg-white"
                  }`}
                >
                  <Gamepad2 size={16} />
                  双人游戏
                </button>
                <button
                  type="button"
                  onClick={(event) => onOpenStory?.(activeThread, event.currentTarget)}
                  data-story-entry-thread-id={activeThread.id}
                  aria-label="付费进入互动文游"
                  title="Demo 模式，不会实际扣费"
                  className="glass-choice-active inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition"
                >
                  <PenLine size={16} />
                  付费进入
                </button>
                <button
                  onClick={() => setWaveRoomPicker(activeThread)}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/[.82] px-4 py-2.5 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-white"
                >
                  <Radio size={16} />
                  电波一下
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToast("按住说话功能稍后开放。")}
                  title="语音输入"
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-stone-200 bg-white/76 text-stone-600 transition hover:bg-white"
                >
                  <Mic size={22} />
                </button>
                <input
                  value={draft}
                  onChange={(event) => onDraftChange?.(activeThread.id, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitMessage();
                  }}
                  placeholder={`给 ${activeThread.name} 发消息`}
                  className="warm-field min-w-0 flex-1 rounded-2xl px-4 py-3"
                />
                <button
                  onClick={() => onToast("表情功能稍后开放。")}
                  title="表情"
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-stone-200 bg-white/76 text-stone-600 transition hover:bg-white"
                >
                  <Smile size={22} />
                </button>
                <button
                  onClick={() => setToolPanelOpen((open) => !open)}
                  title={toolPanelOpen ? "收起更多功能" : "展开更多功能"}
                  aria-label={toolPanelOpen ? "收起更多功能" : "展开更多功能"}
                  aria-expanded={toolPanelOpen}
                  aria-controls="chat-tool-panel"
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border transition ${
                    toolPanelOpen
                      ? "border-[#8b82e8]/55 bg-[#8b82e8]/18 text-[#312f68] shadow-[0_0_0_2px_rgba(139,130,232,0.12)]"
                      : "border-stone-300 bg-white/42 text-stone-700 hover:bg-white/70 hover:text-stone-950"
                  }`}
                >
                  {toolPanelOpen ? (
                    <Minus size={31} strokeWidth={2.4} />
                  ) : (
                    <Plus size={31} strokeWidth={2.4} />
                  )}
                </button>
                <button
                  onClick={submitMessage}
                  className="aurora-dark grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-glow transition hover:brightness-110"
                  title="发送"
                >
                  <Send size={20} />
                </button>
              </div>

              {toolPanelOpen ? (
                <div
                  id="chat-tool-panel"
                  className="mt-4 rounded-[28px] border border-white/60 bg-white/36 p-5 backdrop-blur-xl"
                >
                  {callOptionsOpen ? (
                    <div className="mb-5 grid gap-3 sm:grid-cols-2">
                      <button
                        onClick={() => {
                          setCallOptionsOpen(false);
                          setToolPanelOpen(false);
                          startCall("视频通话");
                        }}
                        className="glass-choice-active inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition"
                      >
                        <Video size={17} />
                        视频通话
                      </button>
                      <button
                        onClick={() => {
                          setCallOptionsOpen(false);
                          setToolPanelOpen(false);
                          startCall("语音通话");
                        }}
                        className="glass-choice-active inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition"
                      >
                        <Mic size={17} />
                        语音通话
                      </button>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-3 gap-5 sm:grid-cols-5">
                    {chatTools.map(({ label, icon: Icon, action }) => (
                      <button
                        key={label}
                        onClick={action}
                        className="group flex flex-col items-center gap-2 text-sm font-semibold text-stone-500 transition hover:text-stone-900"
                      >
                        <span className="glass-choice-active grid h-20 w-20 place-items-center rounded-[26px] transition group-hover:-translate-y-1">
                          <Icon size={30} />
                        </span>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-stone-500">
            选择一个聊天框
          </div>
        )}
      </div>

      {friendActions ? (
        <Modal title={`${friendActions.name} 的操作`} onClose={() => setFriendActions(null)} width="max-w-sm">
          <div className="grid gap-2">
            {["查看好友信息", "设置好友备注", "查看 TA 的动态", "举报好友", "删除好友"].map((action) => (
              <button key={action} className="glass-choice-active rounded-2xl px-4 py-3 text-left font-semibold transition">
                {action}
              </button>
            ))}
          </div>
        </Modal>
      ) : null}

      {gamePicker ? (
        <Modal title={`和 ${gamePicker.name} 玩什么？`} onClose={() => setGamePicker(null)} width="max-w-md">
          <p className="mb-4 rounded-2xl bg-[#f4f2ff] px-4 py-3 text-center text-sm font-semibold text-[#6b5ee7]">
            暂未开放
          </p>
          <div className="grid grid-cols-2 gap-3">
            {games.map((game) => (
              <button
                key={game}
                type="button"
                disabled
                className="cursor-not-allowed rounded-3xl bg-stone-100/80 px-5 py-6 text-lg font-semibold text-stone-400 shadow-sm"
              >
                {game}
              </button>
            ))}
          </div>
        </Modal>
      ) : null}

      {waveRoomPicker ? (
        <Modal title={`和 ${waveRoomPicker.name} 电波一下`} onClose={() => setWaveRoomPicker(null)} width="max-w-md">
          <div className="grid grid-cols-2 gap-3">
            {[
              { type: "语音房", icon: Mic },
              { type: "打字房", icon: PenLine },
            ].map(({ type, icon: Icon }) => (
              <button
                key={type}
                onClick={() => {
                  setWaveRoomPicker(null);
                  onStartWaveRoom(waveRoomPicker, type);
                }}
                className="glass-choice-active flex-col rounded-3xl px-5 py-6 text-base font-semibold transition hover:-translate-y-0.5"
              >
                <Icon size={24} />
                {type}
              </button>
            ))}
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

const NEW_FRIEND_SECTIONS = [
  {
    title: "最近三天",
    items: [
      {
        id: "request-linyu",
        name: "林屿",
        avatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=new-friend-linyu",
        message: "你好，在散步话题里看到你，想认识一下。",
        status: "已添加",
      },
      {
        id: "request-suwan",
        name: "苏晚",
        avatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=new-friend-suwan",
        message: "我们好像都喜欢轻音乐和夜晚电台。",
        status: "申请已发送",
      },
    ],
  },
  {
    title: "三天前",
    items: [
      {
        id: "request-baiyu",
        name: "白榆",
        avatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=new-friend-baiyu",
        message: "从拼图房间来，之后也一起玩吧。",
        status: "已添加",
      },
      {
        id: "request-qiaoan",
        name: "乔安",
        avatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=new-friend-qiaoan",
        message: "你好，很喜欢你分享的城市观察。",
        status: "已添加",
      },
      {
        id: "request-jiangye",
        name: "江野",
        avatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=new-friend-jiangye",
        message: "我们在同一个语音房聊过。",
        status: "已添加",
      },
      {
        id: "request-mili",
        name: "米粒",
        avatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=new-friend-mili",
        message: "想和你交换最近循环播放的歌。",
        status: "申请已发送",
      },
    ],
  },
];

function NewFriendsView({ onBack, onAddContact }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
  const visibleSections = NEW_FRIEND_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      [item.name, item.message].some((value) =>
        value.toLocaleLowerCase("zh-CN").includes(normalizedQuery),
      ),
    ),
  })).filter((section) => section.items.length);

  return (
    <section className="mx-auto w-full max-w-4xl pb-32 pt-24">
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/80 bg-white/58 text-stone-700 shadow-sm backdrop-blur-xl transition hover:bg-white"
          aria-label="返回好友列表"
        >
          <ArrowLeft size={21} aria-hidden="true" />
        </button>
        <div className="min-w-0 text-center">
          <h2 className="text-3xl font-semibold text-stone-800">新的朋友</h2>
          <p className="mt-1 text-sm text-stone-500">查看好友申请与添加记录</p>
        </div>
        <button
          type="button"
          onClick={onAddContact}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-white/80 bg-white/58 px-4 text-sm font-semibold text-[#5d6387] shadow-sm backdrop-blur-xl transition hover:bg-white hover:text-[#6966dd]"
        >
          <UserPlus size={18} aria-hidden="true" />
          <span className="hidden sm:inline">添加联系人</span>
        </button>
      </div>

      <div className="glass-panel rounded-[32px] p-3 sm:p-4">
        <label className="warm-field flex min-h-12 items-center gap-3 rounded-[22px] px-4 text-stone-500">
          <Search size={20} aria-hidden="true" />
          <span className="sr-only">搜索账号或手机号</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索账号或手机号"
            className="min-w-0 flex-1 bg-transparent text-stone-800 outline-none placeholder:text-stone-400"
          />
        </label>

        <button
          type="button"
          onClick={onAddContact}
          className="group mt-3 flex w-full items-center gap-4 rounded-[24px] border border-white/70 bg-white/48 p-3 text-left transition hover:bg-white/72 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7770d8]/55"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#dcf8ee] text-[#26866f]">
            <Smartphone size={23} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold text-stone-800">手机联系人</span>
            <span className="mt-0.5 block text-xs text-stone-500">查找通讯录中已经加入 Uslike 的朋友</span>
          </span>
          <ChevronRight
            size={21}
            className="text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-[#6966dd]"
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-[32px] border border-white/75 bg-white/58 shadow-soft backdrop-blur-xl">
        {visibleSections.length ? (
          visibleSections.map((section) => (
            <section key={section.title} aria-labelledby={`new-friend-${section.title}`}>
              <h3
                id={`new-friend-${section.title}`}
                className="border-b border-white/70 bg-white/36 px-5 py-2.5 text-sm font-semibold text-[#7770d8]"
              >
                {section.title}
              </h3>
              {section.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 border-b border-white/70 bg-white/32 px-5 py-4 last:border-b-0"
                >
                  <Avatar src={item.avatar} name={item.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-semibold text-stone-800">{item.name}</p>
                    <p className="mt-0.5 truncate text-sm text-stone-500">{item.message}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      item.status === "已添加"
                        ? "bg-[#dcf8ee] text-[#26866f]"
                        : "bg-white/72 text-stone-500"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </section>
          ))
        ) : (
          <div className="grid min-h-48 place-items-center px-8 py-12 text-center">
            <div>
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/76 text-[#7770d8] shadow-sm">
                <UserPlus size={22} aria-hidden="true" />
              </span>
              <p className="mt-4 font-semibold text-stone-700">没有找到相关记录</p>
              <p className="mt-1 text-sm text-stone-400">换个账号或手机号试试。</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function FriendsView({
  friends,
  onOpenChat,
  onOpenNewFriends,
  showNewFriends = false,
  onShowNewFriends,
}) {
  const [query, setQuery] = useState("");
  const visibleFriends = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
    if (!normalizedQuery) return friends;
    return friends.filter((friend) =>
      [friend.name, friend.subtitle]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase("zh-CN").includes(normalizedQuery)),
    );
  }, [friends, query]);
  const friendGroups = useMemo(() => groupFriendsByInitial(visibleFriends), [visibleFriends]);
  const availableInitials = useMemo(
    () => new Set(friendGroups.map(([initial]) => initial)),
    [friendGroups],
  );

  const jumpToInitial = (initial) => {
    document.getElementById(`friend-group-${initial}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (showNewFriends) {
    return (
      <NewFriendsView
        onBack={() => onShowNewFriends?.(false)}
        onAddContact={onOpenNewFriends}
      />
    );
  }

  return (
    <section className="mx-auto w-full max-w-4xl pb-32 pt-24">
      <div className="mb-5">
        <h2 className="text-3xl font-semibold text-stone-800">好友</h2>
        <p className="mt-1.5 text-sm text-stone-500">找到好友后，点击名字即可继续聊天</p>
      </div>

      <div className="glass-panel rounded-[32px] p-3 sm:p-4">
        <label className="warm-field flex min-h-12 items-center gap-3 rounded-[22px] px-4 text-stone-500">
          <Search size={20} aria-hidden="true" />
          <span className="sr-only">搜索好友</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索好友"
            className="min-w-0 flex-1 bg-transparent text-stone-800 outline-none placeholder:text-stone-400"
          />
        </label>

        <button
          type="button"
          onClick={() => onShowNewFriends?.(true)}
          className="group mt-3 flex w-full items-center gap-4 rounded-[24px] border border-white/70 bg-white/48 p-3 text-left transition hover:bg-white/72 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7770d8]/55"
        >
          <span className="aurora-dark grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-glow">
            <UserPlus size={22} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold text-stone-800">新的朋友</span>
            <span className="mt-0.5 block text-xs text-stone-500">查看申请/添加好友</span>
          </span>
          <ChevronRight
            size={21}
            className="text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-[#6966dd]"
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="relative mt-5">
        <div className="overflow-hidden rounded-[32px] border border-white/75 bg-white/58 shadow-soft backdrop-blur-xl">
          {friendGroups.length === 0 ? (
            <div className="grid min-h-48 place-items-center px-8 py-12 text-center">
              <div>
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/76 text-[#7770d8] shadow-sm">
                  <Users size={22} aria-hidden="true" />
                </span>
                <p className="mt-4 font-semibold text-stone-700">
                  {query ? "没有找到匹配的好友" : "还没有添加好友"}
                </p>
                <p className="mt-1 text-sm text-stone-400">
                  {query ? "换个名字或关键词试试。" : "在相遇中认识同频的人吧。"}
                </p>
              </div>
            </div>
          ) : (
            friendGroups.map(([initial, group]) => (
              <section
                key={initial}
                id={`friend-group-${initial}`}
                className="scroll-mt-24"
                aria-labelledby={`friend-heading-${initial}`}
              >
                <h3
                  id={`friend-heading-${initial}`}
                  className="border-y border-white/70 bg-white/36 px-5 py-2 text-xs font-bold tracking-[0.2em] text-[#7770d8] first:border-t-0"
                >
                  {initial}
                </h3>
                {group.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => onOpenChat(friend.id)}
                    className="group flex w-full items-center gap-4 border-b border-white/70 px-5 py-4 pr-12 text-left transition last:border-b-0 hover:bg-white/62 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7770d8]/55"
                    aria-label={`和 ${friend.name} 聊天`}
                  >
                    <Avatar src={friend.avatar} name={friend.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-lg font-semibold text-stone-800">
                        {friend.name}
                      </span>
                      {friend.subtitle ? (
                        <span className="mt-0.5 block truncate text-sm text-stone-500">
                          {friend.subtitle}
                        </span>
                      ) : null}
                    </span>
                    <ChevronRight
                      size={19}
                      className="shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-[#6966dd]"
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </section>
            ))
          )}
        </div>

        {friendGroups.length ? (
          <div className="pointer-events-none absolute inset-y-0 right-2 z-10">
            <nav
              className="pointer-events-auto sticky top-24 flex flex-col items-center rounded-full border border-white/80 bg-white/72 px-1 py-1.5 shadow-sm backdrop-blur-xl"
              aria-label="好友首字母索引"
            >
              {FRIEND_INDEX_LABELS.map((initial) => {
                const isAvailable = availableInitials.has(initial);
                return (
                  <button
                    key={initial}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => jumpToInitial(initial)}
                    className={`grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold transition ${
                      isAvailable
                        ? "text-[#6966dd] hover:bg-[#8b82e8]/16"
                        : "cursor-default text-stone-300"
                    }`}
                    aria-label={`跳到 ${initial}`}
                  >
                    {initial}
                  </button>
                );
              })}
            </nav>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function SettingsView({
  user,
  onLogout,
  accessToken,
  questionnaireRevision,
  onAccountUserUpdated,
  onOpenSettingsQuestionnaire,
  onRestartMeetTutorial,
  onOpenStore,
  onToast,
  coinBalance,
  accountOpen,
  onOpenAccount,
  onCloseAccount,
  friendCount,
  onOpenFriendStatus,
}) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuGroups = [
    [
      { label: "收藏", icon: Box, color: "text-[#6b73ff]" },
      { label: "动态", icon: Bell, color: "text-[#4267d5]" },
      { label: "商城", icon: Store, color: "text-[#b85cff]", badge: "推荐", onClick: onOpenStore },
      { label: "表情商店", icon: Smile, color: "text-[#d757c8]" },
    ],
    [
      {
        label: "新手引导",
        icon: CircleHelp,
        color: "text-[#6b5ee7]",
        onClick: onRestartMeetTutorial,
      },
      { label: "设置", icon: Settings, color: "text-[#4267d5]", onClick: onOpenAccount },
    ],
  ];

  if (accountOpen) {
    return (
      <AccountSettingsView
        user={user}
        accessToken={accessToken}
        questionnaireRevision={questionnaireRevision}
        onBack={onCloseAccount}
        onUserUpdated={onAccountUserUpdated}
        onOpenQuestionnaire={onOpenSettingsQuestionnaire}
        onToast={onToast}
      />
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl pb-32 pt-24">
      <div className="overflow-hidden rounded-[34px] border border-white/[0.76] bg-white/[0.82] shadow-soft backdrop-blur-xl">
        <div className="flex items-center gap-5 px-6 py-8 sm:px-8">
          <Avatar src={user.avatar} name={user.nickname} size="lg" glow />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-3xl font-semibold text-stone-900">{user.nickname}</h2>
            <p className="mt-2 text-base text-stone-500">Uslike ID：{user.id}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenStore}
                aria-label={`前往互像商城，当前余额 ${coinBalance}`}
                className="rounded-full border border-[#d8dcff] bg-[#f4f6ff] px-3 py-1.5 text-sm font-semibold text-[#6b5ee7] transition hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7770d8]/55"
              >
                互像币 {coinBalance}
              </button>
              <span className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600">
                + 状态
              </span>
              <button
                type="button"
                onClick={onOpenFriendStatus}
                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:border-[#cfd0f5] hover:text-[#6966dd] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7770d8]/55"
              >
                <Star size={15} className="text-[#6b73ff]" />
                同频好友 {friendCount}
                <span className="h-2 w-2 rounded-full bg-[#f25d5d]" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 text-stone-400">
            <QrCode size={25} />
            <ChevronRight size={24} />
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {menuGroups.map((group, groupIndex) => (
          <div
            key={groupIndex}
            className="overflow-hidden rounded-[28px] border border-white/[0.76] bg-white/[0.82] shadow-sm backdrop-blur-xl"
          >
            {group.map(({ label, icon: Icon, color, badge, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="flex w-full items-center gap-4 border-b border-stone-100/90 px-6 py-5 text-left transition last:border-b-0 hover:bg-white/62"
              >
                <Icon size={27} className={color} />
                <span className="min-w-0 flex-1 text-xl font-semibold text-stone-800">{label}</span>
                {badge ? (
                  <span className="glass-choice-active rounded-full px-2.5 py-1 text-xs font-semibold">
                    {badge}
                  </span>
                ) : null}
                <ChevronRight size={22} className="text-stone-300" />
              </button>
            ))}
          </div>
        ))}
        <button
          type="button"
          disabled={isLoggingOut}
          onClick={async () => {
            if (isLoggingOut) return;
            setIsLoggingOut(true);
            await onLogout();
          }}
          className="flex w-full items-center gap-4 rounded-[28px] border border-red-100/90 bg-white/[0.82] px-6 py-5 text-left text-red-600 shadow-sm backdrop-blur-xl transition hover:bg-red-50/80 disabled:cursor-wait disabled:opacity-60"
        >
          <LogOut size={27} />
          <span className="min-w-0 flex-1 text-xl font-semibold">
            {isLoggingOut ? "正在退出…" : "退出登录"}
          </span>
        </button>
      </div>
    </section>
  );
}

const FRIEND_STATUS_DETAILS = {
  "friend-youbo": {
    label: "美滋滋",
    icon: Smile,
    accent: "bg-[#eef0ff] text-[#716bd7]",
  },
  "room-7": {
    label: "游戏中",
    icon: Gamepad2,
    accent: "bg-[#fff0f3] text-[#d66c93]",
  },
};

export function FriendStatusView({ friends, onBack }) {
  const statusFriends = friends
    .filter((friend) => FRIEND_STATUS_DETAILS[friend.id])
    .map((friend) => ({ ...friend, status: FRIEND_STATUS_DETAILS[friend.id] }));

  return (
    <section className="mx-auto w-full max-w-3xl pb-32 pt-24">
      <header className="mb-5 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="返回设置"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/75 bg-white/52 text-stone-600 backdrop-blur-xl transition hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7770d8]/55"
        >
          <ArrowLeft size={19} />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-stone-800">好友状态</h2>
          <p className="mt-1 text-xs text-stone-400">看看同频好友此刻在做什么</p>
        </div>
        <button
          type="button"
          aria-label="更多状态选项"
          className="grid h-10 w-10 place-items-center rounded-full text-stone-400 transition hover:bg-white/60 hover:text-stone-700"
        >
          <MoreHorizontal size={20} />
        </button>
      </header>

      <div className="card-scroll flex gap-3 overflow-x-auto rounded-[24px] border border-stone-200/90 bg-white/38 p-3 backdrop-blur-xl">
        <button
          type="button"
          className="group flex w-16 shrink-0 flex-col items-center gap-1.5 text-center"
          aria-label="发布状态"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full border border-dashed border-stone-300 bg-white/52 text-stone-400 transition group-hover:border-[#7770d8] group-hover:text-[#6966dd]">
            <Plus size={20} />
          </span>
          <span className="text-xs font-medium text-stone-500">发状态</span>
        </button>
        {statusFriends.map(({ id, status }) => {
          const Icon = status.icon;
          return (
            <div key={id} className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center">
              <span className={`grid h-12 w-12 place-items-center rounded-full ${status.accent}`}>
                <Icon size={20} />
              </span>
              <span className="line-clamp-2 text-xs font-medium text-stone-600">{status.label}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 overflow-hidden rounded-[28px] border border-stone-200/90 bg-white/52 shadow-sm backdrop-blur-xl">
        {statusFriends.map((friend) => {
          const Icon = friend.status.icon;
          return (
            <section key={friend.id} className="flex items-center gap-4 border-b border-stone-200/80 px-5 py-4 last:border-b-0 sm:px-6">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${friend.status.accent}`}>
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-stone-800">{friend.status.label}</h3>
                <p className="mt-0.5 text-xs text-stone-400">{friend.name} 正在使用这个状态</p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <Avatar src={friend.avatar} name={friend.name} size="sm" />
                <p className="w-12 truncate text-sm font-medium text-stone-600">{friend.name}</p>
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
