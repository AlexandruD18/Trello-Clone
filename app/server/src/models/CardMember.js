const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CardMember = sequelize.define('CardMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  cardId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'card_id'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id'
  }
}, {
  tableName: 'card_members',
  indexes: [
    {
      unique: true,
      fields: ['card_id', 'user_id']
    }
  ]
});

module.exports = CardMember;
