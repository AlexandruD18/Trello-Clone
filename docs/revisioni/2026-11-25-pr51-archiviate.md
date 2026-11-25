# Revisione di sicurezza: PR #51 (issue #46)

Data: 25 novembre 2026
Branch: `fix/46-archiviate`, confrontato con `main` (`git diff origin/main...fix/46-archiviate`, 4 file)
Revisore: agente di revisione di sicurezza indipendente

## Come ho controllato

- Ho letto tutto il diff, tutte le route in `app/server/src/routes`, i controller di board, liste, card, commenti, etichette, checklist e workspace, `socket/socketHandler.js` e `socket/eventi.js`.
- `DB_NAME=trello_test_rev npm test` dalla radice: 7 file, 51 test verdi e 1 saltato. Nessuna regressione.
- Uno script nella scratchpad (`prova.cjs`), lanciato solo su `trello_test_rev`, ha provato via HTTP i percorsi elencati sotto con un admin, un viewer e un utente estraneo alla board.

## Copertura del blocco

Tutte le route che modificano qualcosa passano da `autorizza` con `minimo` pari a `member` o `admin`. Le route con `viewer` sono solo `GET`. Fanno eccezione le route dei workspace, che non hanno board sopra di loro e quindi restano fuori dal blocco per scelta. Ho provato questi casi su una board archiviata, e tutti rispondono 403: `addLabel`, `updateLabel`, `deleteLabel`, `updateChecklistItem`, `deleteChecklistItem`, `updateComment`, `deleteComment`, `addMember`, `updateBoard` e un secondo `deleteBoard`. `GET` della board, delle etichette e dei commenti risponde 200, anche a un viewer.

Su card e liste archiviate: spostare una card archiviata, spostare una lista archiviata e creare una card o una checklist dentro un elemento archiviato rispondono 403.

`GET /api/boards?archiviate=true` usa lo stesso filtro di appartenenza (`BoardMember` o `WorkspaceMember`) dell'elenco normale. Un utente estraneo non vede la board archiviata di un altro, e il suo `restore` riceve 403. Anche il `restore` di un viewer e di un member riceve 403. Un valore diverso da `'true'` (per esempio `?archiviate=1`) restituisce le board attive, quindi nessuna sorpresa.

Socket.IO: `join-board` su una board archiviata è ammesso a chiunque abbia un ruolo. Mi va bene, perché il client non manda eventi di modifica via socket: gli unici eventi in arrivo sono `join-board`, `leave-board`, `disconnecting` e `disconnect`. Tutto ciò che il server notifica nasce da richieste HTTP, che ora sono bloccate.

## Problemi

### 1. Da correggere: `moveCard` sposta una card attiva in una lista archiviata

- **Dove:** `app/server/src/controllers/cardController.js:143-147`
- **Scenario:** un member archivia la lista L2, poi chiama `PUT /api/cards/:id/move` con `{ listId: L2, position: 1 }` su una card attiva di L1. Il middleware controlla la card, che è attiva, e lascia passare. Il controller verifica solo che L2 sia nella stessa board. Risultato verificato: 200. La card sparisce dalla board (`GET /api/boards/:id` non la mostra più), e chi prova a riportarla in L1 riceve 403 ("Questo elemento è archiviato"). La card resta però con `isArchived = false`, quindi non comparirà neanche in un futuro elenco delle card archiviate. È un dato perso senza traccia, e contraddice la regola della PR ("nelle liste archiviate non si aggiunge niente"). Non c'è scalata di privilegi, perché un member può già archiviare la card. Il danno è l'integrità del dato e il buco nell'invariante.
- **Correzione:** nel controller, rifiutare una destinazione archiviata.

```js
const destinazione = await List.findByPk(listId || card.listId);
if (!destinazione || destinazione.boardId !== req.board.id) {
    return res.status(400).json({ error: 'La lista di destinazione non è in questa board' });
}
if (destinazione.isArchived) {
    return res
        .status(403)
        .json({ error: 'La lista di destinazione è archiviata: non si possono aggiungere card' });
}
```

  Aggiungere il caso a `test/archiviate.test.js`: spostamento verso una lista archiviata = 403, e la card resta nella lista di partenza.

