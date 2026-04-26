require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  host: '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'community_site_secret_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'community_site',
    charset: 'utf8mb4',
    connectionLimit: 10,
    timezone: '+08:00'
  }
};
