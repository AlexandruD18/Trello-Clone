import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import request from 'supertest';
import { io as connetti } from 'socket.io-client';
import { PASSWORD } from './helpers.js';

const require = createRequire(import.meta.url);
const { createApp } = require('../src/app');
const { BoardMember } = require('../src/models');

// Server vero su una porta libera: Socket.IO ha bisogno di una connessione reale.
const { app, server, io } = createApp();
let url;
const aperti = [];

const registra = async (nome) => {
    const email = `${nome.toLowerCase()}.${Date.now()}.${Math.random()}@esempio.it`;
    const res = await request(app)
        .post('/api/auth/register')
        .send({ email, password: PASSWORD, name: nome });
    return { ...res.body, auth: { Authorization: `Bearer ${res.body.token}` } };
};

const apriSocket = (token) =>
    new Promise((resolve, reject) => {
        const socket = connetti(url, {
            auth: { token },
            transports: ['websocket'],
            forceNew: true,
        });
        aperti.push(socket);
        socket.once('connect', () => resolve(socket));
        socket.once('connect_error', reject);
    });

const entra = (socket, boardId) =>
    new Promise((resolve) => socket.emit('join-board', boardId, resolve));

// Aspetta un evento; se non arriva entro il tempo indicato restituisce null.
const aspetta = (socket, evento, ms = 1500) =>
    new Promise((resolve) => {
        const timer = setTimeout(() => {
            socket.off(evento, gestore);
            resolve(null);
        }, ms);
        const gestore = (dati) => {
            clearTimeout(timer);
            resolve(dati);
        };
        socket.once(evento, gestore);
    });

