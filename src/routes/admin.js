const express     = require('express');
const router      = express.Router();
const adminCtrl   = require('../controllers/adminController');
const adminAuth   = require('../middlewares/adminAuth');

// Login do admin — sem autenticação
router.post('/login', adminCtrl.login);

// Rotas protegidas — exigem token de admin
router.get('/stats',        adminAuth, adminCtrl.stats);
router.get('/users',        adminAuth, adminCtrl.listUsers);
router.get('/users/:id',    adminAuth, adminCtrl.userDetail);

module.exports = router;
