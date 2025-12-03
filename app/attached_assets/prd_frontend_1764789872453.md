# Product Requirements Document (PRD)
# Trello Clone - Frontend Implementation

## 1. Informazioni Generali

**Nome del Progetto:** Trello Clone - Frontend Application

**Data:** Novembre 2025

**Versione:** v1.0

**Autore:** [Nome del Product Manager]

**Team:** Frontend Engineering, UX/UI Design

**Status:** Draft

---

## 2. Executive Summary

Sviluppo del frontend per una piattaforma di project management visuale ispirata a Trello. L'applicazione fornirà un'interfaccia drag-and-drop intuitiva per gestire board, liste e card con aggiornamenti real-time. Focus su performance, user experience fluida, e architettura frontend scalabile e manutenibile.

---

## 3. Obiettivi Frontend

### 3.1 Obiettivi Tecnici
1. Creare un'interfaccia performante che gestisca 1000+ card senza lag
2. Implementare drag-and-drop smooth con feedback visuale immediato
3. Garantire responsive design perfetto da mobile a desktop
4. Ottimizzare bundle size < 300KB (gzipped) per caricamento rapido
5. Raggiungere Lighthouse score: Performance 90+, Accessibility 95+

### 3.2 Obiettivi UX
1. Time to interactive < 2 secondi
2. Drag-and-drop latency < 100ms
3. Zero layout shift durante caricamento
4. Feedback visuale immediato per ogni azione
5. Supporto completo tastiera e screen reader

### 3.3 KPI Frontend
| Metrica | Target | Misurazione |
|---------|--------|-------------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Time to Interactive | < 2.5s | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Core Web Vitals |
| Bundle Size (initial) | < 300KB | Webpack analyzer |
| Re-render time (board) | < 50ms | React DevTools |

---

## 4. Stack Tecnologico

### 4.1 Core Technologies

**Framework & Libraries:**
```
- React 18.3+ (Concurrent Mode, Suspense)
- TypeScript 5.0+ (strict mode)
- Vite 5.0+ (build tool)
- React Router v6 (routing)
```

**State Management:**
```
- TanStack Query v5 (server state, caching)
- Zustand (client state, lightweight)
- Immer (immutable updates)
```

**Drag & Drop:**
```
- @dnd-kit/core (modern, performant)
- Alternativa: react-beautiful-dnd
```

**Styling:**
```
- Tailwind CSS 3.4+
- CSS Modules per componenti isolati
- clsx per class composition
```

**Form & Validation:**
```
- React Hook Form
- Zod (schema validation)
```

**Real-time:**
```
- Socket.io-client
- Optimistic updates con TanStack Query
```

**Rich Text:**
```
- Tiptap (per descrizioni e commenti)
- Markdown support
```

**Utilities:**
```
- date-fns (date manipulation)
- nanoid (ID generation)
- react-hot-toast (notifications)
```

### 4.2 Development Tools

**Code Quality:**
```
- ESLint + Prettier
- Husky (pre-commit hooks)
- lint-staged
- TypeScript strict mode
```

**Testing:**
```
- Vitest (unit tests)
- React Testing Library
- Playwright (e2e tests)
- MSW (API mocking)
```

**Performance:**
```
- React DevTools Profiler
- Lighthouse CI
- Bundle analyzer
```

---

## 5. Architettura Frontend

### 5.1 Struttura delle Cartelle

