const { Checklist, ChecklistItem } = require('../models');

const createChecklist = async (req, res) => {
  try {
    const { title, cardId } = req.body;

    if (!title || !cardId) {
      return res.status(400).json({ error: 'Title and cardId are required' });
    }

    const lastChecklist = await Checklist.findOne({
      where: { cardId },
      order: [['position', 'DESC']]
    });

    const position = lastChecklist ? lastChecklist.position + 65536 : 65536;

    const checklist = await Checklist.create({
      title,
      cardId,
      position
    });

    const fullChecklist = await Checklist.findByPk(checklist.id, {
      include: [{ model: ChecklistItem, as: 'items' }]
    });

    res.status(201).json(fullChecklist);
  } catch (error) {
    console.error('Create checklist error:', error);
    res.status(500).json({ error: 'Failed to create checklist' });
  }
};

const updateChecklist = async (req, res) => {
  try {
    const { title } = req.body;
    
    const checklist = await Checklist.findByPk(req.params.id);
    
    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    await checklist.update({ title });

    res.json(checklist);
  } catch (error) {
    console.error('Update checklist error:', error);
    res.status(500).json({ error: 'Failed to update checklist' });
  }
};

const deleteChecklist = async (req, res) => {
  try {
    const checklist = await Checklist.findByPk(req.params.id);
    
    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    await ChecklistItem.destroy({ where: { checklistId: checklist.id } });
    await checklist.destroy();

    res.json({ message: 'Checklist deleted' });
  } catch (error) {
    console.error('Delete checklist error:', error);
    res.status(500).json({ error: 'Failed to delete checklist' });
  }
};

const createChecklistItem = async (req, res) => {
  try {
    const { title, checklistId } = req.body;

    if (!title || !checklistId) {
      return res.status(400).json({ error: 'Title and checklistId are required' });
    }

    const lastItem = await ChecklistItem.findOne({
      where: { checklistId },
      order: [['position', 'DESC']]
    });

    const position = lastItem ? lastItem.position + 65536 : 65536;

    const item = await ChecklistItem.create({
      title,
      checklistId,
      position
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Create checklist item error:', error);
    res.status(500).json({ error: 'Failed to create checklist item' });
  }
};

const updateChecklistItem = async (req, res) => {
  try {
    const { title, isCompleted } = req.body;
    
    const item = await ChecklistItem.findByPk(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    await item.update({ title, isCompleted });

    res.json(item);
  } catch (error) {
    console.error('Update checklist item error:', error);
    res.status(500).json({ error: 'Failed to update checklist item' });
  }
};

const deleteChecklistItem = async (req, res) => {
  try {
    const item = await ChecklistItem.findByPk(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    await item.destroy();

    res.json({ message: 'Checklist item deleted' });
  } catch (error) {
    console.error('Delete checklist item error:', error);
    res.status(500).json({ error: 'Failed to delete checklist item' });
  }
};

module.exports = { 
  createChecklist, updateChecklist, deleteChecklist,
  createChecklistItem, updateChecklistItem, deleteChecklistItem 
};
