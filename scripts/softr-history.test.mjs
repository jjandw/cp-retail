import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { prepareSoftrHistory, summarizeSoftrHistory } from './softr-history.mjs';

const timestamp = '2026-11-10T00:00:00.000Z';
const alice = 'history-a@example.invalid';
const bob = 'history-b@example.invalid';
const record = (id, fields) => ({ id, fields, createdAt: timestamp });
const scenario = (id, owner, cost) => record(id, {
  mKkbZ: owner, JrVwO: { label: owner }, '8O3bj': 'Legacy offer',
  pJbQs: { id: 'legacy-product' }, crjGF: 95, aFEq0: cost, '4FsPF': 5,
  Im1uZ: 1250, '6g9zg': 1350, tHTcw: 30, k9oe3: 'Quotes " and backslash \\ with a line break\nkept.',
});
const snapshot = {
  products: [record('legacy-product', { '7wzYX': 'Legacy product' })],
  scenarios: [scenario('legacy-a', '  HISTORY-A@example.invalid ', 62.51),
    scenario('legacy-b', bob, ''), record('legacy-empty', {})],
  decisions: [record('legacy-decision', {
    WCx8e: alice, tJKbj: 'Legacy decision', amMCr: { id: 'legacy-a' },
    kpXrI: { label: 'Pending' }, '6Src1': 'Trial first', NFs9O: '{}',
  })],
  datasets: [record('legacy-data', {
    nHOGb: alice, NAtCh: 'Demo store', q2Y8k: { label: 'Demo store' },
    p7uW5: 'demo:207', oPGHK: 1500, '7fsWK': '2026-11-05', '8ucyJ': 30,
  })],
  aiRequests: [record('legacy-review', {
    jeWoT: alice, cMQ0c: 'Old review', H6ZBD: 'legacy-a', '02Rf3': '{}', KSpPc: 'legacy',
    cP2Qs: { label: 'Queued' }, TSTsb: '', ijPNc: '', Vwg10: '',
  })],
  testFeedback: [record('legacy-test', {
    Vhyro: alice, '4FQWC': 'Old test', GUpre: 3, fbz4j: '[]', BWmF4: 4, Txzzg: 5, migJX: 4, daLng: 'legacy',
  })],
  advisorVotes: [record('legacy-vote', {
    ETHAd: alice, gmvg6: 'Old vote', eVte2: 'decision', BFDnY: 'up', '8VCpn': 'legacy-review', OGNn3: false, sd63q: 'legacy',
  })],
};

test('historical links, unknown costs, dates and owner isolation survive conversion', () => {
  const plan = prepareSoftrHistory(snapshot);
  assert.deepEqual(plan.products, [{ id: 'legacy-product', title: 'Legacy product' }]);
  const [a, b] = plan.owners;
  assert.equal(a.email, alice);
  assert.equal(b.email, bob);
  assert.equal(a.tables.decisions[0].scenario_id, 'legacy-a');
  assert.equal(b.tables.scenarios[0].unit_cost, null);
  assert.equal(a.tables.scenarios[0].created_at, timestamp);
  assert.equal(a.tables.ai_requests[0].request_status, 'Failed');
  const summary = summarizeSoftrHistory(plan);
  assert.deepEqual(summary.quarantine, { 'scenarios/missing-or-invalid-owner': 1 });
  assert.equal(summary.closedReviews, 1);
  assert.doesNotMatch(JSON.stringify(summary), /example\.invalid|legacy-a/);
});

test('a decision cannot migrate to another owner or silently replace another decision', () => {
  const crossOwner = record('wrong-owner', { ...snapshot.decisions[0].fields, WCx8e: bob });
  const duplicate = record('duplicate-decision', snapshot.decisions[0].fields);
  const plan = prepareSoftrHistory({ ...snapshot, decisions: [...snapshot.decisions, crossOwner, duplicate] });
  assert.deepEqual(summarizeSoftrHistory(plan).quarantine, {
    'scenarios/missing-or-invalid-owner': 1,
    'decisions/scenario-link-unresolved-or-cross-owner': 1,
    'decisions/duplicate-decision': 1,
  });
  assert.throws(() => prepareSoftrHistory({ ...snapshot, decisions: [...snapshot.decisions, ...snapshot.decisions] }), /Duplicate record/);
});

test('database import rolls back by default and applies only for confirmed owners', {
  skip: process.env.CP_RETAIL_LOCAL_HISTORY_QA !== '1',
}, () => {
  assert.equal(process.env.PGHOST, '127.0.0.1');
  const query = sql => {
    const result = spawnSync('psql', ['-X', '-qAtw', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  const importRows = (...args) => spawnSync(process.execPath, ['scripts/import-softr-history.mjs', ...args], {
    encoding: 'utf8', input: JSON.stringify(snapshot),
  });
  const existingCount = () => query("select count(*) from public.scenarios where id in ('legacy-a', 'legacy-b');");
  query(`insert into auth.users (id,email,email_confirmed_at) values
    ('2e61472a-776e-4ac1-b60e-000000000003', '${alice}', now()),
    ('2e61472a-776e-4ac1-b60e-000000000004', '${bob}', null);`);
  const dry = importRows();
  assert.equal(dry.status, 0, dry.stderr);
  assert.equal(JSON.parse(dry.stdout).verifiedOwners, 1);
  assert.equal(existingCount(), '0');
  assert.equal(importRows('--apply', '--quarantine-retained').status, 1);
  assert.equal(existingCount(), '0');
  query(`update auth.users set email_confirmed_at = now() where email = '${bob}';`);
  const live = importRows('--apply', '--quarantine-retained');
  assert.equal(live.status, 0, live.stderr);
  assert.equal(JSON.parse(live.stdout).eligibleRecords, 7);
  assert.equal(existingCount(), '2');
  assert.equal(query("select scenario_id from public.decisions where id = 'legacy-decision';"), 'legacy-a');
  assert.equal(query("select request_status from public.ai_requests where id = 'legacy-review';"), 'Failed');
  assert.equal(query("select gross_profit::numeric(12,2) from public.scenarios where id = 'legacy-a';"), '34675.00');
  assert.equal(importRows('--apply', '--quarantine-retained').status, 0);
  assert.equal(existingCount(), '2');
});
