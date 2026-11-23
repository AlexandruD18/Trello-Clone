import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import request from 'supertest';
import { api, registraUtente } from './helpers.js';

const require = createRequire(import.meta.url);
const { createApp } = require('../src/app');

const HASH_BCRYPT = /\$2[aby]\$\d{2}\$/;

describe('dati sensibili nelle risposte', () => {
    it('non espone gli hash delle password in workspace e board', async () => {
        const utente = await registraUtente('Fabio');
        const board = await api()
            .post('/api/boards')
            .set(utente.auth)
            .send({ name: 'Progetto', workspaceId: utente.workspace.id });
        expect(board.status).toBe(201);

        const workspace = await api().get('/api/workspaces').set(utente.auth);
        const dettaglio = await api().get(`/api/boards/${board.body.id}`).set(utente.auth);

        expect(JSON.stringify(workspace.body)).not.toMatch(HASH_BCRYPT);
        expect(JSON.stringify(dettaglio.body)).not.toMatch(HASH_BCRYPT);
        expect(JSON.stringify(dettaglio.body)).not.toContain('"password"');
    });
});

describe('validazione della registrazione', () => {
    const registra = (dati) => api().post('/api/auth/register').send(dati);

    it.each([
        ['email non valida', { email: 'non-una-mail', password: 'password-lunga', name: 'Gino' }],
        ['password corta', { email: 'gino@esempio.it', password: 'corta', name: 'Gino' }],
        ['nome vuoto', { email: 'gino@esempio.it', password: 'password-lunga', name: '   ' }],
        ['campi non testuali', { email: ['x'], password: 12345678, name: {} }],
        [
            'password oltre 72 byte',
            { email: 'gino@esempio.it', password: 'è'.repeat(40), name: 'Gino' },
        ],
    ])('rifiuta %s', async (_caso, dati) => {
        const res = await registra(dati);
        expect(res.status).toBe(400);
        expect(res.body.error).toBeTypeOf('string');
    });

    it("accetta l'email con maiuscole e spazi e la salva normalizzata", async () => {
        const res = await registra({
            email: '  Ilaria.Rossi@Esempio.IT ',
            password: 'password-lunga',
            name: 'Ilaria',
        });
        expect(res.status).toBe(201);
        expect(res.body.user.email).toBe('ilaria.rossi@esempio.it');

        const login = await api()
            .post('/api/auth/login')
            .send({ email: 'ILARIA.ROSSI@esempio.it', password: 'password-lunga' });
        expect(login.status).toBe(200);
    });
});

describe('protezioni HTTP', () => {
    it('blocca i tentativi di login ripetuti', async () => {
        const { app } = createApp({ authRateLimit: 2 });
        const tenta = () =>
            request(app)
                .post('/api/auth/login')
                .send({ email: 'x@esempio.it', password: 'sbagliata' });

        expect((await tenta()).status).toBe(401);
        expect((await tenta()).status).toBe(401);
        const terzo = await tenta();
        expect(terzo.status).toBe(429);
        expect(terzo.body.error).toBeTypeOf('string');
    });

    it('imposta le intestazioni di sicurezza', async () => {
        const res = await api().get('/api/health');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['content-security-policy']).toBeDefined();
        expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('risponde 400 a un JSON malformato', async () => {
        const res = await api()
            .post('/api/auth/login')
            .set('Content-Type', 'application/json')
            .send('{"email":');
        expect(res.status).toBe(400);
    });

    it('rifiuta un token firmato con un altro segreto', async () => {
        const jwt = require('jsonwebtoken');
        const falso = jwt.sign({ userId: 'chiunque' }, 'trello-clone-secret-key-2024');
        const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${falso}`);
        expect(res.status).toBe(401);
    });
});

describe('configurazione', () => {
    it.each([
        ['assente', ''],
        ['troppo corto', 'corto'],
    ])('non parte con JWT_SECRET %s', (_caso, valore) => {
        const esito = spawnSync(process.execPath, ['-e', "require('./src/config/env')"], {
            cwd: new URL('..', import.meta.url),
            env: { ...process.env, JWT_SECRET: valore },
            encoding: 'utf8',
        });
        expect(esito.status).not.toBe(0);
        expect(esito.stderr).toContain('JWT_SECRET');
    });
});
