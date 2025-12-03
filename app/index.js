require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'trello-clone-secret-key-2024';

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const users = new Map();
const workspaces = new Map();
const boards = new Map();
const lists = new Map();
const cards = new Map();
const labels = new Map();
const checklists = new Map();
const checklistItems = new Map();
const comments = new Map();
const cardLabels = new Map();
const cardMembers = new Map();
const workspaceMembers = new Map();
const boardMembers = new Map();

const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.get(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password and name are required' });
    }
    
    for (const user of users.values()) {
      if (user.email === email) {
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      name,
      createdAt: new Date().toISOString()
    };
    users.set(user.id, user);

    const workspace = {
      id: uuidv4(),
      name: `${name}'s Workspace`,
      description: 'My personal workspace',
      ownerId: user.id,
      createdAt: new Date().toISOString()
    };
    workspaces.set(workspace.id, workspace);

    workspaceMembers.set(`${workspace.id}_${user.id}`, {
      workspaceId: workspace.id,
      userId: user.id,
      role: 'admin'
    });

    const token = generateToken(user.id);
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({ user: userWithoutPassword, token, workspace });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let foundUser = null;
    for (const user of users.values()) {
      if (user.email === email) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, foundUser.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(foundUser.id);
    const { password: _, ...userWithoutPassword } = foundUser;

    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const { password: _, ...userWithoutPassword } = req.user;
  res.json({ user: userWithoutPassword });
});

app.get('/api/workspaces', authenticate, (req, res) => {
  const userWorkspaces = [];
  for (const ws of workspaces.values()) {
    const membership = workspaceMembers.get(`${ws.id}_${req.userId}`);
    if (membership || ws.ownerId === req.userId) {
      const wsBoards = [];
      for (const board of boards.values()) {
        if (board.workspaceId === ws.id && !board.isArchived) {
          wsBoards.push(board);
        }
      }
      userWorkspaces.push({ ...ws, boards: wsBoards });
    }
  }
  res.json(userWorkspaces);
});

app.post('/api/workspaces', authenticate, (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const workspace = {
    id: uuidv4(),
    name,
    description,
    ownerId: req.userId,
    createdAt: new Date().toISOString()
  };
  workspaces.set(workspace.id, workspace);

  workspaceMembers.set(`${workspace.id}_${req.userId}`, {
    workspaceId: workspace.id,
    userId: req.userId,
    role: 'admin'
  });

  res.status(201).json(workspace);
});

