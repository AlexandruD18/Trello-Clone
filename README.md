# Trello Clone

[![CI](https://github.com/AlexandruD18/Trello-Clone/actions/workflows/ci.yml/badge.svg)](https://github.com/AlexandruD18/Trello-Clone/actions/workflows/ci.yml)

Bacheca Kanban collaborativa: board, liste e card che si spostano col trascinamento, con checklist, commenti, etichette e scadenze. Chi guarda la stessa board vede le modifiche degli altri in tempo reale.

Progetto didattico e di portfolio. Non è affiliato ad Atlassian né a Trello, marchio registrato di Atlassian.

## Cosa fa

- **Workspace e board**: ogni utente ha un workspace personale; le board stanno in un workspace e si possono archiviare e ripristinare.
- **Liste e card** ordinate col trascinamento. L'ordine lo calcola il server, in transazione, quindi due persone che spostano insieme non si pestano i piedi.
- **Card** con descrizione, scadenza, colore, etichette, persone assegnate, checklist e commenti.
- **Membri e ruoli** per board: `viewer` legge, `member` modifica, `admin` gestisce impostazioni e persone. Chi fa parte del workspace vede anche le sue board.
- **Tempo reale** con Socket.IO: liste, card, checklist e commenti si aggiornano negli altri browser senza ricaricare.
- **Archivio**: board, liste e card archiviate restano consultabili in sola lettura e si possono ripristinare.

## Stack

| Parte | Tecnologie |
| --- | --- |
| Client | React 18, React Router 7, Vite 7, Tailwind CSS 3, @dnd-kit, Socket.IO client |
| Server | Node.js 20+, Express 4, Socket.IO 4, Sequelize 6, Umzug (migrazioni) |
| Database | MySQL 8 |
| Qualità | Vitest e Supertest, ESLint 9, Prettier, GitHub Actions, Dependabot |

## Avvio rapido

Servono Node.js 20 o più recente e Docker (oppure un MySQL 8 già installato).

```bash
# 1. Dipendenze (un solo comando per server e client: è un workspace npm)
npm install

# 2. Database MySQL in Docker, sulla porta 3307 per non scontrarsi con un MySQL locale
docker run -d --name trello-mysql -p 3307:3306 \
    -e MYSQL_RANDOM_ROOT_PASSWORD=yes \
    -e MYSQL_DATABASE=trello -e MYSQL_USER=trello -e MYSQL_PASSWORD=scegli-una-password \
    mysql:8.4

# 3. Configurazione: copia il file d'esempio e compila JWT_SECRET, DB_PORT=3307, DB_PASSWORD
cp app/server/.env.example app/server/.env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # valore per JWT_SECRET

# 4. Schema del database
npm run db:migrate

# 5. Server (porta 3000) e client (porta 5173) insieme
npm run dev
```

Apri <http://localhost:5173> e registrati. La [guida di avvio](docs/guida-avvio-progetto.md) spiega ogni passo e i problemi più comuni.

## Comandi

Dalla radice del repository:

| Comando | Cosa fa |
| --- | --- |
| `npm run dev` | server con riavvio automatico e client Vite insieme |
| `npm run build` | compila il client in `app/client/dist` |
| `npm start` | avvia solo il server (in produzione serve anche il client compilato) |
| `npm test` | test delle API e del tempo reale (richiede MySQL, vedi sotto) |
| `npm run lint` | ESLint su server e client |
| `npm run format` / `format:check` | Prettier: corregge / controlla la formattazione |
| `npm run db:migrate` | applica le migrazioni in sospeso |

Altri comandi del database, da lanciare in `app/server`: `npm run db:pending`, `npm run db:migrate:undo`, `npm run db:verifica` (confronta il database con i modelli). Le regole per scrivere migrazioni sono in [app/server/migrations/README.md](app/server/migrations/README.md).

## Configurazione

Tutte le variabili stanno in `app/server/.env`; [app/server/.env.example](app/server/.env.example) le documenta una per una.

| Variabile | Predefinito | Note |
| --- | --- | --- |
| `JWT_SECRET` | nessuno | **obbligatoria**, almeno 32 caratteri; senza, il server non parte |
| `PORT`, `HOST` | `3000`, `0.0.0.0` | |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | `127.0.0.1`, `3306`, `trello`, `trello`, vuota | |
| `CORS_ORIGINS` | vuoto | origini esterne ammesse; vuoto = solo la stessa origine |
| `TRUST_PROXY` | `false` | `1` se davanti c'è un proxy come nginx; un valore sbagliato rende aggirabile il rate limit |
| `HTTPS` | `false` | `true` solo se il sito è in HTTPS: attiva cookie `Secure`, HSTS e `upgrade-insecure-requests` |
| `AUTH_RATE_LIMIT` | `20` | tentativi di login e registrazione falliti per IP ogni 15 minuti |
| `DB_LOGGING` | `false` | `true` per vedere le query SQL nel log |

In sviluppo Vite inoltra `/api` e `/socket.io` a `API_TARGET` (predefinito `http://localhost:3000`).

## Architettura

```text
app/
├── client/                 React + Vite
│   └── src/
│       ├── pages/          Home, Board, Login, Registrazione
│       ├── components/     Card, Lista, modale della card, layout
│       ├── context/        sessione (AuthContext) e Socket.IO (SocketContext)
│       └── lib/api.js      chiamate alle API, con il cookie di sessione
└── server/                 Express + Socket.IO
    ├── migrations/         schema del database (SQL, applicato da Umzug)
    ├── src/
    │   ├── app.js          app Express, sicurezza HTTP, route
    │   ├── index.js        avvio: controlla database e migrazioni, poi ascolta
    │   ├── config/         variabili d'ambiente e connessione MySQL
    │   ├── middleware/     sessione (auth.js) e permessi (permessi.js)
    │   ├── controllers/    logica delle API
    │   ├── services/       posizioni di liste e card, riepiloghi delle card
    │   ├── socket/         stanze per board ed eventi emessi dal server
    │   └── models/         modelli Sequelize
    └── test/               Vitest + Supertest, con un MySQL vero
```

Il percorso di una modifica, per esempio lo spostamento di una card:

1. Il client manda `PUT /api/cards/:id/move` con la lista e l'indice di destinazione. Il cookie di sessione parte da solo.
2. `authenticate` legge il cookie; `autorizza('card', …, 'member')` risale dalla card alla board e controlla il ruolo e che niente sia archiviato.
3. Il controller blocca le liste coinvolte, calcola la posizione tra le due card vicine e salva, tutto in una transazione.
4. Dopo il salvataggio il server manda `card:moved` a chi guarda la board, tranne a chi ha fatto la modifica (header `X-Socket-Id`).

I client non inviano mai eventi di modifica via socket: possono solo entrare e uscire dalla stanza di una board, e il server controlla prima che ne abbiano il diritto.

## API

Tutte le route stanno sotto `/api` e, tranne registrazione, login e `health`, richiedono la sessione.

| Risorsa | Route |
| --- | --- |
| Sessione | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`, `POST /auth/logout-all` |
| Workspace | `GET /workspaces`, `GET/PUT/DELETE /workspaces/:id`, `POST /workspaces` |
| Board | `GET /boards` (`?workspaceId=`, `?archiviate=true`), `GET/PUT/DELETE /boards/:id`, `POST /boards`, `POST /boards/:id/restore`, `GET /boards/:id/archiviati` |
| Membri | `POST /boards/:id/members`, `PUT/DELETE /boards/:id/members/:userId` |
| Liste | `POST /lists`, `PUT/DELETE /lists/:id`, `PUT /lists/:id/move`, `POST /lists/:id/restore` |
| Card | `GET/PUT/DELETE /cards/:id`, `POST /cards`, `PUT /cards/:id/move`, `POST /cards/:id/restore`, membri ed etichette in `/cards/:id/members` e `/cards/:id/labels` |
| Checklist | `POST /checklists`, `PUT/DELETE /checklists/:id`, elementi in `/checklists/items` |
| Commenti ed etichette | `/comments` (`?cardId=`), `/labels` (`?boardId=`) |

Eventi Socket.IO inviati dal server a chi segue una board: `list:created`, `list:updated`, `list:moved`, `list:deleted`, `card:created`, `card:updated`, `card:moved`, `card:deleted`, `board:refresh` (ricaricare tutto), `board:accesso-revocato`, `user:joined`, `user:left`.

## Sicurezza

- **Sessione** in un cookie `httpOnly` e `SameSite=Lax`, con `Secure` in HTTPS: gli script della pagina non possono leggerla. "Esci da tutti i dispositivi" invalida ogni sessione aperta.
- **CSRF e WebSocket da altri siti**: le richieste che modificano dati e le connessioni Socket.IO sono accettate solo dalla stessa origine o da `CORS_ORIGINS`.
- **Permessi** controllati su ogni risorsa, anche quando si passa da un id all'altro: lista, card, checklist, commento ed etichetta risalgono alla loro board.
- **Dati personali**: password ed email non escono dalle API; l'email si vede solo nel proprio profilo.
- **Protezioni HTTP** con helmet (CSP compresa), rate limit su login, registrazione e inviti, corpo delle richieste limitato a 100 kB.

Ogni PR delicata (sessione, permessi, migrazioni) è stata rivista da un revisore separato prima del merge; i rapporti sono in [docs/revisioni](docs/revisioni).

## Test e CI

I test girano su un database MySQL dedicato, ricreato con le migrazioni all'inizio di ogni file. In locale, con il container dell'avvio rapido:

```bash
docker exec trello-mysql mysql -uroot -p -e "CREATE DATABASE trello_test; GRANT ALL ON trello_test.* TO 'trello'@'%';"
DB_PASSWORD=scegli-una-password npm test
```

Il setup dei test si rifiuta di partire su un database il cui nome non contiene `test` come parola.

Su ogni pull request GitHub Actions esegue lint e formattazione, i test con un MySQL usa e getta e la build del client. `main` accetta solo pull request con i tre controlli verdi.

## Deploy

In produzione un solo processo Node serve API, Socket.IO e il client compilato.

- Con **PM2**: `DEPLOY_HOST=… DEPLOY_USER=… pm2 deploy ecosystem.config.js production`.
- Con lo **script**: `DEPLOY_HOST=… DEPLOY_USER=… scripts/deploy.sh` compila il client, copia il pacchetto sul server, installa, esegue le migrazioni e riavvia con PM2.

Prima del primo deploy di questa versione:

1. in `app/server/.env` del server: `JWT_SECRET` lungo, `DB_USER` e `DB_PORT` espliciti, `TRUST_PROXY` e `HTTPS` corretti per la propria installazione;
2. `npm run db:verifica` sul database esistente, per controllare che corrisponda ai modelli;
3. le migrazioni partono da sole nel deploy; il server non si avvia se ne manca qualcuna.

Dopo il deploy tutti devono rifare il login: la sessione ora sta in un cookie.

## Documentazione

- [Guida di avvio](docs/guida-avvio-progetto.md): installazione passo per passo e problemi comuni
- [Analisi e PRD](docs/): documenti di partenza del progetto, back-end e front-end
- [Revisioni](docs/revisioni): rapporti delle revisioni di sicurezza e del codice
- [CHANGELOG](CHANGELOG.md)

## Licenza

[MIT](LICENSE). Autore: Alexandru Mihai Dimofte.
