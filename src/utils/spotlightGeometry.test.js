import assert from "node:assert/strict";
import test from "node:test";
import { buildSpotlightPath, getSpotlightRect } from "./spotlightGeometry.js";

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
