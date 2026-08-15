import {
  ArrowLeft,
  RotateCcw,
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
import { resolveApiAssetUrl } from "../services/auth.js";
import {
  getStorySceneState,
  isContinueSequence,
  normalizeChoices,
  tokenizeText,
} from "../utils/interactiveStory.js";
import StoryCompanionChat from "./StoryCompanionChat.jsx";

const DEFAULT_WORD_SPEED = 21;
const ASSISTANT_NAME = "相遇小助手";
const EMPTY_SCENE_TEXT = "这一幕暂时没有可用的文字记录。";
const FOCUSABLE_SELECTOR = [
  "button:not([disabled]):not([tabindex='-1'])",
  "a[href]",
  "input:not([disabled]):not([tabindex='-1'])",
  "textarea:not([disabled]):not([tabindex='-1'])",
  "select:not([disabled]):not([tabindex='-1'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");
const NOISE_BACKGROUND =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='.45'/%3E%3C/svg%3E\")";

let fallbackMessageId = 0;

function createMessageId(sender) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  fallbackMessageId += 1;
  return `${sender}-${Date.now()}-${fallbackMessageId}`;
}

function resolveInitialNodeId(storyData, preferredNodeId) {
  const nodes = storyData?.nodes;
  if (!nodes || typeof nodes !== "object") return "";

  const preferred = preferredNodeId == null ? "" : String(preferredNodeId);
  if (preferred && nodes[preferred]) return preferred;

  const rootId = storyData.rootId == null ? "" : String(storyData.rootId);
  if (rootId && nodes[rootId]) return rootId;

  return Object.keys(nodes)[0] || "";
}

function getChoiceTarget(choice) {
  const targets = (choice?.targets?.length ? choice.targets : [choice?.to])
    .filter((target) => target != null && String(target));
  if (!targets.length) return null;
  return String(targets[Math.floor(Math.random() * targets.length)]);
}

