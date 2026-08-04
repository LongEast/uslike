import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Coins,
  Crown,
  Gem,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";

const products = [
  {
    id: "month-pass",
    type: "membership",
    name: "月卡",
    eyebrow: "30 天会员",
    description: "轻松体验会员专属权益",
    badge: "入门推荐",
    price: 30,
    Icon: CalendarDays,
    colors: ["#8fa8ff", "#b88eea", "#f0a9db"],
  },
  {
    id: "season-pass",
    type: "membership",
    name: "季卡",
    eyebrow: "90 天会员",
    description: "一整个季度持续陪伴",
    badge: "更划算",
    price: 78,
    Icon: BadgeCheck,
    colors: ["#77c9d3", "#8e9be8", "#b48ce4"],
  },
  {
    id: "year-pass",
    type: "membership",
    name: "年卡",
    eyebrow: "365 天会员",
    description: "长期解锁完整会员体验",
    badge: "年度推荐",
    price: 288,
    Icon: Crown,
    colors: ["#f0bd79", "#d99edc", "#8f9feb"],
  },
  {
    id: "coins-60",
    type: "coins",
    name: "60 互像币",
    eyebrow: "小额补充",
    description: "用于商城中的个性装扮",
    amount: 60,
    price: 6,
    colors: ["#76d9dd", "#7d9cf1", "#bb8de8"],
  },
  {
    id: "coins-300",
    type: "coins",
    name: "300 互像币",
    eyebrow: "常用组合",
    description: "为头像与聊天空间换新",
    amount: 300,
    price: 30,
    colors: ["#68d3d8", "#738fe8", "#c181e2"],
  },
  {
    id: "coins-980",
    type: "coins",
    name: "980 互像币",
    eyebrow: "充足储备",
    description: "从容挑选更多个性装扮",
    amount: 980,
    price: 98,
    badge: "热门",
    colors: ["#56cbd2", "#6d82e0", "#d079d8"],
  },
];

function MembershipArtwork({ product }) {
  const { Icon, colors } = product;
  return (
    <div className="relative grid h-full place-items-center overflow-hidden" aria-hidden="true">
      <span
        className="absolute h-32 w-32 rounded-full opacity-35 blur-2xl"
        style={{ background: colors[1] }}
      />
      <div
        className="relative grid h-28 w-36 -rotate-3 place-items-center rounded-[30px] border border-white/80 shadow-[0_22px_45px_rgba(94,96,156,0.22)]"
        style={{
          background: `linear-gradient(145deg, ${colors[0]}dd, ${colors[1]}d9 55%, ${colors[2]}d4)`,
        }}
      >
        <span className="absolute inset-2 rounded-[24px] border border-white/45" />
        <Sparkles className="absolute left-4 top-4 text-white/75" size={18} />
        <Star className="absolute bottom-4 right-4 text-white/65" size={16} />
        <span className="grid h-16 w-16 place-items-center rounded-full border border-white/70 bg-white/35 text-white shadow-inner backdrop-blur-sm">
          <Icon size={32} strokeWidth={1.8} />
        </span>
      </div>
    </div>
  );
}

function CoinArtwork({ product }) {
  const { amount, colors } = product;
  return (
    <div className="relative grid h-full place-items-center overflow-hidden" aria-hidden="true">
      <span
        className="absolute h-36 w-36 rounded-full opacity-25 blur-2xl"
        style={{ background: colors[0] }}
      />
      <div className="relative h-32 w-44">
        <span
          className="absolute left-5 top-12 grid h-14 w-14 -rotate-12 place-items-center rounded-[20px] border border-white/80 text-white shadow-[0_14px_30px_rgba(80,101,177,0.2)]"
          style={{ background: `linear-gradient(145deg, ${colors[0]}, ${colors[1]})` }}
        >
          <Gem size={28} />
        </span>
        <span
          className="absolute right-4 top-7 grid h-[72px] w-[72px] rotate-12 place-items-center rounded-[24px] border border-white/80 text-white shadow-[0_18px_38px_rgba(90,83,177,0.24)]"
          style={{ background: `linear-gradient(145deg, ${colors[1]}, ${colors[2]})` }}
        >
          <Gem size={36} />
        </span>
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full border border-white/80 bg-white/70 px-4 py-1.5 text-sm font-bold text-[#646aa6] shadow-sm backdrop-blur-sm">
          × {amount}
        </span>
        <Sparkles className="absolute right-0 top-0 text-[#8c87dc]" size={22} />
      </div>
    </div>
  );
}

function ProductCard({ product, onPurchase }) {
  return (
    <article className="group relative flex min-h-[390px] flex-col overflow-hidden rounded-[30px] border border-white/80 bg-white/76 shadow-[0_18px_55px_rgba(88,95,142,0.13)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/86 hover:shadow-[0_24px_65px_rgba(88,95,142,0.2)]">
      {product.badge ? (
        <span className="absolute left-4 top-4 z-10 rounded-full border border-white/70 bg-white/78 px-3 py-1.5 text-xs font-bold text-[#6764c4] shadow-sm backdrop-blur-md">
          {product.badge}
        </span>
      ) : null}

      <div
        className="h-48 border-b border-white/80"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,.9) 0 3px, transparent 4px), linear-gradient(145deg, rgba(225,234,255,.88), rgba(239,228,255,.78))",
          backgroundSize: "22px 22px, auto",
        }}
      >
        {product.type === "membership" ? (
          <MembershipArtwork product={product} />
        ) : (
          <CoinArtwork product={product} />
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-bold tracking-[0.16em] text-[#7777ad]">{product.eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold text-stone-900">{product.name}</h2>
        <p className="mt-2 text-sm leading-6 text-stone-500">{product.description}</p>
        <button
          type="button"
          onClick={() => onPurchase(product)}
          className="aurora-dark mt-auto flex w-full items-center justify-center gap-2.5 rounded-2xl px-5 py-3.5 text-xl font-bold tracking-wide text-white shadow-glow transition hover:brightness-110 active:scale-[0.99]"
        >
          {product.type === "membership" ? <ShieldCheck size={21} /> : <Coins size={21} />}
          ¥{product.price}
        </button>
      </div>
    </article>
  );
}

export default function StoreView({ onBack, onToast }) {
  const purchase = (product) => {
    onToast?.(`${product.name}购买功能稍后开放。`);
  };

  return (
    <section className="mx-auto w-full max-w-6xl pb-36 pt-24">
      <div className="mb-6 flex flex-col gap-5 rounded-[32px] border border-white/80 bg-white/58 p-5 shadow-soft backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/80 bg-white/72 text-stone-600 shadow-sm transition hover:bg-white hover:text-stone-900"
            aria-label="返回"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="text-sm font-semibold text-[#6b5ee7]">USLIKE STORE</p>
            <h1 className="mt-1 text-3xl font-semibold text-stone-900">互像商城</h1>
            <p className="mt-2 text-sm text-stone-500">选择会员方案，或补充用于个性装扮的互像币。</p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start rounded-2xl border border-white/80 bg-white/72 px-4 py-3 shadow-sm sm:self-center">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#75d1d8] via-[#8296e8] to-[#c78be0] text-white shadow-sm">
            <Gem size={21} />
          </span>
          <span>
            <span className="block text-xs font-medium text-stone-400">我的互像币</span>
            <span className="mt-0.5 block text-lg font-semibold text-stone-800">0</span>
          </span>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onPurchase={purchase} />
        ))}
      </div>
    </section>
  );
}
