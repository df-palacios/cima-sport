import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Aprendido en Cabra de León: vite.config.js corre en Node antes de que Vite
// exponga el .env al navegador, así que hay que pedirlo con loadEnv() para
// que VITE_BASE del .env realmente se aplique al compilar.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE || '/',
    server: { port: 5175, strictPort: true, host: true },
    preview: { port: 5175, strictPort: true, host: true },
    plugins: [react()],
  }
})
