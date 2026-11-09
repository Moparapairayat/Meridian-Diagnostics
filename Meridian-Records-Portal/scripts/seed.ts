// Demo data seed (SPEC 15). Wipes demo tables (not schema) and recreates
// demo auth users, so it is safe to run again. Synthetic data only.
// Uses the secret key: the database treats it as the trusted server, so
// orders are inserted directly in their final status with historical times.
import { randomUUID } from 'node:crypto';
import type { PostgrestError } from '@supabase/supabase-js';
import type { TablesInsert } from '../src/lib/database.types';
import { DEMO_STAFF, createScriptAdminClient, plusAddress, requireEnv, type Db } from './lib/env';
import {
  AMEND_REASONS,
  BRANCHES,
  FIRST_NAMES_FEMALE,
  FIRST_NAMES_MALE,
  KB_ARTICLES,
  LAST_NAMES,
  RETEST_REASONS,
  TESTS,
  type BranchCode,
} from './lib/demo-data';

if (process.env.DEMO_MODE !== 'true') {
  console.error('Refusing to seed: DEMO_MODE is not "true" in .env.local.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Deterministic randomness, so every run produces the same demo story.
// ---------------------------------------------------------------------------
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261109);
const between = (min: number, max: number) => min + (max - min) * rand();
const intBetween = (min: number, max: number) => Math.floor(between(min, max + 1));
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}
function pickDistinct<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < count && pool.length > 0) {
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return out;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const NOW = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();
const dhakaDate = (ms: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(ms),
  );

const VERIFY_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789';
const usedVerifyCodes = new Set<string>();
function verifyCode(): string {
  for (;;) {
    let code = '';
    for (let i = 0; i < 10; i++) code += VERIFY_ALPHABET[Math.floor(rand() * VERIFY_ALPHABET.length)];
    if (!usedVerifyCodes.has(code)) {
      usedVerifyCodes.add(code);
      return code;
    }
  }
}

async function must(promise: PromiseLike<{ error: PostgrestError | null }>, label: string): Promise<void> {
  const { error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Wipe
// ---------------------------------------------------------------------------
async function wipe(db: Db): Promise<void> {
  // Child tables first. audit_log is append-only by design and is kept.
  await must(db.from('notifications').delete().not('id', 'is', null), 'wipe notifications');
  await must(db.from('portal_otps').delete().not('id', 'is', null), 'wipe portal_otps');
  await must(db.from('portal_locks').delete().not('patient_id', 'is', null), 'wipe portal_locks');
  await must(db.from('results').delete().not('id', 'is', null), 'wipe results');
  await must(db.from('reports').delete().not('id', 'is', null), 'wipe reports');
  await must(db.from('invoices').delete().not('id', 'is', null), 'wipe invoices');
  await must(db.from('order_items').delete().not('id', 'is', null), 'wipe order_items');
  await must(db.from('orders').delete().not('id', 'is', null), 'wipe orders');
  await must(db.from('patients').delete().not('id', 'is', null), 'wipe patients');
  await must(db.from('kb_articles').delete().not('id', 'is', null), 'wipe kb_articles');
  await must(db.from('staff_profiles').delete().not('user_id', 'is', null), 'wipe staff_profiles');
  await must(db.from('test_analytes').delete().not('id', 'is', null), 'wipe test_analytes');
  await must(db.from('test_catalog').delete().not('code', 'is', null), 'wipe test_catalog');
  await must(db.from('branches').delete().not('id', 'is', null), 'wipe branches');
}

async function emptyReportsBucket(db: Db): Promise<number> {
  const bucket = db.storage.from('reports');
  const { data: top, error } = await bucket.list('', { limit: 1000 });
  if (error) throw new Error(`list reports bucket: ${error.message}`);
  const paths: string[] = [];
  for (const entry of top ?? []) {
    if (entry.id) {
      paths.push(entry.name); // file at the root
      continue;
    }
    const { data: files, error: listError } = await bucket.list(entry.name, { limit: 1000 });
    if (listError) throw new Error(`list reports/${entry.name}: ${listError.message}`);
    for (const file of files ?? []) paths.push(`${entry.name}/${file.name}`);
  }
  for (let i = 0; i < paths.length; i += 100) {
    const { error: removeError } = await bucket.remove(paths.slice(i, i + 100));
    if (removeError) throw new Error(`remove report files: ${removeError.message}`);
  }
  return paths.length;
}

async function recreateStaffUsers(db: Db, inbox: string, password: string) {
  const wanted = new Map(DEMO_STAFF.map((s) => [plusAddress(inbox, s.tag).toLowerCase(), s]));

  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`list users: ${error.message}`);
    for (const user of data.users) {
      if (user.email && wanted.has(user.email.toLowerCase())) {
        const { error: delError } = await db.auth.admin.deleteUser(user.id);
        if (delError) throw new Error(`delete demo user: ${delError.message}`);
      }
    }
    if (data.users.length < 1000) break;
  }

  const created: { id: string; email: string; staff: (typeof DEMO_STAFF)[number] }[] = [];
  for (const [email, staff] of wanted) {
    const { data, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: staff.fullName },
    });
    if (error || !data.user) throw new Error(`create demo user (${staff.tag}): ${error?.message ?? 'no user'}`);
    created.push({ id: data.user.id, email, staff });
  }
  return created;
}

