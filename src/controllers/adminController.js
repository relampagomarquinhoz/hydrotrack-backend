const { User, HydrationLog } = require('../models');
const { Op, fn, col }        = require('sequelize');
const jwt                    = require('jsonwebtoken');

/**
 * POST /admin/login
 * Autentica o admin usando credenciais do .env
 */
exports.login = (req, res) => {
  const { email, password } = req.body;

  if (
    email    !== process.env.ADMIN_EMAIL ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
  }

  const token = jwt.sign(
    { role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  return res.json({ success: true, token });
};

/**
 * GET /admin/stats
 * Métricas gerais do app
 */
exports.stats = async (req, res) => {
  try {
    const totalUsers = await User.count();

    // Usuários ativos: fizeram pelo menos 1 log nos últimos 7 dias
    const since7d = new Date();
    since7d.setDate(since7d.getDate() - 7);

    const activeUsers = await HydrationLog.count({
      distinct: true,
      col: 'user_id',
      where: { logged_at: { [Op.gte]: since7d } },
    });

    // Média de consumo diário (todos os logs de hoje)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayLogs = await HydrationLog.findAll({
      attributes: [[fn('SUM', col('amount_ml')), 'total']],
      where: { logged_at: { [Op.between]: [startOfDay, endOfDay] } },
      raw: true,
    });
    const todayTotal   = parseInt(todayLogs[0]?.total || 0);
    const avgTodayPerUser = activeUsers > 0 ? Math.round(todayTotal / activeUsers) : 0;

    // Novos usuários nos últimos 7 dias
    const newUsers7d = await User.count({
      where: { created_at: { [Op.gte]: since7d } },
    });

    // Contagem por gênero
    const maleUsers   = await User.count({ where: { gender: 'male'   } });
    const femaleUsers = await User.count({ where: { gender: 'female' } });

    return res.json({
      success: true,
      stats: {
        total_users:        totalUsers,
        active_users_7d:    activeUsers,
        new_users_7d:       newUsers7d,
        avg_ml_today:       avgTodayPerUser,
        male_users:         maleUsers,
        female_users:       femaleUsers,
      },
    });
  } catch (err) {
    console.error('Erro no stats:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};

/**
 * GET /admin/users
 * Lista todos os usuários
 */
exports.listUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'gender', 'weight_kg', 'daily_goal_ml', 'created_at'],
      order: [['created_at', 'DESC']],
    });

    return res.json({ success: true, users });
  } catch (err) {
    console.error('Erro no listUsers:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};

/**
 * GET /admin/users/:id
 * Detalhes de um usuário + histórico de 7 dias
 */
exports.userDetail = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'name', 'email', 'gender', 'weight_kg', 'height_cm', 'daily_goal_ml', 'created_at'],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const since7d = new Date();
    since7d.setDate(since7d.getDate() - 7);

    const history = await HydrationLog.findAll({
      attributes: [
        [fn('DATE', col('logged_at')), 'date'],
        [fn('SUM',  col('amount_ml')), 'total_ml'],
      ],
      where: {
        user_id:   user.id,
        logged_at: { [Op.gte]: since7d },
      },
      group: [fn('DATE', col('logged_at'))],
      order: [[fn('DATE', col('logged_at')), 'DESC']],
      raw: true,
    });

    const totalLogs = await HydrationLog.count({ where: { user_id: user.id } });

    return res.json({
      success: true,
      user,
      history,
      total_logs: totalLogs,
    });
  } catch (err) {
    console.error('Erro no userDetail:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};