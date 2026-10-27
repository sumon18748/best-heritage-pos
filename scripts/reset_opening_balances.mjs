import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qvlbgwrvvuhgdovxipyf.supabase.co';
const supabaseAnonKey = 'sb_publishable_v9DjNWKxMJz7zpf48i7R-g_1Sazv29g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function resetOpeningBalances() {
  console.log('Fetching all opening balance records...');
  const { data, error: fetchErr } = await supabase
    .from('branch_opening_balances')
    .select('id');

  if (fetchErr) {
    console.error('Fetch error:', fetchErr.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('No opening balance records found. Nothing to reset.');
    return;
  }

  console.log(`Found ${data.length} records. Deleting all...`);

  const { error: delErr } = await supabase
    .from('branch_opening_balances')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows

  if (delErr) {
    console.error('Delete error:', delErr.message);
    process.exit(1);
  }

  console.log('✅ All opening balances reset to zero (table cleared).');
  console.log('Opening cash will now auto-calculate from previous day closing = 0.');
}

resetOpeningBalances();
