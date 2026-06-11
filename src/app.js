const express     = require('express');
const helmet      = require('helmet');
const cors        = require('cors');
const rateLimit   = require('express-rate-limit');

const authRoutes  = require('./routes/auth');
const hydRoutes   = require('./routes/hydration');
const notifRoutes = require('./routes/notifications');
const resetRoutes = require('./routes/auth.reset');
const adminRoutes = require('./routes/admin');
const pushRoutes  = require('./routes/pushToken');
require('./services/notificationScheduler');

const app = express();

// ✅ Necessário para o Render (proxy reverso) — resolve ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
app.use(limiter);

// ✅ Aumentado para 20 — 10 era pouco e bloqueava esqueci-senha durante testes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Muitas tentativas. Aguarde 15 minutos.' },
});

app.use(express.json({ limit: '10kb' }));

app.use('/auth',          authLimiter, authRoutes);
app.use('/auth',          authLimiter, resetRoutes);
app.use('/hydration',     hydRoutes);
app.use('/notifications', notifRoutes);
app.use('/admin',         adminRoutes);
app.use('/push',          pushRoutes);

app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Rota ${req.method} ${req.path} não encontrada.` });
});

app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
});

module.exports = app;