const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Group = sequelize.define('Group', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  groupName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  groupImage: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'groups',
});

module.exports = Group;
