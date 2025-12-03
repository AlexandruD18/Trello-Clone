const { Board, BoardMember, List, Card, Label, User, Checklist, ChecklistItem, Comment } = require('../models');

const getBoards = async (req, res) => {
  try {
    const { workspaceId } = req.query;

    const where = { isArchived: false };
    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    const boards = await Board.findAll({
      where,
      include: [
        {
          model: User,
          as: 'members',
          through: { attributes: ['role'] }
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(boards);
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({ error: 'Failed to get boards' });
  }
};

const getBoard = async (req, res) => {
  try {
    const board = await Board.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'members',
          through: { attributes: ['role'] }
        },
        {
          model: Label,
          as: 'labels'
        },
        {
          model: List,
          as: 'lists',
          where: { isArchived: false },
          required: false,
          include: [
            {
              model: Card,
              as: 'cards',
              where: { isArchived: false },
              required: false,
              include: [
                { model: User, as: 'members', through: { attributes: [] } },
                { model: Label, as: 'labels', through: { attributes: [] } },
                { 
                  model: Checklist, 
                  as: 'checklists',
                  include: [{ model: ChecklistItem, as: 'items' }]
                },
                { model: Comment, as: 'comments' }
              ],
              order: [['position', 'ASC']]
            }
          ],
          order: [['position', 'ASC']]
        }
      ],
      order: [
        [{ model: List, as: 'lists' }, 'position', 'ASC'],
        [{ model: List, as: 'lists' }, { model: Card, as: 'cards' }, 'position', 'ASC']
      ]
    });

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    res.json(board);
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
      backgroundColor: backgroundColor || '#0079bf'
    });

    await BoardMember.create({
      boardId: board.id,
      userId: req.userId,
      role: 'admin'
    });

    const defaultLabels = [
      { name: '', color: '#61bd4f', boardId: board.id },
      { name: '', color: '#f2d600', boardId: board.id },
      { name: '', color: '#ff9f1a', boardId: board.id },
      { name: '', color: '#eb5a46', boardId: board.id },
      { name: '', color: '#c377e0', boardId: board.id },
      { name: '', color: '#0079bf', boardId: board.id }
    ];
    await Label.bulkCreate(defaultLabels);

    const fullBoard = await Board.findByPk(board.id, {
      include: [
        { model: User, as: 'members', through: { attributes: ['role'] } },
        { model: Label, as: 'labels' },
        { model: List, as: 'lists', required: false }
      ]
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

    res.json({ message: 'Board archived' });
  } catch (error) {
    console.error('Delete board error:', error);
    res.status(500).json({ error: 'Failed to delete board' });
  }
};

module.exports = { getBoards, getBoard, createBoard, updateBoard, deleteBoard };