app.get('/api/boards', authenticate, (req, res) => {
  const { workspaceId } = req.query;
  const userBoards = [];
  
  for (const board of boards.values()) {
    if (board.isArchived) continue;
    if (workspaceId && board.workspaceId !== workspaceId) continue;
    
    const ws = workspaces.get(board.workspaceId);
    const isMember = workspaceMembers.get(`${board.workspaceId}_${req.userId}`) || 
                     boardMembers.get(`${board.id}_${req.userId}`) ||
                     (ws && ws.ownerId === req.userId);
    
    if (isMember) {
      userBoards.push(board);
    }
  }
  
  res.json(userBoards.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.get('/api/boards/:id', authenticate, (req, res) => {
  const board = boards.get(req.params.id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const boardLists = [];
  for (const list of lists.values()) {
    if (list.boardId === board.id && !list.isArchived) {
      const listCards = [];
      for (const card of cards.values()) {
        if (card.listId === list.id && !card.isArchived) {
          const cardLabelsList = [];
          for (const [key, cl] of cardLabels.entries()) {
            if (cl.cardId === card.id) {
              const label = labels.get(cl.labelId);
              if (label) cardLabelsList.push(label);
            }
          }
          
          const cardMembersList = [];
          for (const [key, cm] of cardMembers.entries()) {
            if (cm.cardId === card.id) {
              const member = users.get(cm.userId);
              if (member) {
                const { password: _, ...memberWithoutPassword } = member;
                cardMembersList.push(memberWithoutPassword);
              }
            }
          }

          const cardChecklists = [];
          for (const checklist of checklists.values()) {
            if (checklist.cardId === card.id) {
              const items = [];
              for (const item of checklistItems.values()) {
                if (item.checklistId === checklist.id) {
                  items.push(item);
                }
              }
              items.sort((a, b) => a.position - b.position);
              cardChecklists.push({ ...checklist, items });
            }
          }
          cardChecklists.sort((a, b) => a.position - b.position);

          const cardComments = [];
          for (const comment of comments.values()) {
            if (comment.cardId === card.id) {
              const author = users.get(comment.authorId);
              const { password: _, ...authorWithoutPassword } = author || {};
              cardComments.push({ ...comment, author: authorWithoutPassword });
            }
          }
          cardComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

          listCards.push({
            ...card,
            labels: cardLabelsList,
            members: cardMembersList,
            checklists: cardChecklists,
            comments: cardComments
          });
        }
      }
      listCards.sort((a, b) => a.position - b.position);
      boardLists.push({ ...list, cards: listCards });
    }
  }
  boardLists.sort((a, b) => a.position - b.position);

  const boardLabels = [];
  for (const label of labels.values()) {
    if (label.boardId === board.id) {
      boardLabels.push(label);
    }
  }

  const boardMembersList = [];
  for (const [key, bm] of boardMembers.entries()) {
    if (bm.boardId === board.id) {
      const member = users.get(bm.userId);
      if (member) {
        const { password: _, ...memberWithoutPassword } = member;
        boardMembersList.push({ ...memberWithoutPassword, role: bm.role });
      }
    }
  }

  res.json({
    ...board,
    lists: boardLists,
    labels: boardLabels,
    members: boardMembersList
  });
});

app.post('/api/boards', authenticate, (req, res) => {
  const { name, description, workspaceId, backgroundColor } = req.body;
  if (!name || !workspaceId) {
    return res.status(400).json({ error: 'Name and workspaceId are required' });
  }

  const board = {
    id: uuidv4(),
    name,
    description,
    workspaceId,
    backgroundColor: backgroundColor || '#0079bf',
    isArchived: false,
    createdAt: new Date().toISOString()
  };
  boards.set(board.id, board);

  boardMembers.set(`${board.id}_${req.userId}`, {
    boardId: board.id,
    userId: req.userId,
    role: 'admin'
  });

  const defaultColors = ['#61bd4f', '#f2d600', '#ff9f1a', '#eb5a46', '#c377e0', '#0079bf'];
  defaultColors.forEach(color => {
    const label = {
      id: uuidv4(),
      name: '',
      color,
      boardId: board.id
    };
    labels.set(label.id, label);
  });

  const boardLabels = [];
  for (const label of labels.values()) {
    if (label.boardId === board.id) {
      boardLabels.push(label);
    }
  }

  res.status(201).json({ ...board, lists: [], labels: boardLabels, members: [] });
});

app.put('/api/boards/:id', authenticate, (req, res) => {
  const board = boards.get(req.params.id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const { name, description, backgroundColor } = req.body;
  if (name !== undefined) board.name = name;
  if (description !== undefined) board.description = description;
  if (backgroundColor !== undefined) board.backgroundColor = backgroundColor;

  boards.set(board.id, board);
  res.json(board);
});

app.delete('/api/boards/:id', authenticate, (req, res) => {
  const board = boards.get(req.params.id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }
  board.isArchived = true;
  boards.set(board.id, board);
  res.json({ message: 'Board archived' });
});

app.post('/api/lists', authenticate, (req, res) => {
  const { name, boardId } = req.body;
  if (!name || !boardId) {
    return res.status(400).json({ error: 'Name and boardId are required' });
  }

  let maxPosition = 0;
  for (const list of lists.values()) {
    if (list.boardId === boardId && !list.isArchived && list.position > maxPosition) {
      maxPosition = list.position;
    }
  }

  const list = {
    id: uuidv4(),
    name,
    boardId,
    position: maxPosition + 65536,
    isArchived: false,
    createdAt: new Date().toISOString()
  };
  lists.set(list.id, list);

  res.status(201).json({ ...list, cards: [] });
});

app.put('/api/lists/:id', authenticate, (req, res) => {
  const list = lists.get(req.params.id);
  if (!list) {
    return res.status(404).json({ error: 'List not found' });
  }

  const { name } = req.body;
  if (name !== undefined) list.name = name;
  lists.set(list.id, list);
  res.json(list);
});

app.put('/api/lists/:id/move', authenticate, (req, res) => {
  const list = lists.get(req.params.id);
  if (!list) {
    return res.status(404).json({ error: 'List not found' });
  }

  const { position } = req.body;
  if (position !== undefined) list.position = position;
  lists.set(list.id, list);
  res.json(list);
});

app.delete('/api/lists/:id', authenticate, (req, res) => {
  const list = lists.get(req.params.id);
  if (!list) {
    return res.status(404).json({ error: 'List not found' });
  }
  list.isArchived = true;
  lists.set(list.id, list);
  res.json({ message: 'List archived' });
});

app.get('/api/cards/:id', authenticate, (req, res) => {
  const card = cards.get(req.params.id);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }

  const list = lists.get(card.listId);
  
  const cardLabelsList = [];
  for (const [key, cl] of cardLabels.entries()) {
    if (cl.cardId === card.id) {
      const label = labels.get(cl.labelId);
      if (label) cardLabelsList.push(label);
    }
  }

  const cardMembersList = [];
  for (const [key, cm] of cardMembers.entries()) {
    if (cm.cardId === card.id) {
      const member = users.get(cm.userId);
      if (member) {
        const { password: _, ...memberWithoutPassword } = member;
        cardMembersList.push(memberWithoutPassword);
      }
    }
  }

  const cardChecklists = [];
  for (const checklist of checklists.values()) {
    if (checklist.cardId === card.id) {
      const items = [];
      for (const item of checklistItems.values()) {
        if (item.checklistId === checklist.id) {
          items.push(item);
        }
      }
      items.sort((a, b) => a.position - b.position);
      cardChecklists.push({ ...checklist, items });
    }
  }
  cardChecklists.sort((a, b) => a.position - b.position);

  const cardComments = [];
  for (const comment of comments.values()) {
    if (comment.cardId === card.id) {
      const author = users.get(comment.authorId);
      const { password: _, ...authorWithoutPassword } = author || {};
      cardComments.push({ ...comment, author: authorWithoutPassword });
    }
  }
  cardComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    ...card,
    list,
    labels: cardLabelsList,
    members: cardMembersList,
    checklists: cardChecklists,
    comments: cardComments
  });
});

app.post('/api/cards', authenticate, (req, res) => {
  const { title, listId, description } = req.body;
  if (!title || !listId) {
    return res.status(400).json({ error: 'Title and listId are required' });
  }

  let maxPosition = 0;
  for (const card of cards.values()) {
    if (card.listId === listId && !card.isArchived && card.position > maxPosition) {
      maxPosition = card.position;
    }
  }

  const card = {
    id: uuidv4(),
    title,
    description,
    listId,
    position: maxPosition + 65536,
    isArchived: false,
    createdAt: new Date().toISOString()
  };
  cards.set(card.id, card);

  res.status(201).json({ ...card, labels: [], members: [], checklists: [], comments: [] });
});

app.put('/api/cards/:id', authenticate, (req, res) => {
  const card = cards.get(req.params.id);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }

  const { title, description, dueDate, coverColor } = req.body;
  if (title !== undefined) card.title = title;
  if (description !== undefined) card.description = description;
  if (dueDate !== undefined) card.dueDate = dueDate;
  if (coverColor !== undefined) card.coverColor = coverColor;

  cards.set(card.id, card);

  const cardLabelsList = [];
  for (const [key, cl] of cardLabels.entries()) {
    if (cl.cardId === card.id) {
      const label = labels.get(cl.labelId);
      if (label) cardLabelsList.push(label);
    }
  }

  const cardMembersList = [];
  for (const [key, cm] of cardMembers.entries()) {
    if (cm.cardId === card.id) {
      const member = users.get(cm.userId);
      if (member) {
        const { password: _, ...memberWithoutPassword } = member;
        cardMembersList.push(memberWithoutPassword);
      }
    }
  }

  const cardChecklists = [];
  for (const checklist of checklists.values()) {
    if (checklist.cardId === card.id) {
      const items = [];
      for (const item of checklistItems.values()) {
        if (item.checklistId === checklist.id) {
          items.push(item);
        }
      }
      items.sort((a, b) => a.position - b.position);
      cardChecklists.push({ ...checklist, items });
    }
  }

  const cardComments = [];
  for (const comment of comments.values()) {
    if (comment.cardId === card.id) {
      cardComments.push(comment);
    }
  }

  res.json({
    ...card,
    labels: cardLabelsList,
    members: cardMembersList,
    checklists: cardChecklists,
    comments: cardComments
  });
});

app.put('/api/cards/:id/move', authenticate, (req, res) => {
  const card = cards.get(req.params.id);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }

  const { listId, position } = req.body;
  if (listId !== undefined) card.listId = listId;
  if (position !== undefined) card.position = position;

  cards.set(card.id, card);
  res.json(card);
});

