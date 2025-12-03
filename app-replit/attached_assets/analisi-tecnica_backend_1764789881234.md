# **Documento di Analisi Tecnica (DAT)**

## **Titolo progetto: Trello-Clone Backend**

**Versione:** 1.0
**Data:** 19/11/2025
**Autore:** Team Backend
**Revisori:** Da definire
**Stato:** Bozza

---

# **1. Introduzione**

## **Scopo del documento**

Definire le specifiche *tecniche* per progettare e implementare il backend di un sistema Kanban in stile Trello.
Il documento tratta:

* Architettura di sistema (API, WebSocket, servizi interni).
* Modelli dati relazionali.
* Gestione ordering di liste e card.
* Requisiti funzionali e non funzionali.
* Strategia di scalabilità, caching e Pub/Sub.
* Sicurezza, transazioni e locking ottimistico.
* Deployment e ambienti.

## **Ambito**

Il documento copre:

* API REST + WebSocket del backend.
* Coordinamento multi-istanza.
* Persistenza, storage, transazioni.
* Sicurezza, logging e monitoring.

Non copre:

* UI/UX del client.
* Automazioni esterne, power-ups complessi.
* Editing collaborativo avanzato stile Google Docs.
* Notifiche push mobile.

## **Glossario tecnico**

| Termine                   | Definizione                                            |
| ------------------------- | ------------------------------------------------------ |
| WS / WebSocket            | Connessione persistente per broadcast real-time.       |
| Ordering Index            | Valore decimale per ordinamento stabile di liste/card. |
| Pub/Sub                   | Sistema eventi tra istanze backend (Redis).            |
| CS – Collaboration Server | Nodo che gestisce board e ordering locale.             |
| GS – Gateway Server       | Entry point WebSocket per i client.                    |
| Optimistic Locking        | Meccanismo per risolvere conflitti versione.           |
| JWT                       | Autenticazione stateless.                              |

---

# **2. Architettura di Sistema**

## **Descrizione generale**

Il backend segue un’architettura multi-servizio orientata agli eventi:

* **Client** → WebSocket + API REST.
* **Gateway Server (GS)** → gestisce connessioni WebSocket e subscription alle board.
* **Board Server / Collaboration Server (CS)** → logica transazionale di board, liste e card.
* **API Server** → CRUD, validazioni e business logic.
* **Event Service** → audit log + propagazione aggiornamenti.
* **Redis Pub/Sub** → coordinamento eventi tra istanze.
* **DB relazionale** (PostgreSQL) → persistente, transazionale.
* **Load Balancer** → sticky sessions per WS.

## **Diagramma architettura logica (testuale)**

```
Client → Load Balancer → Gateway WebSocket Server
                     ↓ Pub/Sub (Redis)
           Collaboration / Board Server
                    ↓
                API Server → PostgreSQL
```

## **Componenti principali**

| Componente     | Descrizione                                          | Tecnologie                 | Responsabile |
| -------------- | ---------------------------------------------------- | -------------------------- | ------------ |
| Gateway Server | Gestione WS, subscription board, broadcast real-time | Node.js/Go, uWebSockets.js | Backend      |
| Board Server   | Ordering, CRUD liste/card, locking, orchestrazione   | Go/Node.js, Redis          | Backend      |
| API Server     | Autenticazione, workspace, board, ruoli              | NestJS/Go + PostgreSQL     | Backend      |
| Event Service  | Audit log, versioning, eventi                        | PostgreSQL + Redis Streams | Backend      |
| DB             | Persistenza                                          | PostgreSQL 14+             | DevOps       |
| Cache/PubSub   | Caching + eventi                                     | Redis Cluster              | DevOps       |
| Load Balancer  | WS+HTTP balancing                                    | Nginx/Envoy                | DevOps       |

---

# **3. Requisiti Tecnici Funzionali**

| ID    | Requisito       | Descrizione tecnica                     | Priorità |
| ----- | --------------- | --------------------------------------- | -------- |
| RT-01 | Autenticazione  | JWT + refresh token                     | Alta     |
| RT-02 | Workspace       | CRUD, ruoli, permessi RBAC              | Alta     |
| RT-03 | Board           | CRUD board, membership, visibilità      | Alta     |
| RT-04 | Liste           | CRUD + ordering stabile + drag/drop     | Alta     |
| RT-05 | Card            | CRUD card, label, description, due-date | Alta     |
| RT-06 | Ordering Engine | Aggiornamento atomico ordine card/liste | Alta     |
| RT-07 | Checklist       | CRUD checklist e item                   | Media    |
| RT-08 | Commenti        | Persistenza + broadcast real-time       | Media    |
| RT-09 | WebSocket       | Eventi real-time su board               | Alta     |
| RT-10 | Audit log       | Registro eventi con user_id, timestamp  | Media    |
| RT-11 | Ricerca         | Filtri testo/tag/utente/data            | Media    |

### Note critiche

* Ogni spostamento card/lista è una **transazione database**.
* Ordering tramite campi floating o fractional indexing (es. “1.0”, “1.5”, “2.0”).
* Concorrenza gestita tramite **optimistic locking**.

---

# **4. Requisiti Non Funzionali**

