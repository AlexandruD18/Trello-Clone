# Trello Clone Backend – PRD

## 1. Overview

**Descrizione Sintetica:**  
Realizzazione del backend per un sistema Kanban ispirato a Trello, con board condivise, liste ordinate, card dettagliate, drag & drop real-time, permessi per team e workspace.

**Obiettivo Principale:**  
Creare un backend solido che supporti aggiornamenti real-time, persistenza affidabile e collaborazione multi-utente con gestione concorrenza.

**Benefici Attesi:**

- Board responsive e coerenti per più utenti.
- Struttura pulita per integrazioni future.
- Sistema sicuro che evita conflitti editing.

---

## 2. Problem Statement

**Contesto Attuale:**  
Sistemi Kanban improvvisati cedono con editing simultaneo su board complesse.

**Problemi Specifici:**

- Conflitti modifica.
- Sincronizzazione lenta.
- Mancanza audit.
- Scalabilità debole.

**Soluzione Proposta:**

- WebSocket per broadcast real-time.
- DB relazionale con transazioni.
- Pub/Sub Redis per coordinamento.
- RBAC granulare.
- Locking ottimistico.

---

## 3. Goals & Success Metrics

| Obiettivo          | KPI                     | Target   |
| ------------------ | ----------------------- | -------- |
| Real-time updates  | Latenza evento → client | < 150 ms |
| Consistenza dati   | Errori conflitto        | < 0.1%   |
| Persistenza        | Eventi registrati       | ≥ 99.9%  |
| Scalabilità utenti | Utenti simultanei/board | ≥ 500    |
| Uptime             | Disponibilità           | ≥ 99.9%  |

---

## 4. User Personas

| Persona          | Esigenza                 | Scenario                                       |
| ---------------- | ------------------------ | ---------------------------------------------- |
| Team Member      | Gestire task             | Crea/sposta card, aggiorna checklist real-time |
| Project Manager  | Visione macro + permessi | Organizza board, assegna membri                |
| Stakeholder      | Osservazione             | Visualizza evoluzione senza edit               |
| Dev Integrazioni | Automazioni              | API per card automatiche                       |

---

## 5. Functional Requirements

| ID    | Titolo           | Descrizione                                   | Priorità |
| ----- | ---------------- | --------------------------------------------- | -------- |
| RF-01 | Autenticazione   | Login/signup, JWT, refresh-token              | Alta     |
| RF-02 | Workspace        | CRUD, inviti, ruoli                           | Alta     |
| RF-03 | Board            | CRUD board, visibilità, membri                | Alta     |
| RF-04 | Liste            | CRUD + ordering + drag/drop                   | Alta     |
| RF-05 | Card             | CRUD card, descrizione, scadenze, tag, membri | Alta     |
| RF-06 | Checklist        | CRUD checklist + item                         | Media    |
| RF-07 | Commenti         | Commenti real-time                            | Media    |
| RF-08 | Real-time        | Broadcast WS su board/liste/card              | Alta     |
| RF-09 | Audit log        | Storico attività                              | Media    |
| RF-10 | Filtri & ricerca | Ricerca testo/tag/utente/data                 | Media    |
| RF-11 | Notifiche        | Notifiche interne eventi                      | Bassa    |

**Note:** Spostamenti card/liste transazionali atomici. Board supportano concorrenza elevata.

---

## 6. Non-Functional Requirements

| ID     | Categoria     | Descrizione                                         |
| ------ | ------------- | --------------------------------------------------- |
| RNF-01 | Scalabilità   | Multi-istanza con Pub/Sub                           |
| RNF-02 | Affidabilità  | Transazioni ACID + retry                            |
| RNF-03 | Performance   | Query ottimizzate board pesanti                     |
| RNF-04 | Sicurezza     | RBAC, validazioni, rate limiting, TLS               |
| RNF-05 | Coerenza      | Locking ottimistico modifiche                       |
| RNF-06 | Usabilità API | Endpoints puliti, versionamento, errori strutturati |

