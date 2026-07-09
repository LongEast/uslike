import { useMemo, useRef, useState } from "react";
import AppShell from "./components/AppShell.jsx";
import { ProfileModal, RegisterModal } from "./components/AuthModals.jsx";
import CreateRoomModal from "./components/CreateRoomModal.jsx";
import Landing from "./components/Landing.jsx";
import MeetModal from "./components/MeetModal.jsx";
import RoomDiscovery from "./components/RoomDiscovery.jsx";
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
  const [activeView, setActiveView] = useState("home");
  const [user, setUser] = useState(mock.user);
  const [friends, setFriends] = useState([]);
  const [threads, setThreads] = useState(mock.messages);
  const [currentRoom, setCurrentRoom] = useState(null);
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
    setModal(null);
    setPhase("home");
    showToast("保存成功，欢迎进入 Uslike。");
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
            : { from: "them", text: "收到，我也想继续聊这个。" };

        return {
          ...thread,
          subtitle: message.type === "image" ? "刚刚分享了一张图片。" : message.text,
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
        <Toast message={toast} />
      </>
    );
  }

  if (phase === "discover") {
    return (
      <>
        <RoomDiscovery
          rooms={mock.rooms}
          onBack={() => setPhase("home")}
          onToast={showToast}
          onEnterVoice={(room) => {
            setCurrentRoom(room);
            setPhase("voice");
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
            setActiveView("home");
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
            setPhase("discover");
          }}
        />
      ) : null}

      {modal === "create-room" ? (
        <CreateRoomModal
          onClose={() => setModal(null)}
          onCreated={() => {
            setModal(null);
            showToast("创建成功，等待玩家加入中。");
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
    <div className="fixed left-1/2 top-6 z-[70] -translate-x-1/2 animate-pop rounded-full bg-stone-900/88 px-5 py-3 text-sm font-semibold text-white shadow-soft">
      {message}
    </div>
  );
}