app.delete('/api/cards/:id', authenticate, (req, res) => {
  const card = cards.get(req.params.id);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }
  card.isArchived = true;
  cards.set(card.id, card);
  res.json({ message: 'Card archived' });
});

app.post('/api/cards/:id/labels', authenticate, (req, res) => {
  const { labelId } = req.body;
  const key = `${req.params.id}_${labelId}`;
  cardLabels.set(key, { cardId: req.params.id, labelId });
  
  const card = cards.get(req.params.id);
  const cardLabelsList = [];
  for (const [k, cl] of cardLabels.entries()) {
    if (cl.cardId === req.params.id) {
      const label = labels.get(cl.labelId);
      if (label) cardLabelsList.push(label);
    }
  }
  
  res.json({ ...card, labels: cardLabelsList });
});

app.delete('/api/cards/:id/labels/:labelId', authenticate, (req, res) => {
  const key = `${req.params.id}_${req.params.labelId}`;
  cardLabels.delete(key);
  
  const card = cards.get(req.params.id);
  const cardLabelsList = [];
  for (const [k, cl] of cardLabels.entries()) {
    if (cl.cardId === req.params.id) {
      const label = labels.get(cl.labelId);
      if (label) cardLabelsList.push(label);
    }
  }
  
  res.json({ ...card, labels: cardLabelsList });
});

