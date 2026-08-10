import test from "node:test";
import assert from "node:assert/strict";
import { getFriendInitial, groupFriendsByInitial } from "./friendIndex.js";

test("derives alphabet index labels from Latin and Chinese names", () => {
  assert.equal(getFriendInitial("Nana"), "N");
  assert.equal(getFriendInitial("阿澈"), "A");
  assert.equal(getFriendInitial("青禾"), "Q");
  assert.equal(getFriendInitial("枝枝"), "Z");
});

test("sorts friends into pinyin initial groups", () => {
  const groups = groupFriendsByInitial([
    { id: "zhi", name: "枝枝" },
    { id: "nana", name: "Nana" },
    { id: "acheng", name: "阿澈" },
    { id: "chuan", name: "川川" },
  ]);

  assert.deepEqual(groups.map(([initial]) => initial), ["A", "C", "N", "Z"]);
});
