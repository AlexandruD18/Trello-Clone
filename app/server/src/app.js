const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const config = require('./config/env');
const { setupSocketHandlers } = require('./socket/socketHandler');

const authRoutes = require('./routes/auth');
const workspaceRoutes = require('./routes/workspaces');
const boardRoutes = require('./routes/boards');
const listRoutes = require('./routes/lists');
const cardRoutes = require('./routes/cards');
const checklistRoutes = require('./routes/checklists');
const commentRoutes = require('./routes/comments');
const labelRoutes = require('./routes/labels');

// Crea app Express, server HTTP e Socket.IO senza metterli in ascolto:
// index.js li avvia, i test li usano direttamente.
const createApp = ({ authRateLimit = config.authRateLimit } = {}) => {
    const app = express();
    // Dietro un proxy (nginx) serve l'IP reale del client per il rate limit.
    app.set('trust proxy', 1);
    const server = http.createServer(app);

    const io = new Server(server, {
        cors: {
            origin: [
                'http://localhost:5000',
                'http://localhost:8181',
                'http://0.0.0.0:5000',
                'http://localhost:5173',
            ],
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            credentials: true,
        },
    });

    setupSocketHandlers(io);

    app.use(
        cors({
            origin: ['http://localhost:5000', 'http://localhost:8181', 'http://0.0.0.0:5000'],
            credentials: true,
        })
    );

    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                    'font-src': ["'self'", 'https://fonts.gstatic.com'],
                    'img-src': ["'self'", 'data:', 'https:'],
                    'connect-src': ["'self'", 'ws:', 'wss:'],
                },
            },
        })
    );

    app.use(express.json({ limit: '100kb' }));
    app.use(express.urlencoded({ extended: true, limit: '100kb' }));

    // Freno ai tentativi di indovinare le password e alle registrazioni in massa.
    const limiteAutenticazione = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: authRateLimit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: 'Troppi tentativi. Riprova tra qualche minuto.' },
    });
    app.use('/api/auth/login', limiteAutenticazione);
    app.use('/api/auth/register', limiteAutenticazione);

    app.use('/api/auth', authRoutes);
    app.use('/api/workspaces', workspaceRoutes);
    app.use('/api/boards', boardRoutes);
    app.use('/api/lists', listRoutes);
    app.use('/api/cards', cardRoutes);
    app.use('/api/checklists', checklistRoutes);
    app.use('/api/comments', commentRoutes);
    app.use('/api/labels', labelRoutes);

    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // In produzione lo stesso processo serve anche il client compilato.
    if (process.env.NODE_ENV === 'production') {
        const clientDist = path.resolve(__dirname, '../../client/dist');
        app.use(express.static(clientDist));
        app.get(/^\/(?!api\/|socket\.io\/).*/, (req, res) => {
            res.sendFile(path.join(clientDist, 'index.html'));
        });
    }

    app.use((err, req, res, _next) => {
        // JSON malformato o corpo troppo grande: errore del client, non del server.
        if (err.type === 'entity.parse.failed') {
            return res.status(400).json({ error: 'Il corpo della richiesta non è JSON valido' });
        }
        if (err.type === 'entity.too.large') {
            return res.status(413).json({ error: 'Richiesta troppo grande' });
        }
        console.error('Error:', err);
        res.status(500).json({ error: 'Errore interno del server' });
    });

    return { app, server, io };
};

module.exports = { createApp };
