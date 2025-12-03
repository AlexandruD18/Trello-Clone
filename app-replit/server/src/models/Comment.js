const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  cardId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'card_id'
  },
  authorId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'author_id'
  }
}, {
  tableName: 'comments'
});

module.exports = Comment;
