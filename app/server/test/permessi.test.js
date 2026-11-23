import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { api, registraUtente } from './helpers.js';

const require = createRequire(import.meta.url);
const { BoardMember } = require('../src/models');

// Crea una board completa: lista, card, checklist con un elemento, commento.
const creaBoard = async (utente, nome = 'Progetto') => {
    const board = (
        await api()
            .post('/api/boards')
            .set(utente.auth)
            .send({ name: nome, workspaceId: utente.workspace.id })
    ).body;
    const list = (
        await api().post('/api/lists').set(utente.auth).send({ name: 'Da fare', boardId: board.id })
    ).body;
    const card = (
        await api().post('/api/cards').set(utente.auth).send({ title: 'Prima', listId: list.id })
    ).body;
    const checklist = (
        await api()
            .post('/api/checklists')
            .set(utente.auth)
            .send({ title: 'Passi', cardId: card.id })
    ).body;
    const item = (
        await api()
            .post('/api/checklists/items')
            .set(utente.auth)
            .send({ title: 'Uno', checklistId: checklist.id })
    ).body;
    const comment = (
        await api().post('/api/comments').set(utente.auth).send({ text: 'Ciao', cardId: card.id })
    ).body;
    return { board, list, card, checklist, item, comment, label: board.labels[0] };
};

describe('permessi', () => {
    let anna;
    let estraneo;
    let dati;

    beforeAll(async () => {
        anna = await registraUtente('Anna');
        estraneo = await registraUtente('Estraneo');
        dati = await creaBoard(anna);
    });

    it('la proprietaria vede e modifica la sua board', async () => {
        expect((await api().get(`/api/boards/${dati.board.id}`).set(anna.auth)).status).toBe(200);
        expect((await api().get(`/api/cards/${dati.card.id}`).set(anna.auth)).status).toBe(200);
        expect(dati.item.id).toBeDefined();
        expect(dati.comment.id).toBeDefined();
    });

    it("l'elenco delle board non mostra quelle degli altri", async () => {
        const mie = await api().get('/api/boards').set(estraneo.auth);
        expect(mie.status).toBe(200);
        expect(mie.body.map((b) => b.id)).not.toContain(dati.board.id);

        const filtrate = await api()
            .get(`/api/boards?workspaceId=${anna.workspace.id}`)
            .set(estraneo.auth);
        expect(filtrate.body).toEqual([]);
    });

    const richieste = () => [
        ['GET', `/api/workspaces/${anna.workspace.id}`],
        ['PUT', `/api/workspaces/${anna.workspace.id}`, { name: 'Preso' }],
        ['DELETE', `/api/workspaces/${anna.workspace.id}`],
        ['POST', '/api/boards', { name: 'Intrusa', workspaceId: anna.workspace.id }],
        ['GET', `/api/boards/${dati.board.id}`],
        ['PUT', `/api/boards/${dati.board.id}`, { name: 'Preso' }],
        ['DELETE', `/api/boards/${dati.board.id}`],
        ['POST', '/api/lists', { name: 'X', boardId: dati.board.id }],
        ['PUT', `/api/lists/${dati.list.id}`, { name: 'X' }],
        ['PUT', `/api/lists/${dati.list.id}/move`, { position: 1 }],
        ['DELETE', `/api/lists/${dati.list.id}`],
        ['GET', `/api/cards/${dati.card.id}`],
        ['POST', '/api/cards', { title: 'X', listId: dati.list.id }],
        ['PUT', `/api/cards/${dati.card.id}`, { title: 'X' }],
        ['PUT', `/api/cards/${dati.card.id}/move`, { listId: dati.list.id, position: 1 }],
        ['DELETE', `/api/cards/${dati.card.id}`],
        ['POST', `/api/cards/${dati.card.id}/members`, { userId: estraneo.user.id }],
        ['POST', `/api/cards/${dati.card.id}/labels`, { labelId: dati.label.id }],
        ['POST', '/api/checklists', { title: 'X', cardId: dati.card.id }],
        ['PUT', `/api/checklists/${dati.checklist.id}`, { title: 'X' }],
        ['DELETE', `/api/checklists/${dati.checklist.id}`],
        ['POST', '/api/checklists/items', { title: 'X', checklistId: dati.checklist.id }],
        ['PUT', `/api/checklists/items/${dati.item.id}`, { isCompleted: true }],
        ['DELETE', `/api/checklists/items/${dati.item.id}`],
        ['GET', `/api/comments?cardId=${dati.card.id}`],
        ['POST', '/api/comments', { text: 'X', cardId: dati.card.id }],
        ['PUT', `/api/comments/${dati.comment.id}`, { text: 'X' }],
        ['DELETE', `/api/comments/${dati.comment.id}`],
        ['DELETE', `/api/cards/${dati.card.id}/members/${anna.user.id}`],
        ['DELETE', `/api/cards/${dati.card.id}/labels/${dati.label.id}`],
        ['GET', `/api/labels?boardId=${dati.board.id}`],
        ['POST', '/api/labels', { color: '#000', boardId: dati.board.id }],
        ['PUT', `/api/labels/${dati.label.id}`, { name: 'X' }],
        ['DELETE', `/api/labels/${dati.label.id}`],
    ];

    it('chi non è membro riceve 403 su ogni risorsa', async () => {
        for (const [metodo, url, corpo] of richieste()) {
            const res = await api()[metodo.toLowerCase()](url).set(estraneo.auth).send(corpo);
            expect(res.status, `${metodo} ${url}`).toBe(403);
        }
        // Niente è cambiato.
        const board = await api().get(`/api/boards/${dati.board.id}`).set(anna.auth);
        expect(board.body.name).toBe('Progetto');
        expect(board.body.isArchived).toBe(false);
    });

    it('risponde 400 a un id non valido e 404 a una risorsa inesistente', async () => {
        expect((await api().get('/api/boards/non-un-uuid').set(anna.auth)).status).toBe(400);
        const inesistente = await api()
            .get('/api/boards/00000000-0000-4000-8000-000000000000')
            .set(anna.auth);
        expect(inesistente.status).toBe(404);
        const senzaBoard = await api().post('/api/lists').set(anna.auth).send({ name: 'X' });
        expect(senzaBoard.status).toBe(400);
    });

    it('rifiuta id che non sono stringhe UUID con 400', async () => {
        const spostamento = await api()
            .put(`/api/cards/${dati.card.id}/move`)
            .set(anna.auth)
            .send({ listId: [dati.list.id], position: 1 });
        expect(spostamento.status).toBe(400);
        const elenco = await api().get('/api/boards?workspaceId[a]=b').set(anna.auth);
        expect(elenco.status).toBe(400);
    });

    it('un viewer del workspace non crea board', async () => {
        const { WorkspaceMember } = require('../src/models');
        const osservatore = await registraUtente('Osservatore');
        await WorkspaceMember.create({
            workspaceId: anna.workspace.id,
            userId: osservatore.user.id,
            role: 'viewer',
        });
        const res = await api()
            .post('/api/boards')
            .set(osservatore.auth)
            .send({ name: 'Nuova', workspaceId: anna.workspace.id });
        expect(res.status).toBe(403);
    });

    it('un viewer legge ma non modifica', async () => {
        const viewer = await registraUtente('Viewer');
        await BoardMember.create({
            boardId: dati.board.id,
            userId: viewer.user.id,
            role: 'viewer',
        });

        expect((await api().get(`/api/boards/${dati.board.id}`).set(viewer.auth)).status).toBe(200);
        const nuovaLista = await api()
            .post('/api/lists')
            .set(viewer.auth)
            .send({ name: 'X', boardId: dati.board.id });
        expect(nuovaLista.status).toBe(403);
    });

    it('un member modifica le card ma non cancella la board', async () => {
        const membro = await registraUtente('Membro');
        await BoardMember.create({
            boardId: dati.board.id,
            userId: membro.user.id,
            role: 'member',
        });

        const modifica = await api()
            .put(`/api/cards/${dati.card.id}`)
            .set(membro.auth)
            .send({ title: 'Rinominata' });
        expect(modifica.status).toBe(200);
        const cancella = await api().delete(`/api/boards/${dati.board.id}`).set(membro.auth);
        expect(cancella.status).toBe(403);
    });
});

