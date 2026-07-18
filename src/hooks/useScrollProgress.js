import { useEffect, useState } from "react";

export default function useScrollProgress(ref) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const updateProgress = () => {
      frame = 0;
      const element = ref.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const scrollableDistance = Math.max(rect.height - viewportHeight, 1);
      const rawProgress = Math.min(1, Math.max(0, -rect.top / scrollableDistance));

      setProgress((current) => (Math.abs(current - rawProgress) > 0.002 ? rawProgress : current));
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateProgress);
    };

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [ref]);

  return progress;
}
