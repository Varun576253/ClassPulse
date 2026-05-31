import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

const clientRoot = fileURLToPath(new URL('.', import.meta.url));
const distRoot = fileURLToPath(new URL('../dist', import.meta.url));

export default defineConfig({
  root: clientRoot,
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: distRoot,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
          react: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'axios']
        }
      }
    }
  }
});
