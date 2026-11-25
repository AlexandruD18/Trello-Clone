# Revisione PR #49: posizioni calcolate dal server (issue #18)

Data: 2026-11-25
Branch: `fix/18-posizioni` (diff `origin/main...fix/18-posizioni`, 12 file)
Revisione indipendente, fatta sul codice e con prove sul database `trello_test_rev` (MySQL 8.4 in Docker, porta 3307).

## In breve

L'idea è giusta e il calcolo dell'indice è corretto: il client manda l'indice nell'ordine finale, il server lo applica ai fratelli senza la card spostata, e i due conti coincidono. La rinumerazione è corretta, la migrazione 0002 è sicura.

Il problema è la concorrenza. Il `SELECT ... FOR UPDATE` sui fratelli tiene a bada gli spostamenti nella stessa lista, ma gli spostamenti **tra liste** in parallelo vanno in deadlock. MySQL annulla la transazione e l'utente riceve un 500. Prima della PR quegli spostamenti non fallivano mai: è una regressione, proprio sul punto che la PR deve sistemare.

## Come ho verificato

- `DB_NAME=trello_test_rev npm test`: 7 file, 57 test passati, 1 saltato.
- Uno script di prova in `scratchpad/rev/sonda.cjs` (fuori dal progetto) che chiama le API vere in parallelo:

| Scenario | Esito |
|---|---|
| 4 card spostate insieme in una lista **vuota** (5 giri) | ogni giro: 1 risposta 200 e 3 risposte 500 |
| 4 spostamenti incrociati tra due liste piene (A→B e B→A, 8 giri) | da 2 a 3 risposte 500 su 4 in ogni giro |
| Errore registrato dal server | `ER_LOCK_DEADLOCK` (34 volte) |
| 4 liste spostate insieme in cima | tutte 200, nessuna posizione doppia |
| 1 spostamento in fondo e 2 creazioni insieme nella stessa lista | `nuova` e `nuova2` hanno entrambe la posizione 131072 |
| `PUT /api/lists/<id inesistente>/move` | 404 dal middleware, corretto |

- Migrazione 0002 provata con down e poi up su dati esistenti: i tipi passano da `float` a `double` e ritorno; un valore `0.1` salvato come FLOAT diventa `0.10000000149011612`. L'ordine resta lo stesso.

## Problemi

### 1. Bloccante: deadlock negli spostamenti tra liste in parallelo

**Dove:** `app/server/src/services/posizioni.js:26-34`, `app/server/src/controllers/cardController.js:141-160`

**Scenario.** Anna sposta una card dalla lista L1 alla L2, Marco nello stesso momento ne sposta una da L2 a L1. La transazione di Anna blocca le righe di L2 con `FOR UPDATE`, quella di Marco le righe di L1. Poi Anna aggiorna la sua card, che sta ancora in L1 ed è bloccata da Marco; Marco aggiorna la sua, che sta in L2 ed è bloccata da Anna. MySQL vede il ciclo, annulla una delle due transazioni e il controller risponde 500.

Con una lista vuota non c'è nessuna riga da bloccare. Il `FOR UPDATE` prende solo un gap lock, e i gap lock non si escludono tra loro. Le due transazioni lo prendono tutte e due, poi tutte e due provano a inserire la propria card in quel gap con l'`UPDATE ... list_id`, e ognuna aspetta l'altra. Le posizioni restano corrette, perché passa solo una transazione, ma le altre falliscono. Il client fa `loadBoard()` e la card torna al suo posto senza spiegazioni.

Il test `non assegna la stessa posizione a spostamenti contemporanei` passa perché sposta le card dentro la stessa lista. In quel caso le transazioni si mettono in fila sugli stessi record e non c'è ciclo.

**Correzione.**
1. Nella transazione, prima di leggere i fratelli, bloccare il **genitore** in un ordine fisso:
   - in `moveCard`, le righe di `lists` dell'origine e della destinazione: `List.findAll({ where: { id: [origine, destinazione] }, order: [['id', 'ASC']], lock: transaction.LOCK.UPDATE, transaction })`;
   - in `moveList`, la riga di `boards`.

   Così due spostamenti che toccano le stesse liste si mettono in fila, e una lista vuota ha comunque una riga da bloccare. Poi rileggere la card con `lock` e controllare che `listId` sia ancora quello usato per scegliere le liste da bloccare: se è cambiato nel frattempo, rifare il giro.
