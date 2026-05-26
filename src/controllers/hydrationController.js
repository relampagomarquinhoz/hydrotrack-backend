const { Op, fn, col, literal } = require('sequelize');
const { HydrationLog, User }   = require('../models');

/**
 * POST /hydration/log
 */
exports.addLog = async (req, res) => {
  const { amount_ml, note, logged_at } = req.body;

  if (!amount_ml || amount_ml <= 0) {
    return res.status(400).json({ success: false, message: 'amount_ml deve ser positivo.' });
  }

  try {
    const log = await HydrationLog.create({
      user_id:   req.userId,
      amount_ml: parseInt(amount_ml),
      note:      note      || null,
      logged_at: logged_at || new Date(),
    });

    return res.status(201).json({ success: true, log });
  } catch (err) {
    console.error('Erro no addLog:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};

/**
 * GET /hydration/today
 */
exports.todaySummary = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: ['daily_goal_ml'],
    });
    const daily_goal = user?.daily_goal_ml || 2000;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await HydrationLog.findAll({
      where: {
        user_id:   req.userId,
        logged_at: { [Op.between]: [startOfDay, endOfDay] },
      },
      order: [['logged_at', 'DESC']],
    });

    const total_ml  = logs.reduce((sum, l) => sum + l.amount_ml, 0);
    const progress  = Math.min(100, Math.round((total_ml / daily_goal) * 100));
    const remaining = Math.max(0, daily_goal - total_ml);

    return res.json({
      success: true,
      summary: {
        total_ml,
        daily_goal_ml: daily_goal,
        progress_pct:  progress,
        remaining_ml:  remaining,
      },
      logs,
    });
  } catch (err) {
    console.error('Erro no todaySummary:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};

/**
 * GET /hydration/history?days=7
 * FIX: usa AT TIME ZONE para evitar datas erradas por fuso horário do servidor
 */
exports.history = async (req, res) => {
  const days = Math.min(parseInt(req.query.days || '7'), 90);

  try {
    const user       = await User.findByPk(req.userId, { attributes: ['daily_goal_ml'] });
    const daily_goal = user?.daily_goal_ml || 2000;

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    // FIX: converte logged_at para o fuso de Brasília antes de agrupar por data
    const rows = await HydrationLog.findAll({
      attributes: [
        [fn('DATE', literal("logged_at AT TIME ZONE 'America/Sao_Paulo'")), 'date'],
        [fn('SUM', col('amount_ml')), 'total_ml'],
        [fn('COUNT', col('id')),      'entries'],
      ],
      where: {
        user_id:   req.userId,
        logged_at: { [Op.gte]: since },
      },
      group:  [fn('DATE', literal("logged_at AT TIME ZONE 'America/Sao_Paulo'"))],
      order:  [[fn('DATE', literal("logged_at AT TIME ZONE 'America/Sao_Paulo'")), 'DESC']],
      raw:    true,
    });

    const history = rows.map(row => ({
      date:         row.date,
      total_ml:     parseInt(row.total_ml),
      entries:      parseInt(row.entries),
      progress_pct: Math.min(100, Math.round((parseInt(row.total_ml) / daily_goal) * 100)),
      goal_reached: parseInt(row.total_ml) >= daily_goal,
    }));

    return res.json({ success: true, daily_goal_ml: daily_goal, history });
  } catch (err) {
    console.error('Erro no history:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};

/**
 * DELETE /hydration/log/:id
 * Deleta um registro individual por UUID
 */
exports.deleteLog = async (req, res) => {
  try {
    const deleted = await HydrationLog.destroy({
      where: {
        id:      req.params.id,
        user_id: req.userId,
      },
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Registro não encontrado.' });
    }

    return res.json({ success: true, message: 'Registro removido.' });
  } catch (err) {
    console.error('Erro no deleteLog:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};

/**
 * DELETE /hydration/history/:date
 * FIX: nova rota — deleta todos os logs de um dia específico (formato YYYY-MM-DD)
 * Necessária porque o histórico é agregado por dia, sem id individual
 */
exports.deleteByDate = async (req, res) => {
  const { date } = req.params;

  // Valida formato da data
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, message: 'Formato de data inválido. Use YYYY-MM-DD.' });
  }

  try {
    // Usa o mesmo fuso do history para garantir consistência
    const startOfDay = new Date(`${date}T00:00:00-03:00`);
    const endOfDay   = new Date(`${date}T23:59:59.999-03:00`);

    const deleted = await HydrationLog.destroy({
      where: {
        user_id:   req.userId,
        logged_at: { [Op.between]: [startOfDay, endOfDay] },
      },
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Nenhum registro encontrado para essa data.' });
    }

    return res.json({ success: true, message: `${deleted} registro(s) removido(s).` });
  } catch (err) {
    console.error('Erro no deleteByDate:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};

/**
 * GET /hydration/streak
 * FIX: cursor avança mesmo quando a meta do dia atual não foi atingida,
 * evitando que a sequência quebre antes de verificar os dias anteriores
 */
exports.streak = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, { attributes: ['daily_goal_ml'] });
    const goal = user?.daily_goal_ml || 2000;

    // FIX: usa o mesmo fuso do history para consistência
    const rows = await HydrationLog.findAll({
      attributes: [
        [fn('DATE', literal("logged_at AT TIME ZONE 'America/Sao_Paulo'")), 'date'],
        [fn('SUM', col('amount_ml')), 'total'],
      ],
      where:  { user_id: req.userId },
      group:  [fn('DATE', literal("logged_at AT TIME ZONE 'America/Sao_Paulo'"))],
      order:  [[fn('DATE', literal("logged_at AT TIME ZONE 'America/Sao_Paulo'")), 'DESC']],
      raw:    true,
    });

    let streak = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    for (const row of rows) {
      const rowDate = new Date(row.date);
      rowDate.setHours(0, 0, 0, 0);
      const diff = (cursor - rowDate) / (1000 * 60 * 60 * 24);

      // FIX: diff > 1 significa que há um dia sem registro — quebra a sequência
      if (diff > 1) break;

      if (parseInt(row.total) >= goal) {
        streak++;
      }

      // FIX: cursor sempre avança para o dia do registro atual,
      // assim o dia de hoje sem meta não impede contar ontem e anteontem
      cursor = rowDate;
    }

    return res.json({ success: true, streak_days: streak });
  } catch (err) {
    console.error('Erro no streak:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};
