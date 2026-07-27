/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        pitch: {
          950: "#070c0a",
          900: "#0b1310",
          800: "#111c17",
          700: "#1a2921",
          600: "#25392e",
          500: "#3a5445",
        },
        brand: {
          300: "#7ee2a8",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
        },
        gold: {
          400: "#f0d68a",
          500: "#d9b45f",
          600: "#bd8f3a",
          700: "#8f6a26",
        },
        pulse: {
          green: "#4ade80",
          red: "#ef5a5a",
          blue: "#4f8ff7",
          amber: "#f5b942",
        },
      },
      fontFamily: {
        display: ["Oswald", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "gold-card": "linear-gradient(160deg, #f0d68a 0%, #d9b45f 38%, #8f6a26 100%)",
        "silver-card": "linear-gradient(160deg, #eef1f4 0%, #c4cbd3 38%, #7c8892 100%)",
        "bronze-card": "linear-gradient(160deg, #e4b17f 0%, #b97a45 38%, #7a4c26 100%)",
        "brand-gradient": "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
        "hero-fade": "linear-gradient(180deg, rgba(7,12,10,0) 0%, #070c0a 92%)",
      },
      boxShadow: {
        card: "0 10px 30px -10px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(217,180,95,0.35), 0 8px 24px -6px rgba(217,180,95,0.25)",
        brandGlow: "0 0 0 1px rgba(74,222,128,0.35), 0 8px 24px -6px rgba(34,197,94,0.35)",
      },
    },
  },
  plugins: [],
};
