import { useState } from "react";
import Modal from "./Modal.jsx";

export default function CreateRoomModal({ onClose, onCreated }) {
  const [like, setLike] = useState("");
  const [avoid, setAvoid] = useState("");

  return (
    <Modal title="创建相遇房间" onClose={onClose}>
      <div className="space-y-4">
        <label className="block text-sm font-medium text-stone-600">
          请输入你想相遇的玩家特质
          <textarea
            value={like}
            onChange={(event) => setLike(event.target.value)}
            placeholder="例如：愿意慢慢聊天、喜欢电影、边界感舒服"
            className="warm-field mt-2 min-h-24 w-full resize-none rounded-2xl px-4 py-3"
          />
        </label>
        <label className="block text-sm font-medium text-stone-600">
          你想暂时避开的玩家特质
          <textarea
            value={avoid}
            onChange={(event) => setAvoid(event.target.value)}
            placeholder="例如：太急、只想玩竞技、深夜高强度输出"
            className="warm-field mt-2 min-h-24 w-full resize-none rounded-2xl px-4 py-3"
          />
        </label>
        <button
          onClick={onCreated}
          className="w-full rounded-2xl bg-[#f06f52] px-5 py-3 font-semibold text-white shadow-glow transition hover:bg-[#e45f47]"
        >
          创建
        </button>
      </div>
    </Modal>
  );
}
