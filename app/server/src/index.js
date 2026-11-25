const config = require('./config/env');
const { sequelize } = require('./models');
const { umzug } = require('./db/migrazioni');
const { createApp } = require('./app');

const termina = async (messaggio, errore) => {
    console.error(messaggio);
    if (errore) console.error(errore.message);
    await sequelize.close().catch(() => {});
    process.exit(1);
};

const avvia = async () => {
    try {
        await sequelize.authenticate();
    } catch (errore) {
        // Senza database il server risponderebbe 500 a tutto: meglio fermarsi subito.
        return termina(
            `Database non raggiungibile su ${sequelize.config.host}:${sequelize.config.port}. ` +
                'Controlla DB_HOST, DB_PORT, DB_USER e DB_PASSWORD in app/server/.env.',
            errore
        );
    }

    const daEseguire = await umzug.pending();
    if (daEseguire.length > 0) {
        return termina(
            `Ci sono ${daEseguire.length} migrazioni da eseguire ` +
                `(${daEseguire.map((m) => m.name).join(', ')}). Lancia: npm run db:migrate`
        );
    }

    const { server, io } = createApp();
    server.listen(config.port, config.host, () => {
        console.log(`Server in ascolto su http://${config.host}:${config.port} (${config.env})`);
    });

    // Chiusura ordinata: prima i socket (che altrimenti tengono aperto il server),
    // poi le connessioni HTTP e il database. Se qualcosa si blocca, si esce comunque.
    let inChiusura = false;
    const chiudi = () => {
        if (inChiusura) return;
        inChiusura = true;
        setTimeout(() => process.exit(1), 5000).unref();
        io.close(() => {
            sequelize.close().finally(() => process.exit(0));
        });
        server.closeAllConnections();
    };
    process.on('SIGTERM', chiudi);
    process.on('SIGINT', chiudi);
};

avvia().catch((errore) => termina('Avvio non riuscito.', errore));
