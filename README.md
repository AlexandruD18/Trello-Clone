# Trello Clone – Enterprise-Ready Kanban Platform

[![Version](https://img.shields.io/badge/version-1.0-blue.svg)](https://github.com/your-repo/trello-clone)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D.svg)](https://redis.io/)

Un clone open-source di Trello: una piattaforma Kanban collaborativa ad **alte prestazioni**, progettata con un'architettura moderna **orientata agli eventi** e un'interfaccia utente **reattiva in tempo reale**. Ideale per portfolio, educazione e deployment enterprise.

**Versione:** 1.0 | **Data:** 24 novembre 2025 | **Autore:** Team di Sviluppo Trello Clone

---

## 🚀 Quick Start

Vuoi iniziare subito? Segui questi 3 step:

```bash
# 1. Clona il repo
git clone https://github.com/your-repo/trello-clone.git
cd Trello-Clone

# 2. Avvia PostgreSQL e Redis con Docker
docker run --name trello-db -p 5433:5432 -e POSTGRES_USER=trellouser -e POSTGRES_PASSWORD=trellopass -e POSTGRES_DB=trellodb -d postgres:alpine
docker run --name trello-redis -p 6379:6379 -d redis:alpine

# 3. Avvia server e client
cd app/server && npm install && npm run dev  # Terminal 1
cd app/client && npm install && npm run dev  # Terminal 2 (porta 5173)
```

**Per dettagli completi**, vedi [Guida Avvio Progetto](docs/guida-avvio.md).

---

## 📑 Indice

- [Overview](#-overview)
- [Features at a Glance](#-features-at-a-glance)
- [Stack Tecnologico](#-stack-tecnologico)
- [Architettura](#-architettura)
- [Project Structure](#-project-structure)
- [Requisiti e Installazione](#-requisiti-e-installazione)
- [API & WebSocket](#-api--websocket)
- [Development](#-development)
- [Performance Metrics](#-performance-metrics)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [Roadmap](#-roadmap)
- [Troubleshooting](#-troubleshooting)
- [Licenza](#-licenza)

---

## Descrizione

Trellino è un'implementazione completa e scalabile di una piattaforma di project management visuale ispirata a Trello. A differenza di semplici cloni didattici, questo progetto affronta sfide reali di concorrenza, real-time collaboration e performance su larga scala. Utilizza tecniche avanzate come optimistic UI updates, virtualizzazione, e event-driven architecture per garantire un'esperienza utente fluida anche con board complesse contenenti migliaia di card.

Il repository è organizzato in moduli indipendenti:

- `app/server/` — Backend: API REST, WebSocket Gateway, logica di business e gestione eventi.
- `app/client/` — Frontend: Single Page Application (SPA) React con gestione stato avanzata.
- `docs/` — Documentazione tecnica completa, inclusi Product Requirements Document (PRD), Analisi Funzionale e Analisi Tecnica.

Questo progetto dimostra competenze avanzate in full-stack development, architetture distribuite e ottimizzazioni performance, rendendolo ideale per portfolio professionali o come base per prodotti enterprise.

---

## Motivazioni e Obiettivi

### Perché un Clone di Trello?

Trello rappresenta un eccellente caso di studio per piattaforme collaborative. Tuttavia, molti cloni esistenti mancano di profondità tecnica. Questo progetto mira a:

- **Dimostrare Scalabilità:** Gestire concorrenza elevata senza compromessi su performance.
- **Implementare Best Practices:** Utilizzo di pattern moderni come event sourcing, optimistic locking e virtualizzazione.
- **Educare e Ispirare:** Fornire un esempio concreto di architettura full-stack enterprise-ready.

### Obiettivi Principali

1. **Performance Eccellente:** Latenza < 150ms per aggiornamenti real-time, supporto per 1000+ card senza lag.
2. **User Experience Fluida:** Drag-and-drop intuitivo, responsive design, accessibilità WCAG 2.1 AA.
3. **Sicurezza e Affidabilità:** Autenticazione robusta, transazioni atomiche, logging completo.
4. **Scalabilità Architetturale:** Microservizi modulari, Pub/Sub per multi-istanze, caching intelligente.
5. **Manutenibilità:** Codice ben strutturato, testing completo, documentazione esaustiva.

Il progetto è progettato per essere estensibile, con roadmap per features avanzate come notifiche push e integrazioni esterne.

---

## Stack Tecnologico

La scelta delle tecnologie è guidata da principi di performance, manutenibilità e maturità dell'ecosistema.

### Frontend

- **Core Framework:** React 18+ con Concurrent Mode e Suspense per rendering efficiente e user experience migliorata.
- **Linguaggio:** TypeScript per type safety e developer experience.
- **Build Tool:** Vite per velocità di sviluppo e ottimizzazioni bundle avanzate.
- **State Management:**
  - TanStack Query v5 per server state: caching intelligente, sincronizzazione automatica, optimistic updates.
  - Zustand per client state: lightweight e performante per UI state locale.
- **UI & Styling:** Tailwind CSS 3.4+ per utility-first CSS; shadcn/ui per componenti accessibili e consistenti; CSS Modules per isolamento scoped.
- **Drag & Drop:** @dnd-kit, scelto per accessibilità nativa e performance superiore rispetto a alternative come react-beautiful-dnd.
- **Real-time:** Socket.io-client per comunicazione bidirezionale efficiente.
- **Performance:** TanStack Virtual per virtualizzazione liste/card, riducendo DOM nodes e migliorando FPS.
- **Testing:** Vitest per unit tests veloci; React Testing Library per test integrati; Playwright per E2E su browser reali.

**Motivazioni:** Questo stack garantisce un bundle ottimizzato (< 300KB gzipped), eccellente DX con hot reload, e supporto per features avanzate come code splitting e lazy loading.

### Backend

- **Runtime:** Node.js ≥ 18 per async/await nativo e ecosistema maturo; alternativa Go per servizi ad alte prestazioni.
- **Framework:** NestJS per struttura modulare e dependency injection; o Go con Gin per bassa latenza.
- **Database:** PostgreSQL 14+ per ACID compliance, JSONB per dati flessibili, e performance su query complesse.
- **Caching & Pub/Sub:** Redis Cluster per caching distribuito e coordinamento eventi tra istanze.
- **WebSocket:** uWebSockets.js per performance estrema; Socket.io per fallback e sticky sessions.
- **Autenticazione:** JWT con refresh token per stateless auth; Argon2 per hashing sicuro.

**Motivazioni:** Architettura event-driven con Pub/Sub permette scalabilità orizzontale. PostgreSQL garantisce consistenza per operazioni transazionali come drag-and-drop.

---

## Funzionalità Principali

### Core Experience

- **Workspace & Board:** Struttura gerarchica Workspace → Board → Liste → Card, con permessi granulari (RBAC).
- **Drag & Drop Avanzato:** Implementazione con @dnd-kit supporta clone fantasma, touch gestures e auto-scroll. Utilizza Fractional Indexing per ordering stabile, evitando conflitti in ambienti concorrenti.
- **Collaborazione Real-Time:** WebSocket broadcast aggiornamenti istantanei (latenza < 150ms). Gestione conflitti con optimistic locking e rollback automatico.

### Gestione Card

- **Dettagli Ricchi:** Editor Markdown/Rich-text con Tiptap, checklist collaborative, date di scadenza, etichette colorate e assegnazione membri.
- **Modal & Routing:** Ogni card ha URL univoco (/b/:boardId/c/:cardId), abilitando deep linking e navigazione browser.
- **Optimistic UI:** Aggiornamenti immediati dell'interfaccia, con sincronizzazione server-side e gestione errori.

### Performance & Scalabilità

- **Virtualizzazione:** TanStack Virtual limita rendering a elementi visibili, supportando board massive senza degradation.
- **Code Splitting:** Lazy loading di componenti pesanti (modali, pagine) per ridurre initial bundle size.
- **Ottimizzazioni Bundle:** Tree shaking, compression, e preload strategico mantengono < 300KB gzipped.

**Benefici:** L'app rimane responsiva su dispositivi mobili e desktop, con eccellenti Core Web Vitals (Lighthouse score > 90).

---

## Architettura

### Frontend (Clean UI Architecture)

Struttura feature-based per isolamento e riusabilità:

- **Components:** Atoms (Button, Input) e molecules (Avatar, ColorPicker) per design system consistente.
- **Features:** Moduli isolati (Auth, Boards, Cards) con logica propria, API hooks e componenti.
- **Stores:** Separazione Zustand (UI state) e TanStack Query (server state) per ottimizzazioni specifiche.
- **Lib:** Utilities, API client, socket handlers.

**Diagramma Concettuale:**

```
User Interaction → Feature Component → API Hook → TanStack Query → Server
                     ↓
               Zustand Store (UI State)
```

### Backend (Event-Driven Microservices)

Approccio modulare per scalabilità:

1. **Gateway Server:** Gestisce WebSocket connections e subscriptions per board.
2. **API Server:** CRUD REST, autenticazione, validazioni.
3. **Board Service:** Logica transazionale per liste/card, ordering con optimistic locking.
4. **Redis Pub/Sub:** Sincronizzazione eventi tra istanze per alta disponibilità.

**Diagramma Concettuale:**

```
Client → Load Balancer → Gateway WS Server
                     ↓ Pub/Sub (Redis)
           Board Service → API Server → PostgreSQL
```

**Motivazioni Architetturali:** Event-driven permette decoupling, facilitando scalabilità e manutenzione. Locking ottimistico risolve conflitti senza blocchi pesanti.

---

## Requisiti di Sistema

- **Node.js:** ≥ 18 (per ES modules e performance).
- **PostgreSQL:** ≥ 14 (per JSONB e partitioning).
- **Redis:** ≥ 7 (per cluster e streams).
- **Browser:** Moderni con WebSocket support (Chrome 88+, Firefox 85+).

---

## Installazione e Avvio

### Prerequisiti

Assicurati di avere installati Node.js, PostgreSQL e Redis. Crea database e configura Redis.

### 1. Clona il Repository

```bash
git clone https://github.com/your-repo/trello-clone.git
cd trello-clone
```

### 2. Setup Variabili d'Ambiente

Crea `.env` in `app/server` e `app/client` basandoti su `.env.example`.

Esempio `app/server/.env`:

```env
DATABASE_URL=postgres://user:pass@localhost:5432/trellino
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_key_here
PORT=4000
```

Esempio `app/client/.env`:

```env
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
```

### 3. Backend

```bash
cd app/server
npm install
# Migrazioni DB (usa Prisma/TypeORM)
npm run db:migrate
# Avvia in sviluppo
npm run dev
```

Il server sarà su `http://localhost:4000`.

### 4. Frontend

```bash
cd app/client
npm install
npm run dev
```

L'app sarà su `http://localhost:5173`.

### 5. Verifica

Apri browser su `http://localhost:5173`, registra un account e crea una board.

---

## API Endpoints

Sintesi degli endpoint principali. Per dettagli completi, vedi `docs/back-end/`.

- **Auth:** `POST /auth/login`, `POST /auth/signup`, `POST /auth/refresh`
- **Workspace:** `GET /workspaces`, `POST /workspaces`, `PATCH /workspaces/:id`
- **Board:** `GET /boards/:id`, `POST /boards`, `PATCH /boards/:id`
- **Card:** `GET /cards/:id`, `POST /cards`, `PATCH /cards/:id`, `POST /cards/move`

Eventi WebSocket: `board:update`, `list:created`, `card:moved`, etc.

---

## Testing

Suite complete per qualità del codice:

- **Frontend:** `npm run test` (Vitest unit), `npm run test:e2e` (Playwright).
- **Backend:** `npm run test` (Jest integration), `npm run test:cov` (coverage).

**Motivazioni:** Testing automatizzato garantisce affidabilità, con focus su edge cases come concorrenza e real-time.

---

## Contributing

Contributi benvenuti! Segui questi passi:

1. Fork il repo.
2. Crea un branch feature (`git checkout -b feature/nuova-feature`).
3. Commit changes (`git commit -m 'Aggiungi nuova feature'`).
4. Push e apri PR.

**Linee Guida:**

- Segui ESLint/Prettier.
- Scrivi test per nuove features.
- Aggiorna documentazione.
- Usa conventional commits.

Vedi `CONTRIBUTING.md` per dettagli.

---

## Roadmap

- [x] Autenticazione e Workspace
- [x] Board, Liste e Card (CRUD)
- [x] Drag & Drop Real-time
- [ ] Notifiche Push (Firebase/APNs)
- [ ] Upload Allegati (S3/MinIO)
- [ ] Power-ups e Automazioni (Zapier-like)
- [ ] Mobile App (React Native)
- [ ] Integrazioni API Esterne (Slack, GitHub)

---

## Licenza

Distribuito sotto [Licenza MIT](LICENSE). Vedi file LICENSE per dettagli.

---

## Acknowledgments

- Ispirato da Trello per UX eccellente.
- Librerie open-source: React, TanStack, @dnd-kit, etc.
- Community per feedback e contributi.

Per domande, apri issue su GitHub.
