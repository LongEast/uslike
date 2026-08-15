import assert from "node:assert/strict";
import test from "node:test";

import {
  clearMessageUi,
  getMessageUiStorageKey,
  loadMessageUi,
  saveMessageUi,
} from "./messageUi.js";

function memoryStorage() {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test("message UI state survives remounts and is namespaced by user", () => {
  const storage = memoryStorage();
  const state = {
    drafts: { "thread-1": "尚未发送" },
    scrollPositions: { "thread-1": 128 },
  };

  assert.equal(saveMessageUi(state, "user/1", storage), true);
  assert.deepEqual(loadMessageUi("user/1", storage), state);
  assert.deepEqual(loadMessageUi("user/2", storage), { drafts: {}, scrollPositions: {} });
  assert.equal(getMessageUiStorageKey("user/1"), "uslike:message-ui:v1:user%2F1");

  assert.equal(clearMessageUi("user/1", storage), true);
  assert.equal(storage.values.has(getMessageUiStorageKey("user/1")), false);
});

test("invalid message UI fields are discarded safely", () => {
  const storage = memoryStorage();
  storage.setItem(getMessageUiStorageKey("u1"), JSON.stringify({
    version: 1,
    drafts: { good: "ok", bad: 42 },
    scrollPositions: { good: 12, negative: -1, invalid: "12" },
  }));

  assert.deepEqual(loadMessageUi("u1", storage), {
    drafts: { good: "ok" },
    scrollPositions: { good: 12 },
  });
  storage.setItem(getMessageUiStorageKey("u1"), JSON.stringify({ version: 99 }));
  assert.deepEqual(loadMessageUi("u1", storage), { drafts: {}, scrollPositions: {} });
});
