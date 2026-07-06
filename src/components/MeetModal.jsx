import { DoorOpen, PlusCircle } from "lucide-react";
import Modal from "./Modal.jsx";

export default function MeetModal({ onClose, onCreate, onJoin }) {
  return (
    <Modal title="想怎么相遇？" onClose={onClose} width="max-w-md">
      <div className="grid gap-3">
        <button
          onClick={onCreate}
          className="flex items-center gap-4 rounded-3xl bg-white/78 p-5 text-left shadow-sm transition hover:-translate-y-1 hover:bg-white"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ffe0ce] text-[#e76147]">
            <PlusCircle size={24} />
          </span>
          <span>
            <span className="block font-semibold text-stone-800">创建房间</span>
            <span className="mt-1 block text-sm text-stone-500">写下想靠近和想避开的特质。</span>
          </span>
        </button>
        <button
          onClick={onJoin}
          className="flex items-center gap-4 rounded-3xl bg-white/78 p-5 text-left shadow-sm transition hover:-translate-y-1 hover:bg-white"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d8f4ec] text-[#29977e]">
            <DoorOpen size={24} />
          </span>
          <span>
            <span className="block font-semibold text-stone-800">加入房间</span>
            <span className="mt-1 block text-sm text-stone-500">在语义空间里寻找附近的人。</span>
          </span>
        </button>
      </div>
    </Modal>
  );
}
