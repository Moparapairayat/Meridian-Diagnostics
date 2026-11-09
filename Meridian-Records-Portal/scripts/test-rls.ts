// RLS test script (SPEC 18.1). Signs in as each demo role with the
// PUBLISHABLE key, tries allowed and forbidden actions, and writes a PASS/FAIL
// table to docs/test-results/rls.md. Exits non-zero if any case fails.
// Temporary rows created for a test are removed again with the secret key.
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { DEMO_STAFF, createPublishableClient, createScriptAdminClient, plusAddress, requireEnv, type Db, type DemoStaffTag } from './lib/env';

interface CaseResult {
  id: string;
  role: string;
  action: string;
  expected: string;
  actual: string;
  pass: boolean;
}

const results: CaseResult[] = [];
function record(id: string, role: string, action: string, expected: string, actual: string, pass: boolean) {
  results.push({ id, role, action, expected, actual, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id.padEnd(4)} ${role.padEnd(18)} ${action}`);
}

/** Short, non-personal description of a PostgREST outcome. */
function outcome(error: { code?: string; message: string } | null, rows?: number): string {
  if (error) return `denied (${error.code ?? 'error'})`;
  return rows === undefined ? 'allowed' : `${rows} row(s)`;
}

async function signIn(tag: DemoStaffTag, inbox: string, password: string): Promise<Db> {
  const client = createPublishableClient();
  const { error } = await client.auth.signInWithPassword({ email: plusAddress(inbox, tag), password });
  if (error) throw new Error(`Sign-in failed for ${tag}: ${error.message}. Run "npm run seed" first.`);
  return client;
}

async function main() {
  const inbox = requireEnv('DEMO_INBOX');
  const password = requireEnv('SEED_DEMO_PASSWORD');
  const admin = createScriptAdminClient();
  const anon = createPublishableClient();

  const c: Record<DemoStaffTag, Db> = {} as Record<DemoStaffTag, Db>;
  for (const s of DEMO_STAFF) c[s.tag] = await signIn(s.tag, inbox, password);

  // ---- fixtures (read with the secret key) ----
  const { data: branches } = await admin.from('branches').select('id, code');
  const branch = (code: string) => branches!.find((b) => b.code === code)!.id;
  const { data: centralPatient } = await admin
    .from('patients').select('id, patient_code').eq('registered_branch_id', branch('CEN')).limit(1).single();
  const { data: anyResult } = await admin.from('results').select('id, value').limit(1).single();
  const { data: resultedOrder } = await admin.from('orders').select('id').eq('status', 'resulted').limit(1).single();
  const { data: registeredOrder } = await admin.from('orders').select('id').eq('status', 'registered').limit(1).single();
  if (!centralPatient || !anyResult || !resultedOrder || !registeredOrder) {
    throw new Error('Demo data missing. Run "npm run seed" first.');
  }
  const cleanupPatients: string[] = [];
  const cleanupOrders: string[] = [];

  // 1. Receptionist cannot select results
  {
    const { data, error } = await c['reception.central'].from('results').select('id');
    record('1', 'receptionist', 'select results', '0 rows', outcome(error, data?.length), !error && data?.length === 0);
  }

  // 2. Receptionist cannot update results
  {
    const { data, error } = await c['reception.central']
      .from('results').update({ value: 0 }).eq('id', anyResult.id).select('id');
    const { data: after } = await admin.from('results').select('value').eq('id', anyResult.id).single();
    const unchanged = after?.value === anyResult.value;
    record('2', 'receptionist', 'update a result value', '0 rows, value unchanged',
      `${outcome(error, data?.length)}, value ${unchanged ? 'unchanged' : 'CHANGED'}`,
      (!!error || data?.length === 0) && unchanged);
  }

  // 3. Receptionist cannot insert a patient for another branch
  {
    const { error } = await c['reception.central'].from('patients').insert({
      full_name: 'Rls Test Other Branch', age_years: 30, sex: 'female', phone: '01700000001',
      registered_branch_id: branch('NOR'), consent_version: 'rls-test',
    });
    record('3', 'receptionist (CEN)', 'insert patient for North branch', 'denied', outcome(error), !!error);
  }

  // 4. Sample collector cannot release a report
  {
    const { error: rpcError } = await c.collector.rpc('release_order', {
      p_order_id: resultedOrder.id, p_verify_code: 'RLSTEST234', p_pdf_path: '',
    });
    const { data, error } = await c.collector.from('orders').update({ status: 'released' }).eq('id', resultedOrder.id).select('id');
    const blocked = !!rpcError && (!!error || data?.length === 0);
    record('4', 'sample_collector', 'release_order() and status -> released', 'denied',
      `rpc ${outcome(rpcError)}, update ${outcome(error, data?.length)}`, blocked);
  }

  // 5. Lab technician cannot e-sign
  {
    const { error: rpcError } = await c.lab.rpc('release_order', {
      p_order_id: resultedOrder.id, p_verify_code: 'RLSTEST234', p_pdf_path: '',
    });
    const { error: insertError } = await c.lab.from('reports').insert({
      order_id: resultedOrder.id, version: 1, verify_code: 'RLSTEST235',
    });
    record('5', 'lab_technician', 'release_order() and insert report', 'denied',
      `rpc ${outcome(rpcError)}, insert ${outcome(insertError)}`, !!rpcError && !!insertError);
  }

  // 6. Pathologist cannot read audit_log
  {
    const { data, error } = await c.patho.from('audit_log').select('id').limit(5);
    record('6', 'pathologist', 'select audit_log', '0 rows', outcome(error, data?.length), !error && data?.length === 0);
  }

  // 7. Manager can read audit_log
  {
    const { data, error } = await c.manager.from('audit_log').select('id').limit(5);
    record('7', 'manager', 'select audit_log', '> 0 rows', outcome(error, data?.length), !error && (data?.length ?? 0) > 0);
  }

  // 8. Anonymous user cannot read patients
  {
    const { data, error } = await anon.from('patients').select('id').limit(1);
    record('8', 'anon', 'select patients', 'denied', outcome(error, data?.length), !!error || data?.length === 0);
  }

  // 9. Nobody can update or delete audit_log
  {
    const { data: row } = await admin.from('audit_log').select('id').order('id').limit(1).single();
    const id = row!.id;
    const mUpd = await c.manager.from('audit_log').update({ action: 'tampered' }).eq('id', id).select('id');
    const mDel = await c.manager.from('audit_log').delete().eq('id', id).select('id');
    const aUpd = await admin.from('audit_log').update({ action: 'tampered' }).eq('id', id).select('id');
    const aDel = await admin.from('audit_log').delete().eq('id', id).select('id');
    const { data: still } = await admin.from('audit_log').select('action').eq('id', id).single();
    const blocked = [mUpd, mDel, aUpd, aDel].every((r) => !!r.error || (r.data?.length ?? 0) === 0) && still?.action !== 'tampered';
    record('9', 'manager + secret key', 'update/delete audit_log', 'denied for all',
      `manager upd ${outcome(mUpd.error, mUpd.data?.length)}, del ${outcome(mDel.error, mDel.data?.length)}; ` +
        `secret upd ${outcome(aUpd.error)}, del ${outcome(aDel.error)}`, blocked);
  }

  // 10. Illegal status jump registered -> released is rejected
  {
    const { data, error } = await c.collector.from('orders').update({ status: 'released' }).eq('id', registeredOrder.id).select('id');
    record('10', 'sample_collector', 'registered -> released', 'rejected', outcome(error, data?.length), !!error);
  }

  // 11. North receptionist can find a Central patient
  {
    const { data, error } = await c['reception.north'].from('patients').select('id').eq('patient_code', centralPatient.patient_code);
    record('11', 'receptionist (NOR)', 'search Central patient by code', '1 row', outcome(error, data?.length), !error && data?.length === 1);
  }

  // ---- extras ----

  // 12. Staff cannot back-date created_at
  {
    const { data, error } = await c['reception.central'].from('patients').insert({
      full_name: 'Rls Test Backdate', age_years: 40, sex: 'male', phone: '01700000002',
      registered_branch_id: branch('CEN'), consent_version: 'rls-test', created_at: '2020-01-01T00:00:00Z',
    }).select('id, created_at').single();
    if (data) cleanupPatients.push(data.id);
    const year = data ? new Date(data.created_at).getUTCFullYear() : null;
    record('12', 'receptionist', 'insert patient with created_at = 2020', 'created_at = now()',
      error ? outcome(error) : `created_at year ${year}`, !error && year !== 2020);
  }

  // 13. Secret key CAN move released -> downloaded (trusted server detected)
  {
    const id = randomUUID();
    cleanupOrders.push(id);
    const ins = await admin.from('orders').insert({
      id, patient_id: centralPatient.id, branch_id: branch('CEN'), status: 'released',
      created_at: new Date(Date.now() - 3600_000).toISOString(), released_at: new Date().toISOString(),
    });
    const { data, error } = await admin.from('orders').update({ status: 'downloaded' }).eq('id', id).select('status, downloaded_at').single();
    record('13', 'secret key (server)', 'released -> downloaded', 'allowed',
      ins.error ? `setup ${outcome(ins.error)}` : error ? outcome(error) : `status ${data?.status}`,
      !ins.error && !error && data?.status === 'downloaded' && !!data.downloaded_at);
  }

  // 14. Secret key CANNOT jump registered -> released
  {
    const id = randomUUID();
    cleanupOrders.push(id);
    const ins = await admin.from('orders').insert({ id, patient_id: centralPatient.id, branch_id: branch('CEN'), status: 'registered' });
    const { error } = await admin.from('orders').update({ status: 'released' }).eq('id', id);
    record('14', 'secret key (server)', 'registered -> released', 'rejected',
      ins.error ? `setup ${outcome(ins.error)}` : outcome(error), !ins.error && !!error);
  }

  // 15. Manager cannot see result values (aggregates only)
  {
    const { data, error } = await c.manager.from('results').select('id');
    record('15', 'manager', 'select results', '0 rows', outcome(error, data?.length), !error && data?.length === 0);
  }

  // 16. Receptionist cannot insert an invoice directly (only via create_order)
  {
    const { error } = await c['reception.central'].from('invoices').insert({ order_id: registeredOrder.id, amount_bdt: 1 });
    record('16', 'receptionist', 'insert invoice directly', 'denied', outcome(error), !!error);
  }

  // 17. Anonymous user cannot call create_order
  {
    const { error } = await anon.rpc('create_order', { p_patient_id: centralPatient.id, p_test_codes: ['FBS'] });
    record('17', 'anon', 'rpc create_order', 'denied', outcome(error), !!error);
  }

  // 18. Pathologist cannot mark an order downloaded (system only)
  {
    const { data: rel } = await admin.from('orders').select('id').eq('status', 'released').limit(1).single();
    const { data, error } = await c.patho.from('orders').update({ status: 'downloaded' }).eq('id', rel!.id).select('id');
    record('18', 'pathologist', 'released -> downloaded', 'rejected', outcome(error, data?.length), !!error || data?.length === 0);
  }

  // 19. Staff cannot read portal OTPs
  {
    const { data, error } = await c.manager.from('portal_otps').select('id').limit(1);
    record('19', 'manager', 'select portal_otps', '0 rows', outcome(error, data?.length), !!error || data?.length === 0);
  }

  // ---- cleanup temporary rows ----
  if (cleanupOrders.length) await admin.from('orders').delete().in('id', cleanupOrders);
  if (cleanupPatients.length) await admin.from('patients').delete().in('id', cleanupPatients);
  await Promise.all(Object.values(c).map((client) => client.auth.signOut()));

  // ---- report ----
  const passed = results.filter((r) => r.pass).length;
  const stamp = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date());
  const lines = [
    '# RLS test results',
    '',
    `Run: ${stamp} (Asia/Dhaka). Result: **${passed} of ${results.length} passed**.`,
    '',
    'Generated by `npm run test:rls`. Each staff role signs in with the publishable key (RLS applies);',
    '"secret key" rows use the server key to prove the trusted-server detection in the status trigger.',
    'Cases 1–11 are the minimum set from SPEC 18.1; 12–19 are extras.',
    '',
    '| Case | Role | Action | Expected | Actual | PASS/FAIL |',
    '|---|---|---|---|---|---|',
    ...results.map((r) => `| ${r.id} | ${r.role} | ${r.action} | ${r.expected} | ${r.actual} | ${r.pass ? 'PASS' : '**FAIL**'} |`),
    '',
  ];
  mkdirSync('docs/test-results', { recursive: true });
  writeFileSync('docs/test-results/rls.md', lines.join('\n'));
  console.log(`\n${passed}/${results.length} passed. Written to docs/test-results/rls.md`);
  if (passed !== results.length) process.exit(1);
}

main().catch((err: unknown) => {
  console.error('RLS test failed to run:', err instanceof Error ? err.message : 'unknown error');
  process.exit(1);
});
