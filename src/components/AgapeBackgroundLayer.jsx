import { useEffect, useRef } from "react";

export default function AgapeBackgroundLayer({ variant = "landing", progress = 0 }) {
  const layerRef = useRef(null);
  const safeProgress = Math.min(1, Math.max(0, Number(progress) || 0));

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => layer.classList.toggle("is-active", entry.isIntersecting),
      { rootMargin: "12% 0px" },
    );

    observer.observe(layer);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className={`agape-bg-layer agape-bg-layer--${variant} is-active`}
      style={{
        "--agape-progress": safeProgress,
        "--agape-progress-x": `${safeProgress * 80}px`,
        "--agape-progress-y": `${safeProgress * 120}px`,
        "--agape-progress-rotate": `${safeProgress * 10}deg`,
      }}
    >
      <div className="agape-bg-base" />
      <div className="agape-bg-side agape-bg-side-left">
        <span className="agape-bg-orbit agape-bg-orbit-one" />
        <span className="agape-bg-orbit agape-bg-orbit-two" />
        <span className="agape-bg-chat agape-bg-chat-one" />
        <span className="agape-bg-heart agape-bg-heart-one" />
      </div>
      <div className="agape-bg-side agape-bg-side-right">
        <span className="agape-bg-orbit agape-bg-orbit-three" />
        <span className="agape-bg-orbit agape-bg-orbit-four" />
        <span className="agape-bg-chat agape-bg-chat-two" />
        <span className="agape-bg-heart agape-bg-heart-two" />
      </div>
      <div className="agape-bg-wave agape-bg-wave-back" />
      <div className="agape-bg-wave agape-bg-wave-front" />
      <div className="agape-bg-particles" />
      <div className="agape-bg-vignette" />
    </div>
  );
}
