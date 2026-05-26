const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User          = require('./User');

const NotificationSetting = sequelize.define('NotificationSetting', {
  id: {
    type:         DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey:   true,
  },
  user_id: {
    type:      DataTypes.UUID,
    allowNull: false,
    unique:    true,
  },
  enabled: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: true,
  },
  interval_minutes: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 60,
    validate:     { min: 1 },
  },
  start_time: {
    type:         DataTypes.TIME,
    allowNull:    false,
    defaultValue: '07:00',
  },
  end_time: {
    type:         DataTypes.TIME,
    allowNull:    false,
    defaultValue: '22:00',
  },
  active_days: {
    type:         DataTypes.ARRAY(DataTypes.INTEGER),
    allowNull:    false,
    defaultValue: [0, 1, 2, 3, 4, 5, 6],
  },
}, {
  tableName:  'notification_settings',
  timestamps: true,
  createdAt:  false,
  updatedAt:  'updated_at',
});

User.hasOne(NotificationSetting, { foreignKey: 'user_id', onDelete: 'CASCADE' });
NotificationSetting.belongsTo(User, { foreignKey: 'user_id' });

module.exports = NotificationSetting;
