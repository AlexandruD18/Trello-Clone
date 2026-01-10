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

**Per dettagli completi**, vedi [Guida Avvio Progetto](docs/guida-avvio-progetto.md).

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

## 📌 Overview

**Trellino** è un'implementazione **enterprise-ready** di una piattaforma di project management visuale ispirata a Trello. A differenza di cloni didattici superficiali, questo progetto affronta sfide reali:

- ✅ **Concorrenza elevata** senza compromessi su performance (latenza < 150ms)
- ✅ **Collaborazione real-time** con WebSocket e Pub/Sub
- ✅ **Board massive** (1000+ card) con virtualizzazione
- ✅ **Drag-and-drop fluido** con @dnd-kit e optimistic UI
- ✅ **Architettura scalabile** con microservizi e event-driven design
- ✅ **Sicurezza enterprise** (RBAC, transazioni atomiche, logging)

Perfetto per **portfolio professionali**, **case study educativi** e **deployment enterprise**.

---

## ⚡ Features at a Glance

| Categoria                | Feature              | Dettagli                                      |
| ------------------------ | -------------------- | --------------------------------------------- |
| **Collaboration**        | Real-time Updates    | WebSocket, broadcast events < 150ms           |
|                          | Workspace Management | Spazi isolati con permessi granulari (RBAC)   |
|                          | Multi-user Editing   | Optimistic locking, conflict resolution       |
| **Board Management**     | Board CRUD           | Create, read, update, delete board            |
|                          | List Ordering        | Fractional Indexing per ordering stabile      |
|                          | Card Details         | Markdown editor, checklist, assignees, labels |
| **UX/Performance**       | Drag & Drop          | @dnd-kit, touch support, auto-scroll          |
|                          | Virtualizzazione     | 1000+ card senza lag (TanStack Virtual)       |
|                          | Responsive Design    | Mobile, tablet, desktop (WCAG 2.1 AA)         |
| **Developer Experience** | TypeScript           | Type safety completo                          |
|                          | Hot Reload           | Vite con refresh istantaneo                   |
|                          | Testing              | Vitest, React Testing Library, Playwright     |

---

## 🛠 Stack Tecnologico

### Frontend

```
React 18+ (Concurrent Mode) + TypeScript
    ↓
Vite (build tool)
    ↓
TanStack Query (server state) + Zustand (UI state)
    ↓
Tailwind CSS + shadcn/ui (design system)
    ↓
@dnd-kit (drag-and-drop) + TanStack Virtual (virtualization)
    ↓
Socket.io-client (real-time)
```

**Perché:**

- **React 18+:** Concurrent Mode, Suspense, fiber architecture per rendering efficiente.
- **TypeScript:** Type safety, refactoring sicuro, DX eccellente.
- **Vite:** Build 10x più veloce di Webpack, HMR istantaneo.
- **TanStack Query:** Caching intelligente, sync automatica, optimistic updates.
- **Zustand:** Lightweight, API semplice, performance superiore a Redux.
- **@dnd-kit:** Accessibilità nativa, performance superiore, well-maintained.
- **Bundle < 300KB gzipped:** Tree shaking, code splitting, lazy loading.

### Backend

```
Node.js ≥ 18 + NestJS (o Express)
    ↓
PostgreSQL 14+ (ACID transactions)
    ↓
Redis 7+ (caching + Pub/Sub)
    ↓
Socket.io (WebSocket con fallback)
    ↓
JWT + Argon2 (authentication)
```

**Perché:**

- **NestJS:** Architettura modulare, dependency injection, middleware built-in.
- **PostgreSQL:** ACID compliance, JSONB, performance su query complesse.
- **Redis Pub/Sub:** Multi-instance coordination, event broadcast.
- **Socket.io:** Fallback HTTP long-polling, sticky sessions, namespaces.
- **JWT:** Stateless auth, scalabilità orizzontale.
- **Argon2:** Password hashing moderno, resistente a GPU attacks.

---

## 🏗 Architettura

### Frontend (Clean UI Architecture)

```
Pages (Route-based)
    ↓
Features (Auth, Boards, Cards)
    ├── Components (UI atoms + molecules)
    ├── Hooks (API calls, custom logic)
    └── Stores (Zustand + TanStack Query)
    ↓
Lib (utilities, API client, socket handlers)
```

**Principi:**

- **Feature-based:** Isolamento logico, fácil manutenzione.
- **Colocation:** Logica e componenti insieme.
- **Separation of Concerns:** UI state (Zustand) vs Server state (TanStack Query).

### Backend (Event-Driven Microservices)

```
Client (WebSocket + REST)
    ↓
Load Balancer (sticky sessions)
    ↓
Gateway Server (WebSocket subscriptions)
    ↓ Pub/Sub (Redis)
    ├── API Server (REST, auth, CRUD)
    ├── Board Service (ordering, locking)
    └── Event Service (audit log)
    ↓
PostgreSQL (persistence)
```