app.post('/api/checklists', authenticate, (req, res) => {
  const { title, cardId } = req.body;
  if (!title || !cardId) {
    return res.status(400).json({ error: 'Title and cardId are required' });
  }

  let maxPosition = 0;
  for (const checklist of checklists.values()) {
    if (checklist.cardId === cardId && checklist.position > maxPosition) {
      maxPosition = checklist.position;
    }
  }

  const checklist = {
    id: uuidv4(),
    title,
    cardId,
    position: maxPosition + 65536,
    createdAt: new Date().toISOString()
  };
  checklists.set(checklist.id, checklist);

  res.status(201).json({ ...checklist, items: [] });
});

app.put('/api/checklists/:id', authenticate, (req, res) => {
  const checklist = checklists.get(req.params.id);
  if (!checklist) {
    return res.status(404).json({ error: 'Checklist not found' });
  }

  const { title } = req.body;
  if (title !== undefined) checklist.title = title;
  checklists.set(checklist.id, checklist);
  res.json(checklist);
});

app.delete('/api/checklists/:id', authenticate, (req, res) => {
  const checklist = checklists.get(req.params.id);
  if (!checklist) {
    return res.status(404).json({ error: 'Checklist not found' });
  }

  for (const [key, item] of checklistItems.entries()) {
    if (item.checklistId === checklist.id) {
      checklistItems.delete(key);
    }
  }
  checklists.delete(checklist.id);
  res.json({ message: 'Checklist deleted' });
});

app.post('/api/checklists/items', authenticate, (req, res) => {
  const { title, checklistId } = req.body;
  if (!title || !checklistId) {
    return res.status(400).json({ error: 'Title and checklistId are required' });
  }

  let maxPosition = 0;
  for (const item of checklistItems.values()) {
    if (item.checklistId === checklistId && item.position > maxPosition) {
      maxPosition = item.position;
    }
  }

  const item = {
    id: uuidv4(),
    title,
    checklistId,
    isCompleted: false,
    position: maxPosition + 65536,
    createdAt: new Date().toISOString()
  };
  checklistItems.set(item.id, item);

  res.status(201).json(item);
});

