const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CardLabel = sequelize.define('CardLabel', {
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
  labelId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'label_id'
  }
}, {
  tableName: 'card_labels',
  indexes: [
    {
      unique: true,
      fields: ['card_id', 'label_id']
    }
  ]
});

module.exports = CardLabel;
