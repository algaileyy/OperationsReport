import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#fcfcfb",
          page: "#f9f9f7",
          dark: "#1a1a19",
          "dark-page": "#0d0d0d",
        },
        ink: {
          primary: "#0b0b0b",
          "primary-dark": "#ffffff",
          secondary: "#52514e",
          "secondary-dark": "#c3c2b7",
          muted: "#898781",
        },
        line: {
          DEFAULT: "#e1e0d9",
          dark: "#2c2c2a",
        },
        accent: {
          blue: { DEFAULT: "#2a78d6", dark: "#3987e5" },
          orange: { DEFAULT: "#eb6834", dark: "#d95926" },
          aqua: { DEFAULT: "#1baf7a", dark: "#199e70" },
          violet: { DEFAULT: "#4a3aa7", dark: "#9085e9" },
        },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
