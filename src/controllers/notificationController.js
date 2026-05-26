const { NotificationSetting } = require('../models');

/**
 * GET /notifications/settings
 */
exports.getSettings = async (req, res) => {
  try {
    const [settings] = await NotificationSetting.findOrCreate({
      where: { user_id: req.userId },
    });

    return res.json({ success: true, settings });
  } catch (err) {
    console.error('Erro no getSettings:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};

/**
 * PUT /notifications/settings
 */
exports.updateSettings = async (req, res) => {
  const { enabled, interval_minutes, start_time, end_time, active_days } = req.body;

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
    const [settings] = await NotificationSetting.findOrCreate({
      where: { user_id: req.userId },
    });

    // Só atualiza campos enviados
    if (enabled          !== undefined) settings.enabled          = enabled;
    if (interval_minutes !== undefined) settings.interval_minutes = interval_minutes;
    if (start_time       !== undefined) settings.start_time       = start_time;
    if (end_time         !== undefined) settings.end_time         = end_time;
    if (active_days      !== undefined) settings.active_days      = active_days;

    await settings.save();

    return res.json({
      success:  true,
      message:  'Configurações salvas com sucesso!',
      settings,
    });
  } catch (err) {
    console.error('Erro no updateSettings:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};

/**
 * POST /notifications/toggle
 */
exports.toggle = async (req, res) => {
  try {
    const settings = await NotificationSetting.findOne({
      where: { user_id: req.userId },
    });

    if (!settings) {
      return res.status(404).json({ success: false, message: 'Configuração não encontrada.' });
    }

    settings.enabled = !settings.enabled;
    await settings.save();

    return res.json({
      success: true,
      message: settings.enabled ? 'Notificações ativadas.' : 'Notificações desativadas.',
      enabled: settings.enabled,
    });
  } catch (err) {
    console.error('Erro no toggle:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
};