```
src/
├── assets/              # Immagini, fonts, icons
├── components/          # Componenti riusabili
│   ├── ui/             # Design system components
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── Dropdown/
│   └── common/         # Componenti shared
│       ├── Avatar/
│       ├── ColorPicker/
│       └── DatePicker/
├── features/           # Feature-based organization
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── types.ts
│   ├── boards/
│   │   ├── components/
│   │   │   ├── Board/
│   │   │   ├── BoardHeader/
│   │   │   └── BoardList/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── types.ts
│   ├── lists/
│   │   ├── components/
│   │   │   ├── List/
│   │   │   ├── ListHeader/
│   │   │   └── AddList/
│   │   ├── hooks/
│   │   └── types.ts
│   ├── cards/
│   │   ├── components/
│   │   │   ├── Card/
│   │   │   ├── CardModal/
│   │   │   ├── CardDetail/
│   │   │   └── QuickEdit/
│   │   ├── hooks/
│   │   └── types.ts
│   └── workspace/
├── hooks/              # Custom hooks globali
│   ├── useDebounce.ts
│   ├── useClickOutside.ts
│   ├── useKeyboard.ts
│   └── useMediaQuery.ts
├── lib/                # Utilities e helpers
│   ├── api/           # API client configuration
│   ├── socket/        # WebSocket client
│   ├── utils/         # Utility functions
│   └── constants.ts
├── stores/            # Zustand stores
│   ├── uiStore.ts     # UI state (sidebar, modals)
│   └── userStore.ts   # Current user state
├── styles/            # Global styles
│   ├── globals.css
│   └── tailwind.css
├── types/             # TypeScript types globali
│   ├── api.ts
│   └── models.ts
├── pages/             # Route pages
│   ├── HomePage.tsx
│   ├── BoardPage.tsx
│   ├── WorkspacePage.tsx
│   └── SettingsPage.tsx
├── App.tsx
├── main.tsx
└── router.tsx
```

### 5.2 Component Architecture

**Design System Hierarchy:**
```
1. Atoms (ui/)
   - Button, Input, Badge, Avatar
   
2. Molecules (common/)
   - SearchBar, UserMenu, LabelPicker
   
3. Organisms (features/*/components/)
   - Card, List, Board, CardModal
   
4. Templates (pages/)
   - BoardPage, WorkspacePage
```

**Component Pattern:**
```typescript
// Feature component structure
features/cards/components/Card/
├── Card.tsx           # Main component
├── Card.module.css    # Scoped styles (se necessario)
├── CardBadges.tsx     # Sub-components
├── CardMembers.tsx
├── useCard.ts         # Component logic hook
└── index.ts           # Exports
```

### 5.3 State Management Strategy

**Server State (TanStack Query):**
- Board data
- Lists data
- Cards data
- User data
- Comments, attachments

**Client State (Zustand):**
- UI state (modals, sidebar, filters)
- Current user preferences
- Drag state
- Active selections

**Local State (useState):**
- Form inputs
- Dropdown open/close
- Hover states

**URL State (React Router):**
- Current board/card ID
- Filters attivi
- Search queries

---

## 6. Componenti Principali

### 6.1 Board Component

**Responsabilità:**
- Render di tutte le liste
- Gestione drag-and-drop tra liste
- Horizontal scroll
- Real-time updates

**Props Interface:**
```typescript
interface BoardProps {
  boardId: string;
  onCardClick: (cardId: string) => void;
  filters?: BoardFilters;
}

interface BoardFilters {
  members?: string[];
  labels?: string[];
  dueDate?: 'overdue' | 'today' | 'week';
}
```

**Key Features:**
- Virtualization per performance con molte liste
- Smooth horizontal scroll con mouse wheel support
- Auto-scroll durante drag ai bordi
- Optimistic updates per azioni immediate
- Skeleton loading durante fetch iniziale

**State Management:**
```typescript
// TanStack Query
const { data: board } = useQuery({
  queryKey: ['board', boardId],
  queryFn: () => fetchBoard(boardId),
  staleTime: 5 * 60 * 1000, // 5 minuti
});

// Zustand per UI
const { activeFilters, setFilters } = useBoardStore();
```

**Performance Optimizations:**
- React.memo per liste e card
- useMemo per liste filtrate
- useCallback per handlers
- Lazy loading di card modal
- Code splitting per features non critiche

### 6.2 List Component

**Responsabilità:**
- Render cards in colonna
- Gestione drop zone
- Add card inline
- Lista actions (rename, archive, move)

**Props Interface:**
```typescript
interface ListProps {
  list: List;
  cards: Card[];
  onCardDrop: (cardId: string, position: number) => void;
  onAddCard: (title: string) => void;
}

interface List {
  id: string;
  title: string;
  position: number;
  boardId: string;
}
```

