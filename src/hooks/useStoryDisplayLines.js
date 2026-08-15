import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { measureStoryTextLines } from "../utils/interactiveStory.js";

function linesMatch(left, right) {
  return left.length === right.length && left.every((line, index) => (
    line.start === right[index]?.start
    && line.end === right[index]?.end
    && line.text === right[index]?.text
  ));
}

/**
 * Observe the real dialogue width and ask the browser where it wrapped a
 * matching hidden text node. The returned lines therefore follow font loading,
 * responsive layout and chat-panel width changes automatically.
 */
export default function useStoryDisplayLines(text) {
  const containerRef = useRef(null);
  const measurementRef = useRef(null);
  const [lines, setLines] = useState([]);
  const [ready, setReady] = useState(false);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const measurement = measurementRef.current;
    if (!text) {
      setLines([]);
      setReady(true);
      return;
    }
    if (!container || !measurement) return;

    const width = container.getBoundingClientRect().width;
    if (!Number.isFinite(width) || width <= 0) return;
    measurement.style.width = `${width}px`;

    const measured = measureStoryTextLines(measurement, text);
    if (!measured.length) return;
    setLines((current) => linesMatch(current, measured) ? current : measured);
    setReady(true);
  }, [text]);

  useLayoutEffect(() => {
    setReady(false);
    setLines([]);
    let frame = 0;
    let active = true;

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (active) measure();
      });
    };

    measure();
    const observer = typeof ResizeObserver === "function"
      ? new ResizeObserver(scheduleMeasure)
      : null;
    if (containerRef.current) observer?.observe(containerRef.current);
    window.addEventListener("resize", scheduleMeasure);

    const fontsReady = document.fonts?.ready;
    fontsReady?.then?.(() => {
      if (active) scheduleMeasure();
    });

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [measure]);

  return {
    containerRef,
    measurementRef,
    lines,
    ready,
  };
}
