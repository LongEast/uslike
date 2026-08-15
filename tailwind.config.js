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
        soft: "0 20px 70px rgba(88, 95, 142, 0.16)",
        glow: "0 0 36px rgba(126, 133, 255, 0.42)",
      },
      animation: {
        floaty: "floaty 7s ease-in-out infinite",
        bob: "bob 3.6s ease-in-out infinite",
        pop: "pop 240ms cubic-bezier(.2,.9,.2,1.15)",
        pulseSoft: "pulseSoft 2.4s ease-in-out infinite",
        driftLeft: "driftLeft 60s linear forwards",
        driftRight: "driftRight 60s linear forwards",
        storyScene: "storyScene 8s ease-out both",
        storyWord: "storyWord 240ms ease-out forwards",
        storyCursor: "storyCursor 800ms ease-in-out infinite",
        storyChat: "storyChat 240ms ease-out both",
        storyTyping: "storyTyping 1s ease-in-out infinite",
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
        storyScene: {
          "0%": { transform: "scale(1.045)" },
          "100%": { transform: "scale(1)" },
        },
        storyWord: {
          "0%": { opacity: "0", filter: "blur(4px)", transform: "translateY(2px)" },
          "100%": { opacity: "1", filter: "blur(0)", transform: "translateY(0)" },
        },
        storyCursor: {
          "0%, 100%": { opacity: ".25" },
          "50%": { opacity: "1" },
        },
        storyChat: {
          "0%": { opacity: "0", transform: "translateY(12px) scale(.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        storyTyping: {
          "0%, 60%, 100%": { opacity: ".35", transform: "translateY(0)" },
          "30%": { opacity: "1", transform: "translateY(-3px)" },
        },
      },
    },
  },
  plugins: [],
};
