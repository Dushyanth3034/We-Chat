const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  profileImage: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  bio: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Hello, I am using WeChat!',
  },
  qrCode: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  provider: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'local',
  },
  publicKey: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  encryptedPrivateKey: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'users',
});

module.exports = User;
