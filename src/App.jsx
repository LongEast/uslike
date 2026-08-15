import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  matchPath,
  useBlocker,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import AppShell from "./components/AppShell.jsx";
import { AuthModal, OnboardingQuestionsModal, ProfileModal } from "./components/AuthModals.jsx";
import CreateRoomModal from "./components/CreateRoomModal.jsx";
import { CheckInModal, CoinHistoryModal } from "./components/CoinWalletUI.jsx";
import Landing from "./components/Landing.jsx";
import MeetModal from "./components/MeetModal.jsx";
import Modal from "./components/Modal.jsx";
import MvpSplash from "./components/MvpSplash.jsx";
import NotificationToast from "./components/NotificationToast.jsx";
import RoomDiscovery from "./components/RoomDiscovery.jsx";
import {
  CooldownModal,
  DepositConfirmModal,
  ExitDepositModal,
  InsufficientCoinsModal,
  ResumeRoomModal,
} from "./components/RoomDepositUI.jsx";
import TextRoom from "./components/TextRoom.jsx";
import VoiceRoom from "./components/VoiceRoom.jsx";
import {
  getGameList,
  getInitialFriends,
  getInitialMessages,
  getMeetTutorialQuestions,
  getMeetTutorialRoom,
  getMockFeed,
  getMockQuestions,
  getMockRooms,
  getMockUser,
  makeFriendFromRoom,
} from "./data/mockData.js";
import { getOnboardingState, recordOnboardingEvent } from "./services/onboarding.js";
import {
  appendTransaction,
  claimDailyCheckIn,
  consumePendingRoomDeparture,
  getActiveCooldown,
  getDocumentNavigationType,
  loadRoomDeposit,
  loadWallet,
  markDepositTransactionForfeited,
  recordQuickExit,
  savePendingRoomDeparture,
  saveRoomDeposit,
  saveWallet,
} from "./services/coinWallet.js";
import {
  createRegistrationPayload,
  loadAuthSession,
  loginUser,
  logoutAndClearSession,
  registerUser,
  saveAuthSession,
  saveValuesTest,
  toAppUser,
  updateStoredAuthUser,
} from "./services/auth.js";
import {
  clearActiveRoomSession,
  DEFAULT_MVP_PATH,
  getReadableKey,
  loadActiveRoomSession,
  normalizeMvpOrigin,
  resolveReadableKey,
  saveActiveRoomSession,
} from "./utils/appRoutes.js";
import { clearStorySession, loadStorySession } from "./utils/storySession.js";
import {
  clearMessageUi,
  createEmptyMessageUi,
  loadMessageUi,
  saveMessageUi,
} from "./utils/messageUi.js";

const StoryExperience = lazy(() => import("./components/StoryExperience.jsx"));

function StoryRouteState({ failed = false, onExit }) {
  const exitButtonRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      exitButtonRef.current?.focus({ preventScroll: true });
    });
    const handleKeyDown = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing || event.repeat) return;
      event.preventDefault();
      onExit();
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
  }, [onExit]);

  return (
    <main className="grid min-h-dvh place-items-center bg-[#05050a] px-6 text-center text-white">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.05] p-8 shadow-2xl">
        <p className="text-xs font-bold tracking-[0.2em] text-[#b9a6ff]">
          {failed ? "STORY LOAD ERROR" : "LOADING STORY"}
        </p>
        <h1 className="mt-3 text-2xl font-black">
          {failed ? "故事没有成功载入" : "正在载入故事…"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/50">
          {failed ? "你可以重新载入，或安全返回进入文游前的页面。" : "正在准备剧本和搭档状态，请稍候。"}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {failed ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-white/10 px-5 py-3 text-sm font-bold hover:bg-white/15"
            >
              重新载入
            </button>
          ) : null}
          <button
            ref={exitButtonRef}
            type="button"
            onClick={onExit}
            className="rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-white/80 hover:bg-white/10"
          >
            返回来源页
          </button>
        </div>
      </div>
    </main>
  );
}

class StoryRouteErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function StoryRoute({ user, onExit, onToast }) {
  const { sessionId } = useParams();
  const location = useLocation();
  const validSession = sessionId === "ice-civilization";
  if (!validSession) return <Navigate to={DEFAULT_MVP_PATH} replace />;
  const userId = String(user?.id || "guest");
  const storedSession = loadStorySession({ sessionId, userId });
  const origin = normalizeMvpOrigin(storedSession?.origin || location.state?.origin);
  const leaveStory = () => {
    clearStorySession({ sessionId, userId });
    onExit({ origin, reason: "load-exit" });
  };
  return (
    <StoryRouteErrorBoundary
      key={location.key}
      fallback={<StoryRouteState failed onExit={leaveStory} />}
    >
      <Suspense fallback={<StoryRouteState onExit={leaveStory} />}>
        <StoryExperience
          sessionId={sessionId}
          userId={userId}
          origin={origin}
          partner={location.state?.partner}
          onExit={onExit}
          onToast={onToast}
        />
      </Suspense>
    </StoryRouteErrorBoundary>
  );
}

