const { Op } = require('sequelize');
const { sequelize, Board, User, BoardMember, CardMember, Card, List } = require('../models');
const { normalizzaEmail } = require('../validation/auth');
const { isUuid, ruoloWorkspace } = require('../middleware/permessi');
const { notificaBoard, verificaAccessoSocket } = require('../socket/eventi');

const RUOLI = ['admin', 'member', 'viewer'];
const PUBBLICO = ['id', 'name', 'avatar'];

const membroPubblico = (user, role) => ({
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    role,
});

// Una board deve avere sempre almeno un admin diretto.
const ultimoAdmin = async (boardId, userId, transaction) => {
    const admin = await BoardMember.findAll({
        where: { boardId, role: 'admin' },
        attributes: ['userId'],
        lock: transaction.LOCK.UPDATE,
        transaction,
    });
    return admin.length === 1 && admin[0].userId === userId;
};

// Toglie l'utente dalle card della board: non può restare assegnato a lavori che non vede.
const togliDalleCard = async (boardId, userId, transaction) => {
    const liste = await List.findAll({ where: { boardId }, attributes: ['id'], transaction });
    const card = await Card.findAll({
        where: { listId: { [Op.in]: liste.map((l) => l.id) } },
        attributes: ['id'],
        transaction,
    });
    if (card.length === 0) return;
    await CardMember.destroy({
        where: { userId, cardId: { [Op.in]: card.map((c) => c.id) } },
        transaction,
    });
};

const addBoardMember = async (req, res) => {
    try {
        const { email, role = 'member' } = req.body;
        if (typeof email !== 'string' || !email.trim()) {
            return res.status(400).json({ error: "Indica l'email della persona da invitare" });
        }
        if (!RUOLI.includes(role)) {
            return res.status(400).json({ error: 'Ruolo non valido' });
        }

        const user = await User.findOne({ where: { email: normalizzaEmail(email) } });
        if (!user) {
            return res.status(404).json({
                error: 'Nessun account con questa email: chiedi alla persona di registrarsi',
            });
        }

        const [membro, creato] = await BoardMember.findOrCreate({
            where: { boardId: req.board.id, userId: user.id },
            defaults: { role },
        });
        if (!creato) {
            return res.status(409).json({ error: 'Questa persona fa già parte della board' });
        }

        notificaBoard(req, req.board.id, 'board:refresh');
        res.status(201).json(membroPubblico(user, membro.role));
    } catch (error) {
        console.error('Add board member error:', error);
        res.status(500).json({ error: 'Invito non riuscito' });
    }
};

const updateBoardMember = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        if (!isUuid(userId)) return res.status(400).json({ error: 'Persona non valida' });
        if (!RUOLI.includes(role)) return res.status(400).json({ error: 'Ruolo non valido' });

        const esito = await sequelize.transaction(async (transaction) => {
            // Prima la board: due admin che si tolgono o declassano insieme si mettono in fila.
            await Board.findByPk(req.board.id, { lock: transaction.LOCK.UPDATE, transaction });
            const membro = await BoardMember.findOne({
                where: { boardId: req.board.id, userId },
                lock: transaction.LOCK.UPDATE,
                transaction,
            });
            if (!membro) return { stato: 404, errore: 'Questa persona non è nella board' };
            if (role !== 'admin' && (await ultimoAdmin(req.board.id, userId, transaction))) {
                return { stato: 409, errore: 'La board deve avere almeno un admin' };
            }
            await membro.update({ role }, { transaction });
            return { membro };
        });
        if (esito.errore) return res.status(esito.stato).json({ error: esito.errore });

        const user = await User.findByPk(userId, { attributes: PUBBLICO });
        await verificaAccessoSocket(req.board, userId);
        notificaBoard(req, req.board.id, 'board:refresh');
        res.json(
            user ? membroPubblico(user, esito.membro.role) : { id: userId, role: esito.membro.role }
        );
    } catch (error) {
        console.error('Update board member error:', error);
        res.status(500).json({ error: 'Modifica del ruolo non riuscita' });
    }
};

// Un admin toglie chiunque; ognuno può togliere sé stesso (lasciare la board).
// Funziona anche sulle board archiviate: togliere l'accesso è una misura di sicurezza,
// non una modifica dei contenuti (invitare e cambiare ruolo, invece, sono bloccati).
const removeBoardMember = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!isUuid(userId)) return res.status(400).json({ error: 'Persona non valida' });
        if (req.boardRole !== 'admin' && userId !== req.userId) {
            return res.status(403).json({ error: 'Solo un admin può togliere altre persone' });
        }

        const esito = await sequelize.transaction(async (transaction) => {
            // Prima la board: due admin che si tolgono o declassano insieme si mettono in fila.
            await Board.findByPk(req.board.id, { lock: transaction.LOCK.UPDATE, transaction });
            const membro = await BoardMember.findOne({
                where: { boardId: req.board.id, userId },
                lock: transaction.LOCK.UPDATE,
                transaction,
            });
            if (!membro) return { stato: 404, errore: 'Questa persona non è nella board' };
            if (membro.role === 'admin' && (await ultimoAdmin(req.board.id, userId, transaction))) {
                return { stato: 409, errore: 'La board deve avere almeno un admin' };
            }
            await membro.destroy({ transaction });
            // Se vede ancora la board dal workspace, le sue card restano assegnate.
            if (!(await ruoloWorkspace(userId, req.board.workspaceId))) {
                await togliDalleCard(req.board.id, userId, transaction);
            }
            return {};
        });
        if (esito.errore) return res.status(esito.stato).json({ error: esito.errore });

        // Se non ha più accesso (nemmeno dal workspace) esce subito dal tempo reale.
        await verificaAccessoSocket(req.board, userId);
        notificaBoard(req, req.board.id, 'board:refresh');
        res.json({ message: 'Persona tolta dalla board' });
    } catch (error) {
        console.error('Remove board member error:', error);
        res.status(500).json({ error: 'Rimozione non riuscita' });
    }
};

module.exports = { addBoardMember, updateBoardMember, removeBoardMember };
