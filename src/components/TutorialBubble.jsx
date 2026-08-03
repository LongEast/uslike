import { ChevronRight, X } from "lucide-react";

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
  return (
    <div
      className={`z-[90] w-[min(340px,calc(100vw-32px))] rounded-[24px] border border-[#bdb8ff]/70 bg-white/[0.96] p-4 text-left shadow-[0_22px_70px_rgba(88,95,142,0.28)] backdrop-blur-xl ${className}`}
      role="status"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="rounded-full bg-[#eeeaff] px-3 py-1 text-xs font-bold text-[#6b5ee7]">
          {step}/{total} 步
        </span>
        <button
          type="button"
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
          onClick={onContinue}
          className="mt-3 ml-auto flex items-center gap-1 rounded-full bg-[#eeeaff] px-4 py-2 text-sm font-semibold text-[#6b5ee7] shadow-sm transition hover:bg-[#e4dfff] hover:text-[#594bd6]"
        >
          {continueLabel || "下一步"}
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      ) : null}
      {actionLabel ? (
        <button
          type="button"
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
