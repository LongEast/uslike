import { useState } from "react";
import { ArrowRight, Plus, SkipForward } from "lucide-react";
import Modal from "./Modal.jsx";

const baseInterests = ["书籍", "电影", "旅行", "音乐", "游戏", "美食"];
const normalizeInterest = (interest) => interest.trim();
const getInterestOptions = (interests) => Array.from(new Set([...baseInterests, ...interests]));
const onboardingQuestions = [
  { id: "onboarding-1", text: "你最近最常反复想起的一件小事是什么？" },
  { id: "onboarding-2", text: "认识新朋友时，什么样的相处方式会让你觉得舒服？" },
  { id: "onboarding-3", text: "你最喜欢和别人一起完成哪类事？" },
  { id: "onboarding-4", text: "什么时候你会觉得自己被理解了？" },
  { id: "onboarding-5", text: "你希望对方先了解你的哪个习惯或边界？" },
  { id: "onboarding-6", text: "如果给最近的生活选一个关键词，你会选什么？" },
  { id: "onboarding-7", text: "你更喜欢热闹的烟火气，还是安静的氛围？" },
  { id: "onboarding-8", text: "你最近在听、看、玩或研究什么？" },
  { id: "onboarding-9", text: "什么话题会让你愿意继续聊下去？" },
  { id: "onboarding-10", text: "你期待在 Uslike 遇见什么样的人？" },
];

export function RegisterModal({ onSuccess, onClose }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  return (
    <Modal title="注册 Uslike" onClose={onClose}>
      <div className="space-y-4">
        <label className="block text-sm font-medium text-stone-600">
          手机号
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="请输入手机号"
            className="warm-field mt-2 w-full rounded-2xl px-4 py-3"
          />
        </label>
        <label className="block text-sm font-medium text-stone-600">
          验证码
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="随便输入 4 位数字"
            className="warm-field mt-2 w-full rounded-2xl px-4 py-3"
          />
        </label>
        <button
          onClick={onSuccess}
          className="aurora-dark w-full rounded-2xl px-5 py-3 font-semibold text-white shadow-glow transition hover:brightness-110"
        >
          注册
        </button>
      </div>
    </Modal>
  );
}

