const express = require('express');
const router = express.Router();
const { getComments, createComment, updateComment, deleteComment } = require('../controllers/commentController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', getComments);
router.post('/', createComment);
router.put('/:id', updateComment);
router.delete('/:id', deleteComment);

module.exports = router;
