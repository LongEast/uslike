export default function NotificationToast({ message, placement = "top" }) {
  if (!message) return null;

  const position = placement === "bottom"
    ? "bottom-[max(1.5rem,env(safe-area-inset-bottom))]"
    : "top-[max(1.25rem,env(safe-area-inset-top))]";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed left-1/2 z-[45] w-[min(92vw,520px)] -translate-x-1/2 ${position}`}
    >
      <div
        data-story-interactive
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        className="pointer-events-auto mx-auto w-fit max-w-full animate-pop whitespace-pre-line rounded-2xl border border-[#d8bff1]/70 bg-[linear-gradient(135deg,rgba(255,245,252,.94),rgba(239,232,255,.94))] px-5 py-3 text-center text-sm font-semibold leading-5 text-[#624d76] shadow-[0_18px_48px_rgba(117,76,154,0.2)] backdrop-blur-xl"
      >
        {message}
      </div>
    </div>
  );
}
