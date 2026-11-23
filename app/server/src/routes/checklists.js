const express = require('express');
const router = express.Router();
const {
    createChecklist,
    updateChecklist,
    deleteChecklist,
    createChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
} = require('../controllers/checklistController');
const { authenticate } = require('../middleware/auth');
const { autorizza, daParametro, daCorpo } = require('../middleware/permessi');

router.use(authenticate);

router.post('/', autorizza('card', daCorpo('cardId'), 'member'), createChecklist);
router.put('/:id', autorizza('checklist', daParametro(), 'member'), updateChecklist);
router.delete('/:id', autorizza('checklist', daParametro(), 'member'), deleteChecklist);
router.post(
    '/items',
    autorizza('checklist', daCorpo('checklistId'), 'member'),
    createChecklistItem
);
router.put('/items/:id', autorizza('checklistItem', daParametro(), 'member'), updateChecklistItem);
router.delete(
    '/items/:id',
    autorizza('checklistItem', daParametro(), 'member'),
    deleteChecklistItem
);

module.exports = router;
