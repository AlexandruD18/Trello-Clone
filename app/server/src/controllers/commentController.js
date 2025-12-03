const { Comment, User } = require('../models');

const getComments = async (req, res) => {
  try {
    const { cardId } = req.query;

    const comments = await Comment.findAll({
      where: { cardId },
      include: [{ model: User, as: 'author' }],
      order: [['createdAt', 'DESC']]
    });

    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
};

const createComment = async (req, res) => {
  try {
    const { text, cardId } = req.body;

    if (!text || !cardId) {
      return res.status(400).json({ error: 'Text and cardId are required' });
    }

    const comment = await Comment.create({
      text,
      cardId,
      authorId: req.userId
    });

    const fullComment = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'author' }]
    });

    res.status(201).json(fullComment);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

const updateComment = async (req, res) => {
  try {
    const { text } = req.body;
    
    const comment = await Comment.findByPk(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.authorId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to edit this comment' });
    }

    await comment.update({ text });

    const fullComment = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'author' }]
    });

    res.json(fullComment);
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
};

const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.authorId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    await comment.destroy();

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

module.exports = { getComments, createComment, updateComment, deleteComment };
