const express = require('express');
const router = express.Router();
const { getBoards, getBoard, createBoard, updateBoard, deleteBoard } = require('../controllers/boardController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', getBoards);
router.get('/:id', getBoard);
router.post('/', createBoard);
router.put('/:id', updateBoard);
router.delete('/:id', deleteBoard);

module.exports = router;
