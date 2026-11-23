// Confronta il database collegato con i modelli Sequelize: ogni colonna dichiarata
// deve esistere con lo stesso vincolo di null. Utile prima del primo deploy delle
// migrazioni su un database creato a suo tempo con sequelize.sync().
const { sequelize } = require('../models');

const differenze = async () => {
    const qi = sequelize.getQueryInterface();
    const problemi = [];
    for (const modello of Object.values(sequelize.models)) {
        const nomeTabella = modello.getTableName();
        let tabella;
        try {
            tabella = await qi.describeTable(nomeTabella);
        } catch {
            problemi.push(`manca la tabella ${nomeTabella}`);
            continue;
        }
        for (const attributo of Object.values(modello.getAttributes())) {
            const colonna = tabella[attributo.field];
            if (!colonna) {
                problemi.push(`manca la colonna ${nomeTabella}.${attributo.field}`);
                continue;
            }
            const nullable = attributo.allowNull !== false && !attributo.primaryKey;
            if (colonna.allowNull !== nullable) {
                problemi.push(
                    `${nomeTabella}.${attributo.field}: allowNull ${colonna.allowNull}, atteso ${nullable}`
                );
            }
        }
    }
    return problemi;
};

module.exports = { differenze };

if (require.main === module) {
    differenze()
        .then(async (problemi) => {
            await sequelize.close();
            if (problemi.length === 0) {
                console.log('Il database corrisponde ai modelli.');
                return;
            }
            console.error(`Trovate ${problemi.length} differenze:\n- ${problemi.join('\n- ')}`);
            process.exit(1);
        })
        .catch(async (errore) => {
            console.error('Verifica non riuscita:', errore.message);
            await sequelize.close();
            process.exit(1);
        });
}
