import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
  server: {
    port: 8081,
  },
  // バンドル最適化設定
  build: {
    // チャンクサイズ警告の閾値
    chunkSizeWarningLimit: 1000,
  },
});
