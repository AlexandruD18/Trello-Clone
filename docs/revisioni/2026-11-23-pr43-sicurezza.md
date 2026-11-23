# Revisione di sicurezza: PR #43 (issue #14)

Data: 23 novembre 2026
Branch: `fix/14-sicurezza-base`, confrontato con `main` (`git diff main...fix/14-sicurezza-base`)
Revisore: agente di sicurezza indipendente

## Come ho controllato

- Ho letto tutto il diff e i file toccati: `app.js`, `config/env.js`, `authController.js`, `middleware/auth.js`, `models/User.js`, `socket/socketHandler.js`, `validation/auth.js` e i test.
- Ho cercato con grep in tutto `app/server/src` gli usi di `password`, `comparePassword`, `withPassword`, `JWT_SECRET` e `scope(`.
- Ho letto il client in `app/client/src`: `lib/api.js`, `AuthContext.jsx`, le pagine di login e registrazione e `SocketContext.jsx`, più `vite.config.js` e il `dist/index.html` compilato.
- `npm test` dalla radice: 2 file, 19 test, tutti verdi.
- Ho scritto uno script supertest nella scratchpad, fuori dal progetto, per provare il rate limit con `X-Forwarded-For` e con varianti del percorso. Lo stesso script ha letto le intestazioni reali, il limite del corpo e gli input non testuali.
- Non sono riuscito a provare la CSP in un browser vero. Avviare un server di prova è stato negato dal sistema di permessi, quindi il punto 2 si basa sulle intestazioni reali e sul comportamento documentato dei browser.

## Problemi

### 1. Da correggere: il rate limit si aggira cambiando `X-Forwarded-For`

- **Dove:** `app/server/src/app.js:25` (`app.set('trust proxy', 1)`), insieme a `app.js:67-75`.
- **Scenario:** `ecosystem.config.js` avvia Node con PM2 direttamente su `0.0.0.0:3000`. Né il repository né i documenti parlano di un nginx davanti. Con `trust proxy = 1` Express prende come `req.ip` l'ultimo valore di `X-Forwarded-For`, e quel valore lo sceglie il client. Un attaccante manda un IP inventato diverso a ogni tentativo e non incontra mai il limite.
- **Prova:** app con `authRateLimit: 2`, cinque POST a `/api/auth/login` con `X-Forwarded-For: 10.0.0.0`…`10.0.0.4`. Risultato: nessuna risposta 429. Le stesse richieste senza l'intestazione ricevono 429 dalla terza. Il brute force sulle password, che è proprio quello che la PR vuole frenare, resta possibile.
- **Correzione:** decidere `trust proxy` in base al deploy, non fissarlo nel codice. Per esempio:

    ```js
    // .env: TRUST_PROXY=1 solo se c'è davvero un proxy davanti
    app.set('trust proxy', config.trustProxy); // predefinito false
    ```

    con `trustProxy` letto in `config/env.js` (`false` se assente, altrimenti un numero oppure un elenco di IP/subnet come `'loopback'`). In `.env.example` va scritto quando attivarlo. Serve anche un test: con `trust proxy` disattivato, un `X-Forwarded-For` diverso non deve azzerare il contatore.

### 2. Da correggere: `upgrade-insecure-requests` e HSTS rompono il deploy in HTTP

- **Dove:** `app/server/src/app.js:50-61` (helmet con i default attivi).
- **Scenario:** le intestazioni reali contengono `upgrade-insecure-requests` e `Strict-Transport-Security: max-age=31536000; includeSubDomains`. In produzione lo stesso processo serve `client/dist`. Se l'app viene aperta in HTTP su un IP o un nome della rete (per esempio `http://192.168.x.x:3000`), il browser riscrive in `https://` le richieste a `/assets/index-*.js` e `/assets/index-*.css`. Su quella porta non c'è TLS, quindi la pagina resta bianca. `localhost` di solito è escluso, ed è per questo che in locale non si vede. HSTS in HTTP viene ignorato. Se invece un giorno il dominio passa da HTTPS, `includeSubDomains` blocca per un anno tutti i sottodomini ancora in HTTP. Non l'ho visto nel browser (vedi sopra): va confermato con una prova manuale prima del merge.
- **Correzione:** attivarli solo quando il sito gira davvero in HTTPS:

    ```js
    const https = config.httpsEnabled; // da .env
    helmet({
        strictTransportSecurity: https,
        contentSecurityPolicy: {
            directives: {
                // ...
                upgradeInsecureRequests: https ? [] : null,
            },
        },
    });
    ```

### 3. Da correggere: rate limit unico per IP, conta anche i login riusciti

