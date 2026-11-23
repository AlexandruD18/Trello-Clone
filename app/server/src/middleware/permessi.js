const {
    Workspace,
    WorkspaceMember,
    Board,
    BoardMember,
    List,
    Card,
    Checklist,
    ChecklistItem,
    Comment,
    Label,
} = require('../models');

// Ruoli in ordine crescente di poteri.
const LIVELLI = { viewer: 1, member: 2, admin: 3 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (valore) => typeof valore === 'string' && UUID.test(valore);

const haRuolo = (ruolo, minimo) => Boolean(ruolo) && LIVELLI[ruolo] >= LIVELLI[minimo];

// Ruolo dell'utente su un workspace, o null se non ne fa parte.
const ruoloWorkspace = async (userId, workspaceId) => {
    const membro = await WorkspaceMember.findOne({ where: { workspaceId, userId } });
    return membro ? membro.role : null;
};

// Ruolo dell'utente su una board: vale quello più alto tra l'invito diretto
// alla board e l'appartenenza al workspace che la contiene.
const ruoloBoard = async (userId, board) => {
    const [diretto, daWorkspace] = await Promise.all([
        BoardMember.findOne({ where: { boardId: board.id, userId } }),
        ruoloWorkspace(userId, board.workspaceId),
    ]);
    const ruoli = [diretto && diretto.role, daWorkspace].filter(Boolean);
    if (ruoli.length === 0) return null;
    return ruoli.reduce((a, b) => (LIVELLI[a] >= LIVELLI[b] ? a : b));
};

// Da qualunque risorsa risale alla board che la contiene.
const BOARD_DI = {
    board: async (id) => Board.findByPk(id),
    list: async (id) => {
        const list = await List.findByPk(id, { attributes: ['boardId'] });
        return list && Board.findByPk(list.boardId);
    },
    card: async (id) => {
        const card = await Card.findByPk(id, { attributes: ['listId'] });
        return card && BOARD_DI.list(card.listId);
    },
    checklist: async (id) => {
        const checklist = await Checklist.findByPk(id, { attributes: ['cardId'] });
        return checklist && BOARD_DI.card(checklist.cardId);
    },
    checklistItem: async (id) => {
        const item = await ChecklistItem.findByPk(id, { attributes: ['checklistId'] });
        return item && BOARD_DI.checklist(item.checklistId);
    },
    comment: async (id) => {
        const comment = await Comment.findByPk(id, { attributes: ['cardId'] });
        return comment && BOARD_DI.card(comment.cardId);
    },
    label: async (id) => {
        const label = await Label.findByPk(id, { attributes: ['boardId'] });
        return label && Board.findByPk(label.boardId);
    },
};

const NON_TROVATO = {
    board: 'Board non trovata',
    list: 'Lista non trovata',
    card: 'Card non trovata',
    checklist: 'Checklist non trovata',
    checklistItem: 'Elemento della checklist non trovato',
    comment: 'Commento non trovato',
    label: 'Etichetta non trovata',
    workspace: 'Workspace non trovato',
};

/**
 * Middleware: verifica che l'utente possa agire sulla risorsa indicata.
 * @param {keyof NON_TROVATO} risorsa tipo di risorsa
 * @param {(req) => string} leggiId da dove prendere l'id (params, body o query)
 * @param {'viewer'|'member'|'admin'} minimo ruolo minimo richiesto
 * Imposta req.board e req.boardRole (oppure req.workspace e req.workspaceRole).
 */
const autorizza =
    (risorsa, leggiId, minimo = 'viewer') =>
    async (req, res, next) => {
        try {
            const id = leggiId(req);
            if (!isUuid(id)) {
                return res.status(400).json({ error: 'Identificativo mancante o non valido' });
            }

            if (risorsa === 'workspace') {
                const workspace = await Workspace.findByPk(id);
                if (!workspace) return res.status(404).json({ error: NON_TROVATO.workspace });
                const ruolo = await ruoloWorkspace(req.userId, id);
                if (!haRuolo(ruolo, minimo)) {
                    return res
                        .status(403)
                        .json({ error: 'Non hai i permessi per questo workspace' });
                }
                req.workspace = workspace;
                req.workspaceRole = ruolo;
                return next();
            }

            const board = await BOARD_DI[risorsa](id);
            if (!board) return res.status(404).json({ error: NON_TROVATO[risorsa] });
            const ruolo = await ruoloBoard(req.userId, board);
            if (!haRuolo(ruolo, minimo)) {
                return res.status(403).json({ error: 'Non hai i permessi per questa board' });
            }
            req.board = board;
            req.boardRole = ruolo;
            return next();
        } catch (error) {
            return next(error);
        }
    };

const daParametro =
    (nome = 'id') =>
    (req) =>
        req.params[nome];
const daCorpo = (nome) => (req) => req.body && req.body[nome];
const daQuery = (nome) => (req) => req.query[nome];

module.exports = {
    isUuid,
    autorizza,
    daParametro,
    daCorpo,
    daQuery,
    ruoloBoard,
    ruoloWorkspace,
    boardDi: BOARD_DI,
};
