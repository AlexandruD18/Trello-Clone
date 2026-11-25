import { describe, it, expect } from 'vitest';
import { api, registraUtente, PASSWORD, SBAGLIATA, nuovaPassword } from './helpers.js';

describe('autenticazione', () => {
    it('registra un utente e crea il suo workspace personale', async () => {
        const utente = await registraUtente('Anna');

        expect(utente.token).toMatch(/^sessione=/);
        expect(utente).not.toHaveProperty('user.password');
        expect(utente.user.email).toBe(utente.email);
        expect(utente.user).not.toHaveProperty('password');
        expect(utente.workspace.ownerId).toBe(utente.user.id);
    });

    it('rifiuta una seconda registrazione con la stessa email', async () => {
        const utente = await registraUtente('Bruno');
        const res = await api().post('/api/auth/register').send({
            email: utente.email.toUpperCase(),
            password: nuovaPassword(),
            name: 'Bruno',
        });

        expect(res.status).toBe(409);
    });

    it('fa login con le credenziali giuste', async () => {
        const utente = await registraUtente('Carla');
        const res = await api()
            .post('/api/auth/login')
            .send({ email: utente.email, password: PASSWORD });

        expect(res.status).toBe(200);
        expect(res.body).not.toHaveProperty('token');
        expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/);
    });

    it('rifiuta il login con la password sbagliata', async () => {
        const utente = await registraUtente('Dario');
        const res = await api()
            .post('/api/auth/login')
            .send({ email: utente.email, password: SBAGLIATA });

        expect(res.status).toBe(401);
    });

    it('protegge le route senza token', async () => {
        const res = await api().get('/api/boards');

        expect(res.status).toBe(401);
    });

    it('restituisce il profilo con /me', async () => {
        const utente = await registraUtente('Elena');
        const res = await api().get('/api/auth/me').set(utente.auth);

        expect(res.status).toBe(200);
        expect(res.body.user.id).toBe(utente.user.id);
    });
});
