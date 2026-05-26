require('dotenv').config();

// Importa models para garantir que as associações sejam registradas
require('./models');

const app           = require('./app');
const { connectDB } = require('./config/database');

const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB(); // conecta e faz sync dos models

  app.listen(PORT, () => {
    console.log('');
    console.log('🚀 HydroTrack API rodando!');
    console.log(`📡 Local:   http://localhost:${PORT}`);
    console.log(`🔒 Env:     ${process.env.NODE_ENV || 'development'}`);
    console.log('');
    console.log('Rotas disponíveis:');
    console.log(`  POST   /auth/register`);
    console.log(`  POST   /auth/login`);
    console.log(`  GET    /auth/me`);
    console.log(`  PUT    /auth/me`);
    console.log(`  POST   /hydration/log`);
    console.log(`  GET    /hydration/today`);
    console.log(`  GET    /hydration/history`);
    console.log(`  GET    /hydration/streak`);
    console.log(`  DELETE /hydration/log/:id`);
    console.log(`  GET    /notifications/settings`);
    console.log(`  PUT    /notifications/settings`);
    console.log(`  POST   /notifications/toggle`);
    console.log('');
    console.log('💡 Para expor via ngrok, rode: npm run dev:tunnel');
  });
};

start();
