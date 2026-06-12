const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VoiceMessage = sequelize.define('VoiceMessage', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  receiverId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  voiceUrl: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'voice_messages',
});

module.exports = VoiceMessage;
