function tokenizeByCharacter(text) {
  return Array.from(text, (character) => ({
    text: character,
    newline: character === "\n",
  }));
}

/**
 * Split story copy into renderable tokens while preserving explicit line breaks.
 * The optional constructor makes the browser fallback deterministic to test.
 */
export function tokenizeText(
  text,
  Segmenter = globalThis.Intl?.Segmenter,
) {
  if (!text) return [];

  const value = String(text);

  if (typeof Segmenter !== "function") {
    return tokenizeByCharacter(value);
  }

  try {
    const segmenter = new Segmenter("zh-CN", { granularity: "word" });

    return value.split(/(\n)/).flatMap((part) => {
      if (part === "\n") {
        return [{ text: "\n", newline: true }];
      }

      return Array.from(segmenter.segment(part), ({ segment }) => ({
        text: segment,
        newline: false,
      }));
    });
  } catch {
    return tokenizeByCharacter(value);
  }
}

/**
 * Story source files use line breaks as authoring separators. Playback treats
 * them like ordinary whitespace so the browser can use the complete available
 * width instead of exposing a collection of artificially short source lines.
 */
export function normalizeStoryText(text) {
  return text == null ? "" : String(text).trim().replace(/\s+/gu, " ");
}

export function segmentStoryGraphemes(
  text,
  Segmenter = globalThis.Intl?.Segmenter,
) {
  const value = text == null ? "" : String(text);
  if (!value) return [];

  if (typeof Segmenter === "function") {
    try {
      const segmenter = new Segmenter("zh-CN", { granularity: "grapheme" });
      return Array.from(segmenter.segment(value), ({ segment, index }) => ({
        text: segment,
        start: index,
        end: index + segment.length,
      }));
    } catch {
      // Fall through to the Unicode-code-point implementation below.
    }
  }

  let offset = 0;
  return Array.from(value, (character) => {
    const start = offset;
    offset += character.length;
    return { text: character, start, end: offset };
  });
}

/**
 * Convert per-grapheme browser measurements into source-offset based visual
 * lines. Keeping UTF-16 offsets lets playback survive responsive reflow without
 * relying on a line number that may no longer exist after resize.
 */
export function groupStoryLineMeasurements(text, measurements = []) {
  const value = text == null ? "" : String(text);
  if (!value || !measurements.length) return [];

  const lines = [];
  let current = null;

  const commit = () => {
    if (!current) return;
    const lineText = value.slice(current.start, current.end).trim();
    if (lineText) lines.push({
      start: current.start,
      end: current.end,
      text: lineText,
    });
    current = null;
  };

  for (const measurement of measurements) {
    if (!measurement) continue;
    const top = Number.isFinite(measurement.top) ? measurement.top : null;
    if (
      current
      && top != null
      && current.top != null
      && Math.abs(top - current.top) > 1
    ) {
      commit();
    }

    if (!current) {
      current = {
        start: Math.max(0, Number(measurement.start) || 0),
        end: Math.max(0, Number(measurement.end) || 0),
        top,
      };
    } else {
      current.end = Math.max(current.end, Number(measurement.end) || current.end);
      if (current.top == null && top != null) current.top = top;
    }
  }

  commit();
  return lines;
}

/**
 * Measure browser-created wraps from a single text node. Range respects the
 * actual font, letter spacing and available DOM width, unlike character-count
 * pagination or sentence splitting.
 */
export function measureStoryTextLines(element, text) {
  const value = text == null ? "" : String(text);
  const textNode = element?.firstChild;
  const documentRef = element?.ownerDocument;
  if (!value || !textNode || textNode.nodeType !== 3 || !documentRef?.createRange) return [];

  const range = documentRef.createRange();
  const measurements = segmentStoryGraphemes(value).map((segment) => {
    try {
      range.setStart(textNode, segment.start);
      range.setEnd(textNode, segment.end);
      const rects = range.getClientRects();
      const rect = rects[0] || range.getBoundingClientRect();
      return {
        ...segment,
        top: Number.isFinite(rect?.top) ? rect.top : null,
      };
    } catch {
      return { ...segment, top: null };
    }
  });
  range.detach?.();

  return groupStoryLineMeasurements(value, measurements);
}

export function findStoryLineIndex(lines = [], sourceOffset = 0) {
  if (!lines.length) return 0;
  const offset = Math.max(0, Number(sourceOffset) || 0);
  const exactStart = lines.findIndex((line) => line.start === offset);
  if (exactStart >= 0) return exactStart;
  const containing = lines.findIndex((line) => offset >= line.start && offset < line.end);
  if (containing >= 0) return containing;
  if (offset >= lines[lines.length - 1].end) return lines.length - 1;
  return 0;
}

/**
 * Resolve the line that playback may render after browser reflow. A completed
 * line is anchored to the last character the player has actually seen and is
 * clipped at that frontier, so widening the dialogue cannot reveal new copy.
 * An unfinished line is clipped at its playback cursor, avoiding a replay of
 * content that moved onto the same visual line after resize.
 */
