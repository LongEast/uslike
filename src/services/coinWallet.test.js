import test from "node:test";
import assert from "node:assert/strict";
import {
  CHECK_IN_REWARDS,
  PENDING_ROOM_DEPARTURE_STORAGE_KEY,
  QUICK_EXIT_LIMIT,
  claimDailyCheckIn,
  classifyPendingRoomDeparture,
  consumePendingRoomDeparture,
  createPendingRoomDeparture,
  createDefaultWallet,
  formatCooldown,
  getActiveCooldown,
  getCheckInState,
  getDocumentNavigationType,
  getLocalDateKey,
  markDepositTransactionForfeited,
  recordQuickExit,
  savePendingRoomDeparture,
} from "./coinWallet.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

const frozenDeposit = {
  roomId: "room-ice",
  enteredAt: 1_000,
  frozen: true,
  depositTransactionId: "deposit-1",
};

test("default demo wallet starts at 186 coins on check-in day four", () => {
  const wallet = createDefaultWallet();
  const status = getCheckInState(wallet, new Date(2026, 7, 9, 9));
  assert.equal(wallet.balance, 186);
  assert.equal(status.checkedIn, false);
  assert.equal(status.nextDay, 4);
  assert.equal(status.reward, 2);
});

test("daily check-in adds the shared reward once", () => {
  const now = new Date(2026, 7, 9, 9);
  const wallet = createDefaultWallet();
  const claimed = claimDailyCheckIn(wallet, now);
  assert.equal(claimed.reward, CHECK_IN_REWARDS[3]);
  assert.equal(claimed.wallet.balance, 188);
  assert.equal(claimed.wallet.streak, 4);
  assert.equal(claimed.wallet.lastCheckInDate, getLocalDateKey(now));
  assert.equal(claimDailyCheckIn(claimed.wallet, now).reward, 0);
});

test("seven-day rewards loop while the continuous streak keeps growing", () => {
  const now = new Date(2026, 7, 9, 9);
  const wallet = { ...createDefaultWallet(), streak: 7, lastCheckInDate: getLocalDateKey(new Date(2026, 7, 8, 9)) };
  const result = claimDailyCheckIn(wallet, now);
  assert.equal(result.wallet.streak, 8);
  assert.equal(result.reward, 1);
});

test("cooldown is displayed as mm:ss", () => {
  assert.equal(formatCooldown(582000), "09:42");
});

