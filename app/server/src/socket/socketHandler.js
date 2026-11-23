const { verifyToken } = require('../middleware/auth');
const { Board } = require('../models');
const { ruoloBoard } = require('../middleware/permessi');
const { impostaIo, stanzaBoard } = require('./eventi');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Chi è collegato a ogni board, per mostrare la presenza.
const presenze = new Map();

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
            socket.userId = verifyToken(token).userId;
            next();
        } catch {
            next(new Error('Authentication error'));
        }
    });

    const esci = (socket, boardId) => {
        socket.leave(stanzaBoard(boardId));
        const utenti = presenze.get(boardId);
        if (!utenti) return;
        utenti.delete(socket.id);
        if (utenti.size === 0) presenze.delete(boardId);
        io.to(stanzaBoard(boardId)).emit('user:left', { boardId, userId: socket.userId });
    };

    io.on('connection', (socket) => {
        socket.on('join-board', async (boardId, ack) => {
            try {
                if (typeof boardId !== 'string' || !UUID.test(boardId)) {
                    return rispondi(ack, { ok: false, error: 'Board non valida' });
                }
                const board = await Board.findByPk(boardId);
                const ruolo = board && (await ruoloBoard(socket.userId, board));
                if (!ruolo) {
                    return rispondi(ack, { ok: false, error: 'Non hai accesso a questa board' });
                }

                socket.join(stanzaBoard(boardId));
                if (!presenze.has(boardId)) presenze.set(boardId, new Map());
                presenze.get(boardId).set(socket.id, socket.userId);

                io.to(stanzaBoard(boardId)).emit('user:joined', {
                    boardId,
                    userId: socket.userId,
                    users: [...new Set(presenze.get(boardId).values())],
                });
                rispondi(ack, { ok: true });
            } catch (error) {
                console.error('join-board error:', error);
                rispondi(ack, { ok: false, error: 'Errore interno' });
            }
        });

        socket.on('leave-board', (boardId) => {
            if (typeof boardId === 'string') esci(socket, boardId);
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
