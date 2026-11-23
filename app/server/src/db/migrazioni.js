const fs = require('fs');
const path = require('path');
const { Umzug, SequelizeStorage } = require('umzug');
const sequelize = require('../config/database');

const CARTELLA = path.resolve(__dirname, '../../migrations');

// Divide un file SQL in istruzioni singole (mysql2 non ne accetta più di una per query).
const istruzioni = (sql) =>
    sql
        .split(/;\s*(?:\r?\n|$)/)
        .map((riga) =>
            riga
                .split('\n')
                .filter((l) => !l.trim().startsWith('--'))
                .join('\n')
                .trim()
        )
        .filter(Boolean);

// SET FOREIGN_KEY_CHECKS vale per una sola connessione: la transazione tiene
// tutte le istruzioni sulla stessa connessione del pool. In MySQL il DDL fa commit
// da solo, quindi la transazione serve solo a questo, non ad annullare.
const conUnaConnessione = (lavoro) =>
    sequelize.transaction(async (transaction) => {
        const q = (sql) => sequelize.query(sql, { transaction });
        await q('SET FOREIGN_KEY_CHECKS = 0');
        try {
            await lavoro(q);
        } finally {
            await q('SET FOREIGN_KEY_CHECKS = 1');
        }
    });

const eseguiSql = async (file) => {
    const sql = fs.readFileSync(path.join(CARTELLA, file), 'utf8');
    await conUnaConnessione(async (q) => {
        for (const istruzione of istruzioni(sql)) {
            await q(istruzione);
        }
    });
};

// Ogni migrazione è una coppia di file NNNN-nome.up.sql / NNNN-nome.down.sql.
const umzug = new Umzug({
    migrations: {
        glob: ['*.up.sql', { cwd: CARTELLA }],
        resolve: ({ name }) => {
            const base = name.replace(/\.up\.sql$/, '');
            return {
                name: base,
                up: () => eseguiSql(`${base}.up.sql`),
                down: () => eseguiSql(`${base}.down.sql`),
            };
        },
    },
    storage: new SequelizeStorage({ sequelize, tableName: 'migrazioni' }),
    logger: process.env.NODE_ENV === 'test' ? undefined : console,
});

module.exports = { umzug, conUnaConnessione };

// Uso da riga di comando: node src/db/migrazioni.js up|down|pending
if (require.main === module) {
    const comando = process.argv[2] || 'up';
    const azioni = {
        up: () => umzug.up(),
        down: () => umzug.down(),
        pending: async () => console.log((await umzug.pending()).map((m) => m.name)),
    };
    if (!azioni[comando]) {
        console.error(`Comando sconosciuto: ${comando}. Usa up, down o pending.`);
        process.exit(1);
    }
    azioni[comando]()
        .then(() => sequelize.close())
        .catch(async (error) => {
            console.error('Migrazione non riuscita:', error.message);
            await sequelize.close();
            process.exit(1);
        });
}