2. Come rete di sicurezza, ripetere la transazione 2-3 volte su `ER_LOCK_DEADLOCK` / `ER_LOCK_WAIT_TIMEOUT`. Se fallisce ancora, rispondere 409 con un messaggio chiaro invece di 500.
3. Aggiungere a `test/posizioni.test.js` due test: spostamenti incrociati tra due liste e spostamenti paralleli in una lista vuota. Tutte le risposte devono essere 200 e le posizioni tutte diverse. Lo script `sonda.cjs` mostra come scriverli.

### 2. Da correggere: le creazioni calcolano la posizione fuori dalla transazione e il pareggio non ha un ordine stabile

**Dove:** `app/server/src/controllers/cardController.js:58-63`, `app/server/src/controllers/listController.js:13-18`, `app/server/src/controllers/boardController.js:92-100`, `app/client/src/pages/BoardPage.jsx:159-163`

**Scenario.** `createCard` e `createList` leggono ancora l'ultima posizione e aggiungono 65536, senza transazione e senza lock. Due creazioni insieme, o una creazione insieme a uno spostamento in fondo, producono la stessa posizione: nella prova `nuova` e `nuova2` hanno tutte e due 131072. Lo schema +65536 resta compatibile con le posizioni negative e con quelle rinumerate. Il pareggio, invece, adesso pesa di più. Il server conta gli indici con `ORDER BY position, id`, mentre `GET /boards/:id` ordina solo per `position` e il client ordina solo per `position`. Con due card alla pari, la board mostrata al client può avere un ordine diverso da quello che il server usa per l'indice, e la card finisce un posto prima o dopo.

**Correzione.**
- Far calcolare la posizione anche alle creazioni da `posizionePerIndice`, nella stessa transazione e con lo stesso lock del genitore del punto 1, con indice uguale al numero dei fratelli.
- Aggiungere `id ASC` come secondo criterio in `boardController.js:92-100`.
- Nel client, ordinare con `a.position - b.position || a.id.localeCompare(b.id)` in `loadBoard` e nei gestori `card:moved` e `list:moved`.

### 3. Da correggere: trascinamento annullato dopo il passaggio su un'altra lista

**Dove:** `app/client/src/pages/BoardPage.jsx:325` e `DndContext` a `:447-452` (manca `onDragCancel`)

**Scenario.** L'utente trascina una card sopra un'altra lista: `handleDragOver` la sposta già lì nello stato locale. Poi la lascia fuori da ogni area (`over` vale `null`) oppure preme Esc. `handleDragEnd` esce subito, oppure non viene proprio chiamato, e nessuna richiesta parte. La card resta mostrata nella lista sbagliata finché la pagina non si ricarica. Il problema c'era già prima della PR, ma la PR ha riscritto questo flusso e lo dà per coperto ("qui resta solo l'ordine").

**Correzione.** In `handleDragStart`, salvare l'id della lista di partenza (o una copia di `lists`). Su `!over` e in un nuovo `onDragCancel`, ripristinare la copia oppure chiamare `loadBoard()`.

### 4. Suggerimento: nessuna richiesta se la card torna dove era

**Dove:** `app/client/src/pages/BoardPage.jsx:374-380`

Con lista e indice uguali a quelli di partenza, il client manda comunque `PUT /cards/:id/move`. Il server sceglie un nuovo punto medio, scrive, avvisa gli altri con `card:moved` e di tanto in tanto rinumera senza motivo. Conviene confrontare lista e indice con quelli salvati in `handleDragStart` (punto 3) e saltare la richiesta.

### 5. Suggerimento: indice calcolato su una vista non aggiornata

**Dove:** `app/client/src/pages/BoardPage.jsx:355-378`

