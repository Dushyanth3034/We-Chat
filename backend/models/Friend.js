const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Friend = sequelize.define('Friend', {
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
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
    defaultValue: 'pending',
    allowNull: false,
  },
}, {
  tableName: 'friends',
});

module.exports = Friend;
