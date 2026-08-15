export const STORY_SESSION_VERSION = 1;
export const STORY_SESSION_STORAGE_PREFIX = "uslike:story-session:v1";
export const DEFAULT_STORY_ORIGIN = "/mvp/messages";

export const STORY_STAGES = Object.freeze({
  STYLE: "style",
  ROLE: "role",
  PLAY: "play",
});

const VALID_STAGES = new Set(Object.values(STORY_STAGES));
const VALID_MESSAGE_SENDERS = new Set(["user", "partner"]);

function cleanString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getDefaultStorage() {
  try {
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
}

export function normalizeStoryOrigin(origin, fallback = DEFAULT_STORY_ORIGIN) {
  let value = origin;

  if (origin && typeof origin === "object") {
    value = `${origin.pathname || ""}${origin.search || ""}${origin.hash || ""}`;
  }

  if (typeof value !== "string") return fallback;
  const normalized = value.trim();

  // Origins are app-local route targets, never external redirects.
  if (!normalized.startsWith("/") || normalized.startsWith("//")) return fallback;
  return normalized;
}

export function normalizeStoryPartner(partner) {
  const source = partner && typeof partner === "object" ? partner : {};
  const id = cleanString(source.id, "meet-assistant");
  const isAssistant = source.isAssistant === true || id === "meet-assistant";

  return {
    id,
    name: cleanString(source.name, isAssistant ? "相遇小助手" : "故事搭档"),
    avatarUrl: cleanString(source.avatarUrl || source.avatar, "") || null,
    isAssistant,
  };
}

export function getStorySessionStorageKey(sessionId, userId = "guest") {
  const safeSessionId = encodeURIComponent(cleanString(sessionId, "ice-civilization"));
  const safeUserId = encodeURIComponent(cleanString(String(userId ?? "guest"), "guest"));
  return `${STORY_SESSION_STORAGE_PREFIX}:${safeUserId}:${safeSessionId}`;
}

export function createStorySession({
  sessionId = "ice-civilization",
  storyData,
  origin = DEFAULT_STORY_ORIGIN,
  partner,
} = {}) {
  const rootId = storyData?.rootId == null ? "" : String(storyData.rootId);

  return {
    version: STORY_SESSION_VERSION,
    sessionId: cleanString(sessionId, "ice-civilization"),
    stage: STORY_STAGES.STYLE,
    styleId: null,
    playerCharacterId: null,
    partnerCharacterId: null,
    currentNodeId: rootId,
    history: [],
    messages: [],
    seenPartnerEvents: [],
    origin: normalizeStoryOrigin(origin),
    partner: normalizeStoryPartner(partner),
  };
}

export function normalizeStorySession(value, {
  sessionId,
  storyData,
  origin,
  partner,
} = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.version !== STORY_SESSION_VERSION) return null;

  const expectedSessionId = sessionId == null ? "" : cleanString(sessionId);
  const storedSessionId = cleanString(value.sessionId);
  if (!storedSessionId || (expectedSessionId && storedSessionId !== expectedSessionId)) return null;
  if (!VALID_STAGES.has(value.stage)) return null;

  const nodes = storyData?.nodes && typeof storyData.nodes === "object"
    ? storyData.nodes
    : null;
  const fallbackRootId = storyData?.rootId == null ? "" : String(storyData.rootId);
  const requestedNodeId = value.currentNodeId == null ? "" : String(value.currentNodeId);
  if (value.stage === STORY_STAGES.PLAY && nodes && !nodes[requestedNodeId]) return null;
  const currentNodeId = nodes?.[requestedNodeId]
    ? requestedNodeId
    : (nodes?.[fallbackRootId] ? fallbackRootId : requestedNodeId || fallbackRootId);

  if (value.stage === STORY_STAGES.PLAY && (!currentNodeId || (nodes && !nodes[currentNodeId]))) {
    return null;
  }

  const history = Array.isArray(value.history)
    ? value.history
      .map(String)
      .filter((nodeId) => nodeId && (!nodes || Boolean(nodes[nodeId])))
    : [];
  const messages = Array.isArray(value.messages)
    ? value.messages.flatMap((message, index) => {
      if (!message || typeof message !== "object") return [];
      const sender = message.sender === "assistant" ? "partner" : message.sender;
      const text = cleanString(message.text);
      if (!VALID_MESSAGE_SENDERS.has(sender) || !text) return [];
      return [{
        id: cleanString(message.id, `${sender}-${index}`),
        sender,
        text,
        ...(cleanString(message.eventId) ? { eventId: cleanString(message.eventId) } : {}),
      }];
    })
    : [];
  const seenPartnerEvents = Array.isArray(value.seenPartnerEvents)
    ? [...new Set(value.seenPartnerEvents.map(String).filter(Boolean))]
    : [];

  return {
    version: STORY_SESSION_VERSION,
    sessionId: storedSessionId,
    stage: value.stage,
    styleId: cleanString(value.styleId) || null,
    playerCharacterId: cleanString(value.playerCharacterId) || null,
    partnerCharacterId: cleanString(value.partnerCharacterId) || null,
    currentNodeId,
    history,
    messages,
    seenPartnerEvents,
    origin: normalizeStoryOrigin(value.origin, normalizeStoryOrigin(origin)),
    partner: normalizeStoryPartner(value.partner || partner),
  };
}

export function loadStorySession({
  sessionId = "ice-civilization",
  userId = "guest",
  storyData,
  storage = getDefaultStorage(),
} = {}) {
  if (!storage?.getItem) return null;

  try {
    const serialized = storage.getItem(getStorySessionStorageKey(sessionId, userId));
    if (!serialized) return null;
    return normalizeStorySession(JSON.parse(serialized), { sessionId, storyData });
  } catch {
    return null;
  }
}

export function saveStorySession(session, {
  userId = "guest",
  storyData,
  storage = getDefaultStorage(),
} = {}) {
  if (!storage?.setItem) return false;
  const normalized = normalizeStorySession(session, {
    sessionId: session?.sessionId,
    storyData,
  });
  if (!normalized) return false;

  try {
    storage.setItem(
      getStorySessionStorageKey(normalized.sessionId, userId),
      JSON.stringify(normalized),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearStorySession({
  sessionId = "ice-civilization",
  userId = "guest",
  storage = getDefaultStorage(),
} = {}) {
  if (!storage?.removeItem) return false;

  try {
    storage.removeItem(getStorySessionStorageKey(sessionId, userId));
    return true;
  } catch {
    return false;
  }
}
