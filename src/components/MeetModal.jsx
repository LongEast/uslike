import { DoorOpen, PlusCircle } from "lucide-react";
import { useRef } from "react";
import Modal from "./Modal.jsx";
import SpotlightTutorial from "./SpotlightTutorial.jsx";

export default function MeetModal({ onClose, onCreate, onJoin, tutorialActive, onTutorialDismiss }) {
  const joinButtonRef = useRef(null);

  return (
    <Modal title="想怎么相遇？" onClose={onClose} width="max-w-md">
      <div className="grid gap-3">
        <button
          onClick={onCreate}
          disabled={tutorialActive}
          className="glass-choice-active flex items-center gap-4 rounded-3xl p-5 text-left transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <span className="aurora-dark flex h-12 w-12 items-center justify-center rounded-2xl text-stone-950">
            <PlusCircle size={24} />
          </span>
          <span>
            <span className="block font-semibold text-stone-800">创建房间</span>
            <span className="mt-1 block text-sm text-stone-500">写下想靠近和想避开的特质。</span>
          </span>
        </button>
        <div className="relative">
          <button
            ref={joinButtonRef}
            onClick={onJoin}
            className="glass-choice-active flex w-full items-center gap-4 rounded-3xl p-5 text-left transition hover:-translate-y-1"
          >
            <span className="aurora-dark flex h-12 w-12 items-center justify-center rounded-2xl text-stone-950">
              <DoorOpen size={24} />
            </span>
            <span>
              <span className="block font-semibold text-stone-800">加入房间</span>
              <span className="mt-1 block text-sm text-stone-500">在语义空间里寻找附近的人。</span>
            </span>
          </button>
          {tutorialActive ? (
            <SpotlightTutorial
              step={1}
              targets={[{ ref: joinButtonRef, padding: 7, radius: 24 }]}
              showContinue
              onContinue={onJoin}
              onDismiss={onTutorialDismiss}
            >
              尝试加入一个房间，开始你的第一次相遇。
            </SpotlightTutorial>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