**Key Features:**
- Fixed header durante scroll
- "Add card" form inline alla fine
- Empty state placeholder
- Card count badge
- Drag handle visuale

**Interaction States:**
```typescript
// Drag states
- isDragging: opacity 0.5
- isDragOver: background highlight
- isCollapsed: mostra solo header (future)

// Edit states
- isEditingTitle: inline input
- isAddingCard: form espanso
```

### 6.3 Card Component

**Responsabilità:**
- Display card info compatto
- Badges visibili (labels, due date, checklist progress)
- Quick actions on hover
- Drag handle

**Props Interface:**
```typescript
interface CardProps {
  card: Card;
  onClick: () => void;
  isDragging?: boolean;
}

interface Card {
  id: string;
  title: string;
  description?: string;
  position: number;
  listId: string;
  members: User[];
  labels: Label[];
  dueDate?: Date;
  checklistStats?: { completed: number; total: number };
  attachments: Attachment[];
  commentCount: number;
  coverImage?: string;
}
```

**Visual Hierarchy:**
```
┌─────────────────────────┐
│ [Cover Image]           │ (optional)
├─────────────────────────┤
│ [Labels] [Labels]       │
│                         │
│ Card Title              │
│                         │
│ [👤👤] [📎2] [✓ 3/5]  │ (badges)
│ [📅 Dec 15]             │ (due date)
└─────────────────────────┘
```

**Badges:**
- Labels: max 4 visibili, "+2 more"
- Members: avatar overlap, max 4
- Checklist: progress "3/5" con icon
- Attachments: count con icon
- Comments: count con icon
- Due date: date badge con color coding

**Hover State:**
- Edit pencil icon top-right
- Quick actions (future): assign to me, quick label

### 6.4 Card Modal

**Responsabilità:**
- Full card details editor
- Sidebar con actions
- Activity feed
- Comments thread

**Layout Structure:**
```
┌─────────────────────────────────────────┐
│ [×] Card Title                    [···]│
├──────────────────────┬──────────────────┤
│                      │  SIDEBAR         │
│  MAIN CONTENT        │  ▸ Add to card   │
│                      │    Members       │
│  Description         │    Labels        │
│  [Edit]              │    Checklist     │
│                      │    Due Date      │
│  ✓ Checklist 1       │    Attachment    │
│  □ Item 1            │                  │
│  ☑ Item 2            │  ▸ Actions       │
│                      │    Move          │
│  Attachments         │    Copy          │
│  [img] [doc]         │    Archive       │
│                      │                  │
│  Activity            │                  │
│  [All] [Comments]    │                  │
│  Write comment...    │                  │
│  ─────────           │                  │
│  @user commented     │                  │
│  "Looking good!"     │                  │
│                      │                  │
└──────────────────────┴──────────────────┘
```

**Key Features:**
- Modal overlay con backdrop click to close
- Keyboard navigation (Esc to close, Tab navigation)
- Auto-save description con debounce
- Rich text editor per description
- @mention autocomplete nei commenti
- Real-time updates quando altri modificano
- Optimistic updates per azioni immediate

**Performance:**
- Lazy load modal (code split)
- Lazy load activity history (paginated)
- Virtualized comments se > 50

**State Management:**
```typescript
// Modal open state
const { openCardId, openCard, closeCard } = useCardModalStore();

// Card data
const { data: card } = useQuery({
  queryKey: ['card', cardId],
  queryFn: () => fetchCard(cardId),
  enabled: !!cardId,
});

// Mutations
const updateCardMutation = useMutation({
  mutationFn: updateCard,
  onMutate: async (newData) => {
    // Optimistic update
    await queryClient.cancelQueries(['card', cardId]);
    const previous = queryClient.getQueryData(['card', cardId]);
    queryClient.setQueryData(['card', cardId], newData);
    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['card', cardId], context.previous);
  },
});
```

### 6.5 Drag and Drop System

