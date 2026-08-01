import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://wwucatnjiaglqsyvazyk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.warn('⚠️  WARNING: SUPABASE_KEY is missing from environment variables!');
}

export const supabase = createClient(supabaseUrl, supabaseKey || '', {
  auth: { persistSession: false },
  realtime: {
    transport: WebSocket
  }
});

export default supabase;
