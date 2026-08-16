import assert from "node:assert/strict";
import test from "node:test";
import {
  formatStoryUnreadCount,
  getPartnerMessageIds,
  getUnreadPartnerMessageIds,
} from "./storyChat.js";

test("story chat only tracks unique partner messages", () => {
  const messages = [
    { id: "player-1", sender: "user", text: "你好" },
    { id: "partner-1", sender: "partner", text: "一起走吧" },
    { id: "partner-1", sender: "partner", text: "重复消息" },
    { id: "legacy", sender: "assistant", text: "旧格式" },
    { sender: "partner", text: "没有 id" },
    { id: "partner-2", sender: "partner", text: "我有个想法" },
  ];

  assert.deepEqual(getPartnerMessageIds(messages), ["partner-1", "partner-2"]);
});

test("story chat reports every newly arrived partner message", () => {
  const messages = [
    { id: "partner-1", sender: "partner", text: "第一条" },
    { id: "player-1", sender: "user", text: "回复" },
    { id: "partner-2", sender: "partner", text: "第二条" },
    { id: "partner-3", sender: "partner", text: "第三条" },
  ];

  assert.deepEqual(
    getUnreadPartnerMessageIds(messages, new Set(["partner-1"])),
    ["partner-2", "partner-3"],
  );
  assert.deepEqual(getUnreadPartnerMessageIds(messages, ["partner-1", "partner-2", "partner-3"]), []);
  assert.deepEqual(getUnreadPartnerMessageIds(null, []), []);
});

test("story chat caps the visible unread badge", () => {
  assert.equal(formatStoryUnreadCount(0), "");
  assert.equal(formatStoryUnreadCount(1), "1");
  assert.equal(formatStoryUnreadCount(99), "99");
  assert.equal(formatStoryUnreadCount(100), "99+");
  assert.equal(formatStoryUnreadCount("invalid"), "");
});
