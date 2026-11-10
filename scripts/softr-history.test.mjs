import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { decodeSoftrArchive } from './softr-archive.mjs';
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

const archiveTableIds = {
  products: 'yBg8PjqD7zRU7J', scenarios: 'd9JdBdtgBZvXBv', decisions: 'vBQOXSAciKnZFw',
  datasets: 'xFjXoMY8AEM85y', aiRequests: 'sYjhtglIOT61Tv', testFeedback: 'GrPIYH8dfuu2KE',
  advisorVotes: 'OpxJ1wWvMPbC9m',
};

function archivePage(data, offset, total) {
  const body = Buffer.from(JSON.stringify({ data, metadata: { offset, limit: 1, total } }));
  return {
    offset, count: data.length,
    sha256: createHash('sha256').update(body).digest('hex'),
    responseBase64: body.toString('base64'),
  };
}

function archiveFixture(records = snapshot) {
  return {
    format: 'cp-retail-softr-record-pages-v1',
    databaseId: '46d15e55-e03a-437d-bd06-8bdc35b79943',
    startedAtUtc: timestamp,
    tables: Object.fromEntries(Object.entries(archiveTableIds).map(([name, tableId]) => {
      const rows = records[name];
      const pages = rows.length ? rows.map((row, offset) => archivePage([row], offset, rows.length)) : [archivePage([], 0, 0)];
      return [name, { tableId, count: rows.length, pages }];
    })),
    completedAtUtc: timestamp,
  };
}

test('a page archive preserves raw fields, record order and empty tables', () => {
  const historical = {
    ...snapshot, advisorVotes: [],
    products: [{ ...snapshot.products[0], tableId: archiveTableIds.products, updatedAt: '2026-11-10T08:00:00+08:00', fields: {
      ...snapshot.products[0].fields, extra: { '合成数据': '2026-11-10T08:00:00+08:00', numeric: 62.51 },
    } }],
  };
  assert.deepEqual(decodeSoftrArchive(archiveFixture(historical)), historical);
  assert.equal(decodeSoftrArchive(snapshot), snapshot);
});

test('archive identity, pagination and byte integrity failures are rejected', () => {
  const invalid = [
    archive => { archive.databaseId = 'wrong-database'; },
    archive => { archive.tables.scenarios.tableId = archiveTableIds.products; },
    archive => { delete archive.tables.products; },
    archive => { archive.tables.scenarios.pages.reverse(); },
    archive => { archive.tables.scenarios.pages.pop(); },
    archive => { archive.tables.products.pages[0].count = 0; },
    archive => { archive.tables.products.pages[0].sha256 = '0'.repeat(64); },
    archive => { archive.tables.products.pages[0].responseBase64 += '\n'; },
    archive => { archive.tables.products.pages[0] = archivePage(snapshot.products, 0, 2); },
    archive => { archive.tables.products.pages[0] = archivePage([{ ...snapshot.products[0], tableId: archiveTableIds.datasets }], 0, 1); },
    archive => { archive.tables.scenarios.pages[1] = archivePage([snapshot.scenarios[0]], 1, 3); },
  ];
  for (const mutate of invalid) {
    const archive = archiveFixture();
    mutate(archive);
    assert.throws(() => decodeSoftrArchive(archive), /^Error: The Softr archive is incomplete or invalid\.$/);
  }
});

test('both stdin commands accept an archive without printing source data', () => {
  const archive = archiveFixture();
  const validator = fileURLToPath(new URL('./softr-history.mjs', import.meta.url));
  const summary = spawnSync(process.execPath, [validator], { encoding: 'utf8', input: JSON.stringify(archive) });
  assert.equal(summary.status, 0, summary.stderr);
  assert.deepEqual(JSON.parse(summary.stdout), summarizeSoftrHistory(prepareSoftrHistory(snapshot)));

  const importer = fileURLToPath(new URL('./import-softr-history.mjs', import.meta.url));
  const runImport = () => spawnSync(process.execPath, [importer, '--apply'], {
    encoding: 'utf8', input: JSON.stringify(archive),
    env: { ...process.env, PGHOST: 'unused.invalid', PGDATABASE: 'unused', PGUSER: 'unused' },
  });
  const gated = runImport();
  assert.equal(gated.status, 1);
  assert.equal(gated.stdout, '');
  assert.equal(gated.stderr.trim(), 'Retain the original export in approved private storage before applying a plan with quarantined records.');

  // Give the broken JSON the correct digest to test the parser's redacted diagnostic.
  const invalidJson = Buffer.from('{\n"unparseable-private-fixture"');
  Object.assign(archive.tables.products.pages[0], {
    sha256: createHash('sha256').update(invalidJson).digest('hex'), responseBase64: invalidJson.toString('base64'),
  });
  const invalid = runImport();
  assert.equal(invalid.status, 1);
  assert.equal(invalid.stdout, '');
  assert.equal(invalid.stderr.trim(), 'The Softr archive is incomplete or invalid.');
});

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
