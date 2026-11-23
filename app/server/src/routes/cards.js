const express = require('express');
const router = express.Router();
const {
    getCard,
    createCard,
    updateCard,
    moveCard,
    deleteCard,
    addMember,
    removeMember,
    addLabel,
    removeLabel,
} = require('../controllers/cardController');
const { authenticate } = require('../middleware/auth');
const { autorizza, daParametro, daCorpo } = require('../middleware/permessi');

// Tutte le modifiche a una card richiedono il ruolo member sulla sua board.
const modifica = autorizza('card', daParametro(), 'member');

router.use(authenticate);

router.get('/:id', autorizza('card', daParametro()), getCard);
router.post('/', autorizza('list', daCorpo('listId'), 'member'), createCard);
router.put('/:id', modifica, updateCard);
router.put('/:id/move', modifica, moveCard);
router.delete('/:id', modifica, deleteCard);
router.post('/:id/members', modifica, addMember);
router.delete('/:id/members/:userId', modifica, removeMember);
router.post('/:id/labels', modifica, addLabel);
router.delete('/:id/labels/:labelId', modifica, removeLabel);

module.exports = router;
