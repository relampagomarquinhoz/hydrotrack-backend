const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User          = require('./User');

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type:         DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey:   true,
  },
  user_id: {
    type:      DataTypes.UUID,
    allowNull: false,
  },
  token: {
    type:      DataTypes.TEXT,
    allowNull: false,
    unique:    true,
  },
  expires_at: {
    type:      DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName:  'refresh_tokens',
  timestamps: true,
  createdAt:  'created_at',
  updatedAt:  false,
  indexes: [
    { fields: ['token'] },
    { fields: ['user_id'] },
  ],
});

User.hasMany(RefreshToken, { foreignKey: 'user_id', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id' });

module.exports = RefreshToken;
