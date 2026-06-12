const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GroupCallParticipant = sequelize.define('GroupCallParticipant', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  groupCallId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  joinedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  leftAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'group_call_participants',
});

module.exports = GroupCallParticipant;
