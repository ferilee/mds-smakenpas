import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f3f9ed",
          100: "#e2f0d2",
          200: "#c6e0a8",
          300: "#9ecc75",
          400: "#77b44d",
          500: "#5a9634",
          600: "#447626",
          700: "#355b21",
          800: "#2c491f",
          900: "#263d1d",
        },
      },
    },
  },
  plugins: [],
};

export default config;