// ---------------------------------------------------------------------------
// Story generation
// ---------------------------------------------------------------------------
type Status = 'registered' | 'collected' | 'in_lab' | 'resulted' | 'released' | 'downloaded';

interface PatientPlan {
  id: string;
  branch: BranchCode;
  registeredAt: number;
  row: TablesInsert<'patients'>;
}

interface OrderPlan {
  id: string;
  patientIdx: number;
  branch: BranchCode;
  createdAt: number;
  status: Status;
  forcedStatus?: Status;
  retest?: 'completed' | 'waiting';
  amended?: boolean;
}

function makePatients(inbox: string, branchIds: Map<BranchCode, string>, creatorFor: (b: BranchCode) => string | null) {
  const names = new Set<string>();
  const phones = new Set<string>();
  const patients: PatientPlan[] = [];
  const todayAges = [0.3, 0.8, 1.2]; // hours: three patients registered today

  for (let i = 0; i < 30; i++) {
    const branch: BranchCode = i < 2 ? 'CEN' : BRANCHES[i % BRANCHES.length].code;
    const sex = rand() < 0.5 ? 'female' : 'male';
    let fullName = '';
    do {
      fullName = `${pick(sex === 'female' ? FIRST_NAMES_FEMALE : FIRST_NAMES_MALE)} ${pick(LAST_NAMES)}`;
    } while (names.has(fullName));
    names.add(fullName);

    let phone = '';
    do {
      phone = `01${intBetween(3, 9)}${String(intBetween(0, 99_999_999)).padStart(8, '0')}`;
    } while (phones.has(phone));
    phones.add(phone);

    const registeredAt = i >= 27 ? NOW - todayAges[i - 27] * HOUR - 5 * MINUTE : NOW - between(2.2, 30) * DAY;
    const demoEmail = i === 0 ? plusAddress(inbox, 'patient1') : i === 1 ? plusAddress(inbox, 'patient2') : null;
    const id = randomUUID();

    patients.push({
      id,
      branch,
      registeredAt,
      row: {
        id,
        full_name: fullName,
        age_years: intBetween(2, 82),
        sex,
        phone,
        email: demoEmail,
        email_opt_in: demoEmail !== null,
        preferred_channel: demoEmail ? 'email' : 'sms_demo',
        language: i === 1 ? 'en' : i === 0 ? 'bn' : rand() < 0.7 ? 'bn' : 'en',
        registered_branch_id: branchIds.get(branch)!,
        consent_given_at: iso(registeredAt),
        consent_version: '2026-11-v1',
        created_by: creatorFor(branch),
        created_at: iso(registeredAt),
      },
    });
  }
  return patients;
}

