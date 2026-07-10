import { X } from "lucide-react";

export default function Modal({ title, children, onClose, width = "max-w-lg" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#30261f]/32 px-4 backdrop-blur-sm">
      <div className={`animate-pop w-full ${width} rounded-[28px] border border-white bg-white p-5 shadow-[0_28px_90px_rgba(88,95,142,0.2)] sm:p-7`}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-stone-800">{title}</h2>
          {onClose ? (
            <button
              aria-label="关闭"
              onClick={onClose}
              className="rounded-full bg-stone-100 p-2 text-stone-500 transition hover:bg-stone-200 hover:text-stone-800"
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