**Implementation con @dnd-kit:**

```typescript
// Board level - Lists draggable
import { DndContext, closestCenter } from '@dnd-kit/core';

<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
>
  <SortableContext items={lists} strategy={horizontalListSortingStrategy}>
    {lists.map(list => (
      <SortableList key={list.id} list={list} />
    ))}
  </SortableContext>
</DndContext>

// List level - Cards draggable
<SortableContext items={cards} strategy={verticalListSortingStrategy}>
  {cards.map(card => (
    <SortableCard key={card.id} card={card} />
  ))}
</SortableContext>
```

**Drag Visual Feedback:**
- Clone fantasma della card durante drag
- Placeholder nella posizione drop
- Cursor "grabbing"
- Drop zone highlight
- Smooth animations

**Edge Cases:**
- Drag tra liste di lunghezza diversa
- Scroll automatico quando drag vicino ai bordi
- Cancel drag con Esc
- Drag prevention durante edit mode
- Touch support per mobile

### 6.6 Real-time Updates

**WebSocket Integration:**

```typescript
// Socket setup
const socket = io(API_URL, {
  auth: { token: authToken },
  transports: ['websocket'],
});

// Subscribe to board updates
useEffect(() => {
  socket.emit('join-board', boardId);
  
  socket.on('card:created', (data) => {
    queryClient.invalidateQueries(['board', boardId]);
    toast.success(`${data.user.name} added a card`);
  });
  
  socket.on('card:updated', (data) => {
    queryClient.setQueryData(['card', data.cardId], data.card);
  });
  
  socket.on('card:moved', (data) => {
    // Optimistic update lists
    updateListsCache(data);
  });
  
  return () => {
    socket.emit('leave-board', boardId);
  };
}, [boardId]);
```

**Conflict Resolution:**
- Last-write-wins per text fields
- Merge strategy per arrays (members, labels)
- Visual indicator quando altri utenti stanno modificando
- "Someone else updated this" toast con reload option

**Online/Offline Handling:**
```typescript
const { isOnline } = useNetworkStatus();

// Mostra banner quando offline
{!isOnline && (
  <Banner variant="warning">
    You're offline. Changes will sync when connection is restored.
  </Banner>
)}

// Queue mutations quando offline
const mutation = useMutation({
  mutationFn: updateCard,
  retry: isOnline ? 3 : false,
  retryDelay: 1000,
});
```

---

## 7. Routing Structure

### 7.1 Routes

```typescript
// router.tsx
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> },
      {
        path: 'w/:workspaceId',
        element: <WorkspaceLayout />,
        children: [
          { index: true, element: <WorkspaceDashboard /> },
          { path: 'boards', element: <BoardsPage /> },
          { path: 'members', element: <MembersPage /> },
          { path: 'settings', element: <WorkspaceSettings /> },
        ],
      },
      {
        path: 'b/:boardId',
        element: <BoardPage />,
        loader: boardLoader,
      },
      {
        path: 'b/:boardId/c/:cardId',
        element: <BoardPage />, // Same page, card modal open
      },
    ],
  },
]);
```

### 7.2 Route Protection

```typescript
// Protected route wrapper
function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  
  if (isLoading) return <LoadingSpinner />;
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
}
```

### 7.3 URL State Management

```typescript
// Card modal from URL
const { cardId } = useParams();
const navigate = useNavigate();

// Open card modal
const openCard = (cardId: string) => {
  navigate(`/b/${boardId}/c/${cardId}`);
};

// Close card modal
const closeCard = () => {
  navigate(`/b/${boardId}`);
};
```

---

## 8. Responsive Design

### 8.1 Breakpoints

