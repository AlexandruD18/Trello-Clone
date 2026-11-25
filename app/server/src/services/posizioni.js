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

// Blocca le righe dei contenitori (liste o board) sempre in ordine di id: chi sposta
// tra due liste e chi sposta nel verso opposto si mettono in fila invece di
// bloccarsi a vicenda. Va chiamata come prima cosa nella transazione.
const bloccaContenitori = async (modello, ids, transaction) => {
    const unici = [...new Set(ids.filter(Boolean))].sort();
    if (unici.length === 0) return [];
    return modello.findAll({
        where: { id: unici },
        order: [['id', 'ASC']],
        lock: transaction.LOCK.UPDATE,
        transaction,
    });
};

// Solo i deadlock: MySQL li rileva subito. Un lock wait timeout arriva dopo 50 s
// e ripeterlo terrebbe la richiesta appesa per minuti.
const ERRORI_RIPETIBILI = new Set(['ER_LOCK_DEADLOCK']);
const ripetibile = (errore) =>
    ERRORI_RIPETIBILI.has(errore?.parent?.code || errore?.original?.code || errore?.code);

class ConflittoConcorrenza extends Error {
    constructor() {
        super('Troppe modifiche contemporanee: riprova');
        this.status = 409;
    }
}

/**
 * Esegue una transazione e la ripete (fino a 3 volte, con una breve attesa) se MySQL
 * la interrompe per un deadlock. Se non riesce ancora, lancia ConflittoConcorrenza.
 */
const transazioneConRiprova = async (sequelize, lavoro, tentativi = 3) => {
    for (let i = 1; ; i += 1) {
        try {
            return await sequelize.transaction(lavoro);
        } catch (errore) {
            if (!ripetibile(errore)) throw errore;
            if (i >= tentativi) throw new ConflittoConcorrenza();
            await new Promise((r) => setTimeout(r, 20 * i + Math.random() * 30));
        }
    }
};

const indiceValido = (valore) => Number.isInteger(valore) && valore >= 0 && valore <= 100000;

module.exports = {
    posizionePerIndice,
    bloccaContenitori,
    transazioneConRiprova,
    ConflittoConcorrenza,
    indiceValido,
    PASSO,
    SCARTO_MINIMO,
};