describe('Socket.IO', () => {
    let anna;
    let bruno;
    let estraneo;
    let board;
    let lista;

    beforeAll(async () => {
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        url = `http://127.0.0.1:${server.address().port}`;

        anna = await registra('Anna');
        bruno = await registra('Bruno');
        estraneo = await registra('Estraneo');
        board = (
            await request(app)
                .post('/api/boards')
                .set(anna.auth)
                .send({ name: 'Condivisa', workspaceId: anna.workspace.id })
        ).body;
        await BoardMember.create({ boardId: board.id, userId: bruno.user.id, role: 'member' });
        lista = (
            await request(app)
                .post('/api/lists')
                .set(anna.auth)
                .send({ name: 'Da fare', boardId: board.id })
        ).body;
    });

    afterAll(async () => {
        aperti.forEach((s) => s.close());
        io.close();
        await new Promise((resolve) => server.close(resolve));
    });

    it('rifiuta la connessione senza token valido', async () => {
        await expect(apriSocket('token-falso')).rejects.toThrow();
    });

    it('non fa entrare nella stanza chi non ha accesso alla board', async () => {
        const socket = await apriSocket(estraneo.token);
        expect(await entra(socket, board.id)).toMatchObject({ ok: false });
        expect(await entra(socket, 'non-un-uuid')).toMatchObject({ ok: false });
    });

    it('invia agli altri membri le modifiche salvate, non a chi le ha fatte', async () => {
        const socketAnna = await apriSocket(anna.token);
        const socketBruno = await apriSocket(bruno.token);
        const socketEstraneo = await apriSocket(estraneo.token);
        expect(await entra(socketAnna, board.id)).toMatchObject({ ok: true });
        expect(await entra(socketBruno, board.id)).toMatchObject({ ok: true });
        await entra(socketEstraneo, board.id);

        const perBruno = aspetta(socketBruno, 'card:created');
        const perAnna = aspetta(socketAnna, 'card:created', 800);
        const perEstraneo = aspetta(socketEstraneo, 'card:created', 800);

        const res = await request(app)
            .post('/api/cards')
            .set(anna.auth)
            .set('X-Socket-Id', socketAnna.id)
            .send({ title: 'Nuova', listId: lista.id });
        expect(res.status).toBe(201);

        const evento = await perBruno;
        expect(evento).toMatchObject({ boardId: board.id, card: { id: res.body.id } });
        expect(await perAnna).toBeNull();
        expect(await perEstraneo).toBeNull();
    });

    it('non ritrasmette eventi inventati da un client', async () => {
        const socketAnna = await apriSocket(anna.token);
        const socketBruno = await apriSocket(bruno.token);
        await entra(socketAnna, board.id);
        await entra(socketBruno, board.id);

        const perBruno = aspetta(socketBruno, 'card:deleted', 800);
        socketAnna.emit('card:deleted', { boardId: board.id, cardId: 'qualsiasi' });

        expect(await perBruno).toBeNull();
    });

    it('ignora un X-Socket-Id che non appartiene a chi fa la richiesta', async () => {
        const socketBruno = await apriSocket(bruno.token);
        await entra(socketBruno, board.id);

        // Il nome della stanza al posto dell'id: prima zittiva tutta la board.
        const perStanza = aspetta(socketBruno, 'card:created');
        await request(app)
            .post('/api/cards')
            .set(anna.auth)
            .set('X-Socket-Id', `board:${board.id}`)
            .send({ title: 'Zitta?', listId: lista.id });
        expect(await perStanza).not.toBeNull();

        // L'id del socket di un collega: Bruno riceve comunque.
        const perCollega = aspetta(socketBruno, 'card:created');
        await request(app)
            .post('/api/cards')
            .set(anna.auth)
            .set('X-Socket-Id', socketBruno.id)
            .send({ title: 'Esclude Bruno?', listId: lista.id });
        expect(await perCollega).not.toBeNull();
    });

    it("un estraneo non annuncia l'uscita da una board che non segue", async () => {
        const socketBruno = await apriSocket(bruno.token);
        await entra(socketBruno, board.id);
        const socketEstraneo = await apriSocket(estraneo.token);

        const uscita = aspetta(socketBruno, 'user:left', 800);
        socketEstraneo.emit('leave-board', board.id);
        expect(await uscita).toBeNull();
    });

    it('con due schede aperte chiuderne una non fa uscire la persona', async () => {
        const osservatore = await apriSocket(bruno.token);
        await entra(osservatore, board.id);
        const carla = await registra('Carla');
        await BoardMember.create({ boardId: board.id, userId: carla.user.id, role: 'member' });
        const primaScheda = await apriSocket(carla.token);
        const secondaScheda = await apriSocket(carla.token);
        await entra(primaScheda, board.id);
        await entra(secondaScheda, board.id);

        const uscita = aspetta(osservatore, 'user:left', 800);
        primaScheda.close();
        expect(await uscita).toBeNull();

        const uscitaVera = aspetta(osservatore, 'user:left');
        secondaScheda.close();
        expect(await uscitaVera).toMatchObject({ userId: carla.user.id });
    });

    it('notifica le modifiche alle checklist come aggiornamento della card', async () => {
        const socketBruno = await apriSocket(bruno.token);
        await entra(socketBruno, board.id);
        const card = (
            await request(app)
                .post('/api/cards')
                .set(anna.auth)
                .send({ title: 'Con checklist', listId: lista.id })
        ).body;

        const perChecklist = aspetta(socketBruno, 'card:updated');
        const checklist = (
            await request(app)
                .post('/api/checklists')
                .set(anna.auth)
                .send({ title: 'Passi', cardId: card.id })
        ).body;
        expect((await perChecklist).card.id).toBe(card.id);

        const perElemento = aspetta(socketBruno, 'card:updated');
        await request(app)
            .post('/api/checklists/items')
            .set(anna.auth)
            .send({ title: 'Primo', checklistId: checklist.id });
        const evento = await perElemento;
        expect(evento.card).toMatchObject({ id: card.id, checklistTotal: 1, checklistDone: 0 });
    });
});
