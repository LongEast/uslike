export const FEED_CHANNELS = new Set(["friends", "discover"]);

export function filterFeedByChannel(feed = [], channel = "friends") {
  if (!FEED_CHANNELS.has(channel)) return [];
  return feed.filter((item) => item.channel === channel);
}

export function filterInteractionsByFriendship(interactions = [], includeNonFriends = false) {
  if (includeNonFriends) return interactions;
  return interactions.filter((interaction) => interaction.isFriend !== false);
}
