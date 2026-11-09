// Demo data seed (SPEC section 15). Implemented in a later phase.
// Must create its own admin client; never import src/lib/supabase/admin.ts.
import { config } from 'dotenv';

config({ path: '.env.local' });

if (process.env.DEMO_MODE !== 'true') {
  console.error('Refusing to seed: DEMO_MODE is not "true".');
  process.exit(1);
}

console.log('Seed is not implemented yet (planned for a later phase).');
