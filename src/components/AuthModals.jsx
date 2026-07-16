import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { getRandomOnboardingQuestions } from "../data/mockData.js";
import Modal from "./Modal.jsx";

const baseInterests = ["书籍", "电影", "旅行", "音乐", "游戏", "美食"];
const normalizeInterest = (interest) => interest.trim();
const getInterestOptions = (interests) => Array.from(new Set([...baseInterests, ...interests]));
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
  const [stepIndex, setStepIndex] = useState(0);
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

  const steps = [
    {
      key: "nickname",
      eyebrow: "第 1 步",
      title: "你想怎么被称呼？",
      detail: "昵称之后还可以再改。",
    },
    {
      key: "age",
      eyebrow: "第 2 步",
      title: "年龄要不要填一下？",
      detail: "这是选填项，也可以直接下一步。",
    },
    {
      key: "region",
      eyebrow: "第 3 步",
      title: "你现在在哪个城市？",
      detail: "填一个你觉得舒服的地域范围就好。",
    },
    {
      key: "gender",
      eyebrow: "第 4 步",
      title: "选择一个展示方式",
      detail: "不想公开的话，选神秘就可以。",
    },
    {
      key: "interests",
      eyebrow: "第 5 步",
      title: "选几个你喜欢的兴趣",
      detail: "这会帮你遇到更同频的人。",
    },
  ];
  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const saveProfile = () => {
    const customInterest = normalizeInterest(profile.customInterest);
    const interests = customInterest
      ? Array.from(new Set([...profile.interests, customInterest]))
      : profile.interests;

    onSave({
      ...profile,
      interests,
      customInterest: "",
    });
  };

  const goNext = () => {
    if (isLastStep) {
      saveProfile();
      return;
    }

    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const renderStep = () => {
    if (currentStep.key === "nickname") {
      return (
        <label className="block text-sm font-medium text-stone-600">
          昵称
          <input
            value={profile.nickname}
            onChange={(event) => setProfile({ ...profile, nickname: event.target.value })}
            className="warm-field mt-3 w-full rounded-2xl px-4 py-3"
            autoFocus
          />
        </label>
      );
    }

    if (currentStep.key === "age") {
      return (
        <label className="block text-sm font-medium text-stone-600">
          年龄（选填）
          <input
            value={profile.age}
            onChange={(event) => setProfile({ ...profile, age: event.target.value })}
            inputMode="numeric"
            className="warm-field mt-3 w-full rounded-2xl px-4 py-3"
            autoFocus
          />
        </label>
      );
    }

    if (currentStep.key === "region") {
      return (
        <label className="block text-sm font-medium text-stone-600">
          地域（选填）
          <input
            value={profile.region}
            onChange={(event) => setProfile({ ...profile, region: event.target.value })}
            className="warm-field mt-3 w-full rounded-2xl px-4 py-3"
            autoFocus
          />
        </label>
      );
    }

    if (currentStep.key === "gender") {
      return (
        <div className="text-sm font-medium text-stone-600">
          性别
          <div className="mt-3 grid grid-cols-3 gap-3">
            {["男", "女", "神秘"].map((gender) => (
              <button
                key={gender}
                type="button"
                onClick={() => setProfile({ ...profile, gender })}
                className={`rounded-full px-4 py-3 font-semibold transition ${
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
      );
    }

    return (
      <div>
        <p className="mb-3 text-sm font-medium text-stone-600">兴趣标签</p>
        <div className="flex flex-wrap gap-2">
          {getInterestOptions(profile.interests).map((interest) => (
            <button
              key={interest}
              type="button"
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
    );
  };

  return (
    <Modal title="补充基础信息" width="max-w-xl">
      <div className="space-y-6">
        <div>
          <div className="mb-3 flex items-center justify-between text-xs font-semibold text-stone-500">
            <span>{currentStep.eyebrow}</span>
            <span>{stepIndex + 1}/{steps.length}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/55">
            <div
              className="h-full rounded-full bg-[#7a73e8] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="min-h-[230px]">
          <p className="text-2xl font-semibold text-stone-900">{currentStep.title}</p>
          <p className="mt-2 text-sm leading-6 text-stone-500">{currentStep.detail}</p>
          <div className="mt-7">{renderStep()}</div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
            disabled={stepIndex === 0}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/60 px-5 py-3 font-semibold text-stone-600 transition hover:bg-white/80 disabled:pointer-events-none disabled:opacity-0"
          >
            <ArrowLeft size={18} />
            上一步
          </button>
          <button
            type="button"
            onClick={goNext}
            className="aurora-dark inline-flex min-w-[136px] items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold text-white shadow-glow transition hover:brightness-110"
          >
            {isLastStep ? "保存信息" : "下一步"}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function OnboardingQuestionsModal({ onSkip, onSave }) {
  const onboardingQuestions = useMemo(() => getRandomOnboardingQuestions(10), []);
  const [answers, setAnswers] = useState(() =>
    onboardingQuestions.reduce((result, question) => ({ ...result, [question.id]: "" }), {}),
  );
  const [customOptionDrafts, setCustomOptionDrafts] = useState({});
  const [customOptions, setCustomOptions] = useState({});

  const answeredCount = Object.values(answers).filter((answer) => String(answer || "").trim()).length;

  const updateAnswer = (questionId, answer) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: answer,
    }));
  };

  const toggleOptionAnswer = (questionId, option) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: current[questionId] === option ? "" : option,
    }));
  };

  const addCustomOption = (questionId) => {
    const option = normalizeInterest(customOptionDrafts[questionId] || "");
    if (!option) return;

    setCustomOptions((current) => {
      const existingOptions = current[questionId] || [];
      if (existingOptions.includes(option)) return current;
      return {
        ...current,
        [questionId]: [...existingOptions, option],
      };
    });
    setCustomOptionDrafts((current) => ({ ...current, [questionId]: "" }));
    updateAnswer(questionId, option);
  };

  const handleCustomOptionKeyDown = (event, questionId) => {
    if (event.key !== "Enter" && event.key !== "，" && event.key !== ",") return;

    event.preventDefault();
    addCustomOption(questionId);
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
            <div
              key={question.id}
              className="block rounded-2xl bg-white/70 p-4 text-sm font-medium text-stone-700 shadow-sm"
            >
              <span className="mb-2 flex items-start gap-3">
                <span className="glass-choice-active flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                  {index + 1}
                </span>
                <span className="leading-7">{question.text}</span>
              </span>
              {question.options ? (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {[...question.options, ...(customOptions[question.id] || [])].map((option) => (
                      <button
                        key={option}
                        type="button"
                      onClick={() => toggleOptionAnswer(question.id, option)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          answers[question.id] === option
                            ? "glass-choice-active"
                            : "glass-choice"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={customOptionDrafts[question.id] || ""}
                      onChange={(event) =>
                        setCustomOptionDrafts((current) => ({
                          ...current,
                          [question.id]: event.target.value,
                        }))
                      }
                      onKeyDown={(event) => handleCustomOptionKeyDown(event, question.id)}
                      placeholder="自定义选项"
                      className="warm-field min-w-0 flex-1 rounded-2xl px-4 py-3"
                    />
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => addCustomOption(question.id)}
                      className="aurora-dark flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl text-white shadow-glow transition hover:brightness-110"
                      aria-label="添加自定义选项"
                    >
                      <Plus size={22} />
                    </button>
                  </div>
                </div>
              ) : (
                <textarea
                  value={answers[question.id] || ""}
                  onChange={(event) => updateAnswer(question.id, event.target.value)}
                  rows={2}
                  placeholder="想写多少都可以"
                  className="warm-field mt-2 w-full resize-none rounded-2xl px-4 py-3 text-stone-700"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={answeredCount ? saveAnswers : onSkip}
            className="aurora-dark flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold text-white shadow-glow transition hover:brightness-110"
          >
            {answeredCount ? `保存 ${answeredCount} 个回答并进入` : "跳过，直接进入"}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
