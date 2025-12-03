const express = require('express');
const router = express.Router();
const { getLabels, createLabel, updateLabel, deleteLabel } = require('../controllers/labelController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', getLabels);
router.post('/', createLabel);
router.put('/:id', updateLabel);
router.delete('/:id', deleteLabel);

module.exports = router;
