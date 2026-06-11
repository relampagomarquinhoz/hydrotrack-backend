// src/routes/pushToken.js
// Rota para o app mobile registrar/atualizar o Expo Push Token do usuário.
// Adicione no seu index.js/app.js: app.use('/push', require('./routes/pushToken'));

const express = require('express');
const router  = express.Router();
const authMw  = require('../middlewares/auth');
const { User } = require('../models');

// POST /push/token
// Body: { token: "ExponentPushToken[xxx]" }
router.post('/token', authMw, async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Token é obrigatório.' });
  }

  try {
    await User.update(
      { expo_push_token: token },
      { where: { id: req.userId } }
    );

    return res.json({ success: true, message: 'Token registrado com sucesso.' });
  } catch (err) {
    console.error('[pushToken]', err);
    return res.status(500).json({ success: false, message: 'Erro interno.' });
  }
});

// DELETE /push/token  — chamado quando usuário desativa notificações no app
router.delete('/token', authMw, async (req, res) => {
  try {
    await User.update(
      { expo_push_token: null },
      { where: { id: req.userId } }
    );

    return res.json({ success: true, message: 'Token removido.' });
  } catch (err) {
    console.error('[pushToken DELETE]', err);
    return res.status(500).json({ success: false, message: 'Erro interno.' });
  }
});

module.exports = router;