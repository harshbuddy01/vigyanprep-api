const mongoose = require('mongoose');
const { supabase } = require('./supabase');
const config = require('../config');

const connectDB = async () => {
  if (config.db.provider === 'supabase') {
    console.log('Using Supabase as the primary database.');
    // Supabase client is already initialized in supabase.js
  } else {
    try {
      console.log('Connecting to MongoDB...');
      await mongoose.connect(config.db.mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('MongoDB connected successfully');
    } catch (error) {
      console.error('MongoDB connection failed:', error.message);
      process.exit(1);
    }
  }
};

module.exports = { connectDB };
