import { useMemo, useRef } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import Avatar from "./Avatar.jsx";
import BottomNav from "./BottomNav.jsx";
import { CheckInCard, CoinBalancePill } from "./CoinWalletUI.jsx";
import StoreView from "./StoreView.jsx";
import {
  FeedView,
  FriendStatusView,
  FriendsView,
  MessagesView,
  SettingsView,
  UserDynamicsView,
} from "./SimpleViews.jsx";
import {
  getReadableKey,
  normalizeMvpOrigin,
  normalizeStoreSection,
  resolveReadableKey,
} from "../utils/appRoutes.js";

function UnavailableView({ title = "页面不可用", detail, onBack }) {
  const navigate = useNavigate();
  return (
    <section className="mx-auto grid min-h-[70dvh] w-full max-w-2xl place-items-center pb-32 pt-24 text-center">
      <div className="glass-panel w-full rounded-[32px] px-6 py-16">
        <p className="text-2xl font-semibold text-stone-800">{title}</p>
        <p className="mt-2 text-sm leading-6 text-stone-500">
          {detail || "这个链接不存在，或内容已经不可用。"}
        </p>
        <button
          type="button"
          onClick={onBack || (() => navigate("/mvp/messages", { replace: true }))}
          className="aurora-dark mt-6 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-glow"
        >
          返回消息
        </button>
      </div>
    </section>
  );
}

function FeedUserRoute({ profiles, feed, onBack }) {
  const { userKey } = useParams();
  const profile = resolveReadableKey(userKey, profiles);
  if (!profile) return <UnavailableView title="用户动态不可用" onBack={onBack} />;
  return <UserDynamicsView profile={profile} feed={feed} onBack={onBack} />;
}

function MessageRoute({
  threads,
  games,
  messageUi,
  onMessageUiChange,
  onSendMessage,
  onStartWaveRoom,
  onToast,
  onOpenStore,
  wallet,
  onOpenCheckIn,
  onCheckIn,
  onOpenStory,
}) {
  const navigate = useNavigate();
  const { threadKey } = useParams();
  const requestedThread = threadKey ? resolveReadableKey(threadKey, threads) : threads[0];
  if (threadKey && !requestedThread) {
    return <UnavailableView title="聊天不可用" onBack={() => navigate("/mvp/messages", { replace: true })} />;
  }

  return (
    <MessagesView
      threads={threads}
      games={games}
      activeThreadId={requestedThread?.id}
      onActiveThreadChange={(thread) => {
        const key = getReadableKey(thread, threads);
        navigate(`/mvp/messages/${encodeURIComponent(key)}`);
      }}
      drafts={messageUi.drafts}
      onDraftChange={(threadId, draft) => onMessageUiChange((current) => ({
        ...current,
        drafts: { ...current.drafts, [threadId]: draft },
      }))}
      scrollPositions={messageUi.scrollPositions}
      onScrollPositionChange={(threadId, scrollTop) => onMessageUiChange((current) => ({
        ...current,
        scrollPositions: { ...current.scrollPositions, [threadId]: scrollTop },
      }))}
      onSendMessage={onSendMessage}
      onStartWaveRoom={onStartWaveRoom}
      onToast={onToast}
      onOpenStore={onOpenStore}
      wallet={wallet}
      onOpenCheckIn={onOpenCheckIn}
      onCheckIn={onCheckIn}
      onOpenStory={onOpenStory}
    />
  );
}

