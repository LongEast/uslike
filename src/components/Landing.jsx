import {
  ArrowRight,
  Check,
  HeartHandshake,
  Lock,
  MessageCircleHeart,
  Radio,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react";

const steps = [
  {
    title: "每日同频问题",
    text: "每天一个轻量问题，让两个人自然越过寒暄，先分享一点真实的自己。",
  },
  {
    title: "双方回答后交友",
    text: "彼此回答至少一个问题后才能添加对方好友，让好奇心保持对等，对话也更舒服。",
  },
  {
    title: "解锁更深互动",
    text: "持续回应会积累信任与匹配条件，逐步解锁语音房、文字房和轻游戏。",
  },
];

const benefits = [
  {
    icon: MessageCircleHeart,
    title: "低压力开场",
    text: "问题深入浅出，能让两个人立刻聊起来",
  },
  {
    icon: Radio,
    title: "同频发现",
    text: "Uslike 通过兴趣、语义信号和表达节奏，帮你找到更像同类的人。",
  },
  {
    icon: Lock,
    title: "逐步开放",
    text: "匹配、进房、揭晓回答都有节奏，让用户按自己的舒适度慢慢靠近。",
  },
  {
    icon: Trophy,
    title: "有趣的关系进度",
    text: "连续回答、每日仪式和轻游戏，让关系变熟这件事不再像任务。",
  },
];

const testimonials = [
  {
    quote: "以前我总会想太多，不知道怎么开口。每日问题让第一句话变得很自然。",
    name: "米娜",
    label: "喜欢思考的大学生",
  },
  {
    quote: "比滑来滑去更有人味。我们通过问题找到了可以聊的上下文。",
    name: "阿杰",
    label: "语音房爱好者",
  },
  {
    quote: "回答问题只是一个小瞬间，但它让每天回应变成了两个人的小仪式。",
    name: "安安和 Leo",
    label: "异地好友",
  },
];

const faqs = [
  {
    question: "Uslike 是什么？",
    answer:
      "Uslike 是一个通过语音房、文字房中回答电波问题和一起玩轻游戏来认识新朋友的社交产品。",
  },
  {
    question: "它只适合恋爱交友吗？",
    answer:
      "不是。Uslike 面向所有想拥有更好对话的人，关系可以是朋友、搭子、合作伙伴，也可以继续发展。",
  },
  {
    question: "匹配是怎么发生的？",
    answer:
      "当前原型会结合兴趣、房间语境和用户问卷，在进入更深互动前先创造一个更温暖的发现时刻。",
  },
  {
    question: "点击开始后会发生什么？",
    answer:
      "你会先创建资料并回答几个引导问题，然后进入应用，发现房间并开始相遇。",
  },
];

function PhonePreview() {
  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <div className="rounded-[44px] border border-white/80 bg-[#171821] p-3 shadow-[0_28px_90px_rgba(37,42,85,0.26)]">
        <div className="min-h-[610px] overflow-hidden rounded-[34px] bg-[#f7f4ed]">
          <div className="bg-[#ffe9a8] px-5 pb-6 pt-5">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8c6415]">
                  USLIKE 今日
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-[#27221a]">同频问题</h2>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white/70 text-[#8c6415]">
                <HeartHandshake size={20} />
              </span>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-[18px] bg-white/60 px-3 py-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#9b6a05]">
                  <Sparkles size={16} />
                </span>
                <div>
                  <p className="text-[10px] font-bold text-[#9b6a05]">匹配度</p>
                  <p className="text-sm font-semibold text-stone-900">92%</p>
                </div>
              </div>
              <div className="rounded-[18px] bg-white/60 px-3 py-2">
                <div className="mb-1 flex -space-x-2">
                  {["L", "Y", "U"].map((name, index) => (
                    <span
                      key={name}
                      className="grid h-6 w-6 place-items-center rounded-full border-2 border-white text-[10px] font-bold text-white"
                      style={{
                        background: ["#3aa99e", "#f07b6e", "#6877dd"][index],
                      }}
                    >
                      {name}
                    </span>
                  ))}
                </div>
                <p className="text-xs font-semibold leading-4 text-stone-700">3 人已回答</p>
              </div>
            </div>
            <div className="rounded-[26px] bg-white/74 p-5 shadow-[0_16px_42px_rgba(135,94,28,0.12)]">
              <p className="text-sm font-semibold text-[#8c6415]">今日问题</p>
              <p className="mt-3 text-2xl font-semibold leading-tight text-stone-900">
                  家人为你准备了一条稳定、风险低的职业道路，但你真正想做的方向不稳定、收入也不确定。你会：
              </p>
            </div>
          </div>

          <div className="space-y-4 px-5 py-5">
            <div className="rounded-[26px] bg-white p-4 shadow-[0_14px_36px_rgba(64,55,40,0.08)]">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-stone-700">双向揭晓</p>
                <span className="rounded-full bg-[#e3f6ef] px-3 py-1 text-xs font-bold text-[#267a68]">
                  已互答
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[20px] bg-[#eff7ff] p-3">
                  <p className="text-xs font-semibold text-[#527599]">你</p>
                  <p className="mt-2 text-sm leading-5 text-stone-700">选择自己的方向，承担选择带来的风险</p>
                </div>
                <div className="rounded-[20px] bg-[#fff0ed] p-3">
                  <p className="text-xs font-semibold text-[#b25b4c]">小鹿</p>
                  <p className="mt-2 text-sm leading-5 text-stone-700">先走稳定道路，在有保障的情况下再尝试喜欢的事。</p>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] bg-[#1e2836] p-4 text-white shadow-[0_18px_48px_rgba(30,40,54,0.18)]">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[#3aa99e]">
                  <Radio size={20} />
                </span>
                <div>
                  <p className="text-sm font-semibold">晚风电波房</p>
                  <p className="text-xs text-white/62">谈心 / 交友 / 夜聊</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-full bg-white/10 px-4 py-3">
                <span className="text-sm font-semibold">准备进入</span>
                <ArrowRight size={18} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing({ onStart }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfaf7] text-stone-900">
      <section className="relative min-h-screen border-b border-stone-200/70 bg-[linear-gradient(135deg,#fff9e9_0%,#f7fbff_42%,#fff2f0_100%)] px-5">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between py-6">
          <button
            onClick={onStart}
            className="inline-flex items-center gap-3 text-left"
            aria-label="开始使用 Uslike"
          >
            <span className="grid h-11 w-11 place-items-center rounded-[16px] bg-[#171821] text-white shadow-[0_10px_24px_rgba(23,24,33,0.18)]">
              <HeartHandshake size={22} />
            </span>
            <span>
              <span className="block text-lg font-semibold leading-5">Uslike</span>
              <span className="block text-xs font-medium text-stone-500">同频相遇，互像欢喜</span>
            </span>
          </button>

          <button
            onClick={onStart}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/76 px-5 py-3 text-sm font-semibold text-stone-800 shadow-sm ring-1 ring-stone-200/80 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
          >
            立即开始
            <ArrowRight size={16} />
          </button>
        </nav>

        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 pb-20 pt-8 lg:min-h-[calc(100vh-92px)] lg:grid-cols-[1fr_0.86fr] lg:pb-24">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/76 px-4 py-2 text-sm font-semibold text-[#7b5520] shadow-sm ring-1 ring-stone-200/80 backdrop-blur">
              <Sparkles size={16} />
              用每日问题开启更自然的第一场对话
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.03] text-stone-950 sm:text-6xl lg:text-7xl">
              每天回答一个问题，遇见真正同频的人。
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
              Uslike 用个性匹配带来双向揭晓、
              同频房间和可解锁的互动，让你更快判断一个人是不是你的同类。
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={onStart}
                className="aurora-dark inline-flex min-h-14 items-center justify-center gap-3 rounded-full px-8 py-4 text-base font-semibold text-white shadow-glow transition hover:-translate-y-1 hover:brightness-110"
              >
                开始相遇
                <ArrowRight size={19} />
              </button>
              <a
                href="#how"
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-stone-300/80 bg-white/70 px-8 py-4 text-base font-semibold text-stone-800 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:bg-white"
              >
                了解流程
              </a>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
              {[
                ["1 分钟", "完成回答"],
                ["2+N 个人", "电波一下"],
                ["50 句", "解锁游戏"],
              ].map(([value, label]) => (
                <div key={value} className="rounded-[22px] border border-white/80 bg-white/68 p-4 shadow-sm backdrop-blur">
                  <p className="text-2xl font-semibold text-stone-950">{value}</p>
                  <p className="mt-1 text-sm text-stone-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <PhonePreview />
        </div>
      </section>

      <section id="how" className="px-5 py-20 sm:py-24">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#3a8f83]">使用流程</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
              一个很小的每日仪式，打开更合适的关系入口。
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <article key={step.title} className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
                <span className="grid h-12 w-12 place-items-center rounded-[18px] bg-[#1e2836] text-lg font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-8 text-2xl font-semibold text-stone-950">{step.title}</h3>
                <p className="mt-3 text-base leading-7 text-stone-600">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#1e2836] px-5 py-20 text-white sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#88e0d3]">为什么是 Uslike</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              为想要更柔和相遇方式的人设计。
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/70">
              我们保留每日问题产品的清晰感，并把它延展到 Uslike 的社交流程里：
              发现、进房、互答、交友，以及逐步解锁更深互动。
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <article key={benefit.title} className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6">
                  <span className="grid h-12 w-12 place-items-center rounded-[18px] bg-white text-[#1e2836]">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-6 text-xl font-semibold">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/66">{benefit.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:py-24">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#b25b4c]">用户反馈</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
                围绕「对话突然变容易」的那一刻来设计。
              </h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#e3f6ef] px-4 py-2 text-sm font-semibold text-[#267a68]">
              <UsersRound size={17} />
              早期社区预览
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <article key={testimonial.name} className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
                <p className="text-lg leading-8 text-stone-700">"{testimonial.quote}"</p>
                <div className="mt-8 flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-[#fff1c7] font-bold text-[#8c6415]">
                    {testimonial.name.slice(0, 1)}
                  </span>
                  <div>
                    <p className="font-semibold text-stone-950">{testimonial.name}</p>
                    <p className="text-sm text-stone-500">{testimonial.label}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-stone-200 bg-[#f6f8ff] px-5 py-20 sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#6877dd]">常见问题</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
              简短说明。
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-[24px] border border-stone-200 bg-white p-6 shadow-sm">
                <div className="flex gap-3">
                  <span className="mt-1 grid h-6 w-6 flex-none place-items-center rounded-full bg-[#e3f6ef] text-[#267a68]">
                    <Check size={15} />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-stone-950">{faq.question}</h3>
                    <p className="mt-2 leading-7 text-stone-600">{faq.answer}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:py-24">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-8 rounded-[32px] bg-[#171821] p-8 text-white shadow-[0_28px_90px_rgba(23,24,33,0.22)] sm:p-10 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#ffe9a8]">现在开始</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              一个问题，就足够找到第一根对话线索。
            </h2>
          </div>
          <button
            onClick={onStart}
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-white px-8 py-4 text-base font-semibold text-stone-950 shadow-sm transition hover:-translate-y-1 hover:bg-[#ffe9a8]"
          >
            申请体验
            <ArrowRight size={19} />
          </button>
        </div>
      </section>
    </main>
  );
}
