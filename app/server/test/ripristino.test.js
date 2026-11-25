import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { api, registraUtente } from './helpers.js';

const require = createRequire(import.meta.url);
const { BoardMember } = require('../src/models');

const prepara = async () => {
    const anna = await registraUtente('Anna');
    const board = (
        await api()
            .post('/api/boards')
            .set(anna.auth)
            .send({ name: 'Archivio', workspaceId: anna.workspace.id })
    ).body;
    const lista = (
        await api().post('/api/lists').set(anna.auth).send({ name: 'L', boardId: board.id })
    ).body;
    const altra = (
        await api().post('/api/lists').set(anna.auth).send({ name: 'Altra', boardId: board.id })
    ).body;
    const card = (
        await api().post('/api/cards').set(anna.auth).send({ title: 'C', listId: lista.id })
    ).body;
    await api().post('/api/cards').set(anna.auth).send({ title: 'Resta', listId: lista.id });
    return { anna, board, lista, altra, card };
};

const titoli = async (utente, board, nomeLista) => {
    const res = await api().get(`/api/boards/${board.id}`).set(utente.auth);
    const lista = res.body.lists.find((l) => l.name === nomeLista);
    return lista ? lista.cards.map((c) => c.title) : null;
};

describe('ripristino di liste e card', () => {
    it('una card archiviata compare nell’archivio e torna in fondo alla lista', async () => {
        const { anna, board, card } = await prepara();
        await api().delete(`/api/cards/${card.id}`).set(anna.auth);
        expect(await titoli(anna, board, 'L')).toEqual(['Resta']);

        const archivio = await api().get(`/api/boards/${board.id}/archiviati`).set(anna.auth);
        expect(archivio.body.cards.map((c) => c.id)).toContain(card.id);

        const res = await api().post(`/api/cards/${card.id}/restore`).set(anna.auth);
        expect(res.status).toBe(200);
        expect(await titoli(anna, board, 'L')).toEqual(['Resta', 'C']);

        // Dopo il ripristino si modifica di nuovo.
        const modifica = await api()
            .put(`/api/cards/${card.id}`)
            .set(anna.auth)
            .send({ title: 'Di nuovo attiva' });
        expect(modifica.status).toBe(200);
    });

    it('una lista archiviata torna in fondo alla board con le sue card', async () => {
        const { anna, board, lista } = await prepara();
        await api().delete(`/api/lists/${lista.id}`).set(anna.auth);
        expect(await titoli(anna, board, 'L')).toBeNull();

        const archivio = await api().get(`/api/boards/${board.id}/archiviati`).set(anna.auth);
        expect(archivio.body.lists.map((l) => l.id)).toEqual([lista.id]);

        expect((await api().post(`/api/lists/${lista.id}/restore`).set(anna.auth)).status).toBe(
            200
        );
        const res = await api().get(`/api/boards/${board.id}`).set(anna.auth);
        expect(res.body.lists.map((l) => l.name)).toEqual(['Altra', 'L']);
        expect(await titoli(anna, board, 'L')).toEqual(['C', 'Resta']);
    });

    it('non ripristina una card se la sua lista o la board sono archiviate', async () => {
        const { anna, board, lista, card } = await prepara();
        await api().delete(`/api/cards/${card.id}`).set(anna.auth);
        await api().delete(`/api/lists/${lista.id}`).set(anna.auth);

        const conListaArchiviata = await api().post(`/api/cards/${card.id}/restore`).set(anna.auth);
        expect(conListaArchiviata.status).toBe(400);
        expect(conListaArchiviata.body.error).toContain('ripristina prima la lista');

        await api().post(`/api/lists/${lista.id}/restore`).set(anna.auth);
        await api().delete(`/api/boards/${board.id}`).set(anna.auth);
        const conBoardArchiviata = await api().post(`/api/cards/${card.id}/restore`).set(anna.auth);
        expect(conBoardArchiviata.status).toBe(400);
        expect((await api().post(`/api/lists/${lista.id}/restore`).set(anna.auth)).status).toBe(
            400
        );
    });

    it('ripristinare serve almeno il ruolo member', async () => {
        const { anna, board, card } = await prepara();
        await api().delete(`/api/cards/${card.id}`).set(anna.auth);
        const viewer = await registraUtente('Viewer');
        await BoardMember.create({ boardId: board.id, userId: viewer.user.id, role: 'viewer' });
        const estraneo = await registraUtente('Estraneo');

        expect((await api().post(`/api/cards/${card.id}/restore`).set(viewer.auth)).status).toBe(
            403
        );
        expect((await api().post(`/api/cards/${card.id}/restore`).set(estraneo.auth)).status).toBe(
            403
        );
        expect(
            (await api().get(`/api/boards/${board.id}/archiviati`).set(estraneo.auth)).status
        ).toBe(403);
        expect(
            (await api().get(`/api/boards/${board.id}/archiviati`).set(viewer.auth)).status
        ).toBe(200);
    });
});
