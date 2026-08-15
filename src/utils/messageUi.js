export const MESSAGE_UI_STORAGE_PREFIX = "uslike:message-ui:v1";
export const MESSAGE_UI_VERSION = 1;

export function createEmptyMessageUi() {
  return { drafts: {}, scrollPositions: {} };
}

export function getMessageUiStorageKey(userId = "guest") {
  return `${MESSAGE_UI_STORAGE_PREFIX}:${encodeURIComponent(String(userId || "guest"))}`;
}

function defaultStorage() {
  try {
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
}

export function normalizeMessageUi(value) {
  if (!value || value.version !== MESSAGE_UI_VERSION) return null;
  const drafts = Object.fromEntries(Object.entries(value.drafts || {}).flatMap(([threadId, draft]) => (
    typeof draft === "string" ? [[String(threadId), draft]] : []
  )));
  const scrollPositions = Object.fromEntries(
    Object.entries(value.scrollPositions || {}).flatMap(([threadId, scrollTop]) => (
      Number.isFinite(scrollTop) && scrollTop >= 0
        ? [[String(threadId), scrollTop]]
        : []
    )),
  );
  return { drafts, scrollPositions };
}

export function loadMessageUi(userId = "guest", storage = defaultStorage()) {
  if (!storage?.getItem) return createEmptyMessageUi();
  try {
    return normalizeMessageUi(JSON.parse(storage.getItem(getMessageUiStorageKey(userId))))
      || createEmptyMessageUi();
  } catch {
    return createEmptyMessageUi();
  }
}

export function saveMessageUi(messageUi, userId = "guest", storage = defaultStorage()) {
  if (!storage?.setItem) return false;
  const normalized = normalizeMessageUi({
    version: MESSAGE_UI_VERSION,
    drafts: messageUi?.drafts,
    scrollPositions: messageUi?.scrollPositions,
  });
  try {
    storage.setItem(getMessageUiStorageKey(userId), JSON.stringify({
      version: MESSAGE_UI_VERSION,
      ...normalized,
    }));
    return true;
  } catch {
    return false;
  }
}

export function clearMessageUi(userId = "guest", storage = defaultStorage()) {
  if (!storage?.removeItem) return false;
  try {
    storage.removeItem(getMessageUiStorageKey(userId));
    return true;
  } catch {
    return false;
  }
}
