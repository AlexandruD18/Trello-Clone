const express = require('express');
const router = express.Router();
const { createList, updateList, moveList, deleteList } = require('../controllers/listController');
const { authenticate } = require('../middleware/auth');
const { autorizza, daParametro, daCorpo } = require('../middleware/permessi');

const { restoreList } = require('../controllers/archivioController');

router.use(authenticate);

router.post('/', autorizza('board', daCorpo('boardId'), 'member'), createList);
router.put('/:id', autorizza('list', daParametro(), 'member'), updateList);
router.put('/:id/move', autorizza('list', daParametro(), 'member'), moveList);
router.delete('/:id', autorizza('list', daParametro(), 'member'), deleteList);
router.post(
    '/:id/restore',
    autorizza('list', daParametro(), 'member', { ancheArchiviata: true }),
    restoreList
);

module.exports = router;
