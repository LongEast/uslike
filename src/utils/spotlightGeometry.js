export function getSpotlightRect(bounds, viewport, padding = 8, radius = 20) {
  const left = Math.max(0, bounds.left - padding);
  const top = Math.max(0, bounds.top - padding);
  const right = Math.min(viewport.width, bounds.right + padding);
  const bottom = Math.min(viewport.height, bounds.bottom + padding);
  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
    radius,
  };
}

export function buildSpotlightPath(width, height, holes) {
  const outer = `M0 0H${width}V${height}H0Z`;
  const cutouts = holes
    .map(({ x, y, width: holeWidth, height: holeHeight }) =>
      `M${x} ${y}H${x + holeWidth}V${y + holeHeight}H${x}Z`,
    )
    .join(" ");
  return `${outer} ${cutouts}`;
}

export function clampTutorialBubblePosition(
  position,
  bubbleSize,
  viewport,
  margin = 16,
) {
  const viewportLeft = viewport.left ?? 0;
  const viewportTop = viewport.top ?? 0;
  const minLeft = viewportLeft + margin;
  const minTop = viewportTop + margin;
  const maxLeft = Math.max(minLeft, viewportLeft + viewport.width - bubbleSize.width - margin);
  const maxTop = Math.max(minTop, viewportTop + viewport.height - bubbleSize.height - margin);
  return {
    left: Math.min(Math.max(position.left, minLeft), maxLeft),
    top: Math.min(Math.max(position.top, minTop), maxTop),
  };
}
