# Revisione del codice: PR #47 (issue #17)

Data: 23 novembre 2026
Branch: `fix/17-migrazioni`, confrontato con `main` (`git diff origin/main...fix/17-migrazioni`, 17 file)
Revisore: agente di revisione indipendente

## Come ho controllato

- Ho letto tutto il diff, i quattordici modelli e `models/index.js`, `app.js`, `config/env.js`, `config/database.js`, il client (`lib/api.js`, `SocketContext.jsx`, `vite.config.js`), `deploy.sh`, `ecosystem.config.js` e il codice di Umzug 3.8.3 nelle parti che usiamo (glob, ordinamento, `SequelizeStorage`).
- `DB_NAME=trello_test_rev npm test` dalla radice: 4 file, 36 test, tutti verdi. Lint e Prettier puliti.
- Script nella scratchpad, sempre e solo su `trello_test_rev`:
    - **confronto degli schemi**: `SHOW CREATE TABLE` di tutte le tabelle dopo `sequelize.sync()`, dopo due `sync({ alter: true })` e dopo le migrazioni su database vuoto, poi `diff`;
    - **database esistente**: schema creato con `sync({ alter: true })`, poi `umzug.up()`: la 0001 viene registrata, lo schema non cambia, `pending()` torna vuoto;
    - **parser `istruzioni()`**: otto casi limite (CRLF, commento in coda, `/* */`, `#`, punto e virgola in una stringa, due istruzioni sulla stessa riga, `--` dentro una stringa);
    - **chiusura**: `index.js` avviato sulla porta 3999 con un client Socket.IO collegato, poi `SIGTERM`.

## Lo schema corrisponde ai modelli

Il risultato delle migrazioni coincide con quello di `sequelize.sync()` su tipi, `NULL`, default, chiavi esterne, `ON DELETE` e `ON UPDATE`, collation `utf8mb4_bin` sugli UUID e indici unici. C'è una sola differenza, e va bene: `sync()` crea per le quattro tabelle ponte (`board_members`, `card_members`, `card_labels`, `workspace_members`) un secondo indice unico sulle stesse colonne (`*_userId_boardId_unique` e simili), doppione di quello dichiarato nel modello. La migrazione non lo crea, e il vincolo resta lo stesso.

Un database creato e poi tenuto allineato da `sync({ alter: true })` è diverso solo nei nomi e nei doppioni, non nella sostanza:

- le chiavi esterne si chiamano `*_ibfk_5`, `*_ibfk_6` (il numero sale a ogni `alter`) invece di `*_ibfk_1`, `*_ibfk_2`;
- `users` accumula un indice unico su `email` a ogni avvio: dopo due `alter` ci sono `email`, `email_2`, `email_3`. È il difetto noto di Sequelize, e questa PR lo ferma.

Con `IF NOT EXISTS` la 0001 passa su quel database senza toccarlo e l'avvio parte. Le conseguenze per le migrazioni future sono nei punti 4 e 5.

## Problemi

### 1. Da correggere: la chiusura su SIGTERM/SIGINT si blocca con un client Socket.IO collegato

- **File:** `app/server/src/index.js:38-42`
- **Scenario:** `server.close()` smette di accettare connessioni ma aspetta che finiscano quelle aperte. Un WebSocket di Socket.IO non finisce da solo, quindi il callback non arriva mai. L'ho provato: con un client collegato via websocket il processo era ancora vivo 8 secondi dopo il `SIGTERM`. Con il solo polling è uscito subito.
    - In produzione PM2 manda `SIGKILL` dopo `kill_timeout` (1,6 s): la chiusura "pulita" non avviene mai e `sequelize.close()` non viene chiamato.
    - In sviluppo su Linux e macOS è peggio. `node --watch` manda `SIGTERM` al processo e aspetta che esca prima di riavviarlo: con il browser aperto sulla board, dopo una modifica il server non ripartirebbe più. Anche Ctrl+C sotto `concurrently` resta appeso, e il secondo Ctrl+C non serve, perché il gestore sostituisce il comportamento predefinito. Su Windows non si vede, perché lì il segnale termina il processo comunque.
