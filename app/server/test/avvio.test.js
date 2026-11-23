import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { io as connetti } from 'socket.io-client';
import request from 'supertest';
import { PASSWORD } from './helpers.js';

const portaLibera = () =>
    new Promise((resolve) => {
        const srv = createServer();
        srv.listen(0, '127.0.0.1', () => {
            const { port } = srv.address();
            srv.close(() => resolve(port));
        });
    });

const avviaServer = (env) =>
    spawn(process.execPath, ['src/index.js'], {
        cwd: new URL('..', import.meta.url),
        env: { ...process.env, ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
    });

const attendiUscita = (figlio, ms) =>
    new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), ms);
        figlio.on('exit', (codice) => {
            clearTimeout(timer);
            resolve(codice);
        });
    });

describe('avvio e chiusura del server', () => {
    it('si ferma con un messaggio se il database non risponde', async () => {
        const porta = await portaLibera();
        const figlio = avviaServer({ DB_PORT: String(porta) });
        let errori = '';
        figlio.stderr.on('data', (d) => (errori += d));

        expect(await attendiUscita(figlio, 15000)).toBe(1);
        expect(errori).toContain('Database non raggiungibile');
    });

    // Su Windows SIGTERM chiude il processo senza passare dai gestori: si prova in CI.
    it.skipIf(process.platform === 'win32')(
        'si chiude su SIGTERM anche con un socket collegato',
        async () => {
            const porta = await portaLibera();
            const figlio = avviaServer({ PORT: String(porta), HOST: '127.0.0.1' });
            const url = `http://127.0.0.1:${porta}`;

            for (let i = 0; i < 50; i += 1) {
                const pronto = await request(url)
                    .get('/api/health')
                    .then((r) => r.status === 200)
                    .catch(() => false);
                if (pronto) break;
                await new Promise((r) => setTimeout(r, 200));
            }

            const registrazione = await request(url)
                .post('/api/auth/register')
                .send({
                    email: `chiusura.${Date.now()}@esempio.it`,
                    password: PASSWORD,
                    name: 'C',
                });
            const socket = connetti(url, {
                auth: { token: registrazione.body.token },
                transports: ['websocket'],
            });
            await new Promise((resolve, reject) => {
                socket.once('connect', resolve);
                socket.once('connect_error', reject);
            });

            figlio.kill('SIGTERM');
            expect(await attendiUscita(figlio, 4000)).toBe(0);
            socket.close();
        }
    );
});
