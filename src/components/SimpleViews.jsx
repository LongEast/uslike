import {
  Camera,
  Gamepad2,
  Gift,
  Image,
  ImagePlus,
  Lock,
  MessageCircle,
  Mic,
  MoreHorizontal,
  PenLine,
  PhoneCall,
  Plus,
  Send,
  Share2,
  Smile,
  ThumbsUp,
  Video,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Avatar from "./Avatar.jsx";
import Modal from "./Modal.jsx";

export function FeedView({ feed }) {
  return (
    <section className="mx-auto w-full max-w-3xl pb-32 pt-24">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-3xl font-semibold text-stone-800">空间动态</h2>
        <span className="rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-[#af6449] shadow-sm">
          同频近况
        </span>
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
                        <span className="rounded-full bg-[#fff0d7] px-2 py-1 text-[11px] font-semibold text-[#b66a32]">
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
                      <span key={tag} className="rounded-full bg-[#fff8ee] px-3 py-1.5 text-xs font-semibold text-stone-500">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex items-center justify-between gap-4 text-sm text-stone-400">
                  <span>{item.time}</span>
                  <div className="flex items-center gap-5 text-stone-700">
                    <button className="transition hover:text-[#f06f52]" title="赞">
                      <ThumbsUp size={25} />
                    </button>
                    <button className="transition hover:text-[#f06f52]" title="评论">
                      <MessageCircle size={25} />
                    </button>
                    <button className="transition hover:text-[#f06f52]" title="分享">
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

export function MessagesView({ threads, games = [], onSendMessage, onToast }) {
  const [activeThreadId, setActiveThreadId] = useState(() => threads[0]?.id || null);
  const [friendActions, setFriendActions] = useState(null);
  const [gamePicker, setGamePicker] = useState(null);
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
                activeThreadId === thread.id ? "bg-[#fff0d7]" : "bg-white/68 hover:bg-white"
              }`}
            >
              <Avatar src={thread.avatar} name={thread.name} />
              <span>
                <span className="block font-semibold text-stone-800">{thread.name}</span>
                <span className="mt-1 block text-xs text-stone-500">{thread.subtitle}</span>
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
              <div className="mb-4 flex h-24 items-center justify-center rounded-[28px] border border-dashed border-[#e3b494] bg-white/48 text-sm text-stone-500">
                开始装点属于你们的空间吧！
              </div>
            ) : null}
            {isAssistantThread ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "购买月卡", hint: "解锁更多同频相遇权益" },
                  { label: "个性商城", hint: "装扮头像与聊天空间" },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => onToast(`${item.label}稍后开放。`)}
                    className="rounded-3xl border border-[#f0c6a8]/70 bg-white/76 px-5 py-4 text-left shadow-sm transition hover:-translate-y-1 hover:bg-white"
                  >
                    <span className="block text-base font-semibold text-stone-800">{item.label}</span>
                    <span className="mt-1 block text-sm text-stone-500">{item.hint}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex-1 space-y-3 overflow-auto py-4">
              {activeThread.messages.map((message, index) => (
                <div
                  key={`${message.from}-${index}`}
                  className={`max-w-[72%] rounded-3xl px-4 py-3 text-sm ${
                    message.from === "me"
                      ? "ml-auto bg-[#f06f52] text-white"
                      : "mr-auto border border-[#f0c6a8]/60 bg-[#fff4e8] text-stone-700"
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
              ))}
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
                    className="inline-flex items-center gap-2 rounded-full bg-[#fff0d7] px-4 py-2.5 text-sm font-semibold text-[#b66a32] transition hover:bg-[#ffe4b8]"
                  >
                    <Gamepad2 size={16} />
                    双人游戏
                  </button>
                  <button
                    onClick={openTextGame}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                      textGameUnlocked
                        ? "bg-[#ffe0ce] text-[#b85e46] hover:bg-[#ffd0bb]"
                        : "bg-stone-100 text-stone-400"
                    }`}
                    title={textGameUnlocked ? "已解锁" : `互发 50 条消息后解锁，当前 ${conversationCount}/50`}
                  >
                    {textGameUnlocked ? <PenLine size={16} /> : <Lock size={16} />}
                    互动文游
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
                  title="更多"
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border transition ${
                    toolPanelOpen
                      ? "border-[#f06f52]/40 bg-[#fff0d7] text-[#b7664d]"
                      : "border-stone-200 bg-white/76 text-stone-600 hover:bg-white"
                  }`}
                >
                  <Plus size={24} />
                </button>
                <button
                  onClick={submitMessage}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f06f52] text-white shadow-glow transition hover:bg-[#e45f47]"
                  title="发送"
                >
                  <Send size={20} />
                </button>
              </div>

              {toolPanelOpen ? (
                <div className="mt-4 rounded-[28px] bg-stone-100/64 p-5">
                  {callOptionsOpen ? (
                    <div className="mb-5 grid gap-3 sm:grid-cols-2">
                      <button
                        onClick={() => {
                          setCallOptionsOpen(false);
                          setToolPanelOpen(false);
                          startCall("视频通话");
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#eef5ff] px-5 py-3 text-sm font-semibold text-[#4070b8] transition hover:bg-[#e1eeff]"
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
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#e6f7f2] px-5 py-3 text-sm font-semibold text-[#247e68] transition hover:bg-[#d7f2ea]"
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
                        className="group flex flex-col items-center gap-2 text-sm font-semibold text-stone-500 transition hover:text-stone-800"
                      >
                        <span className="grid h-20 w-20 place-items-center rounded-[26px] bg-white text-stone-600 shadow-sm transition group-hover:-translate-y-1 group-hover:bg-white">
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
              <button key={action} className="rounded-2xl bg-white/72 px-4 py-3 text-left font-semibold text-stone-700 hover:bg-white">
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
                className="rounded-3xl bg-white/76 px-5 py-6 text-lg font-semibold text-stone-800 shadow-sm hover:bg-white"
              >
                {game}
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

export function SettingsView() {
  return (
    <section className="mx-auto w-full max-w-4xl pb-32 pt-24">
      <div className="glass-panel rounded-[32px] p-8">
        <h2 className="text-3xl font-semibold text-stone-800">设置</h2>
        <p className="mt-3 text-stone-500">这里先保留为 demo stub。</p>
      </div>
    </section>
  );
}
