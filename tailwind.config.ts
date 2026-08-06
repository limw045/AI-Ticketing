import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mac: {
          bg: "#f8fafc",
          panel: "rgba(255, 255, 255, 0.85)",
          border: "rgba(226, 232, 240, 0.8)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
