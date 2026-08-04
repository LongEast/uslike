import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Coins,
  Crown,
  Flower2,
  Gem,
  MessageCircle,
  Moon,
  Palette,
  ShieldCheck,
  Sparkles,
  Star,
  Type,
  UserRound,
} from "lucide-react";
import { useState } from "react";

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

const decorationProducts = [
  {
    id: "bubble-manga",
    type: "bubble",
    variant: "manga",
    name: "漫画风格",
    eyebrow: "聊天气泡",
    description: "经典黑白对白框，让聊天像漫画分镜",
    coinPrice: 60,
    badge: "经典",
    colors: ["#ffffff", "#d6d3d1", "#292524"],
  },
  {
    id: "frame-orbit",
    type: "frame",
    variant: "orbit",
    name: "同频星环",
    eyebrow: "头像框",
    description: "用环绕微光点亮你的头像",
    coinPrice: 180,
    badge: "推荐",
    colors: ["#65c9d0", "#8197e5", "#bb8bdd"],
  },
  {
    id: "text-gradient",
    type: "text",
    variant: "nickname",
    name: "渐变昵称",
    eyebrow: "个性文字",
    description: "为昵称换上轻盈的渐变色彩",
    coinPrice: 90,
    colors: ["#788fe8", "#b27fd9", "#e58fc7"],
  },
  {
    id: "bubble-sunset",
    type: "bubble",
    name: "晚霞回声",
    eyebrow: "聊天气泡",
    description: "暖色霞光包裹你的聊天内容",
    coinPrice: 120,
    colors: ["#f0ac9c", "#d895cf", "#8f9de8"],
  },
  {
    id: "frame-moonlight",
    type: "frame",
    variant: "moonlight",
    name: "月光花冠",
    eyebrow: "头像框",
    description: "月色与花瓣环绕头像绽放",
    coinPrice: 260,
    colors: ["#8fa9ee", "#c399e2", "#f0b7d5"],
  },
  {
    id: "text-sparkle",
    type: "text",
    variant: "signature",
    name: "闪光个签",
    eyebrow: "个性文字",
    description: "让个人签名拥有细碎闪光",
    coinPrice: 150,
    badge: "热门",
    colors: ["#67cbd1", "#758ce2", "#ce85d7"],
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

function OrbitFrameArtwork({ colors }) {
  return (
    <div className="relative grid h-full place-items-center overflow-hidden" aria-hidden="true">
      <span className="absolute h-40 w-40 rounded-full opacity-35 blur-2xl" style={{ background: colors[1] }} />
      <div className="relative h-40 w-48">
        <span className="absolute left-1/2 top-1/2 h-[82px] w-44 -translate-x-1/2 -translate-y-1/2 rotate-[18deg] rounded-[50%] border-2 border-[#76cdd6]/80 shadow-[0_0_12px_rgba(101,201,208,0.48)]" />
        <span className="absolute left-1/2 top-1/2 h-36 w-[92px] -translate-x-1/2 -translate-y-1/2 rotate-[52deg] rounded-[50%] border-2 border-[#9e8fe5]/75 shadow-[0_0_12px_rgba(129,151,229,0.46)]" />
        <span className="absolute left-1/2 top-1/2 h-[68px] w-40 -translate-x-1/2 -translate-y-1/2 -rotate-[24deg] rounded-[50%] border border-white/90" />

        <span className="absolute left-[9px] top-[62px] h-3.5 w-3.5 animate-pulseSoft rounded-full border-2 border-white bg-[#63cbd2] shadow-[0_0_16px_rgba(99,203,210,0.9)]" />
        <span className="absolute right-[12px] top-[48px] h-3 w-3 animate-pulseSoft rounded-full border-2 border-white bg-[#b886dc] shadow-[0_0_16px_rgba(184,134,220,0.9)] [animation-delay:.7s]" />
        <span className="absolute bottom-[8px] left-[75px] h-2.5 w-2.5 animate-pulseSoft rounded-full border-2 border-white bg-[#8297e5] shadow-[0_0_14px_rgba(130,151,229,0.9)] [animation-delay:1.2s]" />

        <span
          className="absolute left-1/2 top-1/2 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full p-[5px] shadow-[0_20px_45px_rgba(77,91,160,0.3)]"
          style={{ background: `conic-gradient(${colors[0]}, ${colors[1]}, ${colors[2]}, ${colors[0]})` }}
        >
          <span className="grid h-full w-full place-items-center rounded-full border-4 border-white/90 bg-white/76 text-[#7078ad] backdrop-blur-sm">
            <UserRound size={38} />
          </span>
        </span>
        <Sparkles className="absolute right-6 top-3 text-white drop-shadow" size={22} />
        <Star className="absolute bottom-5 left-5 fill-white/55 text-white drop-shadow" size={17} />
      </div>
    </div>
  );
}

function MoonlightFrameArtwork({ colors }) {
  return (
    <div className="relative grid h-full place-items-center overflow-hidden" aria-hidden="true">
      <span className="absolute h-40 w-40 rounded-full bg-[#c7b7f2]/45 blur-2xl" />
      <div className="relative h-40 w-44">
        <span className="absolute bottom-1 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-white/55 blur-xl" />
        <span
          className="absolute bottom-2 left-1/2 grid h-28 w-28 -translate-x-1/2 place-items-center rounded-full p-[5px] shadow-[0_22px_46px_rgba(114,101,176,0.28)]"
          style={{ background: `conic-gradient(#f6dd9b, ${colors[2]}, ${colors[1]}, #f6dd9b)` }}
        >
          <span className="grid h-full w-full place-items-center rounded-full border-4 border-white/90 bg-white/76 text-[#7d79ad] backdrop-blur-sm">
            <UserRound size={40} />
          </span>
        </span>

        <Moon className="absolute left-0 top-5 fill-[#ffe8a8]/80 text-[#e8c878] drop-shadow-[0_0_10px_rgba(255,232,168,0.75)]" size={42} strokeWidth={1.7} />
        <Flower2 className="absolute left-[48px] top-4 fill-[#d8c3f1]/60 text-white drop-shadow" size={30} />
        <Flower2 className="absolute left-[73px] top-0 fill-[#f3c6df]/75 text-white drop-shadow" size={38} />
        <Flower2 className="absolute right-[43px] top-5 fill-[#b9caef]/70 text-white drop-shadow" size={28} />
        <span className="absolute right-[15px] top-[44px] h-3 w-3 rounded-full border-2 border-white bg-[#f5cfdd] shadow-[0_0_12px_rgba(245,207,221,0.9)]" />
        <Sparkles className="absolute right-1 top-2 text-[#fff4c9] drop-shadow" size={23} />
        <Star className="absolute bottom-4 left-4 fill-[#fff0b7]/70 text-[#f4dda0] drop-shadow" size={17} />
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

function DecorationArtwork({ product, nickname }) {
  const { colors } = product;

  if (product.variant === "manga") {
    return (
      <div className="relative grid h-full place-items-center overflow-hidden" aria-hidden="true">
        <span className="absolute h-32 w-44 rounded-full bg-stone-300/35 blur-2xl" />
        <svg
          viewBox="0 0 220 170"
          className="relative w-52 drop-shadow-[7px_9px_0_rgba(41,37,36,0.14)]"
          aria-hidden="true"
        >
          <path
            d="M18 72C18 29 60 10 111 10C167 10 202 38 199 80C197 111 171 130 139 135C147 145 158 153 172 159C150 158 132 150 118 137C70 138 32 122 21 94C18 87 17 79 18 72Z"
            fill="white"
            stroke="#292524"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M30 69C34 39 67 23 111 23"
            fill="none"
            stroke="rgba(255,255,255,.92)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  if (product.type === "bubble") {
    return (
      <div className="relative grid h-full place-items-center overflow-hidden" aria-hidden="true">
        <span className="absolute h-32 w-40 rounded-full opacity-30 blur-2xl" style={{ background: colors[1] }} />
        <div className="relative w-52 space-y-3">
          <span
            className="block w-[82%] rounded-[22px_22px_22px_6px] border border-white/75 px-4 py-3 text-sm font-semibold text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
          >
            今天也要同频相遇
          </span>
          <span
            className="ml-auto flex w-[64%] items-center justify-end gap-2 rounded-[22px_22px_6px_22px] border border-white/75 px-4 py-3 text-sm font-semibold text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${colors[1]}, ${colors[2]})` }}
          >
            <MessageCircle size={15} /> 好呀
          </span>
        </div>
      </div>
    );
  }

  if (product.type === "frame") {
    return product.variant === "orbit"
      ? <OrbitFrameArtwork colors={colors} />
      : <MoonlightFrameArtwork colors={colors} />;
  }

  if (product.variant === "nickname") {
    return (
      <div className="relative grid h-full place-items-center overflow-hidden" aria-hidden="true">
        <span className="absolute h-32 w-44 rounded-full opacity-30 blur-2xl" style={{ background: colors[1] }} />
        <div className="relative flex min-w-52 items-center gap-3 rounded-[26px] border border-white/80 bg-white/62 px-5 py-4 shadow-[0_18px_40px_rgba(88,95,142,0.18)] backdrop-blur-sm">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-white text-white shadow-sm"
            style={{ background: `linear-gradient(145deg, ${colors[0]}, ${colors[1]})` }}
          >
            <UserRound size={23} />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold tracking-[0.18em] text-[#8985b6]">USLIKE NICKNAME</span>
            <span
              className="mt-1 block max-w-36 truncate text-2xl font-black text-transparent"
              style={{ backgroundImage: `linear-gradient(120deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`, backgroundClip: "text" }}
            >
              {nickname}
            </span>
          </span>
          <Sparkles className="absolute -bottom-2 -right-2 text-[#a685d8]" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative grid h-full place-items-center overflow-hidden" aria-hidden="true">
      <span className="absolute h-32 w-40 rounded-full opacity-30 blur-2xl" style={{ background: colors[1] }} />
      <div className="relative rounded-[28px] border border-white/80 bg-white/58 px-8 py-6 text-center shadow-[0_18px_40px_rgba(88,95,142,0.18)] backdrop-blur-sm">
        <Type className="absolute -left-3 -top-3 rounded-xl bg-white/80 p-2 text-[#7379bd] shadow-sm" size={35} />
        <span
          className="text-3xl font-black tracking-[0.16em] text-transparent"
          style={{ backgroundImage: `linear-gradient(120deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`, backgroundClip: "text" }}
        >
          保持真诚
        </span>
        <Sparkles className="absolute -bottom-2 -right-2 text-[#a685d8]" size={24} />
      </div>
    </div>
  );
}

function DecorationCard({ product, onPurchase, nickname }) {
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
        <DecorationArtwork product={product} nickname={nickname} />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-bold tracking-[0.16em] text-[#7777ad]">{product.eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold text-stone-900">{product.name}</h2>
        <p className="mt-2 text-sm leading-6 text-stone-500">{product.description}</p>
        <button
          type="button"
          onClick={() => onPurchase(product)}
          className="aurora-dark mt-auto flex w-full items-center justify-center gap-2.5 rounded-2xl px-5 py-3.5 text-xl font-bold text-white shadow-glow transition hover:brightness-110 active:scale-[0.99]"
        >
          <Gem size={21} />
          {product.coinPrice} 互像币
        </button>
      </div>
    </article>
  );
}

export default function StoreView({ onBack, onToast }) {
  const [section, setSection] = useState("recharge");
  const nickname = "同频相遇";
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
            <p className="mt-2 text-sm text-stone-500">
              {section === "recharge"
                ? "选择会员方案，或补充用于个性装扮的互像币。"
                : "挑选聊天气泡、头像框与个性文字，装扮你的社交空间。"}
            </p>
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

      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-full border border-white/80 bg-white/58 p-1.5 shadow-sm backdrop-blur-xl" role="tablist" aria-label="商城分类">
          {[
            { id: "recharge", label: "会员与互像币", Icon: Coins },
            { id: "decorations", label: "个性装扮", Icon: Palette },
          ].map(({ id, label, Icon }) => {
            const selected = section === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setSection(id)}
                className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition sm:px-7 ${
                  selected
                    ? "aurora-dark text-white shadow-glow"
                    : "text-stone-500 hover:bg-white/70 hover:text-stone-900"
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {section === "recharge"
          ? products.map((product) => (
              <ProductCard key={product.id} product={product} onPurchase={purchase} />
            ))
          : decorationProducts.map((product) => (
              <DecorationCard key={product.id} product={product} onPurchase={purchase} nickname={nickname} />
            ))}
      </div>
    </section>
  );
}
