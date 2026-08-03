import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardList,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  getAccount,
  resetAccountAvatar,
  updateAccountPassword,
  updateAccountPhone,
  updateAccountProfile,
  uploadAccountAvatar,
  validatePhone,
} from "../services/auth.js";
import { selectAccountSection } from "../utils/accountScroll.js";
import Avatar from "./Avatar.jsx";
import Modal from "./Modal.jsx";

const interestOptions = ["书籍", "电影", "旅行", "音乐", "游戏", "美食"];
const socialOptions = ["认识朋友", "兴趣搭子", "认真恋爱", "随缘相遇"];
const accountSections = [
  { id: "account-info", label: "账号信息", icon: UserRound },
  { id: "profile", label: "个人资料", icon: ClipboardList },
  { id: "password-security", label: "密码与安全", icon: KeyRound },
  { id: "values-test", label: "价值观问卷", icon: ShieldCheck },
];

const formatDate = (value) => {
  if (!value) return "暂无";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const maskPhone = (phone) => {
  if (!phone) return "未填写";
  if (phone.length <= 7) return `${phone.slice(0, 2)}***${phone.slice(-2)}`;
  return `${phone.slice(0, 3)}${"*".repeat(Math.min(8, phone.length - 7))}${phone.slice(-4)}`;
};

function SettingRow({
  label,
  value,
  detail,
  actionLabel = "编辑",
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  readOnly = false,
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-stone-100/90 px-5 py-5 last:border-b-0 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-stone-500">{label}</p>
        <p className="mt-1 break-words text-base font-semibold text-stone-800">{value || "未填写"}</p>
        {detail ? <p className="mt-1 text-xs leading-5 text-stone-400">{detail}</p> : null}
      </div>
      {!readOnly ? (
        <div className="flex shrink-0 gap-2">
          {secondaryActionLabel ? (
            <button type="button" onClick={onSecondaryAction} className="rounded-2xl px-3 py-2.5 text-sm font-semibold text-[#6b5ee7] transition hover:bg-white/72">
              {secondaryActionLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onAction}
            className="rounded-2xl bg-[#eeeaff] px-4 py-2.5 text-sm font-semibold text-[#6b5ee7] transition hover:bg-white"
          >
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TagEditor({ values, options, onChange, placeholder }) {
  const [custom, setCustom] = useState("");
  const available = Array.from(new Set([...options, ...values]));
  const toggle = (value) => onChange(
    values.includes(value) ? values.filter((item) => item !== value) : [...values, value],
  );
  const add = () => {
    const value = custom.trim();
    if (!value) return;
    if (!values.includes(value)) onChange([...values, value]);
    setCustom("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {available.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => toggle(value)}
            className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
              values.includes(value) ? "glass-choice-active" : "glass-choice"
            }`}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== "," && event.key !== "，") return;
            event.preventDefault();
            add();
          }}
          placeholder={placeholder}
          className="warm-field min-w-0 flex-1 rounded-2xl px-4 py-3"
        />
        <button type="button" onClick={add} className="aurora-dark rounded-2xl px-4 font-semibold text-white">
          添加
        </button>
      </div>
    </div>
  );
}

export default function AccountSettingsView({
  user,
  accessToken,
  questionnaireRevision,
  onBack,
  onUserUpdated,
  onOpenQuestionnaire,
  onToast,
}) {
  const [activeSection, setActiveSection] = useState(accountSections[0].id);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const avatarInputRef = useRef(null);
  const contentScrollRef = useRef(null);
  const sectionRefs = useRef({});
  const scrollFrameRef = useRef(0);

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  const applyAccount = (response) => {
    setAccount(response);
    onUserUpdated(response.user);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAccount(accessToken)
      .then((response) => {
        if (active) applyAccount(response);
      })
      .catch((error) => {
        if (active) setPageError(error.message || "账号资料加载失败。 ");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken, questionnaireRevision]);

  const apiUser = account?.user;
  const profile = apiUser?.profile;
  const displayUser = profile
    ? { ...user, nickname: profile.nickname, avatar: avatarPreview || user.avatar }
    : user;

  const scrollToSection = (sectionId) => {
    const target = sectionRefs.current[sectionId];
    const scrollContainer = contentScrollRef.current;
    if (!target || !scrollContainer) return;
    setActiveSection(sectionId);
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const containerTop = scrollContainer.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    scrollContainer.scrollTo({
      top: Math.max(0, scrollContainer.scrollTop + targetTop - containerTop - 16),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  useEffect(() => {
    if (loading || !account) return undefined;

    const scrollContainer = contentScrollRef.current;
    if (!scrollContainer) return undefined;

    const updateActiveSection = () => {
      window.cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = window.requestAnimationFrame(() => {
        const containerRect = scrollContainer.getBoundingClientRect();
        const pageBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 4;
        const observationLine = containerRect.top + Math.min(120, scrollContainer.clientHeight * 0.24);
        const sectionTops = {};
        accountSections.forEach(({ id }) => {
          const element = sectionRefs.current[id];
          if (element) sectionTops[id] = element.getBoundingClientRect().top;
        });
        setActiveSection(selectAccountSection(
          accountSections.map(({ id }) => id),
          sectionTops,
          observationLine,
          pageBottom,
        ));
      });
    };

    updateActiveSection();
    scrollContainer.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      window.cancelAnimationFrame(scrollFrameRef.current);
      scrollContainer.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [account, loading]);

  const openEditor = (field) => {
    const initial = {
      nickname: profile?.nickname || "",
      phone: { value: apiUser?.phone || "", password: "" },
      age: profile?.age ?? "",
      gender: profile?.gender || "神秘",
      region: profile?.region || "",
      interests: [...(profile?.interests || [])],
      social_preferences: [...(profile?.social_preferences || [])],
    }[field];
    setEditing(field);
    setDraft(initial);
    setEditError("");
  };

  const saveEditor = async () => {
    setEditError("");
    if (editing === "nickname" && !String(draft).trim()) {
      setEditError("昵称不能为空。");
      return;
    }
    if (editing === "phone") {
      if (!validatePhone(draft.value)) {
        setEditError("手机号必须包含 6 到 20 位数字，并且只能在开头使用 +");
        return;
      }
      if (draft.password.length < 8) {
        setEditError("请输入当前密码。");
        return;
      }
    }

    setSubmitting(true);
    try {
      let response;
      if (editing === "phone") {
        response = await updateAccountPhone(accessToken, draft.value, draft.password);
      } else {
        const value = editing === "age"
          ? draft === "" ? null : Number(draft)
          : editing === "region"
            ? String(draft).trim() || null
            : editing === "nickname"
              ? String(draft).trim()
              : draft;
        response = await updateAccountProfile(accessToken, { [editing]: value });
      }
      applyAccount(response);
      setEditing(null);
      onToast("账号资料已更新。");
    } catch (error) {
      setEditError(error.message || "保存失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  };

  const uploadAvatar = async (file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      onToast("头像仅支持 JPEG、PNG 或 WebP。");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      onToast("头像文件不能超过 2 MB。");
      return;
    }
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarBusy(true);
    try {
      applyAccount(await uploadAccountAvatar(accessToken, file));
      onToast("头像已更新。");
    } catch (error) {
      onToast(error.message || "头像上传失败。");
    } finally {
      setAvatarBusy(false);
      setAvatarPreview("");
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const resetAvatar = async () => {
    setAvatarBusy(true);
    try {
      applyAccount(await resetAccountAvatar(accessToken));
      onToast("已恢复默认头像。");
    } catch (error) {
      onToast(error.message || "头像重置失败。");
    } finally {
      setAvatarBusy(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setPasswordError("");
    if (passwords.current.length < 8 || passwords.next.length < 8) {
      setPasswordError("当前密码和新密码都至少需要 8 位。");
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordError("两次输入的新密码不一致。");
      return;
    }
    if (passwords.current === passwords.next) {
      setPasswordError("新密码不能与当前密码相同。");
      return;
    }
    setSubmitting(true);
    try {
      applyAccount(await updateAccountPassword(accessToken, passwords.current, passwords.next));
      setPasswords({ current: "", next: "", confirm: "" });
      onToast("密码已更新，其他设备已退出登录。");
    } catch (error) {
      setPasswordError(error.message || "密码修改失败。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto flex h-[100dvh] w-full max-w-7xl flex-col overflow-hidden pb-28 pt-20">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-white/72 px-4 py-3 font-semibold text-stone-600 shadow-sm backdrop-blur-xl transition hover:bg-white"
      >
        <ArrowLeft size={18} />
        返回个人中心
      </button>

      <div className="z-20 mb-5 shrink-0 rounded-[24px] border border-white/[0.76] bg-white/[0.9] p-3 shadow-soft backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => scrollToSection(accountSections[0].id)}
          className="mb-2 inline-flex items-center gap-2 px-2 text-sm font-bold text-stone-800"
        >
          <UserRound size={17} /> Account
        </button>
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Account 页面分区">
          {accountSections.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollToSection(id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeSection === id ? "glass-choice-active" : "bg-white/58 text-stone-500"
              }`}
              aria-current={activeSection === id ? "location" : undefined}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="glass-panel hidden h-full overflow-y-auto overscroll-contain rounded-[32px] p-4 lg:block">
          <div className="flex items-center gap-3 p-3">
            <Avatar src={displayUser.avatar} name={displayUser.nickname} size="lg" glow />
            <div className="min-w-0">
              <p className="truncate text-xl font-semibold text-stone-900">{displayUser.nickname}</p>
              <p className="mt-1 truncate text-xs text-stone-400">{displayUser.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => scrollToSection(accountSections[0].id)}
            className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-white/72 px-4 py-3 text-left text-lg font-bold text-stone-900 shadow-sm"
          >
            <UserRound size={20} className="text-[#6b5ee7]" /> Account
          </button>
          <nav className="relative ml-5 mt-2 flex flex-col border-l-2 border-[#d8dcff]/80 py-1" aria-label="Account 页面分区">
            {accountSections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollToSection(id)}
                className={`relative ml-2 inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold transition ${
                  activeSection === id ? "bg-[#eeeaff] text-[#5f57d9]" : "text-stone-400 hover:bg-white/64 hover:text-stone-700"
                }`}
                aria-current={activeSection === id ? "location" : undefined}
              >
                {activeSection === id ? <span className="absolute -left-[11px] h-8 w-1 rounded-full bg-[#6b5ee7]" /> : null}
                <Icon size={19} /> {label}
              </button>
            ))}
          </nav>
        </aside>

        <div
          ref={contentScrollRef}
          className="min-h-0 min-w-0 overflow-y-auto overscroll-contain scroll-smooth pr-1"
        >
          {loading ? (
            <div className="glass-panel rounded-[32px] p-10 text-center text-stone-500">正在加载账号资料…</div>
          ) : pageError ? (
            <div className="glass-panel rounded-[32px] p-8 text-red-600">{pageError}</div>
          ) : null}

          {!loading && account ? (
            <div className="space-y-16 pb-8">
            <section
              id="account-info"
              ref={(node) => { sectionRefs.current["account-info"] = node; }}
              className="space-y-5"
            >
              <div>
                <h1 className="text-3xl font-semibold text-stone-900">账号信息</h1>
                <p className="mt-2 text-stone-500">管理登录方式和公开身份。</p>
              </div>
              <div className="glass-panel flex flex-col gap-5 rounded-[32px] p-5 sm:flex-row sm:items-center">
                <Avatar src={displayUser.avatar} name={displayUser.nickname} size="xl" glow />
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-semibold text-stone-900">个人头像</h2>
                  <p className="mt-1 text-sm text-stone-500">支持 JPEG、PNG、WebP，最大 2 MB。</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={avatarBusy}
                      onClick={() => avatarInputRef.current?.click()}
                      className="aurora-dark inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 font-semibold text-white disabled:opacity-50"
                    >
                      <Camera size={17} /> {avatarBusy ? "处理中…" : "上传头像"}
                    </button>
                    <button
                      type="button"
                      disabled={avatarBusy}
                      onClick={resetAvatar}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white/72 px-4 py-2.5 font-semibold text-stone-500 disabled:opacity-50"
                    >
                      <RefreshCw size={17} /> 恢复默认
                    </button>
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => uploadAvatar(event.target.files?.[0])}
                  />
                </div>
              </div>
              <div className="overflow-hidden rounded-[28px] border border-white/[0.76] bg-white/[0.78] shadow-sm backdrop-blur-xl">
                <SettingRow label="用户名" value={profile.nickname} onAction={() => openEditor("nickname")} />
                <SettingRow
                  label="手机号"
                  value={phoneRevealed ? apiUser.phone : maskPhone(apiUser.phone)}
                  secondaryActionLabel={phoneRevealed ? "隐藏" : "显示"}
                  onSecondaryAction={() => setPhoneRevealed((value) => !value)}
                  onAction={() => openEditor("phone")}
                />
                <SettingRow label="Uslike ID" value={apiUser.id} detail="账号永久标识，修改手机号不会改变它。" readOnly />
                <SettingRow label="实名认证" value={apiUser.real_name_verified ? "已实名" : "未实名"} readOnly />
                <SettingRow label="注册时间" value={formatDate(apiUser.created_at)} readOnly />
                <SettingRow label="最后登录" value={formatDate(apiUser.last_login_at)} readOnly />
              </div>
            </section>

            <section
              id="profile"
              ref={(node) => { sectionRefs.current.profile = node; }}
              className="space-y-5 border-t border-white/[0.76] pt-12"
            >
              <div><h1 className="text-3xl font-semibold text-stone-900">个人资料</h1><p className="mt-2 text-stone-500">这些信息会帮助你遇见更同频的人。</p></div>
              <div className="overflow-hidden rounded-[28px] border border-white/[0.76] bg-white/[0.78] shadow-sm backdrop-blur-xl">
                <SettingRow label="年龄" value={profile.age ? `${profile.age} 岁` : "未填写"} onAction={() => openEditor("age")} />
                <SettingRow label="性别" value={profile.gender || "未填写"} onAction={() => openEditor("gender")} />
                <SettingRow label="地域" value={profile.region || "未填写"} onAction={() => openEditor("region")} />
                <SettingRow label="兴趣标签" value={profile.interests.join("、") || "未填写"} onAction={() => openEditor("interests")} />
                <SettingRow label="社交偏好" value={profile.social_preferences.join("、") || "未填写"} onAction={() => openEditor("social_preferences")} />
              </div>
            </section>

            <section
              id="password-security"
              ref={(node) => { sectionRefs.current["password-security"] = node; }}
              className="space-y-5 border-t border-white/[0.76] pt-12"
            >
              <div><h1 className="text-3xl font-semibold text-stone-900">密码与安全</h1><p className="mt-2 text-stone-500">修改后，其他设备会自动退出登录。</p></div>
              <form onSubmit={savePassword} className="glass-panel space-y-4 rounded-[32px] p-6">
                {[["current", "当前密码"], ["next", "新密码"], ["confirm", "确认新密码"]].map(([key, label]) => (
                  <label key={key} className="block text-sm font-semibold text-stone-600">
                    {label}
                    <input type="password" value={passwords[key]} onChange={(event) => setPasswords({ ...passwords, [key]: event.target.value })} className="warm-field mt-2 w-full rounded-2xl px-4 py-3" />
                  </label>
                ))}
                {passwordError ? <p className="text-sm font-medium text-red-600">{passwordError}</p> : null}
                <button disabled={submitting} className="aurora-dark rounded-2xl px-5 py-3 font-semibold text-white disabled:opacity-50">
                  {submitting ? "正在保存…" : "修改密码"}
                </button>
              </form>
            </section>

            <section
              id="values-test"
              ref={(node) => { sectionRefs.current["values-test"] = node; }}
              className="space-y-5 border-t border-white/[0.76] pt-12"
            >
              <div><h1 className="text-3xl font-semibold text-stone-900">价值观问卷</h1><p className="mt-2 text-stone-500">问卷结果只用于匹配优化，不会公开展示评分。</p></div>
              <div className="glass-panel rounded-[32px] p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#dcf8ee] text-[#26866f]"><CheckCircle2 size={28} /></span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold text-stone-900">{account.values_test.completed_at ? "已填写问卷" : "尚未填写问卷"}</h2>
                    <p className="mt-2 text-sm leading-6 text-stone-500">
                      已保存 {account.values_test.answered_count} 个回答
                      {account.values_test.completed_at ? ` · ${formatDate(account.values_test.completed_at)}` : ""}
                    </p>
                  </div>
                  <button type="button" onClick={onOpenQuestionnaire} className="aurora-dark rounded-2xl px-5 py-3 font-semibold text-white">
                    {account.values_test.completed_at ? "重新填写" : "现在填写"}
                  </button>
                </div>
              </div>
            </section>
            </div>
          ) : null}
        </div>
      </div>

      {editing ? (
        <Modal title={`编辑${{
          nickname: "用户名", phone: "手机号", age: "年龄", gender: "性别", region: "地域", interests: "兴趣标签", social_preferences: "社交偏好",
        }[editing]}`} onClose={() => !submitting && setEditing(null)} width="max-w-lg">
          <div className="space-y-4">
            {editing === "nickname" ? <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={50} className="warm-field w-full rounded-2xl px-4 py-3" autoFocus /> : null}
            {editing === "phone" ? <><input value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} placeholder="新手机号" className="warm-field w-full rounded-2xl px-4 py-3" autoFocus /><input type="password" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} placeholder="当前密码" className="warm-field w-full rounded-2xl px-4 py-3" /></> : null}
            {editing === "age" ? <input type="number" min="1" max="120" value={draft} onChange={(event) => setDraft(event.target.value)} className="warm-field w-full rounded-2xl px-4 py-3" autoFocus /> : null}
            {editing === "gender" ? <div className="grid grid-cols-3 gap-2">{["男", "女", "神秘"].map((value) => <button key={value} type="button" onClick={() => setDraft(value)} className={`rounded-2xl px-4 py-3 font-semibold ${draft === value ? "glass-choice-active" : "glass-choice"}`}>{value}</button>)}</div> : null}
            {editing === "region" ? <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={100} placeholder="可留空" className="warm-field w-full rounded-2xl px-4 py-3" autoFocus /> : null}
            {editing === "interests" ? <TagEditor values={draft} options={interestOptions} onChange={setDraft} placeholder="添加自定义兴趣" /> : null}
            {editing === "social_preferences" ? <TagEditor values={draft} options={socialOptions} onChange={setDraft} placeholder="添加自定义期待" /> : null}
            {editError ? <p className="text-sm font-medium text-red-600">{editError}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" disabled={submitting} onClick={() => setEditing(null)} className="rounded-2xl bg-white/72 px-5 py-3 font-semibold text-stone-500">取消</button>
              <button type="button" disabled={submitting} onClick={saveEditor} className="aurora-dark rounded-2xl px-5 py-3 font-semibold text-white disabled:opacity-50">{submitting ? "保存中…" : "保存"}</button>
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
