import { Sparkles } from "lucide-react";

const sizeClasses = {
  sm: {
    box: "h-8 w-8 rounded-[12px]",
    icon: 15,
  },
  md: {
    box: "h-11 w-11 rounded-[16px]",
    icon: 18,
  },
  lg: {
    box: "h-12 w-12 rounded-[18px]",
    icon: 20,
  },
};

export default function BrandMark({ size = "md", className = "" }) {
  const sizing = sizeClasses[size] || sizeClasses.md;

  return (
    <span
      className={`grid place-items-center border border-white/75 bg-white/62 text-[#6b73ff] shadow-[0_12px_34px_rgba(88,95,142,0.16)] backdrop-blur-xl ${sizing.box} ${className}`}
    >
      <Sparkles size={sizing.icon} strokeWidth={2.4} />
    </span>
  );
}
