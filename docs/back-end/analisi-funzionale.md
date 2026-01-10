# Documento di Analisi Funzionale (DAF)

**Titolo Progetto:** Trello-Clone Backend  
**Versione:** 1.0  
**Data:** 19/11/2025  
**Autore:** Team di Sviluppo  
**Revisori:** Da definire  
**Stato:** Bozza

---

## 1. Introduzione

**Scopo del Documento:**  
Definire requisiti funzionali, non funzionali, attori, casi d'uso, vincoli e rischi per il backend di un sistema Kanban tipo Trello. Focus su board, liste, card, collaborazione real-time, ordering e permissistica.

**Ambito del Progetto:**

- Gestione board, liste, card.
- Drag & drop real-time tra liste.
- Ordering dinamico stabile.
- Collaborazione multi-utente via WebSocket.
- Ruoli, permessi, inviti.
- Commenti, descrizioni, checklist.
- Attività (log) base.

**Non Incluso (Fase 1):**

- Notifiche push mobile.
- File upload.
- Power-ups/automazioni avanzate.
- Editing collaborativo stile Google Docs.

**Glossario:**

- **Board:** Lavagna con colonne (liste) e card.
- **Lista:** Colonna ordinabile con card.
- **Card:** Elemento lavoro con titolo, descrizione, commenti, checklist.
- **Ordering Index:** Numero decimale per ordinamento stabile.
- **Drag & Drop:** Spostamento card dentro/tra liste.
- **WebSocket:** Canale real-time aggiornamenti board.
- **Workspace:** Spazio collaborazione con board multiple.

---

## 2. Contesto e Problematiche

**Contesto Attuale:**  
Sistema Kanban richiede aggiornamenti live e ordinamento preciso. Fallimenti rendono board ingestibili per multi-utenti, causando conflitti e perdita ordine.

**Problemi Tipici:**

- Ordering fragile: spostamenti generano conflitti/reorder massivi.
- Concorrenza: editing simultaneo richiede versioni/locking.
- Aggiornamenti live: board deve riflettere cambiamenti immediati.
- Permessi: board pubbliche/private con ruoli.
- Persistenza: modifiche atomiche.

**Obiettivi Funzionali Principali:**

- CRUD workspace, board, liste, card.
- Drag & drop real-time con ordering stabile.
- WebSocket broadcast aggiornamenti.
- Commenti, descrizioni, checklist.
- Gestione utenti/ruoli/inviti.
- Storico attività (audit log).

---

## 3. Requisiti Funzionali

| ID    | Funzione          | Descrizione                               | Priorità |
| ----- | ----------------- | ----------------------------------------- | -------- |
| RF-01 | Autenticazione    | Registrazione, login, logout, JWT         | Alta     |
| RF-02 | Workspace         | Creazione, modifica, invito membri        | Alta     |
| RF-03 | Board             | Creazione board, accesso, ruoli           | Alta     |
| RF-04 | Liste             | CRUD liste, ordering                      | Alta     |
| RF-05 | Card              | CRUD card, spostamenti intra/inter lista  | Alta     |
| RF-06 | Ordering Dinamico | Gestione spostamenti con indice decimale  | Alta     |
| RF-07 | Real-Time Board   | Broadcast WS movimenti/aggiornamenti      | Alta     |
| RF-08 | Commenti Card     | Aggiunta, modifica, cancellazione         | Media    |
| RF-09 | Checklist         | CRUD item checklist                       | Media    |
| RF-10 | Attività Card     | Log modifiche (autore, azione, timestamp) | Media    |
| RF-11 | Permessi          | Viewer, Member, Admin                     | Alta     |
| RF-12 | Inviti Board      | Invio link/invito membro                  | Media    |
| RF-13 | Ricerca           | Card per titolo/descrizione               | Bassa    |

**Note Essenziali:**

- Spostamenti card transazionali.
- Eventi board → broadcast WS utenti connessi.
- Conflitti risolti con "last write wins" + locking ottimistico.

---

## 4. Requisiti Non Funzionali

| ID     | Categoria      | Descrizione                                  |
| ------ | -------------- | -------------------------------------------- |
| RNF-01 | Scalabilità    | >10.000 board concorrenti su multi-istanze   |
| RNF-02 | Coerenza       | Operazioni drag&drop atomiche                |
| RNF-03 | Performance    | Latency WS < 150ms                           |
| RNF-04 | Sicurezza      | JWT + permessi rigorosi                      |
| RNF-05 | Usabilità API  | Documentazione OpenAPI                       |
| RNF-06 | Disponibilità  | ≥ 99.5%                                      |
| RNF-07 | Manutenibilità | Architettura modulare, logging centralizzato |
| RNF-08 | Recovery       | Eventi idempotenti per sync client           |

