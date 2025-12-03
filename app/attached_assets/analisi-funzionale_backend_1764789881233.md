# **Documento di Analisi Funzionale (DAF)**

**Titolo progetto:** Trello-Clone Backend
**Versione:** 1.0
**Data:** 19/11/2025
**Autore:** Team di sviluppo
**Revisori:** Da definire
**Stato:** Bozza

---

# **1. Introduzione**

## **Scopo del documento**

Definire i requisiti funzionali, non funzionali, gli attori, i casi d’uso, i vincoli e i rischi per realizzare il backend di un sistema Kanban tipo Trello.
Focus: board, liste, card, collaborazioni in tempo reale, ordering, permissistica.

## **Ambito del progetto**

Il backend dovrà fornire:

* Gestione board, liste, card.
* Drag & drop in tempo reale tra liste.
* Ordering dinamico (ristabile dopo spostamenti).
* Collaborazione multi-utente live (WebSocket).
* Ruoli, permessi, inviti.
* Commenti, descrizione, checklists.
* Attività (log) base.

**Non incluso (fase 1):**

* Notifiche push mobile.
* File upload.
* Power-ups / automazioni avanzate.
* Modifica descrizioni in modalità collaborativa stile Google Docs.

## **Glossario**

* **Board:** lavagna composta da colonne (liste) e card.
* **Lista:** colonna ordinabile contenente card.
* **Card:** elemento di lavoro con titolo, descrizione, commenti, checklist.
* **Ordering Index:** numero decimale usato per mantenere l’ordine senza riordinare tutto.
* **Drag & Drop:** spostamento card dentro/tra liste.
* **WebSocket:** canale real-time per gli aggiornamenti della board.
* **Workspace:** spazio di collaborazione con più board.

---

# **2. Contesto e Problematiche**

## **Contesto attuale**

Un sistema Kanban richiede aggiornamenti live e gestione precisa dell’ordinamento. Se fallisce, la board diventa ingestibile per più utenti, generando conflitti e perdite di ordine.

## **Problemi tipici**

* **Ordering fragile:** muovere una card può generare conflitti o reorder massivi.
* **Concorrenza:** due utenti spostano la stessa card → servono versioni/lock ottimistico.
* **Aggiornamenti live:** la board deve riflettere subito i cambiamenti.
* **Permessi:** board pubbliche, private, condivise con ruoli diversi.
* **Persistenza coerente:** modifiche devono essere atomiche.

## **Obiettivi funzionali principali**

* CRUD completo di workspace, board, liste, card.
* Drag & drop in tempo reale con ordering stabile.
* WebSocket broadcast aggiornamenti board.
* Commenti, descrizioni, checklist.
* Gestione utenti/ruoli/inviti.
* Storico attività card (audit log base).

---

# **3. Requisiti Funzionali**

| ID    | Funzione          | Descrizione                                    | Priorità |
| ----- | ----------------- | ---------------------------------------------- | -------- |
| RF-01 | Autenticazione    | Registrazione, login, logout, JWT              | Alta     |
| RF-02 | Workspace         | Creazione, modifica, invito membri             | Alta     |
| RF-03 | Board             | Creazione board, accesso, ruoli                | Alta     |
| RF-04 | Liste             | CRUD liste, ordering                           | Alta     |
| RF-05 | Card              | CRUD card, spostamenti intra/inter lista       | Alta     |
| RF-06 | Ordering dinamico | Gestione spostamenti con indice decimale       | Alta     |
| RF-07 | Real-time board   | Broadcast WebSocket di movimenti/aggiornamenti | Alta     |
| RF-08 | Commenti card     | Aggiunta, modifica, cancellazione              | Media    |
| RF-09 | Checklist         | CRUD item checklist                            | Media    |
| RF-10 | Attività card     | Log modifiche (autore, azione, timestamp)      | Media    |
| RF-11 | Permessi          | Viewer, Member, Admin                          | Alta     |
| RF-12 | Inviti board      | Invio link/invito membro                       | Media    |
| RF-13 | Ricerca           | Card per titolo/descrizione                    | Bassa    |

**Note essenziali:**

* Gli spostamenti card devono essere transazionali.
* Ogni evento board → broadcast agli utenti connessi alla board via WS.
* Risolvere conflitti tramite “last write wins” + locking ottimistico.

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

* **Utente Registrato**
* **Membro Workspace**
* **Admin Workspace**
* **Admin Board**
* **Viewer Board**

## **Casi d’uso principali**

---

### **UC-01: Login / Registrazione**

* Attori: Utente
* Obiettivo: accedere al sistema
* Relazione: RF-01

---

### **UC-02: Creazione Workspace**

* Attore: Admin Workspace
* Obiettivo: creare workspace e invitare utenti
* Relazione: RF-02

---

### **UC-03: Creazione Board**

* Attore: Admin Workspace
* Obiettivo: creare una board e assegnare ruoli
* Relazione: RF-03

---

### **UC-04: Aggiunta Lista**

* Attore: Membro Board
* Obiettivo: creare una nuova lista
* Relazione: RF-04

---

### **UC-05: Creazione Card**

* Attore: Membro Board
* Obiettivo: creare card in lista
* Relazione: RF-05

---

### **UC-06: Drag & Drop Card**

* Attore: Membro Board
* Obiettivo: spostare la card nella stessa o in un’altra lista
* Requisiti: RF-05, RF-06, RF-07

---

### **UC-07: Aggiornamento Card**

* Attore: Membro Board
* Obiettivo: modificare titolo, descrizione, checklist, commenti
* Requisiti: RF-05, RF-08, RF-09

---

### **UC-08: Aggiornamenti Real-Time Board**

* Attore: Tutti gli utenti connessi
* Obiettivo: ricevere in tempo reale modifiche alle liste/card
* Requisiti: RF-07

---

### **UC-09: Gestione Permessi**

* Attore: Admin Board
* Obiettivo: assegnare ruoli/permessi agli utenti
* Requisiti: RF-11

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

* API REST per operazioni CRUD
* WebSocket per eventi board

**API Server:**

* Autenticazione
* Workspace/board/list/card
* Transazioni per spostamenti

**WebSocket Gateway:**

* Gestioni connessioni per board
* Broadcast eventi board

**Redis Pub/Sub:**

* Sincronizzazione istanze

**Database:**

* Board, liste, card, commenti, checklist, attività

---

# **9. Rischi Tecnici & Mitigazioni**

* **Ordering rotto** → indici decimali + periodic cleanup.
* **WS congestionato** → rate limiting eventi, compressione pacchetti.
* **Board con migliaia di card** → pagination + caching.
* **Crash istanza** → replay eventi da Pub/Sub.

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

* File upload
* Integrazioni esterne
* Calendario e viste alternative
* Power-ups (automazioni)
* Notifiche push
* Tag e filtri avanzati
