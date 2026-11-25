const express = require('express');
const router = express.Router();
const {
    getBoards,
    getBoard,
    createBoard,
    updateBoard,
    deleteBoard,
    restoreBoard,
} = require('../controllers/boardController');
const { rateLimit } = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const {
    addBoardMember,
    updateBoardMember,
    removeBoardMember,
} = require('../controllers/membriController');
const { autorizza, daParametro, daCorpo } = require('../middleware/permessi');

router.use(authenticate);

router.get('/', getBoards);
router.get('/:id', autorizza('board', daParametro()), getBoard);
router.post('/', autorizza('workspace', daCorpo('workspaceId'), 'member'), createBoard);
router.put('/:id', autorizza('board', daParametro(), 'admin'), updateBoard);
router.delete('/:id', autorizza('board', daParametro(), 'admin'), deleteBoard);
router.post(
    '/:id/restore',
    autorizza('board', daParametro(), 'admin', { ancheArchiviata: true }),
    restoreBoard
);

// Membri della board: invitare e cambiare ruolo spetta agli admin; per togliere
// basta essere viewer, perché ognuno può lasciare la board (il controller verifica il resto).
// Gli inviti per email rivelano se un account esiste: al massimo 30 all'ora per persona.
const limiteInviti = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 30,
    keyGenerator: (req) => req.userId,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Troppi inviti in poco tempo. Riprova più tardi.' },
});

router.post(
    '/:id/members',
    autorizza('board', daParametro(), 'admin'),
    limiteInviti,
    addBoardMember
);
router.put('/:id/members/:userId', autorizza('board', daParametro(), 'admin'), updateBoardMember);
router.delete('/:id/members/:userId', autorizza('board', daParametro()), removeBoardMember);

module.exports = router;
