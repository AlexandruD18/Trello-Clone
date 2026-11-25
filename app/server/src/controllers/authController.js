const bcrypt = require('bcryptjs');
const { sequelize, User, Workspace, WorkspaceMember } = require('../models');
const { impostaSessione, cancellaSessione } = require('../middleware/auth');
const { chiudiSocketUtente } = require('../socket/eventi');
const { validaRegistrazione, validaLogin, normalizzaEmail } = require('../validation/auth');

// Hash di una password qualsiasi: se l'email non esiste il login impiega
// comunque il tempo di un confronto bcrypt e non rivela quali account esistono.
const HASH_FITTIZIO = bcrypt.hashSync('password-inesistente', 10);

const register = async (req, res) => {
    try {
        const errore = validaRegistrazione(req.body);
        if (errore) {
            return res.status(400).json({ error: errore });
        }

        const email = normalizzaEmail(req.body.email);
        const name = req.body.name.trim();
        const { password } = req.body;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: 'Esiste già un account con questa email' });
        }

        const { user, workspace } = await sequelize.transaction(async (transaction) => {
            const nuovoUtente = await User.create({ email, password, name }, { transaction });
            const nuovoWorkspace = await Workspace.create(
                {
                    name: `Workspace di ${name}`,
                    description: 'Il mio workspace personale',
                    ownerId: nuovoUtente.id,
                },
                { transaction }
            );
            await WorkspaceMember.create(
                { workspaceId: nuovoWorkspace.id, userId: nuovoUtente.id, role: 'admin' },
                { transaction }
            );
            return { user: nuovoUtente, workspace: nuovoWorkspace };
        });

        impostaSessione(res, user);
        res.status(201).json({ user: user.toJSON(), workspace });
    } catch (error) {
        // Due registrazioni simultanee con la stessa email: vince la prima.
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Esiste già un account con questa email' });
        }
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registrazione non riuscita' });
    }
};

const login = async (req, res) => {
    try {
        const errore = validaLogin(req.body);
        if (errore) {
            return res.status(400).json({ error: errore });
        }

        const email = normalizzaEmail(req.body.email);
        const user = await User.scope('withPassword').findOne({ where: { email } });
        const passwordValida = await bcrypt.compare(
            req.body.password,
            user ? user.password : HASH_FITTIZIO
        );

        if (!user || !passwordValida) {
            return res.status(401).json({ error: 'Email o password non corrette' });
        }

        impostaSessione(res, user);
        res.json({ user: user.toJSON() });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Accesso non riuscito' });
    }
};

const me = async (req, res) => {
    res.json({ user: req.user.toJSON() });
};

// Esci da questo dispositivo: il cookie viene cancellato.
const logout = (req, res) => {
    cancellaSessione(res);
    res.json({ message: 'Sei uscito' });
};

// Esci da tutti i dispositivi: la versione della sessione cresce e ogni token già
// emesso (anche su altri computer o telefoni) smette di valere.
const logoutAll = async (req, res) => {
    try {
        await req.user.increment('sessionVersion');
        chiudiSocketUtente(req.user.id);
        cancellaSessione(res);
        res.json({ message: 'Sei uscito da tutti i dispositivi' });
    } catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({ error: 'Uscita non riuscita' });
    }
};

module.exports = { register, login, me, logout, logoutAll };
