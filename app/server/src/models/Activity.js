const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Activity = sequelize.define('Activity', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id'
  },
  entityType: {
    type: DataTypes.ENUM('board', 'list', 'card', 'comment', 'checklist'),
    allowNull: false,
    field: 'entity_type'
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'entity_id'
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  boardId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'board_id'
  }
}, {
  tableName: 'activities'
});

module.exports = Activity;