function makeOrders(patients: PatientPlan[]): OrderPlan[] {
  const orders: OrderPlan[] = [];
  const otherBranch = (b: BranchCode): BranchCode => pick(BRANCHES.filter((x) => x.code !== b)).code;

  // 1) First order for each older patient, five minutes after registration.
  for (let i = 0; i < 27; i++) {
    orders.push({
      id: randomUUID(),
      patientIdx: i,
      branch: patients[i].branch,
      createdAt: patients[i].registeredAt + 5 * MINUTE,
      status: 'released',
      forcedStatus: i < 2 ? 'released' : undefined, // portal demo patients have a report waiting
    });
  }

  // 2) Recent orders that make up today's worklists.
  const recent: [Status, number[]][] = [
    ['registered', [0.3, 0.8, 1.2, 1.7]],
    ['collected', [2.2, 2.8, 3.5]],
    ['in_lab', [4.5, 6, 7.5, 8.5, 9.5]],
    ['resulted', [11, 14, 17, 20, 23]],
  ];
  let todayPatient = 27;
  for (const [status, ages] of recent) {
    for (const age of ages) {
      const createdAt = NOW - age * HOUR;
      const patientIdx = status === 'registered' && todayPatient < 30 ? todayPatient++ : intBetween(2, 26);
      const home = patients[patientIdx].branch;
      orders.push({
        id: randomUUID(),
        patientIdx,
        branch: patientIdx >= 27 || rand() < 0.75 ? home : otherBranch(home),
        createdAt,
        status,
        retest: status === 'in_lab' && age >= 8.5 ? 'waiting' : undefined,
      });
    }
  }

  // 3) Older follow-up orders (returning patients, sometimes at another branch).
  while (orders.length < 60) {
    const patientIdx = intBetween(2, 26);
    const p = patients[patientIdx];
    if (p.registeredAt > NOW - 4 * DAY) continue;
    const home = p.branch;
    orders.push({
      id: randomUUID(),
      patientIdx,
      branch: rand() < 0.7 ? home : otherBranch(home),
      createdAt: between(p.registeredAt + DAY, NOW - 2.5 * DAY),
      status: 'released',
    });
  }

  // Older orders: mostly downloaded, some still waiting in the portal.
  const older = orders.filter((o) => o.createdAt < NOW - 2 * DAY);
  for (const o of older) {
    o.status = o.forcedStatus ?? (rand() < 0.3 ? 'released' : 'downloaded');
  }
  // Completed re-tests and amended reports among the older orders.
  const candidates = older.filter((o) => !o.forcedStatus);
  const chosen = pickDistinct(candidates, 5);
  chosen.slice(0, 3).forEach((o) => (o.retest = 'completed'));
  chosen.slice(3, 5).forEach((o) => (o.amended = true));

  return orders.sort((a, b) => a.createdAt - b.createdAt);
}

interface Timeline {
  collected_at: string | null;
  in_lab_at: string | null;
  resulted_at: string | null;
  released_at: string | null;
  downloaded_at: string | null;
  status: Status;
}

function timeline(o: OrderPlan): Timeline {
  const t: Timeline = { collected_at: null, in_lab_at: null, resulted_at: null, released_at: null, downloaded_at: null, status: o.status };
  if (o.status === 'registered') return t;

  const collected = o.createdAt + between(10, 40) * MINUTE;
  t.collected_at = iso(collected);
  if (o.status === 'collected') return t;

  let inLab = collected + between(30, 60) * MINUTE;
  if (o.retest === 'waiting') inLab = o.createdAt + 6 * HOUR; // back in the lab after a re-test request
  t.in_lab_at = iso(inLab);
  if (o.status === 'in_lab') return t;

  const resulted = inLab + between(2, 6) * HOUR;
  t.resulted_at = iso(resulted);
  if (o.status === 'resulted') return t;

  const released = resulted + between(1, 5) * HOUR;
  t.released_at = iso(released);
  if (o.status === 'released') return t;

  const late = rand() < 0.12;
  const downloaded = released + (late ? between(8, 10) * DAY : between(1 * HOUR, 5 * DAY));
  if (downloaded > NOW - 10 * MINUTE) {
    t.status = 'released';
    return t;
  }
  t.downloaded_at = iso(downloaded);
  return t;
}

