const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Post = sequelize.define('Post', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  imageUrl: {
    type: DataTypes.TEXT, // Using TEXT to support JSON-serialized arrays of multiple images
    allowNull: true,
    defaultValue: '',
  },
}, {
  tableName: 'posts',
});

module.exports = Post;
