import { useState } from "react";
import Avatar from "./Avatar.jsx";
import BottomNav from "./BottomNav.jsx";
import { CoinBalancePill } from "./CoinWalletUI.jsx";
import HomeView from "./HomeView.jsx";
import StoreView from "./StoreView.jsx";
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
  onStartWaveRoom,
  onToast,
  onLogout,
  accessToken,
  questionnaireRevision,
  onAccountUserUpdated,
  onOpenSettingsQuestionnaire,
  onRestartMeetTutorial,
  wallet,
  storeOpen,
  onStoreOpen,
  onStoreClose,
  onOpenWallet,
  onOpenCheckIn,
  onCheckIn,
  onSpendCoins,
}) {
  const [settingsPage, setSettingsPage] = useState("hub");
  const [activeChatFriendId, setActiveChatFriendId] = useState(null);

  const renderView = () => {
    if (storeOpen) return (
      <StoreView
        onBack={onStoreClose}
        onToast={onToast}
        coinBalance={wallet.balance}
        ownedProductIds={wallet.ownedProductIds}
        onSpendCoins={onSpendCoins}
      />
    );
    if (activeView === "feed") return <FeedView feed={feed} />;
    if (activeView === "messages") {
      return (
        <MessagesView
          threads={threads}
          games={games}
          activeFriendId={activeChatFriendId}
          onActiveFriendChange={setActiveChatFriendId}
          onSendMessage={onSendMessage}
          onStartWaveRoom={onStartWaveRoom}
          onToast={onToast}
          onOpenStore={onStoreOpen}
          wallet={wallet}
          onOpenCheckIn={onOpenCheckIn}
          onCheckIn={onCheckIn}
        />
      );
    }
    if (activeView === "friends") {
      return (
        <FriendsView
          friends={friends}
          onOpenChat={(friendId) => {
            setActiveChatFriendId(friendId);
            onNavigate("messages");
          }}
        />
      );
    }
    if (activeView === "settings") {
      return (
        <SettingsView
          user={user}
          onLogout={onLogout}
          accessToken={accessToken}
          questionnaireRevision={questionnaireRevision}
          onAccountUserUpdated={onAccountUserUpdated}
          onOpenSettingsQuestionnaire={onOpenSettingsQuestionnaire}
          onRestartMeetTutorial={onRestartMeetTutorial}
          onOpenStore={onStoreOpen}
          onToast={onToast}
          coinBalance={wallet.balance}
          accountOpen={settingsPage === "account"}
          onOpenAccount={() => setSettingsPage("account")}
          onCloseAccount={() => setSettingsPage("hub")}
        />
      );
    }
    return <HomeView user={user} feed={feed} onMeet={onMeet} wallet={wallet} onOpenCheckIn={onOpenCheckIn} onCheckIn={onCheckIn} onOpenStore={onStoreOpen} />;
  };

  return (
    <main className="main-wash relative min-h-screen overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[6%] h-[30rem] w-[30rem] animate-floaty rounded-full bg-[#d7e3ff]/48 blur-3xl" />
        <div className="absolute right-[-10%] top-[18%] h-[34rem] w-[34rem] animate-floaty rounded-full bg-[#e6d8ff]/38 blur-3xl [animation-delay:1s]" />
        <div className="absolute bottom-[-8%] left-[34%] h-[32rem] w-[32rem] animate-floaty rounded-full bg-[#eadcff]/44 blur-3xl [animation-delay:2s]" />
        <div className="absolute bottom-[5%] right-[7%] h-44 w-44 rotate-12 rounded-[28px] bg-white/34 blur-sm" />
      </div>

      <header className="fixed left-6 top-5 z-30 flex items-center gap-3 rounded-full border border-white/70 bg-white/56 px-3 py-2 shadow-soft backdrop-blur-xl">
        <Avatar src={user.avatar} name={user.nickname} size="sm" />
        <span className="font-semibold text-stone-800">{user.nickname}</span>
        <CoinBalancePill balance={wallet.balance} onClick={onOpenWallet} compact />
      </header>

      <div className="relative z-10">{renderView()}</div>

      <BottomNav
        active={activeView}
        onSelect={(key) => {
          onStoreClose();
          if (key === "meet") {
            onMeet();
            return;
          }
          if (key === "settings") setSettingsPage("hub");
          onNavigate(key);
        }}
      />
    </main>
  );
}
