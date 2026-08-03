import assert from "node:assert/strict";
import test from "node:test";
import { getMeetTutorialQuestions, getMeetTutorialRoom } from "./mockData.js";

test("meet tutorial uses the dedicated assistant room and queue question", () => {
  const room = getMeetTutorialRoom();
  const questions = getMeetTutorialQuestions();
  const question = questions[0];

  assert.equal(room.hostName, "相遇小助手");
  assert.equal(room.type, "打字房");
  assert.equal(room.isTutorial, true);
  assert.equal(question.id, "values-queue-friend");
  assert.equal(question.a, "让 TA 进来，偶尔帮助具体的人并不过分");
  assert.equal(question.b, "拒绝，因为这会让后面所有人承担代价");
  assert.equal(questions.length, 2);
  assert.equal(questions[1].id, "values-animal-language");
  assert.match(questions[1].text, /所有动物对话/);
});
