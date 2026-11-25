import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import request from 'supertest';
import { io as connetti } from 'socket.io-client';
import { PASSWORD } from './helpers.js';

const require = createRequire(import.meta.url);
const { createApp } = require('../src/app');
const { CardMember } = require('../src/models');

// Server vero: serve anche per controllare l'uscita dal tempo reale.
const { app, server, io } = createApp();
let url;
const socketAperti = [];

const registra = async (nome) => {
    const email = `${nome.toLowerCase()}.${Date.now()}.${Math.random()}@esempio.it`;
    const res = await request(app)
        .post('/api/auth/register')
        .send({ email, password: PASSWORD, name: nome });
    return { ...res.body, email, auth: { Authorization: `Bearer ${res.body.token}` } };
};

const creaBoard = async (proprietario) =>
    (
        await request(app)
            .post('/api/boards')
            .set(proprietario.auth)
            .send({ name: 'Squadra', workspaceId: proprietario.workspace.id })
    ).body;

const invita = (chi, board, email, role) =>
    request(app).post(`/api/boards/${board.id}/members`).set(chi.auth).send({ email, role });

describe('membri della board', () => {
    let anna;

    beforeAll(async () => {
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        url = `http://127.0.0.1:${server.address().port}`;
        anna = await registra('Anna');
    });

    afterAll(async () => {
        socketAperti.forEach((s) => s.close());
        io.close();
        await new Promise((resolve) => server.close(resolve));
    });

    it("l'admin invita per email e la persona vede la board", async () => {
        const board = await creaBoard(anna);
        const bruno = await registra('Bruno');

        const res = await invita(anna, board, `  ${bruno.email.toUpperCase()} `, 'member');
        expect(res.status).toBe(201);
        expect(res.body).toEqual({
            id: bruno.user.id,
            name: 'Bruno',
            avatar: null,
            role: 'member',
        });
        expect((await request(app).get(`/api/boards/${board.id}`).set(bruno.auth)).status).toBe(
            200
        );

        expect((await invita(anna, board, bruno.email, 'member')).status).toBe(409);
        expect((await invita(anna, board, 'nessuno@esempio.it', 'member')).status).toBe(404);
        expect((await invita(anna, board, bruno.email, 'proprietario')).status).toBe(400);
    });

    it('solo un admin invita o cambia ruolo', async () => {
        const board = await creaBoard(anna);
        const membro = await registra('Membro');
        const altro = await registra('Altro');
        await invita(anna, board, membro.email, 'member');

        expect((await invita(membro, board, altro.email, 'member')).status).toBe(403);
        const cambio = await request(app)
            .put(`/api/boards/${board.id}/members/${membro.user.id}`)
            .set(membro.auth)
            .send({ role: 'admin' });
        expect(cambio.status).toBe(403);
    });

    it('la board tiene sempre almeno un admin', async () => {
        const board = await creaBoard(anna);
        const declassa = await request(app)
            .put(`/api/boards/${board.id}/members/${anna.user.id}`)
            .set(anna.auth)
            .send({ role: 'member' });
        expect(declassa.status).toBe(409);

        const esce = await request(app)
            .delete(`/api/boards/${board.id}/members/${anna.user.id}`)
            .set(anna.auth);
        expect(esce.status).toBe(409);
    });

    it('ognuno può lasciare la board, ma non togliere gli altri', async () => {
        const board = await creaBoard(anna);
        const viewer = await registra('Viewer');
        const membro = await registra('Membro');
        await invita(anna, board, viewer.email, 'viewer');
        await invita(anna, board, membro.email, 'member');

        const togliAltri = await request(app)
            .delete(`/api/boards/${board.id}/members/${membro.user.id}`)
            .set(viewer.auth);
        expect(togliAltri.status).toBe(403);

        const lascia = await request(app)
            .delete(`/api/boards/${board.id}/members/${viewer.user.id}`)
            .set(viewer.auth);
        expect(lascia.status).toBe(200);
        expect((await request(app).get(`/api/boards/${board.id}`).set(viewer.auth)).status).toBe(
            403
        );
    });

    it('un join-board in corso durante la rimozione non resta nella stanza', async () => {
        const board = await creaBoard(anna);
        const lista = (
            await request(app)
                .post('/api/lists')
                .set(anna.auth)
                .send({ name: 'L', boardId: board.id })
        ).body;
        for (let giro = 0; giro < 5; giro += 1) {
            const dario = await registra('Dario');
            await invita(anna, board, dario.email, 'member');
            const socket = connetti(url, {
                auth: { token: dario.token },
                transports: ['websocket'],
            });
            socketAperti.push(socket);
            await new Promise((resolve) => socket.once('connect', resolve));

            // join e rimozione partono insieme.
            const join = new Promise((resolve) => socket.emit('join-board', board.id, resolve));
            await request(app)
                .delete(`/api/boards/${board.id}/members/${dario.user.id}`)
                .set(anna.auth);
            await join;

            let ricevuto = false;
            socket.on('card:created', () => {
                ricevuto = true;
            });
            await request(app)
                .post('/api/cards')
                .set(anna.auth)
                .send({ title: `Dopo ${giro}`, listId: lista.id });
            await new Promise((r) => setTimeout(r, 300));
            expect(ricevuto).toBe(false);
            socket.close();
        }
    });

    it('due admin che si tolgono insieme: uno resta, nessun errore 500', async () => {
        const board = await creaBoard(anna);
        const secondo = await registra('Secondo');
        await invita(anna, board, secondo.email, 'admin');

        const [a, b] = await Promise.all([
            request(app).delete(`/api/boards/${board.id}/members/${anna.user.id}`).set(anna.auth),
            request(app)
                .delete(`/api/boards/${board.id}/members/${secondo.user.id}`)
                .set(secondo.auth),
        ]);
        expect([a.status, b.status].sort()).toEqual([200, 409]);
    });

    it('le email dei membri non escono da board, card e commenti', async () => {
        const board = await creaBoard(anna);
        const eva = await registra('Eva');
        await invita(anna, board, eva.email, 'viewer');
        const lista = (
            await request(app)
                .post('/api/lists')
                .set(anna.auth)
                .send({ name: 'L', boardId: board.id })
        ).body;
        const card = (
            await request(app)
                .post('/api/cards')
                .set(anna.auth)
                .send({ title: 'C', listId: lista.id })
        ).body;
        await request(app)
            .post(`/api/cards/${card.id}/members`)
            .set(anna.auth)
            .send({ userId: anna.user.id });
        await request(app)
            .post('/api/comments')
            .set(anna.auth)
            .send({ text: 'x', cardId: card.id });

        const risposte = await Promise.all([
            request(app).get('/api/boards').set(eva.auth),
            request(app).get(`/api/boards/${board.id}`).set(eva.auth),
            request(app).get(`/api/cards/${card.id}`).set(eva.auth),
            request(app).get(`/api/comments?cardId=${card.id}`).set(eva.auth),
        ]);
        for (const r of risposte) {
            expect(r.status).toBe(200);
            expect(JSON.stringify(r.body)).not.toContain(anna.email);
        }
        const profilo = await request(app).get('/api/auth/me').set(eva.auth);
        expect(profilo.body.user.email).toBe(eva.email);
    });

    it("su una board archiviata l'admin può ancora togliere persone", async () => {
        const board = await creaBoard(anna);
        const fabio = await registra('Fabio');
        await invita(anna, board, fabio.email, 'member');
        await request(app).delete(`/api/boards/${board.id}`).set(anna.auth);

        expect((await invita(anna, board, 'altro@esempio.it', 'member')).status).toBe(403);
        const togli = await request(app)
            .delete(`/api/boards/${board.id}/members/${fabio.user.id}`)
            .set(anna.auth);
        expect(togli.status).toBe(200);
    });

    it('chi viene tolto perde le card assegnate ed esce subito dal tempo reale', async () => {
        const board = await creaBoard(anna);
        const carla = await registra('Carla');
        await invita(anna, board, carla.email, 'member');
        const lista = (
            await request(app)
                .post('/api/lists')
                .set(anna.auth)
                .send({ name: 'L', boardId: board.id })
        ).body;
        const card = (
            await request(app)
                .post('/api/cards')
                .set(anna.auth)
                .send({ title: 'C', listId: lista.id })
        ).body;
        await request(app)
            .post(`/api/cards/${card.id}/members`)
            .set(anna.auth)
            .send({ userId: carla.user.id });

        const socket = connetti(url, { auth: { token: carla.token }, transports: ['websocket'] });
        socketAperti.push(socket);
        await new Promise((resolve) => socket.once('connect', resolve));
        await new Promise((resolve) => socket.emit('join-board', board.id, resolve));

        const revoca = new Promise((resolve) => socket.once('board:accesso-revocato', resolve));
        const res = await request(app)
            .delete(`/api/boards/${board.id}/members/${carla.user.id}`)
            .set(anna.auth);
        expect(res.status).toBe(200);
        expect(await revoca).toEqual({ boardId: board.id });

        expect(await CardMember.count({ where: { cardId: card.id, userId: carla.user.id } })).toBe(
            0
        );

        // Nessun evento della board le arriva più.
        let ricevuto = false;
        socket.on('card:created', () => {
            ricevuto = true;
        });
        await request(app)
            .post('/api/cards')
            .set(anna.auth)
            .send({ title: 'Dopo', listId: lista.id });
        await new Promise((r) => setTimeout(r, 600));
        expect(ricevuto).toBe(false);
    });
});