export default function InteractiveStory({
  onExit,
  onRestart,
  onSessionChange,
  session,
  partner,
  storyData = defaultStoryData,
  initialNodeId,
  expandInitialText = false,
  wordSpeed = DEFAULT_WORD_SPEED,
}) {
  const resolvedInitialNodeId = useMemo(
    () => resolveInitialNodeId(storyData, initialNodeId),
    [initialNodeId, storyData],
  );
  const [localSession, setLocalSession] = useState(() => ({
    currentNodeId: resolvedInitialNodeId,
    history: [],
    messages: [],
    seenPartnerEvents: [],
  }));
  const [visibleTokenCount, setVisibleTokenCount] = useState(0);
  const [streamFinished, setStreamFinished] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingReplyCount, setPendingReplyCount] = useState(0);
  const [selectedChoiceText, setSelectedChoiceText] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [presentationVersion, setPresentationVersion] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );

  const activeSession = session || localSession;
  const currentNodeId = String(activeSession.currentNodeId || resolvedInitialNodeId);
  const history = Array.isArray(activeSession.history) ? activeSession.history : [];
  const messages = Array.isArray(activeSession.messages) ? activeSession.messages : [];
  const seenPartnerEvents = Array.isArray(activeSession.seenPartnerEvents)
    ? activeSession.seenPartnerEvents
    : [];
  const partnerInfo = useMemo(() => ({
    id: partner?.id || "meet-assistant",
    name: partner?.name || ASSISTANT_NAME,
    avatarUrl: partner?.avatarUrl || partner?.avatar || null,
    isAssistant: partner?.isAssistant !== false,
  }), [partner]);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const storyTextRef = useRef(null);
  const sceneFallbackRef = useRef(null);
  const storyAutoScrollRef = useRef(true);
  const streamTimerRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const navigationLockedRef = useRef(false);
  const replyTimersRef = useRef(new Set());
  const onExitRef = useRef(onExit);
  const onRestartRef = useRef(onRestart);
  const onSessionChangeRef = useRef(onSessionChange);
  const activeSessionRef = useRef(activeSession);
  const expandedInitialNodeRef = useRef(expandInitialText ? currentNodeId : null);

  const nodes = storyData?.nodes;
  const node = nodes?.[String(currentNodeId)] || null;
  const media = node ? storyData?.media?.[String(node.mediaRef)] || null : null;
  const sceneText = typeof media?.text === "string" ? media.text.trim() : "";
  const hasUsableText = Boolean(sceneText);
  const sceneState = getStorySceneState(node, media, imageFailed);
  const isVisualEnding = sceneState === "visual-ending";
  const resolvedSceneImage = resolveApiAssetUrl(node?.image?.src || "");
  const tokens = useMemo(
    () => hasUsableText ? tokenizeText(sceneText) : [],
    [hasUsableText, sceneText],
  );
  const choices = useMemo(() => normalizeChoices(node?.choices), [node]);
  const isContinueScene = isContinueSequence(choices);
  const playPartnerEvents = useMemo(
    () => (storyData?.demo?.partnerEvents || []).filter((event) => event.stage === "play"),
    [storyData],
  );
  const pendingPartnerEvent = useMemo(
    () => playPartnerEvents.find((event) => (
      event.nodeIds?.map(String).includes(currentNodeId)
      && !seenPartnerEvents.includes(event.id)
    )) || null,
    [currentNodeId, playPartnerEvents, seenPartnerEvents],
  );
  const activePartnerEvent = useMemo(
    () => playPartnerEvents.find((event) => event.nodeIds?.map(String).includes(currentNodeId)) || null,
    [currentNodeId, playPartnerEvents],
  );
  const safeWordSpeed = Math.max(12, Number(wordSpeed) || DEFAULT_WORD_SPEED);

  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    onRestartRef.current = onRestart;
  }, [onRestart]);

  useEffect(() => {
    onSessionChangeRef.current = onSessionChange;
  }, [onSessionChange]);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  const updateSession = useCallback((update) => {
    const current = activeSessionRef.current;
    const next = typeof update === "function" ? update(current) : update;
    if (!next || next === current) return current;
    activeSessionRef.current = next;

    if (session) {
      onSessionChangeRef.current?.(next);
    } else {
      setLocalSession(next);
    }
    return next;
  }, [session]);

  const clearStreamTimer = useCallback(() => {
    if (streamTimerRef.current == null) return;
    window.clearInterval(streamTimerRef.current);
    streamTimerRef.current = null;
  }, []);

  const clearTransitionTimer = useCallback(() => {
    if (transitionTimerRef.current == null) return;
    window.clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = null;
  }, []);

  const clearReplyTimers = useCallback(() => {
    replyTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    replyTimersRef.current.clear();
  }, []);

  const resetScenePresentation = useCallback(() => {
    clearStreamTimer();
    storyAutoScrollRef.current = true;
    setVisibleTokenCount(0);
    setStreamFinished(false);
    setSelectedChoiceText(null);
    setImageFailed(false);
  }, [clearStreamTimer]);

  const focusScene = () => {
    window.requestAnimationFrame(() => {
      (storyTextRef.current || sceneFallbackRef.current)?.focus({ preventScroll: true });
    });
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mediaQuery) return undefined;

    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener?.("change", updatePreference);
    return () => mediaQuery.removeEventListener?.("change", updatePreference);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      (closeButtonRef.current || dialog)?.focus({ preventScroll: true });
    });

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !event.defaultPrevented && !event.isComposing && !event.repeat) {
        event.preventDefault();
        onExitRef.current?.();
        return;
      }

      if (event.key !== "Tab" || event.defaultPrevented || !dialog) return;
      const focusable = [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)]
        .filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, []);

  useEffect(() => () => {
    clearStreamTimer();
    clearTransitionTimer();
    clearReplyTimers();
  }, [clearReplyTimers, clearStreamTimer, clearTransitionTimer]);

  useEffect(() => {
    resetScenePresentation();

    if (
      !node
      || !tokens.length
      || prefersReducedMotion
      || expandedInitialNodeRef.current === currentNodeId
    ) {
      setVisibleTokenCount(tokens.length);
      setStreamFinished(true);
      return undefined;
    }

    let current = 0;
    const timer = window.setInterval(() => {
      current += 1;
      setVisibleTokenCount(Math.min(current, tokens.length));
      if (current >= tokens.length) {
        window.clearInterval(timer);
        if (streamTimerRef.current === timer) streamTimerRef.current = null;
        setStreamFinished(true);
      }
    }, safeWordSpeed);
    streamTimerRef.current = timer;

    return () => {
      window.clearInterval(timer);
      if (streamTimerRef.current === timer) streamTimerRef.current = null;
    };
  }, [currentNodeId, node, prefersReducedMotion, presentationVersion, resetScenePresentation, safeWordSpeed, tokens]);

  useEffect(() => {
    if (!storyAutoScrollRef.current || !storyTextRef.current) return undefined;
    const frame = window.requestAnimationFrame(() => {
      if (storyTextRef.current) storyTextRef.current.scrollTop = storyTextRef.current.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentNodeId, visibleTokenCount]);

  useEffect(() => {
    // Let the player reach the scene context before the partner comments on it.
    if (!pendingPartnerEvent || !streamFinished || isTransitioning) return undefined;

    const eventId = pendingPartnerEvent.id;
    updateSession((current) => {
      const seen = Array.isArray(current.seenPartnerEvents) ? current.seenPartnerEvents : [];
      if (seen.includes(eventId)) return current;
      return {
        ...current,
        messages: [
          ...(Array.isArray(current.messages) ? current.messages : []),
          {
            id: createMessageId("partner"),
            sender: "partner",
            text: pendingPartnerEvent.message,
            eventId,
          },
        ],
        seenPartnerEvents: [...seen, eventId],
      };
    });
    return undefined;
  }, [isTransitioning, pendingPartnerEvent, streamFinished, updateSession]);

  const finishTextImmediately = () => {
    if (streamFinished) return;
    clearStreamTimer();
    setVisibleTokenCount(tokens.length);
    setStreamFinished(true);
  };

  const choose = (choice) => {
    if (navigationLockedRef.current || isTransitioning || !streamFinished) return;
    const nextNodeId = getChoiceTarget(choice);
    if (!nextNodeId) return;

    expandedInitialNodeRef.current = null;
    navigationLockedRef.current = true;
    setSelectedChoiceText(choice.displayText);
    setIsTransitioning(true);
    clearReplyTimers();
    setPendingReplyCount(0);
    clearTransitionTimer();
    transitionTimerRef.current = window.setTimeout(() => {
      transitionTimerRef.current = null;
      resetScenePresentation();
      updateSession((current) => ({
        ...current,
        currentNodeId: nextNodeId,
        history: [...(Array.isArray(current.history) ? current.history : []), currentNodeId],
      }));
      navigationLockedRef.current = false;
      setIsTransitioning(false);
      focusScene();
    }, prefersReducedMotion ? 0 : 420);
  };

  const back = () => {
    if (!history.length || navigationLockedRef.current || isTransitioning) return;
    const previousNodeId = history[history.length - 1];
    navigationLockedRef.current = true;
    expandedInitialNodeRef.current = null;
    clearReplyTimers();
    setPendingReplyCount(0);
    resetScenePresentation();
    updateSession((current) => ({
      ...current,
      history: (Array.isArray(current.history) ? current.history : []).slice(0, -1),
      currentNodeId: previousNodeId,
    }));
    window.requestAnimationFrame(() => {
      navigationLockedRef.current = false;
      focusScene();
    });
  };

  const restart = () => {
    navigationLockedRef.current = false;
    expandedInitialNodeRef.current = null;
    resetScenePresentation();
    clearTransitionTimer();
    clearReplyTimers();
    if (onRestartRef.current) {
      onRestartRef.current();
    } else {
      updateSession((current) => ({
        ...current,
        currentNodeId: resolvedInitialNodeId,
        history: [],
        messages: [],
        seenPartnerEvents: [],
      }));
    }
    setPendingReplyCount(0);
    setIsTransitioning(false);
    setPresentationVersion((current) => current + 1);
    focusScene();
  };

  const sendMessage = (message) => {
    const value = message.trim();
    if (!value) return;

    updateSession((current) => ({
      ...current,
      messages: [
        ...(Array.isArray(current.messages) ? current.messages : []),
        { id: createMessageId("user"), sender: "user", text: value },
      ],
    }));
    setPendingReplyCount((current) => current + 1);

    const replyText = activePartnerEvent?.chatReply
      || storyData?.demo?.defaultChatReply
      || "这个决定还是交给你吧。";

    const timer = window.setTimeout(() => {
      replyTimersRef.current.delete(timer);
      setPendingReplyCount((current) => Math.max(0, current - 1));
      updateSession((current) => ({
        ...current,
        messages: [
          ...(Array.isArray(current.messages) ? current.messages : []),
          {
            id: createMessageId("partner"),
            sender: "partner",
            text: replyText,
          },
        ],
      }));
    }, 850);
    replyTimersRef.current.add(timer);
  };

  const handleStoryTextKeyDown = (event) => {
    if (streamFinished || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    finishTextImmediately();
  };

  const sceneLabel = String(node?.title ?? currentNodeId ?? "—").padStart(2, "0");

  return (
    <main
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="冰人文明互动文游"
      tabIndex={-1}
      className={`absolute inset-0 h-[100dvh] w-full overflow-hidden bg-[#090b12] font-sans text-[#f7f8fb] outline-none transition duration-300 motion-reduce:transition-none ${
        isTransitioning ? "scale-[1.012] opacity-0" : "scale-100 opacity-100"
      }`}
    >
      {resolvedSceneImage && !imageFailed ? (
        <img
          key={resolvedSceneImage}
          src={resolvedSceneImage}
          alt=""
          aria-hidden="true"
          referrerPolicy={node.image.referrerPolicy || "no-referrer"}
          onError={() => setImageFailed(true)}
          className="absolute inset-0 h-full w-full object-cover object-center motion-safe:animate-storyScene"
        />
      ) : null}

      <div className={`absolute inset-0 hidden md:block ${
        isVisualEnding
          ? "bg-[linear-gradient(90deg,rgba(5,7,13,0.42)_0%,rgba(7,9,15,0.13)_45%,rgba(8,10,16,0.08)_100%)]"
          : "bg-[linear-gradient(90deg,rgba(5,7,13,0.97)_0%,rgba(7,9,15,0.89)_32%,rgba(8,10,16,0.48)_60%,rgba(8,10,16,0.15)_100%)]"
      }`} />
      <div className={`absolute inset-0 md:hidden ${
        isVisualEnding
          ? "bg-[linear-gradient(180deg,rgba(6,8,14,0.26)_0%,rgba(6,8,14,0.08)_45%,rgba(6,8,14,0.58)_100%)]"
          : "bg-[linear-gradient(180deg,rgba(6,8,14,0.55)_0%,rgba(6,8,14,0.78)_34%,rgba(6,8,14,0.96)_75%,rgba(6,8,14,0.98)_100%)]"
      }`} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,.45) 0%, transparent 20%, transparent 65%, rgba(0,0,0,.7) 100%), radial-gradient(circle at center, transparent 40%, rgba(0,0,0,.38) 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.055]"
        style={{ backgroundImage: NOISE_BACKGROUND }}
      />

      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 pb-5 pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:pb-7 sm:pl-[max(2rem,env(safe-area-inset-left))] sm:pr-[max(2rem,env(safe-area-inset-right))] sm:pt-[max(1.75rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-3 tracking-[0.04em]">
          <span className="text-[17px] font-extrabold">相遇</span>
          <span className="h-[17px] w-px bg-white/25" />
          <span className="hidden truncate text-sm text-white/60 sm:block">{storyData?.story?.title || "冰人文明"}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden h-8 items-center gap-2 rounded-full border border-white/10 bg-[#07090e]/40 px-3 text-xs text-white/70 backdrop-blur-xl sm:flex">
            <span className="h-[7px] w-[7px] rounded-full bg-[#65e598] shadow-[0_0_0_4px_rgba(101,229,152,0.12)]" />
            与 {partnerInfo.name} 同行
          </span>
          <span className="grid h-8 place-items-center rounded-full border border-white/10 bg-[#07090e]/40 px-3 text-[11px] font-bold tracking-[0.11em] text-white/50 backdrop-blur-xl">
            DEMO
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => onExitRef.current?.()}
            aria-label="退出文游并返回聊天"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-[#07090e]/55 text-white/70 backdrop-blur-xl transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {history.length ? (
        <button
          type="button"
          onClick={back}
          disabled={isTransitioning}
          aria-label="返回上一幕"
          className="absolute left-5 top-[86px] z-20 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-[#07090e]/40 text-white backdrop-blur-xl transition hover:-translate-x-0.5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-wait disabled:opacity-40 sm:left-8 sm:top-[94px]"
        >
          <ArrowLeft size={18} />
        </button>
      ) : null}

      {node && hasUsableText ? (
        <section className="relative z-10 flex h-full w-full flex-col justify-end overflow-y-auto pb-[max(112px,calc(env(safe-area-inset-bottom)+88px))] pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pt-24 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:w-[min(760px,62vw)] md:justify-center md:pb-[105px] md:pl-[clamp(52px,7vw,120px)] md:pr-10 md:pt-[110px]">
          <div className="mb-5 flex items-baseline gap-2 text-[10px] tracking-[0.19em] text-white/45">
            <span>SCENE</span>
            <strong className="text-[13px] text-white/80">{sceneLabel}</strong>
          </div>

          <div
            ref={storyTextRef}
            role={streamFinished ? undefined : "button"}
            tabIndex={streamFinished ? -1 : 0}
            aria-label={streamFinished ? undefined : "故事正文，按回车或空格立即展开全文"}
            onClick={streamFinished ? undefined : finishTextImmediately}
            onKeyDown={handleStoryTextKeyDown}
            onWheel={() => { storyAutoScrollRef.current = false; }}
            onTouchStart={() => { storyAutoScrollRef.current = false; }}
            className={`max-h-[min(37vh,440px)] max-w-[690px] overflow-y-auto whitespace-pre-wrap pr-4 text-[17px] font-normal leading-[1.78] tracking-[0.018em] text-white/[0.94] [scrollbar-width:none] [text-shadow:0_2px_20px_rgba(0,0,0,0.72)] [&::-webkit-scrollbar]:hidden md:max-h-[min(44vh,440px)] md:text-[clamp(18px,1.55vw,24px)] ${
              streamFinished ? "" : "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55"
            }`}
          >
            {tokens.slice(0, visibleTokenCount).map((token, index) => (
              token.newline ? (
                <br key={`line-${index}`} />
              ) : (
                <span key={`word-${index}`} className="motion-safe:animate-storyWord">
                  {token.text}
                </span>
              )
            ))}
            {!streamFinished ? (
              <span className="ml-1 inline-block h-[1.12em] w-[7px] translate-y-[0.17em] rounded-sm bg-white/70 motion-safe:animate-storyCursor" />
            ) : null}
          </div>

          {!streamFinished ? (
            <button
              type="button"
              onClick={finishTextImmediately}
              className="mt-4 w-fit text-[11px] text-white/35 transition hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55"
            >
              点击正文立即展开
            </button>
          ) : null}

          <div
            aria-hidden={!streamFinished}
            className={`mt-7 max-w-[590px] transition duration-500 motion-reduce:transition-none ${
              streamFinished ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
            }`}
          >
            {node.isEnding || !choices.length ? (
              <div className="max-w-[500px] pt-1">
                <div className="mb-2 text-[10px] tracking-[0.24em] text-[#c3afff]">
                  {node.isEnding ? "ENDING" : "STORY PAUSED"}
                </div>
                <h2 className="mb-5 text-2xl font-semibold">
                  {node.isEnding ? "故事抵达一个结局" : "当前节点没有可用选项"}
                </h2>
                <button
                  type="button"
                  tabIndex={streamFinished ? 0 : -1}
                  onClick={restart}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.09] px-5 py-3 font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <RotateCcw size={16} />
                  重新开始
                </button>
              </div>
            ) : (
              <>
                {!isContinueScene ? (
                  <p className="mb-3 text-xs text-white/50">你会怎么做？</p>
                ) : null}
                <div className="grid gap-2.5">
                  {choices.map((choice, index) => {
                    const selected = selectedChoiceText === choice.displayText;
                    return (
                      <button
                        key={choice.id || choice.displayText}
                        type="button"
                        tabIndex={streamFinished ? 0 : -1}
                        disabled={isTransitioning}
                        onClick={() => choose(choice)}
                        aria-label={isContinueScene ? "点击继续" : undefined}
                        className={`group min-h-[60px] w-full items-center rounded-[15px] border border-white/15 bg-[#0a0c13]/55 px-3 py-3 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 disabled:cursor-wait ${
                          isContinueScene
                            ? "flex justify-center text-center"
                            : "grid grid-cols-[36px_minmax(0,1fr)] gap-3 text-left"
                        } ${selected ? "ring-2 ring-white/75" : ""}`}
                      >
                        {!isContinueScene ? (
                          <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-white/[0.07] text-xs font-bold text-white/65">
                            {String.fromCharCode(65 + index)}
                          </span>
                        ) : null}
                        <span className="min-w-0 text-sm font-semibold leading-6 text-white/90 sm:text-[15px]">
                          {isContinueScene ? "点击继续" : choice.displayText}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      ) : isVisualEnding ? (
        <section
          ref={sceneFallbackRef}
          tabIndex={-1}
          aria-label="图片结局"
          className="relative z-10 flex h-full items-end px-[max(1.25rem,env(safe-area-inset-left))] pb-[max(2rem,env(safe-area-inset-bottom))] pt-28 outline-none sm:px-8 sm:pb-10 md:items-center md:px-[clamp(52px,7vw,120px)]"
        >
          <button
            type="button"
            onClick={restart}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-[#090b12]/65 px-5 py-3 font-semibold text-white shadow-2xl backdrop-blur-xl transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <RotateCcw size={16} />
            重新开始
          </button>
        </section>
      ) : (
        <section className="relative z-10 grid h-full place-items-center px-6 text-center">
          <div
            ref={sceneFallbackRef}
            tabIndex={-1}
            className="max-w-md rounded-[24px] border border-white/15 bg-[#0b0d13]/85 p-7 outline-none shadow-2xl backdrop-blur-xl"
          >
            <p className="text-xs font-semibold tracking-[0.2em] text-[#c3afff]">STORY ERROR</p>
            <h1 className="mt-3 text-xl font-semibold">
              {sceneState === "missing-ending-image"
                ? "结局插图暂时无法加载"
                : node ? "这一幕缺少可用正文" : "找不到故事节点"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/55">
              {sceneState === "missing-ending-image"
                ? "请稍后重试，或重新开始故事。"
                : node
                ? `${EMPTY_SCENE_TEXT} 你可以重新开始，或返回聊天。`
                : `节点 ${currentNodeId || "未提供"} 暂时无法读取。`}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {resolvedInitialNodeId ? (
                <button
                  type="button"
                  onClick={restart}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
                >
                  <RotateCcw size={16} />
                  重新开始
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onExitRef.current?.()}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/75 hover:bg-white/10"
              >
                返回聊天
              </button>
            </div>
          </div>
        </section>
      )}

      {node && hasUsableText ? (
        <footer className="absolute bottom-8 left-[clamp(52px,7vw,120px)] z-20 hidden items-center gap-2 text-[10px] tracking-[0.03em] text-white/35 md:flex">
          <span className="h-px w-7 bg-white/25" />
          <span>你是故事的主角</span>
          <span className="opacity-50">·</span>
          <span>选择会改变之后的剧情</span>
        </footer>
      ) : null}

      {node && hasUsableText ? (
        <StoryCompanionChat
          messages={messages}
          onSendMessage={sendMessage}
          partner={partnerInfo}
          pendingReplyCount={pendingReplyCount}
          resetKey={presentationVersion}
        />
      ) : null}
    </main>
  );
}
