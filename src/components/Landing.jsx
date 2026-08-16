import { useRef } from "react";
import {
  ArrowRight,
  Check,
  Lock,
  MessageCircleHeart,
  Radio,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react";
import AgapeBackgroundLayer from "./AgapeBackgroundLayer.jsx";
import BrandMark from "./BrandMark.jsx";
import useScrollProgress from "../hooks/useScrollProgress.js";

const steps = [
  {
    title: "同频脑电波问题",
    text: "一个轻量问题，让两个人自然越过寒暄，先分享一点真实的自己。",
  },
  {
    title: "双方回答后交友",
    text: "彼此回答至少一个问题后才能添加对方好友，让好奇心保持对等，对话也更舒服。",
  },
  {
    title: "解锁更深互动",
    text: "持续回应会积累信任与匹配条件，逐步解锁轻游戏，大世界文游等更多惊喜",
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
    text: "Uslike 通过兴趣、语义信号和表达节奏，帮你找到更聊得来的人。",
  },
  {
    icon: Lock,
    title: "逐步开放",
    text: "匹配、进房、揭晓回答都有节奏，让用户按自己的舒适度慢慢靠近。",
  },
  {
    icon: Trophy,
    title: "有趣的关系进度",
    text: "回答问题和轻游戏，让关系变熟这件事不再像任务。",
  },
];

const testimonials = [
{
quote: "作为一个鬼点子多但不知如何开口的人，那些有趣的问题让我不用硬想开场白，也能很自然地说出第一句话",
name: "米娜",
label: "有点社恐的电波系大学生",
},
{
quote: "从’原来你也看《三体》‘开始，我们聊了一下午，找到同频的人，开口真的很自然",
name: "阿杰",
label: "小众科幻爱好者",
},
{
quote: "异地久了，每天只剩早午晚安。Uslike 让我们重新聊起彼此最近的情绪和变化",
name: "安安和 Leo",
label: "异地情侣",
},
];


const faqs = [
  {
    question: "Uslike 是什么？",
    answer:
      "Uslike 是一个通过语音房、文字房中回答电波问题和一起玩轻游戏来认识新朋友的社交产品",
  },
  {
    question: "它只适合网恋交友吗？",
    answer:
      "不是。Uslike 面向所有想拥有更好对话的人，你在现实中的朋友、伙伴、恋人也可以通过这个社交软件来继续发展关系",
  },
  {
    question: "我需要干什么？",
    answer:
      "你会先创建资料并回答几个引导问题（可跳过），然后进入应用，创造/发现房间并开始相遇",
  },
  {
    question: "匹配是怎么发生的？",
    answer:
      "当前原型会结合兴趣、房间语境和用户问卷进行推荐，由你决定是否进入房间，让每次相遇更安心、更自主",
  },
];

const storySteps = [
  {
    id: "question",
    eyebrow: "第一步",
    title: "一个有点荒唐的问题，把开场变轻。",
    text: "先不用介绍自己，也不用想完美开场白。问题会替你把好奇心摆到桌面上。",
  },
  {
    id: "answer",
    eyebrow: "第二步",
    title: "回答出现后，关系开始有了温度。",
    text: "双方的真实反应会一条条浮现，聊天从选择题变成自然接话。",
  },
  {
    id: "thread",
    eyebrow: "第三步",
    title: "一个共同点，会把对话往下推。",
    text: "当两个人发现都养猫、都在意孤独感，下一句就不再难开口。",
  },
].map((step, index, allSteps) => ({
  ...step,
  start: index / allSteps.length,
  end: (index + 1) / allSteps.length,
}));

const phoneMessages = [
  {
    author: "你",
    side: "right",
    text: "天哪，不和人交流的日子也太孤单了吧",
    start: 0.08,
    end: 0.22,
  },
  {
    author: "小橘",
    side: "left",
    text: "但是动物很可爱啊，我想和我家的猫说话呢",
    start: 0.38,
    end: 0.52,
  },
  {
    author: "你",
    side: "right",
    text: "哦天哪你家也养了猫，什么品种的啊。。。",
    start: 0.7,
    end: 0.84,
  },
];

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function getRangeProgress(progress, start, end) {
  return clamp((progress - start) / (end - start));
}

function getStoryIndex(progress) {
  return storySteps.reduce((activeIndex, step, index) => (progress >= step.start ? index : activeIndex), 0);
}

function getNextMessageIndex(progress) {
  const visibleMessageIndex = phoneMessages.reduce(
    (latestIndex, message, index) => (progress >= message.start ? index : latestIndex),
    -1,
  );

  return visibleMessageIndex < phoneMessages.length - 1 ? visibleMessageIndex + 1 : -1;
}

function getTimelineState(progress) {
  const safeProgress = clamp(progress);
  const messageProgress = phoneMessages.map((message) => getRangeProgress(safeProgress, message.start, message.end));

  return {
    activeStoryIndex: getStoryIndex(safeProgress),
    progress: safeProgress,
    progressBarScale: Math.max(0.04, safeProgress),
    backgroundX: `${safeProgress * 72}px`,
    backgroundY: `${safeProgress * 140}px`,
    messageProgress,
    conversationShift: `${messageProgress.reduce((total, itemProgress) => total + itemProgress, 0) * -10}px`,
  };
}

function ConversationPhonePreview({ timelineState, onContinue, canContinue }) {
  return (
    <div
      className="agape-phone-preview"
      style={{
        "--phone-progress": timelineState.progress,
        "--conversation-shift": timelineState.conversationShift,
      }}
    >
      <div className="agape-phone-shell">
        <div className="agape-phone-side agape-phone-side-left-one" />
        <div className="agape-phone-side agape-phone-side-left-two" />
        <div className="agape-phone-side agape-phone-side-right" />
        <div className="agape-phone-screen">
          <div className="agape-phone-notch">
            <span />
            <i />
          </div>
          <div className="agape-phone-dots" />
          <div className="agape-phone-topbar">
            <button type="button" className="agape-phone-close" aria-label="关闭预览">
              ×
            </button>
            <div className="agape-phone-score">+10 ☆</div>
          </div>

          <div className="agape-phone-question">
            <p className="agape-phone-category">动物电波</p>
            <div className="agape-phone-question-card">
              你可以和所有动物对话，【但是】其他人类从此听不懂你说话
            </div>
          </div>

          <div className="agape-phone-conversation">
            {phoneMessages.map((message, index) => (
              <div
                key={message.text}
                className={`agape-phone-message agape-phone-message--${message.side}`}
                style={{
                  "--message-progress": timelineState.messageProgress[index],
                }}
              >
                <span className="agape-phone-message-dot" />
                <div className="agape-phone-bubble">
                  <span>{message.author}</span>
                  {message.text}
                </div>
              </div>
            ))}
          </div>

          <div className="agape-phone-footer">
            <div className="agape-phone-input">
              <span>Keep it going...</span>
              <ArrowRight size={18} />
            </div>
            <button
              type="button"
              className="agape-phone-continue"
              onClick={onContinue}
              disabled={!canContinue}
              aria-label={canContinue ? "显示下一条对话" : "全部对话已显示"}
            >
              CONTINUE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing({ onStart }) {
  const howStoryRef = useRef(null);
  const storyProgress = useScrollProgress(howStoryRef);
  const timelineState = getTimelineState(storyProgress);
  const nextMessageIndex = getNextMessageIndex(storyProgress);

  const handlePhoneContinue = () => {
    const storyRail = howStoryRef.current;
    if (!storyRail || nextMessageIndex < 0) return;

    const railRect = storyRail.getBoundingClientRect();
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight || 1;
    const railTop = window.scrollY + railRect.top;
    const scrollableDistance = Math.max(railRect.height - viewportHeight, 0);
    const targetProgress = phoneMessages[nextMessageIndex].end;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.scrollTo({
      top: railTop + scrollableDistance * targetProgress,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <main className="landing-page main-wash relative isolate min-h-screen text-stone-900">
      <section className="landing-screen-section main-wash relative min-h-screen border-b border-white/70 px-5">
        <AgapeBackgroundLayer variant="hero" progress={0} />
        <nav className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between py-6">
          <button
            onClick={onStart}
            className="inline-flex items-center gap-3 text-left"
            aria-label="开始使用 Uslike"
          >
            <BrandMark size="md" />
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

        <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center pb-20 pt-8 lg:min-h-[calc(100vh-93px)] lg:pb-24">
          <div className="max-w-4xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/76 px-4 py-2 text-sm font-semibold text-[#5d6387] shadow-sm ring-1 ring-white/80 backdrop-blur">
              <Sparkles size={16} />
              用千奇百怪的问题开启更自然的第一场对话
            </p>
            <h1 className="max-w-3xl text-3xl font-semibold leading-[1.03] text-stone-900 sm:text-5xl lg:text-7xl">
              回答一个有趣的问题，遇见一群同频的人。
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
              Uslike 用个性匹配带来双向揭晓、
              同频房间和可解锁的互动，让你更快判断一个人和你聊不聊的来。
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
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/80 bg-white/70 px-8 py-4 text-base font-semibold text-stone-800 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:bg-white"
              >
                了解流程
              </a>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
              {[
                ["先答一题", "跳过尬聊"],
                ["双向揭晓", "看见同频"],
                ["继续互动", "慢慢熟悉"],
              ].map(([value, label]) => (
                <div key={value} className="rounded-[22px] border border-white/80 bg-white/68 p-4 shadow-sm backdrop-blur">
                  <p className="text-xl font-semibold text-stone-950 sm:text-2xl">{value}</p>
                  <p className="mt-1 text-sm text-stone-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="relative">
        <div
          ref={howStoryRef}
          className="landing-story-scroll"
          style={{
            "--story-screen-count": storySteps.length + 1,
            "--story-shape-x": timelineState.backgroundX,
            "--story-shape-y": timelineState.backgroundY,
          }}
        >
          <div className="landing-story-sticky">
            <div className="landing-story-background" aria-hidden="true">
              <div className="landing-story-background__glow landing-story-background__glow--left" />
              <div className="landing-story-background__glow landing-story-background__glow--right" />
              <div className="landing-story-background__wave landing-story-background__wave--back" />
              <div className="landing-story-background__wave landing-story-background__wave--front" />
              <div className="landing-story-background__dots" />
            </div>
            <AgapeBackgroundLayer variant="story" progress={storyProgress} />
            <div className="landing-story-progress">
              <div className="landing-story-progress__track">
                <div
                  className="landing-story-progress__bar"
                  style={{ transform: `scaleY(${timelineState.progressBarScale})` }}
                />
              </div>
              {storySteps.map((step, index) => (
                <span
                  key={step.id}
                  className={index <= timelineState.activeStoryIndex ? "is-active" : ""}
                  aria-hidden="true"
                />
              ))}
            </div>
            <div className="landing-story-inner mx-auto w-full max-w-6xl">
              <div className="landing-story-copy">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#3a8f83]">使用流程</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
                  用一个很小的仪式，打开合适的关系入口。
                </h2>
                <div className="landing-story-panels">
                  {storySteps.map((panel, index) => (
                    <article
                      key={panel.title}
                      className={`landing-story-panel ${index === timelineState.activeStoryIndex ? "is-active" : ""}`}
                    >
                      <p>{panel.eyebrow}</p>
                      <h3>{panel.title}</h3>
                      <span>{panel.text}</span>
                    </article>
                  ))}
                </div>
              </div>

              <div className="landing-story-phone">
                <ConversationPhonePreview
                  timelineState={timelineState}
                  onContinue={handlePhoneContinue}
                  canContinue={nextMessageIndex >= 0}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-screen-section landing-screen-section--center border-y border-white/70 bg-[linear-gradient(135deg,rgba(246,248,255,0.98),rgba(239,234,255,0.94))] px-5 py-20 sm:py-24">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#6b73ff]">关系流程</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
              三步，把好奇心接成关系。
            </h2>
            <p className="mt-5 text-lg leading-8 text-stone-600">
              从一个轻量问题开始，让两个人自然越过寒暄，再把舒服的对话推进到更深的互动。
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <article key={step.title} className="glass-panel rounded-[28px] p-6">
                <span className="aurora-dark grid h-12 w-12 place-items-center rounded-[18px] text-lg font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-8 text-2xl font-semibold text-stone-950">{step.title}</h3>
                <p className="mt-3 text-base leading-7 text-stone-600">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-screen-section landing-screen-section--center border-y border-white/70 bg-[linear-gradient(135deg,rgba(238,244,255,0.96),rgba(242,232,255,0.94))] px-5 py-20 sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#6b73ff]">为什么是 Uslike</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
              为想要更柔和相遇方式的人设计。
            </h2>
            <p className="mt-5 text-lg leading-8 text-stone-600">
              我们保留每日问题产品的清晰感，并把它延展到 Uslike 的社交流程里：
              发现、进房、互答、交友，以及逐步解锁更深互动。
            </p>
          </div>

          <div className="landing-benefits-grid grid gap-4 sm:grid-cols-2">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <article key={benefit.title} className="glass-panel rounded-[28px] p-6">
                  <span className="grid h-12 w-12 place-items-center rounded-[18px] bg-white/80 text-[#6b73ff]">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-6 text-xl font-semibold text-stone-900">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-stone-600">{benefit.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="landing-screen-section landing-screen-section--center px-5 py-20 sm:py-24">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#7a61ca]">用户反馈</p>
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
              <article key={testimonial.name} className="glass-panel rounded-[28px] p-6">
                <p className="text-lg leading-8 text-stone-700">"{testimonial.quote}"</p>
                <div className="mt-8 flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-[#e7ecff] font-bold text-[#6b73ff]">
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

      <section className="landing-screen-section landing-screen-section--center border-y border-white/70 bg-[linear-gradient(135deg,rgba(246,248,255,0.98),rgba(241,234,255,0.94))] px-5 py-20 sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#6877dd]">常见问题</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
              为任何想好好聊天的人打造
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq) => (
              <article key={faq.question} className="glass-panel rounded-[24px] p-6">
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

      <section className="landing-screen-section landing-screen-section--center px-5 py-20 sm:py-24">
        <div className="glass-panel mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-8 rounded-[32px] p-8 sm:p-10 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#6b73ff]">现在开始</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
              一个问题，就足够找到第一根对话线索。
            </h2>
          </div>
          <button
            onClick={onStart}
            className="aurora-dark inline-flex min-h-14 items-center justify-center gap-3 rounded-full px-8 py-4 text-base font-semibold text-white shadow-glow transition hover:-translate-y-1 hover:brightness-110"
          >
            申请体验
            <ArrowRight size={19} />
          </button>
        </div>
      </section>
    </main>
  );
}
