const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type:         DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey:   true,
  },
  name: {
    type:      DataTypes.STRING(100),
    allowNull: false,
  },
  email: {
    type:      DataTypes.STRING(150),
    allowNull: false,
    unique:    true,
  },
  password_hash: {
    type:      DataTypes.TEXT,
    allowNull: false,
  },
  weight_kg: {
    type:      DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  height_cm: {
    type:      DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  gender: {
    type:      DataTypes.STRING(20),
    allowNull: true,
  },
  daily_goal_ml: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 2000,
  },
  reset_token: {
    type:      DataTypes.STRING,
    allowNull: true,
  },
  reset_token_expires: {
    type:      DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName:  'users',
  timestamps: true,
  createdAt:  'created_at',
  updatedAt:  'updated_at',
});

module.exports = User;