const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { Umzug, SequelizeStorage } = require('umzug');
const sequelize = require('../config/database');

const CARTELLA = path.resolve(__dirname, '../../migrations');
const NOME_LOCK = 'trello_clone_migrazioni';

// Le migrazioni girano su una connessione dedicata, separata dal pool:
// - multipleStatements: il file SQL va al server così com'è, senza dividerlo a mano;
// - SET FOREIGN_KEY_CHECKS vale per tutta la connessione e quindi per tutto il file.
const apriConnessione = () => {
    const { host, port, username, password, database } = sequelize.config;
    return mysql.createConnection({
        host,
        port,
        user: username,
        password,
        database,
        multipleStatements: true,
        charset: 'utf8mb4',
    });
};

const conConnessione = async (lavoro) => {
    const connessione = await apriConnessione();
    try {
        return await lavoro(connessione);
    } finally {
        await connessione.end();
    }
};

// Esegue SQL con i controlli sulle chiavi esterne spenti (servono per creare o
// eliminare tabelle in qualsiasi ordine) e li riaccende anche in caso di errore.
const eseguiSenzaVincoli = (sql) =>
    conConnessione(async (connessione) => {
        await connessione.query('SET FOREIGN_KEY_CHECKS = 0');
        try {
            await connessione.query(sql);
        } finally {
            await connessione.query('SET FOREIGN_KEY_CHECKS = 1');
        }
    });

const leggi = (file) => fs.readFileSync(path.join(CARTELLA, file), 'utf8');

// Le migrazioni che partono da dati veri non si annullano in produzione:
// annullare la 0001 vorrebbe dire cancellare tutte le tabelle.
const IRREVERSIBILI = new Set(['0001-schema-iniziale']);
const annullamentoConsentito = (nome) =>
    !IRREVERSIBILI.has(nome) ||
    process.env.NODE_ENV === 'test' ||
    process.env.CONFERMA_CANCELLAZIONE_DATI === 'si';

// Ogni migrazione è una coppia di file NNNN-nome.up.sql / NNNN-nome.down.sql.
const umzug = new Umzug({
    migrations: {
        glob: ['*.up.sql', { cwd: CARTELLA }],
        resolve: ({ name }) => {
            const base = name.replace(/\.up\.sql$/, '');
            return {
                name: base,
                up: () => eseguiSenzaVincoli(leggi(`${base}.up.sql`)),
                down: () => {
                    if (!annullamentoConsentito(base)) {
                        throw new Error(
                            `La migrazione ${base} non si annulla: cancellerebbe tutti i dati. ` +
                                'Se è davvero quello che vuoi, rilancia con CONFERMA_CANCELLAZIONE_DATI=si.'
                        );
                    }
                    return eseguiSenzaVincoli(leggi(`${base}.down.sql`));
                },
            };
        },
    },
    storage: new SequelizeStorage({ sequelize, tableName: 'migrazioni' }),
    logger: process.env.NODE_ENV === 'test' ? undefined : console,
});

// Lock di MySQL: due deploy lanciati insieme non eseguono le stesse migrazioni due volte.
const conLock = (lavoro) =>
    conConnessione(async (connessione) => {
        const [[{ preso }]] = await connessione.query('SELECT GET_LOCK(?, 60) AS preso', [
            NOME_LOCK,
        ]);
        if (preso !== 1) {
            throw new Error('Un altro processo sta già eseguendo le migrazioni.');
        }
        try {
            return await lavoro();
        } finally {
            await connessione.query('SELECT RELEASE_LOCK(?)', [NOME_LOCK]);
        }
    });

module.exports = { umzug, conLock, eseguiSenzaVincoli };

// Uso da riga di comando: node src/db/migrazioni.js up|down [0]|pending
if (require.main === module) {
    const comando = process.argv[2] || 'up';
    const azioni = {
        up: () => conLock(() => umzug.up()),
        // down annulla l'ultima; down 0 le annulla tutte.
        down: () => conLock(() => umzug.down(process.argv[3] === '0' ? { to: 0 } : undefined)),
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
