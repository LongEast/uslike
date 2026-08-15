import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getStorySceneState,
  isContinueSequence,
  normalizeChoices,
  tokenizeText,
} from "./interactiveStory.js";

const storyData = JSON.parse(
  readFileSync(new URL("../data/story_safe.json", import.meta.url), "utf8"),
);

test("tokenizeText falls back to Unicode characters and preserves newlines", () => {
  assert.deepEqual(tokenizeText("你好\n冰人", null), [
    { text: "你", newline: false },
    { text: "好", newline: false },
    { text: "\n", newline: true },
    { text: "冰", newline: false },
    { text: "人", newline: false },
  ]);
  assert.deepEqual(tokenizeText(""), []);
});

test("tokenizeText falls back when Intl.Segmenter cannot be initialized", () => {
  class BrokenSegmenter {
    constructor() {
      throw new Error("Segmenter unavailable");
    }
  }

  assert.deepEqual(tokenizeText("中文", BrokenSegmenter), [
    { text: "中", newline: false },
    { text: "文", newline: false },
  ]);
});

test("normalizeChoices removes hidden choices and letter prefixes", () => {
  const choices = normalizeChoices([
    { id: "visible", text: "A 陪着阿美一起跑", to: "next", isHidden: false },
    { id: "hidden", text: "B 隐藏路线", to: "secret", isHidden: true },
  ]);

  assert.equal(choices.length, 1);
  assert.equal(choices[0].id, "visible");
  assert.equal(choices[0].displayText, "陪着阿美一起跑");
  assert.deepEqual(choices[0].targets, ["next"]);
});

test("normalizeChoices merges matching labels and retains every target", () => {
  const choices = normalizeChoices([
    { id: "accept", text: "A 答应", to: "accept-node" },
    { id: "refuse-b", text: "B 拒绝", to: "refuse-b-node" },
    { id: "refuse-c", text: "C 拒绝", to: "refuse-c-node" },
  ]);

  assert.deepEqual(
    choices.map(({ id, displayText, targets }) => ({ id, displayText, targets })),
    [
      { id: "accept", displayText: "答应", targets: ["accept-node"] },
      {
        id: "refuse-b",
        displayText: "拒绝",
        targets: ["refuse-b-node", "refuse-c-node"],
      },
    ],
  );
});

test("only explicit visual endings may render without story copy", () => {
  const visualEnding = {
    presentation: "visual-ending",
    image: { src: "/api/uploads/story/endings/example.webp" },
  };

  assert.equal(getStorySceneState(visualEnding, { text: "" }), "visual-ending");
  assert.equal(getStorySceneState(visualEnding, { text: "" }, true), "missing-ending-image");
  assert.equal(getStorySceneState({ image: visualEnding.image }, { text: "" }), "missing-text");
  assert.equal(getStorySceneState(null, null), "missing-node");
  assert.equal(getStorySceneState({}, { text: "有正文" }), "text");
});

test("continue sequences are explicit and never inferred from ordinary single choices", () => {
  assert.equal(isContinueSequence([{ kind: "continue", to: "next" }]), true);
  assert.equal(isContinueSequence([{ text: "继续", to: "next" }]), false);
  assert.equal(isContinueSequence([]), false);
});

test("bundled story starts from CID 388167597 and contains valid node references", () => {
  assert.equal(storyData.rootId, "1");
  assert.equal(storyData.nodes[storyData.rootId].cid, 388167597);
  assert.equal(storyData.nodes[storyData.rootId].mediaRef, "388167597");

  for (const [nodeId, node] of Object.entries(storyData.nodes)) {
    assert.ok(
      storyData.media[String(node.mediaRef)],
      `node ${nodeId} references missing media ${node.mediaRef}`,
    );

    for (const choice of node.choices || []) {
      assert.ok(
        storyData.nodes[String(choice.to)],
        `choice ${choice.id} references missing node ${choice.to}`,
      );
    }
  }
});

test("empty story copy is restricted to declared image endings", () => {
  const emptySceneIds = Object.entries(storyData.nodes)
    .filter(([, node]) => !String(storyData.media[String(node.mediaRef)]?.text || "").trim())
    .map(([nodeId]) => nodeId)
    .sort();

  assert.deepEqual(emptySceneIds, ["19716719", "true-end-finale"]);
  for (const nodeId of emptySceneIds) {
    const node = storyData.nodes[nodeId];
    assert.equal(node.presentation, "visual-ending");
    assert.equal(node.isEnding, true);
    assert.ok(node.image?.src);
  }
});

test("resistance reaches the explosion visual ending instead of a missing-copy error", () => {
  for (const sourceId of ["19716704", "19716706"]) {
    const resistance = storyData.nodes[sourceId].choices.find((choice) => choice.text.includes("反抗"));
    assert.equal(resistance?.to, "19716719");
  }

  const ending = storyData.nodes["19716719"];
  assert.equal(ending.presentation, "visual-ending");
  assert.equal(
    ending.image.src,
    storyData.nodes["19716705"].image.src,
    "19716719 should reuse the confirmed explosion artwork",
  );
  assert.equal(
    getStorySceneState(ending, storyData.media[String(ending.mediaRef)]),
    "visual-ending",
  );
});

