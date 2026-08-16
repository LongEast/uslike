import {
  ArrowLeft,
  History,
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
import useStoryDisplayLines from "../hooks/useStoryDisplayLines.js";
import { resolveApiAssetUrl } from "../services/auth.js";
import {
  getStoryAdvanceAction,
  getStorySceneKey,
  getStorySceneState,
  isContinueSequence,
  normalizeChoices,
  normalizeStoryText,
  recordNarrativeProgress,
  resolveStoryPlaybackLine,
  tokenizeText,
} from "../utils/interactiveStory.js";
import StoryCompanionChat from "./StoryCompanionChat.jsx";
import StoryHistoryPanel from "./StoryHistoryPanel.jsx";

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
const STORY_INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "input",
  "textarea",
  "select",
  "summary",
  "details",
  "[contenteditable='true']",
  "[role='dialog']",
  "[role='alertdialog']",
  "[role='menu']",
  "[role='listbox']",
  "[data-story-scroll]",
  "[data-story-interactive]",
  "[data-tutorial-ui]",
].join(",");
const STORY_TEXT_TYPOGRAPHY = "text-[clamp(18px,1.45vw,23px)] font-normal leading-[1.72] tracking-[0.018em]";
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

function isInteractiveStoryTarget(target, root) {
  if (!(target instanceof Element)) return false;
  const boundary = target.closest(STORY_INTERACTIVE_SELECTOR);
  return Boolean(boundary && boundary !== root);
}

function getSceneHistoryView(entry, storyData) {
  const node = storyData?.nodes?.[String(entry?.nodeId || "")];
  const text = normalizeStoryText(storyData?.media?.[String(node?.mediaRef)]?.text);
  const displayedEnd = Math.min(text.length, Math.max(0, Number(entry?.displayedEnd) || 0));
  return {
    sceneKey: entry?.sceneKey,
    nodeId: entry?.nodeId,
    title: node?.title || `Scene ${entry?.nodeId || "—"}`,
    text: text.slice(0, displayedEnd).trim(),
    complete: Boolean(text) && displayedEnd >= text.length,
  };
}

