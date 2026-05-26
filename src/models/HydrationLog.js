const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User          = require('./User');

const HydrationLog = sequelize.define('HydrationLog', {
  id: {
    type:         DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey:   true,
  },
  user_id: {
    type:      DataTypes.UUID,
    allowNull: false,
  },
  amount_ml: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    validate:  { min: 1 },
  },
  logged_at: {
    type:         DataTypes.DATE,
    allowNull:    false,
    defaultValue: DataTypes.NOW,
  },
  note: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName:  'hydration_logs',
  timestamps: false,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['logged_at'] },
  ],
});

// Associações
User.hasMany(HydrationLog, { foreignKey: 'user_id', onDelete: 'CASCADE' });
HydrationLog.belongsTo(User, { foreignKey: 'user_id' });

module.exports = HydrationLog;
