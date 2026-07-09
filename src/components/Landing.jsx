import { Sparkles } from "lucide-react";

export default function Landing({ onStart }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fff8ee] px-6">
      <div className="absolute inset-0">
        <div className="absolute left-[9%] top-[14%] h-32 w-32 animate-floaty rounded-full bg-[#ffb7a4]/45 blur-2xl" />
        <div className="absolute right-[12%] top-[20%] h-40 w-40 animate-floaty rounded-full bg-[#8dd8c8]/38 blur-2xl [animation-delay:1.2s]" />
        <div className="absolute bottom-[16%] left-[24%] h-36 w-36 animate-floaty rounded-full bg-[#ffd37d]/42 blur-2xl [animation-delay:2s]" />
      </div>

      <section className="relative z-10 flex w-full max-w-4xl flex-col items-center text-center">
        <div className="mb-8 flex h-20 w-20 animate-bob items-center justify-center rounded-[30px] bg-white/78 shadow-soft">
          <Sparkles className="text-[#ec7656]" size={34} />
        </div>
        <p className="mb-4 rounded-full bg-white/70 px-5 py-2 text-sm font-medium text-[#9b6549] shadow-sm">
          Uslike
        </p>
        <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-stone-800 sm:text-7xl">
          同频相遇 · 互像欢喜
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
          same vibe，same like
        </p>
        <button
          onClick={onStart}
          className="mt-10 rounded-full bg-[#f06f52] px-9 py-4 text-lg font-semibold text-white shadow-glow transition hover:-translate-y-1 hover:bg-[#e45f47]"
        >
          开始相遇
        </button>
      </section>
    </main>
  );
}
