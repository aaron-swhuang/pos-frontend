/** @type {import('tailwindcss').Config} */
export default {
  // 雖然 v4 在 CSS 裡設定，但保留此檔案以確保 Vite 掃描路徑正確
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}