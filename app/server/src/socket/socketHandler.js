const { verifyToken } = require('../middleware/auth');
const { Board } = require('../models');
const { ruoloBoard } = require('../middleware/permessi');
const { impostaIo, stanzaBoard } = require('./eventi');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Chi è collegato a ogni board: boardId → (socketId → userId).
// Un utente con più schede aperte ha più socket ma conta una volta sola.
const presenze = new Map();

const utentiPresenti = (boardId) => [...new Set((presenze.get(boardId) || new Map()).values())];

const rispondi = (ack, esito) => {
    if (typeof ack === 'function') ack(esito);
};

const setupSocketHandlers = (io) => {
    impostaIo(io);

    io.use((socket, next) => {
        const token = socket.handshake.auth && socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error'));
        }
        try {
            const payload = verifyToken(token);
            socket.userId = payload.userId;
            socket.data.scadenza = payload.exp ? payload.exp * 1000 : null;
            next();
        } catch {
            next(new Error('Authentication error'));
        }
    });

    const esci = (socket, boardId) => {
        const stanza = stanzaBoard(boardId);
        // Solo chi è davvero nella stanza può annunciare di uscirne.
        if (!socket.rooms.has(stanza)) return;
        socket.leave(stanza);

        const sockets = presenze.get(boardId);
        if (!sockets) return;
        sockets.delete(socket.id);
        if (sockets.size === 0) presenze.delete(boardId);

        const users = utentiPresenti(boardId);
        // L'utente esce davvero solo quando chiude l'ultima scheda su quella board.
        if (!users.includes(socket.userId)) {
            io.to(stanza).emit('user:left', { boardId, userId: socket.userId, users });
        }
    };

    io.on('connection', (socket) => {
        // Alla scadenza del token il socket si chiude: serve un nuovo login.
        if (socket.data.scadenza) {
            const timer = setTimeout(
                () => socket.disconnect(true),
                Math.max(0, socket.data.scadenza - Date.now())
            );
            socket.on('disconnect', () => clearTimeout(timer));
        }

        socket.on('join-board', async (boardId, ack) => {
            try {
                if (typeof boardId !== 'string' || !UUID.test(boardId)) {
                    return rispondi(ack, { ok: false, error: 'Board non valida' });
                }
                if (socket.rooms.has(stanzaBoard(boardId))) {
                    return rispondi(ack, { ok: true });
                }

                socket.data.boardRichiesta = boardId;
                const board = await Board.findByPk(boardId);
                const ruolo = board && (await ruoloBoard(socket.userId, board));
                if (!ruolo) {
                    return rispondi(ack, { ok: false, error: 'Non hai accesso a questa board' });
                }
                // Nel frattempo il client si è disconnesso o ha aperto un'altra board.
                if (socket.disconnected || socket.data.boardRichiesta !== boardId) {
                    return rispondi(ack, { ok: false, error: 'Richiesta superata' });
                }

                socket.join(stanzaBoard(boardId));
                if (!presenze.has(boardId)) presenze.set(boardId, new Map());
                presenze.get(boardId).set(socket.id, socket.userId);

                io.to(stanzaBoard(boardId)).emit('user:joined', {
                    boardId,
                    userId: socket.userId,
                    users: utentiPresenti(boardId),
                });
                rispondi(ack, { ok: true });
            } catch (error) {
                console.error('join-board error:', error);
                rispondi(ack, { ok: false, error: 'Errore interno' });
            }
        });

        socket.on('leave-board', (boardId) => {
            if (typeof boardId !== 'string') return;
            if (socket.data.boardRichiesta === boardId) socket.data.boardRichiesta = null;
            esci(socket, boardId);
        });

        socket.on('disconnecting', () => {
            for (const stanza of socket.rooms) {
                if (stanza.startsWith('board:')) esci(socket, stanza.slice('board:'.length));
            }
        });
    });

    return io;
};

module.exports = { setupSocketHandlers };
