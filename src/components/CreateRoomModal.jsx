import { useState } from "react";
import { Plus } from "lucide-react";
import Modal from "./Modal.jsx";

const traitOptions = [
  "愿意慢慢聊天",
  "喜欢电影",
  "边界感舒服",
  "情绪稳定",
  "声音温柔",
  "轻松幽默",
  "喜欢音乐",
  "爱分享日常",
  "一起玩游戏",
  "深夜电台感",
];

export default function CreateRoomModal({ onClose, onCreated }) {
  const [selectedTraits, setSelectedTraits] = useState(["愿意慢慢聊天", "边界感舒服"]);
  const [customTrait, setCustomTrait] = useState("");
  const [avoid, setAvoid] = useState("");

  const toggleTrait = (trait) => {
    setSelectedTraits((current) =>
      current.includes(trait) ? current.filter((item) => item !== trait) : [...current, trait],
    );
  };

  const addCustomTrait = () => {
    const trait = customTrait.trim();
    if (!trait) return;

    setSelectedTraits((current) => (current.includes(trait) ? current : [...current, trait]));
    setCustomTrait("");
  };

  const handleCustomTraitKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== "，" && event.key !== ",") return;

    event.preventDefault();
    addCustomTrait();
  };

  return (
    <Modal title="创建相遇房间" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="mb-3 text-sm font-medium text-stone-600">请选择你想相遇的玩家特质</p>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set([...traitOptions, ...selectedTraits])).map((trait) => (
              <button
                key={trait}
                type="button"
                onClick={() => toggleTrait(trait)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedTraits.includes(trait)
                    ? "bg-[#ffe0ce] text-[#bc5a42]"
                    : "bg-white/74 text-stone-600 hover:bg-white"
                }`}
              >
                {trait}
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              value={customTrait}
              onChange={(event) => setCustomTrait(event.target.value)}
              onKeyDown={handleCustomTraitKeyDown}
              placeholder="自定义玩家特质"
              className="warm-field min-w-0 flex-1 rounded-2xl px-4 py-3"
            />
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={addCustomTrait}
              className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl bg-[#f06f52] text-white shadow-glow transition hover:bg-[#e45f47]"
              aria-label="添加玩家特质"
            >
              <Plus size={22} />
            </button>
          </div>
        </div>
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
