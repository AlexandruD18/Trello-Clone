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
            .send({ name: 'Da archiviare', workspaceId: anna.workspace.id })
    ).body;
    const lista = (
        await api().post('/api/lists').set(anna.auth).send({ name: 'L', boardId: board.id })
    ).body;
    const card = (
        await api().post('/api/cards').set(anna.auth).send({ title: 'C', listId: lista.id })
    ).body;
    return { anna, board, lista, card };
};

describe('elementi archiviati', () => {
    it('una board archiviata si legge ma non si modifica', async () => {
        const { anna, board, lista, card } = await prepara();
        expect((await api().delete(`/api/boards/${board.id}`).set(anna.auth)).status).toBe(200);

        expect((await api().get(`/api/boards/${board.id}`).set(anna.auth)).status).toBe(200);
        expect((await api().get(`/api/cards/${card.id}`).set(anna.auth)).status).toBe(200);

        const nuovaLista = await api()
            .post('/api/lists')
            .set(anna.auth)
            .send({ name: 'X', boardId: board.id });
        expect(nuovaLista.status).toBe(403);
        expect(nuovaLista.body.error).toContain('archiviata');

        const commento = await api()
            .post('/api/comments')
            .set(anna.auth)
            .send({ text: 'X', cardId: card.id });
        expect(commento.status).toBe(403);
        expect(
            (await api().put(`/api/lists/${lista.id}`).set(anna.auth).send({ name: 'Y' })).status
        ).toBe(403);
    });

    it('compare tra le archiviate e la ripristina solo un admin', async () => {
        const { anna, board } = await prepara();
        await api().delete(`/api/boards/${board.id}`).set(anna.auth);

        const archiviate = await api().get('/api/boards?archiviate=true').set(anna.auth);
        expect(archiviate.body.map((b) => b.id)).toContain(board.id);
        const attive = await api().get('/api/boards').set(anna.auth);
        expect(attive.body.map((b) => b.id)).not.toContain(board.id);

        const membro = await registraUtente('Membro');
        await BoardMember.create({ boardId: board.id, userId: membro.user.id, role: 'member' });
        expect((await api().post(`/api/boards/${board.id}/restore`).set(membro.auth)).status).toBe(
            403
        );

        expect((await api().post(`/api/boards/${board.id}/restore`).set(anna.auth)).status).toBe(
            200
        );
        const dopo = await api()
            .post('/api/lists')
            .set(anna.auth)
            .send({ name: 'Di nuovo attiva', boardId: board.id });
        expect(dopo.status).toBe(201);
    });

    it('in una lista o card archiviata non si aggiunge niente', async () => {
        const { anna, lista, card } = await prepara();

        await api().delete(`/api/cards/${card.id}`).set(anna.auth);
        const checklist = await api()
            .post('/api/checklists')
            .set(anna.auth)
            .send({ title: 'X', cardId: card.id });
        expect(checklist.status).toBe(403);
        expect(checklist.body.error).toContain('archiviato');

        await api().delete(`/api/lists/${lista.id}`).set(anna.auth);
        const nuovaCard = await api()
            .post('/api/cards')
            .set(anna.auth)
            .send({ title: 'X', listId: lista.id });
        expect(nuovaCard.status).toBe(403);
    });
});
