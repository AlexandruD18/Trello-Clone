import { describe, it, expect, beforeAll } from 'vitest';
import { api, registraUtente } from './helpers.js';

describe('ordinamento di liste e card', () => {
    let anna;
    let board;

    const creaLista = async (name) =>
        (await api().post('/api/lists').set(anna.auth).send({ name, boardId: board.id })).body;
    const creaCard = async (title, listId) =>
        (await api().post('/api/cards').set(anna.auth).send({ title, listId })).body;
    const sposta = (cardId, listId, index) =>
        api().put(`/api/cards/${cardId}/move`).set(anna.auth).send({ listId, index });
    // Ordine salvato nel database, come lo vede chi ricarica la pagina.
    const ordine = async () => {
        const res = await api().get(`/api/boards/${board.id}`).set(anna.auth);
        return res.body.lists.map((l) => ({
            nome: l.name,
            card: (l.cards || []).map((c) => c.title),
        }));
    };

    beforeAll(async () => {
        anna = await registraUtente('Anna');
        board = (
            await api()
                .post('/api/boards')
                .set(anna.auth)
                .send({ name: 'Ordine', workspaceId: anna.workspace.id })
        ).body;
    });

    it('sposta una card in cima, in mezzo e in fondo alla lista', async () => {
        const lista = await creaLista('Uno');
        const [a, b, c] = [
            await creaCard('A', lista.id),
            await creaCard('B', lista.id),
            await creaCard('C', lista.id),
        ];

        expect((await sposta(c.id, lista.id, 0)).status).toBe(200);
        expect((await ordine()).find((l) => l.nome === 'Uno').card).toEqual(['C', 'A', 'B']);

        await sposta(c.id, lista.id, 1);
        expect((await ordine()).find((l) => l.nome === 'Uno').card).toEqual(['A', 'C', 'B']);

        await sposta(a.id, lista.id, 2);
        expect((await ordine()).find((l) => l.nome === 'Uno').card).toEqual(['C', 'B', 'A']);
        expect(b.id).toBeDefined();
    });

    it('sposta una card in un’altra lista della stessa board', async () => {
        const origine = await creaLista('Origine');
        const arrivo = await creaLista('Arrivo');
        const x = await creaCard('X', origine.id);
        await creaCard('Y', arrivo.id);

        await sposta(x.id, arrivo.id, 0);
        const stato = await ordine();
        expect(stato.find((l) => l.nome === 'Origine').card).toEqual([]);
        expect(stato.find((l) => l.nome === 'Arrivo').card).toEqual(['X', 'Y']);
    });

    it('regge molti inserimenti nello stesso punto e rinumera quando serve', async () => {
        const lista = await creaLista('Stretta');
        const prima = await creaCard('Prima', lista.id);
        const ultima = await creaCard('Ultima', lista.id);
        const altre = [];
        for (let i = 0; i < 60; i += 1) altre.push(await creaCard(`N${i}`, lista.id));

        // Ogni card nuova va tra "Prima" e quella inserita prima: lo scarto si dimezza ogni volta.
        let rinumerazioni = 0;
        for (const card of altre) {
            const res = await sposta(card.id, lista.id, 1);
            expect(res.status).toBe(200);
            if (res.body.rinumerati) rinumerazioni += 1;
        }
        expect(rinumerazioni).toBeGreaterThan(0);

        const titoli = (await ordine()).find((l) => l.nome === 'Stretta').card;
        expect(titoli[0]).toBe('Prima');
        expect(titoli[1]).toBe('N59');
        expect(titoli.at(-1)).toBe('Ultima');
        expect(new Set(titoli).size).toBe(62);
        expect(prima.id && ultima.id).toBeTruthy();
    });

    it('non assegna la stessa posizione a spostamenti contemporanei', async () => {
        const lista = await creaLista('Contesa');
        await creaCard('Fissa', lista.id);
        const card = [];
        for (let i = 0; i < 6; i += 1) card.push(await creaCard(`C${i}`, lista.id));

        const risposte = await Promise.all(card.map((c) => sposta(c.id, lista.id, 0)));
        expect(risposte.every((r) => r.status === 200)).toBe(true);

        const res = await api().get(`/api/boards/${board.id}`).set(anna.auth);
        const posizioni = res.body.lists
            .find((l) => l.name === 'Contesa')
            .cards.map((c) => c.position);
        expect(new Set(posizioni).size).toBe(posizioni.length);
    });

    it('regge spostamenti incrociati tra due liste senza errori', async () => {
        const sinistra = await creaLista('Sinistra');
        const destra = await creaLista('Destra');
        const daSinistra = [];
        const daDestra = [];
        for (let i = 0; i < 4; i += 1) {
            daSinistra.push(await creaCard(`S${i}`, sinistra.id));
            daDestra.push(await creaCard(`D${i}`, destra.id));
        }

        for (let giro = 0; giro < 3; giro += 1) {
            const richieste = [
                ...daSinistra.map((c) => sposta(c.id, destra.id, 0)),
                ...daDestra.map((c) => sposta(c.id, sinistra.id, 0)),
            ];
            const stati = (await Promise.all(richieste)).map((r) => r.status);
            expect(stati.every((st) => st === 200)).toBe(true);
            // Al giro dopo le card tornano indietro: ogni gruppo ora sta nell'altra lista.
            const scambio = daSinistra.splice(0, daSinistra.length, ...daDestra);
            daDestra.splice(0, daDestra.length, ...scambio);
        }
    });

    it('regge più card spostate insieme in una lista vuota', async () => {
        const vuota = await creaLista('Vuota');
        const piena = await creaLista('Piena');
        const card = [];
        for (let i = 0; i < 5; i += 1) card.push(await creaCard(`V${i}`, piena.id));

        const risposte = await Promise.all(card.map((c) => sposta(c.id, vuota.id, 0)));
        expect(risposte.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);

        const res = await api().get(`/api/boards/${board.id}`).set(anna.auth);
        const posizioni = res.body.lists
            .find((l) => l.name === 'Vuota')
            .cards.map((c) => c.position);
        expect(posizioni).toHaveLength(5);
        expect(new Set(posizioni).size).toBe(5);
    });

    it('non dà la stessa posizione a card create insieme', async () => {
        const lista = await creaLista('Creazioni');
        const risposte = await Promise.all(
            Array.from({ length: 6 }, (_, i) =>
                api()
                    .post('/api/cards')
                    .set(anna.auth)
                    .send({ title: `K${i}`, listId: lista.id })
            )
        );
        expect(risposte.every((r) => r.status === 201)).toBe(true);
        const posizioni = risposte.map((r) => r.body.position);
        expect(new Set(posizioni).size).toBe(6);
    });

    it('non sposta una card in una lista archiviata', async () => {
        const archiviata = await creaLista('Archiviata');
        const attiva = await creaLista('Attiva');
        const card = await creaCard('W', attiva.id);
        await api().delete(`/api/lists/${archiviata.id}`).set(anna.auth);

        expect((await sposta(card.id, archiviata.id, 0)).status).toBe(400);
    });

    it('riordina le liste e salva l’ordine', async () => {
        const nuova = await creaLista('Nuova in fondo');
        const res = await api()
            .put(`/api/lists/${nuova.id}/move`)
            .set(anna.auth)
            .send({ index: 0 });
        expect(res.status).toBe(200);
        expect((await ordine())[0].nome).toBe('Nuova in fondo');
    });

    it.each([[-1], [1.5], ['2'], [null]])('rifiuta l’indice %s', async (indice) => {
        const lista = await creaLista(`Errata ${String(indice)}`);
        const card = await creaCard('Z', lista.id);
        const res = await sposta(card.id, lista.id, indice);
        expect(res.status).toBe(400);
    });
});
