// src/routes/auth.reset.js  — VERSÃO CORRIGIDA
//
// PROBLEMA ANTERIOR:
//   from: 'HydroTrack <onboarding@resend.dev>'
//   O domínio "resend.dev" só entrega emails para o endereço verificado
//   na sua conta Resend (o seu próprio Gmail). Para qualquer outro
//   destinatário o Resend bloqueia silenciosamente.
//
// SOLUÇÃO (2 opções — escolha uma):
//
//   OPÇÃO A — Domínio próprio verificado no Resend (RECOMENDADO):
//     1. Acesse https://resend.com/domains
//     2. Adicione seu domínio (ex: hydrotrack.app ou até um subdomínio gratuito)
//     3. Siga os passos de DNS e aguarde verificação (~5 min)
//     4. Troque o from abaixo para: 'HydroTrack <noreply@SEU_DOMINIO>'
//     5. Pronto — funciona para qualquer destinatário.
//
//   OPÇÃO B — Sem domínio próprio (usando Resend com email verificado):
//     1. Acesse https://resend.com/emails/verified
//     2. Adicione e verifique o email do destinatário (limitado)
//     Não escala — serve só para testes.
//
// Este arquivo já está preparado para a OPÇÃO A.
// Troque RESEND_FROM_EMAIL na variável de ambiente e está feito.

const express    = require('express');
const router     = express.Router();
const bcrypt     = require('bcryptjs');
const { Resend } = require('resend');
const { User }   = require('../models');

const resend = new Resend(process.env.RESEND_API_KEY);

// Configure no Render (Environment Variables):
//   RESEND_FROM_EMAIL = noreply@seu-dominio.com
// Enquanto não tiver domínio próprio, use o email verificado na sua conta Resend.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email é obrigatório' });

  try {
    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });

    // Sempre retorna 200 para não revelar se o email existe
    if (!user) {
      return res.status(200).json({ message: 'Se o email existir, você receberá o código.' });
    }

    const code      = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    user.reset_token         = code;
    user.reset_token_expires = expiresAt;
    await user.save();

    const { error } = await resend.emails.send({
      from:    `HydroTrack <${FROM_EMAIL}>`,
      to:      email,
      subject: 'Código de redefinição de senha — HydroTrack',
      text:    `Olá, ${user.name}!\n\nSeu código é: ${code}\n\nExpira em 15 minutos.`,
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;">
          <h2 style="color:#1565C0;">💧 HydroTrack</h2>
          <p>Olá, <strong>${user.name}</strong>!</p>
          <p>Seu código de redefinição de senha é:</p>
          <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#1565C0;
                      background:#E3F2FD;border-radius:12px;padding:20px;text-align:center;margin:16px 0;">
            ${code}
          </div>
          <p style="color:#90A4AE;font-size:13px;">Expira em <strong>15 minutos</strong>.</p>
        </div>
      `,
    });

    // Loga erro do Resend sem quebrar a resposta para o usuário
    if (error) {
      console.error('[forgot-password] Resend error:', error);
    }

    return res.status(200).json({ message: 'Se o email existir, você receberá o código.' });
  } catch (err) {
    console.error('[forgot-password]', err);
    return res.status(500).json({ message: 'Erro interno. Tente novamente.' });
  }
});

// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: 'Preencha todos os campos' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres' });
  }

  try {
    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });

    if (!user || user.reset_token !== code || new Date() > new Date(user.reset_token_expires)) {
      return res.status(400).json({ message: 'Código inválido ou expirado' });
    }

    user.password_hash       = await bcrypt.hash(newPassword, 12);
    user.reset_token         = null;
    user.reset_token_expires = null;
    await user.save();

    return res.status(200).json({ message: 'Senha redefinida com sucesso!' });
  } catch (err) {
    console.error('[reset-password]', err);
    return res.status(500).json({ message: 'Erro interno. Tente novamente.' });
  }
});

module.exports = router;