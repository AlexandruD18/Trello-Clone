const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

const boardRooms = new Map();

const setupSocketHandlers = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.userId);

    socket.on('join-board', (boardId) => {
      socket.join(`board:${boardId}`);
      
      if (!boardRooms.has(boardId)) {
        boardRooms.set(boardId, new Set());
      }
      boardRooms.get(boardId).add(socket.userId);
      
      io.to(`board:${boardId}`).emit('user:joined', {
        boardId,
        userId: socket.userId,
        users: Array.from(boardRooms.get(boardId))
      });
      
      console.log(`User ${socket.userId} joined board ${boardId}`);
    });

    socket.on('leave-board', (boardId) => {
      socket.leave(`board:${boardId}`);
      
      if (boardRooms.has(boardId)) {
        boardRooms.get(boardId).delete(socket.userId);
        if (boardRooms.get(boardId).size === 0) {
          boardRooms.delete(boardId);
        }
      }
      
      io.to(`board:${boardId}`).emit('user:left', {
        boardId,
        userId: socket.userId
      });
      
      console.log(`User ${socket.userId} left board ${boardId}`);
    });

    socket.on('list:created', (data) => {
      socket.to(`board:${data.boardId}`).emit('list:created', data);
    });

    socket.on('list:updated', (data) => {
      socket.to(`board:${data.boardId}`).emit('list:updated', data);
    });

    socket.on('list:moved', (data) => {
      socket.to(`board:${data.boardId}`).emit('list:moved', data);
    });

    socket.on('list:deleted', (data) => {
      socket.to(`board:${data.boardId}`).emit('list:deleted', data);
    });

    socket.on('card:created', (data) => {
      socket.to(`board:${data.boardId}`).emit('card:created', data);
    });

    socket.on('card:updated', (data) => {
      socket.to(`board:${data.boardId}`).emit('card:updated', data);
    });

    socket.on('card:moved', (data) => {
      socket.to(`board:${data.boardId}`).emit('card:moved', data);
    });

    socket.on('card:deleted', (data) => {
      socket.to(`board:${data.boardId}`).emit('card:deleted', data);
    });

    socket.on('comment:created', (data) => {
      socket.to(`board:${data.boardId}`).emit('comment:created', data);
    });

    socket.on('comment:deleted', (data) => {
      socket.to(`board:${data.boardId}`).emit('comment:deleted', data);
    });

    socket.on('checklist:created', (data) => {
      socket.to(`board:${data.boardId}`).emit('checklist:created', data);
    });

    socket.on('checklist:updated', (data) => {
      socket.to(`board:${data.boardId}`).emit('checklist:updated', data);
    });

    socket.on('checklist:deleted', (data) => {
      socket.to(`board:${data.boardId}`).emit('checklist:deleted', data);
    });

    socket.on('checklistItem:created', (data) => {
      socket.to(`board:${data.boardId}`).emit('checklistItem:created', data);
    });

    socket.on('checklistItem:updated', (data) => {
      socket.to(`board:${data.boardId}`).emit('checklistItem:updated', data);
    });

    socket.on('checklistItem:deleted', (data) => {
      socket.to(`board:${data.boardId}`).emit('checklistItem:deleted', data);
    });

    socket.on('disconnect', () => {
      boardRooms.forEach((users, boardId) => {
        if (users.has(socket.userId)) {
          users.delete(socket.userId);
          io.to(`board:${boardId}`).emit('user:left', {
            boardId,
            userId: socket.userId
          });
        }
      });
      console.log('User disconnected:', socket.userId);
    });
  });

  return io;
};

module.exports = { setupSocketHandlers };
