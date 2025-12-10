# **Trello Clone**

Un clone open-source di Trello: una piattaforma Kanban collaborativa ad alte prestazioni, progettata con un'architettura moderna orientata agli eventi e un'interfaccia utente reattiva in tempo reale.

**Versione:** 1.0
**Data:** 24.11.2025
**Stato:** Testing (Draft)

---
 
## **Descrizione**

Trellino implementa le funzionalità core di una piattaforma di project management visuale. Il progetto non è solo un esercizio di stile, ma un sistema scalabile progettato per gestire concorrenza elevata, aggiornamenti in tempo reale e una UX fluida grazie a tecniche avanzate come _optimistic UI updates_ e _virtualization_.

Il repository è strutturato come segue:

- `back-end/` — API Server (REST), WebSocket Gateway, logica di business e gestione eventi.
- `front-end/` — SPA React performante con gestione stato avanzata.
- `docs/` — Documentazione completa (PRD, Analisi Funzionale, Analisi Tecnica).

---

## **Stack Tecnologico**

### **Frontend**

- **Core:** React 18+, TypeScript, Vite
- **State Management:** TanStack Query v5 (Server State), Zustand (Client State)
- **UI & Styling:** Tailwind CSS 3.4+, shadcn/ui, CSS Modules
- **Drag & Drop:** @dnd-kit (accessibile e performante)
- **Real-time:** Socket.io-client
- **Performance:** TanStack Virtual (virtualizzazione liste/card)
- **Testing:** Vitest, React Testing Library, Playwright

### **Backend**

- **Runtime/Framework:** Node.js (NestJS) o Go (per servizi ad alte prestazioni)
- **Database:** PostgreSQL 14+ (Schema relazionale rigoroso)
- **Caching & Pub/Sub:** Redis Cluster (per coordinamento istanze e cache)
- **WebSocket:** uWebSockets.js o Socket.io con sticky sessions
- **Auth:** JWT + Refresh Token, Argon2 hashing

---

## **Funzionalità Principali**

### **Core Experience**

- **Workspace & Board:** Gestione gerarchica (Workspace → Board → Liste → Card).
- **Drag & Drop Avanzato:** Spostamento fluido di liste e card con _clone fantasma_, supporto touch e feedback aptico su mobile.
- **Ordering Stabile:** Utilizzo di **indici decimali (Fractional Indexing)** per evitare conflitti di riordino massivi.
- **Collaborazione Real-Time:** Le modifiche di altri utenti appaiono istantaneamente (latenza < 150ms).

### **Gestione Card**

- **Dettagli Ricchi:** Descrizioni Markdown/Rich-text (Tiptap), checklist, scadenze, etichette e membri.
- **Modal & Routing:** Ogni card ha un URL univoco; navigazione gestita via React Router.
- **Optimistic UI:** L'interfaccia si aggiorna immediatamente prima della conferma del server, con rollback automatico in caso di errore.

### **Performance & Scalabilità**

- **Virtualizzazione:** Supporto per board con 1000+ card senza lag di rendering.
- **Code Splitting:** Caricamento lazy di modali e rotte secondarie.
- **Bundle Size:** Ottimizzato per rimanere sotto i 300KB (gzipped).

---

## **Architettura**

### **Frontend (Clean UI Architecture)**

L'applicazione frontend segue una struttura _feature-based_:

- **Components:** UI atoms riusabili (Button, Input).
- **Features:** Moduli isolati (Auth, Board, Card) contenenti la propria logica, API hooks e componenti specifici.
- **Stores:** Separazione netta tra stato UI (Zustand) e cache dati (TanStack Query).

### **Backend (Event-Driven)**

Il backend adotta un approccio a microservizi o modulare:

1.  **Gateway Server:** Gestisce connessioni WebSocket e subscription.
2.  **API Server:** Gestisce CRUD REST e autenticazione.
3.  **Board Service:** Gestisce la logica transazionale e l'ordering (con locking ottimistico).
4.  **Redis Pub/Sub:** Sincronizza lo stato tra diverse istanze del server.

---

## **Requisiti di Sistema**

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 14
- **Redis** ≥ 7

---

## **Installazione e Avvio**

### **1. Setup Variabili d'Ambiente**

Crea un file `.env` sia nella root del backend che del frontend (vedi `.env.example`).
Esempio variabili Backend:

```env
DATABASE_URL=postgres://user:pass@localhost:5432/trellino
REDIS_URL=redis://localhost:6379
JWT_SECRET=super_secret_key
PORT=4000
```

### **2. Backend**

```powershell
cd back-end
npm install
# Esegui migrazioni DB (es. con Prisma o TypeORM)
npm run db:migrate
# Avvia in sviluppo
npm run dev
```

### **3. Frontend**

```powershell
cd front-end
npm install
# Avvia in sviluppo
npm run dev
```

La piattaforma sarà accessibile all'indirizzo `http://localhost:5173` (default Vite).

---

## **API Endpoints (Sintesi)**

La comunicazione avviene tramite REST per le mutazioni e WebSocket per gli aggiornamenti.

- **Auth**: `/auth/login`, `/auth/signup`
- **Workspace**: `/w/:id` (Gestione membri e board)
- **Board**: `/b/:id` (Fetch dati completi board)
- **Card**: `/cards/:id` (PATCH per update, POST /move per drag&drop transazionale)

Per la documentazione completa delle API e degli eventi WebSocket, consultare la cartella `docs/`.

---

## **Testing**

Il progetto include suite di test unitari e di integrazione.

- **Front-end**: `npm run test` (Vitest) o `npm run test:e2e` (Playwright)
- **Back-end**: `npm run test` (Jest/Supertest)

---

## **Roadmap**

- [x] Autenticazione e Workspace
- [x] Board, Liste e Card (CRUD)
- [x] Drag & Drop Real-time
- [ ] Notifiche Push
- [ ] Upload allegati (S3/MinIO)
- [ ] Power-ups e Automazioni

---

## **Licenza**

Distribuito sotto licenza MIT. Vedi `LICENSE` per maggiori informazioni.
