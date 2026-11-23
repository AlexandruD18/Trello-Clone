const express = require('express');
const router = express.Router();
const {
    getComments,
    createComment,
    updateComment,
    deleteComment,
} = require('../controllers/commentController');
const { authenticate } = require('../middleware/auth');
const { autorizza, daParametro, daCorpo, daQuery } = require('../middleware/permessi');

router.use(authenticate);

router.get('/', autorizza('card', daQuery('cardId')), getComments);
router.post('/', autorizza('card', daCorpo('cardId'), 'member'), createComment);
router.put('/:id', autorizza('comment', daParametro(), 'member'), updateComment);
router.delete('/:id', autorizza('comment', daParametro(), 'member'), deleteComment);

module.exports = router;
