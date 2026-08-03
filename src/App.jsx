import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "./components/AppShell.jsx";
import { AuthModal, OnboardingQuestionsModal, ProfileModal } from "./components/AuthModals.jsx";
import CreateRoomModal from "./components/CreateRoomModal.jsx";
import Landing from "./components/Landing.jsx";
import MeetModal from "./components/MeetModal.jsx";
import MvpSplash from "./components/MvpSplash.jsx";
import RoomDiscovery from "./components/RoomDiscovery.jsx";
import TextRoom from "./components/TextRoom.jsx";
import VoiceRoom from "./components/VoiceRoom.jsx";
import {
  getGameList,
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
  const [friends, setFriends] = useState([]);
  const [threads, setThreads] = useState(mock.messages);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [waitingRoom, setWaitingRoom] = useState(null);
  const [discoverBackView, setDiscoverBackView] = useState("messages");
  const [toast, setToast] = useState("");
  const [meetTutorialStep, setMeetTutorialStep] = useState(null);
  const [questionnaireContext, setQuestionnaireContext] = useState("registration");
  const [questionnaireRevision, setQuestionnaireRevision] = useState(0);
  const toastTimer = useRef(null);

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

  const dismissMeetTutorial = async () => {
    void recordMeetTutorialEvent("dismissed", meetTutorialStep);
    setMeetTutorialStep(null);
    setCurrentRoom(null);
    setWaitingRoom(null);
    setPhase("home");
    setActiveView("messages");
    setModal("meet");
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
      setFriends([]);
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
            const friendThread = threads.find((thread) => thread.friendId === room.id);
            setWaitingRoom(null);
            setCurrentRoom({
              ...room,
              isFriend: friends.some((friend) => friend.id === room.id),
              ...getFriendGameState(friendThread),
            });
            setPhase("voice");
          }}
          onEnterText={(room) => {
            const friendThread = threads.find((thread) => thread.friendId === room.id);
            setWaitingRoom(null);
            setCurrentRoom({
              ...room,
              isFriend: friends.some((friend) => friend.id === room.id),
              ...getFriendGameState(friendThread),
            });
            setPhase("text");
          }}
        />
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
          onExit={() => {
            setPhase("home");
            setActiveView("messages");
          }}
          onToast={showToast}
          onAddFriend={addFriendFromRoom}
        />
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
            setPhase("home");
            setActiveView("messages");
          }}
          onToast={showToast}
          onAddFriend={addFriendFromRoom}
        />
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
            setWaitingRoom({ ...roomDraft, startedAt: Date.now() });
            setDiscoverBackView("messages");
            setPhase("discover");
            showToast("房间已创建，正在等待玩家加入。");
          }}
        />
      ) : null}

      {onboardingModals}

      <Toast message={toast} />
    </>
  );
}

function Toast({ message }) {
  if (!message) return null;

  return (
    <div className="fixed left-1/2 top-6 z-[70] -translate-x-1/2 animate-pop rounded-full border border-white/55 bg-white/42 px-5 py-3 text-sm font-semibold text-stone-800 shadow-[0_18px_48px_rgba(88,95,142,0.16)] backdrop-blur-xl">
      {message}
    </div>
  );
}
