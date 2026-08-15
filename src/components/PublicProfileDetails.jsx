export function normalizePublicProfile(profile = {}) {
  const statusRegion = typeof profile.status === "string"
    ? profile.status.split("·")[0]?.trim()
    : "";

  return {
    id: profile.id || profile.authorId || profile.userId || profile.nickname || profile.user || profile.hostName,
    nickname: profile.nickname || profile.user || profile.hostName || "未命名用户",
    avatar: profile.avatar || profile.hostAvatar || "",
    age: profile.age ?? null,
    gender: profile.gender || "神秘",
    region: profile.region || statusRegion || "未填写",
    interests: profile.interests || profile.tags || [],
    vibe: profile.vibe || profile.bio || profile.status || "这个人还没有填写个人简介。",
  };
}

export default function PublicProfileDetails({ profile, className = "", bare = false }) {
  const normalized = normalizePublicProfile(profile);

  return (
    <section className={`${bare ? "" : "rounded-[24px] bg-white/70 p-4"} ${className}`}>
      <p className="mb-3 text-xs font-semibold text-[#6b5ee7]">TA 的个人信息</p>
      <div className="grid grid-cols-2 gap-3 text-xs text-stone-500">
        <span>
          <strong className="block truncate text-sm text-stone-800">{normalized.nickname}</strong>
          昵称
        </span>
        <span>
          <strong className="block text-sm text-stone-800">
            {normalized.age ? `${normalized.age} 岁` : "未填写"}
          </strong>
          年龄
        </span>
        <span>
          <strong className="block text-sm text-stone-800">{normalized.gender}</strong>
          性别
        </span>
        <span>
          <strong className="block truncate text-sm text-stone-800">{normalized.region}</strong>
          地域
        </span>
      </div>
      {normalized.interests.length ? (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="兴趣标签">
          {normalized.interests.map((interest) => (
            <span
              key={interest}
              className="rounded-full bg-[#f4f6ff] px-3 py-1.5 text-xs font-semibold text-stone-600"
            >
              {interest}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
