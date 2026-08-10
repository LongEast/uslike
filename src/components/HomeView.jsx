import { Radio, Sparkles } from "lucide-react";
import Avatar from "./Avatar.jsx";
import { CheckInCard } from "./CoinWalletUI.jsx";

export default function HomeView({ user, feed, onMeet, wallet, onOpenCheckIn, onCheckIn, onOpenStore }) {
  return (
    <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 pb-32 pt-24 lg:grid-cols-[1.1fr_.9fr]">
      <div className="glass-panel min-h-[420px] rounded-[32px] p-8">
        <p className="mb-3 text-sm font-semibold text-[#5d6387]">今日相遇方向</p>
        <h2 className="max-w-xl text-4xl font-semibold leading-tight text-stone-800">
          从轻轻回答一个问题开始，让关系自己长出来。
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {["语义匹配", "问题破冰", "轻游戏解锁"].map((item, index) => (
            <div key={item} className="glass-choice-active rounded-3xl p-5">
              <span className="mb-6 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/60 bg-white/24 font-bold text-stone-700 backdrop-blur-xl">
                {index + 1}
              </span>
              <p className="font-semibold text-stone-800">{item}</p>
            </div>
          ))}
        </div>
        <button
          onClick={onMeet}
          className="aurora-dark mt-10 inline-flex items-center gap-2 rounded-full px-7 py-4 font-semibold text-white shadow-glow transition hover:-translate-y-1 hover:brightness-110"
        >
          <Radio size={20} />
          相遇
        </button>
      </div>

      <div className="space-y-5">
        <div className="glass-panel rounded-[32px] p-6">
          <div className="flex items-center gap-4">
            <Avatar src={user.avatar} name={user.nickname} size="lg" glow />
            <div>
              <p className="text-sm text-stone-500">欢迎回来</p>
              <h3 className="text-2xl font-semibold text-stone-800">{user.nickname}</h3>
              <p className="mt-1 text-sm text-stone-500">{user.region} · {user.interests.join(" / ")}</p>
            </div>
          </div>
        </div>
        <CheckInCard wallet={wallet} onOpen={onOpenCheckIn} onClaim={onCheckIn} onOpenStore={onOpenStore} />
        {feed.map((item) => (
          <article key={item.id} className="glass-panel rounded-[28px] p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#5d6387]">
              <Sparkles size={16} />
              {item.user}
            </div>
            <h3 className="font-semibold text-stone-800">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-stone-500">{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
