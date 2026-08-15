import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  STORY_SESSION_VERSION,
  STORY_STAGES,
  clearStorySession,
  createStorySession,
  getStorySessionStorageKey,
  loadStorySession,
  normalizeStoryOrigin,
  normalizeStorySession,
  saveStorySession,
} from "./storySession.js";

const storyData = JSON.parse(
  readFileSync(new URL("../data/story_safe.json", import.meta.url), "utf8"),
);

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test("story session is namespaced by user and story", () => {
  assert.equal(
    getStorySessionStorageKey("ice civilization", "user/1"),
    "uslike:story-session:v1:user%2F1:ice%20civilization",
  );
});

test("new story sessions start at style selection and the story root", () => {
  const session = createStorySession({
    sessionId: "ice-civilization",
    storyData,
    origin: "/mvp/messages/friend--123?from=story",
    partner: { id: "friend-1", name: "柚白", avatar: "/avatar.png" },
  });

  assert.equal(session.version, STORY_SESSION_VERSION);
  assert.equal(session.stage, STORY_STAGES.STYLE);
  assert.equal(session.currentNodeId, "1");
  assert.equal(session.origin, "/mvp/messages/friend--123?from=story");
  assert.deepEqual(session.partner, {
    id: "friend-1",
    name: "柚白",
    avatarUrl: "/avatar.png",
    isAssistant: false,
  });
});

test("session storage restores progress and clear removes it", () => {
  const storage = createMemoryStorage();
  const session = {
    ...createStorySession({ sessionId: "ice-civilization", storyData }),
    stage: STORY_STAGES.PLAY,
    styleId: "science-fiction-fable",
    playerCharacterId: "anan",
    partnerCharacterId: "amei",
    currentNodeId: "19716712",
    history: ["1"],
    messages: [{ id: "partner-1", sender: "partner", text: "一起走吧" }],
    seenPartnerEvents: ["role-select-amei"],
  };

  assert.equal(saveStorySession(session, { userId: "u1", storyData, storage }), true);
  assert.deepEqual(
    loadStorySession({ sessionId: "ice-civilization", userId: "u1", storyData, storage }),
    session,
  );
  assert.equal(clearStorySession({ sessionId: "ice-civilization", userId: "u1", storage }), true);
  assert.equal(loadStorySession({ sessionId: "ice-civilization", userId: "u1", storyData, storage }), null);
});

test("invalid versions and invalid play nodes do not restore", () => {
  const base = createStorySession({ sessionId: "ice-civilization", storyData });

  assert.equal(normalizeStorySession({ ...base, version: 999 }, { storyData }), null);
  assert.equal(normalizeStorySession({
    ...base,
    stage: STORY_STAGES.PLAY,
    currentNodeId: "missing",
  }, { storyData }), null);
});

test("story origins only accept local app paths", () => {
  assert.equal(normalizeStoryOrigin("https://example.com"), "/mvp/messages");
  assert.equal(normalizeStoryOrigin("//example.com"), "/mvp/messages");
  assert.equal(
    normalizeStoryOrigin({ pathname: "/mvp/feed", search: "?tab=all", hash: "#new" }),
    "/mvp/feed?tab=all#new",
  );
});