### 2. Suggerimento: liste e card archiviate non si possono più ripristinare

- **Dove:** `app/server/src/middleware/permessi.js:129`, `app/server/src/controllers/listController.js:98-106`, `app/server/src/routes/lists.js`, `app/server/src/routes/cards.js`
- **Scenario:** un member (non serve essere admin) archivia per sbaglio una lista con venti card. Prima della PR quelle card si potevano ancora spostare via API in un'altra lista. Ora sono tutte in sola lettura e non esiste un `restore` per liste o card. Si recuperano solo a mano sul database. La PR quindi rende più definitiva un'azione già alla portata di un member.
- **Correzione:** non blocca il merge. Conviene aprire un'issue per `POST /api/lists/:id/restore` e `POST /api/cards/:id/restore`, con `autorizza(..., 'member', { ancheArchiviata: true })`. Il ripristino di una card dentro una lista archiviata va rifiutato: il controllo della lista resta attivo anche con `ancheArchiviata`, che oggi vale per tutta la catena. Servono anche gli elenchi `?archiviate=true` per board e lista.

### 3. Suggerimento: `ancheArchiviata` salta l'intera catena, non solo la risorsa

- **Dove:** `app/server/src/middleware/permessi.js:128-129`
- **Scenario:** oggi l'opzione la usa solo il `restore` della board, ed è corretto. Se domani qualcuno la usa per il ripristino di una card, quel ripristino passerebbe anche con la board o la lista archiviate. Ne verrebbe una card "attiva" dentro una board in sola lettura.
- **Correzione:** separare i due flag in `CONTESTO_DI`, cioè `archiviatoSopra` (board o lista che la contiene) e `archiviatoProprio` (la risorsa stessa). Poi fare in modo che `ancheArchiviata` permetta solo il secondo. In alternativa, documentare il limite nel JSDoc.

### 4. Suggerimento: il ripristino non avvisa chi guarda la board

- **Dove:** `app/server/src/controllers/boardController.js:198-206`
- **Scenario:** chi ha la board aperta (anche archiviata, via socket) non riceve nessun evento. Al ripristino la sua vista resta in sola lettura finché non ricarica. Non c'è impatto sulla sicurezza. Per coerenza però vale anche per `deleteBoard`, che non notifica nemmeno lui.
- **Correzione:** `notificaBoard(req, req.board.id, 'board:updated', { board: req.board })` dopo l'update, e lo stesso evento in `deleteBoard`.

### 5. Suggerimento: il client non conosce lo stato archiviato

- **Dove:** `app/client/src` (nessun riferimento a `isArchived`, `archiviate` o `restore`)
- **Scenario:** chi apre una board archiviata dal link vede l'interfaccia normale, e ogni modifica fallisce con 403. Il server è corretto. Il problema è di esperienza d'uso, e la funzione di ripristino non si raggiunge dall'interfaccia.
- **Correzione:** fuori dallo scopo di questa PR. Serve un'issue per il banner "Board archiviata" con il pulsante "Ripristina" (solo admin) e l'elenco delle archiviate nella home.

## Cosa va bene

- Il controllo sta in un punto solo, il middleware, e copre tutte le route di modifica senza toccare i controller. È lo stesso schema delle PR #44 e #45.
- L'ordine dei controlli è giusto. Prima arriva il 404, poi il 403 per i permessi, infine il 403 per l'archivio. Un estraneo riceve "Non hai i permessi" e non scopre se la board è archiviata.
- Il messaggio d'errore distingue tra board archiviata ed elemento archiviato, e i test lo verificano.
- Il `restore` richiede `admin`, come l'archiviazione (`DELETE`). Non tocca liste e card, che conservano il loro stato: è il comportamento giusto.
- `?archiviate=true` confronta la stringa in modo esatto e riusa il filtro di appartenenza.

## Esito: da correggere

Il punto 1 va corretto prima del merge, con un test. È una modifica di poche righe. I punti 2-5 possono diventare issue separate.
