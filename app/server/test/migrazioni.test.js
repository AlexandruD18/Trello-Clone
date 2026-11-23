import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import request from 'supertest';

const require = createRequire(import.meta.url);
const { sequelize } = require('../src/models');
const { umzug } = require('../src/db/migrazioni');
const { differenze } = require('../src/db/verifica');
const { createApp } = require('../src/app');

describe('migrazioni', () => {
    it('non lasciano migrazioni in sospeso', async () => {
        expect(await umzug.pending()).toEqual([]);
    });

    it('creano ogni colonna dichiarata nei modelli, con lo stesso vincolo di null', async () => {
        expect(await differenze()).toEqual([]);
    });

    it('si annullano e si riapplicano senza errori', async () => {
        await umzug.down({ to: 0 });
        const [dopoDown] = await sequelize.query('SHOW TABLES');
        expect(dopoDown.map((r) => Object.values(r)[0])).toEqual(['migrazioni']);

        await umzug.up();
        expect(await umzug.pending()).toEqual([]);
    });

    it('fuori dai test rifiutano di annullare lo schema iniziale', () => {
        const esito = spawnSync(process.execPath, ['src/db/migrazioni.js', 'down'], {
            cwd: new URL('..', import.meta.url),
            env: { ...process.env, NODE_ENV: 'production' },
            encoding: 'utf8',
        });
        expect(esito.status).toBe(1);
        expect(esito.stderr).toContain('non si annulla');
    });
});

describe('CORS', () => {
    it('di base non autorizza origini esterne', async () => {
        const res = await request(createApp({ corsOrigins: [] }).app)
            .options('/api/health')
            .set('Origin', 'https://altro-sito.example')
            .set('Access-Control-Request-Method', 'GET');
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('autorizza solo le origini dichiarate', async () => {
        const { app } = createApp({ corsOrigins: ['https://client.example'] });
        const ammessa = await request(app)
            .options('/api/health')
            .set('Origin', 'https://client.example')
            .set('Access-Control-Request-Method', 'GET');
        expect(ammessa.headers['access-control-allow-origin']).toBe('https://client.example');

        const altra = await request(app)
            .options('/api/health')
            .set('Origin', 'https://altro-sito.example')
            .set('Access-Control-Request-Method', 'GET');
        expect(altra.headers['access-control-allow-origin']).toBeUndefined();
    });
});
