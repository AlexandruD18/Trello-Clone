import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In sviluppo Vite inoltra API e Socket.IO al server: il browser vede una sola origine.
const API_TARGET = process.env.API_TARGET || 'http://localhost:3000';

export default defineConfig({
    plugins: [react()],
    root: '.',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
    server: {
        port: 5173,
        host: '0.0.0.0',
        proxy: {
            '/api': {
                target: API_TARGET,
                changeOrigin: true,
            },
            '/socket.io': {
                target: API_TARGET,
                ws: true,
            },
        },
    },
});
