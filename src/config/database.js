const { Sequelize } = require('sequelize');

// Railway injeta DATABASE_URL automaticamente ao adicionar o PostgreSQL
// Em desenvolvimento local, usa as variáveis individuais do .env
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require:            true,
          rejectUnauthorized: false, // necessário para o certificado do Railway
        },
      },
      logging: false,
      pool: {
        max:     10,
        min:     0,
        acquire: 30000,
        idle:    10000,
      },
    })
  : new Sequelize(
      process.env.DB_NAME     || 'hydrotrack',
      process.env.DB_USER     || 'postgres',
      process.env.DB_PASSWORD || '',
      {
        host:    process.env.DB_HOST || 'localhost',
        port:    parseInt(process.env.DB_PORT || '5432'),
        dialect: 'postgres',
        logging: false,
        pool: {
          max:     10,
          min:     0,
          acquire: 30000,
          idle:    10000,
        },
      }
    );

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL conectado via Sequelize');

    await sequelize.sync({ alter: true });
    console.log('✅ Models sincronizados com o banco');
  } catch (err) {
    console.error('❌ Falha ao conectar no PostgreSQL:', err.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };