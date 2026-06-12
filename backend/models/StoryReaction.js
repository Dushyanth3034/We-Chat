const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoryReaction = sequelize.define('StoryReaction', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  storyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  reactionType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'story_reactions',
});

module.exports = StoryReaction;
