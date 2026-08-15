import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { buildSpotlightPath, getSpotlightRect } from "../utils/spotlightGeometry.js";
import TutorialBubble from "./TutorialBubble.jsx";

const VIEWPORT_RECT = () => ({ width: window.innerWidth, height: window.innerHeight });

const resolveElement = (target) => {
  const candidate = target?.ref ?? target;
  return candidate?.current ?? candidate ?? null;
};

const resolveTargets = (targets) => targets
  .map((target) => ({ target, element: resolveElement(target) }))
  .filter(({ element }) => element?.isConnected && typeof element.getBoundingClientRect === "function");

const getTargetRect = ({ target, element }, viewport) => {
  const bounds = element.getBoundingClientRect();
  return getSpotlightRect(
    bounds,
    viewport,
    target?.padding ?? 8,
    target?.radius ?? 20,
  );
};

const isOutsideViewport = (element, viewport) => {
  const bounds = element.getBoundingClientRect();
  return bounds.top < 0
    || bounds.left < 0
    || bounds.bottom > viewport.height
    || bounds.right > viewport.width;
};

const stopTutorialClick = (event) => event.stopPropagation();

export default function SpotlightTutorial({
  step,
  total = 12,
  targets = [],
  children,
  onDismiss,
  showContinue = false,
  onContinue,
  actionLabel,
  onAction,
}) {
  const targetsRef = useRef(targets);
  targetsRef.current = targets;
  const scheduleMeasureRef = useRef(null);
  const [viewport, setViewport] = useState(VIEWPORT_RECT);
  const [holes, setHoles] = useState([]);

  useLayoutEffect(() => {
    let frame = 0;
    let shouldEnsureTargetIsVisible = true;
    let observedElements = new Set();
    const observer = new ResizeObserver(() => scheduleMeasure());

    const syncObservedElements = (resolvedTargets) => {
      const nextElements = new Set(resolvedTargets.map(({ element }) => element));
      let changed = nextElements.size !== observedElements.size;

      observedElements.forEach((element) => {
        if (nextElements.has(element)) return;
        observer.unobserve(element);
        changed = true;
      });
      nextElements.forEach((element) => {
        if (observedElements.has(element)) return;
        observer.observe(element);
        changed = true;
      });
      observedElements = nextElements;
      return changed;
    };

    const measure = () => {
      const nextViewport = VIEWPORT_RECT();
      const resolvedTargets = resolveTargets(targetsRef.current);
      const targetsChanged = syncObservedElements(resolvedTargets);

      if (shouldEnsureTargetIsVisible || targetsChanged) {
        shouldEnsureTargetIsVisible = false;
        const outsideTarget = resolvedTargets
          .map(({ element }) => element)
          .find((element) => isOutsideViewport(element, nextViewport));
        if (outsideTarget) {
          outsideTarget.scrollIntoView({ block: "center", inline: "nearest" });
          scheduleMeasure();
          return;
        }
      }

      setViewport(nextViewport);
      setHoles(resolvedTargets
        .map((resolvedTarget) => getTargetRect(resolvedTarget, nextViewport))
        .filter((rect) => rect.width && rect.height));
    };

    function scheduleMeasure({ ensureTargetIsVisible = false } = {}) {
      shouldEnsureTargetIsVisible ||= ensureTargetIsVisible;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    }

    const mutationObserver = new MutationObserver((mutations) => {
      const hasRelevantMutation = mutations.some((mutation) => {
        const mutationElement = mutation.target instanceof Element
          ? mutation.target
          : mutation.target.parentElement;
        return !mutationElement?.closest?.("[data-tutorial-ui]");
      });
      if (hasRelevantMutation) scheduleMeasure();
    });
    mutationObserver.observe(document.body, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });

    scheduleMeasureRef.current = scheduleMeasure;
    scheduleMeasure({ ensureTargetIsVisible: true });
    const handleResize = () => scheduleMeasure({ ensureTargetIsVisible: true });
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", scheduleMeasure, true);

    const containEvent = (event) => {
      if (event.key === "Tab") {
        event.preventDefault();
        return;
      }
      if (!["Enter", " "].includes(event.key)) return;
      const activeElement = document.activeElement;
      const isAllowedTarget = targetsRef.current
        .map(resolveElement)
        .filter(Boolean)
        .some((element) => element.contains(activeElement));
      if (!isAllowedTarget && !activeElement?.closest?.("[data-tutorial-ui]")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("keydown", containEvent, true);

    return () => {
      scheduleMeasureRef.current = null;
      window.cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", scheduleMeasure, true);
      document.removeEventListener("keydown", containEvent, true);
    };
  }, [step]);

  useLayoutEffect(() => {
    scheduleMeasureRef.current?.();
  }, [targets]);

  const primaryHole = holes[0];
  const targetIsLow = primaryHole && primaryHole.y + primaryHole.height / 2 > viewport.height / 2;
  const targetIsRight = primaryHole && primaryHole.x + primaryHole.width / 2 > viewport.width / 2;
  const bubblePosition = [
    "pointer-events-auto fixed left-1/2 -translate-x-1/2 sm:translate-x-0",
    targetIsLow ? "top-5 sm:top-6" : "bottom-5 sm:bottom-6",
    targetIsRight
      ? "sm:left-6 sm:right-auto"
      : "sm:left-auto sm:right-6",
  ].join(" ");

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[100]"
      data-tutorial-step={step}
      data-tutorial-ui
      onClick={stopTutorialClick}
    >
      <svg
        className="pointer-events-none fixed inset-0 h-full w-full"
        width={viewport.width}
        height={viewport.height}
        aria-hidden="true"
      >
        <path
          d={buildSpotlightPath(viewport.width, viewport.height, holes)}
          fill="rgba(10, 12, 24, 0.72)"
          fillRule="evenodd"
          className="pointer-events-auto"
        />
      </svg>

      {holes.map((hole, index) => (
        <span
          key={`${step}-${index}`}
          data-tutorial-ui
          className={`tutorial-spotlight fixed ${showContinue ? "pointer-events-auto cursor-pointer" : "pointer-events-none"}`}
          onClick={showContinue ? (event) => {
            event.stopPropagation();
            onContinue?.();
          } : undefined}
          style={{
            left: hole.x,
            top: hole.y,
            width: hole.width,
            height: hole.height,
            borderRadius: hole.radius,
          }}
        />
      ))}

      <TutorialBubble
        step={step}
        total={total}
        onDismiss={onDismiss}
        onContinue={showContinue ? onContinue : undefined}
        continueLabel="下一步"
        actionLabel={actionLabel}
        onAction={onAction}
        className={bubblePosition}
      >
        {children}
      </TutorialBubble>
    </div>,
    document.body,
  );
}