---

## 5. Attori e Use Case

**Attori:**

- Utente Registrato
- Membro Workspace
- Admin Workspace
- Admin Board
- Viewer Board

**Casi d'Uso Principali:**

### UC-01: Login/Registrazione

- Attori: Utente
- Obiettivo: Accesso sistema
- Relazione: RF-01

### UC-02: Creazione Workspace

- Attore: Admin Workspace
- Obiettivo: Creare workspace, invitare utenti
- Relazione: RF-02

### UC-03: Creazione Board

- Attore: Admin Workspace
- Obiettivo: Creare board, assegnare ruoli
- Relazione: RF-03

### UC-04: Aggiunta Lista

- Attore: Membro Board
- Obiettivo: Creare lista
- Relazione: RF-04

### UC-05: Creazione Card

- Attore: Membro Board
- Obiettivo: Creare card in lista
- Relazione: RF-05

### UC-06: Drag & Drop Card

- Attore: Membro Board
- Obiettivo: Spostare card intra/inter lista
- Requisiti: RF-05, RF-06, RF-07

### UC-07: Aggiornamento Card

- Attore: Membro Board
- Obiettivo: Modificare titolo, descrizione, checklist, commenti
- Requisiti: RF-05, RF-08, RF-09

### UC-08: Aggiornamenti Real-Time

- Attore: Tutti connessi
- Obiettivo: Ricevere modifiche real-time
- Requisiti: RF-07

### UC-09: Gestione Permessi

- Attore: Admin Board
- Obiettivo: Assegnare ruoli/permessi
- Requisiti: RF-11

---

## 6. Vincoli e Dipendenze

| Vincolo         | Descrizione                  | Note                   |
| --------------- | ---------------------------- | ---------------------- |
| DB Relazionale  | Persistenza board/liste/card | PostgreSQL             |
| Redis Pub/Sub   | Eventi real-time tra istanze | Necessario per WS      |
| WS Server       | Aggiornamenti real-time      | Sticky session         |
| Load Balancer   | Balancing HTTP/WS            | Envoy/Nginx            |
| Schema Ordering | Indici decimali              | Evita re-order massivi |

---

## 7. Rischi e Assunzioni

| Rischio                  | Impatto | Mitigazione                           |
| ------------------------ | ------- | ------------------------------------- |
| Conflitti ordering       | Alto    | Locking ottimistico + indici decimali |
| Spostamenti simultanei   | Alto    | Versioning card                       |
| Perdita eventi real-time | Medio   | Eventi idempotenti                    |
| Accessi non autorizzati  | Alto    | Ruoli granulari, JWT                  |
| Concorrenza elevata      | Medio   | Sharding board                        |

---

## 8. Architettura Concettuale

**Client:** API REST CRUD + WS eventi board.

**API Server:** Auth, workspace, board, ruoli, transazioni spostamenti.

**WS Gateway:** Connessioni board, broadcast eventi.

**Redis Pub/Sub:** Sync istanze.

**Database:** Board, liste, card, commenti, checklist, attività.

---

## 9. Roadmap

| Fase | Descrizione                     | Durata      |
| ---- | ------------------------------- | ----------- |
| 1    | Auth + Workspace                | 3 settimane |
| 2    | Board + Liste                   | 3 settimane |
| 3    | Card + Ordering                 | 4 settimane |
| 4    | WS Real-Time                    | 4 settimane |
| 5    | Checklist + Commenti + Attività | 3 settimane |
| 6    | Test, Sicurezza, Deployment     | 4 settimane |

---

## 10. Future Enhancements

- File upload
- Integrazioni esterne
- Calendario/viste alternative
- Power-ups
- Notifiche push
- Tag/filtri avanzati

**Note essenziali:**

- Gli spostamenti card devono essere transazionali.
- Ogni evento board → broadcast agli utenti connessi alla board via WS.
- Risolvere conflitti tramite “last write wins” + locking ottimistico.

---

# **4. Requisiti Non Funzionali**

| ID     | Categoria      | Descrizione                                       |
| ------ | -------------- | ------------------------------------------------- |
| RNF-01 | Scalabilità    | Gestione >10.000 board concorrenti su più istanze |
| RNF-02 | Coerenza       | Operazioni drag&drop sempre atomiche              |
| RNF-03 | Performance    | Latenza WS < 150 ms                               |
| RNF-04 | Sicurezza      | JWT + permessi rigorosi board                     |
| RNF-05 | Usabilità API  | Documentazione OpenAPI                            |
| RNF-06 | Disponibilità  | ≥ 99,5%                                           |
| RNF-07 | Manutenibilità | Architettura modulare, logging centralizzato      |
| RNF-08 | Recovery       | Eventi idempotenti per sync client                |

