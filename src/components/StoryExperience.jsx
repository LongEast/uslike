import {
  ArrowLeft,
  ArrowRight,
  Check,
  LockKeyhole,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import defaultStoryData from "../data/story_safe.json";
import {
  STORY_STAGES,
  clearStorySession,
  createStorySession,
  getStorySessionStorageKey,
  loadStorySession,
  normalizeStoryPartner,
  saveStorySession,
} from "../utils/storySession.js";
import InteractiveStory from "./InteractiveStory.jsx";

let fallbackMessageId = 0;

function createMessageId(sender) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  fallbackMessageId += 1;
  return `${sender}-${Date.now()}-${fallbackMessageId}`;
}

function createPartnerMessage(event) {
  return {
    id: createMessageId("partner"),
    sender: "partner",
    text: event.message,
    eventId: event.id,
  };
}

function getInitialState({ sessionId, userId, storyData, origin, partner }) {
  const restored = loadStorySession({ sessionId, userId, storyData });
  return {
    session: restored || createStorySession({ sessionId, storyData, origin, partner }),
    restored: Boolean(restored),
  };
}

function PartnerAvatar({ partner, size = "large" }) {
  const [imageFailed, setImageFailed] = useState(false);
  const large = size === "large";
  const label = partner?.name || "相遇小助手";

  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center overflow-hidden border border-white/15 bg-gradient-to-br from-[#755cff] to-[#d463f1] font-extrabold text-white shadow-[0_12px_35px_rgba(101,76,220,0.3)] ${
        large ? "h-12 w-12 rounded-2xl text-base" : "h-8 w-8 rounded-xl text-xs"
      }`}
    >
      {partner?.avatarUrl && !imageFailed ? (
        <img
          src={partner.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        label.slice(0, 1)
      )}
    </span>
  );
}

function ExperienceHeader({ partner, onExit }) {
  return (
    <header className="relative z-20 flex items-center justify-between gap-4 px-[max(1.25rem,env(safe-area-inset-left))] pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 sm:pt-7">
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-lg font-black tracking-[0.04em] text-white">相遇</span>
        <span className="h-5 w-px bg-white/20" />
        <span className="truncate text-sm text-white/55">AI 双人文游</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] py-1.5 pl-2 pr-3 text-xs text-white/65 backdrop-blur-xl sm:flex">
          <PartnerAvatar partner={partner} size="small" />
          <span className="max-w-28 truncate">与 {partner.name} 同行</span>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-[10px] font-bold tracking-[0.12em] text-white/45 backdrop-blur-xl">
          DEMO
        </span>
        <button
          type="button"
          onClick={() => onExit("exit")}
          aria-label="退出文游"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/[0.07] text-white/70 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <X size={18} />
        </button>
      </div>
    </header>
  );
}

function ProxyNotice({ partner }) {
  if (partner.isAssistant) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-[#a78bfa]/25 bg-[#8b5cf6]/10 px-4 py-3 text-sm leading-6 text-[#ddd5ff]">
        <Sparkles className="mt-0.5 shrink-0 text-[#bca7ff]" size={17} />
        <span>相遇小助手会模拟搭档的发言，所有剧情决定仍由你作出。</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#a78bfa]/25 bg-[#8b5cf6]/10 px-4 py-3 text-sm leading-6 text-[#ddd5ff]">
      <Sparkles className="mt-0.5 shrink-0 text-[#bca7ff]" size={17} />
      <span>Demo 阶段由相遇小助手代理 {partner.name} 的发言与选择。</span>
    </div>
  );
}

function StyleSelection({ styles, partner, onSelect, onExit }) {
  return (
    <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8">
      <div className="mx-auto mb-7 max-w-2xl text-center sm:mb-10 sm:pt-5">
        <p className="mb-3 text-[11px] font-bold tracking-[0.24em] text-[#b9a6ff]">STEP 01 · 选择剧本风格</p>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">今晚想经历怎样的故事？</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/50 sm:text-base">
          你和搭档会分别扮演不同角色。Demo 先从一段科幻寓言开始。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {styles.map((style, index) => (
          <button
            key={style.id}
            type="button"
            onClick={() => onSelect(style)}
            aria-label={`${style.name} ${style.title}${style.available ? "" : "，暂未开放"}`}
            className={`group relative min-h-[230px] overflow-hidden rounded-[26px] border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 sm:min-h-[290px] ${
              style.available
                ? "border-[#a88cff]/45 bg-gradient-to-b from-[#7659d9]/35 to-[#171525]/85 shadow-[0_24px_80px_rgba(66,43,155,0.22)] hover:-translate-y-1 hover:border-[#c4afff]/70"
                : "border-white/10 bg-white/[0.045] hover:border-white/20 hover:bg-white/[0.07]"
            }`}
          >
            <span className={`absolute -right-10 -top-12 h-40 w-40 rounded-full blur-3xl ${
              index === 0 ? "bg-[#8d68ff]/35" : "bg-white/[0.035]"
            }`} />
            <span className="relative flex h-full flex-col">
              <span className={`mb-auto grid h-11 w-11 place-items-center rounded-2xl ${
                style.available ? "bg-[#9a7aff]/25 text-[#ded4ff]" : "bg-white/[0.06] text-white/35"
              }`}>
                {style.available ? <Sparkles size={20} /> : <LockKeyhole size={18} />}
              </span>
              <span className="mt-10 text-[11px] font-bold tracking-[0.18em] text-white/40">{style.name}</span>
              <strong className="mt-2 block text-xl font-bold text-white/90">{style.title}</strong>
              <span className="mt-3 block text-sm leading-6 text-white/45">{style.description}</span>
              <span className={`mt-5 inline-flex items-center gap-2 text-xs font-bold ${
                style.available ? "text-[#c9baff]" : "text-white/30"
              }`}>
                {style.available ? "选择这个剧本" : "暂未开放"}
                {style.available ? <ArrowRight size={14} /> : null}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="mx-auto mt-6 w-full max-w-2xl">
        <ProxyNotice partner={partner} />
      </div>
      <button type="button" onClick={() => onExit("exit")} className="sr-only">退出文游</button>
    </div>
  );
}

function CharacterSelection({ characters, partner, roleMessage, onBack, onSelect }) {
  return (
    <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-sm text-white/55 transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <ArrowLeft size={16} />
        重选风格
      </button>

      <div className="mb-7 sm:text-center">
        <p className="mb-3 text-[11px] font-bold tracking-[0.24em] text-[#b9a6ff]">STEP 02 · 分别选择角色</p>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">选择你要扮演的人</h1>
        <p className="mt-4 text-sm leading-6 text-white/50 sm:text-base">
          你扮演阿楠；阿美是搭档的独立角色，并不是两个人共同控制一个角色。
        </p>
      </div>

      {roleMessage ? (
        <div className="mx-auto mb-6 flex w-full max-w-xl items-start gap-3 rounded-[22px] border border-[#a88cff]/30 bg-[#7659d9]/15 p-4 shadow-[0_16px_50px_rgba(60,39,130,0.18)]">
          <PartnerAvatar partner={partner} />
          <div className="min-w-0">
            <p className="mb-1 text-[11px] font-semibold text-[#cbbdff]">相遇小助手</p>
            <p className="text-sm leading-6 text-white/85">{roleMessage.text}</p>
            {!partner.isAssistant ? (
              <p className="mt-1 text-[10px] text-white/35">正在代理 {partner.name} 演示搭档行为</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mx-auto grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        {characters.map((character) => {
          const isPlayer = character.demoRole === "player";
          return (
            <button
              key={character.id}
              type="button"
              onClick={() => onSelect(character)}
              aria-label={`${character.name}，${isPlayer ? "可选择" : "由搭档扮演，暂未开放"}`}
              className={`group relative min-h-[310px] overflow-hidden rounded-[28px] border p-6 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 ${
                isPlayer
                  ? "border-[#aa8fff]/55 bg-gradient-to-b from-[#7155c7]/35 to-[#15131f]/90 shadow-[0_25px_80px_rgba(62,40,135,0.25)] hover:-translate-y-1 hover:border-[#c9b6ff]"
                  : "border-white/12 bg-white/[0.05] hover:border-white/25 hover:bg-white/[0.075]"
              }`}
            >
              <span className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#9676ff]/15 blur-3xl" />
              <span className="relative flex h-full flex-col">
                <span className={`grid h-16 w-16 place-items-center rounded-[22px] text-xl font-black ${
                  isPlayer ? "bg-[#9b7cff]/25 text-[#e2dbff]" : "bg-white/[0.07] text-white/55"
                }`}>
                  {character.name.slice(0, 1)}
                </span>
                <span className="mt-8 text-[11px] font-bold tracking-[0.16em] text-white/40">{character.role}</span>
                <strong className="mt-2 block text-3xl font-black text-white">{character.name}</strong>
                <span className="mt-3 block text-sm leading-6 text-white/50">{character.description}</span>
                <span className={`mt-auto flex items-center gap-2 pt-7 text-xs font-bold ${
                  isPlayer ? "text-[#cbbdff]" : "text-white/35"
                }`}>
                  {isPlayer ? (
                    <><Check size={15} /> 由你扮演 · 开始故事</>
                  ) : (
                    <><Users size={15} /> 搭档角色 · 暂未开放</>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function StoryExperience({
  sessionId = "ice-civilization",
  userId = "guest",
  partner: partnerProp,
  origin = "/mvp/messages",
  onExit,
  onToast,
  storyData = defaultStoryData,
  wordSpeed,
}) {
  const initialStateRef = useRef(null);
  if (!initialStateRef.current) {
    initialStateRef.current = getInitialState({
      sessionId,
      userId,
      storyData,
      origin,
      partner: partnerProp,
    });
  }

  const [session, setSession] = useState(initialStateRef.current.session);
  const [restoredPlaySession, setRestoredPlaySession] = useState(
    initialStateRef.current.restored && initialStateRef.current.session.stage === STORY_STAGES.PLAY,
  );
  const [toast, setToast] = useState("");
  const exitButtonRef = useRef(null);
  const onExitRef = useRef(onExit);
  const activeStorageKeyRef = useRef(getStorySessionStorageKey(sessionId, userId));
  const toastTimerRef = useRef(null);

  const partner = normalizeStoryPartner(session.partner || partnerProp);
  const isKnownStory = !storyData?.story?.id || storyData.story.id === sessionId;
  const visibleCharacters = useMemo(() => {
    const visibleIds = new Set(storyData?.demo?.visibleCharacterIds || []);
    return (storyData?.characters || []).filter((character) => visibleIds.has(character.id));
  }, [storyData]);
  const roleEvent = useMemo(
    () => (storyData?.demo?.partnerEvents || []).find((event) => event.stage === STORY_STAGES.ROLE),
    [storyData],
  );
  const roleMessage = session.messages.find((message) => message.eventId === roleEvent?.id) || null;

  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    const nextStorageKey = getStorySessionStorageKey(sessionId, userId);
    if (activeStorageKeyRef.current === nextStorageKey) return;

    activeStorageKeyRef.current = nextStorageKey;
    const next = getInitialState({
      sessionId,
      userId,
      storyData,
      origin,
      partner: partnerProp,
    });
    setSession(next.session);
    setRestoredPlaySession(next.restored && next.session.stage === STORY_STAGES.PLAY);
  }, [origin, partnerProp, sessionId, storyData, userId]);

  useEffect(() => {
    saveStorySession(session, { userId, storyData });
  }, [session, storyData, userId]);

  useEffect(() => {
    // InteractiveStory owns the modal lifecycle during play. Keeping both
    // scroll locks active makes their unmount cleanups restore `hidden`.
    if (session.stage === STORY_STAGES.PLAY) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => exitButtonRef.current?.focus({ preventScroll: true }));

    const handleKeyDown = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing || event.repeat) return;
      event.preventDefault();
      clearStorySession({ sessionId, userId });
      onExitRef.current?.({ origin: session.origin, reason: "escape" });
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [session.origin, session.stage, sessionId, userId]);

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  const showToast = useCallback((message) => {
    if (onToast) {
      onToast(message);
      return;
    }
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setToast("");
    }, 2400);
  }, [onToast]);

  const handleExit = useCallback((reason = "exit") => {
    clearStorySession({ sessionId, userId });
    onExitRef.current?.({ origin: session.origin, reason });
  }, [session.origin, sessionId, userId]);

  const selectStyle = (style) => {
    if (!style.available) {
      showToast("暂未开放");
      return;
    }

    setRestoredPlaySession(false);
    setSession((current) => {
      const eventAlreadySeen = !roleEvent || current.seenPartnerEvents.includes(roleEvent.id);
      return {
        ...current,
        stage: STORY_STAGES.ROLE,
        styleId: style.id,
        messages: eventAlreadySeen
          ? current.messages
          : [...current.messages, createPartnerMessage(roleEvent)],
        seenPartnerEvents: eventAlreadySeen
          ? current.seenPartnerEvents
          : [...current.seenPartnerEvents, roleEvent.id],
      };
    });
  };

  const selectCharacter = (character) => {
    if (character.demoRole !== "player") {
      showToast("暂未开放：Demo 中阿美由你的搭档选择。");
      return;
    }

    setRestoredPlaySession(false);
    setSession((current) => ({
      ...current,
      stage: STORY_STAGES.PLAY,
      playerCharacterId: character.id,
      partnerCharacterId: storyData?.demo?.partnerCharacterId || "amei",
      currentNodeId: String(storyData.rootId),
      history: [],
    }));
  };

  const updatePlaySession = useCallback((nextSession) => {
    setRestoredPlaySession(false);
    setSession(nextSession);
  }, []);

  const restartPlaySession = useCallback(() => {
    const roleEventId = roleEvent?.id;
    setRestoredPlaySession(false);
    setSession((current) => ({
      ...current,
      currentNodeId: String(storyData.rootId),
      history: [],
      messages: roleEventId
        ? current.messages.filter((message) => message.eventId === roleEventId)
        : [],
      seenPartnerEvents: roleEventId ? [roleEventId] : [],
    }));
  }, [roleEvent, storyData.rootId]);

  if (!isKnownStory) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[#090b12] px-6 text-center text-white">
        <div className="max-w-md rounded-[28px] border border-white/10 bg-white/[0.05] p-8">
          <p className="text-xs font-bold tracking-[0.2em] text-[#b9a6ff]">STORY NOT FOUND</p>
          <h1 className="mt-3 text-2xl font-black">这个剧本暂时不可用</h1>
          <p className="mt-3 text-sm leading-6 text-white/50">当前 Demo 仅开放《冰人文明》。</p>
          <button type="button" onClick={() => handleExit("unavailable")} className="mt-6 rounded-xl bg-white/10 px-5 py-3 text-sm font-bold hover:bg-white/15">
            返回消息
          </button>
        </div>
      </main>
    );
  }

  if (session.stage === STORY_STAGES.PLAY) {
    return (
      <InteractiveStory
        storyData={storyData}
        session={session}
        onSessionChange={updatePlaySession}
        onRestart={restartPlaySession}
        onExit={() => handleExit("exit")}
        partner={partner}
        expandInitialText={restoredPlaySession}
        wordSpeed={wordSpeed}
      />
    );
  }

  return (
    <main className="relative isolate flex h-[100dvh] flex-col overflow-x-hidden overflow-y-auto overscroll-contain bg-[#090b12] font-sans text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-15%,rgba(125,91,255,0.28),transparent_42%),radial-gradient(circle_at_0%_85%,rgba(189,82,223,0.12),transparent_34%),linear-gradient(180deg,#11131d_0%,#090b12_68%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:48px_48px]" />

      <span ref={exitButtonRef} tabIndex={-1} className="sr-only">文游页面</span>
      <ExperienceHeader partner={partner} onExit={handleExit} />
      {session.stage === STORY_STAGES.ROLE ? (
        <CharacterSelection
          characters={visibleCharacters}
          partner={partner}
          roleMessage={roleMessage}
          onBack={() => setSession((current) => ({ ...current, stage: STORY_STAGES.STYLE }))}
          onSelect={selectCharacter}
        />
      ) : (
        <StyleSelection
          styles={storyData.styles || []}
          partner={partner}
          onSelect={selectStyle}
          onExit={handleExit}
        />
      )}

      {toast ? (
        <div role="status" aria-live="polite" className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/15 bg-[#171923]/95 px-5 py-3 text-sm font-semibold text-white shadow-2xl backdrop-blur-xl motion-safe:animate-storyChat">
          {toast}
        </div>
      ) : null}
    </main>
  );
}
