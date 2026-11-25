const { sequelize, Board, List, Card, User, Label } = require('../models');
const {
    posizionePerIndice,
    bloccaContenitori,
    transazioneConRiprova,
    indiceValido,
} = require('../services/posizioni');
const { notificaBoard } = require('../socket/eventi');

const createList = async (req, res) => {
    try {
        const { name, boardId } = req.body;

        if (!name || !boardId) {
            return res.status(400).json({ error: 'Name and boardId are required' });
        }

        const list = await transazioneConRiprova(sequelize, async (transaction) => {
            await bloccaContenitori(Board, [boardId], transaction);
            const { posizione } = await posizionePerIndice({
                modello: List,
                dove: { boardId, isArchived: false },
                indice: Number.MAX_SAFE_INTEGER,
                transaction,
            });
            return List.create({ name, boardId, position: posizione }, { transaction });
        });

        const fullList = await List.findByPk(list.id, {
            include: [
                {
                    model: Card,
                    as: 'cards',
                    where: { isArchived: false },
                    required: false,
                    include: [
                        { model: User, as: 'members', through: { attributes: [] } },
                        { model: Label, as: 'labels', through: { attributes: [] } },
                    ],
                },
            ],
        });

        notificaBoard(req, req.board.id, 'list:created', { list: fullList });

        res.status(201).json(fullList);
    } catch (error) {
        if (error.status === 409) {
            return res.status(409).json({ error: error.message });
        }
        console.error('Create list error:', error);
        res.status(500).json({ error: 'Failed to create list' });
    }
};

const updateList = async (req, res) => {
    try {
        const { name } = req.body;

        const list = await List.findByPk(req.params.id);

        if (!list) {
            return res.status(404).json({ error: 'List not found' });
        }

        await list.update({ name });

        notificaBoard(req, req.board.id, 'list:updated', { list });

        res.json(list);
    } catch (error) {
        console.error('Update list error:', error);
        res.status(500).json({ error: 'Failed to update list' });
    }
};

const moveList = async (req, res) => {
    try {
        const { index } = req.body;

        if (!indiceValido(index)) {
            return res.status(400).json({ error: 'Indice di destinazione non valido' });
        }

        const esito = await transazioneConRiprova(sequelize, async (transaction) => {
            await bloccaContenitori(Board, [req.board.id], transaction);
            const lista = await List.findByPk(req.params.id, { transaction });
            if (!lista) return null;
            const { posizione, rinumerati: rinum } = await posizionePerIndice({
                modello: List,
                dove: { boardId: lista.boardId, isArchived: false },
                escludi: lista.id,
                indice: index,
                transaction,
            });
            await lista.update({ position: posizione }, { transaction });
            return { list: lista, rinumerati: rinum };
        });
        if (!esito) {
            return res.status(404).json({ error: 'List not found' });
        }
        const { list, rinumerati } = esito;

        if (rinumerati) {
            notificaBoard(req, req.board.id, 'board:refresh');
        } else {
            notificaBoard(req, req.board.id, 'list:moved', {
                listId: list.id,
                position: list.position,
            });
        }

        res.json({ ...list.toJSON(), rinumerati });
    } catch (error) {
        if (error.status === 409) {
            return res.status(409).json({ error: error.message });
        }
        console.error('Move list error:', error);
        res.status(500).json({ error: 'Failed to move list' });
    }
};

const deleteList = async (req, res) => {
    try {
        const list = await List.findByPk(req.params.id);

        if (!list) {
            return res.status(404).json({ error: 'List not found' });
        }

        await list.update({ isArchived: true });

        notificaBoard(req, req.board.id, 'list:deleted', { listId: list.id });

        res.json({ message: 'List archived' });
    } catch (error) {
        console.error('Delete list error:', error);
        res.status(500).json({ error: 'Failed to delete list' });
    }
};

module.exports = { createList, updateList, moveList, deleteList };
