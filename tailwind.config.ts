import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101828",
        paper: "#f7f7f4",
        lime: {
          50: "#f7fee7",
          100: "#ecfccb",
          300: "#bef264",
          400: "#a3e635",
          500: "#84cc16",
          900: "#365314"
        },
        cobalt: {
          50: "#eef4ff",
          100: "#d9e7ff",
          500: "#3158e7",
          600: "#2548c9",
          700: "#1f3ba3",
          950: "#12204f"
        }
      },
      boxShadow: {
        soft: "0 18px 50px -24px rgba(16, 24, 40, 0.24)",
        lift: "0 22px 60px -28px rgba(49, 88, 231, 0.35)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["SFMono-Regular", "Consolas", "Liberation Mono", "monospace"]
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(16,24,40,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(16,24,40,.045) 1px, transparent 1px)"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" }
        }
      },
      animation: {
        float: "float 6s ease-in-out infinite"
      }
    }
  },
  plugins: []
} satisfies Config;
