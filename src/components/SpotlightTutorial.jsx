import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { buildSpotlightPath, getSpotlightRect } from "../utils/spotlightGeometry.js";
import TutorialBubble from "./TutorialBubble.jsx";

const VIEWPORT_RECT = () => ({ width: window.innerWidth, height: window.innerHeight });

const resolveElement = (target) => {
  const candidate = target?.ref ?? target;
  return candidate?.current ?? candidate ?? null;
};

const getTargetRect = (target) => {
  const element = resolveElement(target);
  if (!element) return null;
  const bounds = element.getBoundingClientRect();
  return getSpotlightRect(
    bounds,
    VIEWPORT_RECT(),
    target?.padding ?? 8,
    target?.radius ?? 20,
  );
};

export default function SpotlightTutorial({
  step,
  total = 12,
  targets = [],
  children,
  onDismiss,
  allowBackdropContinue = false,
  continueOnTargetClick = allowBackdropContinue,
  onContinue,
  actionLabel,
  onAction,
}) {
  const targetsRef = useRef(targets);
  targetsRef.current = targets;
  const [viewport, setViewport] = useState(VIEWPORT_RECT);
  const [holes, setHoles] = useState([]);

  useLayoutEffect(() => {
    let frame = 0;
    let observer;

    const measure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setViewport(VIEWPORT_RECT());
        setHoles(targetsRef.current.map(getTargetRect).filter((rect) => rect?.width && rect?.height));
      });
    };

    const firstTarget = targetsRef.current.map(resolveElement).find(Boolean);
    const firstBounds = firstTarget?.getBoundingClientRect();
    if (firstBounds && (firstBounds.top < 0 || firstBounds.bottom > window.innerHeight)) {
      firstTarget.scrollIntoView({ block: "center", inline: "nearest" });
    }
    measure();
    observer = new ResizeObserver(measure);
    targetsRef.current.map(resolveElement).filter(Boolean).forEach((element) => observer.observe(element));
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

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
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      document.removeEventListener("keydown", containEvent, true);
    };
  }, [step]);

  const continueFromBackdrop = () => {
    if (allowBackdropContinue) onContinue?.();
  };

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
    <div className="pointer-events-none fixed inset-0 z-[100]" data-tutorial-step={step} data-tutorial-ui>
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
          onClick={continueFromBackdrop}
        />
      </svg>

      {holes.map((hole, index) => (
        <span
          key={`${step}-${index}`}
          className={`tutorial-spotlight fixed ${continueOnTargetClick ? "pointer-events-auto cursor-pointer" : "pointer-events-none"}`}
          onClick={continueOnTargetClick ? onContinue : undefined}
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
        onContinue={allowBackdropContinue ? onContinue : undefined}
        continueLabel={allowBackdropContinue ? "点击任意区域继续" : undefined}
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
