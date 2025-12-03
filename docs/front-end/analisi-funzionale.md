# Analisi Funzionale – Trello Clone Frontend

## 1. Obiettivo

L’analisi funzionale definisce **cosa deve fare l’applicazione** dal punto di vista dell’utente e dei processi principali, senza scendere nei dettagli di implementazione tecnica. Serve come ponte tra requisiti di prodotto (PRD) e implementazione tecnica.

---

## 2. Funzionalità Principali

### 2.1 Autenticazione e Workspace

**Funzionalità:**
- Login / Logout
- Registrazione account
- Recupero password
- Selezione e navigazione tra workspace
- Protezione delle route in base all’autenticazione

**Flussi:**
1. L’utente accede tramite login → viene reindirizzato al workspace principale.
2. Workspace protetto da autenticazione; accesso negato se non autenticato.
3. Possibilità di switch tra workspace con gestione di permessi.

**Vincoli:**
- Token JWT o sessione salvata nel client
- Accesso offline limitato (solo dati già caricati)

---

### 2.2 Board Management

**Funzionalità:**
- Visualizzazione board con liste e card
- Drag-and-drop di liste e card
- Ordinamento e filtri (membri, etichette, date)
- Scroll orizzontale per board con molte liste
- Aggiornamenti real-time tramite socket

**Flussi principali:**
1. L’utente visualizza la board → tutte le liste e card vengono caricate (virtualizzate per performance).
2. L’utente trascina una card → aggiornamento immediato dell’interfaccia (optimistic update) → invio evento al server → sincronizzazione real-time su altri client.
3. L’utente aggiunge/modifica/elimina card o liste → mutazioni con gestione ottimistica e rollback in caso di errore.

**Vincoli:**
- Supporto per 1000+ card senza lag
- Aggiornamento real-time con conflitti gestiti (merge/last-write-wins)
- Drag-and-drop latency < 100ms
- Layout responsive (mobile stack verticale, desktop scroll orizzontale)

---

### 2.3 Gestione Liste

**Funzionalità:**
- Creazione, rinomina e cancellazione di liste
- Drag-and-drop di card all’interno della lista
- “Add card” inline
- Stato espanso/collassato

**Flussi principali:**
1. L’utente clicca “Add list” → form inline → salva → lista aggiornata localmente e sul server.
2. L’utente trascina una card dentro una lista → placeholder visivo, aggiornamento stato UI e server.
3. Rinomina lista → input inline → validazione e update server.

**Vincoli:**
- Fixed header durante scroll verticale
- Drag handle e feedback visivo
- Empty state placeholder

---

### 2.4 Gestione Card

**Funzionalità:**
- Visualizzazione card compatta
- Badges per etichette, membri, checklist, allegati, commenti
- Hover con quick actions (edit, assign)
- Card Modal per dettagli
- Drag-and-drop card
- Supporto @mention e markdown nei commenti

**Flussi principali:**
1. Click su card → apertura Card Modal
2. Modifica dettagli (descrizione, checklist, membri, allegati) → auto-save con debounce
3. Inserimento commento → invio real-time
4. Drag card → spostamento tra liste o riordinamento
5. Visualizzazione badge sintetica sulla card

**Vincoli:**
- Lazy load della Card Modal e attività
- Virtualizzazione commenti se > 50
- Keyboard navigation supportata

---

### 2.5 Card Modal

**Funzionalità:**
- Editor dettagli completo
- Sidebar con azioni rapide (membri, labels, checklist, allegati)
- Thread commenti e attività
- Rich text editor e markdown
- Real-time sync tra utenti

**Flussi principali:**
1. Apertura modal → fetch dati card tramite TanStack Query
2. Modifica campi → ottimistic update → conferma server → broadcast real-time
3. Commenti con @mention → suggerimenti e invio real-time
4. Chiusura modal → focus ritorna al precedente elemento

**Vincoli:**
- Lazy load e code splitting
- Accessibilità completa (focus trap, ARIA labels)
- Full-screen su mobile

---

### 2.6 Drag-and-Drop

**Funzionalità:**
- Drag card e liste
- Animazioni smooth e clone fantasma
- Placeholder visibile durante drag
- Auto-scroll quando vicino ai bordi
- Touch support e haptic feedback su mobile

**Flussi principali:**
1. Inizio drag → visualizzazione clone fantasma + highlight drop zone
2. Fine drag → update UI immediato, invio evento server
3. Esc cancella drag
4. Drag tra liste con lunghezze diverse → gestione edge case

**Vincoli:**
- Performance ottimizzata con memoization
- Gestione conflitti real-time

---

### 2.7 Aggiornamenti Real-time

**Funzionalità:**
- Sincronizzazione board/list/card in tempo reale
- Visualizzazione modifiche da altri utenti
- Gestione conflitti e indicatori visivi

**Flussi principali:**
1. Utente A crea/modifica card → evento socket → aggiornamento store client B
2. Utente offline → coda mutazioni → sincronizzazione al ritorno online
3. Last-write-wins per testi, merge per array (labels, members)

**Vincoli:**
- Feedback visivo quando altri utenti aggiornano
- Offline banner e retry automatico

---

### 2.8 Performance e Ottimizzazione

**Funzionalità:**
- Virtualizzazione liste e card
- Memoization e useCallback per componenti costosi
- Lazy load di modali e pagine
- Ottimizzazione immagini (responsive, lazy loading, blur placeholder)
- Bundle size < 300KB gzipped

---

### 2.9 Accessibilità (A11y)

**Funzionalità:**
- Navigazione via tastiera e shortcut
- ARIA labels per card e liste
- Focus management nelle modali
- Live regions per notifiche
- Contrasto colore WCAG AA

**Vincoli:**
- Tab navigation tra card, liste e modali
- Esc per chiusura modali
- Screen reader-friendly

---

### 2.10 Notifiche ed Error Handling

**Funzionalità:**
- Toast notifications per successi e errori
- Inline error messages per form
- Skeleton screens e overlay loading
- Error boundaries per componenti critici

---

### 2.11 Routing e URL State

**Funzionalità:**
- Route principali: `/`, `/login`, `/signup`, `/w/:workspaceId`, `/b/:boardId`, `/b/:boardId/c/:cardId`
- URL riflette stato della Card Modal
- Protezione route per utenti non autenticati

**Flussi principali:**
1. Navigate a `/b/:boardId/c/:cardId` → apre modal card
2. Chiusura modal → ritorna a `/b/:boardId`
3. Cambio workspace → fetch board list

---

### 2.12 Responsive Design

**Funzionalità:**
- Mobile (<768px): liste verticali, full-width card, bottom sheet per sidebar
- Tablet / Desktop: board scroll orizzontale, sidebar fissa
- Hamburger menu e swipe gestures per mobile
- Touch-friendly drag-and-drop

---

## 3. KPI Funzionali
