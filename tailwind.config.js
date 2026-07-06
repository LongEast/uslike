/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 20px 70px rgba(96, 65, 43, 0.16)",
        glow: "0 0 36px rgba(244, 169, 128, 0.48)",
      },
      animation: {
        floaty: "floaty 7s ease-in-out infinite",
        bob: "bob 3.6s ease-in-out infinite",
        pop: "pop 240ms cubic-bezier(.2,.9,.2,1.15)",
        pulseSoft: "pulseSoft 2.4s ease-in-out infinite",
        driftLeft: "driftLeft 60s linear forwards",
        driftRight: "driftRight 60s linear forwards",
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -14px, 0)" },
        },
        bob: {
          "0%, 100%": { transform: "translateY(0) rotate(-1deg)" },
          "50%": { transform: "translateY(-8px) rotate(1deg)" },
        },
        pop: {
          "0%": { transform: "translateY(10px) scale(.96)", opacity: "0" },
          "100%": { transform: "translateY(0) scale(1)", opacity: "1" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: ".55", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.08)" },
        },
        driftLeft: {
          "0%": { left: "6%" },
          "100%": { left: "48%" },
        },
        driftRight: {
          "0%": { right: "6%" },
          "100%": { right: "48%" },
        },
      },
    },
  },
  plugins: [],
};
