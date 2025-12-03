const express = require('express');
const router = express.Router();
const { createList, updateList, moveList, deleteList } = require('../controllers/listController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', createList);
router.put('/:id', updateList);
router.put('/:id/move', moveList);
router.delete('/:id', deleteList);

module.exports = router;
