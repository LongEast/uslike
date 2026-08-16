import BrandMark from "./BrandMark.jsx";

export default function MvpSplash({ onStart }) {
  return (
    <main className="main-wash relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="absolute inset-0">
        <div className="absolute left-[9%] top-[14%] h-40 w-40 animate-floaty rounded-full bg-[#d7e3ff]/52 blur-2xl" />
        <div className="absolute right-[12%] top-[20%] h-48 w-48 animate-floaty rounded-full bg-[#e6d8ff]/48 blur-2xl [animation-delay:1.2s]" />
        <div className="absolute bottom-[14%] left-[24%] h-44 w-44 animate-floaty rounded-full bg-[#eadcff]/52 blur-2xl [animation-delay:2s]" />
        <div className="absolute bottom-[9%] right-[16%] h-28 w-28 rotate-12 rounded-[24px] bg-white/36 blur-sm" />
      </div>

      <section className="relative z-10 flex w-full max-w-4xl flex-col items-center text-center">
        <BrandMark size="lg" className="mb-3 animate-bob" />
        <p className="mb-4 text-xs font-medium text-[#5d6387]">
          Uslike
        </p>
        <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-stone-800 sm:text-7xl">
          同频相遇 · 互像欢喜
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
          same vibe, same like
        </p>
        <button
          onClick={onStart}
          className="aurora-dark mt-10 rounded-full px-9 py-4 text-lg font-semibold text-white shadow-glow transition hover:-translate-y-1 hover:brightness-110"
        >
          开始相遇
        </button>
      </section>
    </main>
  );
}
