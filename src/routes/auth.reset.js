// ============================================================
// routes/auth.reset.js  —  HydroTrack Password Reset
//
// Adicione no seu arquivo principal de rotas:
//   const resetRoutes = require('./routes/auth.reset');
//   app.use('/auth', resetRoutes);
//
// Dependências necessárias (já deve ter a maioria):
//   npm install express bcryptjs jsonwebtoken nodemailer
// ============================================================

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const nodemailer = require('nodemailer');

// Reutilize a instância do seu pool/db — ajuste o caminho se necessário
const { pool } = require('../config/database'); // ex: module.exports = new Pool({ connectionString: ... })

// ─── Configuração do Nodemailer ───────────────────────────────
// Para testes rápidos use Ethereal (https://ethereal.email) ou
// substitua pelas credenciais reais (Gmail, SendGrid, etc.)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST   || 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT)  || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'seu_usuario_ethereal',
    pass: process.env.SMTP_PASS || 'sua_senha_ethereal',
  },
});

// ─── Helper: gera código numérico de 6 dígitos ───────────────
function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── POST /auth/forgot-password ──────────────────────────────
// Body: { email }
// Gera um código de 6 dígitos, salva no banco e envia por email.
// Responde sempre com 200 para não vazar se o email existe.
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email é obrigatório' });
  }

  try {
    // Verifica se o usuário existe
    const userResult = await pool.query(
      'SELECT id, name FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    // Sempre retorna 200 para não vazar existência de conta
    if (userResult.rows.length === 0) {
      return res.status(200).json({ message: 'Se o email existir, você receberá o código.' });
    }

    const user = userResult.rows[0];
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Invalida códigos anteriores do mesmo usuário
    await pool.query(
      'UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false',
      [user.id]
    );

    // Insere novo código
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, code, expiresAt]
    );

    // Envia email
    await transporter.sendMail({
      from: `"HydroTrack" <${process.env.SMTP_USER || 'noreply@hydrotrack.app'}>`,
      to: email,
      subject: 'Seu código de redefinição de senha — HydroTrack',
      text: `Olá, ${user.name}!\n\nSeu código de redefinição de senha é: ${code}\n\nEle expira em 15 minutos.\n\nSe não foi você, ignore este email.`,
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;">
          <h2 style="color:#1565C0;">💧 HydroTrack</h2>
          <p>Olá, <strong>${user.name}</strong>!</p>
          <p>Seu código de redefinição de senha é:</p>
          <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#1565C0;
                      background:#E3F2FD;border-radius:12px;padding:20px;text-align:center;
                      margin:16px 0;">
            ${code}
          </div>
          <p style="color:#90A4AE;font-size:13px;">Expira em <strong>15 minutos</strong>. Se não foi você, ignore este email.</p>
        </div>
      `,
    });

    return res.status(200).json({ message: 'Se o email existir, você receberá o código.' });
  } catch (err) {
    console.error('[forgot-password]', err);
    return res.status(500).json({ message: 'Erro interno. Tente novamente.' });
  }
});

// ─── POST /auth/reset-password ───────────────────────────────
// Body: { email, code, newPassword }
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: 'Preencha todos os campos' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres' });
  }

  try {
    // Busca usuário
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Código inválido ou expirado' });
    }

    const userId = userResult.rows[0].id;

    // Valida o código
    const tokenResult = await pool.query(
      `SELECT id FROM password_reset_tokens
       WHERE user_id = $1
         AND token = $2
         AND used = false
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, code.trim()]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ message: 'Código inválido ou expirado' });
    }

    const tokenId = tokenResult.rows[0].id;

    // Hash da nova senha
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Atualiza senha e marca token como usado (transação)
    await pool.query('BEGIN');
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, userId]
    );
    await pool.query(
      'UPDATE password_reset_tokens SET used = true WHERE id = $1',
      [tokenId]
    );
    await pool.query('COMMIT');

    return res.status(200).json({ message: 'Senha redefinida com sucesso!' });
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    console.error('[reset-password]', err);
    return res.status(500).json({ message: 'Erro interno. Tente novamente.' });
  }
});

module.exports = router;
