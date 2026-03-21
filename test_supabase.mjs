import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkTables() {
  const tables = ['users', 'events', 'jobs', 'notifications', 'registrations', 'applications'];
  console.log('Checking tables in Supabase...');
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table "${table}": ERROR - ${error.message} (Code: ${error.code})`);
    } else {
      console.log(`Table "${table}": OK - ${data.length} rows found (subset)`);
    }
  }
}

checkTables();