- **Correzione:** restituire `io` da `createApp` e chiudere con `io.close()`, che scollega i socket e chiude anche il server HTTP. Aggiungere `server.closeAllConnections()` per i keep-alive HTTP e un timer di sicurezza con `unref()` che esce comunque dopo qualche secondo. Ignorare il secondo segnale, oppure al secondo uscire subito. Per esempio:

```js
let inChiusura = false;
const chiudi = () => {
    if (inChiusura) return process.exit(1);
    inChiusura = true;
    setTimeout(() => process.exit(1), 5000).unref();
    io.close(() => sequelize.close().finally(() => process.exit(0)));
    server.closeAllConnections();
};
```

### 2. Da correggere: `db:migrate:undo` su un database vero cancella tutti i dati

- **File:** `app/server/migrations/0001-schema-iniziale.down.sql:1-15`, `app/server/package.json` (`db:migrate:undo`), `app/server/src/db/migrazioni.js:69`
- **Scenario:** finché c'è solo la 0001, `npm run db:migrate:undo` in produzione esegue `DROP TABLE` su tutte e quattordici le tabelle, con i controlli sulle chiavi esterne spenti, senza chiedere niente. Basta un comando sbagliato, oppure un "annullo l'ultima migrazione" lanciato prima che la 0002 sia arrivata sul server. E sul database di produzione la 0001 è un baseline sopra dati veri: annullarla non torna "a prima della migrazione", cancella l'applicazione.
- **Correzione:** rendere il baseline irreversibile fuori dai test. La strada più semplice è che `down` della 0001 si rifiuti se `NODE_ENV !== 'test'`. Serve un piccolo hook in `resolve`, oppure il file `.down.sql` della 0001 si toglie e la down si scrive in JS. In alternativa il comando `down` da riga di comando deve chiedere una conferma esplicita (`--conferma`, o una variabile) quando `NODE_ENV=production`. Il test `si annullano e si riapplicano` continua a funzionare, perché gira con `NODE_ENV=test`.

### 3. Da correggere: il parser `istruzioni()` è fragile e alla prossima migrazione può rompersi

- **File:** `app/server/src/db/migrazioni.js:9-19`
- **Scenario:** sui file attuali funziona. Spezza però solo su `;` seguito da un a capo e toglie le righe che iniziano con `--` anche dentro una stringa. Ecco cosa ho ottenuto:
    - `ALTER ...; -- nuova colonna` seguito da un'altra istruzione diventa un'unica query, e MySQL dà errore di sintassi. Il commento in coda è un'abitudine comune.
    - `DROP TABLE a; DROP TABLE b;` sulla stessa riga dà lo stesso errore.
    - `INSERT ... ('uno;` + a capo + `due')` viene spezzato in due.
    - una stringa su più righe con una riga che inizia con `--` perde quella riga senza avvisare.
    - CRLF, `/* */`, `#` e `DEFAULT 'a;b'` invece vanno bene.
    Quasi sempre l'errore è rumoroso, ma su MySQL un DDL fallito a metà file lascia applicate le istruzioni precedenti, senza che la migrazione risulti registrata (vedi il punto 6).
- **Correzione:** non scrivere un parser SQL. Due alternative:
    1. eseguire il file intero su una connessione `mysql2` dedicata con `multipleStatements: true`, aperta solo per le migrazioni. Questo risolve anche il problema di `SET FOREIGN_KEY_CHECKS` senza appoggiarsi alla transazione;
    2. accettare anche migrazioni `.js` (`up({ context: queryInterface })`), comode per i casi in cui l'SQL puro non basta (punto 4).
  Se il parser resta, almeno un test con i casi qui sopra e una regola scritta in testa a `migrations/`: una istruzione per riga finale, niente commenti in coda.

### 4. Suggerimento (importante per la prossima migrazione): i nomi di vincoli e indici in produzione non sono quelli del file