```css
/* Tailwind breakpoints */
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

### 8.2 Mobile Adaptations (< 768px)

**Board View:**
- Liste stack verticalmente (no horizontal scroll)
- Card full-width
- Sticky "Add list" button in fondo
- Collapsible sidebar

**Card Modal:**
- Full-screen modal
- Sidebar diventa bottom sheet
- Touch-optimized buttons (min 44x44px)

**Navigation:**
- Hamburger menu invece di sidebar
- Bottom tab bar per quick actions
- Swipe gestures per navigation

**Drag and Drop:**
- Long-press to activate drag
- Haptic feedback (mobile)
- Simplified drag visuals

### 8.3 Responsive Components

```typescript
// useMediaQuery hook
const isMobile = useMediaQuery('(max-width: 768px)');
const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');

// Conditional rendering
{isMobile ? (
  <MobileCardModal card={card} />
) : (
  <DesktopCardModal card={card} />
)}
```

---

## 9. Performance Optimization

### 9.1 Code Splitting

```typescript
// Lazy load routes
const BoardPage = lazy(() => import('./pages/BoardPage'));
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'));

// Lazy load heavy components
const CardModal = lazy(() => import('./features/cards/components/CardModal'));
const RichTextEditor = lazy(() => import('./components/RichTextEditor'));

// Suspense boundaries
<Suspense fallback={<LoadingSpinner />}>
  <CardModal />
</Suspense>
```

### 9.2 Virtualization

```typescript
// Virtual scrolling per liste lunghe
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: cards.length,
  getScrollElement: () => listRef.current,
  estimateSize: () => 100, // card height estimate
  overscan: 5,
});

// Render only visible cards
{rowVirtualizer.getVirtualItems().map((virtualRow) => (
  <Card
    key={cards[virtualRow.index].id}
    card={cards[virtualRow.index]}
    style={{
      height: `${virtualRow.size}px`,
      transform: `translateY(${virtualRow.start}px)`,
    }}
  />
))}
```

### 9.3 Memoization Strategy

```typescript
// Memo expensive components
export const Card = React.memo(({ card, onClick }) => {
  // Component logic
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.card.id === nextProps.card.id &&
         prevProps.card.updatedAt === nextProps.card.updatedAt;
});

// useMemo for expensive calculations
const filteredCards = useMemo(() => {
  return cards.filter(card => {
    // Complex filtering logic
  });
}, [cards, filters]);

// useCallback for handlers
const handleCardClick = useCallback((cardId: string) => {
  openCard(cardId);
}, [openCard]);
```

### 9.4 Image Optimization

```typescript
// Lazy load images
<img
  src={attachment.url}
  loading="lazy"
  alt={attachment.filename}
/>

// Responsive images
<img
  srcSet={`
    ${attachment.thumbnail} 300w,
    ${attachment.medium} 600w,
    ${attachment.large} 1200w
  `}
  sizes="(max-width: 768px) 100vw, 600px"
/>

// Blur placeholder
<img
  src={attachment.url}
  blurDataURL={attachment.blurHash}
  placeholder="blur"
/>
```

### 9.5 Bundle Size Optimization

**Strategies:**
- Tree shaking con Vite
- Dynamic imports per routes e modali
- Lazy load di librerie pesanti (date-fns, rich text editor)
- Remove unused Tailwind classes in production
- Compress assets (Brotli/Gzip)

**Bundle Analysis:**
```bash
npm run build -- --analyze
```

**Target Sizes:**
- Main bundle: < 200KB
- Vendor bundle: < 100KB
- Total initial: < 300KB
- Each route chunk: < 50KB

---

## 10. Accessibility (A11y)

### 10.1 Keyboard Navigation

**Global Shortcuts:**
```
B         - Board switcher
N         - New card (in current list)
F         - Focus search
Q         - Filter by me
/         - Keyboard shortcuts help
Esc       - Close modal/dropdown
```

**Board Navigation:**
```
Tab       - Navigate between cards
Enter     - Open card
Space     - Drag card (in drag mode)
Arrow keys - Navigate in modals
```

**Implementation:**
```typescript
// Global keyboard handler
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'b' && !isInputFocused()) {
      openBoardSwitcher();
    }
    if (e.key === 'n' && !isInputFocused()) {
      focusNewCardInput();
    }
    // ... other shortcuts
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

### 10.2 Screen Reader Support

