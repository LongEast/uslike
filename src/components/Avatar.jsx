export default function Avatar({ src, name, size = "md", glow = false }) {
  const sizes = {
    sm: "h-10 w-10",
    md: "h-12 w-12",
    lg: "h-20 w-20",
    xl: "h-28 w-28",
  };

  return (
    <div
      className={`${sizes[size]} shrink-0 overflow-hidden rounded-full border-2 border-white bg-rose-100 shadow-soft ${glow ? "shadow-glow" : ""}`}
      title={name}
    >
      <img src={src} alt={name} className="h-full w-full object-cover" />
    </div>
  );
}
