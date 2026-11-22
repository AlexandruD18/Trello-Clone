import { defineConfig } from 'vitest/config';

// I test usano un database MySQL dedicato, svuotato all'inizio di ogni file.
// In locale: DB su 127.0.0.1:3307 (vedi docs/guida-avvio-progetto.md); in CI le variabili arrivano dal workflow.
export default defineConfig({
    test: {
        environment: 'node',
        fileParallelism: false,
        setupFiles: ['./test/setup.js'],
        testTimeout: 20000,
        hookTimeout: 60000,
        env: {
            NODE_ENV: 'test',
            JWT_SECRET:
                process.env.JWT_SECRET || 'segreto-solo-per-i-test-lungo-almeno-32-caratteri',
            DB_HOST: process.env.DB_HOST || '127.0.0.1',
            DB_PORT: process.env.DB_PORT || '3307',
            DB_NAME: process.env.DB_NAME || 'trello_test',
            DB_USER: process.env.DB_USER || 'trello',
            DB_PASSWORD: process.env.DB_PASSWORD || 'trello-locale',
        },
    },
});
