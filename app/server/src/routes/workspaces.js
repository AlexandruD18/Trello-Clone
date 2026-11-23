const express = require('express');
const router = express.Router();
const {
    getWorkspaces,
    getWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
} = require('../controllers/workspaceController');
const { authenticate } = require('../middleware/auth');
const { autorizza, daParametro } = require('../middleware/permessi');

router.use(authenticate);

router.get('/', getWorkspaces);
router.get('/:id', autorizza('workspace', daParametro()), getWorkspace);
router.post('/', createWorkspace);
router.put('/:id', autorizza('workspace', daParametro(), 'admin'), updateWorkspace);
router.delete('/:id', autorizza('workspace', daParametro(), 'admin'), deleteWorkspace);

module.exports = router;
