import { useContext } from "react";
import { SocialContext } from "./socialContext.js";

const sizes = {
  xs: "h-8 w-8",
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-20 w-20",
  xl: "h-28 w-28",
};

export default function ProfileAvatarButton({
  user,
  userId = user?.userId ?? user?.user_id ?? user?.id,
  name = user?.nickname ?? user?.name ?? "用户",
  src = user?.avatar,
  size = "md",
  glow = false,
  onOpenProfile,
  className = "",
}) {
  const social = useContext(SocialContext);
  const openProfile = onOpenProfile ?? social?.openProfile;
  const unavailable = !userId || !openProfile;

  return (
    <button
      type="button"
      disabled={unavailable}
      onClick={(event) => openProfile?.(userId, event.currentTarget)}
      aria-label={unavailable ? `${name} 的头像` : `查看 ${name} 的主页`}
      className={`${sizes[size] ?? sizes.md} group relative shrink-0 overflow-hidden rounded-full border-2 border-white bg-[#f1edff] shadow-soft transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7770d8] focus-visible:ring-offset-2 disabled:cursor-default ${
        glow ? "shadow-glow" : ""
      } ${className}`}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true" className="grid h-full w-full place-items-center font-semibold text-[#6b5ee7]">
          {String(name).trim().slice(0, 1) || "?"}
        </span>
      )}
    </button>
  );
}

