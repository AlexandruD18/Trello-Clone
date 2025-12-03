const express = require('express');
const router = express.Router();
const { 
  createChecklist, updateChecklist, deleteChecklist,
  createChecklistItem, updateChecklistItem, deleteChecklistItem 
} = require('../controllers/checklistController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', createChecklist);
router.put('/:id', updateChecklist);
router.delete('/:id', deleteChecklist);
router.post('/items', createChecklistItem);
router.put('/items/:id', updateChecklistItem);
router.delete('/items/:id', deleteChecklistItem);

module.exports = router;