export function resolveStoryPlaybackLine(
  lines = [],
  text = "",
  {
    cursor = 0,
    displayedEnd = 0,
    visibleEnd = displayedEnd,
    lineFinished = false,
  } = {},
) {
  const value = text == null ? "" : String(text);
  if (!value || !lines.length) return null;

  const safeCursor = Math.min(value.length - 1, Math.max(0, Number(cursor) || 0));
  const safeDisplayedEnd = Math.min(
    value.length,
    Math.max(0, Number(displayedEnd) || 0),
  );
  const safeVisibleEnd = Math.min(
    value.length,
    Math.max(safeDisplayedEnd, Number(visibleEnd) || 0),
  );
  let anchor = safeCursor;

  if (lineFinished && safeDisplayedEnd > 0) {
    anchor = safeDisplayedEnd - 1;
    while (anchor > 0 && /\s/u.test(value[anchor])) anchor -= 1;
  }

  let layoutLine = lines[findStoryLineIndex(lines, anchor)] || null;
  if (
    !lineFinished
    && layoutLine
    && safeVisibleEnd > Math.max(0, Number(layoutLine.end) || 0)
  ) {
    anchor = Math.max(0, safeVisibleEnd - 1);
    while (anchor > 0 && /\s/u.test(value[anchor])) anchor -= 1;
    layoutLine = lines[findStoryLineIndex(lines, anchor)] || layoutLine;
  }
  if (!layoutLine) return null;

  const layoutStart = Math.max(0, Number(layoutLine.start) || 0);
  const layoutEnd = Math.min(
    value.length,
    Math.max(layoutStart, Number(layoutLine.end) || 0),
  );
  const start = lineFinished
    ? layoutStart
    : Math.min(layoutEnd, Math.max(layoutStart, safeCursor));
  const end = lineFinished && safeDisplayedEnd > 0
    ? Math.min(layoutEnd, Math.max(start, safeDisplayedEnd))
    : layoutEnd;

  return {
    start,
    end,
    text: value.slice(start, end).trim(),
  };
}

export function getStoryAdvanceAction({
  blocked = false,
  lineFinished = false,
  displayedEnd = 0,
  textLength = 0,
} = {}) {
  const safeTextLength = Math.max(0, Number(textLength) || 0);
  if (blocked || safeTextLength <= 0) return "none";
  if (!lineFinished) return "finish-line";
  return Math.max(0, Number(displayedEnd) || 0) < safeTextLength
    ? "next-line"
    : "none";
}

export function getStorySceneKey(node, nodeId) {
  const mediaRef = node?.mediaRef == null ? "" : String(node.mediaRef);
  return mediaRef ? `media:${mediaRef}` : `node:${String(nodeId ?? "")}`;
}

/**
 * Monotonically record how much of a scene has actually been displayed. A
 * scene key is updated in place so revisiting a branch never duplicates the
 * exact same history entry or moves it out of its original chronology.
 */
export function recordNarrativeProgress(history, entry) {
  const source = Array.isArray(history) ? history : [];
  const sceneKey = String(entry?.sceneKey || "").trim();
  const nodeId = String(entry?.nodeId || "").trim();
  const displayedEnd = Math.max(0, Math.trunc(Number(entry?.displayedEnd) || 0));
  if (!sceneKey || !nodeId || displayedEnd <= 0) return source;

  const index = source.findIndex((item) => item?.sceneKey === sceneKey);
  if (index < 0) return [...source, { sceneKey, nodeId, displayedEnd }];

  const current = source[index];
  const nextEnd = Math.max(Math.max(0, Number(current.displayedEnd) || 0), displayedEnd);
  if (nextEnd === current.displayedEnd && current.nodeId === nodeId) return source;

  return source.map((item, itemIndex) => itemIndex === index
    ? { ...item, nodeId, displayedEnd: nextEnd }
    : item);
}

/**
 * Hide unavailable choices, remove their letter marker, and combine choices that
 * render with the same label. A combined choice keeps every possible target so
 * the UI can select one when it is activated.
 */
export function normalizeChoices(choices = []) {
  if (!Array.isArray(choices)) return [];

  const groups = new Map();

  for (const choice of choices) {
    if (!choice || choice.isHidden) continue;

    const displayText = String(choice.text ?? "")
      .replace(/^[A-Z]\s+/i, "")
      .trim();

    const existingChoice = groups.get(displayText);

    if (existingChoice) {
      existingChoice.targets.push(choice.to);
      continue;
    }

    groups.set(displayText, {
      ...choice,
      displayText,
      targets: [choice.to],
    });
  }

  return Array.from(groups.values());
}

/**
 * Classify a story node without weakening validation for ordinary scenes.
 * Only explicitly declared visual endings may omit narrative copy.
 */
export function getStorySceneState(node, media, imageFailed = false) {
  if (!node) return "missing-node";

  const hasText = typeof media?.text === "string" && Boolean(media.text.trim());
  if (hasText) return "text";

  if (node.presentation === "visual-ending") {
    return node.image?.src && !imageFailed
      ? "visual-ending"
      : "missing-ending-image";
  }

  return "missing-text";
}

export function isContinueSequence(choices = []) {
  return choices.length === 1 && choices[0]?.kind === "continue";
}
