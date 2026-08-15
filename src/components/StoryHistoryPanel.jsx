import { ChevronDown, History, X } from "lucide-react";
import { useEffect, useState } from "react";

function SceneCopy({ scene, emptyText }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <strong className="truncate text-xs font-semibold text-[#d8ceff]">
          {scene?.title || "未命名场景"}
        </strong>
        {scene?.complete ? (
          <span className="shrink-0 text-[9px] tracking-[0.12em] text-white/35">已读完</span>
        ) : null}
      </div>
      {scene?.text ? (
        <p className="whitespace-pre-wrap text-sm leading-6 text-white/[.72]">{scene.text}</p>
      ) : (
        <p className="text-xs leading-5 text-white/[.38]">{emptyText}</p>
      )}
    </div>
  );
}

export default function StoryHistoryPanel({
  open,
  onClose,
  currentScene,
  previousScenes = [],
}) {
  const [previousExpanded, setPreviousExpanded] = useState(false);

  useEffect(() => {
    if (!open) setPreviousExpanded(false);
  }, [open]);

  if (!open) return null;

  const stopEvent = (event) => event.stopPropagation();

  return (
    <>
      <button
        type="button"
        aria-label="关闭剧情回顾"
        data-story-interactive
        onClick={(event) => {
          event.stopPropagation();
          onClose?.();
        }}
        className="absolute inset-0 z-[29] cursor-default bg-black/10"
      />
      <aside
        role="dialog"
        aria-modal="false"
        aria-label="剧情回顾"
        data-story-interactive
        onClick={stopEvent}
        onPointerDown={stopEvent}
        className="absolute left-[max(1rem,env(safe-area-inset-left))] top-[max(4.75rem,calc(env(safe-area-inset-top)+4rem))] z-[35] flex max-h-[min(72dvh,660px)] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[22px] border border-white/[.12] bg-[#0b0d16]/[.94] text-white shadow-[0_28px_90px_rgba(0,0,0,0.5)] backdrop-blur-2xl motion-safe:animate-storyChat sm:left-[max(2rem,env(safe-area-inset-left))]"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <History size={16} className="text-[#cbbcff]" aria-hidden="true" />
            <h2 className="text-sm font-semibold">剧情回顾</h2>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClose?.();
            }}
            aria-label="关闭剧情回顾"
            className="grid h-8 w-8 place-items-center rounded-lg text-white/50 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <X size={16} />
          </button>
        </header>

        <div
          data-story-interactive
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [scrollbar-color:rgba(255,255,255,0.16)_transparent] [scrollbar-width:thin]"
        >
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/[.38]">
            Current Scene
          </p>
          <SceneCopy scene={currentScene} emptyText="当前一行还在播放，已显示的内容会出现在这里。" />

          <button
            type="button"
            aria-expanded={previousExpanded}
            onClick={(event) => {
              event.stopPropagation();
              setPreviousExpanded((value) => !value);
            }}
            className="mt-4 flex w-full items-center justify-between rounded-xl px-1 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-white/[.42] transition hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55"
          >
            <span>Previous Scenes · {previousScenes.length}</span>
            <ChevronDown
              size={15}
              className={`transition ${previousExpanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>

          {previousExpanded ? (
            <div className="grid gap-3 pb-1">
              {previousScenes.length ? previousScenes.map((scene, index) => (
                <SceneCopy
                  key={scene.sceneKey || `${scene.nodeId}-${index}`}
                  scene={scene}
                  emptyText="这一幕没有已播放的正文。"
                />
              )) : (
                <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-white/35">
                  还没有之前的场景
                </p>
              )}
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
