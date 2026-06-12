const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Chat = sequelize.define('Chat', {
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
  message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  messageType: {
    type: DataTypes.ENUM('text', 'image', 'file'),
    defaultValue: 'text',
    allowNull: false,
  },
  isSeen: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
}, {
  tableName: 'chats',
});

module.exports = Chat;
