# Guida Avvio Progetto Trello-Clone 🚀

Questa guida ti accompagna passo per passo per clonare la repository, configurare PostgreSQL via Docker e avviare l'applicazione (server + client) in locale su Windows.

---

## Prerequisiti

- Node.js ≥ 18 (consigliato LTS)
- npm ≥ 9
- Docker Desktop installato e in esecuzione
- Git installato
- VS Code

Suggerimento: verifica le versioni con:

```bash
node -v
npm -v
git --version
```

---

## 1) Clona la repository e apri il progetto

Apri un terminale nella cartella dove vuoi salvare il progetto, poi:

```bash
git clone <link-repository>
cd Trello-Clone
code .
```

Note:

- `code .` apre il progetto direttamente in VS Code.
- Se il nome della cartella non è `Trello-Clone`, sostituiscilo con quello corretto dopo il clone.

---

## 2) Installa le dipendenze

Installa le librerie per server e client usando due terminali separati (oppure uno solo, navigando tra le cartelle).

Server:

```bash
cd app/server
npm install
```

Client (in un nuovo terminale o tornando indietro con `cd ..`):

```bash
cd app/client
npm install
```

---

## 3) Avvia il database PostgreSQL (Docker)

Useremo PostgreSQL in Docker, in ascolto sulla porta host `5433` (mappata sulla `5432` del container). Avvia Docker Desktop, poi esegui:

```bash
docker run --name trello-db -p 5433:5432 -e POSTGRES_USER=trellouser -e POSTGRES_PASSWORD=trellopass -e POSTGRES_DB=trellodb -d postgres:alpine
```

Note:

- Se il nome `trello-db` è già in uso, avvia il container esistente dalla dashboard di Docker (pallino verde = in esecuzione).
- Per riavvio rapido: `docker start trello-db`
- Per verificare: `docker ps` (controlla che `trello-db` sia "Up")

---

## 4) Configura le variabili ambiente

Assicurati che il server punti al database sulla porta `5433`. Crea (o aggiorna) nella root della cartella `app/server` un file `.env` con valori coerenti. Esempio:

```env
# Server
PORT=4000
NODE_ENV=development

# Database (PostgreSQL via Docker)
DB_HOST=localhost
DB_PORT=5433
DB_USER=trellouser
DB_PASSWORD=trellopass
DB_NAME=trellodb

# JWT
JWT_SECRET=your_super_secret_jwt_key_here

# Redis (se usato)
REDIS_URL=redis://localhost:6379

# CORS / Client
CLIENT_URL=http://localhost:5173
```

Per il client, crea un file `.env` in `app/client`:

```env
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
```

Se il progetto usa ORM come Prisma/TypeORM, verifica anche i file di configurazione (es. `prisma/schema.prisma`) per coerenza con queste variabili.

---

## 5) Avvia l'applicazione (due terminali)

Avvia server e client in parallelo.

Terminale 1 — Server (dalla cartella `app/server`):

```bash
npm run dev
```

Terminale 2 — Client (dalla cartella `app/client`):

```bash
npm run dev
```

Punti di accesso usuali:

- API server: http://localhost:4000 (o come configurato in `.env`)
- Frontend: http://localhost:5173

---

## 6) Verifica rapida

- Frontend: apri il browser su `http://localhost:5173`
- Registrazione/Login: crea un account e accedi
- Board: crea una nuova board, aggiungi liste e card, testa drag-and-drop

---

## 7) Troubleshooting

- Porta occupata (5433):
  - Cambia mapping `-p 5434:5432` nel comando Docker e aggiorna `DB_PORT=5434` nel `.env`.
- Il container non parte:
  - Controlla Docker Desktop sia avviato.
  - `docker logs trello-db` per vedere log di errore.
- Errore di connessione al DB:
  - Verifica `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
  - Testa con un client PostgreSQL (es. DBeaver) usando gli stessi valori.
- Il client non si connette all'API:
  - Verifica `CLIENT_URL` e CORS lato server.
  - Controlla che il server sia effettivamente su `http://localhost:4000`.
- Problemi su Windows (PowerShell):
  - Esegui i comandi in PowerShell o Git Bash.
  - Se `code` non è riconosciuto, aggiungi VS Code al PATH o apri manualmente.
- WebSocket non funziona:
  - Assicurati che Redis sia avviato se usato per Pub/Sub (vedi sezione Redis se applicabile).

---

## 8) Comandi utili

Arresta e rimuovi il DB (attenzione: dati persi):

```bash
docker stop trello-db
docker rm trello-db
```

Ricrea il DB pulito:

```bash
docker run --name trello-db -p 5433:5432 -e POSTGRES_USER=trellouser -e POSTGRES_PASSWORD=trellopass -e POSTGRES_DB=trellodb -d postgres:alpine
```

Lista container attivi:

```bash
docker ps
```

Se usi Redis per caching/Pub/Sub:

```bash
docker run --name trello-redis -p 6379:6379 -d redis:alpine
```

---

## 9) Suggerimenti di qualità

- Mantieni `.env` fuori dal VCS se contiene segreti (aggiungi a `.gitignore`).
- Usa un tool DB (DBeaver/Beekeeper) per ispezionare tabelle e dati.
- Valuta `npm run build` sul client per testare la build production.
- Se disponibile, esegui migrazioni ORM prima di avviare il server (Prisma/TypeORM).
- Per testing: esegui `npm run test` su server e client per verificare suite unitarie/integrazione.

---

## 10) Riferimenti

- Documentazione PostgreSQL Docker: https://hub.docker.com/_/postgres
- Documentazione Vite: https://vitejs.dev/
- Documentazione React: https://react.dev/
- Docker Desktop: https://www.docker.com/products/docker-desktop
- Documentazione Trello-Clone: consulta la cartella `docs/` per PRD, Analisi Funzionale e Tecnica.
