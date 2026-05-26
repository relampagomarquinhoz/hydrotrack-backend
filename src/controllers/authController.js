const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { User, NotificationSetting } = require('../models');

// ── Helpers ──────────────────────────────────────────────────

const generateAccessToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const calcDailyGoal = (weightKg, gender) => {
  const base = Math.round(weightKg * 35);
  return gender === 'Feminino' ? Math.round(base * 0.9) : base;
};

// ── Controllers ──────────────────────────────────────────────

/**
 * POST /auth/register
 * FIX: lê weight/height (campos enviados pelo front) em vez de weight_kg/height_cm
 * FIX: normaliza email para lowercase antes de salvar
 */
exports.register = async (req, res) => {
  // Front envia: { name, email, password, weight, height, gender }
  const { name, email, password, weight, height, gender } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Nome, email e senha são obrigatórios.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Verifica e-mail duplicado
    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'E-mail já cadastrado.' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const daily_goal_ml = weight ? calcDailyGoal(parseFloat(weight), gender) : 2000;

    const user = await User.create({
      name,
      email:         normalizedEmail,
      password_hash,
      weight_kg:     weight  ? parseFloat(weight)  : null,
      height_cm:     height  ? parseFloat(height)  : null,
      gender:        gender  || null,
      daily_goal_ml,
    });

    // Cria configurações de notificação padrão
    await NotificationSetting.findOrCreate({ where: { user_id: user.id } });

    const token = generateAccessToken(user.id);

    return res.status(201).json({
      success: true,
      message: 'Conta criada com sucesso!',
      token,
      user: {
        id:            user.id,
        name:          user.name,
        email:         user.email,
        daily_goal_ml: user.daily_goal_ml,
      },
    });
  } catch (err) {
    console.error('Erro no register:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};

/**
 * POST /auth/login
 * FIX: normaliza email para lowercase antes de buscar
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const user = await User.findOne({ where: { email: normalizedEmail } });

    if (!user) {
      return res.status(401).json({ success: false, message: 'E-mail ou senha incorretos.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'E-mail ou senha incorretos.' });
    }

    const token = generateAccessToken(user.id);

    return res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      token,
      user: {
        id:            user.id,
        name:          user.name,
        email:         user.email,
        daily_goal_ml: user.daily_goal_ml,
      },
    });
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};

/**
 * GET /auth/me  (protegida)
 */
exports.me = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'name', 'email', 'weight_kg', 'height_cm', 'gender', 'daily_goal_ml', 'created_at'],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    return res.json({ success: true, user });
  } catch (err) {
    console.error('Erro no me:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};

/**
 * PUT /auth/me  (protegida)
 */
exports.updateMe = async (req, res) => {
  const { name, weight_kg, height_cm, gender, daily_goal_ml } = req.body;

  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    if (name          !== undefined) user.name          = name;
    if (weight_kg     !== undefined) user.weight_kg     = parseFloat(weight_kg);
    if (height_cm     !== undefined) user.height_cm     = parseFloat(height_cm);
    if (gender        !== undefined) user.gender        = gender;
    if (daily_goal_ml !== undefined) user.daily_goal_ml = parseInt(daily_goal_ml);

    await user.save();

    return res.json({
      success: true,
      user: {
        id:            user.id,
        name:          user.name,
        email:         user.email,
        weight_kg:     user.weight_kg,
        height_cm:     user.height_cm,
        gender:        user.gender,
        daily_goal_ml: user.daily_goal_ml,
      },
    });
  } catch (err) {
    console.error('Erro no updateMe:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};
