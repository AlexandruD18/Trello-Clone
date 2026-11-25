# Guida di avvio

Questa guida porta da un computer vuoto all'app funzionante in locale, con i test. Il riassunto veloce è nel [README](../README.md#avvio-rapido).

## 1. Cosa serve

| Strumento | Versione | Per cosa |
| --- | --- | --- |
| Node.js | 20 o più recente | server, client, test |
| npm | quello di Node | dipendenze (il repository è un workspace npm) |
| Docker Desktop | qualsiasi versione recente | MySQL 8 in un container |
| Git | | clonare il repository |

Se hai già un MySQL 8 installato puoi saltare Docker: ti servono un database, un utente con tutti i permessi su quel database e la sua password.

## 2. Codice e dipendenze

```bash
git clone https://github.com/AlexandruD18/Trello-Clone.git
cd Trello-Clone
npm install
```

`npm install` dalla radice installa insieme server (`app/server`) e client (`app/client`). Non serve entrare nelle cartelle.

## 3. Database

```bash
docker run -d --name trello-mysql -p 3307:3306 \
    -e MYSQL_RANDOM_ROOT_PASSWORD=yes \
    -e MYSQL_DATABASE=trello \
    -e MYSQL_USER=trello \
    -e MYSQL_PASSWORD=scegli-una-password \
    mysql:8.4
```

La porta esterna è 3307 per non scontrarsi con un eventuale MySQL già acceso sulla 3306. Il primo avvio del container impiega una ventina di secondi; controlli che sia pronto con:

```bash
docker exec trello-mysql mysqladmin ping -utrello -pscegli-una-password
```

La risposta attesa è `mysqld is alive`.

## 4. Configurazione

```bash
cp app/server/.env.example app/server/.env
```

Nel file `app/server/.env` cambia almeno:

```ini
JWT_SECRET=<incolla qui un valore lungo e casuale>
DB_PORT=3307
DB_PASSWORD=scegli-una-password
```

Per generare `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Il server controlla la configurazione all'avvio e si ferma con un messaggio chiaro se `JWT_SECRET` manca o è più corto di 32 caratteri. Le altre variabili sono spiegate in [.env.example](../app/server/.env.example).

## 5. Schema del database

```bash
npm run db:migrate
```

Crea le tabelle applicando i file di `app/server/migrations` in ordine. Il server non parte se ci sono migrazioni in sospeso, quindi va rilanciato ogni volta che ne arrivano di nuove con un `git pull`.

## 6. Avvio

```bash
npm run dev
```

Partono insieme:

- il server su <http://localhost:3000>, che si riavvia da solo quando cambi un file;
- il client Vite su <http://localhost:5173>, che inoltra `/api` e `/socket.io` al server.

Apri <http://localhost:5173>, registrati, crea una board. Per provare il tempo reale apri la stessa board in una finestra anonima con un secondo utente, dopo averlo invitato dal primo.

## 7. Test

I test usano un database separato, il cui nome deve contenere `test` (es. `trello_test`): il setup lo svuota a ogni esecuzione.

```bash
docker exec trello-mysql mysql -uroot -p"$(docker logs trello-mysql 2>&1 | grep 'GENERATED ROOT PASSWORD' | awk '{print $NF}')" \
    -e "CREATE DATABASE trello_test; GRANT ALL ON trello_test.* TO 'trello'@'%';"

DB_PASSWORD=scegli-una-password npm test
```

La password di root casuale si legge nel log del container, nella riga `GENERATED ROOT PASSWORD`. Per default i test si collegano a `127.0.0.1:3307`; si cambia con `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.

Prima di aprire una pull request conviene lanciare anche `npm run lint` e `npm run format:check`: sono gli stessi controlli della CI.

## 8. Problemi comuni

| Sintomo | Causa probabile | Cosa fare |
| --- | --- | --- |
| `JWT_SECRET mancante o troppo corto` all'avvio | `.env` non compilato | passo 4 |
| `Database non raggiungibile su 127.0.0.1:3306` | porta sbagliata o container spento | `DB_PORT=3307` nel `.env`; `docker start trello-mysql` |
| `Ci sono N migrazioni da eseguire` | schema vecchio dopo un `git pull` | `npm run db:migrate` |
| `Access denied for user 'trello'` | password diversa da quella del container | allinea `DB_PASSWORD` a `MYSQL_PASSWORD` |
| La board non si aggiorna da sola | client aperto su un'altra porta o socket rifiutato | usa <http://localhost:5173>; con un client su un'altra origine aggiungila a `CORS_ORIGINS` |
| `Richiesta da un sito non autorizzato` (403) | la richiesta arriva da un'origine non ammessa | stessa causa della riga sopra |
| `Troppi tentativi. Riprova tra qualche minuto.` | rate limit sui login falliti | aspetta 15 minuti o alza `AUTH_RATE_LIMIT` in sviluppo |
| I test si fermano con `I test vanno lanciati solo su un database…` | `DB_NAME` senza `test` | usa `trello_test` |
| La porta 3000 o 5173 è occupata | un'altra istanza è ancora accesa | chiudila, oppure cambia `PORT` (e `API_TARGET` per Vite) |

## 9. Produzione

Il deploy (PM2 o `scripts/deploy.sh`), le variabili da controllare e i passi del primo rilascio sono nel [README](../README.md#deploy).
