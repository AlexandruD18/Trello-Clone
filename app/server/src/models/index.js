const sequelize = require('../config/database');
const User = require('./User');
const Workspace = require('./Workspace');
const WorkspaceMember = require('./WorkspaceMember');
const Board = require('./Board');
const BoardMember = require('./BoardMember');
const List = require('./List');
const Card = require('./Card');
const CardMember = require('./CardMember');
const Label = require('./Label');
const CardLabel = require('./CardLabel');
const Checklist = require('./Checklist');
const ChecklistItem = require('./ChecklistItem');
const Comment = require('./Comment');
const Activity = require('./Activity');

User.hasMany(Workspace, { foreignKey: 'ownerId', as: 'ownedWorkspaces' });
Workspace.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

Workspace.belongsToMany(User, { through: WorkspaceMember, foreignKey: 'workspaceId', as: 'members' });
User.belongsToMany(Workspace, { through: WorkspaceMember, foreignKey: 'userId', as: 'workspaces' });

Workspace.hasMany(Board, { foreignKey: 'workspaceId', as: 'boards' });
Board.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' });

Board.belongsToMany(User, { through: BoardMember, foreignKey: 'boardId', as: 'members' });
User.belongsToMany(Board, { through: BoardMember, foreignKey: 'userId', as: 'boards' });

Board.hasMany(List, { foreignKey: 'boardId', as: 'lists' });
List.belongsTo(Board, { foreignKey: 'boardId', as: 'board' });

List.hasMany(Card, { foreignKey: 'listId', as: 'cards' });
Card.belongsTo(List, { foreignKey: 'listId', as: 'list' });

Card.belongsToMany(User, { through: CardMember, foreignKey: 'cardId', as: 'members' });
User.belongsToMany(Card, { through: CardMember, foreignKey: 'userId', as: 'cards' });

Board.hasMany(Label, { foreignKey: 'boardId', as: 'labels' });
Label.belongsTo(Board, { foreignKey: 'boardId', as: 'board' });

Card.belongsToMany(Label, { through: CardLabel, foreignKey: 'cardId', as: 'labels' });
Label.belongsToMany(Card, { through: CardLabel, foreignKey: 'labelId', as: 'cards' });

Card.hasMany(Checklist, { foreignKey: 'cardId', as: 'checklists' });
Checklist.belongsTo(Card, { foreignKey: 'cardId', as: 'card' });

Checklist.hasMany(ChecklistItem, { foreignKey: 'checklistId', as: 'items' });
ChecklistItem.belongsTo(Checklist, { foreignKey: 'checklistId', as: 'checklist' });

Card.hasMany(Comment, { foreignKey: 'cardId', as: 'comments' });
Comment.belongsTo(Card, { foreignKey: 'cardId', as: 'card' });

User.hasMany(Comment, { foreignKey: 'authorId', as: 'comments' });
Comment.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

User.hasMany(Activity, { foreignKey: 'userId', as: 'activities' });
Activity.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Board.hasMany(Activity, { foreignKey: 'boardId', as: 'activities' });
Activity.belongsTo(Board, { foreignKey: 'boardId', as: 'board' });

module.exports = {
  sequelize,
  User,
  Workspace,
  WorkspaceMember,
  Board,
  BoardMember,
  List,
  Card,
  CardMember,
  Label,
  CardLabel,
  Checklist,
  ChecklistItem,
  Comment,
  Activity
};
