import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace"],
      },
      // Paleta preservada do report.html original
      colors: {
        ink: {
          950: "#07070b",
          900: "#0b0b13",
          800: "#11111c",
          700: "#181826",
          600: "#22223a",
        },
        accent: {
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
        },
        neon: {
          400: "#22d3ee",
          500: "#06b6d4",
        },
        lime: {
          400: "#a3e635",
          500: "#84cc16",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(139,92,246,.25), 0 8px 40px -10px rgba(139,92,246,.45)",
        card: "0 1px 0 0 rgba(255,255,255,.04) inset, 0 30px 80px -30px rgba(0,0,0,.6)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
}

export default config
