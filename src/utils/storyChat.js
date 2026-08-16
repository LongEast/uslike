export function getPartnerMessageIds(messages) {
  if (!Array.isArray(messages)) return [];

  const ids = [];
  const seenIds = new Set();
  messages.forEach((message) => {
    if (message?.sender !== "partner" || message.id == null) return;
    const id = String(message.id);
    if (!id || seenIds.has(id)) return;
    seenIds.add(id);
    ids.push(id);
  });
  return ids;
}

export function getUnreadPartnerMessageIds(messages, knownMessageIds) {
  const knownIds = new Set(
    Array.isArray(knownMessageIds) || knownMessageIds instanceof Set
      ? knownMessageIds
      : [],
  );
  return getPartnerMessageIds(messages).filter((id) => !knownIds.has(id));
}

export function formatStoryUnreadCount(count) {
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));
  if (!safeCount) return "";
  return safeCount > 99 ? "99+" : String(safeCount);
}
