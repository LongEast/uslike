import test from "node:test";
import assert from "node:assert/strict";
import {
  CHECK_IN_REWARDS,
  claimDailyCheckIn,
  createDefaultWallet,
  formatCooldown,
  getCheckInState,
  getLocalDateKey,
} from "./coinWallet.js";

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
