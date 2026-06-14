import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), // 🟢 回归最纯净、最轻量化的 React 原生构建，100% 杜绝加载冲突
  ],
  // ⚡ 核心重点：让打包后的资源路径变成相对路径，完美适配 GitHub Pages 的二级目录
  base: './',
})