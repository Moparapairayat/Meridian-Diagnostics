import 'server-only';
// Admin client (secret key, bypasses RLS). Server only.
// Allowed uses (SPEC 3.1): patient portal, verify page, notifications, cron,
// PDF upload and signed URLs. Code using it must enforce access rules itself
// and write audit rows explicitly. Never use it for staff data access.
// scripts/*.ts must NOT import this file; they create their own client.
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error('Supabase admin client is not configured.');
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
