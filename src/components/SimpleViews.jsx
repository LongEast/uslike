import {
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
  Lock,
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
  Send,
  Settings,
  Share2,
  Smile,
  Star,
  Store,
  ThumbsUp,
  Video,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Avatar from "./Avatar.jsx";
import AccountSettingsView from "./AccountSettingsView.jsx";
import Modal from "./Modal.jsx";

export function FeedView({ feed }) {
  const [showNonFriendComments, setShowNonFriendComments] = useState(false);

  return (
    <section className="mx-auto w-full max-w-3xl pb-32 pt-24">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-3xl font-semibold text-stone-800">空间动态</h2>
        <span className="rounded-full bg-white/58 px-4 py-2 text-sm font-semibold text-[#5d6387] shadow-sm backdrop-blur-xl">
          同频近况
        </span>
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
              onClick={() => setShowNonFriendComments((value) => !value)}
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
              显示非好友评论
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

      <div className="overflow-hidden rounded-[34px] border border-white/76 bg-white/58 shadow-soft backdrop-blur-xl">
        {feed.map((item) => (
          <article key={item.id} className="border-b border-stone-100/90 bg-white/64 px-5 py-6 last:border-b-0">
            <div className="flex items-start gap-3">
              <Avatar src={item.avatar} name={item.user} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-stone-800">{item.user}</h3>
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

                {item.likedBy ? (
                  <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#587097]">
                    <ThumbsUp size={16} />
                    {item.likedBy} 赞了
                  </div>
                ) : null}

                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-stone-100/80 px-3 py-3">
                  <Avatar src={item.viewerAvatar} name="我" size="sm" />
                  <span className="text-stone-400">说点什么吧...</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function MessagesView({ threads, games = [], onSendMessage, onStartWaveRoom, onToast, onOpenStore }) {
  const [activeThreadId, setActiveThreadId] = useState(() => threads[0]?.id || null);
  const [friendActions, setFriendActions] = useState(null);
  const [gamePicker, setGamePicker] = useState(null);
  const [waveRoomPicker, setWaveRoomPicker] = useState(null);
  const [toolPanelOpen, setToolPanelOpen] = useState(false);
  const [callOptionsOpen, setCallOptionsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const imageInputRef = useRef(null);
  const activeThread = threads.find((thread) => thread.id === activeThreadId) || null;
  const isAssistantThread = activeThread?.id === "thread-welcome";
  const conversationCount = useMemo(
    () => activeThread?.messages.filter((message) => message.from === "me" || message.from === "them").length || 0,
    [activeThread],
  );
  const textGameUnlocked = conversationCount >= 50;

  useEffect(() => {
    setToolPanelOpen(false);
    setCallOptionsOpen(false);
    setWaveRoomPicker(null);
    setDraft("");
  }, [activeThreadId]);

  useEffect(() => {
    if (!threads.length) {
      setActiveThreadId(null);
      return;
    }

    if (!activeThreadId || !threads.some((thread) => thread.id === activeThreadId)) {
      setActiveThreadId(threads[0].id);
    }
  }, [activeThreadId, threads]);

  const submitMessage = () => {
    if (!activeThread || !draft.trim()) return;
    onSendMessage(activeThread.friendId, { type: "text", text: draft.trim() });
    setDraft("");
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

  const openTextGame = () => {
    if (textGameUnlocked) {
      onToast("双人互动文字游戏已解锁，可以开始一局默契问答。");
      return;
    }
    onToast(`互发 50 条消息后解锁，还差 ${Math.max(0, 50 - conversationCount)} 条。`);
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
    <section className="mx-auto grid w-full max-w-6xl gap-5 pb-32 pt-24 lg:grid-cols-[360px_1fr]">
      <div className="glass-panel rounded-[32px] p-5">
        <h2 className="mb-4 text-2xl font-semibold text-stone-800">消息</h2>
        <div className="space-y-3">
          {threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => setActiveThreadId(thread.id)}
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

      <div className="glass-panel min-h-[560px] rounded-[32px] p-5">
        {activeThread ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 border-b border-white/70 pb-4">
              <button onClick={() => setFriendActions(activeThread)}>
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
            {isAssistantThread ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "购买月卡", hint: "解锁更多权益" },
                  { label: "个性商城", hint: "装扮头像与聊天空间" },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={onOpenStore}
                    className="ink-glass rounded-3xl px-5 py-4 text-left transition hover:-translate-y-1 hover:brightness-110"
                  >
                    <span className="block text-base font-semibold text-stone-800">{item.label}</span>
                    <span className="assistant-action-hint mt-1 block text-sm">{item.hint}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex-1 space-y-3 overflow-auto py-4">
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

            <div className="mt-4 border-t border-white/70 pt-4">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={uploadImage}
              />
              {!isAssistantThread ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => setGamePicker(activeThread)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                      gamePicker
                        ? "glass-choice-active"
                        : "border border-stone-200 bg-white/82 text-stone-800 shadow-sm hover:bg-white"
                    }`}
                  >
                    <Gamepad2 size={16} />
                    双人游戏
                  </button>
                  <button
                    onClick={openTextGame}
                    className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                      textGameUnlocked
                        ? "glass-choice-active"
                        : "border border-stone-200 bg-white/82 text-stone-800 shadow-sm hover:bg-white"
                    }`}
                    title={textGameUnlocked ? "已解锁" : `互发 50 条消息后解锁，当前 ${conversationCount}/50`}
                  >
                    <PenLine size={16} />
                    互动文游
                    {!textGameUnlocked ? (
                      <span className="pointer-events-none absolute -right-1 -top-2 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-stone-200 text-stone-500 shadow-sm">
                        <Lock size={12} strokeWidth={2.4} />
                      </span>
                    ) : null}
                  </button>
                  <button
                    onClick={() => setWaveRoomPicker(activeThread)}
                    className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/82 px-4 py-2.5 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-white"
                  >
                    <Radio size={16} />
                    电波一下
                  </button>
                </div>
              ) : null}
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
                  onChange={(event) => setDraft(event.target.value)}
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
          <div className="grid grid-cols-2 gap-3">
            {games.map((game) => (
              <button
                key={game}
                onClick={() => {
                  setGamePicker(null);
                  onToast(`${game} 双人局稍后开放。`);
                }}
                className="glass-choice-active rounded-3xl px-5 py-6 text-lg font-semibold transition"
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

export function FriendsView({ friends }) {
  return (
    <section className="mx-auto w-full max-w-4xl pb-32 pt-24">
      <h2 className="mb-5 text-3xl font-semibold text-stone-800">好友</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {friends.length === 0 ? (
          <div className="glass-panel rounded-[28px] p-8 text-stone-500">还没有添加好友。</div>
        ) : (
          friends.map((friend) => (
            <div key={friend.id} className="glass-panel flex items-center gap-4 rounded-[28px] p-5">
              <Avatar src={friend.avatar} name={friend.name} size="lg" />
              <div>
                <h3 className="text-xl font-semibold text-stone-800">{friend.name}</h3>
                <p className="mt-1 text-sm text-stone-500">{friend.subtitle}</p>
              </div>
            </div>
          ))
        )}
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
  accountOpen,
  onOpenAccount,
  onCloseAccount,
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
              <span className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600">
                + 状态
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600">
                <Star size={15} className="text-[#6b73ff]" />
                同频好友 6
                <span className="h-2 w-2 rounded-full bg-[#f25d5d]" />
              </span>
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
