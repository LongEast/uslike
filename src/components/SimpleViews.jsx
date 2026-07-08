import {
  Camera,
  Gamepad2,
  Gift,
  Image,
  ImagePlus,
  Lock,
  Mic,
  PenLine,
  PhoneCall,
  Plus,
  Send,
  Smile,
  Video,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import Avatar from "./Avatar.jsx";
import Modal from "./Modal.jsx";

export function FeedView({ feed }) {
  return (
    <section className="mx-auto w-full max-w-4xl pb-32 pt-24">
      <h2 className="mb-5 text-3xl font-semibold text-stone-800">动态</h2>
      <div className="grid gap-4">
        {feed.map((item) => (
          <article key={item.id} className="glass-panel rounded-[28px] p-6">
            <p className="text-sm font-semibold text-[#b7664d]">{item.user}</p>
            <h3 className="mt-2 text-xl font-semibold text-stone-800">{item.title}</h3>
            <p className="mt-2 leading-7 text-stone-500">{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function MessagesView({ threads, games = [], onSendMessage, onToast }) {
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [friendActions, setFriendActions] = useState(null);
  const [gamePicker, setGamePicker] = useState(null);
  const [toolPanelOpen, setToolPanelOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const imageInputRef = useRef(null);
  const activeThread = threads.find((thread) => thread.id === activeThreadId) || null;
  const conversationCount = useMemo(
    () => activeThread?.messages.filter((message) => message.from === "me" || message.from === "them").length || 0,
    [activeThread],
  );
  const textGameUnlocked = conversationCount >= 50;

  const submitMessage = () => {
    if (!activeThread || !draft.trim()) return;
    onSendMessage(activeThread.friendId, { type: "text", text: draft.trim() });
    setDraft("");
    setToolPanelOpen(false);
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
      action: () => startCall("通话"),
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

            <div className="my-4 grid gap-2 sm:grid-cols-4">
              <button
                onClick={() => startCall("语音")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#e6f7f2] px-3 py-3 text-sm font-semibold text-[#247e68] transition hover:bg-[#d7f2ea]"
              >
                <Mic size={17} />
                语音
              </button>
              <button
                onClick={() => startCall("视频")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#eef5ff] px-3 py-3 text-sm font-semibold text-[#4070b8] transition hover:bg-[#e1eeff]"
              >
                <Video size={17} />
                视频
              </button>
              <button
                onClick={() => setGamePicker(activeThread)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#fff0d7] px-3 py-3 text-sm font-semibold text-[#b66a32] transition hover:bg-[#ffe4b8]"
              >
                <Gamepad2 size={17} />
                双人游戏
              </button>
              <button
                onClick={openTextGame}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                  textGameUnlocked
                    ? "bg-[#ffe0ce] text-[#b85e46] hover:bg-[#ffd0bb]"
                    : "bg-stone-100 text-stone-400"
                }`}
              >
                {textGameUnlocked ? <PenLine size={17} /> : <Lock size={17} />}
                文字游戏
              </button>
            </div>

            <div className="mb-4 rounded-2xl bg-white/58 px-4 py-3 text-xs font-semibold text-stone-500">
              双人互动文字游戏：互发 50 条消息后解锁，当前 {conversationCount}/50
            </div>

            {activeThread.decorHint ? (
              <div className="mb-4 flex h-24 items-center justify-center rounded-[28px] border border-dashed border-[#e3b494] bg-white/48 text-sm text-stone-500">
                开始装点属于你们的空间吧！
              </div>
            ) : null}
            <div className="flex-1 space-y-3 overflow-auto py-4">
              {activeThread.messages.map((message, index) => (
                <div
                  key={`${message.from}-${index}`}
                  className={`max-w-[72%] rounded-3xl px-4 py-3 text-sm ${
                    message.from === "them"
                      ? "bg-white text-stone-700"
                      : "ml-auto bg-[#f06f52] text-white"
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
