const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Label = sequelize.define('Label', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  color: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: '#61bd4f'
  },
  boardId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'board_id'
  }
}, {
  tableName: 'labels'
});

module.exports = Label;