- **File:** `app/server/migrations/0001-schema-iniziale.up.sql` (tutti i `CONSTRAINT ..._ibfk_N` e `UNIQUE KEY email`)
- **Scenario:** sul database di produzione, creato con `alter`, le chiavi esterne hanno numeri diversi (`activities_ibfk_5`…) e `users` ha N doppioni di `email`. Una futura `ALTER TABLE cards DROP FOREIGN KEY cards_ibfk_1` passerebbe in CI, dove lo schema nasce dalla 0001, e fallirebbe in produzione. MySQL inoltre accetta al massimo 64 indici per tabella: se il server è stato riavviato molte volte, `users` potrebbe esserci vicino.
- **Correzione:** prima del deploy, `SHOW CREATE TABLE` sul database di produzione e confronto con la 0001. Poi una 0002 che normalizza: rinomina le FK con nomi espliciti (`fk_cards_list_id`…) e toglie `email_2…email_N`. Siccome i nomi variano da un database all'altro, la 0002 deve leggerli da `information_schema`, e questo con un file `.sql` puro non si fa: altro motivo per accettare migrazioni `.js`. Nelle migrazioni future conviene dare sempre un nome esplicito a vincoli e indici.

### 5. Suggerimento: il baseline con `IF NOT EXISTS` si fida dello schema esistente

- **File:** `app/server/migrations/0001-schema-iniziale.up.sql:1-2`
- **Scenario:** se una tabella esiste ma con uno schema diverso, la 0001 viene registrata come eseguita e l'avvio parte. Succede se il server di produzione girava con una versione dei modelli più vecchia di quella di oggi, se manca una colonna, o se la tabella ha un charset diverso. Gli errori arrivano dopo, come 500 su certe route. Oggi il rischio è basso, perché `alter` allineava lo schema a ogni avvio, ma dipende da quale versione era davvero in produzione l'ultima volta. C'è anche un caso più sottile: una tabella creata in futuro con `utf8mb4_bin` esplicito, che punta a una tabella di produzione con un'altra collation, fa fallire la FK ("incompatible").
- **Correzione:** il controllo che fa `migrazioni.test.js` (ogni attributo dei modelli esiste, con lo stesso `NULL`) va reso disponibile come comando, per esempio `npm run db:verifica`, da lanciare una volta sul database di produzione prima del primo deploy. Oppure lo si esegue in `index.js` all'avvio e il server si ferma se manca una colonna. Va scritto nel README come passo del primo deploy. Nota a margine: `COLLATE utf8mb4_0900_ai_ci` esiste solo da MySQL 8.0, quindi su MariaDB o MySQL 5.7 la 0001 fallirebbe su un database vuoto ⟦da verificare: versione di MySQL in produzione⟧.

### 6. Suggerimento: una migrazione fallita a metà non si può rilanciare

- **File:** `app/server/src/db/migrazioni.js:22-42`
- **Scenario:** `conUnaConnessione` usa la transazione solo per tenere tutto sulla stessa connessione, e il commento lo dice bene. Ho controllato l'ordine: il `finally` con `SET FOREIGN_KEY_CHECKS = 1` gira prima del `ROLLBACK` o del `COMMIT`, quindi la connessione torna al pool con i controlli accesi. Il limite è un altro. Se l'istruzione 3 di 5 fallisce, la 1 e la 2 restano applicate (DDL con commit implicito) e la migrazione non viene registrata in `migrazioni`. Al secondo tentativo la 1 fallisce, per esempio con "Duplicate column". La 0001 non ne soffre, perché è idempotente. Nessun lock, poi, impedisce a due `db:migrate` lanciati insieme di partire in parallelo.
- **Correzione:** scrivere in `migrations/README` (o in testa a `migrazioni.js`) la regola: una migrazione = un cambiamento, idempotente dove si può (`IF EXISTS` / `IF NOT EXISTS`, ammessi da MySQL 8 su indici e colonne in parte). Per il lock basta `SELECT GET_LOCK('migrazioni', 30)` sulla stessa connessione.

### 7. Suggerimento: errori non gestiti in `avvia()`

