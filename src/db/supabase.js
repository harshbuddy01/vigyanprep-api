const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

const supabaseUrl = config.db.supabaseUrl;
const supabaseKey = config.db.supabaseKey;

let supabase = null;

if (config.db.provider === 'supabase') {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and Key must be provided when DB_PROVIDER is supabase');
  }
  supabase = createClient(supabaseUrl, supabaseKey);
}

module.exports = { supabase };
