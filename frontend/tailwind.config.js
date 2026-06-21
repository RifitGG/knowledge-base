/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EEF3FB",
          100: "#E7EEFF",
          200: "#D7E0EE",
          500: "#2959B8",
          600: "#1C408C",
          700: "#17305E",
          800: "#14213D",
        },
        ink: {
          900: "#14213D",
          700: "#334155",
          500: "#64748B",
          400: "#94A3B8",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F7F9FD",
          app: "#F4F7FC",
          line: "#D7E0EE",
        },
        accent: {
          violet: "#6C5CE7",
          violetBg: "#ECE8FF",
          green: "#1E9E74",
          greenBg: "#D9F6EC",
          amber: "#8A5A00",
          amberBg: "#FFF2D6",
          red: "#F0445C",
          redBg: "#FFE3E8",
          orange: "#F4B53F",
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(20, 33, 61, 0.04), 0 2px 8px -2px rgba(20, 33, 61, 0.06)",
        soft: "0 8px 24px -12px rgba(20, 33, 61, 0.18)",
      },
      borderRadius: {
        "2xl": "18px",
        "3xl": "24px",
      },
    },
  },
  plugins: [],
};
