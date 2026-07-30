import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://nmtixpogvdfyqvgkzzfs.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tdGl4cG9ndmRmeXF2Z2t6emZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzNzMzOTQsImV4cCI6MjA1Njk0OTM5NH0.F9G4pL0m0MvY71d';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { disabled: true }
});

export default supabase;
