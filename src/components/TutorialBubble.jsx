import { useLayoutEffect, useRef, useState } from "react";
import { ChevronRight, GripHorizontal, X } from "lucide-react";
import { clampTutorialBubblePosition } from "../utils/spotlightGeometry.js";
import { useTutorialPositionRef } from "./TutorialPositionContext.jsx";

const DRAG_MARGIN = 16;

const getViewport = () => {
  const visualViewport = window.visualViewport;
  return visualViewport ? {
    left: visualViewport.offsetLeft,
    top: visualViewport.offsetTop,
    width: visualViewport.width,
    height: visualViewport.height,
  } : {
    left: 0,
    top: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

export default function TutorialBubble({
  step,
  total = 12,
  children,
  onDismiss,
  onContinue,
  continueLabel,
  actionLabel,
  onAction,
  className = "",
}) {
  const sharedPositionRef = useTutorialPositionRef();
  const bubbleRef = useRef(null);
  const dragRef = useRef(null);
  const positionRef = useRef(sharedPositionRef.current);
  const [position, setPosition] = useState(sharedPositionRef.current);
  const [maxHeight, setMaxHeight] = useState(() => (
    Math.max(0, getViewport().height - (DRAG_MARGIN * 2))
  ));

  const moveBubble = (nextPosition, bubbleSize) => {
    const next = clampTutorialBubblePosition(
      nextPosition,
      bubbleSize,
      getViewport(),
      DRAG_MARGIN,
    );
    positionRef.current = next;
    sharedPositionRef.current = next;
    setPosition(next);
  };

  const startDragging = (event) => {
    if (event.isPrimary === false) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const bounds = bubbleRef.current?.getBoundingClientRect();
    if (!bounds) return;

    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
      width: bounds.width,
      height: bounds.height,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    moveBubble(
      { left: bounds.left, top: bounds.top },
      { width: bounds.width, height: bounds.height },
    );
    event.preventDefault();
    event.stopPropagation();
  };

  const continueDragging = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    moveBubble(
      {
        left: event.clientX - drag.offsetX,
        top: event.clientY - drag.offsetY,
      },
      { width: drag.width, height: drag.height },
    );
    event.preventDefault();
    event.stopPropagation();
  };

  const stopDragging = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
    event.preventDefault();
    event.stopPropagation();
  };

  useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    if (!bubble) return undefined;

    const keepBubbleInViewport = () => {
      const viewport = getViewport();
      setMaxHeight(Math.max(0, viewport.height - (DRAG_MARGIN * 2)));
      if (!positionRef.current) return;
      const bounds = bubble.getBoundingClientRect();
      moveBubble(positionRef.current, { width: bounds.width, height: bounds.height });
    };
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(keepBubbleInViewport);
    resizeObserver?.observe(bubble);
    keepBubbleInViewport();
    window.addEventListener("resize", keepBubbleInViewport);
    window.visualViewport?.addEventListener("resize", keepBubbleInViewport);
    window.visualViewport?.addEventListener("scroll", keepBubbleInViewport);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", keepBubbleInViewport);
      window.visualViewport?.removeEventListener("resize", keepBubbleInViewport);
      window.visualViewport?.removeEventListener("scroll", keepBubbleInViewport);
    };
  }, []);

  return (
    <div
      ref={bubbleRef}
      data-tutorial-ui
      className={`z-[90] w-[min(340px,calc(100vw-32px))] overflow-y-auto rounded-[24px] border border-[#bdb8ff]/70 bg-white/[0.96] p-4 text-left shadow-[0_22px_70px_rgba(88,95,142,0.28)] backdrop-blur-xl ${className}`}
      role="dialog"
      aria-label={`新手引导，第 ${step} 步，共 ${total} 步`}
      onClick={(event) => event.stopPropagation()}
      style={position ? {
        bottom: "auto",
        left: position.left,
        maxHeight,
        right: "auto",
        top: position.top,
      } : { maxHeight }}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="rounded-full bg-[#eeeaff] px-3 py-1 text-xs font-bold text-[#6b5ee7]">
          {step}/{total} 步
        </span>
        <div
          data-tutorial-ui
          data-tutorial-drag-handle
          className="flex h-7 min-w-0 flex-1 touch-none cursor-grab select-none items-center justify-center gap-1 rounded-full px-2 text-xs font-semibold text-stone-400 transition hover:bg-stone-50 hover:text-stone-600 active:cursor-grabbing"
          onPointerDown={startDragging}
          onPointerMove={continueDragging}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
          onLostPointerCapture={stopDragging}
          title="拖动对话框"
        >
          <GripHorizontal size={15} aria-hidden="true" />
          <span>拖动</span>
        </div>
        <button
          type="button"
          data-tutorial-ui
          onClick={(event) => {
            event.stopPropagation();
            onDismiss?.();
          }}
          className="grid h-7 w-7 place-items-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
          aria-label="关闭新手引导"
        >
          <X size={16} />
        </button>
      </div>
      <div className="rounded-2xl border border-white bg-white/90 px-4 py-3 text-sm font-semibold leading-6 text-stone-700 shadow-sm">
        {children}
      </div>
      {onContinue ? (
        <button
          type="button"
          data-tutorial-ui
          onClick={(event) => {
            event.stopPropagation();
            onContinue?.();
          }}
          className="mt-3 ml-auto flex items-center gap-1 rounded-full bg-[#eeeaff] px-4 py-2 text-sm font-semibold text-[#6b5ee7] shadow-sm transition hover:bg-[#e4dfff] hover:text-[#594bd6]"
        >
          {continueLabel || "下一步"}
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      ) : null}
      {actionLabel ? (
        <button
          type="button"
          data-tutorial-ui
          onClick={(event) => {
            event.stopPropagation();
            onAction?.();
          }}
          className="aurora-dark mt-3 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:brightness-110"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
