const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QRCodeFriend = sequelize.define('QRCodeFriend', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  qrCode: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'qrcode_friends',
});

module.exports = QRCodeFriend;
