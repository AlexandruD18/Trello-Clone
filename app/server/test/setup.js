import { beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { sequelize } = require('../src/models');

beforeAll(async () => {
    if (!/test/.test(sequelize.getDatabaseName())) {
        throw new Error('I test vanno lanciati solo su un database il cui nome contiene "test".');
    }
    await sequelize.sync({ force: true });
});

afterAll(async () => {
    await sequelize.close();
});