**Benefici:**

- **Decoupling:** Servizi indipendenti, scaling selettivo.
- **Event-Driven:** Loose coupling, better testability.
- **Optimistic Locking:** Risolve conflitti senza blocchi pesanti.

---

## 📂 Project Structure

```
Trello-Clone/
├── app/
│   ├── server/                    # Backend NestJS
│   │   ├── src/
│   │   │   ├── auth/             # Autenticazione (JWT, guards)
│   │   │   ├── workspaces/       # Workspace management
│   │   │   ├── boards/           # Board CRUD, ordering logic
│   │   │   ├── lists/            # Liste (CRUD, drag-drop)
│   │   │   ├── cards/            # Card details, checklist
│   │   │   ├── comments/         # Commenti e attività
│   │   │   ├── socket/           # WebSocket handlers
│   │   │   ├── database/         # Prisma schema, migrations
│   │   │   └── config/           # Config, env validation
│   │   ├── .env.example
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── client/                    # Frontend React + Vite
│       ├── src/
│       │   ├── components/        # UI atoms, molecules, organisms
│       │   ├── features/
│       │   │   ├── auth/
│       │   │   ├── boards/
│       │   │   └── cards/
│       │   ├── hooks/             # Custom hooks (API calls, UI)
│       │   ├── stores/            # Zustand stores
│       │   ├── lib/               # Utilities, API client
│       │   ├── types/             # TypeScript types
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── .env.example
│       ├── package.json
│       └── vite.config.ts
│
├── docs/
│   ├── README.md                  # (questo file)
│   ├── guida-avvio.md            # Step-by-step setup guide
│   ├── prompt-sviluppo.md        # Development prompt
│   ├── front-end/
│   │   ├── prd.md                # Product Requirements
│   │   ├── analisi-funzionale.md # Functional Analysis
│   │   └── analisi-tecnica.md    # Technical Analysis
│   └── back-end/
│       ├── prd.md
│       ├── analisi-funzionale.md
│       └── analisi-tecnica.md
│
├── .gitignore
├── LICENSE
└── README.md
```

---

## 📋 Requisiti e Installazione

### Prerequisiti

- **Node.js** ≥ 18 (LTS recommended)
- **PostgreSQL** ≥ 14 (o via Docker)
- **Redis** ≥ 7 (o via Docker)
- **Docker & Docker Compose** (optional, consigliato)

Verifica versioni:

```bash
node -v && npm -v && git --version
```

### Setup Completo (5 minuti)

**1. Clone e accedi**

```bash
git clone https://github.com/your-repo/trello-clone.git
cd Trello-Clone
```

**2. Database via Docker (opzionale)**

```bash
# PostgreSQL
docker run --name trello-db -p 5433:5432 \
  -e POSTGRES_USER=trellouser \
  -e POSTGRES_PASSWORD=trellopass \
  -e POSTGRES_DB=trellodb \
  -d postgres:alpine

# Redis
docker run --name trello-redis -p 6379:6379 -d redis:alpine
```

**3. Variabili d'ambiente**

`app/server/.env`:

```env
PORT=4000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5433
DB_USER=trellouser
DB_PASSWORD=trellopass
DB_NAME=trellodb

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your_super_secret_key_change_in_production

# CORS
CLIENT_URL=http://localhost:5173
```

`app/client/.env`:

```env
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
```

**4. Installa dipendenze**

```bash
# Terminal 1: Server
cd app/server
npm install
npm run db:migrate  # Prisma migrations
npm run dev

# Terminal 2: Client
cd app/client
npm install
npm run dev
```

**5. Accedi**

- Frontend: http://localhost:5173
- API: http://localhost:4000

---

## 🔌 API & WebSocket

### REST Endpoints

| Metodo  | Endpoint       | Descrizione                 |
| ------- | -------------- | --------------------------- |
| `POST`  | `/auth/signup` | Registrazione               |
| `POST`  | `/auth/login`  | Login                       |
| `GET`   | `/workspaces`  | Elenca workspace            |
| `POST`  | `/boards`      | Crea board                  |
| `GET`   | `/boards/:id`  | Dettagli board              |
| `POST`  | `/lists`       | Crea lista                  |
| `POST`  | `/cards`       | Crea card                   |
| `PATCH` | `/cards/:id`   | Modifica card               |
| `POST`  | `/cards/move`  | Sposta card (transazionale) |

### WebSocket Events

**Client → Server:**

- `board:subscribe` - Sottoscrivi a board
- `card:update` - Modifica card
- `list:created` - Lista creata

**Server → Client:**

- `board:update` - Board aggiornato
- `card:moved` - Card spostata
- `comment:new` - Nuovo commento

Per dettagli, vedi `docs/back-end/analisi-tecnica.md`.

---

## 💻 Development

### Comandi Disponibili

**Server:**

