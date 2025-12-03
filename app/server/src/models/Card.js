const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Card = sequelize.define('Card', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  listId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'list_id'
  },
  position: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'due_date'
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_archived'
  },
  coverColor: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'cover_color'
  }
}, {
  tableName: 'cards'
});

module.exports = Card;
