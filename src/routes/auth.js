const router  = require('express').Router();
const authCtrl = require('../controllers/authController');
const authMw  = require('../middlewares/auth');

router.post('/register',         authCtrl.register);
router.post('/login',            authCtrl.login);
router.get('/me',                authMw, authCtrl.me);
router.put('/me',                authMw, authCtrl.updateMe);
router.post('/change-password',  authMw, authCtrl.changePassword);

module.exports = router;