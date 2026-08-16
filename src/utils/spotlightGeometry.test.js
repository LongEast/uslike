import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSpotlightPath,
  clampTutorialBubblePosition,
  getSpotlightRect,
} from "./spotlightGeometry.js";

test("spotlight rect adds padding and clips to the viewport", () => {
  assert.deepEqual(
    getSpotlightRect(
      { left: 4, top: 10, right: 100, bottom: 80 },
      { width: 90, height: 70 },
      8,
      24,
    ),
    { x: 0, y: 2, width: 90, height: 68, radius: 24 },
  );
});

test("spotlight path keeps multiple independent target holes", () => {
  const path = buildSpotlightPath(1200, 800, [
    { x: 10, y: 20, width: 100, height: 40 },
    { x: 140, y: 20, width: 100, height: 40 },
  ]);

  assert.match(path, /^M0 0H1200V800H0Z/);
  assert.match(path, /M10 20H110V60H10Z/);
  assert.match(path, /M140 20H240V60H140Z/);
});

test("tutorial bubble drag position stays inside the viewport", () => {
  const bubbleSize = { width: 340, height: 180 };
  const viewport = { width: 800, height: 600 };

  assert.deepEqual(
    clampTutorialBubblePosition({ left: -80, top: -40 }, bubbleSize, viewport),
    { left: 16, top: 16 },
  );
  assert.deepEqual(
    clampTutorialBubblePosition({ left: 720, top: 560 }, bubbleSize, viewport),
    { left: 444, top: 404 },
  );
  assert.deepEqual(
    clampTutorialBubblePosition({ left: 120, top: 160 }, bubbleSize, viewport),
    { left: 120, top: 160 },
  );
  assert.deepEqual(
    clampTutorialBubblePosition(
      { left: 0, top: 0 },
      bubbleSize,
      { left: 12, top: 48, width: 800, height: 600 },
    ),
    { left: 28, top: 64 },
  );
});
