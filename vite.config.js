import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'idonate-web.onrender.com',
      /\.ngrok-free\.app$/
    ],
  },
})
