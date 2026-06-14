/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // 💡 精准锁死你的三大 Tab 组件扫描范围
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}