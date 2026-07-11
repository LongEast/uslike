import { ImagePlus, PanelRightClose, Send } from "lucide-react";
import { useState } from "react";

export default function ChatSidebar({ open, messages, onClose, onSend, textGameUnlocked }) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    if (!draft.trim()) return;
    onSend(draft.trim());
    setDraft("");
  };

  return (
    <aside
      className={`fixed right-0 top-0 z-30 flex h-full w-full max-w-[390px] flex-col border-l border-white/80 bg-white/82 p-5 shadow-soft backdrop-blur-xl transition-transform ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-stone-800">房间聊天</h2>
          <p className="text-xs text-stone-500">{messages.length} 条消息</p>
        </div>
        <button onClick={onClose} className="rounded-full bg-[#eeeaff] p-2 text-[#6b5ee7] hover:bg-white">
          <PanelRightClose size={20} />
        </button>
      </div>

      {textGameUnlocked ? (
        <div className="mb-3 rounded-2xl bg-[#dcf8ee] px-4 py-3 text-sm font-semibold text-[#26866f]">
          双人互动文字游戏已解锁
        </div>
      ) : null}

      <div className="card-scroll flex-1 space-y-3 overflow-y-auto rounded-[24px] bg-[#f4f6ff]/78 p-3">
        {messages.map((message, index) => (
          <div
            key={`${message.from}-${index}`}
            className={`max-w-[78%] rounded-3xl px-4 py-3 text-sm ${
              message.from === "me"
                ? "aurora-dark ml-auto text-white"
                : "border border-[#d8dcff]/70 bg-white/82 text-stone-700"
            }`}
          >
            {message.text}
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          title="发送图片"
          className="rounded-2xl bg-[#eeeaff] px-4 text-[#6b5ee7] transition hover:bg-white"
        >
          <ImagePlus size={20} />
        </button>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder="输入消息"
          className="warm-field min-w-0 flex-1 rounded-2xl px-4 py-3"
        />
        <button
          onClick={submit}
          className="aurora-dark rounded-2xl px-4 text-white shadow-glow transition hover:brightness-110"
        >
          <Send size={20} />
        </button>
      </div>
    </aside>
  );
}
