# Changelog

Le modifiche importanti del progetto. Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e le versioni [Semantic Versioning](https://semver.org/lang/it/).

## [Non rilasciato]

Previsto con la #21: interfaccia in italiano, componenti del client divisi, React 19 e Tailwind 4, stato "archiviata" e ripristino nell'interfaccia.

## [1.1.0] - 2026-11-25

Bonifica completa dopo l'analisi del 22 novembre 2026: sicurezza, struttura, database, test e CI. Le PR su sessione, permessi e migrazioni hanno ciascuna un rapporto di revisione in `docs/revisioni`.

### Sicurezza

- Controllo dei permessi su tutte le risorse: prima bastava il login per leggere, modificare e cancellare le board degli altri (#15).
- Socket.IO: si entra nella stanza di una board solo con un ruolo, e gli eventi partono dal server dopo il salvataggio; prima il server ritrasmetteva quelli inviati dai client (#16).
- Sessione in un cookie `httpOnly` e `SameSite=Lax` al posto del token in `localStorage`; logout e "esci da tutti i dispositivi"; controllo dell'origine contro CSRF e WebSocket da altri siti (#20).
- `JWT_SECRET` obbligatorio: è stato tolto il segreto di riserva scritto nel codice (#14).
- Password ed email non escono più dalle risposte, nemmeno dentro i membri di board e card (#14, #48).
- Helmet con CSP, rate limit su login, registrazione e inviti, validazione dell'input, corpo limitato a 100 kB (#14).
- Storia git ripulita da password del database e `node_modules`.

### Aggiunto

- Membri della board: inviti per email, cambio di ruolo, rimozione e uscita; chi perde l'accesso esce subito dal tempo reale (#48).
- Board, liste e card archiviate in sola lettura, con ripristino ed elenco dell'archivio (#46, #52).
- Migrazioni del database con Umzug e i comandi `db:migrate`, `db:pending`, `db:migrate:undo`, `db:verifica` (#17).
- Test automatici delle API e del tempo reale con Vitest, Supertest e un MySQL vero (#13).
- CI su GitHub Actions (lint, formattazione, test, build), protezione di `main`, Dependabot, template di issue e PR (#12, #22).

### Modificato

- Un solo backend: eliminato `app/index.js`, che teneva i dati in memoria; server e client in un unico workspace npm (#10).
- Le posizioni di liste e card le calcola il server, in transazione, senza deadlock negli spostamenti contemporanei; colonne `position` in `DOUBLE` (#18).
- La board si carica con un riepilogo per card (conteggi di commenti e checklist) invece di tutti i dettagli (#19).
- Il server non parte senza database o con migrazioni in sospeso, e si chiude in modo ordinato (#17).
- Porte, host e origini CORS da variabili d'ambiente (#17).
- Codice formattato con Prettier a 4 spazi e fine riga LF (#11).
- README e guida di avvio riscritti sul codice reale (MySQL, non PostgreSQL) (#22).

### Corretto

- Spostando una lista, dopo una ricarica l'ordine cambiava: veniva salvata una sola posizione (#18).
- Il tempo reale non partiva mai: il client entrava nella board prima che il socket esistesse (#16).
- Trascinamenti annullati lasciavano la card nella lista sbagliata (#18).

## [1.0.0] - 2025-11-24

Prima versione: board, liste, card, checklist, commenti ed etichette con React, Express, Socket.IO e MySQL.

[Non rilasciato]: https://github.com/AlexandruD18/Trello-Clone/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/AlexandruD18/Trello-Clone/releases/tag/v1.1.0
[1.0.0]: https://github.com/AlexandruD18/Trello-Clone/commits/main
