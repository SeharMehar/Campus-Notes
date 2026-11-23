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
          DEFAULT: '#14b8a6', 
          hover: '#0f766e',   
          light: '#ccfbf1',   
        }
      },
    },
  },
  plugins: [],
};
export default config;