import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px rgba(23, 37, 84, 0.07)",
        lift: "0 18px 48px rgba(27, 47, 93, 0.12)",
      },
      colors: {
        ink: { 950: "#10182c", 900: "#17213a", 800: "#253451", 700: "#3c4c68", 600: "#62718b" },
        accent: { 50: "#eef4ff", 100: "#dce8ff", 500: "#5278f5", 600: "#3e64e8", 700: "#3150c7" },
      },
    },
  },
  plugins: [],
};
export default config;
