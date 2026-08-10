import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "./components/AppShell.jsx";
import { AuthModal, OnboardingQuestionsModal, ProfileModal } from "./components/AuthModals.jsx";
import CreateRoomModal from "./components/CreateRoomModal.jsx";
import { CheckInModal, CoinHistoryModal } from "./components/CoinWalletUI.jsx";
import Landing from "./components/Landing.jsx";
import MeetModal from "./components/MeetModal.jsx";
import Modal from "./components/Modal.jsx";
import MvpSplash from "./components/MvpSplash.jsx";
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
  getActiveCooldown,
  loadRoomDeposit,
  loadWallet,
  recordQuickExit,
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

export default function App() {
  const [authSession, setAuthSession] = useState(() => loadAuthSession());
  const [route, setRoute] = useState(() =>
    window.location.pathname.startsWith("/mvp") ? "mvp" : "landing",
  );
  const mock = useMemo(
    () => ({
      user: getMockUser(),
      rooms: getMockRooms(),
      questions: getMockQuestions(),
      feed: getMockFeed(),
      friends: getInitialFriends(),
      messages: getInitialMessages(),
      games: getGameList(),
      meetTutorialRoom: getMeetTutorialRoom(),
      meetTutorialQuestions: getMeetTutorialQuestions(),
    }),
    [],
  );

  const [phase, setPhase] = useState(() =>
    window.location.pathname.startsWith("/mvp") && !authSession ? "splash" : "home",
  );
  const [modal, setModal] = useState(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(Boolean(authSession));
  const [activeView, setActiveView] = useState("messages");
  const [user, setUser] = useState(() => (authSession ? toAppUser(authSession.user) : mock.user));
  const [friends, setFriends] = useState(mock.friends);
  const [threads, setThreads] = useState(mock.messages);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [waitingRoom, setWaitingRoom] = useState(null);
  const [discoverBackView, setDiscoverBackView] = useState("messages");
  const [toast, setToast] = useState("");
  const [meetTutorialStep, setMeetTutorialStep] = useState(null);
  const [questionnaireContext, setQuestionnaireContext] = useState("registration");
  const [questionnaireRevision, setQuestionnaireRevision] = useState(0);
  const [wallet, setWallet] = useState(() => loadWallet());
  const [roomDeposit, setRoomDeposit] = useState(() => loadRoomDeposit());
  const [pendingEntry, setPendingEntry] = useState(null);
  const [storeOpen, setStoreOpen] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [exitIsQuick, setExitIsQuick] = useState(false);
  const toastTimer = useRef(null);
  const tutorialDismissNoticeShownRef = useRef(new Set());
  const resumePromptShownRef = useRef(false);

  useEffect(() => saveWallet(wallet), [wallet]);
  useEffect(() => saveRoomDeposit(roomDeposit), [roomDeposit]);

  useEffect(() => {
    const handleRouteChange = () => {
      const nextRoute = window.location.pathname.startsWith("/mvp") ? "mvp" : "landing";
      setRoute(nextRoute);
      if (nextRoute === "landing") {
        setModal(null);
        setPhase("home");
      } else if (!hasCompletedOnboarding) {
        setModal(null);
        setPhase("splash");
      } else {
        setPhase("home");
      }
    };

    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, [hasCompletedOnboarding]);

  const openMvp = () => {
    window.history.pushState({}, "", "/mvp");
    setRoute("mvp");
    setModal(null);
    setPhase(hasCompletedOnboarding ? "home" : "splash");
    setActiveView("messages");
  };

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  };

  const handleCheckIn = () => {
    const result = claimDailyCheckIn(wallet);
    if (!result.reward) return;
    setWallet(result.wallet);
    showToast(`签到成功 +${result.reward} 互像币`);
  };

  const openStore = () => {
    setModal(null);
    setPendingEntry(null);
    setCurrentRoom(null);
    setPhase("home");
    setStoreOpen(true);
    setActiveView("messages");
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

  const interruptMeetTutorial = () => {
    setMeetTutorialStep(null);
  };

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
    setWaitingRoom(null);
    setPhase("home");
    setActiveView("messages");
    setModal(showDismissNotice ? "tutorial-dismissed" : null);
  };

  const restartMeetTutorial = () => {
    setCurrentRoom(null);
    setWaitingRoom(null);
    setDiscoverBackView("messages");
    setPhase("home");
    setMeetTutorialStep("join_room");
    setModal("meet");
    void recordMeetTutorialEvent("restarted", "join_room");
  };

  const completeMeetTutorial = async () => {
    await recordMeetTutorialEvent("completed", "open_messages");
    setMeetTutorialStep(null);
    setCurrentRoom(null);
    setWaitingRoom(null);
    setModal(null);
    setPhase("home");
    setActiveView("messages");
    showToast("新手引导完成，已回到相遇小助手消息页。");
  };

  const persistAuthResponse = (response) => {
    const session = saveAuthSession(response);
    setAuthSession(session);
    setUser(toAppUser(response.user));
    setHasCompletedOnboarding(true);
    return session;
  };

  const acceptAuthResponse = (response, message) => {
    persistAuthResponse(response);
    setModal(null);
    setActiveView("messages");
    setPhase("home");
    showToast(message);
  };

  const handleLogin = async (credentials) => {
    const response = await loginUser(credentials);
    acceptAuthResponse(response, "欢迎回来。");
  };

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
    setActiveView("messages");
    setPhase("home");
    showToast(questionnaireContext === "settings" ? "价值观问卷已更新。" : "回答已保存，正在为你优化相遇。");
  };

  const skipOnboardingQuestions = async () => {
    setModal(null);
    setActiveView("messages");
    setPhase("home");
    showToast("欢迎进入 Uslike。你之后仍可以补填问卷。");
  };

  const handleLogout = async () => {
    try {
      await logoutAndClearSession(authSession?.accessToken);
    } finally {
      setAuthSession(null);
      setHasCompletedOnboarding(false);
      setUser(mock.user);
      setFriends(mock.friends);
      setThreads(mock.messages);
      setCurrentRoom(null);
      setWaitingRoom(null);
      setMeetTutorialStep(null);
      setActiveView("messages");
      setPhase("splash");
      setRoute("mvp");
      setModal("auth-login");
      window.history.replaceState({}, "", "/mvp");
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
    setFriends((current) => {
      if (current.some((friend) => friend.id === room.id)) return current;
      return [makeFriendFromRoom(room), ...current];
    });
    setThreads((current) => {
      if (current.some((thread) => thread.friendId === room.id)) return current;
      const friendThread = makeFriendFromRoom(room);
      return [{ ...friendThread, friendId: room.id }, ...current];
    });
  };

  const sendFriendMessage = (friendId, message) => {
    setThreads((current) =>
      current.map((thread) => {
        if (thread.friendId !== friendId) return thread;
        const reply =
          message.type === "image"
            ? { from: "them", text: "我看到图片啦，很有画面感。" }
            : { from: "them", text: "^.^~" };

        return {
          ...thread,
          messages: [...thread.messages, { from: "me", ...message }, reply],
        };
      }),
    );
  };

  const getFriendGameState = (thread) => {
    const conversationCount =
      thread?.messages.filter((message) => message.from === "me" || message.from === "them").length || 0;

    return {
      friendGameUnlocked: Boolean(thread),
      friendTextGameUnlocked: conversationCount >= 50,
    };
  };

  const enterRoomNow = (room, targetPhase) => {
    const friendThread = threads.find((thread) => thread.friendId === room.id);
    setWaitingRoom(null);
    setCurrentRoom({
      ...room,
      isFriend: Boolean(room.isFriend || friends.some((friend) => friend.id === room.id)),
      ...getFriendGameState(friendThread),
    });
    setModal(null);
    setPendingEntry(null);
    setPhase(targetPhase);
  };

  const finishEntry = (entry, reuseDeposit = false) => {
    if (!entry) return;
    if (!reuseDeposit) {
      const nextWallet = appendTransaction(wallet, "房间互动保证金冻结", -1);
      const depositTransactionId = nextWallet.transactions[0]?.id;
      setWallet(nextWallet);
      setRoomDeposit({
        roomId: entry.room.id,
        room: entry.room,
        enteredAt: Date.now(),
        frozen: true,
        depositTransactionId,
      });
    }

    if (reuseDeposit && roomDeposit?.roomId !== entry.room.id) {
      setRoomDeposit((current) => current ? { ...current, roomId: entry.room.id, room: entry.room } : current);
    }

    enterRoomNow(entry.room, entry.targetPhase);
    if (!reuseDeposit) showToast("1 互像币互动保证金已冻结");
  };

  const requestRoomEntry = (room, targetPhase) => {
    const friendThread = threads.find((thread) => thread.friendId === room.id);
    const entryRoom = {
      ...room,
      isFriend: Boolean(room.isFriend || friends.some((friend) => friend.id === room.id)),
      ...getFriendGameState(friendThread),
    };
    if (entryRoom.isFriend || entryRoom.isTutorial) {
      enterRoomNow(entryRoom, targetPhase);
      return;
    }

    const entry = { room: entryRoom, targetPhase };
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
            targetPhase: roomDeposit.room?.type === "语音房" ? "voice" : "text",
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
    const availableBalance = wallet.balance + (roomDeposit?.frozen ? 1 : 0);
    if (availableBalance < 1) {
      setPendingEntry({ room: entryRoom, targetPhase });
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
    setModal(null);
    setPhase("home");
    setActiveView("messages");
  };

  const requestRoomExit = () => {
    if (!currentRoom || currentRoom.isFriend || currentRoom.isTutorial || !roomDeposit?.frozen || roomDeposit.roomId !== currentRoom.id) {
      exitRoomNow();
      return;
    }
    setExitIsQuick(Date.now() - roomDeposit.enteredAt < 60 * 1000);
    setModal("exit-deposit");
  };

  const confirmDepositExit = () => {
    if (roomDeposit?.depositTransactionId) {
      setWallet((current) => ({
        ...current,
        transactions: current.transactions.map((transaction) =>
          transaction.id === roomDeposit.depositTransactionId
            ? { ...transaction, label: "互动保证金扣除（未完成互动）" }
            : transaction,
        ),
      }));
    }
    if (exitIsQuick) {
      const quickExit = recordQuickExit();
      setCooldownUntil(quickExit.cooldownUntil);
    }
    setRoomDeposit(null);
    exitRoomNow();
    showToast("互动保证金 -1\n本次进入后未完成有效互动");
  };

  const startWaveRoom = (thread, type) => {
    setCurrentRoom({
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
    });
    setPhase(type === "语音房" ? "voice" : "text");
  };

  useEffect(() => {
    if (
      resumePromptShownRef.current ||
      route !== "mvp" ||
      phase !== "home" ||
      modal ||
      !roomDeposit?.frozen ||
      !roomDeposit.room ||
      Date.now() - roomDeposit.enteredAt > 5 * 60 * 1000
    ) return;
    resumePromptShownRef.current = true;
    setPendingEntry({
      room: roomDeposit.room,
      targetPhase: roomDeposit.room.type === "语音房" ? "voice" : "text",
    });
    setModal("resume-room");
  }, [modal, phase, roomDeposit, route]);

  const onboardingModals = (
    <>
      {modal === "auth-login" ? (
        <AuthModal
          onClose={() => setModal(null)}
          onLogin={handleLogin}
          onRegisterStart={() => setModal("profile")}
        />
      ) : null}

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
          <p className="text-sm leading-7 text-stone-600">
            以后如果还需要查看新手引导，请前往「设置」，点击「新手引导」即可重新打开。
          </p>
          <button
            type="button"
            onClick={() => setModal(null)}
            className="aurora-dark mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:brightness-110"
          >
            我知道了
          </button>
        </Modal>
      ) : null}
    </>
  );

  const economyModals = (
    <>
      {modal === "check-in" ? (
        <CheckInModal wallet={wallet} onClose={() => setModal(null)} onClaim={handleCheckIn} />
      ) : null}
      {modal === "coin-history" ? (
        <CoinHistoryModal wallet={wallet} onClose={() => setModal(null)} onOpenStore={openStore} />
      ) : null}
      {modal === "deposit-confirm" ? (
        <DepositConfirmModal
          balance={wallet.balance}
          actionLabel="开始互动"
          onCancel={() => {
            setModal(null);
            setPendingEntry(null);
          }}
          onConfirm={() => finishEntry(pendingEntry)}
        />
      ) : null}
      {modal === "insufficient-coins" ? (
        <InsufficientCoinsModal
          onClose={() => setModal(null)}
          onCheckIn={() => setModal("check-in")}
          onStore={openStore}
        />
      ) : null}
      {modal === "exit-deposit" ? (
        <ExitDepositModal quickExit={exitIsQuick} onContinue={() => setModal(null)} onExit={confirmDepositExit} />
      ) : null}
      {modal === "resume-room" && pendingEntry ? (
        <ResumeRoomModal
          roomName={pendingEntry.room.name || pendingEntry.room.hostName}
          onClose={() => setModal(null)}
          onResume={() => finishEntry(pendingEntry, true)}
        />
      ) : null}
      {modal === "cooldown" ? (
        <CooldownModal cooldownUntil={cooldownUntil} onClose={() => setModal(null)} />
      ) : null}
    </>
  );

  if (route === "landing") return <Landing onStart={openMvp} />;

  if (phase === "splash") {
    return (
      <>
        <MvpSplash onStart={() => setModal("auth-login")} />
        {onboardingModals}
        <Toast message={toast} />
      </>
    );
  }

  if (phase === "discover") {
    return (
      <>
        <RoomDiscovery
          rooms={meetTutorialStep ? [mock.meetTutorialRoom, ...mock.rooms] : mock.rooms}
          waitingRoom={waitingRoom}
          onBack={() => {
            if (meetTutorialStep) interruptMeetTutorial();
            setWaitingRoom(null);
            setActiveView(discoverBackView);
            setPhase("home");
          }}
          onDismissWaiting={() => setWaitingRoom(null)}
          onToast={showToast}
          tutorialStep={meetTutorialStep}
          tutorialRoomId={mock.meetTutorialRoom.id}
          onTutorialMapIntro={() => advanceMeetTutorial("select_assistant")}
          onTutorialSelectRoom={() => advanceMeetTutorial("enter_room")}
          onTutorialEnterRoom={() => advanceMeetTutorial("question_intro")}
          onTutorialDismiss={dismissMeetTutorial}
          onEnterVoice={(room) => {
            requestRoomEntry(room, "voice");
          }}
          onEnterText={(room) => {
            requestRoomEntry(room, "text");
          }}
        />
        {economyModals}
        <Toast message={toast} />
      </>
    );
  }

  if (phase === "voice" && currentRoom) {
    return (
      <>
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
        {economyModals}
        <Toast message={toast} />
      </>
    );
  }

  if (phase === "text" && currentRoom) {
    return (
      <>
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
          onExit={() => {
            if (currentRoom.isTutorial) interruptMeetTutorial();
            requestRoomExit();
          }}
          onToast={showToast}
          onAddFriend={addFriendFromRoom}
          onFirstInteraction={releaseRoomDeposit}
        />
        {economyModals}
        <Toast message={toast} />
      </>
    );
  }

  return (
    <>
      <AppShell
        user={user}
        activeView={activeView}
        feed={mock.feed}
        friends={friends}
        threads={threads}
        games={mock.games}
        onNavigate={setActiveView}
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
        storeOpen={storeOpen}
        onStoreOpen={() => setStoreOpen(true)}
        onStoreClose={() => setStoreOpen(false)}
        onOpenWallet={() => setModal("coin-history")}
        onOpenCheckIn={() => setModal("check-in")}
        onCheckIn={handleCheckIn}
        onSpendCoins={spendCoins}
      />

      {modal === "meet" ? (
        <MeetModal
          onClose={meetTutorialStep ? dismissMeetTutorial : () => setModal(null)}
          onCreate={() => setModal("create-room")}
          onJoin={() => {
            if (meetTutorialStep === "join_room") advanceMeetTutorial("map_intro");
            setModal(null);
            setWaitingRoom(null);
            setDiscoverBackView("messages");
            setPhase("discover");
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
            setDiscoverBackView("messages");
            setPhase("discover");
            showToast("房间已创建，匹配到玩家并开始互动时才会冻结保证金。");
          }}
        />
      ) : null}

      {onboardingModals}
      {economyModals}

      <Toast message={toast} />
    </>
  );
}

function Toast({ message }) {
  if (!message) return null;

  return (
    <div className="fixed left-1/2 top-6 z-[70] -translate-x-1/2 animate-pop whitespace-pre-line rounded-full border border-white/55 bg-white/72 px-5 py-3 text-center text-sm font-semibold text-stone-800 shadow-[0_18px_48px_rgba(88,95,142,0.16)] backdrop-blur-xl">
      {message}
    </div>
  );
}
