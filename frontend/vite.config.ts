import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// /api と /assets はバックエンド(FastAPI:8011)へプロキシする。
// これによりフロントは同一オリジン感覚でAPIとアセットへアクセスできる。
export default defineConfig({
  plugins: [svelte()],
  build: {
    assetsDir: 'app-assets',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8011',
      '/assets': 'http://127.0.0.1:8011',
    },
  },
})
