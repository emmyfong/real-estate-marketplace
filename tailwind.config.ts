import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Property Copilot brand: dark navy + light blue accents on white.
        brand: {
          navy: "#16233f",
          blue: "#2563eb",
          sky: "#38bdf8"
        }
      }
    }
  },
  plugins: []
};

export default config;
