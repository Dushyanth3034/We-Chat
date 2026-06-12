const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Call = sequelize.define('Call', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  callerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  receiverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  callType: {
    type: DataTypes.STRING, // 'audio', 'video'
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING, // 'calling', 'missed', 'rejected', 'completed'
    allowNull: false,
    defaultValue: 'calling',
  },
  duration: {
    type: DataTypes.INTEGER, // in seconds
    allowNull: true,
    defaultValue: 0,
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
  tableName: 'calls',
});

module.exports = Call;