app.put('/api/checklists/items/:id', authenticate, (req, res) => {
  const item = checklistItems.get(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Checklist item not found' });
  }

  const { title, isCompleted } = req.body;
  if (title !== undefined) item.title = title;
  if (isCompleted !== undefined) item.isCompleted = isCompleted;
  checklistItems.set(item.id, item);
  res.json(item);
});

app.delete('/api/checklists/items/:id', authenticate, (req, res) => {
  const item = checklistItems.get(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Checklist item not found' });
  }
  checklistItems.delete(item.id);
  res.json({ message: 'Checklist item deleted' });
});

app.get('/api/comments', authenticate, (req, res) => {
  const { cardId } = req.query;
  const cardComments = [];
  
  for (const comment of comments.values()) {
    if (comment.cardId === cardId) {
      const author = users.get(comment.authorId);
      const { password: _, ...authorWithoutPassword } = author || {};
      cardComments.push({ ...comment, author: authorWithoutPassword });
    }
  }
  
  cardComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(cardComments);
});

app.post('/api/comments', authenticate, (req, res) => {
  const { text, cardId } = req.body;
  if (!text || !cardId) {
    return res.status(400).json({ error: 'Text and cardId are required' });
  }

  const comment = {
    id: uuidv4(),
    text,
    cardId,
    authorId: req.userId,
    createdAt: new Date().toISOString()
  };
  comments.set(comment.id, comment);

  const author = users.get(req.userId);
  const { password: _, ...authorWithoutPassword } = author;

  res.status(201).json({ ...comment, author: authorWithoutPassword });
});

app.put('/api/comments/:id', authenticate, (req, res) => {
  const comment = comments.get(req.params.id);
  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }
  if (comment.authorId !== req.userId) {
    return res.status(403).json({ error: 'Not authorized to edit this comment' });
  }

  const { text } = req.body;
  if (text !== undefined) comment.text = text;
  comments.set(comment.id, comment);

  const author = users.get(comment.authorId);
  const { password: _, ...authorWithoutPassword } = author;

  res.json({ ...comment, author: authorWithoutPassword });
});

app.delete('/api/comments/:id', authenticate, (req, res) => {
  const comment = comments.get(req.params.id);
  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }
  if (comment.authorId !== req.userId) {
    return res.status(403).json({ error: 'Not authorized to delete this comment' });
  }
  comments.delete(comment.id);
  res.json({ message: 'Comment deleted' });
});

app.get('/api/labels', authenticate, (req, res) => {
  const { boardId } = req.query;
  const boardLabels = [];
  for (const label of labels.values()) {
    if (label.boardId === boardId) {
      boardLabels.push(label);
    }
  }
  res.json(boardLabels);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, 'client/dist')));

app.get(/^(?!\/api).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
});

const boardRooms = new Map();

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
  });

  socket.on('leave-board', (boardId) => {
    socket.leave(`board:${boardId}`);
    if (boardRooms.has(boardId)) {
      boardRooms.get(boardId).delete(socket.userId);
      if (boardRooms.get(boardId).size === 0) {
        boardRooms.delete(boardId);
      }
    }
    io.to(`board:${boardId}`).emit('user:left', { boardId, userId: socket.userId });
  });

  const forwardEvents = [
    'list:created', 'list:updated', 'list:moved', 'list:deleted',
    'card:created', 'card:updated', 'card:moved', 'card:deleted',
    'comment:created', 'comment:deleted',
    'checklist:created', 'checklist:updated', 'checklist:deleted',
    'checklistItem:created', 'checklistItem:updated', 'checklistItem:deleted'
  ];

  forwardEvents.forEach(event => {
    socket.on(event, (data) => {
      socket.to(`board:${data.boardId}`).emit(event, data);
    });
  });

  socket.on('disconnect', () => {
    boardRooms.forEach((users, boardId) => {
      if (users.has(socket.userId)) {
        users.delete(socket.userId);
        io.to(`board:${boardId}`).emit('user:left', { boardId, userId: socket.userId });
      }
    });
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO running on port ${PORT}`);
});
