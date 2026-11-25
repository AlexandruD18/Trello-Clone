const express = require('express');
const router = express.Router();
const { register, login, me, logout, logoutAll } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, me);
router.post('/logout', logout);
router.post('/logout-all', authenticate, logoutAll);

module.exports = router;
