import { useMemo, useRef, useState } from "react";
import AppShell from "./components/AppShell.jsx";
import { OnboardingQuestionsModal, ProfileModal, RegisterModal } from "./components/AuthModals.jsx";
import CreateRoomModal from "./components/CreateRoomModal.jsx";
import Landing from "./components/Landing.jsx";
import MeetModal from "./components/MeetModal.jsx";
import RoomDiscovery from "./components/RoomDiscovery.jsx";
import TextRoom from "./components/TextRoom.jsx";
import VoiceRoom from "./components/VoiceRoom.jsx";
import {
  getGameList,
  getInitialMessages,
  getMockFeed,
  getMockQuestions,
  getMockRooms,
  getMockUser,
  makeFriendFromRoom,
} from "./data/mockData.js";

export default function App() {
  const mock = useMemo(
    () => ({
      user: getMockUser(),
      rooms: getMockRooms(),
      questions: getMockQuestions(),
      feed: getMockFeed(),
      messages: getInitialMessages(),
      games: getGameList(),
    }),
    [],
  );

  const [phase, setPhase] = useState("landing");
  const [modal, setModal] = useState(null);
  const [activeView, setActiveView] = useState("messages");
  const [user, setUser] = useState(mock.user);
  const [friends, setFriends] = useState([]);
  const [threads, setThreads] = useState(mock.messages);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [waitingRoom, setWaitingRoom] = useState(null);
  const [discoverBackView, setDiscoverBackView] = useState("messages");
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  };

  const saveProfile = (profile) => {
    const interests = Array.from(
      new Set([...profile.interests, profile.customInterest.trim()].filter(Boolean)),
    );

    setUser((current) => ({
      ...current,
      nickname: profile.nickname || current.nickname,
      region: profile.region || current.region,
      interests,
    }));
    setModal("onboarding-questions");
    showToast("基础信息已保存。");
  };

  const skipOnboardingQuestions = () => {
    setModal(null);
    setActiveView("messages");
    setPhase("home");
    showToast("欢迎进入 Uslike。");
  };

  const saveOnboardingQuestions = (questionAnswers) => {
    setUser((current) => ({
      ...current,
      questionAnswers,
    }));
    setModal(null);
    setActiveView("messages");
    setPhase("home");
    showToast(questionAnswers.length ? "回答已保存，正在为你优化相遇。" : "欢迎进入 Uslike。");
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

  if (phase === "landing") {
    return (
      <>
        <Landing onStart={() => setModal("register")} />
        {modal === "register" ? (
          <RegisterModal
            onClose={() => setModal(null)}
            onSuccess={() => {
              showToast("注册成功。");
              setModal("profile");
            }}
          />
        ) : null}
        {modal === "profile" ? <ProfileModal defaultUser={user} onSave={saveProfile} /> : null}
        {modal === "onboarding-questions" ? (
          <OnboardingQuestionsModal
            onSkip={skipOnboardingQuestions}
            onSave={saveOnboardingQuestions}
          />
        ) : null}
        <Toast message={toast} />
      </>
    );
  }

  if (phase === "discover") {
    return (
      <>
        <RoomDiscovery
          rooms={mock.rooms}
          waitingRoom={waitingRoom}
          onBack={() => {
            setWaitingRoom(null);
            setActiveView(discoverBackView);
            setPhase("home");
          }}
          onDismissWaiting={() => setWaitingRoom(null)}
          onToast={showToast}
          onEnterVoice={(room) => {
            setWaitingRoom(null);
            setCurrentRoom(room);
            setPhase("voice");
          }}
          onEnterText={(room) => {
            setWaitingRoom(null);
            setCurrentRoom(room);
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
        onMeet={() => setModal("meet")}
        onSendMessage={sendFriendMessage}
        onToast={showToast}
      />

      {modal === "meet" ? (
        <MeetModal
          onClose={() => setModal(null)}
          onCreate={() => setModal("create-room")}
          onJoin={() => {
            setModal(null);
            setWaitingRoom(null);
            setDiscoverBackView("messages");
            setPhase("discover");
          }}
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
