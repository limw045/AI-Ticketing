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
          bg: "#09090b",
          panel: "rgba(24, 24, 27, 0.75)",
          border: "rgba(255, 255, 255, 0.12)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
