import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import api from '../lib/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import List from '../components/List';
import Card from '../components/Card';
import CardModal from '../components/CardModal';
import { ArrowLeft, Loader2, Plus, LogOut, User } from 'lucide-react';

// Stesso ordine del server: per posizione e, a parità, per id.
const perPosizione = (a, b) => a.position - b.position || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function BoardPage() {
    const { boardId, cardId } = useParams();
    const navigate = useNavigate();
    const { socket, riconnessioni, joinBoard, leaveBoard } = useSocket();
    const { user, logout } = useAuth();

    const [board, setBoard] = useState(null);
    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCard, setActiveCard] = useState(null);
    const [showAddList, setShowAddList] = useState(false);
    const [newListName, setNewListName] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        loadBoard();
        joinBoard(boardId);

        return () => {
            leaveBoard(boardId);
        };
    }, [boardId]);

    // Dopo una riconnessione gli eventi persi non arrivano più: si ricarica la board.
    useEffect(() => {
        if (riconnessioni > 0) loadBoard();
    }, [riconnessioni]);

    useEffect(() => {
        if (!socket) return;

        const handlers = {
            // Un admin ci ha tolto dalla board: non c'è più niente da mostrare qui.
            // Il filtro più sotto lascia passare solo gli eventi di questa board.
            'board:accesso-revocato': () => {
                navigate('/', {
                    replace: true,
                    state: { avviso: 'Non fai più parte di questa board.' },
                });
            },
            'list:created': (data) => {
                setLists((prev) => [...prev, { ...data.list, cards: [] }]);
            },
            'list:updated': (data) => {
                setLists((prev) =>
                    prev.map((l) => (l.id === data.list.id ? { ...l, ...data.list } : l))
                );
            },
            'list:moved': (data) => {
                setLists((prev) =>
                    prev
                        .map((l) => (l.id === data.listId ? { ...l, position: data.position } : l))
                        .sort(perPosizione)
                );
            },
            // Il server ha rinumerato le posizioni: si riparte dai dati salvati.
            'board:refresh': () => {
                loadBoard();
            },
            'list:deleted': (data) => {
                setLists((prev) => prev.filter((l) => l.id !== data.listId));
            },
            'card:created': (data) => {
                setLists((prev) =>
                    prev.map((l) => {
                        if (l.id === data.card.listId) {
                            return { ...l, cards: [...(l.cards || []), data.card] };
                        }
                        return l;
                    })
                );
            },
            'card:updated': (data) => {
                setLists((prev) =>
                    prev.map((l) => ({
                        ...l,
                        cards: (l.cards || []).map((c) =>
                            c.id === data.card.id ? { ...c, ...data.card } : c
                        ),
                    }))
                );
            },
            'card:moved': (data) => {
                setLists((prev) => {
                    const newLists = prev.map((l) => ({
                        ...l,
                        cards: (l.cards || []).filter((c) => c.id !== data.cardId),
                    }));
                    return newLists.map((l) => {
                        if (l.id === data.listId) {
                            const updatedCards = [
                                ...(l.cards || []),
                                { ...data.card, listId: data.listId, position: data.position },
                            ];
                            return {
                                ...l,
                                cards: updatedCards.sort(perPosizione),
                            };
                        }
                        return l;
                    });
                });
            },
            'card:deleted': (data) => {
                setLists((prev) =>
                    prev.map((l) => ({
                        ...l,
                        cards: (l.cards || []).filter((c) => c.id !== data.cardId),
                    }))
                );
            },
        };

        // Gli eventi di un'altra board (cambio di board rapido) non toccano questa vista.
        const ascoltatori = Object.entries(handlers).map(([event, handler]) => [
            event,
            (data) => {
                if (data && data.boardId === boardId) handler(data);
            },
        ]);
        ascoltatori.forEach(([event, ascolta]) => socket.on(event, ascolta));

        return () => {
            ascoltatori.forEach(([event, ascolta]) => socket.off(event, ascolta));
        };
    }, [socket, boardId]);

    const loadBoard = async () => {
        try {
            const res = await api.get(`/boards/${boardId}`);
            setBoard(res.data);
            const sortedLists = (res.data.lists || []).sort(perPosizione).map((list) => ({
                ...list,
                cards: (list.cards || []).sort(perPosizione),
            }));
            setLists(sortedLists);
        } catch (error) {
            console.error('Failed to load board:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddList = async (e) => {
        e.preventDefault();
        if (!newListName.trim()) return;

        try {
            const res = await api.post('/lists', {
                name: newListName,
                boardId,
            });
            setLists([...lists, { ...res.data, cards: [] }]);
            setNewListName('');
            setShowAddList(false);
        } catch (error) {
            console.error('Failed to create list:', error);
        }
    };

    const handleUpdateList = async (listId, name) => {
        try {
            await api.put(`/lists/${listId}`, { name });
            setLists(lists.map((l) => (l.id === listId ? { ...l, name } : l)));
        } catch (error) {
            console.error('Failed to update list:', error);
        }
    };

    const handleDeleteList = async (listId) => {
        try {
            await api.delete(`/lists/${listId}`);
            setLists(lists.filter((l) => l.id !== listId));
        } catch (error) {
            console.error('Failed to delete list:', error);
        }
    };

    const handleAddCard = async (listId, title) => {
        try {
            const res = await api.post('/cards', { title, listId });
            setLists(
                lists.map((l) => {
                    if (l.id === listId) {
                        return { ...l, cards: [...(l.cards || []), res.data] };
                    }
                    return l;
                })
            );
        } catch (error) {
            console.error('Failed to create card:', error);
        }
    };

    const handleCardClick = (card) => {
        navigate(`/b/${boardId}/c/${card.id}`);
    };

    const handleCloseModal = () => {
        navigate(`/b/${boardId}`);
    };

    const handleCardUpdate = (updatedCard) => {
        setLists((prev) =>
            prev.map((l) => ({
                ...l,
                cards: (l.cards || []).map((c) => (c.id === updatedCard.id ? updatedCard : c)),
            }))
        );
    };

    const handleCardDelete = async (cardId) => {
        try {
            await api.delete(`/cards/${cardId}`);
            setLists(
                lists.map((l) => ({
                    ...l,
                    cards: (l.cards || []).filter((c) => c.id !== cardId),
                }))
            );
            navigate(`/b/${boardId}`);
        } catch (error) {
            console.error('Failed to delete card:', error);
        }
    };

    const findCard = (id) => {
        for (const list of lists) {
            const card = (list.cards || []).find((c) => c.id === id);
            if (card) return { card, list };
        }
        return null;
    };

    // Com'era la board all'inizio del trascinamento: serve per tornare indietro se
    // l'utente annulla (Esc) o lascia la card fuori da ogni lista.
    const inizioTrascinamento = useRef(null);

    const handleDragStart = (event) => {
        const { active } = event;
        const type = active.data.current?.type;

        if (type === 'card') {
            const result = findCard(active.id);
            if (result) {
                setActiveCard(result.card);
                inizioTrascinamento.current = {
                    lists,
                    listId: result.list.id,
                    index: (result.list.cards || []).findIndex((c) => c.id === active.id),
                };
            }
        }
    };

    const ripristinaTrascinamento = () => {
        setActiveCard(null);
        if (inizioTrascinamento.current) {
            setLists(inizioTrascinamento.current.lists);
            // Nel frattempo altri possono aver cambiato la board: si riparte dai dati salvati.
            loadBoard();
        }
        inizioTrascinamento.current = null;
    };

    const handleDragOver = (event) => {
        const { active, over } = event;
        if (!over) return;

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;

        if (activeType !== 'card') return;

        const activeResult = findCard(active.id);
        if (!activeResult) return;

        let overListId;
        if (overType === 'list') {
            overListId = over.id;
        } else if (overType === 'card') {
            const overResult = findCard(over.id);
            if (!overResult) return;
            overListId = overResult.list.id;
        }

        if (!overListId || activeResult.list.id === overListId) return;

        setLists((prev) => {
            const newLists = prev.map((list) => {
                if (list.id === activeResult.list.id) {
                    return {
                        ...list,
                        cards: (list.cards || []).filter((c) => c.id !== active.id),
                    };
                }
                if (list.id === overListId) {
                    const cards = [...(list.cards || [])];
                    const overIndex =
                        overType === 'card'
                            ? cards.findIndex((c) => c.id === over.id)
                            : cards.length;
                    cards.splice(overIndex, 0, { ...activeResult.card, listId: overListId });
                    return { ...list, cards };
                }
                return list;
            });
            return newLists;
        });
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;

        setActiveCard(null);
        const inizio = inizioTrascinamento.current;
        inizioTrascinamento.current = null;

        if (!over) {
            if (inizio) {
                setLists(inizio.lists);
                loadBoard();
            }
            return;
        }

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;

        if (activeType === 'list' && overType === 'list') {
            const oldIndex = lists.findIndex((l) => l.id === active.id);
            const newIndex = lists.findIndex((l) => l.id === over.id);
            if (oldIndex === newIndex) return;

            setLists(arrayMove(lists, oldIndex, newIndex));
            try {
                const res = await api.put(`/lists/${active.id}/move`, { index: newIndex });
                if (res.data.rinumerati) loadBoard();
                else
                    setLists((prev) =>
                        prev.map((l) =>
                            l.id === active.id ? { ...l, position: res.data.position } : l
                        )
                    );
            } catch (error) {
                console.error('Failed to move list:', error);
                loadBoard();
            }
        } else if (activeType === 'card') {
            // Durante il trascinamento handleDragOver ha già messo la card nella lista
            // di destinazione: qui resta solo l'ordine dentro quella lista.
            const result = findCard(active.id);
            if (!result) return;

            const cards = result.list.cards || [];
            const oldIndex = cards.findIndex((c) => c.id === active.id);
            let newIndex = oldIndex;
            if (overType === 'card') {
                const overIndex = cards.findIndex((c) => c.id === over.id);
                if (overIndex !== -1) newIndex = overIndex;
            }

            const targetListId = result.list.id;
            if (newIndex !== oldIndex) {
                setLists((prev) =>
                    prev.map((l) =>
                        l.id === targetListId
                            ? { ...l, cards: arrayMove(l.cards || [], oldIndex, newIndex) }
                            : l
                    )
                );
            }

            // Tornata dov'era: niente da salvare.
            if (inizio && inizio.listId === targetListId && inizio.index === newIndex) return;

            try {
                const res = await api.put(`/cards/${active.id}/move`, {
                    listId: targetListId,
                    index: newIndex,
                });
                const { rinumerati, ...salvata } = res.data;
                if (rinumerati) loadBoard();
                else handleCardUpdate({ ...result.card, ...salvata });
            } catch (error) {
                console.error('Failed to move card:', error);
                loadBoard();
            }
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div
                className="flex items-center justify-center h-screen"
                style={{ backgroundColor: board?.backgroundColor || '#0079bf' }}
            >
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        );
    }

    if (!board) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
                <p className="text-xl text-gray-600 mb-4">Board not found</p>
                <Link to="/" className="btn btn-primary">
                    Go Home
                </Link>
            </div>
        );
    }

    const selectedCard = cardId
        ? lists.flatMap((l) => l.cards || []).find((c) => c.id === cardId)
        : null;

    return (
        <div
            className="min-h-screen flex flex-col"
            style={{ backgroundColor: board.backgroundColor || '#0079bf' }}
        >
            <header className="bg-black/20 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/" className="hover:bg-white/20 p-2 rounded transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-xl font-bold">{board.name}</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        <span className="text-sm">{user?.name}</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="text-sm">Logout</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-x-auto p-4 board-container">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDragCancel={ripristinaTrascinamento}
                >
                    <SortableContext
                        items={lists.map((l) => l.id)}
                        strategy={horizontalListSortingStrategy}
                    >
                        <div className="flex gap-4 items-start h-full">
                            {lists.map((list) => (
                                <List
                                    key={list.id}
                                    list={list}
                                    onUpdateList={handleUpdateList}
                                    onDeleteList={handleDeleteList}
                                    onAddCard={handleAddCard}
                                    onCardClick={handleCardClick}
                                />
                            ))}

                            <div className="w-72 flex-shrink-0">
                                {showAddList ? (
                                    <form
                                        onSubmit={handleAddList}
                                        className="bg-trello-light-gray rounded-lg p-2"
                                    >
                                        <input
                                            type="text"
                                            value={newListName}
                                            onChange={(e) => setNewListName(e.target.value)}
                                            className="input mb-2"
                                            placeholder="Enter list title..."
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                type="submit"
                                                className="btn btn-primary text-sm"
                                            >
                                                Add List
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowAddList(false);
                                                    setNewListName('');
                                                }}
                                                className="btn btn-secondary text-sm"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <button
                                        onClick={() => setShowAddList(true)}
                                        className="w-full bg-white/20 hover:bg-white/30 text-white rounded-lg p-3 flex items-center gap-2 transition-colors"
                                    >
                                        <Plus className="h-5 w-5" />
                                        Add another list
                                    </button>
                                )}
                            </div>
                        </div>
                    </SortableContext>

                    <DragOverlay>
                        {activeCard ? <Card card={activeCard} isDragging /> : null}
                    </DragOverlay>
                </DndContext>
            </div>

            {selectedCard && (
                <CardModal
                    card={selectedCard}
                    labels={board.labels || []}
                    onClose={handleCloseModal}
                    onUpdate={handleCardUpdate}
                    onDelete={handleCardDelete}
                />
            )}
        </div>
    );
}

export default BoardPage;
