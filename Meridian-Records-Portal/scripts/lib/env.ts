// Shared setup for scripts/*.ts. Loads .env.local and builds Supabase clients.
// Scripts must not import src/lib/supabase/admin.ts (it uses `server-only`),
// so the admin client is created here.
import { config } from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/lib/database.types';

config({ path: '.env.local', quiet: true });

export type Db = SupabaseClient<Database>;

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in .env.local (see .env.example).`);
  }
  return value;
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/** Secret-key client: bypasses RLS. The database treats it as the trusted server. */
export function createScriptAdminClient(): Db {
  return createClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SECRET_KEY'),
    noSession,
  );
}

/** Publishable-key client: what a browser or a signed-in staff member gets. */
export function createPublishableClient(): Db {
  return createClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    noSession,
  );
}

/** Builds a Gmail-style plus-address: student@gmail.com + "lab" -> student+lab@gmail.com */
export function plusAddress(inbox: string, tag: string): string {
  const at = inbox.indexOf('@');
  if (at < 1) throw new Error('DEMO_INBOX must be an email address.');
  return `${inbox.slice(0, at)}+${tag}@${inbox.slice(at + 1)}`;
}

/** Demo staff accounts (SPEC 15). */
export const DEMO_STAFF = [
  { tag: 'reception.central', fullName: 'Nusrat Jahan', role: 'receptionist', branch: 'CEN' },
  { tag: 'reception.north', fullName: 'Tanvir Hasan', role: 'receptionist', branch: 'NOR' },
  { tag: 'collector', fullName: 'Shirin Akter', role: 'sample_collector', branch: 'CEN' },
  { tag: 'lab', fullName: 'Arif Hossain', role: 'lab_technician', branch: 'CEN' },
  { tag: 'patho', fullName: 'Dr Farhana Rahman', role: 'pathologist', branch: 'CEN' },
  { tag: 'manager', fullName: 'Kamrul Islam', role: 'manager', branch: 'CEN' },
] as const;

export type DemoStaffTag = (typeof DEMO_STAFF)[number]['tag'];