---

## 7. Architecture Overview

**Componenti High-Level:**

- Client → WS + REST
- Gateway Server → gestisce WS, subscription board
- Board Service → logica card/liste/ordering
- API Server → CRUD, auth
- Event Service → audit log + eventi
- DB → PostgreSQL relazionale
- Cache → Redis cluster
- LB → sticky sessions WS

**Diagramma Concettuale:**  
Client → LB → Gateway WS Server  
↓ Pub/Sub (Redis)  
Board Service → API Server → DB/Cache

---

## 8. Dependencies

| Servizio/Tecnologia | Descrizione      | Note                  |
| ------------------- | ---------------- | --------------------- |
| Redis               | Cache + Pub/Sub  | Coordinamento istanze |
| WS Library          | Eventi real-time | WS nativo o Socket.IO |
| PostgreSQL          | Persistenza      | Schema rigoroso       |
| LB/Envoy/Nginx      | Balancing        | Sticky WS             |
| Service Discovery   | Microservizi     | Consul/etcd           |

---

## 9. Risks & Mitigations

| Rischio                  | Impatto | Mitigazione                         |
| ------------------------ | ------- | ----------------------------------- |
| Conflitti modifica       | Alto    | Locking ottimistico + versioning    |
| Board pesanti = lentezza | Alto    | Caching + paginazione + diff-eventi |
| Failover WS              | Alto    | Server replicati + reconnect        |
| Permessi complessi       | Medio   | RBAC semplice                       |
| Latenza multi-utente     | Medio   | Redis Pub/Sub + scaling             |

---

## 10. Milestones

| Fase | Descrizione                    | Scadenza     |
| ---- | ------------------------------ | ------------ |
| 1    | Setup ambiente, auth, API base | 4 settimane  |
| 2    | Workspace + Board + Liste      | 8 settimane  |
| 3    | Card + Checklist + Commenti    | 12 settimane |
| 4    | Real-time WS + Pub/Sub         | 16 settimane |
| 5    | Audit log, filtri, ricerca     | 20 settimane |

---

## **4. User Personas**

| Persona             | Esigenza principale      | Scenario d’uso                                                  |
| ------------------- | ------------------------ | --------------------------------------------------------------- |
| Team Member         | Gestire task             | Crea card, sposta card, aggiorna checklist in tempo reale       |
| Project Manager     | Visione macro + permessi | Organizza board, imposta priorità, assegna membri               |
| Stakeholder Viewer  | Solo osservazione        | Visualizza l’evoluzione del lavoro senza possibilità di editare |
| Dev di integrazioni | Automazioni              | Usa API per creare card automatiche o eseguire workflow         |

---

## **5. Functional Requirements**

| ID    | Titolo               | Descrizione                                   | Priorità |
| ----- | -------------------- | --------------------------------------------- | -------- |
| RF-01 | Autenticazione       | Login/registrazione, JWT, refresh-token       | Alta     |
| RF-02 | Workspace            | Creazione, inviti, ruoli, permessi            | Alta     |
| RF-03 | Board                | CRUD board, visibilità, membri                | Alta     |
| RF-04 | Liste                | CRUD liste, ordering, drag & drop             | Alta     |
| RF-05 | Card                 | CRUD card, descrizione, scadenze, tag, membri | Alta     |
| RF-06 | Checklist            | CRUD checklist + item                         | Media    |
| RF-07 | Commenti card        | Commenti in tempo reale                       | Media    |
| RF-08 | Real-time updates    | Broadcast WebSocket su board/liste/card       | Alta     |
| RF-09 | Persistenza eventi   | Storico attività (audit log)                  | Media    |
| RF-10 | Filtri & ricerca     | Ricerca per testo, tag, membro, data          | Media    |
| RF-11 | Notifications (base) | Notifiche interne su eventi rilevanti         | Bassa    |

**Note aggiuntive:**

