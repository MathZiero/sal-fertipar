import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Apenas variáveis públicas chegam ao navegador. A chave de serviço (SECRET_KEY) NUNCA deve ser exposta.
  envPrefix: ['VITE_', 'PUBLISHABLE_', 'SUPABASE_'],
  server: {
    proxy: {
      '/api/cnpj-proxy': {
        target: 'https://publica.cnpj.ws/cnpj',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cnpj-proxy/, ''),
      },
    },
  },
})
