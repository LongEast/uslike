import { Send, X } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  formatStoryUnreadCount,
  getPartnerMessageIds,
  getUnreadPartnerMessageIds,
} from "../utils/storyChat.js";

const ASSISTANT_NAME = "相遇小助手";

function PartnerAvatar({ compact = false, partner }) {
  const [imageFailed, setImageFailed] = useState(false);
  const label = partner?.isAssistant ? "遇" : (partner?.name || "遇").slice(0, 1);

  return (
    <span
      aria-hidden="true"
      className={`relative grid shrink-0 place-items-center bg-gradient-to-br from-[#765eff] to-[#d467ff] font-extrabold text-white shadow-[0_8px_20px_rgba(132,88,255,0.28)] ${
        compact ? "h-7 w-7 rounded-lg text-[9px]" : "h-11 w-11 rounded-[14px] text-sm"
      }`}
    >
      {partner?.avatarUrl && !partner.isAssistant && !imageFailed ? (
        <img
          src={partner.avatarUrl}
          alt=""
          className="h-full w-full rounded-[inherit] object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : label}
      {!compact ? (
        <span className="absolute -bottom-0.5 -right-0.5 h-[11px] w-[11px] rounded-full border-2 border-[#10131c] bg-[#6de39a]" />
      ) : null}
    </span>
  );
}

export default function StoryCompanionChat({
  messages = [],
  onSendMessage,
  partner,
  pendingReplyCount = 0,
  resetKey = 0,
}) {
  const panelId = useId();
  const normalizedPartner = useMemo(() => ({
    id: partner?.id || "meet-assistant",
    name: partner?.name || ASSISTANT_NAME,
    avatarUrl: partner?.avatarUrl || partner?.avatar || null,
    isAssistant: partner?.isAssistant !== false,
  }), [partner]);
  const partnerStatus = normalizedPartner.isAssistant
    ? "正在和你一起玩"
    : `代 ${normalizedPartner.name} 模拟搭档`;
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const chatOpenRef = useRef(false);
  const knownPartnerMessageIdsRef = useRef(new Set(getPartnerMessageIds(messages)));
  const messagesRef = useRef(null);
  const inputRef = useRef(null);
  const launcherRef = useRef(null);

  useEffect(() => {
    chatOpenRef.current = chatOpen;
    if (chatOpen) setUnreadCount(0);
  }, [chatOpen]);

  useEffect(() => {
    knownPartnerMessageIdsRef.current = new Set(getPartnerMessageIds(messages));
    chatOpenRef.current = false;
    setChatOpen(false);
    setDraft("");
    setUnreadCount(0);
  }, [resetKey]);

  useEffect(() => {
    const newMessageIds = getUnreadPartnerMessageIds(
      messages,
      knownPartnerMessageIdsRef.current,
    );
    knownPartnerMessageIdsRef.current = new Set(getPartnerMessageIds(messages));
    if (newMessageIds.length && !chatOpenRef.current) {
      setUnreadCount((current) => current + newMessageIds.length);
    }
  }, [messages]);

  useEffect(() => {
    if (!chatOpen || !messagesRef.current) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const container = messagesRef.current;
      if (container) container.scrollTop = container.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chatOpen, messages, pendingReplyCount]);

  const openChat = () => {
    chatOpenRef.current = true;
    setUnreadCount(0);
    setChatOpen(true);
    window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  };

  const closeChat = () => {
    chatOpenRef.current = false;
    setChatOpen(false);
    window.requestAnimationFrame(() => launcherRef.current?.focus({ preventScroll: true }));
  };

  const toggleChat = () => {
    if (chatOpenRef.current) closeChat();
    else openChat();
  };

  const submitMessage = (event) => {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;
    onSendMessage?.(value);
    setDraft("");
  };

  const unreadLabel = formatStoryUnreadCount(unreadCount);
  const launcherLabel = chatOpen
    ? `收起${ASSISTANT_NAME}聊天`
    : `打开${ASSISTANT_NAME}聊天${unreadCount ? `，${unreadCount} 条未读消息` : ""}`;

  return (
    <aside className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] z-40 flex flex-col items-end gap-3 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))] sm:right-[max(1.5rem,env(safe-area-inset-right))]">
      {chatOpen ? (
        <section
          id={panelId}
          aria-label={`${ASSISTANT_NAME}聊天`}
          className="flex h-[min(52dvh,380px)] w-[min(360px,calc(100vw-24px))] origin-bottom-right flex-col overflow-hidden rounded-[19px] border border-white/10 bg-[#0c0e15]/90 shadow-[0_25px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl motion-safe:animate-storyChat sm:h-[min(480px,calc(100dvh-130px))]"
        >
          <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-white/[0.08] px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <PartnerAvatar partner={normalizedPartner} />
              <div>
                <strong className="block text-xs font-semibold">{ASSISTANT_NAME}</strong>
                <span className="mt-1 flex items-center gap-1.5 text-[9px] text-white/45">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#6de39a]" />
                  {partnerStatus}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={closeChat}
              aria-label="收起小助手聊天"
              className="grid h-9 w-9 place-items-center rounded-[10px] text-white/50 transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <X size={18} />
            </button>
          </div>

          <div
            ref={messagesRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3 [scrollbar-color:rgba(255,255,255,0.13)_transparent] [scrollbar-width:thin]"
          >
            <p className="mb-4 mt-1 text-center text-[9px] text-white/30">
              你们正在一起体验这段故事
            </p>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 flex gap-2 ${message.sender === "user" ? "justify-end" : ""}`}
              >
                {message.sender !== "user" ? (
                  <PartnerAvatar compact partner={normalizedPartner} />
                ) : null}
                <div className="max-w-[78%]">
                  <p className={`mb-1 text-[9px] text-white/40 ${message.sender === "user" ? "text-right" : ""}`}>
                    {message.sender === "user" ? "你" : ASSISTANT_NAME}
                  </p>
                  <p className={`rounded-[5px_13px_13px_13px] px-3 py-2 text-xs leading-[1.55] text-white/90 ${
                    message.sender === "user"
                      ? "rounded-[13px_5px_13px_13px] bg-gradient-to-br from-[#775cff]/90 to-[#9c55e8]/90"
                      : "bg-white/[0.075]"
                  }`}>
                    {message.text}
                  </p>
                </div>
              </div>
            ))}

            {pendingReplyCount > 0 ? (
              <div className="mb-4 flex gap-2" aria-label={`${ASSISTANT_NAME}正在输入`}>
                <PartnerAvatar compact partner={normalizedPartner} />
                <div>
                  <p className="mb-1 text-[9px] text-white/40">{ASSISTANT_NAME}</p>
                  <div className="flex h-8 w-[52px] items-center gap-1 rounded-[5px_13px_13px_13px] bg-white/[0.075] pl-3">
                    {[0, 1, 2].map((index) => (
                      <span
                        key={index}
                        className="h-1 w-1 rounded-full bg-white/55 motion-safe:animate-storyTyping"
                        style={{ animationDelay: `${index * 130}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <form
            onSubmit={submitMessage}
            className="flex shrink-0 items-center gap-2 border-t border-white/[0.07] p-2.5"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-label="给相遇小助手发送消息"
              placeholder="和小助手说点什么…"
              className="h-[38px] min-w-0 flex-1 rounded-xl border border-white/[0.09] bg-white/[0.055] px-3 text-[11px] text-white outline-none placeholder:text-white/30 focus:border-[#a689ff]/50"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="发送消息"
              className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#765eff] to-[#b45bf0] text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-default disabled:opacity-30"
            >
              <Send size={15} />
            </button>
          </form>
        </section>
      ) : null}

      <button
        ref={launcherRef}
        type="button"
        onClick={toggleChat}
        aria-controls={panelId}
        aria-expanded={chatOpen}
        aria-label={launcherLabel}
        className="relative flex h-[58px] min-w-0 items-center gap-3 rounded-[18px] border border-white/15 bg-[#0d0f16]/80 p-1.5 pr-3.5 text-white shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-[#141721]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:min-w-[188px]"
      >
        <PartnerAvatar partner={normalizedPartner} />
        <span className="hidden flex-col items-start gap-0.5 sm:flex">
          <strong className="text-xs font-semibold">{ASSISTANT_NAME}</strong>
          <span className="text-[9px] text-white/45">{partnerStatus}</span>
        </span>
        {!chatOpen && unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-[#10131c] bg-[#ff4058] px-1 text-[9px] font-bold shadow-[0_0_0_3px_rgba(255,64,88,0.14)] motion-safe:animate-pulse"
          >
            {unreadLabel}
          </span>
        ) : null}
      </button>
    </aside>
  );
}
