import { createRequire } from 'node:module';
import request from 'supertest';

const require = createRequire(import.meta.url);
const { createApp } = require('../src/app');

export const { app } = createApp();
export const api = () => request(app);

let contatore = 0;

// Registra un utente nuovo e restituisce token, utente e workspace personale.
export const registraUtente = async (nome = 'Utente') => {
    contatore += 1;
    const email = `${nome.toLowerCase()}.${Date.now()}.${contatore}@esempio.it`;
    const res = await api()
        .post('/api/auth/register')
        .send({ email, password: 'password-sicura-1', name: nome });
    if (res.status !== 201) {
        throw new Error(`Registrazione fallita: ${res.status} ${JSON.stringify(res.body)}`);
    }
    return { ...res.body, email, auth: { Authorization: `Bearer ${res.body.token}` } };
};