test("quick-exit cooldown starts on the fifth exit within one hour", () => {
  const originalWindow = globalThis.window;
  globalThis.window = { localStorage: memoryStorage() };
  try {
    const now = new Date(2026, 7, 15, 10, 0, 0, 0).getTime();
    for (let count = 1; count < QUICK_EXIT_LIMIT; count += 1) {
      const state = recordQuickExit(now + count);
      assert.equal(state.count, count);
      assert.equal(state.cooldownUntil, 0);
    }

    const fifthExitAt = now + QUICK_EXIT_LIMIT;
    const fifth = recordQuickExit(fifthExitAt);
    const endOfDay = new Date(fifthExitAt);
    endOfDay.setHours(23, 59, 59, 999);
    assert.equal(fifth.count, QUICK_EXIT_LIMIT);
    assert.equal(fifth.cooldownUntil, endOfDay.getTime());
    assert.equal(getActiveCooldown(fifthExitAt)?.count, QUICK_EXIT_LIMIT);
    assert.equal(getActiveCooldown(endOfDay.getTime()), null);

    const reset = recordQuickExit(now + 60 * 60 * 1000 + 10);
    assert.equal(reset.count, 1);
    assert.equal(reset.cooldownUntil, 0);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("pagehide marker captures the frozen deposit and departure-time quick-exit state", () => {
  const marker = createPendingRoomDeparture({
    roomDeposit: frozenDeposit,
    roomUrl: "https://example.test/mvp/rooms/ice--12345678/text?from=meet#chat",
    departedAt: 40_000,
  });
  assert.deepEqual(marker, {
    version: 1,
    roomId: "room-ice",
    depositTransactionId: "deposit-1",
    roomUrl: "/mvp/rooms/ice--12345678/text?from=meet#chat",
    departedAt: 40_000,
    quickExit: true,
  });
  assert.equal(createPendingRoomDeparture({
    roomDeposit: { ...frozenDeposit, frozen: false },
    roomUrl: "/mvp/rooms/ice--12345678/text",
  }), null);
});

test("a true reload of the exact room URL restores, while other departures forfeit", () => {
  const marker = createPendingRoomDeparture({
    roomDeposit: frozenDeposit,
    roomUrl: "/mvp/rooms/ice--12345678/text",
    departedAt: 5_000,
  });
  const base = { marker, roomDeposit: frozenDeposit, currentUrl: marker.roomUrl };
  assert.equal(classifyPendingRoomDeparture({ ...base, navigationType: "reload" }), "restore");
  assert.equal(classifyPendingRoomDeparture({ ...base, navigationType: "navigate" }), "forfeit");
  assert.equal(classifyPendingRoomDeparture({ ...base, navigationType: "back_forward" }), "forfeit");
  assert.equal(classifyPendingRoomDeparture({ ...base, navigationType: "reload", pageshowPersisted: true }), "forfeit");
  assert.equal(classifyPendingRoomDeparture({
    ...base,
    currentUrl: "/mvp/messages",
    navigationType: "navigate",
  }), "forfeit");
});

test("navigation type prefers modern timing entries and supports legacy reload/back", () => {
  assert.equal(getDocumentNavigationType({
    getEntriesByType: () => [{ type: "back_forward" }],
    navigation: { type: 1 },
  }), "back_forward");
  assert.equal(getDocumentNavigationType({ getEntriesByType: () => [], navigation: { type: 1 } }), "reload");
  assert.equal(getDocumentNavigationType({ getEntriesByType: () => [], navigation: { type: 2 } }), "back_forward");
  assert.equal(getDocumentNavigationType({ getEntriesByType: () => [] }), "navigate");
});

test("a stale marker never applies to a different or already released deposit", () => {
  const marker = createPendingRoomDeparture({
    roomDeposit: frozenDeposit,
    roomUrl: "/mvp/rooms/ice--12345678/text",
  });
  assert.equal(classifyPendingRoomDeparture({
    marker,
    roomDeposit: { ...frozenDeposit, roomId: "room-other" },
    currentUrl: marker.roomUrl,
    navigationType: "navigate",
  }), "discard");
  assert.equal(classifyPendingRoomDeparture({
    marker,
    roomDeposit: null,
    currentUrl: marker.roomUrl,
    navigationType: "navigate",
  }), "discard");
});

test("pending departure is consumed once, including a safe reload", () => {
  const storage = memoryStorage();
  const marker = savePendingRoomDeparture({
    roomDeposit: frozenDeposit,
    roomUrl: "/mvp/rooms/ice--12345678/text",
    departedAt: 5_000,
  }, storage);
  assert.ok(storage.getItem(PENDING_ROOM_DEPARTURE_STORAGE_KEY));
  assert.equal(consumePendingRoomDeparture({
    roomDeposit: frozenDeposit,
    currentUrl: marker.roomUrl,
    navigationType: "reload",
    storage,
  }).action, "restore");
  assert.equal(storage.getItem(PENDING_ROOM_DEPARTURE_STORAGE_KEY), null);
  assert.equal(consumePendingRoomDeparture({
    roomDeposit: frozenDeposit,
    currentUrl: marker.roomUrl,
    navigationType: "reload",
    storage,
  }).action, "none");
});

test("cancelling beforeunload cannot forfeit because no pagehide marker exists", () => {
  const storage = memoryStorage();
  const result = consumePendingRoomDeparture({
    roomDeposit: frozenDeposit,
    currentUrl: "/mvp/messages",
    navigationType: "navigate",
    storage,
  });
  assert.deepEqual(result, { action: "none", marker: null });
  assert.equal(storage.getItem(PENDING_ROOM_DEPARTURE_STORAGE_KEY), null);
});

test("forfeiting relabels the original frozen transaction without charging twice", () => {
  const wallet = {
    balance: 185,
    transactions: [
      { id: "deposit-1", label: "房间互动保证金冻结", amount: -1 },
      { id: "other", label: "每日签到", amount: 1 },
    ],
  };
  const settled = markDepositTransactionForfeited(wallet, "deposit-1");
  assert.equal(settled.balance, 185);
  assert.equal(settled.transactions[0].label, "互动保证金扣除（未完成互动）");
  assert.equal(settled.transactions[0].amount, -1);
  assert.strictEqual(markDepositTransactionForfeited(wallet, "missing"), wallet);
});
