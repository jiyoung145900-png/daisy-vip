import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 👈 수정: '/daisy-vip/' 대신 './' 로 변경 (상대 경로 설정)
  base: './', 
  server: {
    port: 5174,     
    strictPort: true 
  }
})