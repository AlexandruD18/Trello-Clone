// Invio degli aggiornamenti in tempo reale. Gli eventi partono solo dal server,
// dopo che la modifica è stata salvata nel database: i client non possono
// inventarne o inoltrarne.

let io = null;

const impostaIo = (istanza) => {
    io = istanza;
};

const stanzaBoard = (boardId) => `board:${boardId}`;

/**
 * Notifica a chi sta guardando la board. Chi ha fatto la richiesta HTTP lo indica
 * con l'header X-Socket-Id e non riceve l'evento: ha già aggiornato la sua vista.
 */
const notificaBoard = (req, boardId, evento, dati = {}) => {
    if (!io || !boardId) return;
    const mittente = req && req.get && req.get('x-socket-id');
    const destinatari = io.to(stanzaBoard(boardId));
    (mittente ? destinatari.except(mittente) : destinatari).emit(evento, { boardId, ...dati });
};

// Rilegge la card con gli stessi dati della vista board e la invia come card:updated.
// Si usa dopo modifiche a checklist, commenti, membri ed etichette.
const notificaCard = async (req, boardId, cardId) => {
    if (!io || !cardId) return;
    try {
        await inviaCard(req, boardId, cardId);
    } catch (error) {
        // La modifica è già salvata: un errore nella notifica non deve farla fallire.
        console.error('Notifica card non riuscita:', error);
    }
};

const inviaCard = async (req, boardId, cardId) => {
    // Caricato qui per evitare un require circolare con i modelli all'avvio.
    const { Card, User, Label, Checklist, ChecklistItem, Comment } = require('../models');
    const card = await Card.findByPk(cardId, {
        include: [
            { model: User, as: 'members', through: { attributes: [] } },
            { model: Label, as: 'labels', through: { attributes: [] } },
            {
                model: Checklist,
                as: 'checklists',
                include: [{ model: ChecklistItem, as: 'items' }],
            },
            { model: Comment, as: 'comments' },
        ],
    });
    if (card) notificaBoard(req, boardId, 'card:updated', { card });
};

module.exports = { impostaIo, notificaBoard, notificaCard, stanzaBoard };