export default function InteractiveStory({
  onExit,
  onRestart,
  onSessionChange,
  session,
  partner,
  storyData = defaultStoryData,
  initialNodeId,
  wordSpeed = DEFAULT_WORD_SPEED,
}) {
  const resolvedInitialNodeId = useMemo(
    () => resolveInitialNodeId(storyData, initialNodeId),
    [initialNodeId, storyData],
  );
  const [localSession, setLocalSession] = useState(() => ({
    currentNodeId: resolvedInitialNodeId,
    history: [],
    narrativeHistory: [],
    messages: [],
    seenPartnerEvents: [],
  }));
  const [activeLineStart, setActiveLineStart] = useState(0);
  const [, setVisibleTokenCount] = useState(0);
  const [streamFinished, setStreamFinished] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingReplyCount, setPendingReplyCount] = useState(0);
  const [selectedChoiceText, setSelectedChoiceText] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [presentationVersion, setPresentationVersion] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );

  const activeSession = session ?? localSession;
  const currentNodeId = String(activeSession.currentNodeId || resolvedInitialNodeId);
  const navigationHistory = Array.isArray(activeSession.history) ? activeSession.history : [];
  const narrativeHistory = Array.isArray(activeSession.narrativeHistory)
    ? activeSession.narrativeHistory
    : [];
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
  const sceneFallbackRef = useRef(null);
  const streamTimerRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const navigationLockedRef = useRef(false);
  const advanceFrameLockedRef = useRef(false);
  const replyTimersRef = useRef(new Set());
  const onExitRef = useRef(onExit);
  const onRestartRef = useRef(onRestart);
  const onSessionChangeRef = useRef(onSessionChange);
  const controlledSessionRef = useRef(session != null);
  const activeSessionRef = useRef(activeSession);
  const historyOpenRef = useRef(historyOpen);
  const streamFinishedRef = useRef(streamFinished);
  const advanceStoryRef = useRef(() => {});
  const pointerStartRef = useRef(null);
  const progressRef = useRef({ sceneKey: "", displayedEnd: 0 });
  const visibleProgressRef = useRef({ sceneKey: "", displayedEnd: 0 });
  const presentationNodeRef = useRef("");

  const nodes = storyData?.nodes;
  const node = nodes?.[currentNodeId] || null;
  const media = node ? storyData?.media?.[String(node.mediaRef)] || null : null;
  const storyText = normalizeStoryText(media?.text);
  const hasUsableText = Boolean(storyText);
  const sceneState = getStorySceneState(node, media, imageFailed);
  const isVisualEnding = sceneState === "visual-ending";
  const resolvedSceneImage = resolveApiAssetUrl(node?.image?.src || "");
  const sceneKey = getStorySceneKey(node, currentNodeId);
  const persistedProgress = narrativeHistory.find((entry) => entry.sceneKey === sceneKey)?.displayedEnd || 0;
  const readFrontier = Math.min(
    storyText.length,
    Math.max(
      persistedProgress,
      progressRef.current.sceneKey === sceneKey ? progressRef.current.displayedEnd : 0,
    ),
  );
  const visibleFrontier = Math.min(
    storyText.length,
    Math.max(
      readFrontier,
      visibleProgressRef.current.sceneKey === sceneKey
        ? visibleProgressRef.current.displayedEnd
        : 0,
    ),
  );
  const {
    containerRef: lineWidthRef,
    measurementRef: lineMeasurementRef,
    lines: storyLines,
    ready: storyLinesReady,
  } = useStoryDisplayLines(storyText);
  const activeLine = resolveStoryPlaybackLine(storyLines, storyText, {
    cursor: activeLineStart,
    displayedEnd: readFrontier,
    visibleEnd: visibleFrontier,
    lineFinished: streamFinished,
  });
  const tokens = useMemo(
    () => activeLine?.text ? tokenizeText(activeLine.text) : [],
    [activeLine?.text],
  );
  const tokenEndOffsets = useMemo(() => {
    if (!activeLine?.text) return [];
    const source = storyText.slice(activeLine.start, activeLine.end);
    const leadingWhitespace = source.length - source.trimStart().length;
    let offset = activeLine.start + leadingWhitespace;
    return tokens.map((token) => {
      offset += token.text.length;
      return offset;
    });
  }, [activeLine?.end, activeLine?.start, activeLine?.text, storyText, tokens]);
  const renderedTokenCount = tokenEndOffsets.reduce(
    (count, end) => count + (end <= visibleFrontier ? 1 : 0),
    0,
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
  const sceneFullyRead = Boolean(
    storyLinesReady
    && activeLine
    && streamFinished
    && readFrontier >= storyText.length,
  );

  controlledSessionRef.current = session != null;

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

  useEffect(() => {
    historyOpenRef.current = historyOpen;
  }, [historyOpen]);

  useEffect(() => {
    streamFinishedRef.current = streamFinished;
  }, [streamFinished]);

  const updateSession = useCallback((update) => {
    const current = activeSessionRef.current;
    const next = typeof update === "function" ? update(current) : update;
    if (!next || next === current) return current;
    activeSessionRef.current = next;

    if (controlledSessionRef.current) onSessionChangeRef.current?.(next);
    else setLocalSession(next);
    return next;
  }, []);

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

  const setFinished = useCallback((finished) => {
    streamFinishedRef.current = finished;
    setStreamFinished(finished);
  }, []);

  const resetTransientPresentation = useCallback(() => {
    clearStreamTimer();
    visibleProgressRef.current = { sceneKey: "", displayedEnd: 0 };
    setActiveLineStart(0);
    setVisibleTokenCount(0);
    setFinished(false);
    setSelectedChoiceText(null);
    setImageFailed(false);
    setHistoryOpen(false);
  }, [clearStreamTimer, setFinished]);

  const focusScene = () => {
    window.requestAnimationFrame(() => {
      (dialogRef.current || sceneFallbackRef.current)?.focus({ preventScroll: true });
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
      (dialog || closeButtonRef.current)?.focus({ preventScroll: true });
    });

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !event.defaultPrevented && !event.isComposing && !event.repeat) {
        event.preventDefault();
        if (historyOpenRef.current) {
          setHistoryOpen(false);
          return;
        }
        onExitRef.current?.();
        return;
      }

      if (
        ["Enter", " "].includes(event.key)
        && !event.defaultPrevented
        && !event.isComposing
        && !event.repeat
        && !historyOpenRef.current
        && !isInteractiveStoryTarget(document.activeElement, dialog)
      ) {
        event.preventDefault();
        advanceStoryRef.current?.();
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
    clearStreamTimer();
    const storedEntry = (activeSessionRef.current.narrativeHistory || [])
      .find((entry) => entry.sceneKey === sceneKey);
    const storedEnd = Math.min(storyText.length, Math.max(0, Number(storedEntry?.displayedEnd) || 0));
    progressRef.current = { sceneKey, displayedEnd: storedEnd };
    presentationNodeRef.current = currentNodeId;
    const restoredComplete = Boolean(storyText.length && storedEnd >= storyText.length);
    visibleProgressRef.current = { sceneKey, displayedEnd: storedEnd };
    setActiveLineStart(restoredComplete ? storyText.length - 1 : storedEnd);
    setVisibleTokenCount(0);
    setFinished(restoredComplete);
    setSelectedChoiceText(null);
    setImageFailed(false);
    setHistoryOpen(false);
  }, [clearStreamTimer, currentNodeId, presentationVersion, sceneKey, setFinished, storyText]);

  const recordVisibleEnd = useCallback((displayedEnd) => {
    const safeEnd = Math.min(storyText.length, Math.max(0, Math.trunc(Number(displayedEnd) || 0)));
    if (visibleProgressRef.current.sceneKey !== sceneKey) {
      visibleProgressRef.current = { sceneKey, displayedEnd: 0 };
    }
    visibleProgressRef.current.displayedEnd = Math.max(
      visibleProgressRef.current.displayedEnd,
      safeEnd,
    );
  }, [sceneKey, storyText.length]);

  const recordDisplayedEnd = useCallback((displayedEnd) => {
    const safeEnd = Math.min(storyText.length, Math.max(0, Math.trunc(Number(displayedEnd) || 0)));
    if (!safeEnd) return;
    if (progressRef.current.sceneKey !== sceneKey) {
      progressRef.current = { sceneKey, displayedEnd: 0 };
    }
    progressRef.current.displayedEnd = Math.max(progressRef.current.displayedEnd, safeEnd);
    recordVisibleEnd(safeEnd);

    updateSession((current) => {
      const nextHistory = recordNarrativeProgress(current.narrativeHistory, {
        sceneKey,
        nodeId: currentNodeId,
        displayedEnd: safeEnd,
      });
      if (nextHistory === current.narrativeHistory) return current;
      return { ...current, narrativeHistory: nextHistory };
    });
  }, [currentNodeId, recordVisibleEnd, sceneKey, storyText.length, updateSession]);

  useEffect(() => {
    clearStreamTimer();
    const initiallyVisibleCount = tokenEndOffsets.reduce(
      (count, end) => count + (end <= visibleFrontier ? 1 : 0),
      0,
    );
    setVisibleTokenCount(initiallyVisibleCount);
    setFinished(false);

    if (
      presentationNodeRef.current !== currentNodeId
      || !node
      || !storyLinesReady
      || !activeLine
      || !tokens.length
    ) return undefined;

    const alreadyDisplayed = progressRef.current.sceneKey === sceneKey
      && progressRef.current.displayedEnd >= activeLine.end;
    const alreadyVisible = visibleProgressRef.current.sceneKey === sceneKey
      && visibleProgressRef.current.displayedEnd >= activeLine.end;
    if (alreadyDisplayed || alreadyVisible || prefersReducedMotion) {
      setVisibleTokenCount(tokens.length);
      setFinished(true);
      if (!alreadyDisplayed) recordDisplayedEnd(activeLine.end);
      return undefined;
    }

    let current = initiallyVisibleCount;
    const timer = window.setInterval(() => {
      current += 1;
      const nextCount = Math.min(current, tokens.length);
      recordVisibleEnd(tokenEndOffsets[nextCount - 1] || activeLine.start);
      setVisibleTokenCount(nextCount);
      if (current >= tokens.length) {
        window.clearInterval(timer);
        if (streamTimerRef.current === timer) streamTimerRef.current = null;
        setFinished(true);
        recordDisplayedEnd(activeLine.end);
      }
    }, safeWordSpeed);
    streamTimerRef.current = timer;

    return () => {
      window.clearInterval(timer);
      if (streamTimerRef.current === timer) streamTimerRef.current = null;
    };
  }, [
    activeLine?.end,
    activeLine?.start,
    activeLine?.text,
    clearStreamTimer,
    currentNodeId,
    node,
    prefersReducedMotion,
    recordDisplayedEnd,
    recordVisibleEnd,
    safeWordSpeed,
    sceneKey,
    setFinished,
    storyLinesReady,
    tokenEndOffsets,
    tokens,
    visibleFrontier,
  ]);

  useEffect(() => {
    if (!pendingPartnerEvent || !sceneFullyRead || isTransitioning) return undefined;
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
  }, [isTransitioning, pendingPartnerEvent, sceneFullyRead, updateSession]);

  const finishTextImmediately = useCallback(() => {
    if (streamFinishedRef.current || !activeLine) return;
    clearStreamTimer();
    setVisibleTokenCount(tokens.length);
    setFinished(true);
    recordDisplayedEnd(activeLine.end);
  }, [activeLine, clearStreamTimer, recordDisplayedEnd, setFinished, tokens.length]);

  const advanceStoryLine = useCallback(() => {
    const blocked = (
      advanceFrameLockedRef.current
      || navigationLockedRef.current
      || isTransitioning
      || historyOpenRef.current
      || !storyLinesReady
      || !activeLine
    );
    const displayedEnd = activeLine
      ? Math.max(progressRef.current.displayedEnd, activeLine.end)
      : 0;
    const action = getStoryAdvanceAction({
      blocked,
      lineFinished: streamFinishedRef.current,
      displayedEnd,
      textLength: storyText.length,
    });
    if (action === "none") return;

    advanceFrameLockedRef.current = true;
    window.requestAnimationFrame(() => {
      advanceFrameLockedRef.current = false;
    });

    if (action === "finish-line") {
      finishTextImmediately();
      return;
    }

    const nextLine = storyLines.find((line) => line.end > displayedEnd);
    if (!nextLine) return;

    clearStreamTimer();
    setActiveLineStart(Math.max(displayedEnd, nextLine.start));
    setVisibleTokenCount(0);
    setFinished(false);
  }, [
    activeLine,
    clearStreamTimer,
    finishTextImmediately,
    isTransitioning,
    setFinished,
    storyLines,
    storyLinesReady,
    storyText.length,
  ]);
  advanceStoryRef.current = advanceStoryLine;

  const choose = (choice) => {
    if (navigationLockedRef.current || isTransitioning || !sceneFullyRead) return;
    const nextNodeId = getChoiceTarget(choice);
    if (!nextNodeId) return;

    navigationLockedRef.current = true;
    setSelectedChoiceText(choice.displayText);
    setIsTransitioning(true);
    clearReplyTimers();
    setPendingReplyCount(0);
    clearTransitionTimer();
    transitionTimerRef.current = window.setTimeout(() => {
      transitionTimerRef.current = null;
      resetTransientPresentation();
      updateSession((current) => ({
        ...current,
        currentNodeId: nextNodeId,
        history: [...(Array.isArray(current.history) ? current.history : []), currentNodeId],
      }));
      setPresentationVersion((current) => current + 1);
      navigationLockedRef.current = false;
      setIsTransitioning(false);
      focusScene();
    }, prefersReducedMotion ? 0 : 420);
  };

  const back = () => {
    if (!navigationHistory.length || navigationLockedRef.current || isTransitioning) return;
    const previousNodeId = navigationHistory[navigationHistory.length - 1];
    navigationLockedRef.current = true;
    clearReplyTimers();
    setPendingReplyCount(0);
    resetTransientPresentation();
    updateSession((current) => ({
      ...current,
      history: (Array.isArray(current.history) ? current.history : []).slice(0, -1),
      currentNodeId: previousNodeId,
    }));
    setPresentationVersion((current) => current + 1);
    window.requestAnimationFrame(() => {
      navigationLockedRef.current = false;
      focusScene();
    });
  };

  const restart = () => {
    navigationLockedRef.current = false;
    resetTransientPresentation();
    clearTransitionTimer();
    clearReplyTimers();
    if (onRestartRef.current) {
      onRestartRef.current();
    } else {
      updateSession((current) => ({
        ...current,
        currentNodeId: resolvedInitialNodeId,
        history: [],
        narrativeHistory: [],
        messages: [],
        seenPartnerEvents: [],
      }));
    }
    progressRef.current = { sceneKey: "", displayedEnd: 0 };
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
          { id: createMessageId("partner"), sender: "partner", text: replyText },
        ],
      }));
    }, 850);
    replyTimersRef.current.add(timer);
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handleBackgroundClick = (event) => {
    if (
      event.defaultPrevented
      || event.button !== 0
      || historyOpenRef.current
      || isInteractiveStoryTarget(event.target, event.currentTarget)
    ) return;
    const pointerStart = pointerStartRef.current;
    pointerStartRef.current = null;
    if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) return;
    const selection = window.getSelection?.();
    if (selection && !selection.isCollapsed) return;
    advanceStoryLine();
  };

  const liveDisplayedEnd = visibleFrontier;
  const currentHistoryScene = {
    sceneKey,
    nodeId: currentNodeId,
    title: node?.title || `Scene ${currentNodeId || "—"}`,
    text: storyText.slice(0, liveDisplayedEnd).trim(),
    complete: Boolean(storyText) && liveDisplayedEnd >= storyText.length,
  };
  const previousHistoryScenes = narrativeHistory
    .filter((entry) => entry.sceneKey !== sceneKey)
    .map((entry) => getSceneHistoryView(entry, storyData));
  const sceneLabel = String(node?.title ?? currentNodeId ?? "—");

  return (
    <main
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="冰人文明互动文游"
      data-story-root
      tabIndex={-1}
      onPointerDown={handlePointerDown}
      onClick={handleBackgroundClick}
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

      <div className={`pointer-events-none absolute inset-0 hidden md:block ${
        isVisualEnding
          ? "bg-[linear-gradient(180deg,rgba(5,7,13,0.22)_0%,rgba(7,9,15,0.06)_54%,rgba(8,10,16,0.54)_100%)]"
          : "bg-[linear-gradient(180deg,rgba(5,7,13,0.28)_0%,rgba(7,9,15,0.02)_44%,rgba(8,10,16,0.76)_100%)]"
      }`} />
      <div className={`pointer-events-none absolute inset-0 md:hidden ${
        isVisualEnding
          ? "bg-[linear-gradient(180deg,rgba(6,8,14,0.26)_0%,rgba(6,8,14,0.08)_45%,rgba(6,8,14,0.58)_100%)]"
          : "bg-[linear-gradient(180deg,rgba(6,8,14,0.36)_0%,rgba(6,8,14,0.06)_38%,rgba(6,8,14,0.86)_100%)]"
      }`} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,.4) 0%, transparent 20%, transparent 66%, rgba(0,0,0,.62) 100%), radial-gradient(circle at center, transparent 42%, rgba(0,0,0,.34) 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.055]"
        style={{ backgroundImage: NOISE_BACKGROUND }}
      />

      <header
        data-story-interactive
        className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 pb-5 pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:pb-7 sm:pl-[max(2rem,env(safe-area-inset-left))] sm:pr-[max(2rem,env(safe-area-inset-right))] sm:pt-[max(1.75rem,env(safe-area-inset-top))]"
      >
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
          <button
            ref={closeButtonRef}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onExitRef.current?.();
            }}
            aria-label="退出文游并返回聊天"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-[#07090e]/55 text-white/70 backdrop-blur-xl transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      <div
        data-story-interactive
        className="absolute left-[max(1.25rem,env(safe-area-inset-left))] top-[max(4.75rem,calc(env(safe-area-inset-top)+4rem))] z-30 flex items-center gap-2 sm:left-[max(2rem,env(safe-area-inset-left))]"
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setHistoryOpen((value) => !value);
          }}
          aria-expanded={historyOpen}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-[#07090e]/52 px-3.5 text-xs font-semibold text-white/76 backdrop-blur-xl transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <History size={15} />
          剧情回顾
        </button>
        {navigationHistory.length ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              back();
            }}
            disabled={isTransitioning}
            aria-label="返回上一幕"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-[#07090e]/52 text-white/76 backdrop-blur-xl transition hover:-translate-x-0.5 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-wait disabled:opacity-40"
          >
            <ArrowLeft size={17} />
          </button>
        ) : null}
      </div>

      <StoryHistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        currentScene={currentHistoryScene}
        previousScenes={previousHistoryScenes}
      />

      {node && hasUsableText ? (
        <section className={`absolute inset-x-0 bottom-[clamp(6.5rem,15vh,10rem)] z-10 px-[max(1rem,env(safe-area-inset-left))] transition-[padding] duration-300 sm:px-[max(2rem,env(safe-area-inset-left))] ${
          chatOpen ? "md:pr-[390px]" : ""
        }`}>
          <div className="relative mx-auto w-full max-w-[1040px]">
            <div
              ref={lineMeasurementRef}
              aria-hidden="true"
              className={`invisible fixed -left-[10000px] top-0 pointer-events-none ${STORY_TEXT_TYPOGRAPHY}`}
              style={{ overflowWrap: "anywhere", whiteSpace: "normal" }}
            >
              {storyText}
            </div>

            <div className="relative overflow-hidden rounded-[18px] bg-[linear-gradient(90deg,transparent_0%,rgba(6,8,14,0.38)_12%,rgba(6,8,14,0.58)_50%,rgba(6,8,14,0.38)_88%,transparent_100%)] px-5 py-5 text-center shadow-[0_18px_70px_rgba(0,0,0,0.16)] sm:px-8 sm:py-6">
              <div className="mb-2 flex items-center justify-center gap-2 text-[9px] tracking-[0.15em] text-white/38">
                <span className="font-semibold text-[#d2c8ff]">旁白</span>
                <span aria-hidden="true">·</span>
                <span className="max-w-48 truncate">{sceneLabel}</span>
              </div>
              <p
                ref={lineWidthRef}
                aria-live="polite"
                className={`min-h-[1.72em] select-text overflow-hidden whitespace-nowrap text-center text-white/[0.95] [text-shadow:0_2px_18px_rgba(0,0,0,0.74)] ${STORY_TEXT_TYPOGRAPHY}`}
              >
                {storyLinesReady ? tokens.slice(0, renderedTokenCount).map((token, index) => (
                  <span key={`${activeLine?.start || 0}-${index}`} className="motion-safe:animate-storyWord">
                    {token.text}
                  </span>
                )) : (
                  <span className="text-white/35">正在排版…</span>
                )}
                {storyLinesReady && !streamFinished ? (
                  <span className="ml-1 inline-block h-[1.06em] w-[6px] translate-y-[0.15em] rounded-sm bg-white/65 motion-safe:animate-storyCursor" />
                ) : null}
              </p>
              {!sceneFullyRead ? (
                <span className="mt-2 block text-[9px] tracking-[0.08em] text-white/30">
                  {streamFinished ? "点击空白处继续" : "点击空白处显示整行"}
                </span>
              ) : null}
            </div>

            {sceneFullyRead ? (
              <div
                data-story-interactive
                className="mx-auto mt-3 max-w-[780px] rounded-[18px] border border-white/12 bg-[#080b12]/68 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl motion-safe:animate-storyChat sm:p-4"
              >
                {node.isEnding || !choices.length ? (
                  <div className="flex flex-wrap items-center justify-between gap-4 px-1">
                    <div>
                      <div className="mb-1 text-[9px] tracking-[0.24em] text-[#c3afff]">
                        {node.isEnding ? "ENDING" : "STORY PAUSED"}
                      </div>
                      <h2 className="text-base font-semibold sm:text-lg">
                        {node.isEnding ? "故事抵达一个结局" : "当前节点没有可用选项"}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        restart();
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.09] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    >
                      <RotateCcw size={15} />
                      重新开始
                    </button>
                  </div>
                ) : (
                  <>
                    {!isContinueScene ? (
                      <p className="mb-2.5 px-1 text-[11px] text-white/45">你会怎么做？</p>
                    ) : null}
                    <div className={`grid gap-2.5 ${isContinueScene ? "" : "sm:grid-cols-2"}`}>
                      {choices.map((choice, index) => {
                        const selected = selectedChoiceText === choice.displayText;
                        return (
                          <button
                            key={choice.id || choice.displayText}
                            type="button"
                            disabled={isTransitioning}
                            onClick={(event) => {
                              event.stopPropagation();
                              choose(choice);
                            }}
                            aria-label={isContinueScene ? "进入下一幕" : undefined}
                            className={`group min-h-[50px] w-full items-center rounded-[14px] border border-white/15 bg-white/[0.065] px-3 py-2.5 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 disabled:cursor-wait ${
                              isContinueScene
                                ? "flex justify-center text-center"
                                : "grid grid-cols-[32px_minmax(0,1fr)] gap-3 text-left"
                            } ${selected ? "ring-2 ring-white/75" : ""}`}
                          >
                            {!isContinueScene ? (
                              <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-white/[0.08] text-[11px] font-bold text-white/65">
                                {String.fromCharCode(65 + index)}
                              </span>
                            ) : null}
                            <span className="min-w-0 text-sm font-semibold leading-6 text-white/90">
                              {isContinueScene ? "进入下一幕" : choice.displayText}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </section>
      ) : isVisualEnding ? (
        <section
          ref={sceneFallbackRef}
          tabIndex={-1}
          aria-label="图片结局"
          data-story-interactive
          className="relative z-10 flex h-full items-end px-[max(1.25rem,env(safe-area-inset-left))] pb-[max(2rem,env(safe-area-inset-bottom))] pt-28 outline-none sm:px-8 sm:pb-10 md:items-center md:px-[clamp(52px,7vw,120px)]"
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              restart();
            }}
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
            data-story-interactive
            className="max-w-md rounded-[24px] border border-[#c6a9ff]/25 bg-[linear-gradient(145deg,rgba(31,22,47,.92),rgba(18,17,34,.94))] p-7 outline-none shadow-[0_24px_80px_rgba(75,45,120,.32)] backdrop-blur-xl"
          >
            <p className="text-xs font-semibold tracking-[0.2em] text-[#d5b9ff]">STORY ERROR</p>
            <h1 className="mt-3 text-xl font-semibold">
              {sceneState === "missing-ending-image"
                ? "结局插图暂时无法加载"
                : node ? "这一幕缺少可用正文" : "找不到故事节点"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#e8ddf7]/65">
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
                  onClick={(event) => {
                    event.stopPropagation();
                    restart();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#aa78e8]/20 px-4 py-2.5 text-sm font-semibold text-[#f2eaff] hover:bg-[#b887f0]/28"
                >
                  <RotateCcw size={16} />
                  重新开始
                </button>
              ) : null}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onExitRef.current?.();
                }}
                className="rounded-xl border border-[#d5b9ff]/20 px-4 py-2.5 text-sm font-semibold text-[#eadff8]/80 hover:bg-[#b887f0]/12"
              >
                返回聊天
              </button>
            </div>
          </div>
        </section>
      )}

      {node ? (
        <StoryCompanionChat
          messages={messages}
          onSendMessage={sendMessage}
          partner={partnerInfo}
          pendingReplyCount={pendingReplyCount}
          resetKey={presentationVersion}
          onOpenChange={setChatOpen}
        />
      ) : null}
    </main>
  );
}
