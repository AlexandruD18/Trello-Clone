const express = require('express');
const router = express.Router();
const {
    getBoards,
    getBoard,
    createBoard,
    updateBoard,
    deleteBoard,
} = require('../controllers/boardController');
const { authenticate } = require('../middleware/auth');
const { autorizza, daParametro, daCorpo } = require('../middleware/permessi');

router.use(authenticate);

router.get('/', getBoards);
router.get('/:id', autorizza('board', daParametro()), getBoard);
router.post('/', autorizza('workspace', daCorpo('workspaceId'), 'member'), createBoard);
router.put('/:id', autorizza('board', daParametro(), 'admin'), updateBoard);
router.delete('/:id', autorizza('board', daParametro(), 'admin'), deleteBoard);

module.exports = router;
