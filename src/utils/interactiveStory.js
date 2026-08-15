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
