import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const models = require('../src/models');
const { umzug } = require('../src/db/migrazioni');

const { sequelize } = models;

// Modelli Sequelize veri (non le funzioni esportate insieme).
const modelli = () => Object.values(sequelize.models);

describe('migrazioni', () => {
    it('non lasciano migrazioni in sospeso', async () => {
        expect(await umzug.pending()).toEqual([]);
    });

    it('creano ogni colonna dichiarata nei modelli, con lo stesso vincolo di null', async () => {
        const qi = sequelize.getQueryInterface();
        for (const modello of modelli()) {
            const tabella = await qi.describeTable(modello.getTableName());
            for (const attributo of Object.values(modello.getAttributes())) {
                const colonna = tabella[attributo.field];
                expect(colonna, `${modello.getTableName()}.${attributo.field}`).toBeDefined();
                const nullable = attributo.allowNull !== false && !attributo.primaryKey;
                expect(colonna.allowNull, `${modello.getTableName()}.${attributo.field}`).toBe(
                    nullable
                );
            }
        }
    });

    it('si annullano e si riapplicano senza errori', async () => {
        await umzug.down({ to: 0 });
        const [dopoDown] = await sequelize.query('SHOW TABLES');
        expect(dopoDown.map((r) => Object.values(r)[0])).toEqual(['migrazioni']);

        await umzug.up();
        expect(await umzug.pending()).toEqual([]);
    });
});
