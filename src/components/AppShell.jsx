import Avatar from "./Avatar.jsx";
import BottomNav from "./BottomNav.jsx";
import HomeView from "./HomeView.jsx";
import { FeedView, FriendsView, MessagesView, SettingsView } from "./SimpleViews.jsx";

export default function AppShell({
  user,
  activeView,
  feed,
  friends,
  threads,
  games,
  onMeet,
  onNavigate,
  onSendMessage,
  onToast,
}) {
  const renderView = () => {
    if (activeView === "feed") return <FeedView feed={feed} />;
    if (activeView === "messages") {
      return (
        <MessagesView
          threads={threads}
          games={games}
          onSendMessage={onSendMessage}
          onToast={onToast}
        />
      );
    }
    if (activeView === "friends") return <FriendsView friends={friends} />;
    if (activeView === "settings") return <SettingsView user={user} />;
    return <HomeView user={user} feed={feed} onMeet={onMeet} />;
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff8ee] px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-5%] top-[10%] h-72 w-72 animate-floaty rounded-full bg-[#ffb7a4]/32 blur-3xl" />
        <div className="absolute right-[-8%] top-[22%] h-80 w-80 animate-floaty rounded-full bg-[#8dd8c8]/26 blur-3xl [animation-delay:1s]" />
        <div className="absolute bottom-[9%] left-[35%] h-72 w-72 animate-floaty rounded-full bg-[#ffd37d]/28 blur-3xl [animation-delay:2s]" />
      </div>

      <header className="fixed left-6 top-5 z-30 flex items-center gap-3 rounded-full bg-white/78 px-3 py-2 shadow-soft backdrop-blur-xl">
        <Avatar src={user.avatar} name={user.nickname} size="sm" />
        <span className="pr-2 font-semibold text-stone-800">{user.nickname}</span>
      </header>

      <div className="relative z-10">{renderView()}</div>

      <BottomNav
        active={activeView}
        onSelect={(key) => {
          if (key === "meet") onMeet();
          else onNavigate(key);
        }}
      />
    </main>
  );
}
