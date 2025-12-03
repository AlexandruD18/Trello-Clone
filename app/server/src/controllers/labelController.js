const { Label } = require('../models');

const getLabels = async (req, res) => {
  try {
    const { boardId } = req.query;

    const labels = await Label.findAll({
      where: { boardId }
    });

    res.json(labels);
  } catch (error) {
    console.error('Get labels error:', error);
    res.status(500).json({ error: 'Failed to get labels' });
  }
};

const createLabel = async (req, res) => {
  try {
    const { name, color, boardId } = req.body;

    if (!boardId) {
      return res.status(400).json({ error: 'BoardId is required' });
    }

    const label = await Label.create({
      name: name || '',
      color: color || '#61bd4f',
      boardId
    });

    res.status(201).json(label);
  } catch (error) {
    console.error('Create label error:', error);
    res.status(500).json({ error: 'Failed to create label' });
  }
};

const updateLabel = async (req, res) => {
  try {
    const { name, color } = req.body;
    
    const label = await Label.findByPk(req.params.id);
    
    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }

    await label.update({ name, color });

    res.json(label);
  } catch (error) {
    console.error('Update label error:', error);
    res.status(500).json({ error: 'Failed to update label' });
  }
};

const deleteLabel = async (req, res) => {
  try {
    const label = await Label.findByPk(req.params.id);
    
    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }

    await label.destroy();

    res.json({ message: 'Label deleted' });
  } catch (error) {
    console.error('Delete label error:', error);
    res.status(500).json({ error: 'Failed to delete label' });
  }
};

module.exports = { getLabels, createLabel, updateLabel, deleteLabel };
