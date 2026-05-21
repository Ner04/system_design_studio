import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#080a0f",
          900: "#0c1018",
          850: "#111622",
          800: "#151b29",
          700: "#202839",
          600: "#2d374c",
        },
        accent: {
          blue: "#5aa7ff",
          green: "#5fe0a6",
          amber: "#f4c768",
          rose: "#ff7a90",
        },
      },
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
        glow: "0 0 0 1px rgba(255,255,255,0.08), 0 24px 80px rgba(0,0,0,0.35)",
        panel: "0 18px 60px rgba(0,0,0,0.28)",
      },
    },
  },
  plugins: [],
} satisfies Config;