---

# **5. Attori e Use Case**

## **Attori**

- **Utente Registrato**
- **Membro Workspace**
- **Admin Workspace**
- **Admin Board**
- **Viewer Board**

## **Casi d’uso principali**

---

### **UC-01: Login / Registrazione**

- Attori: Utente
- Obiettivo: accedere al sistema
- Relazione: RF-01

---

### **UC-02: Creazione Workspace**

- Attore: Admin Workspace
- Obiettivo: creare workspace e invitare utenti
- Relazione: RF-02

---

### **UC-03: Creazione Board**

- Attore: Admin Workspace
- Obiettivo: creare una board e assegnare ruoli
- Relazione: RF-03

---

### **UC-04: Aggiunta Lista**

- Attore: Membro Board
- Obiettivo: creare una nuova lista
- Relazione: RF-04

---

### **UC-05: Creazione Card**

- Attore: Membro Board
- Obiettivo: creare card in lista
- Relazione: RF-05

---

### **UC-06: Drag & Drop Card**

- Attore: Membro Board
- Obiettivo: spostare la card nella stessa o in un’altra lista
- Requisiti: RF-05, RF-06, RF-07

---

### **UC-07: Aggiornamento Card**

- Attore: Membro Board
- Obiettivo: modificare titolo, descrizione, checklist, commenti
- Requisiti: RF-05, RF-08, RF-09

---

### **UC-08: Aggiornamenti Real-Time Board**

- Attore: Tutti gli utenti connessi
- Obiettivo: ricevere in tempo reale modifiche alle liste/card
- Requisiti: RF-07

---

### **UC-09: Gestione Permessi**

- Attore: Admin Board
- Obiettivo: assegnare ruoli/permessi agli utenti
- Requisiti: RF-11

---

# **6. Vincoli e Dipendenze**

| Vincolo              | Descrizione                  | Note                    |
| -------------------- | ---------------------------- | ----------------------- |
| Database relazionale | Persistenza board/liste/card | PostgreSQL              |
| Redis Pub/Sub        | Eventi real-time tra istanze | Necessario per WS       |
| WebSocket Server     | Aggiornamenti real-time      | Richiede sticky session |
| Load Balancer        | Bilanciamento HTTP/WS        | Envoy/Nginx             |
| Schema ordering      | Indici decimali              | Evita re-order massivi  |

---

# **7. Rischi e Assunzioni**

| Rischio                               | Impatto | Mitigazione                        |
| ------------------------------------- | ------- | ---------------------------------- |
| Conflitti di ordering                 | Alto    | Lock ottimistico + indici decimali |
| Spostamenti simultanei                | Alto    | Versioning card                    |
| Perdita eventi real-time              | Medio   | Eventi idempotenti                 |
| Accessi non autorizzati               | Alto    | Ruoli granulari, JWT               |
| Troppa concorrenza sulla stessa board | Medio   | Sharding board su più server       |

---

# **8. Architettura Concettuale**

**Client:**

- API REST per operazioni CRUD
- WebSocket per eventi board

**API Server:**

- Autenticazione
- Workspace/board/list/card
- Transazioni per spostamenti

**WebSocket Gateway:**

- Gestioni connessioni per board
- Broadcast eventi board

**Redis Pub/Sub:**

- Sincronizzazione istanze

**Database:**

- Board, liste, card, commenti, checklist, attività

---

# **9. Rischi Tecnici & Mitigazioni**

- **Ordering rotto** → indici decimali + periodic cleanup.
- **WS congestionato** → rate limiting eventi, compressione pacchetti.
- **Board con migliaia di card** → pagination + caching.
- **Crash istanza** → replay eventi da Pub/Sub.

---

# **10. Roadmap**

| Fase | Descrizione                     | Durata      |
| ---- | ------------------------------- | ----------- |
| 1    | Autenticazione + Workspace      | 3 settimane |
| 2    | Board + Liste                   | 3 settimane |
| 3    | Card + Ordering                 | 4 settimane |
| 4    | WebSocket real-time             | 4 settimane |
| 5    | Checklist + Commenti + Attività | 3 settimane |
| 6    | Test, sicurezza, deployment     | 4 settimane |

---

# **11. Future Enhancements**

- File upload
- Integrazioni esterne
- Calendario e viste alternative
- Power-ups (automazioni)
- Notifiche push
- Tag e filtri avanzati