- **File:** `app/server/src/index.js:25` (`umzug.pending()`) e `:45` (`avvia()` senza `.catch`)
- **Scenario:** se il database risponde ad `authenticate()` ma `pending()` fallisce (manca il permesso `CREATE` per la tabella `migrazioni`, che `SequelizeStorage` crea con `sync()` al primo accesso, oppure la connessione cade), si ha un `unhandledRejection` con lo stack invece del messaggio chiaro, e la connessione non viene chiusa. Il processo esce comunque con codice 1, quindi non è grave.
- **Correzione:** `avvia().catch((e) => termina('Avvio non riuscito.', e));`.

### 8. Suggerimento: test sullo schema e sul CORS

- **File:** `app/server/test/migrazioni.test.js:18-31`; nessun test per `corsOrigins`
- **Scenario:** il test confronta solo l'esistenza delle colonne e `allowNull`. Non vede tipo, default, FK, `ON DELETE` né indici unici: una 0002 che sbaglia `ON DELETE CASCADE` passerebbe. Il CORS è cambiato in modo sostanziale (da elenco fisso a niente, salvo `CORS_ORIGINS`), ma non c'è un test.
- **Correzione:** aggiungere al test il confronto di `references`/`onDelete` dei modelli con `information_schema.REFERENTIAL_CONSTRAINTS` e degli indici unici. Oppure, più semplice: fare `sync()` su uno schema temporaneo e confrontare `SHOW CREATE TABLE` normalizzato, cioè quello che ho fatto io a mano. Per il CORS bastano due test supertest: senza origini, nessun `Access-Control-Allow-Origin`; con `corsOrigins: ['https://esempio.it']`, l'intestazione c'è per quella origine e manca per un'altra.

### 9. Suggerimento: il setup dei test cancella tutte le tabelle e il controllo sul nome è largo

- **File:** `app/server/test/setup.js:9-18`
- **Scenario:** prima `sync({ force: true })` toccava solo le tabelle dei modelli. Ora vengono eliminate tutte le tabelle del database. Il controllo `/test/` accetta anche nomi come `latest`, `contest` o `attestati_prod`. Il rifiuto dei database senza "test" funziona (riga 9, prima di qualsiasi DROP), ma è più permissivo di quanto sembri.
- **Correzione:** `/(^|_)test(_|$)/` oppure `/_test(_|$)/`.

### 10. Suggerimento: impostazioni predefinite cambiate in `database.js`, documentazione da aggiornare

- **File:** `app/server/src/config/database.js:5,9`; `README.md:322,384`
- **Scenario:** la porta predefinita passa da 3307 a 3306 e l'utente da `teamtrello` a `trello`. Il percorso di deploy è `/home/teamtrello/…`: se il `.env` di produzione non dichiara `DB_USER` e si appoggiava al vecchio valore, `db:migrate` fallisce. Per fortuna succede prima del `reload` (sia in `deploy.sh` con `set -e` sia nella catena `&&` di `ecosystem.config.js`), quindi resta in piedi la versione vecchia. Il README parla ancora di "Prisma migrations" e non spiega come si crea una migrazione, come si fa il primo deploy su un database esistente né cosa fare se l'avvio si ferma per migrazioni in sospeso. `API_TARGET` non è documentato.
- **Correzione:** controllare che il `.env` di produzione abbia `DB_USER` e `DB_PORT` espliciti, poi aggiornare il README (sezione "Database e migrazioni") e la voce del CHANGELOG.

## Cosa ho verificato e va bene

