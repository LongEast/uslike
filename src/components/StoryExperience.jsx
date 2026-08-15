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
      className={`grid shrink-0 place-items-center overflow-hidden border border-white/70 bg-gradient-to-br from-[#755cff] to-[#d463f1] font-extrabold text-white shadow-[0_12px_35px_rgba(101,76,220,0.22)] ${
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
        <span className="text-lg font-black tracking-[0.04em] text-stone-800">相遇</span>
        <span className="h-5 w-px bg-[#7a81a4]/25" />
        <span className="truncate text-sm text-stone-500">AI 双人文游</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-full border border-white/75 bg-white/55 py-1.5 pl-2 pr-3 text-xs text-stone-600 shadow-soft backdrop-blur-xl sm:flex">
          <PartnerAvatar partner={partner} size="small" />
          <span className="max-w-28 truncate">与 {partner.name} 同行</span>
        </div>
        <span className="rounded-full border border-white/75 bg-white/55 px-3 py-2 text-[10px] font-bold tracking-[0.12em] text-[#6f7492] shadow-soft backdrop-blur-xl">
          DEMO
        </span>
        <button
          type="button"
          onClick={() => onExit("exit")}
          aria-label="退出文游"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/80 bg-white/60 text-stone-500 shadow-soft backdrop-blur-xl transition hover:bg-white/90 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7d73e6]/60"
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
      <div className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/60 px-4 py-3 text-sm leading-6 text-[#5d6387] shadow-soft backdrop-blur-xl">
        <Sparkles className="mt-0.5 shrink-0 text-[#746de0]" size={17} />
        <span>相遇小助手会模拟搭档的发言，所有剧情决定仍由你作出。</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/60 px-4 py-3 text-sm leading-6 text-[#5d6387] shadow-soft backdrop-blur-xl">
      <Sparkles className="mt-0.5 shrink-0 text-[#746de0]" size={17} />
      <span>Demo 阶段由相遇小助手代理 {partner.name} 的发言与选择。</span>
    </div>
  );
}

function StyleSelection({ styles, partner, onSelect, onExit }) {
  return (
    <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8">
      <div className="mx-auto mb-7 max-w-2xl text-center sm:mb-10 sm:pt-5">
        <p className="mb-3 text-[11px] font-bold tracking-[0.24em] text-[#6b73d9]">STEP 01 · 选择剧本风格</p>
        <h1 className="text-3xl font-black tracking-tight text-stone-800 sm:text-5xl">今晚想经历怎样的故事？</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-stone-500 sm:text-base">
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
            className={`group relative min-h-[230px] overflow-hidden rounded-[26px] border p-5 text-left backdrop-blur-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7d73e6]/60 sm:min-h-[290px] ${
              style.available
                ? "border-white/90 bg-white/70 shadow-[0_24px_80px_rgba(88,95,142,0.17)] hover:-translate-y-1 hover:border-[#9f95eb]/65 hover:bg-white/85"
                : "border-white/75 bg-white/40 shadow-[0_18px_55px_rgba(88,95,142,0.1)] hover:border-white hover:bg-white/60"
            }`}
          >
            <span className={`absolute -right-10 -top-12 h-40 w-40 rounded-full blur-3xl ${
              index === 0 ? "bg-[#c9b9ff]/55" : "bg-[#dbe5ff]/40"
            }`} />
            <span className="relative flex h-full flex-col">
              <span className={`mb-auto grid h-11 w-11 place-items-center rounded-2xl ${
                style.available ? "border border-white/70 bg-[#e7e1ff] text-[#665ecb]" : "border border-white/70 bg-white/55 text-[#9a9db0]"
              }`}>
                {style.available ? <Sparkles size={20} /> : <LockKeyhole size={18} />}
              </span>
              <span className="mt-10 text-[11px] font-bold tracking-[0.18em] text-[#747a9a]">{style.name}</span>
              <strong className="mt-2 block text-xl font-bold text-stone-800">{style.title}</strong>
              <span className="mt-3 block text-sm leading-6 text-stone-500">{style.description}</span>
              <span className={`mt-5 inline-flex items-center gap-2 text-xs font-bold ${
                style.available ? "text-[#655dcc]" : "text-stone-400"
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
        className="mb-5 inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-sm text-stone-500 transition hover:bg-white/60 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7d73e6]/60"
      >
        <ArrowLeft size={16} />
        重选风格
      </button>

      <div className="mb-7 sm:text-center">
        <p className="mb-3 text-[11px] font-bold tracking-[0.24em] text-[#6b73d9]">STEP 02 · 分别选择角色</p>
        <h1 className="text-3xl font-black tracking-tight text-stone-800 sm:text-5xl">选择你要扮演的人</h1>
        <p className="mt-4 text-sm leading-6 text-stone-500 sm:text-base">
          你扮演阿楠；阿美是搭档的独立角色，并不是两个人共同控制一个角色。
        </p>
      </div>

      {roleMessage ? (
        <div className="mx-auto mb-6 flex w-full max-w-xl items-start gap-3 rounded-[22px] border border-white/85 bg-white/65 p-4 shadow-[0_16px_50px_rgba(88,95,142,0.14)] backdrop-blur-xl">
          <PartnerAvatar partner={partner} />
          <div className="min-w-0">
            <p className="mb-1 text-[11px] font-semibold text-[#6861ca]">相遇小助手</p>
            <p className="text-sm leading-6 text-stone-700">{roleMessage.text}</p>
            {!partner.isAssistant ? (
              <p className="mt-1 text-[10px] text-stone-400">正在代理 {partner.name} 演示搭档行为</p>
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
              className={`group relative min-h-[310px] overflow-hidden rounded-[28px] border p-6 text-left backdrop-blur-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7d73e6]/60 ${
                isPlayer
                  ? "border-white/90 bg-white/70 shadow-[0_25px_80px_rgba(88,95,142,0.17)] hover:-translate-y-1 hover:border-[#9f95eb]/70 hover:bg-white/90"
                  : "border-white/75 bg-white/45 shadow-[0_18px_55px_rgba(88,95,142,0.1)] hover:border-white hover:bg-white/60"
              }`}
            >
              <span className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#cbbcff]/45 blur-3xl" />
              <span className="relative flex h-full flex-col">
                <span className={`grid h-16 w-16 place-items-center rounded-[22px] text-xl font-black ${
                  isPlayer ? "border border-white/70 bg-[#e7e1ff] text-[#655dcc]" : "border border-white/70 bg-white/55 text-[#8c90a7]"
                }`}>
                  {character.name.slice(0, 1)}
                </span>
                <span className="mt-8 text-[11px] font-bold tracking-[0.16em] text-[#747a9a]">{character.role}</span>
                <strong className="mt-2 block text-3xl font-black text-stone-800">{character.name}</strong>
                <span className="mt-3 block text-sm leading-6 text-stone-500">{character.description}</span>
                <span className={`mt-auto flex items-center gap-2 pt-7 text-xs font-bold ${
                  isPlayer ? "text-[#655dcc]" : "text-stone-400"
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
      <main className="main-wash relative isolate grid min-h-[100dvh] place-items-center overflow-hidden px-6 text-center text-stone-800">
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-16 h-96 w-96 rounded-full bg-[#d7e3ff]/55 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-8 h-[28rem] w-[28rem] rounded-full bg-[#e6d8ff]/55 blur-3xl" />
        <div className="glass-panel relative max-w-md rounded-[28px] p-8">
          <p className="text-xs font-bold tracking-[0.2em] text-[#6b73d9]">STORY NOT FOUND</p>
          <h1 className="mt-3 text-2xl font-black">这个剧本暂时不可用</h1>
          <p className="mt-3 text-sm leading-6 text-stone-500">当前 Demo 仅开放《冰人文明》。</p>
          <button type="button" onClick={() => handleExit("unavailable")} className="aurora-dark mt-6 rounded-full px-5 py-3 text-sm font-bold text-white shadow-glow transition hover:-translate-y-0.5 hover:brightness-110">
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
    <main className="main-wash relative isolate flex h-[100dvh] flex-col overflow-x-hidden overflow-y-auto overscroll-contain font-sans text-stone-800">
      <div aria-hidden="true" className="pointer-events-none absolute left-[-9%] top-[4%] h-[30rem] w-[30rem] rounded-full bg-[#d7e3ff]/55 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute right-[-11%] top-[16%] h-[34rem] w-[34rem] rounded-full bg-[#e6d8ff]/50 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-[-20%] left-[28%] h-[32rem] w-[32rem] rounded-full bg-[#eadcff]/50 blur-3xl" />

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
        <div role="status" aria-live="polite" className="aurora-dark fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/40 px-5 py-3 text-sm font-semibold text-white shadow-glow backdrop-blur-xl motion-safe:animate-storyChat">
          {toast}
        </div>
      ) : null}
    </main>
  );
}
