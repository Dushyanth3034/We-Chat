const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Story = sequelize.define('Story', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  mediaUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  mediaType: {
    type: DataTypes.ENUM('image', 'video', 'text'),
    allowNull: false,
    defaultValue: 'text',
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  backgroundColor: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '#800020',
  },
  musicId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'stories',
});

module.exports = Story;