- **Dove:** `app/server/src/app.js:67-75`.
- **Scenario:** login e registrazione condividono un contatore (stessa istanza): 20 richieste ogni 15 minuti per IP, comprese quelle riuscite. In un'aula o in un ufficio dietro un solo IP pubblico (NAT), la ventunesima persona che entra o si registra riceve 429 per 15 minuti. Basta anche un solo utente che sbaglia apposta 20 volte per bloccare tutti gli altri dietro lo stesso IP.
- **Correzione:** due limitatori distinti. Per il login usare `skipSuccessfulRequests: true`, così contano solo i tentativi falliti, ed eventualmente una chiave IP + email normalizzata (`keyGenerator` che usa `ipKeyGenerator(req.ip)` più l'email). Per la registrazione tenere un limite per IP separato.

### 4. Suggerimento: una registrazione doppia in parallelo restituisce 500 invece di 409

- **Dove:** `app/server/src/controllers/authController.js:21-46`.
- **Scenario:** due richieste con la stessa email superano entrambe il `findOne`. La seconda poi fallisce sul vincolo `unique` dentro la transazione e finisce nel `catch` generico con 500 "Registrazione non riuscita". Non è una falla, perché la transazione evita che restino dati a metà, ma la risposta è sbagliata.
- **Correzione:** nel `catch`, `if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'Esiste già un account con questa email' });`.

### 5. Suggerimento: il client permette password di 6 caratteri, il server ne chiede 8

- **Dove:** `app/client/src/pages/RegisterPage.jsx:94` (`minLength={6}`) e `app/server/src/validation/auth.js:5`.
- **Scenario:** con una password di 6-7 caratteri il form si invia e il server risponde 400. L'utente vede il messaggio del server, quindi niente si rompe, ma la regola è scritta in due modi diversi.
- **Correzione:** `minLength={8}` e `maxLength` coerente. Va valutato se il fix rientra in questa PR o in una del client.

### 6. Suggerimento: CSP più stretta su `connect-src` e `img-src`

- **Dove:** `app/server/src/app.js:56-57`.
- **Scenario:** `ws:` e `wss:` senza host permettono WebSocket verso qualsiasi server. Se un giorno passasse uno script iniettato, i dati potrebbero uscire da lì. Nei browser attuali `'self'` copre già i WebSocket della stessa origine, e il client si collega a `window.location.origin`. Allo stesso modo, `img-src https:` accetta immagini da qualsiasi dominio.
- **Correzione:** `'connect-src': ["'self'"]`, poi controllare che Socket.IO si colleghi ancora. Restringere `img-src` quando si sa da dove arrivano gli avatar.

### 7. Suggerimento: altri errori del body parser finiscono come 500

- **Dove:** `app/server/src/app.js:99-108`.
- **Scenario:** `charset.unsupported`, `encoding.unsupported` e simili sono errori del client, ma ricevono 500 e un log "Error:" con lo stack.
- **Correzione:** `if (err.expose && err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: 'Richiesta non valida' });` prima del ramo 500.

## Punti verificati senza problemi

- **Password fuori dalle risposte.** Il `defaultScope` esclude `password` anche nelle include. Il test lo controlla su workspace e dettaglio board. Le include `members` di card e liste usano lo stesso modello `User`, quindi valgono le stesse regole. `User.create` passa da `toJSON()`, che toglie la password. `me` usa `req.user`, caricato con `findByPk` nello scope predefinito. Il socket non manda mai dati dell'utente, solo `userId`.
- **`withPassword` e `comparePassword`.** `withPassword` compare solo in `authController.js:62`. Il grep su tutto `app/server/src` non trova altri usi di `comparePassword` o `user.password`, quindi toglierlo non rompe niente. Gli hook `beforeCreate` e `beforeUpdate` funzionano ancora.
- **JWT.** Il segreto è obbligatorio con almeno 32 caratteri e il processo si ferma subito se manca. L'algoritmo è fissato a HS256 sia nella firma sia nella verifica. I token firmati con il vecchio segreto di riserva vengono rifiutati, e c'è un test.
- **Login a tempo costante.** `HASH_FITTIZIO` ha lo stesso costo (10) degli hash veri, e la risposta per utente inesistente o password sbagliata è la stessa. La registrazione rivela comunque se un'email esiste (409): è normale per questo tipo di app.
- **Validazione.** I tipi diversi da stringa (array, oggetti, numeri) vengono rifiutati con 400 prima di arrivare alla query. Il limite di 72 byte è calcolato in UTF-8. La regex dell'email gira solo dopo il controllo di lunghezza (255), quindi non c'è rischio di ReDoS. Email normalizzata in registrazione e login.
- **Limite del corpo.** 100kb, risposta 413 in JSON. JSON malformato riceve 400.
- **Rate limit sul percorso.** `/API/Auth/Login/` (maiuscole, slash finale) viene contato correttamente, quindi non serve a evitare il limite. Il 429 risponde in JSON e il client mostra `error`.
- **CSP e client compilato.** Il `dist/index.html` non ha script inline. Google Fonts è permesso in `style-src` e `font-src`. Gli stili inline di React sono coperti da `'unsafe-inline'`. In sviluppo l'HTML lo serve Vite, senza CSP di Express.
- **Client.** `lib/api.js` legge solo `responseData.error` e `response.ok`, mai lo status o il testo del messaggio. Il passaggio da 400 a 409 e i messaggi in italiano non rompono niente: l'utente vede il nuovo testo.
- **Registrazione in transazione.** Utente, workspace e membro vengono creati insieme o per niente.
- **Dipendenze.** `helmet@8.3.0` e `express-rate-limit@8.7.5`: pacchetti ufficiali, senza script `postinstall`.

## Fuori scopo (hanno già un'issue)

Permessi su board, liste e card (#15). Socket che ritrasmette gli eventi e `join-board` senza controlli (#16). `sync({ alter: true })` e CORS fissato nel codice (#17). Token in `localStorage` (#20).

Esito: da correggere
