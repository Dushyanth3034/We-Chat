const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MessageReaction = sequelize.define('MessageReaction', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  messageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  reaction: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'message_reactions',
});

module.exports = MessageReaction;
