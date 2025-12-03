import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Plus, LayoutDashboard, Loader2, X } from 'lucide-react';

const BOARD_COLORS = [
  '#0079bf', '#d29034', '#519839', '#b04632',
  '#89609e', '#cd5a91', '#4bbf6b', '#00aecc'
];

function HomePage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [selectedColor, setSelectedColor] = useState(BOARD_COLORS[0]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [workspacesRes, boardsRes] = await Promise.all([
        api.get('/workspaces'),
        api.get('/boards')
      ]);
      setWorkspaces(workspacesRes.data);
      setBoards(boardsRes.data);
      if (workspacesRes.data.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(workspacesRes.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newBoardName.trim() || !selectedWorkspace) return;

    setCreating(true);
    try {
      const res = await api.post('/boards', {
        name: newBoardName,
        workspaceId: selectedWorkspace,
        backgroundColor: selectedColor
      });
      setBoards([res.data, ...boards]);
      setNewBoardName('');
      setShowCreateBoard(false);
    } catch (error) {
      console.error('Failed to create board:', error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-60px)]">
        <Loader2 className="h-8 w-8 animate-spin text-trello-blue" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Your Boards</h1>
        <button
          onClick={() => setShowCreateBoard(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Create Board
        </button>
      </div>

      {boards.length === 0 ? (
        <div className="text-center py-12">
          <LayoutDashboard className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No boards yet</h2>
          <p className="text-gray-500 mb-4">Create your first board to get started</p>
          <button
            onClick={() => setShowCreateBoard(true)}
            className="btn btn-primary"
          >
            Create Board
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {boards.map((board) => (
            <Link
              key={board.id}
              to={`/b/${board.id}`}
              className="block rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
              style={{ backgroundColor: board.backgroundColor || '#0079bf' }}
            >
              <div className="p-4 h-24 flex items-end">
                <h3 className="text-white font-bold text-lg truncate w-full">
                  {board.name}
                </h3>
              </div>
            </Link>
          ))}
          
          <button
            onClick={() => setShowCreateBoard(true)}
            className="flex items-center justify-center h-24 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 text-gray-500">
              <Plus className="h-5 w-5" />
              <span>Create new board</span>
            </div>
          </button>
        </div>
      )}

      {showCreateBoard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Create Board</h2>
              <button
                onClick={() => setShowCreateBoard(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBoard}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Board Name
                </label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  className="input"
                  placeholder="Enter board name"
                  autoFocus
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {BOARD_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`w-10 h-10 rounded ${
                        selectedColor === color ? 'ring-2 ring-offset-2 ring-trello-blue' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workspace
                </label>
                <select
                  value={selectedWorkspace || ''}
                  onChange={(e) => setSelectedWorkspace(e.target.value)}
                  className="input"
                  required
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateBoard(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newBoardName.trim()}
                  className="btn btn-primary flex-1"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
