const express = require('express');
const router = express.Router();
const { getWorkspaces, getWorkspace, createWorkspace, updateWorkspace, deleteWorkspace } = require('../controllers/workspaceController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', getWorkspaces);
router.get('/:id', getWorkspace);
router.post('/', createWorkspace);
router.put('/:id', updateWorkspace);
router.delete('/:id', deleteWorkspace);

module.exports = router;
