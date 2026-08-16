import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { getRandomOnboardingQuestions } from "../data/mockData.js";
import { normalizePhone, validatePhone } from "../services/auth.js";
import Modal from "./Modal.jsx";

const baseInterests = ["书籍", "电影", "旅行", "音乐", "游戏", "美食"];
const baseSocialPreferences = ["认识朋友", "兴趣搭子", "认真恋爱", "随缘相遇"];
const normalizeInterest = (interest) => interest.trim();
const getInterestOptions = (interests) => Array.from(new Set([...baseInterests, ...interests]));
export function AuthModal({ onLogin, onRegisterStart, onClose }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!phone.trim()) {
      setError("请输入手机号。");
      return;
    }
    if (!validatePhone(phone)) {
      setError("手机号必须包含 6 到 20 位数字，并且只能在开头使用 +");
      return;
    }
    if (password.length < 8) {
      setError("密码至少需要 8 位。");
      return;
    }

    setSubmitting(true);
    try {
      await onLogin({ phone: normalizePhone(phone), password });
    } catch (requestError) {
      setError(requestError.message || "登录失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="登录 Uslike" onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium text-stone-600">
          手机号
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="请输入手机号"
            autoComplete="tel"
            className="warm-field mt-2 w-full rounded-2xl px-4 py-3"
          />
        </label>
        <label className="block text-sm font-medium text-stone-600">
          密码
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 8 位"
            autoComplete="current-password"
            className="warm-field mt-2 w-full rounded-2xl px-4 py-3"
          />
        </label>
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="aurora-dark w-full rounded-2xl px-5 py-3 font-semibold text-white shadow-glow transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? "登录中…" : "登录"}
        </button>
        <button
          type="button"
          onClick={onRegisterStart}
          className="mx-auto block text-sm font-medium text-stone-500 underline decoration-stone-400 underline-offset-4 transition hover:text-[#6966dd] hover:decoration-[#6966dd]"
        >
          还没有账号？点这里注册！
        </button>
      </form>
    </Modal>
  );
}