L'indice vale per la board che vede il client. Se un altro utente ha appena aggiunto o spostato una card e l'evento non è ancora arrivato, la card finisce un posto più su o più giù di dove l'utente l'ha lasciata. È un caso raro e non rompe i dati. Se dà fastidio, il client può mandare gli id dei vicini (`dopoId` / `primaId`) invece dell'indice, e il server usa l'indice solo quando non li trova.

### 6. Suggerimento: rinumerazione con un UPDATE per riga

**Dove:** `app/server/src/services/posizioni.js:50-54`

La rinumerazione fa un `UPDATE` per ogni fratello, dentro la transazione e con i lock presi. Con liste da qualche centinaio di card tiene i lock per centinaia di query. Si può fare con un solo `UPDATE ... SET position = CASE id WHEN ... END WHERE id IN (...)`. Oggi la rinumerazione scatta circa ogni 36 inserimenti nello stesso punto, quindi non è urgente.

### 7. Suggerimento: `moveList` senza controllo sulla lista

**Dove:** `app/server/src/controllers/listController.js:80-83`

Se la lista viene cancellata tra il middleware `autorizza` e la transazione, `lista` vale `null` e `lista.boardId` lancia un TypeError, cioè un 500. `moveCard` gestisce il caso, qui manca. Basta un `if (!lista)` che restituisce 404, come in `moveCard`.

### 8. Suggerimento minore: campo `rinumerati` nello stato del client

**Dove:** `app/client/src/pages/BoardPage.jsx:380`

`handleCardUpdate({ ...result.card, ...res.data })` copia nella card in memoria anche il campo `rinumerati`. Non fa danni, ma è meglio toglierlo: `const { rinumerati, ...card } = res.data`.

### 9. Suggerimento minore: quattro ALTER nella stessa migrazione

**Dove:** `app/server/migrations/0002-posizioni-double.up.sql`

Il README delle migrazioni chiede una modifica per migrazione, perché ogni `ALTER TABLE` fa commit da solo. Qui il rischio è basso, perché `MODIFY ... double` si può rilanciare senza danni se il file si ferma a metà. Basta una riga di commento che lo dica. Il down perde precisione e il commento lo dichiara: va bene così.

## Cosa funziona bene

- **Indice senza off-by-one.** Nella stessa lista il client fa `arrayMove(cards, old, new)` e manda `new`. Il server toglie la card dai fratelli e la mette in quella posizione, quindi la card finisce davvero all'indice `new`. Tra liste, `handleDragOver` la inserisce già prima della card sotto il cursore e `handleDragEnd` aggiusta solo l'ordine: il conto è lo stesso. I test coprono cima, mezzo e fondo, e il `Math.min` sul server tiene l'indice dentro la lista.
- **Rinumerazione corretta.** I fratelli prendono `(k+1)·PASSO` prima del buco e `(k+2)·PASSO` dopo, la card prende `(i+1)·PASSO`, e vengono scritte solo le righe che cambiano davvero.
- **Posizioni negative.** Mettere in cima significa `vicino − PASSO`. Con DOUBLE ci vogliono più di 10^11 spostamenti in cima prima di perdere precisione, e `createX` usa il massimo + 65536, quindi funziona anche con le negative.
- **Migrazione 0002.** Con DOUBLE gli inserimenti ripetuti nello stesso punto reggono circa 36 dimezzamenti prima di rinumerare; con FLOAT due card collassavano presto. La conversione dei dati esistenti non cambia l'ordine.
- **Notifiche coerenti col client.** `board:refresh` passa da `notificaBoard`, che aggiunge `boardId`, quindi supera il filtro del client. Chi ha fatto lo spostamento non lo riceve (`X-Socket-Id`) e ricarica da solo quando vede `rinumerati`. `list:moved` adesso riordina le liste.
- **`handleCardUpdate` funzionale.** Non usa più lo stato catturato al momento del drag, e sugli errori di rete il client ricarica la board.
- **Liste archiviate.** `isArchived: false` nei fratelli corrisponde a quello che mostra `GET /boards/:id`, quindi gli indici contano le stesse card.

## Esito: da correggere

Il punto 1 blocca il merge. I punti 2 e 3 vanno sistemati in questa PR o in una issue subito dopo. Gli altri sono facoltativi.
