const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MessageForward = sequelize.define('MessageForward', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  messageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  forwardedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'message_forwards',
});

module.exports = MessageForward;