test("ending artwork uses twelve local uploads with the confirmed shared mappings", () => {
  const groups = [
    ["19716713"],
    ["19716718"],
    ["19716705", "19716707", "19716719"],
    ["19716701", "19716715", "19716694", "19716695", "19716727", "19716728"],
    ["19716691", "19716702"],
    ["19716708", "19716709"],
    ["true-end-01"],
    ["true-end-02"],
    ["true-end-03"],
    ["true-end-04"],
    ["true-end-05"],
    ["true-end-finale"],
  ];
  const groupSources = groups.map((nodeIds) => {
    const sources = new Set(nodeIds.map((nodeId) => storyData.nodes[nodeId].image.src));
    assert.equal(sources.size, 1, `${nodeIds.join(", ")} should share one ending image`);
    const [source] = sources;
    assert.match(source, /^\/api\/uploads\/story\/endings\/[0-9a-f-]+\.png$/);
    return source;
  });

  assert.equal(new Set(groupSources).size, 12);
});

test("both true-end preludes converge on five continue scenes and a visual finale", () => {
  for (const preludeId of ["19716708", "19716709"]) {
    const prelude = storyData.nodes[preludeId];
    assert.equal(prelude.isEnding, false);
    assert.equal(prelude.choices.length, 1);
    assert.equal(prelude.choices[0].kind, "continue");
    assert.equal(prelude.choices[0].to, "true-end-01");
    assert.equal(
      storyData.media[String(prelude.mediaRef)].text.endsWith("你走进这栋奇怪房子"),
      true,
    );
  }

  const expectedSlides = [
    ["true-end-01", "true-end-02", "姐姐：“那是冰人的胚胎状态\n它们大概率在考虑后事了吧”"],
    ["true-end-02", "true-end-03", "首领：“还记得挑战的内容吗？”\n你回答：“沿着这个星球的海岸线跑上一圈。”"],
    ["true-end-03", "true-end-04", "弟弟：“他们想逃走吗？”\n姐姐：“不会的。一旦他们有任何一个个体尝试逃出他们的星系，就会被直接击毙，他们这样无异于葬送了整个星球。”\n"],
    ["true-end-04", "true-end-05", "弟弟：“不，他们成功了。”"],
    ["true-end-05", "true-end-finale", "总统也说出了同样的话：\n他们成功了。"],
  ];

  for (const [nodeId, targetId, expectedText] of expectedSlides) {
    const node = storyData.nodes[nodeId];
    assert.equal(node.choices.length, 1);
    assert.equal(node.choices[0].kind, "continue");
    assert.equal(node.choices[0].text, "点击继续");
    assert.equal(node.choices[0].to, targetId);
    assert.equal(storyData.media[String(node.mediaRef)].text, expectedText);
  }

  const finale = storyData.nodes["true-end-finale"];
  assert.equal(finale.presentation, "visual-ending");
  assert.equal(finale.isEnding, true);
  assert.deepEqual(finale.choices, []);
  assert.equal(storyData.media[String(finale.mediaRef)].text, "");
});

test("bundled story statistics match the expanded true-end graph", () => {
  const nodes = Object.values(storyData.nodes);
  assert.equal(storyData.stats.nodeCount, nodes.length);
  assert.equal(
    storyData.stats.edgeCount,
    nodes.reduce((total, node) => total + (node.choices?.length || 0), 0),
  );
  assert.equal(storyData.stats.endingCount, nodes.filter((node) => node.isEnding).length);
  assert.deepEqual(
    [...storyData.endingIds].sort(),
    nodes.filter((node) => node.isEnding).map((node) => node.id).sort(),
  );
});

test("bundled story exposes demo styles and eight described characters", () => {
  assert.equal(storyData.story.id, "ice-civilization");
  assert.equal(storyData.styles.filter((style) => style.available).length, 1);
  assert.equal(storyData.styles.find((style) => style.available).id, "science-fiction-fable");
  assert.equal(storyData.characters.length, 8);
  assert.ok(storyData.characters.every((character) => character.name && character.description));
  assert.deepEqual(storyData.demo.visibleCharacterIds, ["anan", "amei"]);
  assert.equal(storyData.demo.playerCharacterId, "anan");
  assert.equal(storyData.demo.partnerCharacterId, "amei");
});

test("partner events reference valid scenes and never contain branch targets", () => {
  const events = storyData.demo.partnerEvents;
  assert.deepEqual(events.map((event) => event.id), [
    "role-select-amei",
    "uncle-wang-hint",
    "earth-guard-resistance",
  ]);

  for (const event of events) {
    assert.ok(event.message, `${event.id} needs a message`);
    assert.equal("to" in event, false, `${event.id} must not select a target`);
    assert.equal("target" in event, false, `${event.id} must not select a target`);
    assert.equal("choiceId" in event, false, `${event.id} must not select a choice`);

    for (const nodeId of event.nodeIds || []) {
      assert.ok(storyData.nodes[nodeId], `${event.id} references missing node ${nodeId}`);
    }
  }
});
