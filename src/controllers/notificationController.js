const { pool } = require('../config/database');

/**
 * GET /notifications/settings
 * Retorna configurações de notificação do usuário
 */
exports.getSettings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT enabled, interval_minutes, start_time, end_time, active_days, updated_at
       FROM notification_settings
       WHERE user_id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      // Cria configuração padrão se não existir
      const created = await pool.query(
        `INSERT INTO notification_settings (user_id)
         VALUES ($1)
         RETURNING enabled, interval_minutes, start_time, end_time, active_days, updated_at`,
        [req.userId]
      );
      return res.json({ success: true, settings: created.rows[0] });
    }

    return res.json({ success: true, settings: result.rows[0] });
  } catch (err) {
    console.error('Erro no getSettings:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};

/**
 * PUT /notifications/settings
 * Atualiza configurações de notificação
 * Body: { enabled, interval_minutes, start_time, end_time, active_days }
 */
exports.updateSettings = async (req, res) => {
  const { enabled, interval_minutes, start_time, end_time, active_days } = req.body;

  // Validações
  if (interval_minutes !== undefined && interval_minutes <= 0) {
    return res.status(400).json({ success: false, message: 'interval_minutes deve ser positivo.' });
  }

  if (active_days !== undefined) {
    if (!Array.isArray(active_days) || active_days.some(d => d < 0 || d > 6)) {
      return res.status(400).json({
        success: false,
        message: 'active_days deve ser um array com valores entre 0 (Dom) e 6 (Sáb).',
      });
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO notification_settings (user_id, enabled, interval_minutes, start_time, end_time, active_days)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET
         enabled          = COALESCE($2, notification_settings.enabled),
         interval_minutes = COALESCE($3, notification_settings.interval_minutes),
         start_time       = COALESCE($4, notification_settings.start_time),
         end_time         = COALESCE($5, notification_settings.end_time),
         active_days      = COALESCE($6, notification_settings.active_days)
       RETURNING enabled, interval_minutes, start_time, end_time, active_days, updated_at`,
      [
        req.userId,
        enabled          ?? null,
        interval_minutes ?? null,
        start_time       ?? null,
        end_time         ?? null,
        active_days      ? `{${active_days.join(',')}}` : null,
      ]
    );

    return res.json({
      success: true,
      message: 'Configurações salvas com sucesso!',
      settings: result.rows[0],
    });
  } catch (err) {
    console.error('Erro no updateSettings:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};

/**
 * POST /notifications/toggle
 * Liga/desliga notificações rapidamente
 */
exports.toggle = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notification_settings
       SET enabled = NOT enabled
       WHERE user_id = $1
       RETURNING enabled`,
      [req.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Configuração não encontrada.' });
    }

    const enabled = result.rows[0].enabled;
    return res.json({
      success: true,
      message: enabled ? 'Notificações ativadas.' : 'Notificações desativadas.',
      enabled,
    });
  } catch (err) {
    console.error('Erro no toggle:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};
