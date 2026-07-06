import { Bell, MessageCircle, Radio, Settings, Users } from "lucide-react";

const items = [
  { key: "feed", label: "动态", icon: Bell },
  { key: "messages", label: "消息", icon: MessageCircle },
  { key: "meet", label: "相遇", icon: Radio },
  { key: "friends", label: "好友", icon: Users },
  { key: "settings", label: "设置", icon: Settings },
];

export default function BottomNav({ active, onSelect }) {
  return (
    <nav className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/80 bg-white/78 px-3 py-2 shadow-soft backdrop-blur-xl">
      {items.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={`flex min-w-[74px] flex-col items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
            active === key
              ? "bg-[#f06f52] text-white shadow-glow"
              : "text-stone-500 hover:bg-white hover:text-stone-800"
          }`}
        >
          <Icon size={18} />
          {label}
        </button>
      ))}
    </nav>
  );
}