export function ProfileModal({ defaultUser, onSave, onSwitchToLogin }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState({
    nickname: defaultUser.nickname,
    age: "",
    gender: "神秘",
    region: defaultUser.region,
    interests: [...defaultUser.interests],
    socialPreferences: [...(defaultUser.socialPreferences || [])],
    customInterest: "",
    customSocialPreference: "",
  });
  const [account, setAccount] = useState({ phone: "", password: "" });

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

  const toggleSocialPreference = (preference) => {
    setProfile((current) => ({
      ...current,
      socialPreferences: current.socialPreferences.includes(preference)
        ? current.socialPreferences.filter((item) => item !== preference)
        : [...current.socialPreferences, preference],
    }));
  };

  const addCustomSocialPreference = () => {
    const customPreference = normalizeInterest(profile.customSocialPreference);
    if (!customPreference) return;
    setProfile((current) => ({
      ...current,
      socialPreferences: current.socialPreferences.includes(customPreference)
        ? current.socialPreferences
        : [...current.socialPreferences, customPreference],
      customSocialPreference: "",
    }));
  };

  const steps = [
    {
      key: "account",
      eyebrow: "第 1 步",
      title: "先创建你的登录账号",
      detail: "手机号和密码之后也可以在这里返回修改。",
    },
    {
      key: "nickname",
      eyebrow: "第 2 步",
      title: "你想怎么被称呼？",
      detail: "昵称之后还可以再改。",
    },
    {
      key: "age",
      eyebrow: "第 3 步",
      title: "年龄要不要填一下？",
      detail: "这是选填项，也可以直接下一步。",
    },
    {
      key: "region",
      eyebrow: "第 4 步",
      title: "你现在在哪个城市？",
      detail: "填一个你觉得舒服的地域范围就好。",
    },
    {
      key: "gender",
      eyebrow: "第 5 步",
      title: "选择一个展示方式",
      detail: "不想公开的话，选神秘就可以。",
    },
    {
      key: "interests",
      eyebrow: "第 6 步",
      title: "选几个你喜欢的兴趣",
      detail: "这会帮你遇到更同频的人。",
    },
    {
      key: "socialPreferences",
      eyebrow: "第 7 步",
      title: "你期待怎样的相遇？",
      detail: "可以多选，也可以写下自己的期待。",
    },
  ];
  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const saveProfile = async () => {
    const customInterest = normalizeInterest(profile.customInterest);
    const customPreference = normalizeInterest(profile.customSocialPreference);
    const interests = customInterest
      ? Array.from(new Set([...profile.interests, customInterest]))
      : profile.interests;
    const socialPreferences = customPreference
      ? Array.from(new Set([...profile.socialPreferences, customPreference]))
      : profile.socialPreferences;

    setSubmitting(true);
    setError("");
    try {
      await onSave({
        account: {
          phone: normalizePhone(account.phone),
          password: account.password,
        },
        profile: {
          ...profile,
          interests,
          socialPreferences,
          customInterest: "",
          customSocialPreference: "",
        },
      });
    } catch (requestError) {
      if (requestError.status === 409) setStepIndex(0);
      setError(requestError.message || "注册失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = () => {
    setError("");
    if (currentStep.key === "account") {
      if (!account.phone.trim()) {
        setError("请输入手机号。");
        return;
      }
      if (!validatePhone(account.phone)) {
        setError("手机号必须包含 6 到 20 位数字，并且只能在开头使用 +");
        return;
      }
      if (account.password.length < 8) {
        setError("密码至少需要 8 位。");
        return;
      }
    }
    if (currentStep.key === "nickname" && !profile.nickname.trim()) return;
    if (isLastStep) {
      saveProfile();
      return;
    }

    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const renderStep = () => {
    if (currentStep.key === "account") {
      return (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-stone-600">
            手机号
            <input
              value={account.phone}
              onChange={(event) => {
                setAccount({ ...account, phone: event.target.value });
                setError("");
              }}
              placeholder="请输入手机号"
              autoComplete="tel"
              className="warm-field mt-3 w-full rounded-2xl px-4 py-3"
              autoFocus
            />
          </label>
          <label className="block text-sm font-medium text-stone-600">
            密码
            <input
              type="password"
              value={account.password}
              onChange={(event) => {
                setAccount({ ...account, password: event.target.value });
                setError("");
              }}
              placeholder="至少 8 位"
              autoComplete="new-password"
              className="warm-field mt-3 w-full rounded-2xl px-4 py-3"
            />
          </label>
        </div>
      );
    }

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
            type="number"
            min="1"
            max="120"
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

    if (currentStep.key === "socialPreferences") {
      const options = Array.from(new Set([...baseSocialPreferences, ...profile.socialPreferences]));
      return (
        <div>
          <p className="mb-3 text-sm font-medium text-stone-600">社交偏好（可多选）</p>
          <div className="flex flex-wrap gap-2">
            {options.map((preference) => (
              <button
                key={preference}
                type="button"
                onClick={() => toggleSocialPreference(preference)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  profile.socialPreferences.includes(preference)
                    ? "glass-choice-active"
                    : "glass-choice"
                }`}
              >
                {preference}
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              value={profile.customSocialPreference}
              onChange={(event) => setProfile({ ...profile, customSocialPreference: event.target.value })}
              onKeyDown={(event) => {
                if (!["Enter", "，", ","].includes(event.key)) return;
                event.preventDefault();
                addCustomSocialPreference();
              }}
              onBlur={addCustomSocialPreference}
              placeholder="自定义期待"
              className="warm-field min-w-0 flex-1 rounded-2xl px-4 py-3"
            />
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={addCustomSocialPreference}
              className="aurora-dark flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl text-white shadow-glow transition hover:brightness-110"
              aria-label="添加自定义社交偏好"
            >
              <Plus size={22} />
            </button>
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
    <Modal
      title="完成注册"
      width="max-w-xl"
      headerAction={(
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-sm font-medium text-stone-500 underline decoration-stone-400 underline-offset-4 transition hover:text-[#6966dd] hover:decoration-[#6966dd]"
        >
          已经有账号了？点这里登录！
        </button>
      )}
    >
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
            onClick={() => {
              setError("");
              setStepIndex((current) => Math.max(current - 1, 0));
            }}
            disabled={stepIndex === 0}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/60 px-5 py-3 font-semibold text-stone-600 transition hover:bg-white/80 disabled:pointer-events-none disabled:opacity-0"
          >
            <ArrowLeft size={18} />
            上一步
          </button>
          {error ? <p className="flex-1 text-center text-sm font-medium text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={goNext}
            disabled={submitting || (currentStep.key === "nickname" && !profile.nickname.trim())}
            className="aurora-dark inline-flex min-w-[136px] items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold text-white shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting ? "注册中…" : isLastStep ? "注册并继续" : "下一步"}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function OnboardingQuestionsModal({ onSkip, onSave, mode = "registration", onClose }) {
  const onboardingQuestions = useMemo(() => getRandomOnboardingQuestions(10), []);
  const [answers, setAnswers] = useState(() =>
    onboardingQuestions.reduce((result, question) => ({ ...result, [question.id]: "" }), {}),
  );
  const [customOptionDrafts, setCustomOptionDrafts] = useState({});
  const [customOptions, setCustomOptions] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  const submitAnswers = async (includeAnswers) => {
    const normalizedAnswers = onboardingQuestions
      .map((question) => ({
        questionId: question.id,
        question: question.text,
        answer: String(answers[question.id] || "").trim(),
      }))
      .filter((item) => item.answer);

    const questionnaire = {
      presentedQuestionIds: onboardingQuestions.map((question) => question.id),
      answers: includeAnswers ? normalizedAnswers : [],
    };
    setSubmitting(true);
    setError("");
    try {
      await (includeAnswers ? onSave(questionnaire) : onSkip(questionnaire));
    } catch (requestError) {
      setError(requestError.message || "注册失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={mode === "settings" ? "重新填写价值观问卷" : "可选：让相遇更同频"}
      onClose={mode === "settings" ? onClose : undefined}
      width="max-w-3xl"
    >
      <div className="space-y-5">
        <div className="rounded-2xl bg-white/72 p-4 text-stone-600 shadow-sm">
          <p className="text-base font-semibold text-stone-800">
            {mode === "settings"
              ? "重新回答一些轻问题，可以继续帮助系统优化你的相遇匹配。"
              : "账号已经创建成功。回答一些轻问题，可以帮助系统更好地把你带到相似的人身边。"}
          </p>
          <p className="mt-2 text-sm leading-6">
            {mode === "settings"
              ? "保存后会覆盖上一次答案；直接关闭不会修改已经保存的问卷。"
              : "这十题都不是必填，你可以只回答有感觉的部分，也可以先跳过直接进入 Uslike。"}
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
          {error ? <p className="mr-auto self-center text-sm font-medium text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={() => submitAnswers(Boolean(answeredCount))}
            disabled={submitting}
            className="aurora-dark flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold text-white shadow-glow transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting
              ? "正在保存问卷…"
              : answeredCount
                ? mode === "settings" ? `保存 ${answeredCount} 个回答` : `保存 ${answeredCount} 个回答并进入`
                : mode === "settings" ? "稍后再填" : "跳过，直接进入"}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
