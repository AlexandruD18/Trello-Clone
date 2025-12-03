import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Card from './Card';
import { MoreHorizontal, Plus, X, Trash2, GripVertical } from 'lucide-react';

function List({ list, onUpdateList, onDeleteList, onAddCard, onCardClick }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(list.name);
  const [showMenu, setShowMenu] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data: {
      type: 'list',
      list,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleTitleSubmit = () => {
    if (title.trim() && title !== list.name) {
      onUpdateList(list.id, title.trim());
    } else {
      setTitle(list.name);
    }
    setIsEditing(false);
  };

  const handleAddCard = (e) => {
    e.preventDefault();
    if (newCardTitle.trim()) {
      onAddCard(list.id, newCardTitle.trim());
      setNewCardTitle('');
      setShowAddCard(false);
    }
  };

  const cards = list.cards || [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-72 flex-shrink-0 bg-trello-light-gray rounded-lg flex flex-col max-h-[calc(100vh-140px)]"
    >
      <div className="p-2 flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:bg-gray-300 p-1 rounded"
        >
          <GripVertical className="h-4 w-4 text-gray-500" />
        </div>
        
        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSubmit();
              if (e.key === 'Escape') {
                setTitle(list.name);
                setIsEditing(false);
              }
            }}
            className="flex-1 px-2 py-1 font-semibold bg-white border-2 border-trello-blue rounded focus:outline-none"
            autoFocus
          />
        ) : (
          <h3
            onClick={() => setIsEditing(true)}
            className="flex-1 px-2 py-1 font-semibold text-gray-800 cursor-pointer hover:bg-gray-200 rounded"
          >
            {list.name}
          </h3>
        )}

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-gray-300 rounded"
          >
            <MoreHorizontal className="h-4 w-4 text-gray-600" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg py-1 z-20 w-48">
                <button
                  onClick={() => {
                    onDeleteList(list.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete List
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-[50px]">
        <SortableContext
          items={cards.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div 
            className="space-y-2"
            data-list-id={list.id}
          >
            {cards.map((card) => (
              <Card
                key={card.id}
                card={card}
                onClick={() => onCardClick(card)}
              />
            ))}
          </div>
        </SortableContext>
      </div>

      <div className="p-2">
        {showAddCard ? (
          <form onSubmit={handleAddCard}>
            <textarea
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              className="w-full p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-trello-blue"
              placeholder="Enter a title for this card..."
              rows={3}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddCard(e);
                }
                if (e.key === 'Escape') {
                  setShowAddCard(false);
                  setNewCardTitle('');
                }
              }}
            />
            <div className="flex gap-2 mt-2">
              <button type="submit" className="btn btn-primary text-sm">
                Add Card
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddCard(false);
                  setNewCardTitle('');
                }}
                className="p-2 hover:bg-gray-300 rounded"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddCard(true)}
            className="w-full p-2 text-left text-gray-600 hover:bg-gray-200 rounded flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add a card
          </button>
        )}
      </div>
    </div>
  );
}

export default List;
