const { Board, BoardMember, List, Label, User, WorkspaceMember } = require('../models');
const { Op } = require('sequelize');
const { riepiloghiCard } = require('../services/riepilogoCard');
const { isUuid } = require('../middleware/permessi');
const { notificaBoard } = require('../socket/eventi');

const getBoards = async (req, res) => {
    try {
        const { workspaceId } = req.query;
        if (workspaceId !== undefined && !isUuid(workspaceId)) {
            return res.status(400).json({ error: 'Identificativo del workspace non valido' });
        }

        // Solo le board di cui l'utente è membro o che stanno in un suo workspace.
        const [inviti, iscrizioni] = await Promise.all([
            BoardMember.findAll({ where: { userId: req.userId }, attributes: ['boardId'] }),
            WorkspaceMember.findAll({ where: { userId: req.userId }, attributes: ['workspaceId'] }),
        ]);
        // ?archiviate=true elenca le board archiviate (per ripristinarle).
        const where = {
            isArchived: req.query.archiviate === 'true',
            [Op.or]: [
                { id: inviti.map((m) => m.boardId) },
                { workspaceId: iscrizioni.map((m) => m.workspaceId) },
            ],
        };
        if (workspaceId) {
            where.workspaceId = workspaceId;
        }

        const boards = await Board.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'members',
                    through: { attributes: ['role'] },
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json(boards);
    } catch (error) {
        console.error('Get boards error:', error);
        res.status(500).json({ error: 'Failed to get boards' });
    }
};

const getBoard = async (req, res) => {
    try {
        // Tre query semplici invece di un'unica join enorme: board, liste, riepiloghi delle card.
        const board = await Board.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'members',
                    attributes: ['id', 'name', 'avatar'],
                    through: { attributes: ['role'] },
                },
                { model: Label, as: 'labels' },
            ],
        });

        if (!board) {
            return res.status(404).json({ error: 'Board not found' });
        }

        const lists = await List.findAll({
            where: { boardId: board.id, isArchived: false },
            order: [
                ['position', 'ASC'],
                ['id', 'ASC'],
            ],
        });
        const cards = await riepiloghiCard({
            listId: lists.map((l) => l.id),
            isArchived: false,
        });

        const cardsPerLista = new Map(lists.map((l) => [l.id, []]));
        for (const card of cards) cardsPerLista.get(card.listId).push(card);

        res.json({
            ...board.toJSON(),
            lists: lists.map((l) => ({ ...l.toJSON(), cards: cardsPerLista.get(l.id) })),
        });
    } catch (error) {
        console.error('Get board error:', error);
        res.status(500).json({ error: 'Failed to get board' });
    }
};

const createBoard = async (req, res) => {
    try {
        const { name, description, workspaceId, backgroundColor } = req.body;

        if (!name || !workspaceId) {
            return res.status(400).json({ error: 'Name and workspaceId are required' });
        }

        const board = await Board.create({
            name,
            description,
            workspaceId,
            backgroundColor: backgroundColor || '#0079bf',
        });

        await BoardMember.create({
            boardId: board.id,
            userId: req.userId,
            role: 'admin',
        });

        const defaultLabels = [
            { name: '', color: '#61bd4f', boardId: board.id },
            { name: '', color: '#f2d600', boardId: board.id },
            { name: '', color: '#ff9f1a', boardId: board.id },
            { name: '', color: '#eb5a46', boardId: board.id },
            { name: '', color: '#c377e0', boardId: board.id },
            { name: '', color: '#0079bf', boardId: board.id },
        ];
        await Label.bulkCreate(defaultLabels);

        const fullBoard = await Board.findByPk(board.id, {
            include: [
                { model: User, as: 'members', through: { attributes: ['role'] } },
                { model: Label, as: 'labels' },
                { model: List, as: 'lists', required: false },
            ],
        });

        res.status(201).json(fullBoard);
    } catch (error) {
        console.error('Create board error:', error);
        res.status(500).json({ error: 'Failed to create board' });
    }
};

const updateBoard = async (req, res) => {
    try {
        const { name, description, backgroundColor } = req.body;

        const board = await Board.findByPk(req.params.id);

        if (!board) {
            return res.status(404).json({ error: 'Board not found' });
        }

        await board.update({ name, description, backgroundColor });

        res.json(board);
    } catch (error) {
        console.error('Update board error:', error);
        res.status(500).json({ error: 'Failed to update board' });
    }
};

const deleteBoard = async (req, res) => {
    try {
        const board = await Board.findByPk(req.params.id);

        if (!board) {
            return res.status(404).json({ error: 'Board not found' });
        }

        await board.update({ isArchived: true });
        // Chi ha la board aperta la ricarica e la vede in sola lettura.
        notificaBoard(req, board.id, 'board:refresh');

        res.json({ message: 'Board archived' });
    } catch (error) {
        console.error('Delete board error:', error);
        res.status(500).json({ error: 'Failed to delete board' });
    }
};

const restoreBoard = async (req, res) => {
    try {
        await req.board.update({ isArchived: false });
        notificaBoard(req, req.board.id, 'board:refresh');
        res.json(req.board);
    } catch (error) {
        console.error('Restore board error:', error);
        res.status(500).json({ error: 'Ripristino della board non riuscito' });
    }
};

module.exports = { getBoards, getBoard, createBoard, updateBoard, deleteBoard, restoreBoard };