function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <main className="main-wash grid min-h-dvh place-items-center px-6 text-center">
      <div className="glass-panel max-w-lg rounded-[32px] px-8 py-14">
        <h1 className="text-3xl font-semibold text-stone-900">页面不存在</h1>
        <p className="mt-3 text-sm text-stone-500">检查链接后重试，或返回 Uslike 消息页。</p>
        <button type="button" onClick={() => navigate(DEFAULT_MVP_PATH)} className="aurora-dark mt-6 rounded-full px-6 py-3 font-semibold text-white">
          返回消息
        </button>
      </div>
    </main>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authSession, setAuthSession] = useState(() => loadAuthSession());
  const initialActiveRoomSession = useMemo(() => loadActiveRoomSession({
    userId: String(authSession?.user?.id || "guest"),
  }), []);
  const mock = useMemo(() => ({
    user: getMockUser(),
    rooms: getMockRooms(),
    questions: getMockQuestions(),
    feed: getMockFeed(),
    friends: getInitialFriends(),
    messages: getInitialMessages(),
    games: getGameList(),
    meetTutorialRoom: getMeetTutorialRoom(),
    meetTutorialQuestions: getMeetTutorialQuestions(),
  }), []);

  const [modal, setModal] = useState(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(Boolean(authSession));
  const [user, setUser] = useState(() => (authSession ? toAppUser(authSession.user) : mock.user));
  const [friends, setFriends] = useState(mock.friends);
  const [threads, setThreads] = useState(mock.messages);
  const [currentRoom, setCurrentRoom] = useState(() => initialActiveRoomSession?.room || null);
  const [currentRoomMode, setCurrentRoomMode] = useState(() => initialActiveRoomSession?.mode || null);
  const [waitingRoom, setWaitingRoom] = useState(null);
  const [toast, setToast] = useState("");
  const [meetTutorialStep, setMeetTutorialStep] = useState(null);
  const [questionnaireContext, setQuestionnaireContext] = useState("registration");
  const [questionnaireRevision, setQuestionnaireRevision] = useState(0);
  const [wallet, setWallet] = useState(() => loadWallet());
  const [roomDeposit, setRoomDeposit] = useState(() => loadRoomDeposit());
  const [pendingEntry, setPendingEntry] = useState(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [exitIsQuick, setExitIsQuick] = useState(false);
  const [messageUi, setMessageUi] = useState(() => loadMessageUi(
    String(authSession?.user?.id || "guest"),
  ));
  const toastTimer = useRef(null);
  const tutorialDismissNoticeShownRef = useRef(new Set());
  const resumePromptShownRef = useRef(false);
  const storyReturnFocusRef = useRef(null);
  const previousPathRef = useRef(location.pathname);

  const roomRouteMatch = matchPath("/mvp/rooms/:roomKey/:mode", location.pathname);
  const mustConfirmRoomExit = Boolean(
    currentRoom
    && !currentRoom.isFriend
    && !currentRoom.isTutorial
    && roomDeposit?.frozen
    && roomDeposit.roomId === currentRoom.id,
  );
  const blocker = useBlocker(({ currentLocation, nextLocation }) => (
    mustConfirmRoomExit
    && Boolean(matchPath("/mvp/rooms/:roomKey/:mode", currentLocation.pathname))
    && `${currentLocation.pathname}${currentLocation.search}` !== `${nextLocation.pathname}${nextLocation.search}`
  ));

  useEffect(() => saveWallet(wallet), [wallet]);
  useEffect(() => saveRoomDeposit(roomDeposit), [roomDeposit]);
  useEffect(() => {
    saveMessageUi(messageUi, String(authSession?.user?.id || "guest"));
  }, [authSession?.user?.id, messageUi]);
  useEffect(() => {
    if (currentRoom && currentRoomMode) {
      saveActiveRoomSession(currentRoom, currentRoomMode, {
        userId: String(authSession?.user?.id || user?.id || "guest"),
      });
    }
    else clearActiveRoomSession();
  }, [authSession?.user?.id, currentRoom, currentRoomMode, user?.id]);
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    setExitIsQuick(Boolean(roomDeposit?.enteredAt && Date.now() - roomDeposit.enteredAt < 60 * 1000));
    setModal("exit-deposit");
  }, [blocker.state, roomDeposit?.enteredAt]);
  useEffect(() => {
    if (!mustConfirmRoomExit || !roomRouteMatch) return undefined;

    const confirmCrossDocumentExit = (event) => {
      // React Router can block in-app navigation. A hard refresh, tab close,
      // or cross-document Back can only use the browser's native confirmation.
      event.preventDefault();
      event.returnValue = "";
    };
    const markCrossDocumentExit = () => {
      // pagehide only runs after the user accepts beforeunload (or on browsers
      // without that prompt), so cancelling the native dialog never writes a marker.
      savePendingRoomDeparture({
        roomDeposit,
        roomUrl: `${window.location.pathname}${window.location.search}${window.location.hash}`,
        departedAt: Date.now(),
      });
    };
    window.addEventListener("beforeunload", confirmCrossDocumentExit);
    window.addEventListener("pagehide", markCrossDocumentExit);
    return () => {
      window.removeEventListener("beforeunload", confirmCrossDocumentExit);
      window.removeEventListener("pagehide", markCrossDocumentExit);
    };
  }, [location.pathname, mustConfirmRoomExit, roomDeposit]);
  useEffect(() => {
    const settleCrossDocumentExit = (event) => {
      const persistedDeposit = loadRoomDeposit();
      const result = consumePendingRoomDeparture({
        roomDeposit: persistedDeposit,
        currentUrl: `${window.location.pathname}${window.location.search}${window.location.hash}`,
        navigationType: getDocumentNavigationType(),
        pageshowPersisted: Boolean(event?.persisted),
      });
      if (result.action !== "forfeit") return;

      const persistedWallet = loadWallet();
      const nextWallet = markDepositTransactionForfeited(
        persistedWallet,
        result.marker.depositTransactionId || persistedDeposit?.depositTransactionId,
      );
      // Persist synchronously as this can run while restoring a BFCache document
      // whose React state predates the frozen transaction.
      saveWallet(nextWallet);
      saveRoomDeposit(null);
      clearActiveRoomSession();
      setWallet(nextWallet);
      setRoomDeposit(null);
      setCurrentRoom(null);
      setCurrentRoomMode(null);
      setWaitingRoom(null);
      setPendingEntry(null);
      setModal(null);
      resumePromptShownRef.current = true;
      if (result.marker.quickExit) {
        const quickExit = recordQuickExit(result.marker.departedAt);
        setCooldownUntil(quickExit.cooldownUntil);
      }
      setToast("互动保证金 -1\n本次进入后未完成有效互动");
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(""), 2200);
    };

    // Fresh documents usually emit pageshow before React effects subscribe, so
    // settle once on mount and again on later BFCache restorations.
    settleCrossDocumentExit();
    window.addEventListener("pageshow", settleCrossDocumentExit);
    return () => window.removeEventListener("pageshow", settleCrossDocumentExit);
  }, []);
  useEffect(() => {
    const previousPath = previousPathRef.current;
    previousPathRef.current = location.pathname;
    if (!previousPath.startsWith("/mvp/story/") || location.pathname.startsWith("/mvp/story/")) return;
    const previousStoryRoute = matchPath("/mvp/story/:sessionId", previousPath);
    if (previousStoryRoute?.params.sessionId) {
      clearStorySession({
        sessionId: previousStoryRoute.params.sessionId,
        userId: String(user?.id || "guest"),
      });
    }
    window.requestAnimationFrame(() => {
      const target = storyReturnFocusRef.current;
      const storyEntries = [...document.querySelectorAll("[data-story-entry-thread-id]")];
      const element = target?.element instanceof HTMLElement && target.element.isConnected
        ? target.element
        : storyEntries.find((candidate) => candidate.dataset.storyEntryThreadId === target?.threadId)
          || storyEntries[0];
      element?.focus({ preventScroll: true });
    });
  }, [location.pathname, user?.id]);

  const currentUrl = `${location.pathname}${location.search}${location.hash}`;
  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  };
  const openMvp = () => navigate(DEFAULT_MVP_PATH);
  const openStore = () => {
    setModal(null);
    setPendingEntry(null);
    navigate("/mvp/store?section=recharge", { state: { origin: normalizeMvpOrigin(currentUrl) } });
  };
  const handleCheckIn = () => {
    const result = claimDailyCheckIn(wallet);
    if (!result.reward) return;
    setWallet(result.wallet);
    showToast(`签到成功 +${result.reward} 互像币`);
  };
  const spendCoins = (product) => {
    if (wallet.ownedProductIds.includes(product.id)) {
      showToast(`「${product.name}」已经在我的装扮中。`);
      return false;
    }
    if (wallet.balance < product.coinPrice) {
      showToast("互像币余额不足");
      return false;
    }
    setWallet((current) => appendTransaction(
      { ...current, ownedProductIds: [product.id, ...current.ownedProductIds] },
      `购买${product.name}`,
      -product.coinPrice,
    ));
    showToast(`已购买「${product.name}」 · -${product.coinPrice} 互像币`);
    return true;
  };

  const recordMeetTutorialEvent = (event, step) => {
    if (!authSession?.accessToken) return Promise.resolve(null);
    return recordOnboardingEvent(authSession.accessToken, "meet", event, step).catch(() => null);
  };
  const openMeet = async () => {
    setModal("meet");
    if (!authSession?.accessToken) return;
    try {
      const state = await getOnboardingState(authSession.accessToken, "meet");
      if (!state.should_show) return;
      setMeetTutorialStep("join_room");
      await recordMeetTutorialEvent("started", "join_room");
    } catch {
      setMeetTutorialStep(null);
    }
  };
  const advanceMeetTutorial = (step) => {
    setMeetTutorialStep(step);
    void recordMeetTutorialEvent("step_viewed", step);
  };
  const interruptMeetTutorial = () => setMeetTutorialStep(null);
  const shouldShowTutorialDismissNotice = () => {
    const userId = authSession?.user?.id || user?.id || "guest";
    const storageKey = `uslike:meet-tutorial-dismiss-notice:${userId}`;
    if (tutorialDismissNoticeShownRef.current.has(storageKey)) return false;
    tutorialDismissNoticeShownRef.current.add(storageKey);
    try {
      if (window.localStorage.getItem(storageKey)) return false;
      window.localStorage.setItem(storageKey, "shown");
    } catch {
      // The in-memory ref still prevents duplicate notices during this session.
    }
    return true;
  };
  const dismissMeetTutorial = () => {
    const showDismissNotice = shouldShowTutorialDismissNotice();
    void recordMeetTutorialEvent("dismissed", meetTutorialStep);
    setMeetTutorialStep(null);
    setCurrentRoom(null);
    setCurrentRoomMode(null);
    setWaitingRoom(null);
    navigate(DEFAULT_MVP_PATH);
    setModal(showDismissNotice ? "tutorial-dismissed" : null);
  };
  const restartMeetTutorial = () => {
    setCurrentRoom(null);
    setCurrentRoomMode(null);
    setWaitingRoom(null);
    setMeetTutorialStep("join_room");
    setModal("meet");
    void recordMeetTutorialEvent("restarted", "join_room");
  };
  const completeMeetTutorial = async () => {
    await recordMeetTutorialEvent("completed", "open_messages");
    setMeetTutorialStep(null);
    setCurrentRoom(null);
    setCurrentRoomMode(null);
    setWaitingRoom(null);
    setModal(null);
    navigate(DEFAULT_MVP_PATH);
    showToast("新手引导完成，已回到相遇小助手消息页。");
  };

  const persistAuthResponse = (response) => {
    const session = saveAuthSession(response);
    setAuthSession(session);
    setUser(toAppUser(response.user));
    setMessageUi(loadMessageUi(String(response.user.id)));
    setHasCompletedOnboarding(true);
    return session;
  };
  const acceptAuthResponse = (response, message) => {
    persistAuthResponse(response);
    setModal(null);
    showToast(message);
  };
  const handleLogin = async (credentials) => acceptAuthResponse(await loginUser(credentials), "欢迎回来。");
  const saveProfile = async ({ account, profile }) => {
    const response = await registerUser(createRegistrationPayload(account, profile));
    persistAuthResponse(response);
    setQuestionnaireContext("registration");
    setModal("onboarding-questions");
    showToast("注册成功，问卷可以跳过。");
  };
  const saveOnboardingQuestions = async (valuesTest) => {
    if (!authSession?.accessToken) throw new Error("登录信息已失效，请重新登录。");
    await saveValuesTest(authSession.accessToken, valuesTest);
    setQuestionnaireRevision((value) => value + 1);
    setModal(null);
    showToast(questionnaireContext === "settings" ? "价值观问卷已更新。" : "回答已保存，正在为你优化相遇。");
  };
  const skipOnboardingQuestions = () => {
    setModal(null);
    showToast("欢迎进入 Uslike。你之后仍可以补填问卷。");
  };
  const handleLogout = async () => {
    try {
      await logoutAndClearSession(authSession?.accessToken);
    } finally {
      clearMessageUi(String(authSession?.user?.id || user?.id || "guest"));
      setAuthSession(null);
      setHasCompletedOnboarding(false);
      setUser(mock.user);
      setFriends(mock.friends);
      setThreads(mock.messages);
      setCurrentRoom(null);
      setCurrentRoomMode(null);
      clearActiveRoomSession();
      setWaitingRoom(null);
      setMeetTutorialStep(null);
      setMessageUi(createEmptyMessageUi());
      storyReturnFocusRef.current = null;
      navigate(DEFAULT_MVP_PATH, { replace: true });
      setModal("auth-login");
      showToast("已退出登录，请重新登录。");
    }
  };
  const handleAccountUserUpdated = (apiUser) => {
    const session = updateStoredAuthUser(apiUser);
    if (session) setAuthSession(session);
    setUser(toAppUser(apiUser));
  };
  const openSettingsQuestionnaire = () => {
    setQuestionnaireContext("settings");
    setModal("onboarding-questions");
  };

  const addFriendFromRoom = (room) => {
    setFriends((current) => current.some((friend) => friend.id === room.id)
      ? current
      : [makeFriendFromRoom(room), ...current]);
    setThreads((current) => {
      if (current.some((thread) => thread.friendId === room.id)) return current;
      const friendThread = makeFriendFromRoom(room);
      return [{ ...friendThread, friendId: room.id }, ...current];
    });
  };
  const sendFriendMessage = (friendId, message) => {
    setThreads((current) => current.map((thread) => {
      if (thread.friendId !== friendId) return thread;
      const reply = message.type === "image"
        ? { from: "them", text: "我看到图片啦，很有画面感。" }
        : { from: "them", text: "^.^~" };
      return { ...thread, messages: [...thread.messages, { from: "me", ...message }, reply] };
    }));
  };
  const getFriendGameState = (thread) => {
    const conversationCount = thread?.messages.filter((message) => message.from === "me" || message.from === "them").length || 0;
    return { friendGameUnlocked: Boolean(thread), friendTextGameUnlocked: conversationCount >= 50 };
  };
  const enterRoomNow = (room, targetMode) => {
    const friendThread = threads.find((thread) => thread.friendId === room.id);
    const nextRoom = {
      ...room,
      isFriend: Boolean(room.isFriend || friends.some((friend) => friend.id === room.id)),
      ...getFriendGameState(friendThread),
    };
    setWaitingRoom(null);
    setCurrentRoom(nextRoom);
    setCurrentRoomMode(targetMode);
    saveActiveRoomSession(nextRoom, targetMode, {
      userId: String(authSession?.user?.id || user?.id || "guest"),
    });
    setModal(null);
    setPendingEntry(null);
    navigate(`/mvp/rooms/${encodeURIComponent(getReadableKey(nextRoom, [nextRoom]))}/${targetMode}`);
  };
  const finishEntry = (entry, reuseDeposit = false) => {
    if (!entry) return;
    if (!reuseDeposit) {
      const nextWallet = appendTransaction(wallet, "房间互动保证金冻结", -1);
      setWallet(nextWallet);
      setRoomDeposit({
        roomId: entry.room.id,
        room: entry.room,
        enteredAt: Date.now(),
        frozen: true,
        depositTransactionId: nextWallet.transactions[0]?.id,
      });
    }
    if (reuseDeposit && roomDeposit?.roomId !== entry.room.id) {
      setRoomDeposit((current) => current ? { ...current, roomId: entry.room.id, room: entry.room } : current);
    }
    enterRoomNow(entry.room, entry.targetMode);
    if (!reuseDeposit) showToast("1 互像币互动保证金已冻结");
  };
  const requestRoomEntry = (room, targetMode) => {
    const friendThread = threads.find((thread) => thread.friendId === room.id);
    const entryRoom = {
      ...room,
      isFriend: Boolean(room.isFriend || friends.some((friend) => friend.id === room.id)),
      ...getFriendGameState(friendThread),
    };
    if (entryRoom.isFriend || entryRoom.isTutorial) {
      enterRoomNow(entryRoom, targetMode);
      return;
    }
    const entry = { room: entryRoom, targetMode };
    if (roomDeposit?.frozen) {
      const resumable = Date.now() - roomDeposit.enteredAt <= 5 * 60 * 1000;
      if (resumable) {
        setPendingEntry(entry);
        if (waitingRoom && roomDeposit.roomId !== entryRoom.id) {
          finishEntry(entry, true);
          return;
        }
        if (roomDeposit.roomId !== entryRoom.id) {
          setPendingEntry({
            room: roomDeposit.room || entryRoom,
            targetMode: roomDeposit.room?.type === "语音房" ? "voice" : "text",
          });
        }
        setModal("resume-room");
        return;
      }
      setWallet((current) => appendTransaction(current, "异常中断・保证金返还", 1));
      setRoomDeposit(null);
      showToast("上次房间已超出重连时间，冻结保证金已安全返还");
    }
    const cooldown = getActiveCooldown();
    if (cooldown) {
      setCooldownUntil(cooldown.cooldownUntil);
      setModal("cooldown");
      return;
    }
    if (wallet.balance + (roomDeposit?.frozen ? 1 : 0) < 1) {
      setPendingEntry(entry);
      setModal("insufficient-coins");
      return;
    }
    setPendingEntry(entry);
    setModal("deposit-confirm");
  };
  const releaseRoomDeposit = () => {
    if (!roomDeposit?.frozen || !currentRoom || roomDeposit.roomId !== currentRoom.id) return;
    setWallet((current) => appendTransaction(current, "完成首次问题・保证金返还", 1));
    setRoomDeposit(null);
  };
  const exitRoomNow = () => {
    setCurrentRoom(null);
    setCurrentRoomMode(null);
    setModal(null);
    navigate(DEFAULT_MVP_PATH, { replace: true });
  };
  const requestRoomExit = () => {
    if (!mustConfirmRoomExit) exitRoomNow();
    else navigate(DEFAULT_MVP_PATH);
  };
  const confirmDepositExit = () => {
    if (roomDeposit?.depositTransactionId) {
      setWallet((current) => ({
        ...current,
        transactions: current.transactions.map((transaction) => transaction.id === roomDeposit.depositTransactionId
          ? { ...transaction, label: "互动保证金扣除（未完成互动）" }
          : transaction),
      }));
    }
    if (exitIsQuick) {
      const quickExit = recordQuickExit();
      setCooldownUntil(quickExit.cooldownUntil);
    }
    setRoomDeposit(null);
    setCurrentRoom(null);
    setCurrentRoomMode(null);
    setModal(null);
    showToast("互动保证金 -1\n本次进入后未完成有效互动");
    if (blocker.state === "blocked") blocker.proceed();
    else navigate(DEFAULT_MVP_PATH);
  };
  const startWaveRoom = (thread, type) => enterRoomNow({
    id: thread.friendId || thread.id,
    name: `和 ${thread.name} 的电波房`,
    hostName: thread.name,
    hostAvatar: thread.avatar,
    nickname: thread.name,
    type,
    vibe: thread.subtitle,
    interests: [],
    isFriend: true,
    ...getFriendGameState(thread),
  }, type === "语音房" ? "voice" : "text");

  const openStory = (partnerThread, trigger) => {
    const sessionId = "ice-civilization";
    const userId = String(user?.id || "guest");
    clearStorySession({ sessionId, userId });
    storyReturnFocusRef.current = {
      element: trigger,
      threadId: partnerThread?.id,
    };
    navigate(`/mvp/story/${sessionId}`, {
      state: {
        origin: normalizeMvpOrigin(currentUrl),
        partner: partnerThread ? {
          id: partnerThread.friendId || partnerThread.id,
          name: partnerThread.name,
          avatar: partnerThread.avatar,
          isAssistant: partnerThread.id === "thread-welcome",
        } : undefined,
      },
    });
  };
  const exitStory = ({ origin } = {}) => {
    navigate(normalizeMvpOrigin(origin), { replace: true });
    window.requestAnimationFrame(() => {
      const target = storyReturnFocusRef.current;
      const storyEntries = [...document.querySelectorAll("[data-story-entry-thread-id]")];
      const element = target?.element instanceof HTMLElement && target.element.isConnected
        ? target.element
        : storyEntries.find((candidate) => candidate.dataset.storyEntryThreadId === target?.threadId)
          || storyEntries[0];
      element?.focus({ preventScroll: true });
    });
  };

  useEffect(() => {
    const isShellPage = location.pathname.startsWith("/mvp/")
      && !location.pathname.startsWith("/mvp/rooms/")
      && !location.pathname.startsWith("/mvp/story/")
      && location.pathname !== "/mvp/meet";
    if (
      resumePromptShownRef.current
      || !isShellPage
      || modal
      || !roomDeposit?.frozen
      || !roomDeposit.room
      || Date.now() - roomDeposit.enteredAt > 5 * 60 * 1000
    ) return;
    resumePromptShownRef.current = true;
    setPendingEntry({
      room: roomDeposit.room,
        targetMode: currentRoomMode || (roomDeposit.room.type === "语音房" ? "voice" : "text"),
    });
    setModal("resume-room");
  }, [currentRoomMode, location.pathname, modal, roomDeposit]);

  const onboardingModals = (
    <>
      {modal === "auth-login" ? <AuthModal onClose={() => setModal(null)} onLogin={handleLogin} onRegisterStart={() => setModal("profile")} /> : null}
      {modal === "profile" ? (
        <ProfileModal
          defaultUser={{ nickname: "", region: "", interests: [], socialPreferences: [] }}
          onSave={saveProfile}
          onSwitchToLogin={() => setModal("auth-login")}
        />
      ) : null}
      {modal === "onboarding-questions" ? (
        <OnboardingQuestionsModal
          mode={questionnaireContext}
          onClose={() => setModal(null)}
          onSkip={questionnaireContext === "settings" ? () => setModal(null) : skipOnboardingQuestions}
          onSave={saveOnboardingQuestions}
        />
      ) : null}
      {modal === "tutorial-dismissed" ? (
        <Modal title="新手引导已关闭" onClose={() => setModal(null)} width="max-w-md">
          <p className="text-sm leading-7 text-stone-600">以后如果还需要查看新手引导，请前往「设置」，点击「新手引导」即可重新打开。</p>
          <button type="button" onClick={() => setModal(null)} className="aurora-dark mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-glow">我知道了</button>
        </Modal>
      ) : null}
    </>
  );
  const economyModals = (
    <>
      {modal === "check-in" ? <CheckInModal wallet={wallet} onClose={() => setModal(null)} onClaim={handleCheckIn} /> : null}
      {modal === "coin-history" ? <CoinHistoryModal wallet={wallet} onClose={() => setModal(null)} onOpenStore={openStore} /> : null}
      {modal === "deposit-confirm" ? (
        <DepositConfirmModal
          balance={wallet.balance}
          actionLabel="开始互动"
          onCancel={() => { setModal(null); setPendingEntry(null); }}
          onConfirm={() => finishEntry(pendingEntry)}
        />
      ) : null}
      {modal === "insufficient-coins" ? <InsufficientCoinsModal onClose={() => setModal(null)} onCheckIn={() => setModal("check-in")} onStore={openStore} /> : null}
      {modal === "exit-deposit" ? (
        <ExitDepositModal
          quickExit={exitIsQuick}
          onContinue={() => {
            if (blocker.state === "blocked") blocker.reset();
            setModal(null);
          }}
          onExit={confirmDepositExit}
        />
      ) : null}
      {modal === "resume-room" && pendingEntry ? (
        <ResumeRoomModal roomName={pendingEntry.room.name || pendingEntry.room.hostName} onClose={() => setModal(null)} onResume={() => finishEntry(pendingEntry, true)} />
      ) : null}
      {modal === "cooldown" ? <CooldownModal cooldownUntil={cooldownUntil} onClose={() => setModal(null)} /> : null}
    </>
  );
  const renderAppShell = (standalonePage = null) => (
    <AppShell
      user={user}
      feed={mock.feed}
      friends={friends}
      threads={threads}
      games={mock.games}
      onMeet={openMeet}
      onSendMessage={sendFriendMessage}
      onStartWaveRoom={startWaveRoom}
      onToast={showToast}
      onLogout={handleLogout}
      accessToken={authSession?.accessToken}
      questionnaireRevision={questionnaireRevision}
      onAccountUserUpdated={handleAccountUserUpdated}
      onOpenSettingsQuestionnaire={openSettingsQuestionnaire}
      onRestartMeetTutorial={restartMeetTutorial}
      wallet={wallet}
      onOpenWallet={() => setModal("coin-history")}
      onOpenCheckIn={() => setModal("check-in")}
      onCheckIn={handleCheckIn}
      onSpendCoins={spendCoins}
      onOpenStory={openStory}
      messageUi={messageUi}
      onMessageUiChange={setMessageUi}
      standalonePage={standalonePage}
    />
  );

  const protectedPath = location.pathname.startsWith("/mvp") || location.pathname === "/account" || location.pathname === "/status";
  let page;
  if (protectedPath && !hasCompletedOnboarding) {
    page = <MvpSplash onStart={() => setModal("auth-login")} />;
  } else {
    const validRoom = roomRouteMatch
      && ["text", "voice"].includes(roomRouteMatch.params.mode)
      && roomRouteMatch.params.mode === currentRoomMode
      && currentRoom
      && resolveReadableKey(roomRouteMatch.params.roomKey, [currentRoom])?.id === currentRoom.id;
    page = (
      <Routes>
        <Route path="/" element={<Landing onStart={openMvp} />} />
        <Route path="/mvp" element={<Navigate to={DEFAULT_MVP_PATH} replace />} />
        <Route
          path="/mvp/meet"
          element={(
            <RoomDiscovery
              rooms={meetTutorialStep ? [mock.meetTutorialRoom, ...mock.rooms] : mock.rooms}
              waitingRoom={waitingRoom}
              onBack={() => {
                if (meetTutorialStep) interruptMeetTutorial();
                setWaitingRoom(null);
                navigate(normalizeMvpOrigin(location.state?.origin), { replace: true });
              }}
              onDismissWaiting={() => setWaitingRoom(null)}
              onToast={showToast}
              tutorialStep={meetTutorialStep}
              tutorialRoomId={mock.meetTutorialRoom.id}
              onTutorialMapIntro={() => advanceMeetTutorial("select_assistant")}
              onTutorialSelectRoom={() => advanceMeetTutorial("enter_room")}
              onTutorialEnterRoom={() => advanceMeetTutorial("question_intro")}
              onTutorialDismiss={dismissMeetTutorial}
              onEnterVoice={(room) => requestRoomEntry(room, "voice")}
              onEnterText={(room) => requestRoomEntry(room, "text")}
            />
          )}
        />
        <Route
          path="/mvp/rooms/:roomKey/:mode"
          element={validRoom ? (currentRoomMode === "voice" ? (
            <VoiceRoom
              user={user}
              room={currentRoom}
              questions={mock.questions}
              games={mock.games}
              onExit={requestRoomExit}
              onToast={showToast}
              onAddFriend={addFriendFromRoom}
              onFirstInteraction={releaseRoomDeposit}
            />
          ) : (
            <TextRoom
              user={user}
              room={currentRoom}
              questions={mock.questions}
              games={mock.games}
              tutorialStep={currentRoom.isTutorial ? meetTutorialStep : null}
              tutorialQuestions={mock.meetTutorialQuestions}
              onTutorialStep={advanceMeetTutorial}
              onTutorialDismiss={dismissMeetTutorial}
              onTutorialComplete={completeMeetTutorial}
              onExit={() => { if (currentRoom.isTutorial) interruptMeetTutorial(); requestRoomExit(); }}
              onToast={showToast}
              onAddFriend={addFriendFromRoom}
              onFirstInteraction={releaseRoomDeposit}
            />
          )) : <Navigate to="/mvp/meet" replace />}
        />
        <Route path="/mvp/story/:sessionId" element={<StoryRoute user={user} onExit={exitStory} onToast={showToast} />} />
        <Route path="/mvp/*" element={renderAppShell()} />
        <Route path="/account" element={renderAppShell("account")} />
        <Route path="/status" element={renderAppShell("status")} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    );
  }

  return (
    <>
      {page}
      {protectedPath ? (
        <>
          {modal === "meet" ? (
            <MeetModal
              onClose={meetTutorialStep ? dismissMeetTutorial : () => setModal(null)}
              onCreate={() => setModal("create-room")}
              onJoin={() => {
                if (meetTutorialStep === "join_room") advanceMeetTutorial("map_intro");
                setModal(null);
                setWaitingRoom(null);
                navigate("/mvp/meet", { state: { origin: normalizeMvpOrigin(currentUrl) } });
              }}
              tutorialActive={meetTutorialStep === "join_room"}
              onTutorialDismiss={dismissMeetTutorial}
            />
          ) : null}
          {modal === "create-room" ? (
            <CreateRoomModal
              user={user}
              onClose={() => setModal(null)}
              onCreated={(roomDraft) => {
                setModal(null);
                setWaitingRoom({
                  ...roomDraft,
                  id: `created-${Date.now()}`,
                  hostName: user.nickname,
                  hostAvatar: user.avatar,
                  nickname: user.nickname,
                  region: user.region,
                  interests: user.interests,
                  startedAt: Date.now(),
                });
                navigate("/mvp/meet", { state: { origin: DEFAULT_MVP_PATH } });
                showToast("房间已创建，匹配到玩家并开始互动时才会冻结保证金。");
              }}
            />
          ) : null}
          {onboardingModals}
          {economyModals}
        </>
      ) : null}
      <NotificationToast message={toast} />
    </>
  );
}
