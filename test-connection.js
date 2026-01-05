
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(url, key);

async function testConnection() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Connection error:', error.message);
    } else {
      console.log('Connection successful! Session data:', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testConnection();