export default function AppShell({
  user,
  feed,
  friends,
  threads,
  games,
  onMeet,
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
  onOpenWallet,
  onOpenCheckIn,
  onCheckIn,
  onSpendCoins,
  onOpenStory,
  messageUi,
  onMessageUiChange,
  standalonePage = null,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const profileReturnFocusRef = useRef(null);
  const profiles = useMemo(() => {
    const byId = new Map();
    feed.forEach((item) => {
      const id = item.authorId || `feed-author-${item.user}`;
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          nickname: item.user,
          name: item.user,
          avatar: item.avatar,
          age: item.age,
          gender: item.gender,
          region: item.region,
          interests: item.interests || item.tags,
          vibe: item.bio || item.status,
          status: item.status,
        });
      }
    });
    return [...byId.values()];
  }, [feed]);

  const currentUrl = `${location.pathname}${location.search}${location.hash}`;
  const openStore = () => navigate("/mvp/store?section=recharge", { state: { origin: currentUrl } });
  const closeStore = () => navigate(normalizeMvpOrigin(location.state?.origin), { replace: true });
  const openProfile = (profile, trigger) => {
    profileReturnFocusRef.current = {
      element: trigger,
      userId: trigger?.dataset.profileUserId,
      triggerType: trigger?.dataset.profileTrigger,
    };
    const key = getReadableKey(profile, profiles);
    navigate(`/mvp/feed/users/${encodeURIComponent(key)}`);
  };
  const closeProfile = () => {
    navigate("/mvp/feed", { replace: true });
    window.requestAnimationFrame(() => {
      const returnTarget = profileReturnFocusRef.current;
      const mountedTarget = returnTarget?.element instanceof HTMLElement && returnTarget.element.isConnected
        ? returnTarget.element
        : [...document.querySelectorAll("[data-profile-user-id]")].find((element) => (
          element.dataset.profileUserId === returnTarget?.userId
          && element.dataset.profileTrigger === returnTarget?.triggerType
        ));
      mountedTarget?.focus({ preventScroll: true });
    });
  };

  const activeView = location.pathname.startsWith("/mvp/feed") || location.pathname.startsWith("/mvp/posts/")
    ? "feed"
    : location.pathname.startsWith("/mvp/friends")
      ? "friends"
      : location.pathname.startsWith("/mvp/settings")
          || location.pathname === "/account"
          || location.pathname === "/status"
          || location.pathname.startsWith("/mvp/store")
        ? "settings"
        : "messages";

  const settingsView = (accountOpen = false) => (
    <SettingsView
      user={user}
      onLogout={onLogout}
      accessToken={accessToken}
      questionnaireRevision={questionnaireRevision}
      onAccountUserUpdated={onAccountUserUpdated}
      onOpenSettingsQuestionnaire={onOpenSettingsQuestionnaire}
      onRestartMeetTutorial={onRestartMeetTutorial}
      onOpenStore={openStore}
      onToast={onToast}
      coinBalance={wallet.balance}
      accountOpen={accountOpen}
      onOpenAccount={() => navigate("/account")}
      onCloseAccount={() => navigate("/mvp/settings", { replace: true })}
      friendCount={friends.length}
      onOpenFriendStatus={() => navigate("/status")}
    />
  );
  const standaloneContent = standalonePage === "account"
    ? settingsView(true)
    : standalonePage === "status"
      ? <FriendStatusView friends={friends} onBack={() => navigate("/mvp/settings", { replace: true })} />
      : null;

  return (
    <main className="main-wash relative min-h-screen overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[6%] h-[30rem] w-[30rem] animate-floaty rounded-full bg-[#d7e3ff]/48 blur-3xl" />
        <div className="absolute right-[-10%] top-[18%] h-[34rem] w-[34rem] animate-floaty rounded-full bg-[#e6d8ff]/38 blur-3xl [animation-delay:1s]" />
        <div className="absolute bottom-[-8%] left-[34%] h-[32rem] w-[32rem] animate-floaty rounded-full bg-[#eadcff]/44 blur-3xl [animation-delay:2s]" />
        <div className="absolute bottom-[5%] right-[7%] h-44 w-44 rotate-12 rounded-[28px] bg-white/34 blur-sm" />
      </div>

      <div className="fixed left-6 right-6 top-5 z-30 flex items-start justify-between gap-2 xl:right-auto xl:w-[184px] xl:flex-col xl:justify-start">
        <header className="flex items-center gap-2 rounded-full border border-white/70 bg-white/56 px-2.5 py-2 shadow-soft backdrop-blur-xl xl:w-full">
          <Avatar src={user.avatar} name={user.nickname} size="sm" />
          <span className="font-semibold text-stone-800">{user.nickname}</span>
          <CoinBalancePill balance={wallet.balance} onClick={onOpenWallet} compact />
        </header>
        {activeView !== "messages" ? (
          <CheckInCard wallet={wallet} onOpen={onOpenCheckIn} onClaim={onCheckIn} />
        ) : null}
      </div>

      <div className="relative z-10">
        {standaloneContent || <Routes>
          <Route path="feed" element={<FeedView feed={feed} onOpenUser={openProfile} />} />
          <Route path="feed/users/:userKey" element={<FeedUserRoute profiles={profiles} feed={feed} onBack={closeProfile} />} />
          <Route
            path="messages/:threadKey?"
            element={(
              <MessageRoute
                threads={threads}
                games={games}
                messageUi={messageUi}
                onMessageUiChange={onMessageUiChange}
                onSendMessage={onSendMessage}
                onStartWaveRoom={onStartWaveRoom}
                onToast={onToast}
                onOpenStore={openStore}
                wallet={wallet}
                onOpenCheckIn={onOpenCheckIn}
                onCheckIn={onCheckIn}
                onOpenStory={onOpenStory}
              />
            )}
          />
          <Route
            path="friends"
            element={(
              <FriendsView
                friends={friends}
                onOpenNewFriends={() => onToast("添加联系人功能稍后开放。")}
                onShowNewFriends={(show) => navigate(
                  show ? "/mvp/friends/requests" : "/mvp/friends",
                  { replace: !show },
                )}
                onOpenChat={(friendId) => {
                  const thread = threads.find((item) => item.friendId === friendId);
                  if (!thread) return;
                  navigate(`/mvp/messages/${encodeURIComponent(getReadableKey(thread, threads))}`);
                }}
              />
            )}
          />
          <Route
            path="friends/requests"
            element={(
              <FriendsView
                friends={friends}
                showNewFriends
                onOpenNewFriends={() => onToast("添加联系人功能稍后开放。")}
                onShowNewFriends={(show) => navigate(
                  show ? "/mvp/friends/requests" : "/mvp/friends",
                  { replace: !show },
                )}
              />
            )}
          />
          <Route
            path="settings"
            element={settingsView()}
          />
          <Route path="settings/account" element={<Navigate to="/account" replace />} />
          <Route path="settings/status" element={<Navigate to="/status" replace />} />
          <Route
            path="store"
            element={(
              <StoreView
                onBack={closeStore}
                onToast={onToast}
                coinBalance={wallet.balance}
                ownedProductIds={wallet.ownedProductIds}
                onSpendCoins={onSpendCoins}
                section={normalizeStoreSection(new URLSearchParams(location.search).get("section"))}
                onSectionChange={(section) => navigate(`/mvp/store?section=${section}`, { replace: true, state: location.state })}
              />
            )}
          />
          <Route path="posts/:postId" element={<UnavailableView title="内容不可用" detail="这条分享暂时无法查看，返回消息继续探索吧。" />} />
          <Route path="*" element={<UnavailableView />} />
        </Routes>}
      </div>

      <BottomNav
        active={activeView}
        onSelect={(key) => {
          if (key === "meet") {
            onMeet();
            return;
          }
          const paths = {
            feed: "/mvp/feed",
            messages: "/mvp/messages",
            friends: "/mvp/friends",
            settings: "/mvp/settings",
          };
          navigate(paths[key] || "/mvp/messages");
        }}
      />
    </main>
  );
}
