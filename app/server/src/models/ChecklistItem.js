const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChecklistItem = sequelize.define('ChecklistItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  checklistId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'checklist_id'
  },
  isCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_completed'
  },
  position: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'checklist_items'
});

module.exports = ChecklistItem;
