// Exporta todos os models em um lugar só
// Isso garante que as associações sejam carregadas na ordem certa
const User                = require('./User');
const HydrationLog        = require('./HydrationLog');
const NotificationSetting = require('./NotificationSetting');
const RefreshToken        = require('./RefreshToken');

module.exports = { User, HydrationLog, NotificationSetting, RefreshToken };
