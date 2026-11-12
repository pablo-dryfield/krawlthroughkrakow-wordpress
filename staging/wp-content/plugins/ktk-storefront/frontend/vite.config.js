import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiOrigin = env.KTK_DEV_API_ORIGIN || 'https://omni-lodge.com';
  const apiPath = env.KTK_DEV_API_PATH || '/api/storefront';

  return {
    base: './',
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/ktk-api': {
          target: apiOrigin,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/ktk-api/, apiPath),
        },
      },
    },
    build: {
      outDir: resolve(import.meta.dirname, '../assets'),
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(import.meta.dirname, 'src/main.jsx'),
        output: {
          entryFileNames: 'storefront.js',
          chunkFileNames: 'storefront-[hash].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.names?.some((name) => name.endsWith('.css'))) return 'storefront.css';
            if (assetInfo.names?.some((name) => name.endsWith('.woff2'))) {
              return 'storefront-[name][extname]';
            }
            return 'storefront-[hash][extname]';
          },
        },
      },
    },
  };
});
