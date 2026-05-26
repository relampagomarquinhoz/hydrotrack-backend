const express     = require('express');
const helmet      = require('helmet');
const cors        = require('cors');
const rateLimit   = require('express-rate-limit');

const authRoutes  = require('./routes/auth');
const hydRoutes   = require('./routes/hydration');
const notifRoutes = require('./routes/notifications');
const resetRoutes = require('./routes/auth.reset');

const app = express();

// ── Segurança ─────────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: '*',       // Em produção, troque pelo domínio do seu app
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting global — 100 req/15 min por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
app.use(limiter);

// Rate limiting restrito para rotas de autenticação — evita força bruta
// FIX: aplicado uma única vez por rota, evitando consumo duplo do limite
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Muitas tentativas de login. Aguarde 15 minutos.' },
});

// ── Body parser ───────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));

// ── Rotas ─────────────────────────────────────────────────────
// FIX: authRoutes e resetRoutes registrados em um único app.use com o mesmo prefixo /auth
// Antes eram dois app.use('/auth', ...) separados, fazendo o authLimiter
// ser chamado duas vezes para qualquer rota /auth — cortando o limite pela metade
app.use('/auth', authLimiter, authRoutes);
app.use('/auth', authLimiter, resetRoutes);

// Rotas sem rate limit de auth
app.use('/hydration',     hydRoutes);
app.use('/notifications', notifRoutes);

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Rota ${req.method} ${req.path} não encontrada.` });
});

// ── Error handler global ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
});

module.exports = app;