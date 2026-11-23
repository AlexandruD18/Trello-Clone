const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { jwtSecret: JWT_SECRET } = require('../config/env');

// Verifica un token di sessione e restituisce il payload (lancia se non valido).
const verifyToken = (token) => jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        const decoded = verifyToken(token);

        const user = await User.findByPk(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        req.userId = user.id;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
};

const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });
};

module.exports = { authenticate, generateToken, verifyToken };
