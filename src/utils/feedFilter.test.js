import assert from "node:assert/strict";
import test from "node:test";

import { filterFeedByChannel, filterInteractionsByFriendship } from "./feedFilter.js";

const feed = [
  { id: "friend-post", channel: "friends" },
  { id: "discover-post", channel: "discover" },
  { id: "legacy-post" },
];

test("filters the feed to friend posts", () => {
  assert.deepEqual(filterFeedByChannel(feed, "friends"), [feed[0]]);
});

test("filters the feed to discovery posts", () => {
  assert.deepEqual(filterFeedByChannel(feed, "discover"), [feed[1]]);
});

test("returns an empty feed for unsupported channels", () => {
  assert.deepEqual(filterFeedByChannel(feed, "unknown"), []);
});

test("hides non-friend interactions by default", () => {
  const interactions = [
    { id: "friend-like", isFriend: true },
    { id: "non-friend-like", isFriend: false },
  ];

  assert.deepEqual(filterInteractionsByFriendship(interactions), [interactions[0]]);
});

test("shows non-friend interactions after opting in", () => {
  const interactions = [
    { id: "friend-comment", isFriend: true },
    { id: "non-friend-comment", isFriend: false },
  ];

  assert.deepEqual(filterInteractionsByFriendship(interactions, true), interactions);
});
