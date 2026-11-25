const express = require('express');
const router = express.Router();
const {
    getBoards,
    getBoard,
    createBoard,
    updateBoard,
    deleteBoard,
    restoreBoard,
} = require('../controllers/boardController');
const { authenticate } = require('../middleware/auth');
const { autorizza, daParametro, daCorpo } = require('../middleware/permessi');

const { getArchiviati } = require('../controllers/archivioController');

router.use(authenticate);

router.get('/', getBoards);
router.get('/:id', autorizza('board', daParametro()), getBoard);
router.get('/:id/archiviati', autorizza('board', daParametro()), getArchiviati);
router.post('/', autorizza('workspace', daCorpo('workspaceId'), 'member'), createBoard);
router.put('/:id', autorizza('board', daParametro(), 'admin'), updateBoard);
router.delete('/:id', autorizza('board', daParametro(), 'admin'), deleteBoard);
router.post(
    '/:id/restore',
    autorizza('board', daParametro(), 'admin', { ancheArchiviata: true }),
    restoreBoard
);

module.exports = router;
