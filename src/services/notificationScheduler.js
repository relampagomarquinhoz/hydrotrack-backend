// src/services/notificationScheduler.js
// Roda no servidor e dispara push notifications nos horários configurados por cada usuário.
// Instale as dependências: npm install node-cron expo-server-sdk

const cron = require('node-cron');
const { Expo } = require('expo-server-sdk');
const { NotificationSetting, User } = require('../models');

const expo = new Expo();

// Roda a cada minuto para checar quais usuários devem receber notificação agora
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    const currentDay = now.getDay();               // 0 = Dom … 6 = Sáb
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

    // Busca todas as configurações ativas
    const allSettings = await NotificationSetting.findAll({
      where: { enabled: true },
      include: [{ model: User, attributes: ['id', 'expo_push_token', 'name'] }],
    });

    const messages = [];

    for (const setting of allSettings) {
      const user = setting.User;

      // Verifica se o usuário tem token válido
      if (!user?.expo_push_token || !Expo.isExpoPushToken(user.expo_push_token)) {
        continue;
      }

      // Verifica se hoje é um dia ativo
      const activeDays = setting.active_days || [1, 2, 3, 4, 5]; // padrão: seg-sex
      if (!activeDays.includes(currentDay)) continue;

      // Verifica se está dentro do horário permitido
      if (currentTime < setting.start_time || currentTime > setting.end_time) continue;

      // Verifica se é o momento certo baseado no intervalo
      // Usa os minutos desde meia-noite para calcular o intervalo
      const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
      const minutesSinceStart = timeToMinutes(currentTime) - timeToMinutes(setting.start_time);

      if (minutesSinceStart < 0) continue;
      if (minutesSinceStart % setting.interval_minutes !== 0) continue;

      messages.push({
        to: user.expo_push_token,
        sound: 'default',
        title: '💧 Hora de beber água!',
        body: `Oi ${user.name?.split(' ')[0] || ''}! Não se esqueça de se hidratar. 🥤`,
        data: { type: 'hydration_reminder' },
      });
    }

    if (messages.length === 0) return;

    // Envia em lotes (limite do Expo: 100 por lote)
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const receipts = await expo.sendPushNotificationsAsync(chunk);
        // Trata tokens inválidos (revogados / desinstalados)
        for (let i = 0; i < receipts.length; i++) {
          const receipt = receipts[i];
          if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
            const invalidToken = chunk[i].to;
            console.warn(`[Notif] Token inválido, removendo: ${invalidToken}`);
            await User.update(
              { expo_push_token: null },
              { where: { expo_push_token: invalidToken } }
            );
          }
        }
      } catch (err) {
        console.error('[Notif] Erro ao enviar chunk:', err.message);
      }
    }

    console.log(`[Notif] ${messages.length} notificação(ões) enviada(s) às ${currentTime}`);
  } catch (err) {
    console.error('[Notif] Erro no scheduler:', err.message);
  }
});

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

console.log('[Notif] Scheduler de notificações iniciado ✅');