import { beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { sequelize } = require('../src/models');
const { umzug, conUnaConnessione } = require('../src/db/migrazioni');

beforeAll(async () => {
    if (!/test/.test(sequelize.getDatabaseName())) {
        throw new Error('I test vanno lanciati solo su un database il cui nome contiene "test".');
    }
    // Database vuoto e schema creato dalle migrazioni, come in produzione.
    await conUnaConnessione(async (q) => {
        const [tabelle] = await q('SHOW TABLES');
        for (const riga of tabelle) {
            await q(`DROP TABLE \`${Object.values(riga)[0]}\``);
        }
    });
    await umzug.up();
});

afterAll(async () => {
    await sequelize.close();
});
