const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoryReply = sequelize.define('StoryReply', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  storyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'story_replies',
});

module.exports = StoryReply;
