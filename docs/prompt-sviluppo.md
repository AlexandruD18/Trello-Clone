# Trello Clone - Prompt per Sviluppo

## Ruolo

Agisci come un Senior Full Stack Engineer esperto in architetture scalabili, React, Node.js, PostgreSQL e real-time con WebSocket.

## Obiettivo

Creare un'applicazione "Trello Clone" completa, basata rigorosamente sui documenti allegati (PRD, Analisi Funzionale, Analisi Tecnica Back-end e Front-end).

## Stack Tecnologico

**Frontend:** React 18+ (Vite), TypeScript, Tailwind CSS, @dnd-kit (per drag-and-drop), TanStack Query, Zustand, Socket.io-client  
**Backend:** Node.js con NestJS (o Express alternativo), PostgreSQL (usa Prisma/TypeORM come ORM), Redis per caching/Pub/Sub  
**Real-time:** Socket.io (per aggiornamenti board in tempo reale)  
**Database:** PostgreSQL con schema relazionale per board, liste, card, utenti

## Configurazione Ambiente e Porte

- **Frontend App:** porta 5173
- **Backend API:** porta 4000
- **Database:** connessione a PostgreSQL configurata correttamente (porta 5433 via Docker)
- **Redis:** porta 6379 per caching e Pub/Sub

## Requisiti di Avvio e Deploy

- Generare file di configurazione per l'ambiente di produzione.
- Creare script di deploy o file di configurazione (es. `ecosystem.config.js` per PM2 o `setup_deploy.sh`).

**Dati target (esempio):**

- Host: `trello-clone.***.****.**********.net`
- SSH User: `*********`
- SSH Password: `*************` (usa variabili d'ambiente, crea `.env.example` o script di setup)

## Istruzioni Passo-Passo

1. **Analisi:** leggere i file allegati per comprendere entità e flussi (Utenti, Workspace, Board, Liste, Card, Commenti, Checklist).
2. **Setup Database:** creare schema SQL basato sull'analisi tecnica (tabelle per User, Workspace, Board, List, Card, etc.).
3. **Backend:** inizializzare server NestJS sulla porta 4000, implementare API REST e Socket.io, configurare CORS per la porta 5173, integrare Redis per Pub/Sub.
4. **Frontend:** inizializzare app React (Vite) sulla porta 5173, configurare client API verso `localhost:4000`, implementare drag-and-drop con @dnd-kit, gestione stato con TanStack Query e Zustand.
5. **Configurazione Ambiente:** creare `.env` per server e client, setup Docker per PostgreSQL e Redis.
6. **Deploy Script:** creare `setup_deploy.sh` per connettersi via SSH al server e aggiornare l'applicazione.

## Output Atteso

Applicazione funzionante, avviabile con "npm run dev" su server e client, drag-and-drop attivo, aggiornamenti real-time su board, persistenza dei dati su PostgreSQL e caching con Redis.
