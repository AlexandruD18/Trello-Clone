const { sequelize, Board, List, Card } = require('../models');
const {
    posizionePerIndice,
    bloccaContenitori,
    transazioneConRiprova,
} = require('../services/posizioni');
const { riepiloghiCard } = require('../services/riepilogoCard');
const { notificaBoard } = require('../socket/eventi');

// Il middleware con ancheArchiviata salta il controllo su tutta la catena: qui si
// verifica a mano che ciò che sta sopra (board, lista) sia attivo.

// Liste archiviate e card archiviate (anche quelle dentro liste archiviate) di una board.
const getArchiviati = async (req, res) => {
    try {
        const liste = await List.findAll({
            where: { boardId: req.board.id },
            order: [['updatedAt', 'DESC']],
        });
        const card = await riepiloghiCard(
            { listId: liste.map((l) => l.id), isArchived: true },
            { order: [['updatedAt', 'DESC']] }
        );
        res.json({
            lists: liste.filter((l) => l.isArchived),
            cards: card,
        });
    } catch (error) {
        console.error('Get archived error:', error);
        res.status(500).json({ error: 'Archivio non disponibile' });
    }
};

const restoreList = async (req, res) => {
    try {
        if (req.board.isArchived) {
            return res.status(400).json({ error: 'Ripristina prima la board' });
        }
        const lista = await transazioneConRiprova(sequelize, async (transaction) => {
            await bloccaContenitori(Board, [req.board.id], transaction);
            const trovata = await List.findByPk(req.params.id, { transaction });
            if (!trovata.isArchived) return trovata;
            // Torna in fondo alla board.
            const { posizione } = await posizionePerIndice({
                modello: List,
                dove: { boardId: req.board.id, isArchived: false },
                indice: Number.MAX_SAFE_INTEGER,
                transaction,
            });
            await trovata.update({ isArchived: false, position: posizione }, { transaction });
            return trovata;
        });
        notificaBoard(req, req.board.id, 'board:refresh');
        res.json(lista);
    } catch (error) {
        console.error('Restore list error:', error);
        res.status(500).json({ error: 'Ripristino della lista non riuscito' });
    }
};

const restoreCard = async (req, res) => {
    try {
        if (req.board.isArchived) {
            return res.status(400).json({ error: 'Ripristina prima la board' });
        }
        const esito = await transazioneConRiprova(sequelize, async (transaction) => {
            const card = await Card.findByPk(req.params.id, { transaction });
            const [lista] = await bloccaContenitori(List, [card.listId], transaction);
            if (lista.isArchived) {
                return {
                    errore: 'La lista di questa card è archiviata: ripristina prima la lista',
                };
            }
            if (!card.isArchived) return { card };
            // Torna in fondo alla sua lista.
            const { posizione } = await posizionePerIndice({
                modello: Card,
                dove: { listId: lista.id, isArchived: false },
                indice: Number.MAX_SAFE_INTEGER,
                transaction,
            });
            await card.update({ isArchived: false, position: posizione }, { transaction });
            return { card };
        });
        if (esito.errore) return res.status(400).json({ error: esito.errore });

        notificaBoard(req, req.board.id, 'board:refresh');
        res.json(esito.card);
    } catch (error) {
        console.error('Restore card error:', error);
        res.status(500).json({ error: 'Ripristino della card non riuscito' });
    }
};

module.exports = { getArchiviati, restoreList, restoreCard };