| ID     | Categoria    | Specifica                               |
| ------ | ------------ | --------------------------------------- |
| RNF-01 | Scalabilità  | Multi-istanza con Redis Pub/Sub         |
| RNF-02 | Affidabilità | Transazioni ACID + retry                |
| RNF-03 | Performance  | Board con 200+ card < 50 ms di risposta |
| RNF-04 | Sicurezza    | RBAC, validation, rate limiting, TLS    |
| RNF-05 | Latency      | Eventi WS < 150 ms medi                 |
| RNF-06 | Logging      | Tracing distribuito (OpenTelemetry)     |
| RNF-07 | Coerenza     | Locking ottimistico sulle modifiche     |

---

# **5. Database e Storage**

## **Modelli dati principali**

### **User**

(id, email, password_hash, name, created_at)

### **Workspace**

(id, name, created_at)

### **WorkspaceMember**

(user_id, workspace_id, role)

### **Board**

(id, workspace_id, name, description, created_at)

### **BoardMember**

(board_id, user_id, role)

### **List**

(id, board_id, name, ordering_index, created_at)

### **Card**

(id, list_id, title, description, ordering_index, due_date, created_at)

### **CardMember**

(card_id, user_id)

### **Checklist / ChecklistItem**

(checklist_id, card_id, title, completed)
(item_id, checklist_id, title, completed)

### **Comment**

(id, card_id, author_id, text, created_at)

### **EventLog**

(id, user_id, entity_type, entity_id, action, metadata_json, created_at)

## **Policy di storage**

| Tipo dati        | Persistenza         | Retention |
| ---------------- | ------------------- | --------- |
| Board/Liste/Card | PostgreSQL          | infinito  |
| EventLog         | PostgreSQL/BigTable | 1–3 anni  |
| Cache Board      | Redis               | TTL 5–30s |
| Sessions WS      | In-memory + Redis   | TTL 24h   |

---

# **6. API e WebSocket**

## **API principali**

| Endpoint    | Metodo | Descrizione             | Auth |
| ----------- | ------ | ----------------------- | ---- |
| /auth/login | POST   | Login utente            | No   |
| /workspace  | POST   | Crea workspace          | JWT  |
| /board      | POST   | Crea board              | JWT  |
| /list       | POST   | Crea lista              | JWT  |
| /card       | POST   | Crea card               | JWT  |
| /card/move  | POST   | Move transazionale card | JWT  |
| /comment    | POST   | Commenti card           | JWT  |

## **Eventi WebSocket**

* board:update
* list:created
* list:moved
* card:created
* card:updated
* card:moved
* comment:new
* error

---

# **7. Sicurezza**

* Autenticazione JWT con refresh opzionale.
* RBAC: workspace → board → card.
* Password hashing: Argon2.
* Rate limiting su endpoint critici.
* Validazione input → schema-based (Zod/JOI).
* TLS su WS e REST.
* Audit log completo per sicurezza e debugging.

---

# **8. Scalabilità e Performance**

## **Target**

* 500 utenti simultanei per board.
* 10k eventi board/minuto.
* Latenza broadcast < 150 ms.

## **Strategie**

* CS shardato per board_id tramite hashing coerente.
* Buffer dei cambiamenti in-memory + scrittura lazy su DB.
* Cache Redis per board pesanti.
* Sticky WebSocket sessions su GW.
* Backup DB + replica per alta disponibilità.

## **Monitoring**

* Prometheus + Grafana.
* Metriche: eventi WS/s, latenze, dimensione cache, CPU, error rate.
* Alert: lag Redis, fallimenti transazioni, spike board events.

---

# **9. Deployment**

## **Ambienti**

* Dev → Docker Compose
* Staging → Kubernetes (1–2 nodi)
* Produzione → Kubernetes multi-node, Redis cluster, Postgres HA

## **CI/CD**

* GitHub Actions
* Build Docker distroless
* Tests automatici, migrazioni DB, linting

## **Configurazioni**

* Secrets → Vault/K8s Secrets
* Redis in modalità cluster
* Postgres con replica + WAL archiving

---

# **10. Dipendenze e Vincoli**

| Dipendenza     | Ruolo                         | Versione |
| -------------- | ----------------------------- | -------- |
| Node.js / Go   | Runtime servizi               | LTS      |
| PostgreSQL     | DB relazionale                | ≥14      |
| Redis          | Cache + Pub/Sub               | ≥7       |
| uWebSockets.js | WebSocket ad alte prestazioni | –        |
| OpenTelemetry  | Monitoring                    | –        |
| Envoy/Nginx    | Load balancer                 | –        |

---

# **11. Rischi Tecnici e Mitigazioni**

| Rischio                   | Impatto | Probabilità | Mitigazione                                   |
| ------------------------- | ------- | ----------- | --------------------------------------------- |
| Concorrenza sul move card | Alta    | Alta        | Optimistic locking + retry                    |
| Latenza Redis alta        | Alta    | Media       | Redis cluster + monitoring                    |
| WS drop di massa          | Alta    | Media       | Autoscaling GW + heartbeats                   |
| Ordering corrotto         | Medio   | Bassa       | Fractional indexing + normalization periodica |
| DB contention             | Medio   | Media       | Query ottimizzate, caching, sharding logici   |

---

# **12. Allegati**

* Diagrammi sequenza: spostamento card, update lista, commento.
* Schema ER completo.
* Struttura esempi eventi WebSocket.
* Payload esempi CRUD.
