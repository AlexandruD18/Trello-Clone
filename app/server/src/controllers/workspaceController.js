const { Workspace, WorkspaceMember, Board, User } = require('../models');

const getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.findAll({
      include: [
        {
          model: User,
          as: 'members',
          where: { id: req.userId },
          through: { attributes: ['role'] }
        },
        {
          model: Board,
          as: 'boards',
          where: { isArchived: false },
          required: false
        }
      ]
    });

    res.json(workspaces);
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ error: 'Failed to get workspaces' });
  }
};

const getWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'members',
          through: { attributes: ['role'] }
        },
        {
          model: Board,
          as: 'boards',
          where: { isArchived: false },
          required: false
        }
      ]
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    res.json(workspace);
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({ error: 'Failed to get workspace' });
  }
};

const createWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const workspace = await Workspace.create({
      name,
      description,
      ownerId: req.userId
    });

    await WorkspaceMember.create({
      workspaceId: workspace.id,
      userId: req.userId,
      role: 'admin'
    });

    res.status(201).json(workspace);
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
};

const updateWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const workspace = await Workspace.findByPk(req.params.id);
    
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    await workspace.update({ name, description });

    res.json(workspace);
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
};

const deleteWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findByPk(req.params.id);
    
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    if (workspace.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this workspace' });
    }

    await workspace.destroy();

    res.json({ message: 'Workspace deleted' });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
};

module.exports = { getWorkspaces, getWorkspace, createWorkspace, updateWorkspace, deleteWorkspace };