```bash
npm run dev           # Develop mode (hot reload)
npm run build         # Build production
npm run start         # Start production build
npm run test          # Run tests
npm run test:cov      # Coverage report
npm run db:migrate    # Prisma migrations
npm run db:push       # Sync schema
```

**Client:**

```bash
npm run dev           # Dev server (Vite)
npm run build         # Build production
npm run preview       # Preview build locally
npm run test          # Vitest unit tests
npm run test:e2e      # Playwright E2E
npm run lint          # ESLint check
```

### Development Workflow

1. **Branch naming:** `feature/board-drag-drop`, `fix/card-update-bug`
2. **Commit:** Conventional commits (`feat:`, `fix:`, `docs:`)
3. **PR:** Link issue, descrivi changes, add tests
4. **Review:** Almeno 1 approval prima di merge

---

## 📊 Performance Metrics

| Metrica                | Target         | Stato |
| ---------------------- | -------------- | ----- |
| First Contentful Paint | < 1.5s         | ✅    |
| Time to Interactive    | < 2.5s         | ✅    |
| Lighthouse Performance | ≥ 90           | ✅    |
| WebSocket Latency      | < 150ms        | ✅    |
| Bundle Size (gzipped)  | < 300KB        | ✅    |
| Board with 1000+ cards | < 100ms render | ✅    |

**Tools:**

- Lighthouse CI (automated scoring)
- Sentry (error tracking)
- Redis Commander (Pub/Sub monitoring)

---

## 🧪 Testing

### Test Coverage

| Layer           | Tool                              | Comando            |
| --------------- | --------------------------------- | ------------------ |
| **Unit**        | Vitest (Frontend), Jest (Backend) | `npm run test`     |
| **Integration** | React Testing Library             | `npm run test`     |
| **E2E**         | Playwright                        | `npm run test:e2e` |

### Test di Concorrenza

```bash
# Simula 10 utenti simultanei
npm run test:load -- --users=10
```

---

## 🤝 Contributing

Contributi benvenuti! Segui questi step:

1. **Fork** il repo
2. **Crea branch:** `git checkout -b feature/my-feature`
3. **Commit:** `git commit -m 'feat: aggiungi nuova feature'`
4. **Push:** `git push origin feature/my-feature`
5. **PR:** Descrivi changes, link issue, add tests

**Linee Guida:**

- ESLint + Prettier (automatic on commit)
- Test obbligatori per nuove features
- Aggiorna documentazione
- Conventional commits

---

## 📈 Roadmap

### ✅ Completato

- [x] Autenticazione e Workspace
- [x] Board, Liste, Card (CRUD)
- [x] Drag & Drop Real-time
- [x] Commenti e Checklist
- [x] Audit log base

### 🔄 In Progress

- [ ] Notifiche Push (Firebase/APNs)
- [ ] Upload Allegati (S3/MinIO)

### 📋 Future

- [ ] Power-ups e Automazioni
- [ ] Mobile App (React Native)
- [ ] Integrazioni API (Slack, GitHub, Zapier)
- [ ] Calendario e viste alternative
- [ ] Timeline e Gantt charts

---

## 🆘 Troubleshooting

### Database

**Errore:** `ECONNREFUSED 127.0.0.1:5432`

```bash
# Soluzione: Avvia Docker
docker start trello-db
# Verifica
docker ps | grep trello-db
```

**Errore:** `Database already exists`

```bash
# Rimuovi e ricrea
docker rm trello-db
docker run --name trello-db -p 5433:5432 ... (vedi Quick Start)
```

### WebSocket

**Errore:** `WebSocket connection failed`

- Verifica `VITE_WS_URL` nel client .env
- Assicurati server sia su http://localhost:4000
- Controlla CORS lato server

### Performance

**Problema:** Board lenta con molte card

- Attiva virtualizzazione (TanStack Virtual)
- Usa pagination sul backend
- Abilita Redis caching

**Problema:** Drag-and-drop laggy

- Riduci numero di componenti remoti
- Usa React.memo per List e Card
- Disabilita animations non critiche

---

## 📚 Documentazione

- **[Guida Avvio](docs/guida-avvio.md)** - Setup step-by-step
- **[Prompt Sviluppo](docs/prompt-sviluppo.md)** - Instructions per AI
- **[PRD Frontend](docs/front-end/prd.md)** - Product Requirements
- **[Analisi Tecnica](docs/back-end/analisi-tecnica.md)** - Architecture deep-dive

---

## 📄 Licenza

Distribuito sotto [Licenza MIT](LICENSE). Vedi file LICENSE per dettagli.

---

## 🙏 Acknowledgments

- Ispirato da **Trello** per UX eccellente
- Built with ❤️ usando **React**, **TanStack**, **@dnd-kit**, **PostgreSQL**
- Grazie a community open-source per feedback

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/your-repo/trello-clone/issues)
- **Discussions:** [GitHub Discussions](https://github.com/your-repo/trello-clone/discussions)
- **Email:** dev@trello-clone.io

---

**Made with 🚀 for developers who care about quality.**