**ARIA Labels:**
```tsx
<button
  aria-label="Add a card"
  aria-describedby="add-card-hint"
>
  <PlusIcon />
</button>

<div
  role="list"
  aria-label="Task list"
>
  {cards.map(card => (
    <div
      key={card.id}
      role="listitem"
      aria-label={`Card: ${card.title}`}
    >
      {card.title}
    </div>
  ))}
</div>
```

**Live Regions:**
```tsx
// Announce changes to screen readers
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {statusMessage}
</div>

// Example: "Card moved to In Progress"
```

### 10.3 Focus Management

```typescript
// Trap focus in modal
import { FocusTrap } from '@headlessui/react';

<FocusTrap>
  <div className="modal">
    <input autoFocus />
    {/* modal content */}
    <button onClick={closeModal}>Close</button>
  </div>
</FocusTrap>

// Return focus after modal close
const previousFocus = useRef<HTMLElement>();

const openModal = () => {
  previousFocus.current = document.activeElement;
  setIsOpen(true);
};

const closeModal = () => {
  setIsOpen(false);
  previousFocus.current?.focus();
};
```

### 10.4 Color Contrast

**WCAG AA Standards:**
- Normal text: 4.5:1 contrast ratio
- Large text (18px+): 3:1 contrast ratio
- UI components: 3:1 contrast ratio

**Testing:**
```bash
npm run test:a11y
# Uses @axe-core/react for automated testing
```

---

## 11. Error Handling & Loading States

### 11.1 Error Boundaries

```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
    // Send to error tracking (Sentry)
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          resetError={() => this.setState({ hasError: false })}
        />
      );
    }
    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <Board boardId={boardId} />
</ErrorBoundary>
```

### 11.2 Loading States

**Skeleton Screens:**
```tsx
function BoardSkeleton() {
  return (
    <div className="flex gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="w-72">
          <div className="h-8 bg-gray-200 rounded mb-2 animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map(j => (
              <div key={j} className="h-20 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Usage with Suspense
<Suspense fallback={<BoardSkeleton />}>
  <Board boardId={boardId} />
</Suspense>
```

**Progress Indicators:**
```tsx
// Inline loading
{isLoading && <Spinner size="sm" />}

// Overlay loading
{isSaving && (
  <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
    <Spinner />
    <span>Saving...</span>
  </div>
)}
```

### 11.3 Error Messages

**Toast Notifications:**
```typescript
import toast from 'react-hot-toast';

// Success
toast.success('Card created successfully');

// Error
toast.error('Failed to update card. Please try again.');

// With action
toast.error(
  <div>
    Failed to delete. <button onClick={retry}>Retry</button>
  </div>,
  { duration: 5000 }
);
```

**Inline Errors:**
```tsx
<form onSubmit={handleSubmit}>
  <Input
    {...register('title')}
    error={errors.title?.message}
  />
  {errors.title && (
    <p className="text-red-500 text-sm mt-1">
      {errors.title.message}
    </p>
  )}
</form>
```

---

## 12. Testing Strategy

### 12.1 Unit Tests (Vitest + RTL)

```typescript
// Card.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  const mockCard = {
    id: '1',
    title: 'Test Card',
    members: [],
    labels: [],
  };
  
  it('renders card title', () => {
    render(<Card card={mockCard} onClick={vi.fn()} />);
    expect(screen.getByText('Test Card')).toBeInTheDocument();
  });
  
  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Card card={mockCard} onClick={handleClick} />);
    
    fireEvent.click(screen.getByText('Test Card'));
    expect(handleClick).toHaveBeenCalledWith('1');
  });
  
  it('shows due date badge when present', () => {
    const cardWithDate = { ...mockCard, dueDate: new Date('2024-12-15') };
    render(<Card card={cardWithDate} onClick={vi.fn()} />);
    
    expect(screen.getByText(/Dec 15/)).toBeInTheDocument();
  });
});
```

### 12.2 Integration Tests

```typescript
// BoardPage.test.tsx
import { renderWithProviders } from '@/test/utils';
import { server } from '@/test
