import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5173, // Puoi lasciare questa o mettere 8181 se vuoi rispecchiare le specifiche
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // <--- MODIFICATO: da 5000 a 3000
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3000', // <--- MODIFICATO: da 5000 a 3000
        ws: true
      }
    }
  }
});