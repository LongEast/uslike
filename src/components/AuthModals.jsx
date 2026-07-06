import { useState } from "react";
import Modal from "./Modal.jsx";

const baseInterests = ["书籍", "电影", "旅行", "音乐", "游戏", "美食"];

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
          className="w-full rounded-2xl bg-[#f06f52] px-5 py-3 font-semibold text-white shadow-glow transition hover:bg-[#e45f47]"
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
    interests: defaultUser.interests,
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
                    ? "bg-[#f06f52] text-white shadow-glow"
                    : "bg-white/72 text-stone-600 hover:bg-white"
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
          {baseInterests.map((interest) => (
            <button
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                profile.interests.includes(interest)
                  ? "bg-[#ffe0ce] text-[#bc5a42]"
                  : "bg-white/74 text-stone-600 hover:bg-white"
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
        <input
          value={profile.customInterest}
          onChange={(event) => setProfile({ ...profile, customInterest: event.target.value })}
          placeholder="自定义兴趣"
          className="warm-field mt-4 w-full rounded-2xl px-4 py-3"
        />
      </div>

      <button
        onClick={() => onSave(profile)}
        className="mt-6 w-full rounded-2xl bg-[#f06f52] px-5 py-3 font-semibold text-white shadow-glow transition hover:bg-[#e45f47]"
      >
        保存信息
      </button>
    </Modal>
  );
}
