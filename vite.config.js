import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom', // 必須設定為 jsdom 以模擬瀏覽器
    setupFiles: './src/tests/setup.js',
  },
});
