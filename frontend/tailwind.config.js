/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#dde5ff',
          200: '#c3cfff',
          300: '#9eb3ff',
          400: '#7490ff',
          500: '#1a3c8f',
          600: '#1a3480',
          700: '#152a66',
          800: '#112255',
          900: '#0d1a44',
        },
      },
    },
  },
  plugins: [],
}
