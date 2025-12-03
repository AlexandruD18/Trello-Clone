const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WorkspaceMember = sequelize.define('WorkspaceMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  workspaceId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'workspace_id'
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
  tableName: 'workspace_members',
  indexes: [
    {
      unique: true,
      fields: ['workspace_id', 'user_id']
    }
  ]
});

module.exports = WorkspaceMember;
