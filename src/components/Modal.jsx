import { X } from "lucide-react";

export default function Modal({ title, children, onClose, width = "max-w-lg" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#30261f]/32 px-4 backdrop-blur-sm">
      <div className={`glass-panel animate-pop w-full ${width} rounded-[28px] p-5 sm:p-7`}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-stone-800">{title}</h2>
          {onClose ? (
            <button
              aria-label="关闭"
              onClick={onClose}
              className="rounded-full bg-white/80 p-2 text-stone-500 transition hover:bg-white hover:text-stone-800"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
