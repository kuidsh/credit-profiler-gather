import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy para la llamada a Claude API en desarrollo.
    // El agente responsable de Step4/usePerfilador deberá
    // ajustar o eliminar este bloque si llama al API directo desde el browser.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