export function ProfileModal({ defaultUser, onSave }) {
  const [profile, setProfile] = useState({
    nickname: defaultUser.nickname,
    age: "",
    gender: "神秘",
    region: defaultUser.region,
    interests: [...defaultUser.interests],
    customInterest: "",
  });

  const toggleInterest = (interest) => {
    setProfile((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest],
    }));
  };

  const addCustomInterest = () => {
    const customInterest = normalizeInterest(profile.customInterest);
    if (!customInterest) return;

    setProfile((current) => ({
      ...current,
      interests: current.interests.includes(customInterest)
        ? current.interests
        : [...current.interests, customInterest],
      customInterest: "",
    }));
  };

  const handleCustomInterestKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== "，" && event.key !== ",") return;

    event.preventDefault();
    addCustomInterest();
  };

  return (
    <Modal title="补充基础信息" width="max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-stone-600">
          昵称
          <input
            value={profile.nickname}
            onChange={(event) => setProfile({ ...profile, nickname: event.target.value })}
            className="warm-field mt-2 w-full rounded-2xl px-4 py-3"
          />
        </label>
        <label className="block text-sm font-medium text-stone-600">
          年龄（选填）
          <input
            value={profile.age}
            onChange={(event) => setProfile({ ...profile, age: event.target.value })}
            className="warm-field mt-2 w-full rounded-2xl px-4 py-3"
          />
        </label>
        <label className="block text-sm font-medium text-stone-600">
          地域（选填）
          <input
            value={profile.region}
            onChange={(event) => setProfile({ ...profile, region: event.target.value })}
            className="warm-field mt-2 w-full rounded-2xl px-4 py-3"
          />
        </label>
        <div className="text-sm font-medium text-stone-600">
          性别
          <div className="mt-2 grid grid-cols-3 gap-2">
            {["男", "女", "神秘"].map((gender) => (
              <button
                key={gender}
                onClick={() => setProfile({ ...profile, gender })}
                className={`rounded-2xl px-4 py-3 font-semibold transition ${
                  profile.gender === gender
                    ? "glass-choice-active"
                    : "glass-choice"
                }`}
              >
                {gender}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-3 text-sm font-medium text-stone-600">兴趣标签</p>
        <div className="flex flex-wrap gap-2">
          {getInterestOptions(profile.interests).map((interest) => (
            <button
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                profile.interests.includes(interest)
                  ? "glass-choice-active"
                  : "glass-choice"
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            value={profile.customInterest}
            onChange={(event) => setProfile({ ...profile, customInterest: event.target.value })}
            onKeyDown={handleCustomInterestKeyDown}
            onBlur={addCustomInterest}
            placeholder="自定义兴趣"
            className="warm-field min-w-0 flex-1 rounded-2xl px-4 py-3"
          />
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={addCustomInterest}
            className="aurora-dark flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl text-white shadow-glow transition hover:brightness-110"
            aria-label="添加自定义兴趣"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      <button
        onClick={() => onSave(profile)}
        className="aurora-dark mt-6 w-full rounded-2xl px-5 py-3 font-semibold text-white shadow-glow transition hover:brightness-110"
      >
        保存信息
      </button>
    </Modal>
  );
}

export function OnboardingQuestionsModal({ onSkip, onSave }) {
  const [answers, setAnswers] = useState(() =>
    onboardingQuestions.reduce((result, question) => ({ ...result, [question.id]: "" }), {}),
  );

  const answeredCount = Object.values(answers).filter((answer) => String(answer || "").trim()).length;

  const updateAnswer = (questionId, answer) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: answer,
    }));
  };

  const saveAnswers = () => {
    const normalizedAnswers = onboardingQuestions
      .map((question) => ({
        question: question.text,
        answer: String(answers[question.id] || "").trim(),
      }))
      .filter((item) => item.answer);

    onSave(normalizedAnswers);
  };

  return (
    <Modal title="让相遇更同频" width="max-w-3xl">
      <div className="space-y-5">
        <div className="rounded-2xl bg-white/72 p-4 text-stone-600 shadow-sm">
          <p className="text-base font-semibold text-stone-800">
            回答一些轻问题，可以帮助系统更好地把你带到相似的人身边。
          </p>
          <p className="mt-2 text-sm leading-6">
            这十题都不是必填，你可以只回答有感觉的部分，也可以先跳过直接进入 Uslike。
          </p>
        </div>

        <div className="max-h-[48vh] space-y-3 overflow-y-auto pr-1">
          {onboardingQuestions.map((question, index) => (
            <label
              key={question.id}
              className="block rounded-2xl bg-white/70 p-4 text-sm font-medium text-stone-700 shadow-sm"
            >
              <span className="mb-2 flex items-start gap-3">
                <span className="glass-choice-active flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                  {index + 1}
                </span>
                <span className="leading-7">{question.text}</span>
              </span>
              <textarea
                value={answers[question.id] || ""}
                onChange={(event) => updateAnswer(question.id, event.target.value)}
                rows={2}
                placeholder="想写多少都可以"
                className="warm-field mt-2 w-full resize-none rounded-2xl px-4 py-3 text-stone-700"
              />
            </label>
          ))}
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onSkip}
            className="flex items-center justify-center gap-2 rounded-2xl bg-white/78 px-5 py-3 font-semibold text-stone-600 transition hover:bg-white"
          >
            <SkipForward size={18} />
            跳过，直接进入
          </button>
          <button
            type="button"
            onClick={saveAnswers}
            className="aurora-dark flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold text-white shadow-glow transition hover:brightness-110"
          >
            保存{answeredCount ? ` ${answeredCount} 个回答` : ""}并进入
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
