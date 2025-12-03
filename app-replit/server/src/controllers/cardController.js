const { Card, CardMember, CardLabel, List, User, Label, Checklist, ChecklistItem, Comment } = require('../models');

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
          order: [['position', 'ASC']]
        },
        { 
          model: Comment, 
          as: 'comments',
          include: [{ model: User, as: 'author' }],
          order: [['createdAt', 'DESC']]
        },
        { model: List, as: 'list' }
      ]
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

    const lastCard = await Card.findOne({
      where: { listId, isArchived: false },
      order: [['position', 'DESC']]
    });

    const position = lastCard ? lastCard.position + 65536 : 65536;

    const card = await Card.create({
      title,
      description,
      listId,
      position
    });

    const fullCard = await Card.findByPk(card.id, {
      include: [
        { model: User, as: 'members', through: { attributes: [] } },
        { model: Label, as: 'labels', through: { attributes: [] } },
        { model: Checklist, as: 'checklists', include: [{ model: ChecklistItem, as: 'items' }] },
        { model: Comment, as: 'comments' }
      ]
    });

    res.status(201).json(fullCard);
  } catch (error) {
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
        { model: Checklist, as: 'checklists', include: [{ model: ChecklistItem, as: 'items' }] },
        { model: Comment, as: 'comments' }
      ]
    });

    res.json(fullCard);
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
};

const moveCard = async (req, res) => {
  try {
    const { listId, position } = req.body;
    
    const card = await Card.findByPk(req.params.id);
    
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    await card.update({ listId, position });

    const fullCard = await Card.findByPk(card.id, {
      include: [
        { model: User, as: 'members', through: { attributes: [] } },
        { model: Label, as: 'labels', through: { attributes: [] } },
        { model: Checklist, as: 'checklists', include: [{ model: ChecklistItem, as: 'items' }] },
        { model: Comment, as: 'comments' }
      ]
    });

    res.json(fullCard);
  } catch (error) {
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

    res.json({ message: 'Card archived' });
  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
};

const addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    
    await CardMember.findOrCreate({
      where: { cardId: req.params.id, userId }
    });

    const card = await Card.findByPk(req.params.id, {
      include: [
        { model: User, as: 'members', through: { attributes: [] } },
        { model: Label, as: 'labels', through: { attributes: [] } }
      ]
    });

    res.json(card);
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
};

const removeMember = async (req, res) => {
  try {
    await CardMember.destroy({
      where: { cardId: req.params.id, userId: req.params.userId }
    });

    const card = await Card.findByPk(req.params.id, {
      include: [
        { model: User, as: 'members', through: { attributes: [] } },
        { model: Label, as: 'labels', through: { attributes: [] } }
      ]
    });

    res.json(card);
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

const addLabel = async (req, res) => {
  try {
    const { labelId } = req.body;
    
    await CardLabel.findOrCreate({
      where: { cardId: req.params.id, labelId }
    });

    const card = await Card.findByPk(req.params.id, {
      include: [
        { model: User, as: 'members', through: { attributes: [] } },
        { model: Label, as: 'labels', through: { attributes: [] } }
      ]
    });

    res.json(card);
  } catch (error) {
    console.error('Add label error:', error);
    res.status(500).json({ error: 'Failed to add label' });
  }
};

const removeLabel = async (req, res) => {
  try {
    await CardLabel.destroy({
      where: { cardId: req.params.id, labelId: req.params.labelId }
    });

    const card = await Card.findByPk(req.params.id, {
      include: [
        { model: User, as: 'members', through: { attributes: [] } },
        { model: Label, as: 'labels', through: { attributes: [] } }
      ]
    });

    res.json(card);
  } catch (error) {
    console.error('Remove label error:', error);
    res.status(500).json({ error: 'Failed to remove label' });
  }
};

module.exports = { 
  getCard, createCard, updateCard, moveCard, deleteCard,
  addMember, removeMember, addLabel, removeLabel 
};
