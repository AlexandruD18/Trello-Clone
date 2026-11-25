import { createRequire } from 'node:module';
import request from 'supertest';
import { randomBytes } from 'node:crypto';

const require = createRequire(import.meta.url);
const { createApp } = require('../src/app');

export const { app } = createApp();

// Password dei test generate a ogni esecuzione: nel codice non ne resta nessuna.
export const nuovaPassword = () => `pw-${randomBytes(12).toString('hex')}`;
export const PASSWORD = nuovaPassword();
export const SBAGLIATA = nuovaPassword();
export const api = () => request(app);

// Dalla risposta di login o registrazione al valore da mandare nell'header Cookie.
export const cookieSessione = (res) => {
    const riga = (res.headers['set-cookie'] || []).find((c) => c.startsWith('sessione='));
    return riga ? riga.split(';')[0] : null;
};

let contatore = 0;

// Registra un utente nuovo e restituisce utente, workspace personale e il cookie
// di sessione (token = valore dell'header Cookie, auth = header da passare a .set()).
export const registraUtente = async (nome = 'Utente') => {
    contatore += 1;
    const email = `${nome.toLowerCase()}.${Date.now()}.${contatore}@esempio.it`;
    const res = await api()
        .post('/api/auth/register')
        .send({ email, password: PASSWORD, name: nome });
    if (res.status !== 201) {
        throw new Error(`Registrazione fallita: ${res.status} ${JSON.stringify(res.body)}`);
    }
    const token = cookieSessione(res);
    return { ...res.body, email, token, auth: { Cookie: token } };
};
