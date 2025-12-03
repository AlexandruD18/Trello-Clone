import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, CheckSquare, Calendar, Tag } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

function Card({ card, onClick, isDragging: isDraggingProp }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: 'card',
      card,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isDraggingProp ? 0.5 : 1,
  };

  const labels = card.labels || [];
  const comments = card.comments || [];
  const checklists = card.checklists || [];

  const checklistStats = checklists.reduce((acc, cl) => {
    const items = cl.items || [];
    return {
      total: acc.total + items.length,
      completed: acc.completed + items.filter(i => i.isCompleted).length
    };
  }, { total: 0, completed: 0 });

  const getDueDateColor = () => {
    if (!card.dueDate) return '';
    const dueDate = new Date(card.dueDate);
    if (isPast(dueDate) && !isToday(dueDate)) return 'bg-red-500 text-white';
    if (isToday(dueDate)) return 'bg-yellow-500 text-white';
    return 'bg-gray-200 text-gray-700';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-white rounded-lg shadow-sm hover:shadow-md cursor-pointer transition-shadow p-2 ${
        isDragging || isDraggingProp ? 'shadow-lg ring-2 ring-trello-blue' : ''
      }`}
    >
      {card.coverColor && (
        <div 
          className="h-8 -mx-2 -mt-2 mb-2 rounded-t-lg"
          style={{ backgroundColor: card.coverColor }}
        />
      )}

      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {labels.slice(0, 4).map((label) => (
            <span
              key={label.id}
              className="h-2 w-10 rounded-full"
              style={{ backgroundColor: label.color }}
              title={label.name}
            />
          ))}
          {labels.length > 4 && (
            <span className="text-xs text-gray-500">+{labels.length - 4}</span>
          )}
        </div>
      )}

      <p className="text-sm text-gray-800 break-words">{card.title}</p>

      <div className="flex flex-wrap gap-2 mt-2">
        {card.dueDate && (
          <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${getDueDateColor()}`}>
            <Calendar className="h-3 w-3" />
            {format(new Date(card.dueDate), 'MMM d')}
          </span>
        )}

        {card.description && (
          <span className="text-xs text-gray-500" title="This card has a description">
            <Tag className="h-3 w-3" />
          </span>
        )}

        {checklistStats.total > 0 && (
          <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${
            checklistStats.completed === checklistStats.total 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-200 text-gray-700'
          }`}>
            <CheckSquare className="h-3 w-3" />
            {checklistStats.completed}/{checklistStats.total}
          </span>
        )}

        {comments.length > 0 && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {comments.length}
          </span>
        )}
      </div>

      {card.members && card.members.length > 0 && (
        <div className="flex -space-x-2 mt-2 justify-end">
          {card.members.slice(0, 3).map((member) => (
            <div
              key={member.id}
              className="w-6 h-6 rounded-full bg-trello-blue text-white text-xs flex items-center justify-center border-2 border-white"
              title={member.name}
            >
              {member.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {card.members.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-600 text-xs flex items-center justify-center border-2 border-white">
              +{card.members.length - 3}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Card;
