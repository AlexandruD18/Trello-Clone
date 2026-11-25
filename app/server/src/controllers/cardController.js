const {
    Card,
    CardMember,
    CardLabel,
    List,
    User,
    Label,
    Checklist,
    ChecklistItem,
    Comment,
    sequelize,
} = require('../models');
const {
    posizionePerIndice,
    bloccaContenitori,
    transazioneConRiprova,
    indiceValido,
} = require('../services/posizioni');
const { notificaBoard, notificaCard } = require('../socket/eventi');
const { ruoloBoard, isUuid } = require('../middleware/permessi');

const getCard = async (req, res) => {
    try {
        const card = await Card.findByPk(req.params.id, {
            include: [
                { model: User, as: 'members', through: { attributes: [] } },
                { model: Label, as: 'labels', through: { attributes: [] } },
                {
                    model: Checklist,
                    as: 'checklists',
                    include: [{ model: ChecklistItem, as: 'items', order: [['position', 'ASC']] }],
                    order: [['position', 'ASC']],
                },
                {
                    model: Comment,
                    as: 'comments',
                    include: [{ model: User, as: 'author' }],
                    order: [['createdAt', 'DESC']],
                },
                { model: List, as: 'list' },
            ],
        });

        if (!card) {
            return res.status(404).json({ error: 'Card not found' });
        }

        res.json(card);
    } catch (error) {
        console.error('Get card error:', error);
        res.status(500).json({ error: 'Failed to get card' });
    }
};

