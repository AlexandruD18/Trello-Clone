# Analisi Funzionale – Trello Clone Frontend

## 1. Introduzione

L'analisi funzionale definisce le funzionalità che l'applicazione deve offrire dal punto di vista dell'utente e dei processi principali, senza dettagli implementativi tecnici. Questo documento funge da ponte tra i requisiti di prodotto (PRD) e l'implementazione tecnica, assicurando che tutte le feature siano allineate con le esigenze degli utenti.

**Scopo:** Descrivere cosa l'applicazione deve fare, i flussi utente e i vincoli operativi.

**Ambito:** Frontend dell'applicazione Trello Clone, inclusi autenticazione, gestione board, drag-and-drop, real-time updates e accessibilità.

---

## 2. Funzionalità Principali

### 2.1 Autenticazione e Workspace

**Descrizione:**

- Login e logout sicuri.
- Registrazione nuovi account.
- Recupero password.
- Navigazione e selezione tra workspace.
- Protezione delle route basata sull'autenticazione.

**Flussi Utente:**

1. Utente accede con credenziali → reindirizzamento al workspace principale.
2. Accesso negato senza autenticazione.
3. Switch tra workspace con controllo permessi.

**Vincoli:**

- Utilizzo di token JWT o sessioni client-side.
- Accesso offline limitato ai dati già caricati.

### 2.2 Board Management

**Descrizione:**

- Visualizzazione board con liste e card.
- Drag-and-drop di liste e card.
- Ordinamento e filtri (per membri, etichette, date).
- Scroll orizzontale per board estese.
- Aggiornamenti real-time via WebSocket.

**Flussi Principali:**

1. Caricamento board → liste e card virtualizzate per performance.
2. Drag card → update UI immediato (optimistic), invio server, sync real-time.
3. CRUD su card/liste → mutazioni ottimistiche con rollback su errore.

**Vincoli:**

- Supporto 1000+ card senza lag.
- Gestione conflitti real-time (merge/last-write-wins).
- Latency drag-and-drop < 100ms.
- Responsive: mobile verticale, desktop orizzontale.

### 2.3 Gestione Liste

**Descrizione:**

- CRUD liste (crea, rinomina, elimina).
- Drag-and-drop card interne.
- Aggiunta card inline.
- Stati espanso/collassato.

**Flussi:**

1. "Add list" → form inline → salvataggio locale e server.
2. Drag card → placeholder, update UI/server.
3. Rinomina → input inline → validazione e update.

**Vincoli:**

- Header fisso durante scroll.
- Feedback visivo drag.
- Placeholder per liste vuote.

### 2.4 Gestione Card

**Descrizione:**

- Vista compatta card con badges (etichette, membri, checklist, allegati, commenti).
- Quick actions su hover (edit, assign).
- Modal dettagli card.
- Drag-and-drop card.
- Supporto @mention e Markdown in commenti.

**Flussi:**

1. Click card → apertura modal.
2. Modifica dettagli → auto-save con debounce.
3. Commento → invio real-time.
4. Drag → spostamento/riordinamento.
5. Badge sintetici sulla card.

**Vincoli:**

- Lazy load modal e attività.
- Virtualizzazione commenti > 50.
- Navigazione tastiera.

### 2.5 Card Modal

**Descrizione:**

- Editor completo dettagli.
- Sidebar azioni (membri, labels, checklist, allegati).
- Thread commenti e attività.
- Rich text editor con Markdown.
- Sync real-time tra utenti.

**Flussi:**

1. Apertura → fetch dati via TanStack Query.
2. Modifiche → optimistic update → conferma server → broadcast.
3. Commenti @mention → suggerimenti, invio real-time.
4. Chiusura → focus ritorno.

**Vincoli:**

- Lazy load e code splitting.
- Accessibilità (focus trap, ARIA).
- Full-screen mobile.

### 2.6 Drag-and-Drop

**Descrizione:**

- Drag card e liste.
- Animazioni smooth, clone fantasma.
- Placeholder durante drag.
- Auto-scroll ai bordi.
- Supporto touch e haptic su mobile.

**Flussi:**

1. Inizio drag → clone + highlight zone.
2. Fine drag → update UI, invio server.
3. Esc → cancella.
4. Edge case tra liste diverse.

**Vincoli:**

- Ottimizzazioni performance (memoization).
- Gestione conflitti real-time.

### 2.7 Aggiornamenti Real-Time

**Descrizione:**

- Sync board/liste/card in tempo reale.
- Visualizzazione modifiche altrui.
- Gestione conflitti e indicatori.

**Flussi:**

1. Utente A modifica → evento socket → update client B.
2. Offline → coda mutazioni → sync online.
3. Last-write-wins testi, merge array.

**Vincoli:**

- Feedback visivo aggiornamenti.
- Banner offline e retry.

### 2.8 Performance e Ottimizzazione

**Descrizione:**

- Virtualizzazione liste/card.
- Memoization e useCallback.
- Lazy load modali/pagine.
- Ottimizzazione immagini.
- Bundle < 300KB gzipped.

### 2.9 Accessibilità (A11y)

**Descrizione:**

- Navigazione tastiera/shortcut.
- ARIA labels.
- Focus management.
- Live regions notifiche.
- Contrasto WCAG AA.

**Vincoli:**

- Tab navigation.
- Esc chiusura.
- Screen reader compatibile.

### 2.10 Notifiche ed Error Handling

**Descrizione:**

- Toast per success/error.
- Error inline form.
- Skeleton e loading overlay.
- Error boundaries.

### 2.11 Routing e URL State

**Descrizione:**

- Route: `/`, `/login`, `/signup`, `/w/:workspaceId`, `/b/:boardId`, `/b/:boardId/c/:cardId`.
- URL riflette modal card.
- Protezione route autenticati.

**Flussi:**

1. Navigate a card URL → apre modal.
2. Chiusura → back to board.
3. Cambio workspace → fetch boards.

### 2.12 Responsive Design

**Descrizione:**

- Mobile (<768px): liste verticali, card full-width, bottom sheet sidebar.
- Tablet/Desktop: scroll orizzontale, sidebar fissa.
- Hamburger menu, swipe gestures.
- Touch-friendly drag.

---

## 3. KPI Funzionali

- **User Satisfaction:** > 90% su survey UX.
- **Task Completion Rate:** > 95% per flussi principali.
- **Error Rate:** < 5% azioni fallite.
- **Accessibility Score:** 95+ Lighthouse.
