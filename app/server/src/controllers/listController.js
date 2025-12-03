const { List, Card, User, Label, Checklist, ChecklistItem, Comment } = require('../models');

const createList = async (req, res) => {
  try {
    const { name, boardId } = req.body;

    if (!name || !boardId) {
      return res.status(400).json({ error: 'Name and boardId are required' });
    }

    const lastList = await List.findOne({
      where: { boardId, isArchived: false },
      order: [['position', 'DESC']]
    });

    const position = lastList ? lastList.position + 65536 : 65536;

    const list = await List.create({
      name,
      boardId,
      position
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
            { model: Label, as: 'labels', through: { attributes: [] } }
          ]
        }
      ]
    });

    res.status(201).json(fullList);
  } catch (error) {
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

    res.json(list);
  } catch (error) {
    console.error('Update list error:', error);
    res.status(500).json({ error: 'Failed to update list' });
  }
};

const moveList = async (req, res) => {
  try {
    const { position } = req.body;
    
    const list = await List.findByPk(req.params.id);
    
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    await list.update({ position });

    res.json(list);
  } catch (error) {
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

    res.json({ message: 'List archived' });
  } catch (error) {
    console.error('Delete list error:', error);
    res.status(500).json({ error: 'Failed to delete list' });
  }
};

module.exports = { createList, updateList, moveList, deleteList };
