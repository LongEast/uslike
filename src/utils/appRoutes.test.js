import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTIVE_ROOM_STORAGE_KEY,
  ACTIVE_ROOM_SESSION_VERSION,
  buildReadableKeyMap,
  clearActiveRoomSession,
  getReadableKey,
  loadActiveRoomSession,
  normalizeMvpOrigin,
  resolveReadableKey,
  saveActiveRoomSession,
} from "./appRoutes.js";

test("readable keys keep a stable id suffix when the display name changes", () => {
  const people = [{ id: "user-youbo", name: "柚白" }];
  const key = getReadableKey(people[0], people);
  assert.match(key, /^柚白--[a-f0-9]{8}$/);
  assert.equal(resolveReadableKey(key.replace("柚白", "旧昵称"), people), people[0]);
});

test("colliding short tokens automatically extend until they are unique", () => {
  const people = [{ id: "one", name: "一" }, { id: "two", name: "二" }];
  const tokens = { one: "12345678aaaaaaa1", two: "12345678baaaaaa2" };
  const keys = buildReadableKeyMap(people, { tokenForId: (id) => tokens[id] });
  assert.equal(keys.get("one"), "一--12345678a");
  assert.equal(keys.get("two"), "二--12345678b");
});

test("invalid story origins fall back to messages", () => {
  assert.equal(normalizeMvpOrigin("https://example.com"), "/mvp/messages");
  assert.equal(normalizeMvpOrigin("/mvp/story/another"), "/mvp/messages");
  assert.equal(normalizeMvpOrigin("/mvp/messages/old--12345678?tab=chat"), "/mvp/messages/old--12345678?tab=chat");
  assert.equal(normalizeMvpOrigin("/mvp/settings/account"), "/mvp/settings/account");
  assert.equal(normalizeMvpOrigin("/account"), "/account");
});

test("active room session only restores versioned valid records", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  saveActiveRoomSession({ id: "room-1", name: "测试房" }, "text", {
    storage,
    userId: "user-1",
    savedAt: 1_000,
  });
  assert.deepEqual(loadActiveRoomSession({ storage, userId: "user-1", now: 2_000 }), {
    version: ACTIVE_ROOM_SESSION_VERSION,
    userId: "user-1",
    savedAt: 1_000,
    room: { id: "room-1", name: "测试房" },
    mode: "text",
  });
  assert.equal(loadActiveRoomSession({ storage, userId: "another-user", now: 2_000 }), null);
  assert.equal(loadActiveRoomSession({ storage, userId: "user-1", now: 50_000, maxAge: 1_000 }), null);
  clearActiveRoomSession(storage);
  assert.equal(values.has(ACTIVE_ROOM_STORAGE_KEY), false);
  values.set(ACTIVE_ROOM_STORAGE_KEY, JSON.stringify({ version: 2, room: { id: "room-1" }, mode: "text" }));
  assert.equal(loadActiveRoomSession({ storage, userId: "user-1", now: 2_000 }), null);
});
