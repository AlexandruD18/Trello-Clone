// Invio degli aggiornamenti in tempo reale. Gli eventi partono solo dal server,
// dopo che la modifica è stata salvata nel database: i client non possono
// inventarne o inoltrarne.

let io = null;

const impostaIo = (istanza) => {
    io = istanza;
};

const stanzaBoard = (boardId) => `board:${boardId}`;

// L'header X-Socket-Id vale solo se indica un socket aperto dallo stesso utente:
// except() accetta anche nomi di stanza e così si potrebbe zittire una board intera.
const socketDelMittente = (req) => {
    const id = req && typeof req.get === 'function' ? req.get('x-socket-id') : null;
    if (!id || !req.userId) return null;
    const socket = io.of('/').sockets.get(id);
    return socket && socket.userId === req.userId ? id : null;
};

/**
 * Notifica a chi sta guardando la board. Chi ha fatto la richiesta HTTP lo indica
 * con l'header X-Socket-Id e non riceve l'evento: ha già aggiornato la sua vista.
 */
const notificaBoard = (req, boardId, evento, dati = {}) => {
    if (!io || !boardId) return;
    try {
        const destinatari = io.to(stanzaBoard(boardId));
        const mittente = socketDelMittente(req);
        (mittente ? destinatari.except(mittente) : destinatari).emit(evento, { boardId, ...dati });
    } catch (error) {
        // La modifica è già salvata: un errore nella notifica non deve farla fallire.
        console.error('Notifica non riuscita:', error);
    }
};

// Rilegge il riepilogo della card (come nella vista board) e lo invia come card:updated.
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
    const { riepilogoCard } = require('../services/riepilogoCard');
    const card = await riepilogoCard(cardId);
    if (card) notificaBoard(req, boardId, 'card:updated', { card });
};

// Controllo dell'accesso dei socket già collegati: lo registra socketHandler, che
// conosce le stanze e la presenza. Si chiama dopo aver cambiato ruoli o membri.
let controlloAccesso = null;
const impostaControlloAccesso = (funzione) => {
    controlloAccesso = funzione;
};
const verificaAccessoSocket = async (board, userId) => {
    if (!controlloAccesso) return;
    try {
        await controlloAccesso(board, userId);
    } catch (error) {
        console.error('Controllo accesso socket non riuscito:', error);
    }
};

module.exports = {
    impostaIo,
    notificaBoard,
    notificaCard,
    stanzaBoard,
    impostaControlloAccesso,
    verificaAccessoSocket,
};
