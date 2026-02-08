/** @type {import('tailwindcss').Config} */
const primary = "#fccb21";
const primaryDark = "#0b8380";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{scss,css}",
  ],
  darkMode: "class",
  theme: {
    container: {
      center: true,
      padding: "2rem",
    },
    extend: {
      colors: {
        primary,
        "primary-dark": primaryDark,
        "primary-foreground": "#ffffff",
        border: "#e2e8f0",
        muted: "#94a3b8",
        background: "#f8fafc",
        card: "#ffffff",
        panel: "#f1f5f9",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 20px 45px rgba(15, 23, 42, 0.08)",
      },
      transitionTimingFunction: {
        "in-out-expo": "cubic-bezier(0.85, 0, 0.15, 1)",
      },
    },
  },
  plugins: [],
};
