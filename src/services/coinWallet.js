export const CHECK_IN_REWARDS = [1, 1, 2, 2, 3, 3, 5];

export const COIN_STORAGE_KEY = "uslike:coin-wallet-v1";
export const ROOM_DEPOSIT_STORAGE_KEY = "uslike:room-deposit-v1";
export const QUICK_EXIT_COUNT_KEY = "quickExitCount";
export const QUICK_EXIT_WINDOW_KEY = "quickExitWindowStart";
export const COOLDOWN_UNTIL_KEY = "cooldownUntil";

const HOUR = 60 * 60 * 1000;

export const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const createDefaultWallet = () => ({
  balance: 186,
  streak: 3,
  lastCheckInDate: null,
  transactions: [
    { id: "demo-deep", label: "完成首次深度互动", amount: 2, createdAt: Date.now() - 38 * 60 * 1000 },
    { id: "demo-bubble", label: "购买聊天气泡", amount: -80, createdAt: Date.now() - 72 * 60 * 1000 },
    { id: "demo-comment", label: "有效评论", amount: 1, createdAt: Date.now() - 26 * 60 * 60 * 1000 },
  ],
});

const safeParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export const loadWallet = () => {
  if (typeof window === "undefined") return createDefaultWallet();
  const saved = safeParse(window.localStorage.getItem(COIN_STORAGE_KEY), null);
  return saved ? { ...createDefaultWallet(), ...saved } : createDefaultWallet();
};

export const saveWallet = (wallet) => {
  window.localStorage.setItem(COIN_STORAGE_KEY, JSON.stringify(wallet));
};

export const loadRoomDeposit = () => {
  if (typeof window === "undefined") return null;
  return safeParse(window.localStorage.getItem(ROOM_DEPOSIT_STORAGE_KEY), null);
};

export const saveRoomDeposit = (deposit) => {
  if (!deposit) {
    window.localStorage.removeItem(ROOM_DEPOSIT_STORAGE_KEY);
    window.localStorage.removeItem("roomEnteredAt");
    window.localStorage.removeItem("depositFrozen");
    window.localStorage.removeItem("roomId");
    return;
  }
  window.localStorage.setItem(ROOM_DEPOSIT_STORAGE_KEY, JSON.stringify(deposit));
  window.localStorage.setItem("roomEnteredAt", String(deposit.enteredAt));
  window.localStorage.setItem("depositFrozen", String(Boolean(deposit.frozen)));
  window.localStorage.setItem("roomId", String(deposit.roomId));
};

export const getCheckInState = (wallet, now = new Date()) => {
  const today = getLocalDateKey(now);
  const checkedIn = wallet.lastCheckInDate === today;
  const currentDay = wallet.streak ? ((wallet.streak - 1) % CHECK_IN_REWARDS.length) + 1 : 0;
  const nextDay = (wallet.streak % CHECK_IN_REWARDS.length) + 1;
  const reward = CHECK_IN_REWARDS[nextDay - 1];
  return { checkedIn, currentDay, nextDay, reward };
};

export const appendTransaction = (wallet, label, amount, createdAt = Date.now()) => ({
  ...wallet,
  balance: wallet.balance + amount,
  transactions: [
    { id: `${createdAt}-${Math.random().toString(36).slice(2, 7)}`, label, amount, createdAt },
    ...wallet.transactions,
  ].slice(0, 30),
});

export const claimDailyCheckIn = (wallet, now = new Date()) => {
  const status = getCheckInState(wallet, now);
  if (status.checkedIn) return { wallet, reward: 0 };

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const continued = !wallet.lastCheckInDate || wallet.lastCheckInDate === getLocalDateKey(yesterday);
  const streak = continued ? wallet.streak + 1 : 1;
  const reward = CHECK_IN_REWARDS[(streak - 1) % CHECK_IN_REWARDS.length];
  const nextWallet = appendTransaction(
    { ...wallet, streak, lastCheckInDate: getLocalDateKey(now) },
    "每日签到",
    reward,
    now.getTime(),
  );
  return { wallet: nextWallet, reward };
};

export const getQuickExitState = (now = Date.now()) => {
  if (typeof window === "undefined") return { count: 0, windowStart: 0, cooldownUntil: 0 };
  const windowStart = Number(window.localStorage.getItem(QUICK_EXIT_WINDOW_KEY)) || 0;
  const withinWindow = windowStart && now - windowStart < HOUR;
  return {
    count: withinWindow ? Number(window.localStorage.getItem(QUICK_EXIT_COUNT_KEY)) || 0 : 0,
    windowStart: withinWindow ? windowStart : 0,
    cooldownUntil: Number(window.localStorage.getItem(COOLDOWN_UNTIL_KEY)) || 0,
  };
};

export const recordQuickExit = (now = Date.now()) => {
  const current = getQuickExitState(now);
  const count = current.count + 1;
  const windowStart = current.windowStart || now;
  let cooldownUntil = 0;
  if (count === 2) cooldownUntil = now + 10 * 60 * 1000;
  if (count === 3) cooldownUntil = now + 30 * 60 * 1000;
  if (count === 4) cooldownUntil = now + 60 * 60 * 1000;
  if (count >= 5) {
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    cooldownUntil = endOfDay.getTime();
  }
  window.localStorage.setItem(QUICK_EXIT_COUNT_KEY, String(count));
  window.localStorage.setItem(QUICK_EXIT_WINDOW_KEY, String(windowStart));
  window.localStorage.setItem(COOLDOWN_UNTIL_KEY, String(cooldownUntil));
  return { count, windowStart, cooldownUntil };
};

export const getActiveCooldown = (now = Date.now()) => {
  const state = getQuickExitState(now);
  return state.cooldownUntil > now ? state : null;
};

export const formatCooldown = (milliseconds) => {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
};
