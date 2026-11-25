import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import { io as connetti } from 'socket.io-client';
import { api, registraUtente, PASSWORD, cookieSessione } from './helpers.js';

const require = createRequire(import.meta.url);
const { createApp } = require('../src/app');

describe('sessione nel cookie', () => {
    it('imposta un cookie httpOnly e SameSite=Lax, senza token nel corpo', async () => {
        const utente = await registraUtente('Anna');
        const res = await api()
            .post('/api/auth/login')
            .send({ email: utente.email, password: PASSWORD });

        expect(res.status).toBe(200);
        expect(res.body).not.toHaveProperty('token');
        const cookie = res.headers['set-cookie'].find((c) => c.startsWith('sessione='));
        expect(cookie).toMatch(/HttpOnly/);
        expect(cookie).toMatch(/SameSite=Lax/);
        expect(cookie).toMatch(/Path=\//);
    });

    it('in HTTP (sviluppo) il cookie non è Secure, altrimenti il browser lo scarterebbe', async () => {
        const utente = await registraUtente('Bea');
        const res = await api()
            .post('/api/auth/login')
            .send({ email: utente.email, password: PASSWORD });
        expect(res.headers['set-cookie'].join(';')).not.toMatch(/Secure/);
    });

    it("logout cancella il cookie e l'header Authorization non vale più", async () => {
        const utente = await registraUtente('Carlo');
        const esci = await api().post('/api/auth/logout').set(utente.auth);
        expect(esci.status).toBe(200);
        expect(esci.headers['set-cookie'][0]).toMatch(/sessione=;/);

        const bearer = await api()
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${utente.token.replace('sessione=', '')}`);
        expect(bearer.status).toBe(401);
    });

    it('esci da tutti i dispositivi invalida anche i cookie già emessi', async () => {
        const utente = await registraUtente('Dora');
        const altroDispositivo = cookieSessione(
            await api().post('/api/auth/login').send({ email: utente.email, password: PASSWORD })
        );
        expect((await api().get('/api/auth/me').set('Cookie', altroDispositivo)).status).toBe(200);

        expect((await api().post('/api/auth/logout-all').set(utente.auth)).status).toBe(200);

        expect((await api().get('/api/auth/me').set('Cookie', altroDispositivo)).status).toBe(401);
        expect((await api().get('/api/auth/me').set(utente.auth)).status).toBe(401);

        const nuovo = cookieSessione(
            await api().post('/api/auth/login').send({ email: utente.email, password: PASSWORD })
        );
        expect((await api().get('/api/auth/me').set('Cookie', nuovo)).status).toBe(200);
    });

    it('rifiuta le modifiche che partono da un altro sito (CSRF)', async () => {
        const utente = await registraUtente('Elio');
        const daFuori = await api()
            .post('/api/boards')
            .set(utente.auth)
            .set('Origin', 'https://sito-cattivo.example')
            .send({ name: 'Intrusa', workspaceId: utente.workspace.id });
        expect(daFuori.status).toBe(403);

        const host = await api().get('/api/health');
        expect(host.status).toBe(200);

        const stessoSito = await api()
            .post('/api/boards')
            .set(utente.auth)
            .set('Host', 'trello.example')
            .set('Origin', 'https://trello.example')
            .send({ name: 'Mia', workspaceId: utente.workspace.id });
        expect(stessoSito.status).toBe(201);
    });
});

describe('socket e origine', () => {
    const { server, io } = createApp();
    let url;

    beforeAll(async () => {
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        url = `http://127.0.0.1:${server.address().port}`;
    });

    afterAll(async () => {
        io.close();
        await new Promise((resolve) => server.close(resolve));
    });

    const apri = (cookie, origine) =>
        new Promise((resolve) => {
            const socket = connetti(url, {
                transports: ['websocket'],
                extraHeaders: { Cookie: cookie, ...(origine ? { Origin: origine } : {}) },
                forceNew: true,
                reconnection: false,
            });
            socket.once('connect', () => {
                socket.close();
                resolve(true);
            });
            socket.once('connect_error', () => {
                socket.close();
                resolve(false);
            });
        });

    it('accetta il cookie di sessione dal nostro sito', async () => {
        const utente = await registraUtente('Fede');
        expect(await apri(utente.token)).toBe(true);
    });

    it('rifiuta la connessione da una pagina di un altro sito', async () => {
        const utente = await registraUtente('Gaia');
        expect(await apri(utente.token, 'https://sito-cattivo.example')).toBe(false);
    });
});
