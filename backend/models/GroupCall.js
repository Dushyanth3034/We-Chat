const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GroupCall = sequelize.define('GroupCall', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  callType: {
    type: DataTypes.STRING, // 'audio', 'video'
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING, // 'active', 'completed'
    allowNull: false,
    defaultValue: 'active',
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'group_calls',
});

module.exports = GroupCall;
