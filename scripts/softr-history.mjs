import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { decodeSoftrArchive } from './softr-archive.mjs';

function text(value, min = 1, max = Infinity) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max || value.includes('\0')) {
    throw Error('invalid-text');
  }
  return value;
}

const optionalText = (value, max = Infinity) => value == null || value === '' ? null : text(value, 0, max);
const label = value => typeof value === 'object' ? value?.label : value;

function recordId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(value)) throw Error('invalid-record-id');
  return value;
}

function linkedId(value) {
  const link = Array.isArray(value) && value.length === 1 ? value[0] : value;
  if (!link || typeof link !== 'object') throw Error('missing-link');
  return recordId(link.id);
}

function ownerEmail(value, linked) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 320) throw Error('missing-or-invalid-owner');
  const linkedEmail = label(linked);
  if (typeof linkedEmail === 'string' && linkedEmail.includes('@') && linkedEmail.trim().toLowerCase() !== email) {
    throw Error('conflicting-owner');
  }
  return email;
}

function number(value, min, max, whole = true) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max
    || (whole ? !Number.isInteger(value) : Math.abs(value * 100 - Math.round(value * 100)) > 0.0001)) {
    throw Error('invalid-number');
  }
  return value;
}

function choice(value, allowed) {
  if (!allowed.includes(value)) throw Error('unsupported-choice');
  return value;
}

function timestamp(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw Error('invalid-timestamp');
  return new Date(value).toISOString();
}

function date(value) {
  const day = timestamp(value).slice(0, 10);
  if (day !== value) throw Error('invalid-date');
  return day;
}

function flag(value) {
  if (typeof value !== 'boolean') throw Error('invalid-flag');
  return value;
}

const scenario = f => ({
  name: text(f['8O3bj'], 1, 1024), product_id: linkedId(f.pJbQs),
  reference_price: number(f.crjGF, 0, 1e9, false),
  unit_cost: f.aFEq0 == null || f.aFEq0 === '' ? null : number(f.aFEq0, 0, 1e9, false),
  discount: number(f['4FsPF'], 0, 100), units: number(f.Im1uZ, 0, 1e6), stock: number(f['6g9zg'], 0, 1e6),
  period_days: number(f.tHTcw, 1, 3650), comparison_group: optionalText(f.bx1oP),
  notes: optionalText(f.k9oe3), source: optionalText(f.taLw5), status: optionalText(label(f.KA0B8)),
});

function decision(f) {
  const status = choice(label(f.kpXrI), ['Pending', 'Approved', 'Rejected']);
  const decided_at = f.ayDEN ? timestamp(f.ayDEN) : null;
  if ((status === 'Pending') !== (decided_at === null)) throw Error('inconsistent-decision-date');
  return {
    name: text(f.tJKbj, 1, 1024), scenario_id: linkedId(f.amMCr), reason: text(f['6Src1']),
    status, decided_at, snapshot: text(f.NFs9O, 0),
  };
}

function dataset(f) {
  const csv = text(f.p7uW5, 1, 100000);
  const source = label(f.q2Y8k);
  const kind = choice(source, ['Demo store', 'CSV upload', 'Uploaded CSV', 'demo', 'upload']);
  if ((kind === 'Demo store' || kind === 'demo') !== (csv === 'demo:207')) throw Error('inconsistent-dataset-source');
  return {
    name: text(f.NAtCh, 1, 1024), source: csv === 'demo:207' ? 'demo' : 'upload', csv,
    row_count: number(f.oPGHK, 1, 2000), as_of: date(f['7fsWK']), window_days: choice(f['8ucyJ'], [30, 60, 90]),
  };
}

function aiRequest(f) {
  const status = choice(label(f.cP2Qs), ['Queued', 'Processing', 'Completed', 'Failed']);
  const interrupted = status === 'Queued' || status === 'Processing';
  const context = text(f['02Rf3']);
  if (Buffer.byteLength(context) > 65536) throw Error('context-too-large');
  return {
    name: text(f.cMQ0c), source_id: text(f.H6ZBD), context, fingerprint: text(f.KSpPc, 1, 128),
    request_status: interrupted ? 'Failed' : status,
    answer: optionalText(f.TSTsb), answered_at: f.ijPNc ? timestamp(f.ijPNc) : null,
    error_message: interrupted ? 'This review did not finish before migration. Submit a new review to try again.' : optionalText(f.Vwg10),
  };
}