- **Schema:** coincide con i modelli (vedi sopra). Su un database creato da `alter` la 0001 si registra senza errori e l'avvio parte.
- **Umzug:** ordina i file (`paths.sort()`) e il prefisso a quattro cifre regge. Il nome registrato è senza `.up.sql`. `pending()` all'avvio non cambia lo schema delle tabelle applicative. In `NODE_ENV=test` il logger è spento.
- **`conUnaConnessione`:** la transazione tiene davvero `SET FOREIGN_KEY_CHECKS` sulla stessa connessione e lo riaccende anche in caso di errore. Il commento sul commit implicito del DDL è corretto.
- **Down e rollback:** la down della 0001 elimina le tabelle in un ordine qualsiasi, cosa possibile solo perché le FK sono spente. Il test `down({ to: 0 })` + `up()` lascia solo `migrazioni` e poi ricostruisce tutto. Se si torna al codice precedente alla PR, il vecchio `sync({ alter: true })` funziona sullo schema creato dalla 0001.
- **`index.js`:** senza database si ferma con un messaggio che indica le variabili da controllare. Con migrazioni in sospeso si ferma e dice il comando da lanciare. Il server senza database è sparito, come chiedeva l'issue. Sotto PM2 un avvio che fallisce va in `errored` dopo i riavvii previsti da `max_restarts`: va bene così.
- **CORS:** con `CORS_ORIGINS` vuoto non c'è middleware CORS né opzione `cors` su Socket.IO. In produzione il client è servito dallo stesso processo e chiama `/api` e `window.location.origin` (`lib/api.js:1`, `SocketContext.jsx:14`). In sviluppo il proxy di Vite su 5173 rende tutto stessa origine, `/socket.io` compreso con `ws: true`. Non ho trovato URL assoluti nel client, quindi niente regressioni. Il WebSocket non è soggetto al CORS, ma l'autenticazione passa per il token in `handshake.auth` e non per i cookie: un sito esterno non può sfruttarlo.
- **Deploy:** in `deploy.sh` il pacchetto include `app/server/migrations`. `umzug` sta nelle `dependencies`, quindi c'è anche con `--omit=dev`. `npm run db:migrate -w app/server` gira in `app/server` e trova il `.env`. L'ordine è giusto: controllo del `.env`, migrazioni, `startOrReload`. In `ecosystem.config.js`: `npm ci`, build, migrazioni, prune e reload, con la catena `&&` che si ferma prima del reload se una migrazione fallisce. Durante la migrazione la versione vecchia è ancora in linea: per le migrazioni future vale la regola "espandi poi contrai" (aggiungere prima, togliere solo nel deploy successivo).
- **Test:** il controllo sul nome del database avviene prima di qualsiasi `DROP`. Lo schema dei test nasce dalle migrazioni, come in produzione, ed è il cambiamento più utile della PR.

## Esito

Nessun problema bloccante. Ci sono tre punti da correggere prima del merge: la chiusura che si blocca con Socket.IO (1), il `db:migrate:undo` che in produzione cancella tutto (2) e il parser SQL fragile (3, oppure almeno la regola scritta e un test). I suggerimenti 4 e 5 vanno affrontati prima del primo deploy su un database esistente, anche in una PR successiva.

Esito: da correggere

## Seconda verifica (25/11/2026)

Commit verificato: `ad96f9d` su `fix/17-migrazioni`. Ho usato solo il database `trello_test_rev`.

### Come ho controllato

- Ho letto il diff di `ad96f9d`: `migrazioni.js`, il nuovo `verifica.js`, `index.js`, `setup.js`, i test `avvio.test.js` e `migrazioni.test.js`, `package.json` e il lockfile.
- `DB_NAME=trello_test_rev npm test`: 5 file, 40 test verdi e 1 saltato. Il test saltato è la chiusura su SIGTERM, che su Windows non si può provare e gira nella CI Linux. Lint e Prettier sono puliti.
- Ho fatto alcune prove a mano con script nella scratchpad, fuori dal progetto. Sono elencate punto per punto qui sotto.

### Esito dei punti del primo rapporto

