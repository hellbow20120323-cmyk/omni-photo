/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sea: {
          50: "#f0f5fa",
          100: "#dce6f0",
          200: "#b8c9db",
          300: "#8fa8c2",
          400: "#6a87a8",
          500: "#4d6d8f",
          600: "#3a5776",
          700: "#2c4460",
          800: "#1e334c",
          900: "#132338",
          950: "#0a1628",
        },
        morandi: {
          100: "#e6e9ed",
          200: "#cfd5dd",
          300: "#b3bcc8",
          400: "#939eac",
          500: "#768391",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        glass: "0 8px 40px -12px rgba(10, 22, 40, 0.38)",
        "glass-sm": "0 4px 24px -8px rgba(10, 22, 40, 0.28)",
      },
    },
  },
  plugins: [],
};
