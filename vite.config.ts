import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/middle-math/',
  plugins: [react()],
  server: {
    host: true,
  },
})
