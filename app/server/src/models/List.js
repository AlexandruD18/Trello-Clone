const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const List = sequelize.define('List', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  boardId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'board_id'
  },
  position: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_archived'
  }
}, {
  tableName: 'lists'
});

module.exports = List;
