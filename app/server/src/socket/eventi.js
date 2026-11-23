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

module.exports = { impostaIo, notificaBoard, stanzaBoard };
