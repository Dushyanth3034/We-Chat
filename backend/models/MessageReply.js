const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MessageReply = sequelize.define('MessageReply', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  messageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true, // A message can only be a reply to one message
  },
  repliedToMessageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'message_replies',
});

module.exports = MessageReply;