| Punto | Stato | Come l'ho verificato |
|---|---|---|
| 1. Chiusura bloccata da Socket.IO | Risolto | `createApp` restituisce già `io`. Ho ripetuto la prova del primo giro: client collegato via websocket, poi `SIGTERM`. Prima il processo era ancora vivo dopo 8 s, ora esce con codice 0 subito. Il timer da 5 s ha `unref()`, quindi non tiene vivo il processo. Il secondo segnale viene ignorato, e il timer garantisce comunque l'uscita. |
| 2. `db:migrate:undo` cancella tutto | Risolto | `node src/db/migrazioni.js down` senza `NODE_ENV`, e poi con `NODE_ENV=production` e `CONFERMA_CANCELLAZIONE_DATI=yes`: si rifiuta in entrambi i casi, con codice 1 e un messaggio chiaro. Le tabelle e la riga in `migrazioni` restano (`pending` vuoto). C'è un test che lo copre. |
| 3. Parser SQL fragile | Risolto | Ora il file va intero su una connessione `mysql2` dedicata con `multipleStatements`. Ho provato un `DEFAULT` con `;` e un a capo dentro la stringa, un commento finale con `;` e tre istruzioni sulla stessa riga: tutto eseguito correttamente. Un errore a metà file arriva a chi ha chiamato e la connessione si chiude nel `finally`. Il processo non resta appeso. |
| 5. Baseline che si fida dello schema | Risolto per le colonne | `npm run db:verifica` stampa "Il database corrisponde ai modelli." con codice 0. Dopo `DROP COLUMN cards.cover_color` segnala "manca la colonna cards.cover_color". Come detto, controlla colonne e `NULL`, non tipi né FK. Per il primo deploy basta. |
| 6. Migrazione fallita a metà, nessun lock | Lock risolto, il resto resta | Ho tenuto `GET_LOCK('trello_clone_migrazioni')` da una sessione `mysql` per circa 6 s: `db:migrate up` ha aspettato 5 s, poi è partito ed è uscito con codice 0. Il limite del DDL che fa commit da solo resta, perché è di MySQL. La regola "una migrazione = un cambiamento, idempotente dove si può" non è scritta da nessuna parte (vedi sotto). |
| 7. `avvia()` senza `.catch` | Risolto | `avvia().catch(...)` chiama `termina`. Il test "si ferma con un messaggio se il database non risponde" passa. |
| 8. Test su schema e CORS | Risolto in parte | I test CORS ci sono e sono corretti. Senza origini manca `Access-Control-Allow-Origin`; con un'origine dichiarata, l'intestazione c'è solo per quella. Il test dello schema usa `differenze()` e quindi controlla ancora solo colonne e `NULL`. FK e `ON DELETE` restano scoperti: lo accetto come suggerimento. |
| 9. Setup dei test | Risolto | `/(^|_)test(_|$)/` accetta `trello_test` e `trello_test_rev`, e rifiuta `latest`, `contest` e `attestati_prod`. Il controllo avviene ancora prima di qualsiasi `DROP`. |
| 4. Nomi dei vincoli in produzione | Rinviato | Va valutato sul database reale, come concordato. |
| 10. README e valori predefiniti | Rinviato | Se ne occupa la issue #22. Prima del deploy resta da controllare che il `.env` di produzione dichiari `DB_USER` e `DB_PORT`. |

### Regressioni

Non ne ho trovate. Il resto della suite è invariato e verde, e sul database di prova lo schema torna pulito dopo `down({ to: 0 })` + `up()`. `socket.io-client` è nelle `devDependencies` del server e nel lockfile. Il lock e la verifica non entrano nell'avvio del server, che resta veloce.

### Suggerimenti rimasti (non bloccano)

- **`app/server/migrations/`**: aggiungere due righe (README o commento in testa a `migrazioni.js`) sulle regole delle prossime migrazioni. Una migrazione per cambiamento. `IF EXISTS`/`IF NOT EXISTS` dove MySQL lo consente. Nomi espliciti per vincoli e indici. Espandere prima e contrarre nel deploy successivo. Senza queste regole, una migrazione fallita a metà va riparata a mano.
- **`app/server/src/db/migrazioni.js:13-22`**: la connessione dedicata usa il charset predefinito di `mysql2`. Le tabelle della 0001 dichiarano il charset in modo esplicito, quindi oggi non cambia niente. Nelle prossime migrazioni conviene fare lo stesso, oppure passare `charset: 'utf8mb4'`.
- **Test della chiusura**: su Windows è saltato. Il primo giro della CI Linux deve mostrarlo verde, non "skipped". ⟦da verificare nella CI⟧

### Esito finale

I tre punti da correggere (1, 2 e 3) sono risolti e verificati. Sono risolti anche i suggerimenti 5, 7 e 9, il lock del 6 e i test CORS dell'8. I punti 4 e 10 sono rinviati con un motivo e non bloccano il merge, ma vanno fatti prima del primo deploy su un database esistente.

Esito: approvata
