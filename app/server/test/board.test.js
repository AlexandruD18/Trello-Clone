import { describe, it, expect } from 'vitest';
import { api, registraUtente } from './helpers.js';

describe('vista della board', () => {
    it('manda per ogni card solo conteggi, etichette e membri senza email', async () => {
        const anna = await registraUtente('Anna');
        const board = (
            await api()
                .post('/api/boards')
                .set(anna.auth)
                .send({ name: 'Leggera', workspaceId: anna.workspace.id })
        ).body;
        const lista = (
            await api().post('/api/lists').set(anna.auth).send({ name: 'L', boardId: board.id })
        ).body;
        const card = (
            await api().post('/api/cards').set(anna.auth).send({ title: 'C', listId: lista.id })
        ).body;
        const checklist = (
            await api()
                .post('/api/checklists')
                .set(anna.auth)
                .send({ title: 'Passi', cardId: card.id })
        ).body;
        for (const titolo of ['uno', 'due', 'tre']) {
            await api()
                .post('/api/checklists/items')
                .set(anna.auth)
                .send({ title: titolo, checklistId: checklist.id });
        }
        const elementi = (await api().get(`/api/cards/${card.id}`).set(anna.auth)).body
            .checklists[0].items;
        await api()
            .put(`/api/checklists/items/${elementi[0].id}`)
            .set(anna.auth)
            .send({ isCompleted: true });
        await api().post('/api/comments').set(anna.auth).send({ text: 'a', cardId: card.id });
        await api().post('/api/comments').set(anna.auth).send({ text: 'b', cardId: card.id });
        await api()
            .post(`/api/cards/${card.id}/members`)
            .set(anna.auth)
            .send({ userId: anna.user.id });

        const res = await api().get(`/api/boards/${board.id}`).set(anna.auth);
        const vista = res.body.lists[0].cards[0];

        expect(vista).toMatchObject({ commentCount: 2, checklistTotal: 3, checklistDone: 1 });
        expect(vista).not.toHaveProperty('comments');
        expect(vista).not.toHaveProperty('checklists');
        expect(vista.members[0]).toEqual({ id: anna.user.id, name: 'Anna', avatar: null });
        expect(JSON.stringify(res.body)).not.toContain(anna.email);
    });
});
