import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  X, Tag, Users, Calendar, CheckSquare, MessageSquare,
  Trash2, Clock, Plus, Check, AlignLeft
} from 'lucide-react';
import { format } from 'date-fns';

function CardModal({ card, boardId, labels, members, onClose, onUpdate, onDelete }) {
  const { user } = useAuth();
  const [cardData, setCardData] = useState(null);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showLabels, setShowLabels] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showDueDate, setShowDueDate] = useState(false);
  const [dueDate, setDueDate] = useState(card.dueDate ? format(new Date(card.dueDate), 'yyyy-MM-dd') : '');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [showAddChecklist, setShowAddChecklist] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCardDetails();
  }, [card.id]);

  const loadCardDetails = async () => {
    try {
      const res = await api.get(`/cards/${card.id}`);
      setCardData(res.data);
      setTitle(res.data.title);
      setDescription(res.data.description || '');
      if (res.data.dueDate) {
        setDueDate(format(new Date(res.data.dueDate), 'yyyy-MM-dd'));
      }
    } catch (error) {
      console.error('Failed to load card details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTitle = async () => {
    if (title.trim() && title !== cardData.title) {
      try {
        const res = await api.put(`/cards/${card.id}`, { title: title.trim() });
        setCardData(res.data);
        onUpdate(res.data);
      } catch (error) {
        console.error('Failed to update title:', error);
      }
    }
    setIsEditingTitle(false);
  };

  const handleUpdateDescription = async () => {
    try {
      const res = await api.put(`/cards/${card.id}`, { description });
      setCardData(res.data);
      onUpdate(res.data);
    } catch (error) {
      console.error('Failed to update description:', error);
    }
    setIsEditingDescription(false);
  };

  const handleUpdateDueDate = async () => {
    try {
      const res = await api.put(`/cards/${card.id}`, { 
        dueDate: dueDate ? new Date(dueDate).toISOString() : null 
      });
      setCardData(res.data);
      onUpdate(res.data);
      setShowDueDate(false);
    } catch (error) {
      console.error('Failed to update due date:', error);
    }
  };

  const handleToggleLabel = async (labelId) => {
    try {
      const hasLabel = (cardData.labels || []).some(l => l.id === labelId);
      if (hasLabel) {
        await api.delete(`/cards/${card.id}/labels/${labelId}`);
      } else {
        await api.post(`/cards/${card.id}/labels`, { labelId });
      }
      await loadCardDetails();
    } catch (error) {
      console.error('Failed to toggle label:', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await api.post('/comments', { text: newComment, cardId: card.id });
      setNewComment('');
      await loadCardDetails();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/comments/${commentId}`);
      await loadCardDetails();
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleAddChecklist = async (e) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;

    try {
      await api.post('/checklists', { title: newChecklistTitle, cardId: card.id });
      setNewChecklistTitle('');
      setShowAddChecklist(false);
      await loadCardDetails();
    } catch (error) {
      console.error('Failed to add checklist:', error);
    }
  };

  const handleDeleteChecklist = async (checklistId) => {
    try {
      await api.delete(`/checklists/${checklistId}`);
      await loadCardDetails();
    } catch (error) {
      console.error('Failed to delete checklist:', error);
    }
  };

  const handleAddChecklistItem = async (checklistId, title) => {
    try {
      await api.post('/checklists/items', { title, checklistId });
      await loadCardDetails();
    } catch (error) {
      console.error('Failed to add checklist item:', error);
    }
  };

  const handleToggleChecklistItem = async (itemId, isCompleted) => {
    try {
      await api.put(`/checklists/items/${itemId}`, { isCompleted: !isCompleted });
      await loadCardDetails();
    } catch (error) {
      console.error('Failed to toggle checklist item:', error);
    }
  };

  const handleDeleteChecklistItem = async (itemId) => {
    try {
      await api.delete(`/checklists/items/${itemId}`);
      await loadCardDetails();
    } catch (error) {
      console.error('Failed to delete checklist item:', error);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-trello-blue"></div>
        </div>
      </div>
    );
  }

  const cardLabels = cardData?.labels || [];
  const cardComments = cardData?.comments || [];
  const cardChecklists = cardData?.checklists || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8">
      <div className="bg-gray-100 rounded-lg w-full max-w-3xl mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-200 rounded z-10"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>

        {cardData?.coverColor && (
          <div 
            className="h-24 rounded-t-lg"
            style={{ backgroundColor: cardData.coverColor }}
          />
        )}

        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <Tag className="h-6 w-6 text-gray-500 mt-1" />
            <div className="flex-1">
              {isEditingTitle ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleUpdateTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateTitle();
                    if (e.key === 'Escape') {
                      setTitle(cardData.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  className="w-full text-xl font-bold px-2 py-1 border-2 border-trello-blue rounded"
                  autoFocus
                />
              ) : (
                <h2
                  onClick={() => setIsEditingTitle(true)}
                  className="text-xl font-bold text-gray-800 cursor-pointer hover:bg-gray-200 px-2 py-1 rounded -mx-2"
                >
                  {cardData?.title}
                </h2>
              )}
              <p className="text-sm text-gray-500 mt-1">
                in list <span className="underline">{cardData?.list?.name}</span>
              </p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex-1">
              {cardLabels.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2">Labels</h3>
                  <div className="flex flex-wrap gap-1">
                    {cardLabels.map((label) => (
                      <span
                        key={label.id}
                        className="px-3 py-1 rounded text-white text-sm font-medium"
                        style={{ backgroundColor: label.color }}
                      >
                        {label.name || ' '}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {cardData?.dueDate && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2">Due Date</h3>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 rounded text-sm">
                    <Clock className="h-4 w-4" />
                    {format(new Date(cardData.dueDate), 'MMM d, yyyy')}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlignLeft className="h-5 w-5 text-gray-500" />
                  <h3 className="font-semibold text-gray-800">Description</h3>
                </div>
                {isEditingDescription ? (
                  <div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-trello-blue"
                      rows={4}
                      placeholder="Add a more detailed description..."
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={handleUpdateDescription} className="btn btn-primary text-sm">
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setDescription(cardData.description || '');
                          setIsEditingDescription(false);
                        }}
                        className="btn btn-secondary text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingDescription(true)}
                    className="bg-gray-200 hover:bg-gray-300 p-3 rounded-lg cursor-pointer min-h-[60px]"
                  >
                    {description || 'Add a more detailed description...'}
                  </div>
                )}
              </div>

              {cardChecklists.map((checklist) => (
                <ChecklistSection
                  key={checklist.id}
                  checklist={checklist}
                  onDelete={() => handleDeleteChecklist(checklist.id)}
                  onAddItem={(title) => handleAddChecklistItem(checklist.id, title)}
                  onToggleItem={handleToggleChecklistItem}
                  onDeleteItem={handleDeleteChecklistItem}
                />
              ))}

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="h-5 w-5 text-gray-500" />
                  <h3 className="font-semibold text-gray-800">Comments</h3>
                </div>
                <form onSubmit={handleAddComment} className="mb-4">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-trello-blue"
                    rows={2}
                    placeholder="Write a comment..."
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="btn btn-primary text-sm mt-2"
                  >
                    Save
                  </button>
                </form>

                <div className="space-y-4">
                  {cardComments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-trello-blue text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                        {comment.author?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{comment.author?.name}</span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1 bg-white p-2 rounded">
                          {comment.text}
                        </p>
                        {comment.author?.id === user?.id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-xs text-gray-500 hover:text-red-500 mt-1"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-48 flex-shrink-0">
              <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2">Add to card</h3>
              <div className="space-y-2">
                <div className="relative">
                  <button
                    onClick={() => setShowLabels(!showLabels)}
                    className="w-full btn btn-secondary text-sm flex items-center gap-2 justify-start"
                  >
                    <Tag className="h-4 w-4" />
                    Labels
                  </button>
                  {showLabels && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg p-3 w-64 z-10">
                      <h4 className="font-semibold text-sm mb-2">Labels</h4>
                      <div className="space-y-1">
                        {labels.map((label) => (
                          <button
                            key={label.id}
                            onClick={() => handleToggleLabel(label.id)}
                            className="w-full flex items-center gap-2 p-2 rounded hover:bg-gray-100"
                          >
                            <span
                              className="flex-1 h-6 rounded"
                              style={{ backgroundColor: label.color }}
                            />
                            {cardLabels.some(l => l.id === label.id) && (
                              <Check className="h-4 w-4 text-gray-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowDueDate(!showDueDate)}
                    className="w-full btn btn-secondary text-sm flex items-center gap-2 justify-start"
                  >
                    <Calendar className="h-4 w-4" />
                    Due Date
                  </button>
                  {showDueDate && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg p-3 w-64 z-10">
                      <h4 className="font-semibold text-sm mb-2">Due Date</h4>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="input mb-2"
                      />
                      <div className="flex gap-2">
                        <button onClick={handleUpdateDueDate} className="btn btn-primary text-sm flex-1">
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setDueDate('');
                            handleUpdateDueDate();
                          }}
                          className="btn btn-secondary text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowAddChecklist(!showAddChecklist)}
                    className="w-full btn btn-secondary text-sm flex items-center gap-2 justify-start"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Checklist
                  </button>
                  {showAddChecklist && (
                    <form
                      onSubmit={handleAddChecklist}
                      className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg p-3 w-64 z-10"
                    >
                      <h4 className="font-semibold text-sm mb-2">Add Checklist</h4>
                      <input
                        type="text"
                        value={newChecklistTitle}
                        onChange={(e) => setNewChecklistTitle(e.target.value)}
                        className="input mb-2"
                        placeholder="Checklist title"
                        autoFocus
                      />
                      <button type="submit" className="btn btn-primary text-sm w-full">
                        Add
                      </button>
                    </form>
                  )}
                </div>
              </div>

              <h3 className="text-xs font-semibold text-gray-600 uppercase mt-6 mb-2">Actions</h3>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this card?')) {
                    onDelete(card.id);
                  }
                }}
                className="w-full btn btn-danger text-sm flex items-center gap-2 justify-start"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChecklistSection({ checklist, onDelete, onAddItem, onToggleItem, onDeleteItem }) {
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');

  const items = checklist.items || [];
  const completed = items.filter(i => i.isCompleted).length;
  const progress = items.length > 0 ? (completed / items.length) * 100 : 0;

  const handleAddItem = (e) => {
    e.preventDefault();
    if (newItemTitle.trim()) {
      onAddItem(newItemTitle.trim());
      setNewItemTitle('');
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <CheckSquare className="h-5 w-5 text-gray-500" />
        <h3 className="font-semibold text-gray-800 flex-1">{checklist.title}</h3>
        <button
          onClick={onDelete}
          className="text-xs text-gray-500 hover:text-red-500"
        >
          Delete
        </button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500 w-8">{Math.round(progress)}%</span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${progress === 100 ? 'bg-green-500' : 'bg-trello-blue'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-1 ml-6">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={item.isCompleted}
              onChange={() => onToggleItem(item.id, item.isCompleted)}
              className="h-4 w-4 rounded border-gray-300 text-trello-blue focus:ring-trello-blue"
            />
            <span className={`flex-1 text-sm ${item.isCompleted ? 'line-through text-gray-400' : ''}`}>
              {item.title}
            </span>
            <button
              onClick={() => onDeleteItem(item.id)}
              className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="ml-6 mt-2">
        {showAddItem ? (
          <form onSubmit={handleAddItem}>
            <input
              type="text"
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              className="input text-sm mb-2"
              placeholder="Add an item"
              autoFocus
            />
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary text-sm">
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddItem(false);
                  setNewItemTitle('');
                }}
                className="btn btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddItem(true)}
            className="text-sm text-gray-600 hover:bg-gray-200 px-2 py-1 rounded"
          >
            Add an item
          </button>
        )}
      </div>
    </div>
  );
}

export default CardModal;
