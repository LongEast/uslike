const ROUTE_TOKEN_LENGTH = 16;

export const DEFAULT_MVP_PATH = "/mvp/messages";
export const ACTIVE_ROOM_STORAGE_KEY = "uslike:active-room:v1";
export const ACTIVE_ROOM_SESSION_VERSION = 2;
export const ACTIVE_ROOM_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function hash32(value, seed) {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
    hash ^= hash >>> 13;
  }
  return hash >>> 0;
}

export function stableRouteToken(id) {
  const value = String(id ?? "");
  return `${hash32(value, 0x811c9dc5).toString(16).padStart(8, "0")}${hash32(value, 0x9e3779b9).toString(16).padStart(8, "0")}`
    .slice(0, ROUTE_TOKEN_LENGTH);
}

export function readableSlug(label) {
  const slug = String(label ?? "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("zh-CN")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "item";
}

export function buildReadableKeyMap(
  entities,
  {
    getId = (entity) => entity.id,
    getLabel = (entity) => entity.name || entity.nickname || entity.id,
    tokenForId = stableRouteToken,
  } = {},
) {
  const records = entities.map((entity) => ({
    entity,
    id: String(getId(entity)),
    token: String(tokenForId(String(getId(entity)))).toLocaleLowerCase("en-US"),
  }));
  const lengths = new Map(records.map(({ id }) => [id, 8]));

  for (let length = 8; length <= ROUTE_TOKEN_LENGTH; length += 1) {
    const groups = new Map();
    records.forEach((record) => {
      const currentLength = lengths.get(record.id);
      const prefix = record.token.slice(0, currentLength);
      const group = groups.get(prefix) || [];
      group.push(record);
      groups.set(prefix, group);
    });
    let changed = false;
    groups.forEach((group) => {
      if (group.length < 2) return;
      group.forEach(({ id }) => {
        const current = lengths.get(id);
        if (current < ROUTE_TOKEN_LENGTH) {
          lengths.set(id, current + 1);
          changed = true;
        }
      });
    });
    if (!changed) break;
  }

  return new Map(records.map(({ entity, id, token }) => {
    const suffix = token.slice(0, lengths.get(id));
    return [id, `${readableSlug(getLabel(entity))}--${suffix}`];
  }));
}

export function getReadableKey(entity, peers = [entity], options = {}) {
  const getId = options.getId || ((item) => item.id);
  return buildReadableKeyMap(peers, options).get(String(getId(entity)));
}

export function resolveReadableKey(key, entities, options = {}) {
  const suffix = String(key ?? "").split("--").at(-1)?.toLocaleLowerCase("en-US");
  if (!suffix || !/^[a-f0-9]{8,16}$/.test(suffix)) return null;
  const getId = options.getId || ((entity) => entity.id);
  const matches = entities.filter((entity) => stableRouteToken(String(getId(entity))).startsWith(suffix));
  return matches.length === 1 ? matches[0] : null;
}

export function normalizeStoreSection(section) {
  return ["recharge", "decorations", "owned"].includes(section) ? section : "recharge";
}

export function normalizeMvpOrigin(origin) {
  if (typeof origin !== "string" || !origin.startsWith("/") || origin.startsWith("//")) {
    return DEFAULT_MVP_PATH;
  }
  const pathname = origin.split(/[?#]/, 1)[0];
  if (["/account", "/status"].includes(pathname)) return origin;
  if (/^\/mvp\/(feed(?:\/users\/[^/]+)?|messages(?:\/[^/]+)?|friends(?:\/requests)?|settings(?:\/(?:account|status))?|store|meet|rooms\/[^/]+\/(?:text|voice))$/.test(pathname)) {
    return origin;
  }
  return DEFAULT_MVP_PATH;
}

export function saveActiveRoomSession(room, mode, {
  storage = globalThis.sessionStorage,
  userId = "guest",
  savedAt = Date.now(),
} = {}) {
  if (!storage || !room?.id || !["text", "voice"].includes(mode)) return;
  storage.setItem(ACTIVE_ROOM_STORAGE_KEY, JSON.stringify({
    version: ACTIVE_ROOM_SESSION_VERSION,
    userId: String(userId || "guest"),
    savedAt,
    room,
    mode,
  }));
}

export function loadActiveRoomSession({
  storage = globalThis.sessionStorage,
  userId = "guest",
  now = Date.now(),
  maxAge = ACTIVE_ROOM_MAX_AGE_MS,
} = {}) {
  if (!storage) return null;
  try {
    const value = JSON.parse(storage.getItem(ACTIVE_ROOM_STORAGE_KEY));
    const savedAt = Number(value?.savedAt);
    if (
      value?.version !== ACTIVE_ROOM_SESSION_VERSION
      || value.userId !== String(userId || "guest")
      || !Number.isFinite(savedAt)
      || savedAt > now + 60 * 1000
      || now - savedAt > maxAge
      || !value.room?.id
      || !["text", "voice"].includes(value.mode)
    ) return null;
    return value;
  } catch {
    return null;
  }
}

export function clearActiveRoomSession(storage = globalThis.sessionStorage) {
  storage?.removeItem(ACTIVE_ROOM_STORAGE_KEY);
}
