const { pool } = require('../config/database');

/**
 * POST /hydration/log
 * Registra consumo de água
 */
exports.addLog = async (req, res) => {
  const { amount_ml, note, logged_at } = req.body;

  if (!amount_ml || amount_ml <= 0) {
    return res.status(400).json({ success: false, message: 'amount_ml deve ser positivo.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO hydration_logs (user_id, amount_ml, note, logged_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.userId, amount_ml, note || null, logged_at || new Date()]
    );

    return res.status(201).json({ success: true, log: result.rows[0] });
  } catch (err) {
    console.error('Erro no addLog:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};

/**
 * GET /hydration/today
 * Resumo do dia atual: total consumido, meta, progresso %
 */
exports.todaySummary = async (req, res) => {
  try {
    const [logsResult, userResult] = await Promise.all([
      pool.query(
        `SELECT id, amount_ml, note, logged_at
         FROM hydration_logs
         WHERE user_id = $1
           AND logged_at >= CURRENT_DATE
           AND logged_at <  CURRENT_DATE + INTERVAL '1 day'
         ORDER BY logged_at DESC`,
        [req.userId]
      ),
      pool.query('SELECT daily_goal_ml FROM users WHERE id = $1', [req.userId]),
    ]);

    const logs        = logsResult.rows;
    const daily_goal  = userResult.rows[0]?.daily_goal_ml || 2000;
    const total_ml    = logs.reduce((sum, l) => sum + l.amount_ml, 0);
    const progress    = Math.min(100, Math.round((total_ml / daily_goal) * 100));
    const remaining   = Math.max(0, daily_goal - total_ml);

    return res.json({
      success: true,
      summary: { total_ml, daily_goal_ml: daily_goal, progress_pct: progress, remaining_ml: remaining },
      logs,
    });
  } catch (err) {
    console.error('Erro no todaySummary:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};

/**
 * GET /hydration/history?days=7
 * Histórico agregado por dia (padrão: 7 dias)
 */
exports.history = async (req, res) => {
  const days = Math.min(parseInt(req.query.days || '7'), 90);

  try {
    const result = await pool.query(
      `SELECT
         DATE(logged_at)         AS date,
         SUM(amount_ml)::INTEGER AS total_ml,
         COUNT(*)::INTEGER       AS entries
       FROM hydration_logs
       WHERE user_id  = $1
         AND logged_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(logged_at)
       ORDER BY date DESC`,
      [req.userId]
    );

    const userResult = await pool.query(
      'SELECT daily_goal_ml FROM users WHERE id = $1', [req.userId]
    );
    const daily_goal = userResult.rows[0]?.daily_goal_ml || 2000;

    const history = result.rows.map(row => ({
      ...row,
      progress_pct: Math.min(100, Math.round((row.total_ml / daily_goal) * 100)),
      goal_reached: row.total_ml >= daily_goal,
    }));

    return res.json({ success: true, daily_goal_ml: daily_goal, history });
  } catch (err) {
    console.error('Erro no history:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};

/**
 * DELETE /hydration/log/:id
 * Remove um registro
 */
exports.deleteLog = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM hydration_logs WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Registro não encontrado.' });
    }

    return res.json({ success: true, message: 'Registro removido.' });
  } catch (err) {
    console.error('Erro no deleteLog:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};

/**
 * GET /hydration/streak
 * Calcula quantos dias seguidos o usuário bateu a meta
 */
exports.streak = async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT daily_goal_ml FROM users WHERE id = $1', [req.userId]
    );
    const goal = userResult.rows[0]?.daily_goal_ml || 2000;

    const result = await pool.query(
      `SELECT DATE(logged_at) AS date, SUM(amount_ml) AS total
       FROM hydration_logs
       WHERE user_id = $1
       GROUP BY DATE(logged_at)
       ORDER BY date DESC`,
      [req.userId]
    );

    let streak = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    for (const row of result.rows) {
      const rowDate = new Date(row.date);
      rowDate.setHours(0, 0, 0, 0);

      const diff = (cursor - rowDate) / (1000 * 60 * 60 * 24);
      if (diff > 1) break; // gap → sequência quebrada
      if (row.total >= goal) {
        streak++;
        cursor = rowDate;
      }
    }

    return res.json({ success: true, streak_days: streak });
  } catch (err) {
    console.error('Erro no streak:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};
