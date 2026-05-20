const express    = require('express');
const router     = express.Router();
const authCtrl   = require('../controllers/authController');
const authMw     = require('../middlewares/auth');
const { body, validationResult } = require('express-validator');

// Helper para checar erros de validação
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// POST /auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Nome é obrigatório.'),
  body('email').isEmail().withMessage('E-mail inválido.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter ao menos 6 caracteres.'),
], validate, authCtrl.register);

// POST /auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], validate, authCtrl.login);

// GET /auth/me  (protegida)
router.get('/me', authMw, authCtrl.me);

// PUT /auth/me  (protegida)
router.put('/me', authMw, authCtrl.updateMe);

module.exports = router;
