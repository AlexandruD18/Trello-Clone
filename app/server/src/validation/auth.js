// Controlli sui dati di registrazione e login. Restituiscono un messaggio
// d'errore leggibile oppure null se i dati vanno bene.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_MIN = 8;
// bcrypt considera solo i primi 72 byte: oltre, due password diverse coinciderebbero.
const PASSWORD_MAX_BYTE = 72;
const NOME_MAX = 100;

const normalizzaEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

const validaRegistrazione = ({ email, password, name }) => {
    if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string') {
        return 'Email, password e nome sono obbligatori';
    }
    const nome = name.trim();
    if (!nome) return 'Il nome è obbligatorio';
    if (nome.length > NOME_MAX) return `Il nome può avere al massimo ${NOME_MAX} caratteri`;
    const mail = normalizzaEmail(email);
    if (mail.length > 255 || !EMAIL.test(mail)) return "L'indirizzo email non è valido";
    if (password.length < PASSWORD_MIN) {
        return `La password deve avere almeno ${PASSWORD_MIN} caratteri`;
    }
    if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTE) {
        return `La password può avere al massimo ${PASSWORD_MAX_BYTE} byte`;
    }
    return null;
};

const validaLogin = ({ email, password }) => {
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
        return 'Email e password sono obbligatorie';
    }
    return null;
};

module.exports = { validaRegistrazione, validaLogin, normalizzaEmail };
