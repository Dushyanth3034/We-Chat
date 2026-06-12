const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoryView = sequelize.define('StoryView', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  storyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  viewerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  viewedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'story_views',
  timestamps: false,
});

module.exports = StoryView;
