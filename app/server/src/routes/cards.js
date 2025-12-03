const express = require('express');
const router = express.Router();
const { 
  getCard, createCard, updateCard, moveCard, deleteCard,
  addMember, removeMember, addLabel, removeLabel 
} = require('../controllers/cardController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/:id', getCard);
router.post('/', createCard);
router.put('/:id', updateCard);
router.put('/:id/move', moveCard);
router.delete('/:id', deleteCard);
router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);
router.post('/:id/labels', addLabel);
router.delete('/:id/labels/:labelId', removeLabel);

module.exports = router;
