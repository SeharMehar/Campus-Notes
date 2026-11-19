import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        seagreen: {
          DEFAULT: '#14b8a6', // Main Sea-Green
          hover: '#0f766e',   // Darker Sea-Green for hover
          light: '#ccfbf1',   // Light Sea-Green accent/bg
        }
      },
    },
  },
  plugins: [],
};
export default config;