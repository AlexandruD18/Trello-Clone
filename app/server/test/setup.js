import { beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { sequelize } = require('../src/models');
const { umzug, eseguiSenzaVincoli } = require('../src/db/migrazioni');

beforeAll(async () => {
    if (!/(^|_)test(_|$)/.test(sequelize.getDatabaseName())) {
        throw new Error(
            'I test vanno lanciati solo su un database il cui nome contiene "test" come parola (es. trello_test).'
        );
    }
    // Database vuoto e schema creato dalle migrazioni, come in produzione.
    const [tabelle] = await sequelize.query('SHOW TABLES');
    const drop = tabelle.map((riga) => `DROP TABLE \`${Object.values(riga)[0]}\`;`).join('\n');
    if (drop) await eseguiSenzaVincoli(drop);
    await umzug.up();
});

afterAll(async () => {
    await sequelize.close();
});
