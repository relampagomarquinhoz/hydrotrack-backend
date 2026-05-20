const express    = require('express');
const router     = express.Router();
const notifCtrl  = require('../controllers/notificationController');
const authMw     = require('../middlewares/auth');

router.use(authMw);

router.get('/settings',    notifCtrl.getSettings);     // Buscar configurações
router.put('/settings',    notifCtrl.updateSettings);  // Atualizar configurações
router.post('/toggle',     notifCtrl.toggle);          // Liga/desliga rápido

module.exports = router;
