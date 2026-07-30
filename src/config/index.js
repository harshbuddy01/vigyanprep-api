require('dotenv').config();

module.exports = {
  app: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || 'secret'
  },
  db: {
    provider: process.env.DB_PROVIDER || 'mongodb', // 'mongodb' or 'supabase'
    mongoUri: process.env.MONGODB_URI,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  }
};
