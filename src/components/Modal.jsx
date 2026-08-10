import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({ title, headerAction, children, onClose, width = "max-w-lg", variant = "default" }) {
  const isGlass = variant === "glass";
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableSelector = [
      "button:not([disabled])",
      "a[href]",
      "input:not([disabled])",
      "textarea:not([disabled])",
      "select:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");
    const focusFrame = window.requestAnimationFrame(() => {
      const focusable = dialog.querySelector(focusableSelector);
      (focusable || dialog).focus({ preventScroll: true });
    });

    const trapFocus = (event) => {
      if (event.key !== "Tab" || event.defaultPrevented) return;
      const dialogs = document.querySelectorAll("[data-modal-dialog]");
      if (dialogs.item(dialogs.length - 1) !== dialog) return;
      const focusable = [...dialog.querySelectorAll(focusableSelector)]
        .filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", trapFocus);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", trapFocus);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, []);

  useEffect(() => {
    if (!onClose) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing || event.repeat) return;
      const dialogs = document.querySelectorAll("[data-modal-dialog]");
      if (dialogs.item(dialogs.length - 1) !== dialogRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 overflow-x-hidden overflow-y-auto ${
        isGlass ? "bg-[#e5e9ff]/[0.48] backdrop-blur-md" : "bg-[#30261f]/32 backdrop-blur-sm"
      }`}
    >
      <div className="flex min-h-full items-center justify-center px-4 py-8 sm:py-12">
        <div className={`relative w-full ${width}`}>
          <div
            ref={dialogRef}
            data-modal-dialog
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className={`motion-safe:animate-pop relative z-10 w-full rounded-[28px] border p-5 sm:p-7 ${
              isGlass
                ? "border-white/[0.85] bg-white/[0.68] shadow-[0_32px_100px_rgba(77,70,154,0.22)] backdrop-blur-2xl"
                : "border-white bg-white shadow-[0_28px_90px_rgba(88,95,142,0.2)]"
            }`}
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-stone-800">{title}</h2>
              <div className="flex items-center gap-3">
                {headerAction}
                {onClose ? (
                  <button
                    aria-label="关闭"
                    onClick={onClose}
                    className={`rounded-full p-2 transition ${
                      isGlass
                        ? "border border-white/80 bg-white/[0.58] text-[#7774a8] shadow-sm backdrop-blur-xl hover:bg-white/90 hover:text-stone-800"
                        : "bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-800"
                    }`}
                  >
                    <X size={18} />
                  </button>
                ) : null}
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
