const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Song = sequelize.define('Song', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  audiusTrackId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  artist: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  coverImage: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  audioUrl: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'songs',
});

module.exports = Song;
