const express = require('express');
const router = express.Router();
const { createList, updateList, moveList, deleteList } = require('../controllers/listController');
const { authenticate } = require('../middleware/auth');
const { autorizza, daParametro, daCorpo } = require('../middleware/permessi');

router.use(authenticate);

router.post('/', autorizza('board', daCorpo('boardId'), 'member'), createList);
router.put('/:id', autorizza('list', daParametro(), 'member'), updateList);
router.put('/:id/move', autorizza('list', daParametro(), 'member'), moveList);
router.delete('/:id', autorizza('list', daParametro(), 'member'), deleteList);

module.exports = router;