const createCard = async (req, res) => {
    try {
        const { title, listId, description } = req.body;

        if (!title || !listId) {
            return res.status(400).json({ error: 'Title and listId are required' });
        }

        // In fondo alla lista, con la lista bloccata: due creazioni insieme non
        // prendono la stessa posizione.
        const card = await transazioneConRiprova(sequelize, async (transaction) => {
            await bloccaContenitori(List, [listId], transaction);
            const { posizione } = await posizionePerIndice({
                modello: Card,
                dove: { listId, isArchived: false },
                indice: Number.MAX_SAFE_INTEGER,
                transaction,
            });
            return Card.create(
                { title, description, listId, position: posizione },
                { transaction }
            );
        });

        const fullCard = await Card.findByPk(card.id, {
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

        notificaBoard(req, req.board.id, 'card:created', { card: fullCard });

        res.status(201).json(fullCard);
    } catch (error) {
        if (error.status === 409) {
            return res.status(409).json({ error: error.message });
        }
        console.error('Create card error:', error);
        res.status(500).json({ error: 'Failed to create card' });
    }
};

const updateCard = async (req, res) => {
    try {
        const { title, description, dueDate, coverColor } = req.body;

        const card = await Card.findByPk(req.params.id);

        if (!card) {
            return res.status(404).json({ error: 'Card not found' });
        }

        await card.update({ title, description, dueDate, coverColor });

        const fullCard = await Card.findByPk(card.id, {
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

        notificaBoard(req, req.board.id, 'card:updated', { card: fullCard });

        res.json(fullCard);
    } catch (error) {
        console.error('Update card error:', error);
        res.status(500).json({ error: 'Failed to update card' });
    }
};

const moveCard = async (req, res) => {
    try {
        // Il client dice dove vuole la card (indice nella lista di destinazione);
        // la posizione numerica la calcola il server.
        const { listId, index } = req.body;

        if (!indiceValido(index)) {
            return res.status(400).json({ error: 'Indice di destinazione non valido' });
        }
        if (listId !== undefined && !isUuid(listId)) {
            return res.status(400).json({ error: 'Lista di destinazione non valida' });
        }

        const esito = await transazioneConRiprova(sequelize, async (transaction) => {
            const partenza = await Card.findByPk(req.params.id, {
                attributes: ['listId'],
                transaction,
            });
            if (!partenza) return { stato: 404, errore: 'Card not found' };

            // Prima le due liste, in ordine di id: gli spostamenti incrociati si mettono in fila.
            const idDestinazione = listId || partenza.listId;
            const liste = await bloccaContenitori(
                List,
                [partenza.listId, idDestinazione],
                transaction
            );
            const destinazione = liste.find((l) => l.id === idDestinazione);

            // La lista di destinazione deve stare nella stessa board della card ed essere attiva.
            if (!destinazione || destinazione.boardId !== req.board.id) {
                return { stato: 400, errore: 'La lista di destinazione non è in questa board' };
            }
            if (destinazione.isArchived) {
                return { stato: 400, errore: 'La lista di destinazione è archiviata' };
            }

            const card = await Card.findByPk(req.params.id, {
                lock: transaction.LOCK.UPDATE,
                transaction,
            });
            if (!card || card.listId !== partenza.listId) {
                return { stato: 409, errore: 'La card è stata spostata nel frattempo: riprova' };
            }

            const { posizione, rinumerati } = await posizionePerIndice({
                modello: Card,
                dove: { listId: destinazione.id, isArchived: false },
                escludi: card.id,
                indice: index,
                transaction,
            });
            await card.update({ listId: destinazione.id, position: posizione }, { transaction });
            return { card, rinumerati };
        });

        if (esito.errore) {
            return res.status(esito.stato).json({ error: esito.errore });
        }
        const { card, rinumerati } = esito;

        const fullCard = await Card.findByPk(card.id, {
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

        if (rinumerati) {
            // Sono cambiate le posizioni di tutta la lista: gli altri ricaricano la board.
            notificaBoard(req, req.board.id, 'board:refresh');
        } else {
            notificaBoard(req, req.board.id, 'card:moved', {
                cardId: fullCard.id,
                listId: fullCard.listId,
                position: fullCard.position,
                card: fullCard,
            });
        }

        res.json({ ...fullCard.toJSON(), rinumerati });
    } catch (error) {
        if (error.status === 409) {
            return res.status(409).json({ error: error.message });
        }
        console.error('Move card error:', error);
        res.status(500).json({ error: 'Failed to move card' });
    }
};

const deleteCard = async (req, res) => {
    try {
        const card = await Card.findByPk(req.params.id);

        if (!card) {
            return res.status(404).json({ error: 'Card not found' });
        }

        await card.update({ isArchived: true });

        notificaBoard(req, req.board.id, 'card:deleted', { cardId: card.id });

        res.json({ message: 'Card archived' });
    } catch (error) {
        console.error('Delete card error:', error);
        res.status(500).json({ error: 'Failed to delete card' });
    }
};

const addMember = async (req, res) => {
    try {
        const { userId } = req.body;

        // Si possono assegnare alla card solo persone che hanno accesso alla board.
        if (typeof userId !== 'string' || !(await ruoloBoard(userId, req.board))) {
            return res.status(400).json({ error: 'Questa persona non fa parte della board' });
        }

        await CardMember.findOrCreate({
            where: { cardId: req.params.id, userId },
        });

        const card = await Card.findByPk(req.params.id, {
            include: [
                { model: User, as: 'members', through: { attributes: [] } },
                { model: Label, as: 'labels', through: { attributes: [] } },
            ],
        });
        await notificaCard(req, req.board.id, req.params.id);

        res.json(card);
    } catch (error) {
        console.error('Add member error:', error);
        res.status(500).json({ error: 'Failed to add member' });
    }
};

const removeMember = async (req, res) => {
    try {
        await CardMember.destroy({
            where: { cardId: req.params.id, userId: req.params.userId },
        });

        const card = await Card.findByPk(req.params.id, {
            include: [
                { model: User, as: 'members', through: { attributes: [] } },
                { model: Label, as: 'labels', through: { attributes: [] } },
            ],
        });
        await notificaCard(req, req.board.id, req.params.id);

        res.json(card);
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ error: 'Failed to remove member' });
    }
};

const addLabel = async (req, res) => {
    try {
        const { labelId } = req.body;

        const label = typeof labelId === 'string' ? await Label.findByPk(labelId) : null;
        if (!label || label.boardId !== req.board.id) {
            return res.status(400).json({ error: "L'etichetta non appartiene a questa board" });
        }

        await CardLabel.findOrCreate({
            where: { cardId: req.params.id, labelId },
        });

        const card = await Card.findByPk(req.params.id, {
            include: [
                { model: User, as: 'members', through: { attributes: [] } },
                { model: Label, as: 'labels', through: { attributes: [] } },
            ],
        });
        await notificaCard(req, req.board.id, req.params.id);

        res.json(card);
    } catch (error) {
        console.error('Add label error:', error);
        res.status(500).json({ error: 'Failed to add label' });
    }
};

const removeLabel = async (req, res) => {
    try {
        await CardLabel.destroy({
            where: { cardId: req.params.id, labelId: req.params.labelId },
        });

        const card = await Card.findByPk(req.params.id, {
            include: [
                { model: User, as: 'members', through: { attributes: [] } },
                { model: Label, as: 'labels', through: { attributes: [] } },
            ],
        });
        await notificaCard(req, req.board.id, req.params.id);

        res.json(card);
    } catch (error) {
        console.error('Remove label error:', error);
        res.status(500).json({ error: 'Failed to remove label' });
    }
};

module.exports = {
    getCard,
    createCard,
    updateCard,
    moveCard,
    deleteCard,
    addMember,
    removeMember,
    addLabel,
    removeLabel,
};
