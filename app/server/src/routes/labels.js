const express = require('express');
const router = express.Router();
const {
    getLabels,
    createLabel,
    updateLabel,
    deleteLabel,
} = require('../controllers/labelController');
const { authenticate } = require('../middleware/auth');
const { autorizza, daParametro, daCorpo, daQuery } = require('../middleware/permessi');

router.use(authenticate);

router.get('/', autorizza('board', daQuery('boardId')), getLabels);
router.post('/', autorizza('board', daCorpo('boardId'), 'member'), createLabel);
router.put('/:id', autorizza('label', daParametro(), 'member'), updateLabel);
router.delete('/:id', autorizza('label', daParametro(), 'member'), deleteLabel);

module.exports = router;
