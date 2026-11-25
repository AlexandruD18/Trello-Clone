const { Op } = require('sequelize');

// Ordinamento di liste e card. Ogni elemento ha una posizione numerica; per
// spostarlo si sceglie un valore tra i due vicini, senza toccare gli altri.
// Quando lo spazio tra due vicini diventa troppo piccolo si rinumera tutto il gruppo.

const PASSO = 65536;
// Sotto questo scarto due posizioni rischiano di diventare uguali dopo pochi altri inserimenti.
const SCARTO_MINIMO = 1e-6;

/**
 * Calcola la posizione per inserire un elemento all'indice richiesto, dentro una
 * transazione e con i fratelli bloccati (SELECT ... FOR UPDATE), così due
 * spostamenti contemporanei non scelgono lo stesso valore.
 *
 * @param {object} opzioni
 * @param {import('sequelize').ModelStatic<any>} opzioni.modello List o Card
 * @param {object} opzioni.dove filtro dei fratelli (es. { listId, isArchived: false })
 * @param {string} [opzioni.escludi] id dell'elemento che si sta spostando
 * @param {number} opzioni.indice posizione desiderata (0 = in cima)
 * @param {import('sequelize').Transaction} opzioni.transaction
 * @returns {Promise<{ posizione: number, rinumerati: boolean }>}
 */
const posizionePerIndice = async ({ modello, dove, escludi, indice, transaction }) => {
    const fratelli = await modello.findAll({
        where: escludi ? { ...dove, id: { [Op.ne]: escludi } } : dove,
        attributes: ['id', 'position'],
        order: [
            ['position', 'ASC'],
            ['id', 'ASC'],
        ],
        lock: transaction.LOCK.UPDATE,
        transaction,
    });

    const i = Math.max(0, Math.min(indice, fratelli.length));
    const prima = fratelli[i - 1];
    const dopo = fratelli[i];

    if (!prima && !dopo) return { posizione: PASSO, rinumerati: false };
    if (!prima) return { posizione: dopo.position - PASSO, rinumerati: false };
    if (!dopo) return { posizione: prima.position + PASSO, rinumerati: false };

    if (dopo.position - prima.position > SCARTO_MINIMO) {
        return { posizione: (prima.position + dopo.position) / 2, rinumerati: false };
    }

    // Spazio esaurito: rinumera i fratelli lasciando un buco all'indice richiesto.
    for (const [k, fratello] of fratelli.entries()) {
        const nuova = (k < i ? k + 1 : k + 2) * PASSO;
        if (fratello.position !== nuova) {
            await fratello.update({ position: nuova }, { transaction });
        }
    }
    return { posizione: (i + 1) * PASSO, rinumerati: true };
};

const indiceValido = (valore) => Number.isInteger(valore) && valore >= 0 && valore <= 100000;

module.exports = { posizionePerIndice, indiceValido, PASSO, SCARTO_MINIMO };