- Spostamenti card/liste devono essere transazionali e atomici
- Le board devono supportare concorrenza elevata
- WebSocket deve riflettere ogni modifica in <150 ms

---

## **6. Non-Functional Requirements**

| ID     | Categoria     | Descrizione                                         |
| ------ | ------------- | --------------------------------------------------- |
| RNF-01 | Scalabilità   | Istanze multiple coordinate via Pub/Sub             |
| RNF-02 | Affidabilità  | Transazioni DB, retry su write falliti              |
| RNF-03 | Performance   | Query ottimizzate per board pesanti                 |
| RNF-04 | Sicurezza     | RBAC, validazioni, rate limiting, TLS               |
| RNF-05 | Coerenza      | Locking ottimistico per aggiornamenti concorrenti   |
| RNF-06 | Usabilità API | Endpoints puliti, versionamento, errori strutturati |

---

## **7. Architecture Overview**

**High-Level Components:**

- **Client:** WebSocket + API REST
- **Gateway Server:** gestisce connessioni WebSocket e subscription board
- **Board Service:** logica card/liste/ordinamento
- **Workspace Service:** ruoli, permessi, membri
- **Event Service:** audit log + recursion event-based
- **API Server:** CRUD e business logic
- **Database:** PostgreSQL/MySQL con schema relazionale
- **Cache Server:** Redis per:

  - Pub/Sub messaging
  - caching di board pesanti

- **Load Balancer:** distribuzione WebSocket e API

**Diagramma concettuale (testuale):**

```
Client <—WebSocket—> Gateway WS Server <—Pub/Sub—> Board Service
Client <—REST—> API Server <—DB/Cache—> PostgreSQL + Redis
```

---

## **8. Dependencies**

| Servizio / Tecnologia | Descrizione      | Note                                 |
| --------------------- | ---------------- | ------------------------------------ |
| Redis                 | Cache + Pub/Sub  | Evitare single-point-of-failure      |
| WebSocket library     | Eventi real-time | WS nativo o Socket.IO                |
| PostgreSQL/MySQL      | Persistenza      | Necessario schema rigoroso           |
| LB / Envoy / Nginx    | Bilanciamento    | WebSocket sticky-session consigliato |
| Service Discovery     | Microservizi     | Consul / etcd                        |

---

## **9. Risks & Mitigations**

| Rischio                  | Impatto | Mitigazione                                     |
| ------------------------ | ------- | ----------------------------------------------- |
| Conflitti modifica card  | Alto    | Locking ottimistico + versionamento             |
| Board pesanti = lentezza | Alto    | Caching + paginazione + diff-eventi             |
| Failover WebSocket       | Alto    | Server replicati + reconnect intelligente       |
| Permessi complessi       | Medio   | RBAC chiaro e semplice                          |
| Latenza multi-utente     | Medio   | Redis Pub/Sub + scaling verticale del WS server |

---

## **10. Milestones**

| Fase | Descrizione                              | Scadenza     |
| ---- | ---------------------------------------- | ------------ |
| 1    | Setup ambiente, auth, API base           | 4 settimane  |
| 2    | Workspace + Board + Liste                | 8 settimane  |
| 3    | Card + Checklist + Commenti              | 12 settimane |
| 4    | Real-time WebSocket + Pub/Sub            | 16 settimane |
| 5    | Audit log, filtri, ricerca               | 20 settimane |
| 6    | Test carico, sicurezza, QA, beta release | 24 settimane |

---

## **11. Future Enhancements**

- Allegati file
- Automazioni tipo “Power-Ups”
- Integrazioni Google Drive / GitHub
- Template board
- Webhooks per attività esterne
- Rule engine (trigger → action)

---

## **12. Appendici**

- Schema DB completo
- Contract API REST (request/response)
- Elenco eventi WebSocket (`card_moved`, `list_updated`, `card_updated`, `comment_added`, …)
- Sequence diagram per operazioni critiche
- Standard naming per entità e ID
