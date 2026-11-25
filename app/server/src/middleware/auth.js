const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { User } = require('../models');
const config = require('../config/env');

const NOME_COOKIE = 'sessione';
const DURATA_MS = 7 * 24 * 60 * 60 * 1000;

// Verifica un token di sessione e restituisce il payload (lancia se non valido).
const verifyToken = (token) => jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });

// Il token contiene la versione della sessione dell'utente: quando cambia, non vale più.
const generateToken = (user) =>
    jwt.sign({ userId: user.id, v: user.sessionVersion || 0 }, config.jwtSecret, {
        algorithm: 'HS256',
        expiresIn: Math.floor(DURATA_MS / 1000),
    });

// Il token sta in un cookie httpOnly: gli script della pagina non possono leggerlo.
const opzioniCookie = () => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: config.https,
    path: '/',
});

const impostaSessione = (res, user) => {
    res.cookie(NOME_COOKIE, generateToken(user), { ...opzioniCookie(), maxAge: DURATA_MS });
};

const cancellaSessione = (res) => {
    res.clearCookie(NOME_COOKIE, opzioniCookie());
};

const tokenDaCookie = (intestazioneCookie) =>
    intestazioneCookie ? cookie.parse(intestazioneCookie)[NOME_COOKIE] || null : null;

// Dal token all'utente, controllando che la sessione non sia stata chiusa altrove.
const utenteDaToken = async (token) => {
    const payload = verifyToken(token);
    const user = await User.findByPk(payload.userId);
    if (!user || (payload.v || 0) !== user.sessionVersion) return null;
    return { user, payload };
};

const authenticate = async (req, res, next) => {
    const token = tokenDaCookie(req.headers.cookie);
    if (!token) {
        return res.status(401).json({ error: 'Devi accedere per continuare' });
    }
    try {
        const sessione = await utenteDaToken(token);
        if (!sessione) {
            cancellaSessione(res);
            return res.status(401).json({ error: 'Sessione non più valida: accedi di nuovo' });
        }
        req.user = sessione.user;
        req.userId = sessione.user.id;
        next();
    } catch (error) {
        cancellaSessione(res);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Sessione scaduta: accedi di nuovo' });
        }
        return res.status(401).json({ error: 'Sessione non valida' });
    }
};

/**
 * Un'origine è ammessa se coincide con l'host della richiesta (stesso sito) o è
 * dichiarata in CORS_ORIGINS. Serve contro il CSRF e il cross-site WebSocket hijacking:
 * il cookie di sessione viaggia da solo, quindi bisogna sapere da quale sito parte la richiesta.
 */
const origineAmmessa = (origine, host, corsOrigins = config.corsOrigins) => {
    if (!origine) return true; // stesso sito senza Origin o client non browser
    if (corsOrigins.includes(origine)) return true;
    try {
        return new URL(origine).host === host;
    } catch {
        return false;
    }
};

const METODI_SICURI = new Set(['GET', 'HEAD', 'OPTIONS']);

const controllaOrigine =
    (corsOrigins = config.corsOrigins) =>
    (req, res, next) => {
        if (METODI_SICURI.has(req.method)) return next();
        if (origineAmmessa(req.get('origin'), req.get('host'), corsOrigins)) return next();
        return res.status(403).json({ error: 'Richiesta da un sito non autorizzato' });
    };

module.exports = {
    authenticate,
    verifyToken,
    generateToken,
    impostaSessione,
    cancellaSessione,
    tokenDaCookie,
    utenteDaToken,
    origineAmmessa,
    controllaOrigine,
};
