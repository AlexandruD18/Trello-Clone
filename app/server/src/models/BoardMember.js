const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BoardMember = sequelize.define('BoardMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  boardId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'board_id'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id'
  },
  role: {
    type: DataTypes.ENUM('admin', 'member', 'viewer'),
    defaultValue: 'member'
  }
}, {
  tableName: 'board_members',
  indexes: [
    {
      unique: true,
      fields: ['board_id', 'user_id']
    }
  ]
});

module.exports = BoardMember;