function analyserValue(low: number, high: number, decimals: number): number {
  const span = high - low;
  const r = rand();
  let v: number;
  if (r < 0.075 && low > 0) v = low * between(0.7, 0.95);
  else if (r < 0.15) v = high * between(1.08, 1.4) + (high === 0 ? 1 : 0);
  else v = between(low + span * 0.1, high - span * 0.1);
  return Number(v.toFixed(decimals));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const inbox = requireEnv('DEMO_INBOX');
  const password = requireEnv('SEED_DEMO_PASSWORD');
  if (password.length < 10) throw new Error('SEED_DEMO_PASSWORD must be at least 10 characters.');
  const db = createScriptAdminClient();

  console.log('Wiping demo data…');
  await wipe(db);
  const removedFiles = await emptyReportsBucket(db);

  console.log('Recreating demo staff accounts…');
  const staffUsers = await recreateStaffUsers(db, inbox, password);

  // Branches
  const { data: branchRows, error: branchError } = await db
    .from('branches')
    .insert(BRANCHES.map((b) => ({ name: b.name, code: b.code })))
    .select('id, code');
  if (branchError || !branchRows) throw new Error(`insert branches: ${branchError?.message}`);
  const branchIds = new Map(branchRows.map((b) => [b.code as BranchCode, b.id]));

  // Staff profiles
  await must(
    db.from('staff_profiles').insert(
      staffUsers.map((u) => ({
        user_id: u.id,
        full_name: u.staff.fullName,
        role: u.staff.role,
        branch_id: branchIds.get(u.staff.branch)!,
        notify_email: u.email,
        active: true,
      })),
    ),
    'insert staff_profiles',
  );
  const staffId = (tag: (typeof DEMO_STAFF)[number]['tag']) => staffUsers.find((u) => u.staff.tag === tag)!.id;
  const creatorFor = (b: BranchCode) => (b === 'CEN' ? staffId('reception.central') : b === 'NOR' ? staffId('reception.north') : null);

  // Test catalog
  await must(
    db.from('test_catalog').insert(
      TESTS.map((t) => ({ code: t.code, name: t.name, specimen: t.specimen, price_bdt: t.price, prep_en: t.prepEn, prep_bn: t.prepBn, active: true })),
    ),
    'insert test_catalog',
  );
  await must(
    db.from('test_analytes').insert(
      TESTS.flatMap((t) =>
        t.analytes.map((a) => ({ test_code: t.code, analyte: a.analyte, unit: a.unit, ref_low: a.low, ref_high: a.high, decimals: a.decimals })),
      ),
    ),
    'insert test_analytes',
  );

  // Patients (chronological, so DB-generated patient codes follow registration order)
  const patients = makePatients(inbox, branchIds, creatorFor);
  const patientsByTime = [...patients].sort((a, b) => a.registeredAt - b.registeredAt);
  await must(db.from('patients').insert(patientsByTime.map((p) => p.row)), 'insert patients');
  const { data: codeRows, error: codeError } = await db.from('patients').select('id, patient_code');
  if (codeError || !codeRows) throw new Error(`read patient codes: ${codeError?.message}`);
  const patientCode = new Map(codeRows.map((r) => [r.id, r.patient_code]));

  // Orders, items, invoices, results, reports
  const orders = makeOrders(patients);
  const orderRows: TablesInsert<'orders'>[] = [];
  const itemRows: TablesInsert<'order_items'>[] = [];
  const invoiceRows: TablesInsert<'invoices'>[] = [];
  const resultRows: TablesInsert<'results'>[] = [];
  const reportRows: TablesInsert<'reports'>[] = [];
  const sampleCounter = new Map<string, number>();
  let corrections = 0;
  let retestReason = 0;
  let amendReason = 0;

  for (const o of orders) {
    const patient = patients[o.patientIdx];
    const t = timeline(o);
    const testCount = rand() < 0.5 ? 1 : rand() < 0.7 ? 2 : 3;
    const tests = pickDistinct(TESTS, testCount);
    const retestCount = o.retest ? 1 : 0;

    orderRows.push({
      id: o.id,
      patient_id: patient.id,
      branch_id: branchIds.get(o.branch)!,
      status: t.status,
      retest_count: retestCount,
      retest_reason: o.retest ? RETEST_REASONS[retestReason++ % RETEST_REASONS.length] : null,
      created_by: creatorFor(o.branch),
      created_at: iso(o.createdAt),
      collected_at: t.collected_at,
      in_lab_at: t.in_lab_at,
      resulted_at: t.resulted_at,
      released_at: t.released_at,
      downloaded_at: t.downloaded_at,
    });

    invoiceRows.push({
      order_id: o.id,
      amount_bdt: tests.reduce((sum, x) => sum + x.price, 0),
      paid: !(t.status === 'registered' && rand() < 0.5),
      created_at: iso(o.createdAt),
    });

    const hasResults = t.resulted_at !== null;
    for (const test of tests) {
      const n = (sampleCounter.get(patient.id) ?? 0) + 1;
      sampleCounter.set(patient.id, n);
      const itemId = randomUUID();
      itemRows.push({
        id: itemId,
        order_id: o.id,
        test_code: test.code,
        sample_barcode: `${patientCode.get(patient.id)}-S${String(n).padStart(2, '0')}`,
      });

      if (!hasResults) continue;
      for (const a of test.analytes) {
        const corrected = corrections < 2 && rand() < 0.03;
        if (corrected) corrections++;
        resultRows.push({
          order_item_id: itemId,
          analyte: a.analyte,
          value: analyserValue(a.low, a.high, a.decimals),
          unit: a.unit,
          ref_low: a.low,
          ref_high: a.high,
          source: corrected ? 'manual_correction' : 'analyser',
          correction_reason: corrected ? 'Re-run after analyser calibration check' : null,
          entered_by: staffId('lab'),
          entered_at: t.resulted_at!,
        });
      }
    }

    if (t.released_at) {
      const releasedAt = Date.parse(t.released_at);
      reportRows.push({
        order_id: o.id,
        version: 1,
        status: o.amended ? 'superseded' : 'released',
        signed_by: staffId('patho'),
        signed_at: t.released_at,
        pdf_path: null,
        verify_code: verifyCode(),
      });
      if (o.amended) {
        reportRows.push({
          order_id: o.id,
          version: 2,
          status: 'released',
          signed_by: staffId('patho'),
          signed_at: iso(Math.min(releasedAt + between(2, 20) * HOUR, NOW - 5 * MINUTE)),
          pdf_path: null,
          verify_code: verifyCode(),
          amend_reason: AMEND_REASONS[amendReason++ % AMEND_REASONS.length],
        });
      }
    }
  }

  await must(db.from('orders').insert(orderRows), 'insert orders');
  await must(db.from('order_items').insert(itemRows), 'insert order_items');
  await must(db.from('invoices').insert(invoiceRows), 'insert invoices');
  for (let i = 0; i < resultRows.length; i += 500) {
    await must(db.from('results').insert(resultRows.slice(i, i + 500)), 'insert results');
  }
  await must(db.from('reports').insert(reportRows), 'insert reports');

  // Knowledge Hub
  await must(
    db.from('kb_articles').insert(
      KB_ARTICLES.map((a) => ({
        slug: a.slug,
        category: a.category,
        title_en: a.titleEn,
        title_bn: a.titleBn,
        body_en: a.bodyEn,
        body_bn: a.bodyBn,
        owner_id: staffId('manager'),
        version: a.version,
        review_date: dhakaDate(NOW + a.reviewInDays * DAY),
        updated_at: iso(NOW - between(5, 60) * DAY),
        published: true,
      })),
    ),
    'insert kb_articles',
  );

  await must(db.from('app_settings').upsert({ id: 1, require_manager_mfa: false }), 'upsert app_settings');

  // -------------------------------------------------------------------------
  // Summary (no passwords, no patient names or phone numbers)
  // -------------------------------------------------------------------------
  const byStatus = orderRows.reduce<Record<string, number>>((acc, o) => {
    acc[o.status!] = (acc[o.status!] ?? 0) + 1;
    return acc;
  }, {});
  console.log('\nSeed complete.');
  console.table({
    branches: BRANCHES.length,
    staff: staffUsers.length,
    tests: TESTS.length,
    patients: patients.length,
    'patients registered today': patients.filter((p) => dhakaDate(p.registeredAt) === dhakaDate(NOW)).length,
    orders: orderRows.length,
    'orders with re-test': orderRows.filter((o) => (o.retest_count ?? 0) > 0).length,
    'amended reports': orders.filter((o) => o.amended).length,
    results: resultRows.length,
    reports: reportRows.length,
    'kb articles': KB_ARTICLES.length,
    'kb reviews overdue': KB_ARTICLES.filter((a) => a.reviewInDays < 0).length,
    'old report files removed': removedFiles,
  });
  console.log('Orders by status:');
  console.table(byStatus);
  console.log('Demo staff logins (password = SEED_DEMO_PASSWORD):');
  console.table(staffUsers.map((u) => ({ email: u.email, role: u.staff.role, branch: u.staff.branch })));
  console.log('Portal demo patients (email OTP):');
  console.table(patients.slice(0, 2).map((p) => ({ patient_code: patientCode.get(p.id), email: p.row.email })));
}

main().catch((err: unknown) => {
  console.error('Seed failed:', err instanceof Error ? err.message : 'unknown error');
  process.exit(1);
});
