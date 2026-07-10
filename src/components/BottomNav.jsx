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
    <nav className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/70 bg-white/58 px-3 py-2 shadow-soft backdrop-blur-xl">
      {items.map(({ key, label, icon: Icon }) => {
        const isMeet = key === "meet";
        const isActive = active === key;

        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`flex min-w-[74px] flex-col items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
              isMeet
                ? "text-stone-950 hover:-translate-y-1"
                : isActive
                  ? "ink-glass"
                  : "text-stone-500 hover:bg-white/72 hover:text-stone-900"
            }`}
          >
            <span
              className={`grid place-items-center rounded-full transition ${
                isMeet
                  ? "aurora-dark h-14 w-14 text-white shadow-glow"
                  : "h-7 w-7"
              }`}
            >
              <Icon size={isMeet ? 24 : 18} />
            </span>
            <span className={isMeet ? "text-stone-950" : ""}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