describe('coerenza tra board', () => {
    it("non sposta card, etichette o persone da una board all'altra", async () => {
        const anna = await registraUtente('Anna');
        const estraneo = await registraUtente('Estraneo');
        const prima = await creaBoard(anna, 'Prima');
        const seconda = await creaBoard(anna, 'Seconda');
        const altrui = await creaBoard(estraneo, 'Altrui');

        const spostaAltrove = await api()
            .put(`/api/cards/${prima.card.id}/move`)
            .set(anna.auth)
            .send({ listId: altrui.list.id, position: 1 });
        expect(spostaAltrove.status).toBe(400);

        const spostaNellaMia = await api()
            .put(`/api/cards/${prima.card.id}/move`)
            .set(anna.auth)
            .send({ listId: seconda.list.id, position: 1 });
        expect(spostaNellaMia.status).toBe(400);

        const etichettaAltrui = await api()
            .post(`/api/cards/${prima.card.id}/labels`)
            .set(anna.auth)
            .send({ labelId: seconda.label.id });
        expect(etichettaAltrui.status).toBe(400);

        const personaEsterna = await api()
            .post(`/api/cards/${prima.card.id}/members`)
            .set(anna.auth)
            .send({ userId: estraneo.user.id });
        expect(personaEsterna.status).toBe(400);

        const etichettaGiusta = await api()
            .post(`/api/cards/${prima.card.id}/labels`)
            .set(anna.auth)
            .send({ labelId: prima.label.id });
        expect(etichettaGiusta.status).toBe(200);
    });
});
