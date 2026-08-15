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
  assert.deepEqual(session.narrativeHistory, []);
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
    narrativeHistory: [{ sceneKey: "node:1", nodeId: "1", displayedEnd: 12 }],
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

test("legacy story sessions normalize missing narrative history to an empty list", () => {
  const legacySession = createStorySession({ sessionId: "ice-civilization", storyData });
  delete legacySession.narrativeHistory;

  assert.deepEqual(
    normalizeStorySession(legacySession, { storyData })?.narrativeHistory,
    [],
  );
});

test("narrative history deduplicates scene keys with stable order and maximum progress", () => {
  const session = {
    ...createStorySession({ sessionId: "ice-civilization", storyData }),
    narrativeHistory: [
      { sceneKey: " node:1 ", nodeId: "1", displayedEnd: 4 },
      { sceneKey: "node:19716712", nodeId: "19716712", displayedEnd: 3 },
      { sceneKey: "node:1", nodeId: "1", displayedEnd: 9 },
      { sceneKey: "node:1", nodeId: "missing", displayedEnd: 100 },
      { sceneKey: "", nodeId: "1", displayedEnd: 2 },
      { sceneKey: "invalid-progress", nodeId: "1", displayedEnd: -1 },
      null,
    ],
  };

  assert.deepEqual(normalizeStorySession(session, { storyData })?.narrativeHistory, [
    { sceneKey: "node:1", nodeId: "1", displayedEnd: 9 },
    { sceneKey: "node:19716712", nodeId: "19716712", displayedEnd: 3 },
  ]);
});

test("narrative history clamps progress to normalized media display text", () => {
  const compactStoryData = {
    rootId: "scene-a",
    nodes: {
      "scene-a": { id: "scene-a", mediaRef: "media-a" },
    },
    media: {
      "media-a": { text: "  alpha \n beta   gamma  " },
    },
  };
  const session = {
    ...createStorySession({ sessionId: "compact", storyData: compactStoryData }),
    narrativeHistory: [
      { sceneKey: "scene-a", nodeId: "scene-a", displayedEnd: 999 },
      { sceneKey: "fractional", nodeId: "scene-a", displayedEnd: 1.5 },
    ],
  };

  assert.deepEqual(
    normalizeStorySession(session, { storyData: compactStoryData })?.narrativeHistory,
    [{ sceneKey: "scene-a", nodeId: "scene-a", displayedEnd: "alpha beta gamma".length }],
  );
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