const testFeedback = f => ({
  name: text(f['4FQWC'], 0), completed: number(f.GUpre, 0, 5), tasks_json: text(f.fbz4j, 0),
  clarity: number(f.BWmF4, 1, 5), usefulness: number(f.Txzzg, 1, 5), trust: number(f.migJX, 1, 5),
  comment: optionalText(f.DuL4m, 500), app_version: text(f.daLng, 0),
});

const advisorVote = f => ({
  name: text(f.gmvg6, 0), surface: text(f.eVte2), vote: choice(label(f.BFDnY), ['up', 'down']),
  segment_id: optionalText(f['3WoL9']), request_id: optionalText(f['8VCpn']),
  ai_answered: flag(f.OGNn3), app_version: text(f.sd63q, 0),
});

const mappings = {
  scenarios: { table: 'scenarios', owner: 'mKkbZ', ownerLink: 'JrVwO', project: scenario },
  decisions: { table: 'decisions', owner: 'WCx8e', ownerLink: 'oNRE7', project: decision },
  datasets: { table: 'datasets', owner: 'nHOGb', project: dataset },
  aiRequests: { table: 'ai_requests', owner: 'jeWoT', project: aiRequest },
  testFeedback: { table: 'test_feedback', owner: 'Vhyro', project: testFeedback },
  advisorVotes: { table: 'advisor_votes', owner: 'ETHAd', project: advisorVote },
};

function verifiedRows(snapshot, table) {
  const rows = snapshot?.[table];
  if (!Array.isArray(rows)) throw Error('Missing table in export: ' + table);
  const ids = new Set();
  for (const row of rows) {
    const id = recordId(row?.id);
    if (ids.has(id)) throw Error('Duplicate record in export: ' + table);
    if (!row.fields || typeof row.fields !== 'object' || Array.isArray(row.fields)) throw Error('Invalid record in export: ' + table);
    ids.add(id);
  }
  return rows;
}

export function prepareSoftrHistory(snapshot) {
  const products = verifiedRows(snapshot, 'products').map(row => ({ id: row.id, title: text(row.fields['7wzYX']) }));
  const productIds = new Set(products.map(product => product.id));
  const scenarioOwners = new Map();
  const decisions = new Set();
  const demoDatasets = new Set();
  const owners = new Map();
  const quarantine = [];
  let closedReviews = 0;

  for (const [source, mapping] of Object.entries(mappings)) {
    for (const raw of verifiedRows(snapshot, source)) {
      try {
        const email = ownerEmail(raw.fields[mapping.owner], raw.fields[mapping.ownerLink]);
        const row = { id: raw.id, created_at: timestamp(raw.createdAt), ...mapping.project(raw.fields) };
        if (source === 'scenarios') {
          if (!productIds.has(row.product_id)) throw Error('product-link-unresolved');
          scenarioOwners.set(row.id, email);
        }
        if (source === 'decisions') {
          if (scenarioOwners.get(row.scenario_id) !== email) throw Error('scenario-link-unresolved-or-cross-owner');
          if (decisions.has(row.scenario_id)) throw Error('duplicate-decision');
          decisions.add(row.scenario_id);
        }
        if (source === 'datasets' && row.csv === 'demo:207') {
          if (demoDatasets.has(email)) throw Error('duplicate-demo-dataset');
          demoDatasets.add(email);
        }
        if (source === 'aiRequests' && row.request_status !== label(raw.fields.cP2Qs)) closedReviews++;
        if (!owners.has(email)) owners.set(email, {});
        const tables = owners.get(email);
        (tables[mapping.table] ??= []).push(row);
      } catch (error) {
        quarantine.push({ table: source, issue: error.message, record: raw });
      }
    }
  }
  return { products, owners: [...owners].map(([email, tables]) => ({ email, tables })), quarantine, closedReviews };
}

export function summarizeSoftrHistory(plan) {
  const records = Object.fromEntries(Object.values(mappings).map(mapping => [mapping.table, 0]));
  for (const { tables } of plan.owners) {
    for (const [table, rows] of Object.entries(tables)) records[table] += rows.length;
  }
  const quarantine = {};
  for (const { table, issue } of plan.quarantine) {
    const category = table + '/' + issue;
    quarantine[category] = (quarantine[category] ?? 0) + 1;
  }
  return { products: plan.products.length, owners: plan.owners.length, records, quarantine, closedReviews: plan.closedReviews };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const snapshot = decodeSoftrArchive(JSON.parse(readFileSync(0, 'utf8')));
    console.log(JSON.stringify(summarizeSoftrHistory(prepareSoftrHistory(snapshot)), null, 2));
  } catch {
    console.error('The Softr export is incomplete or invalid.');
    process.exitCode = 1;
  }
}
