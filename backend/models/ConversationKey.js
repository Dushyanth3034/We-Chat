const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ConversationKey = sequelize.define('ConversationKey', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  friendId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  encryptedKey: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'conversation_keys',
});

module.exports = ConversationKey;
