import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// /api と /assets はバックエンド(FastAPI:8000)へプロキシする。
// これによりフロントは同一オリジン感覚でAPIとアセットへアクセスできる。
export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/assets': 'http://127.0.0.1:8000',
    },
  },
})
