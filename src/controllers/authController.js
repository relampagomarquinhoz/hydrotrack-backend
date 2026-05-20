const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { pool } = require('../config/database');

// ── Helpers ──────────────────────────────────────────────────

const generateAccessToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const calcDailyGoal = (weightKg, gender) => {
  // Base: 35ml/kg; mulheres recebem leve redução (fórmula simplificada)
  const base = Math.round(weightKg * 35);
  return gender === 'Feminino' ? Math.round(base * 0.9) : base;
};

// ── Controllers ──────────────────────────────────────────────

/**
 * POST /auth/register
 */
exports.register = async (req, res) => {
  const { name, email, password, weight_kg, height_cm, gender } = req.body;

  try {
    // Verifica e-mail duplicado
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'E-mail já cadastrado.' });
    }

    // Hash da senha (salt=12)
    const password_hash = await bcrypt.hash(password, 12);

    // Meta diária calculada automaticamente
    const daily_goal_ml = weight_kg ? calcDailyGoal(parseFloat(weight_kg), gender) : 2000;

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, weight_kg, height_cm, gender, daily_goal_ml)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, weight_kg, height_cm, gender, daily_goal_ml, created_at`,
      [name, email, password_hash, weight_kg || null, height_cm || null, gender || null, daily_goal_ml]
    );

    const user = result.rows[0];

    // Cria configurações de notificação padrão
    await pool.query(
      `INSERT INTO notification_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [user.id]
    );

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
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT id, name, email, password_hash, daily_goal_ml FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'E-mail ou senha incorretos.' });
    }

    const user = result.rows[0];
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
    const result = await pool.query(
      `SELECT id, name, email, weight_kg, height_cm, gender, daily_goal_ml, created_at
       FROM users WHERE id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Erro no me:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};

/**
 * PUT /auth/me  (protegida) — atualiza perfil
 */
exports.updateMe = async (req, res) => {
  const { name, weight_kg, height_cm, gender, daily_goal_ml } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           weight_kg = COALESCE($2, weight_kg),
           height_cm = COALESCE($3, height_cm),
           gender    = COALESCE($4, gender),
           daily_goal_ml = COALESCE($5, daily_goal_ml)
       WHERE id = $6
       RETURNING id, name, email, weight_kg, height_cm, gender, daily_goal_ml`,
      [name, weight_kg, height_cm, gender, daily_goal_ml, req.userId]
    );

    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Erro no updateMe:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};
