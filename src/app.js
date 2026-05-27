const express     = require('express');
const helmet      = require('helmet');
const cors        = require('cors');
const rateLimit   = require('express-rate-limit');

const authRoutes  = require('./routes/auth');
const hydRoutes   = require('./routes/hydration');
const notifRoutes = require('./routes/notifications');
const resetRoutes = require('./routes/auth.reset');
const adminRoutes = require('./routes/admin');

const app = express();

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

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { success: false, message: 'Muitas tentativas de login. Aguarde 15 minutos.' },
});

app.use(express.json({ limit: '10kb' }));

app.use('/auth',          authLimiter, authRoutes);
app.use('/auth',          authLimiter, resetRoutes);
app.use('/hydration',     hydRoutes);
app.use('/notifications', notifRoutes);
app.use('/admin',         adminRoutes);

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