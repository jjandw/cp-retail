import { opsModel } from './scenario-math.mjs';
import { demoUser } from './user';

export type Row = { id: string; fields: Record<string, unknown> };

export const tables = {
  scenarios: { owner: 'mKkbZ', created: 'NNdSa' },
  decisions: { owner: 'WCx8e', created: '' },
  aiRequests: { owner: 'jeWoT', created: 'zUKuD' },
  datasets: { owner: 'nHOGb', created: 'upHaI' },
  feedback: { owner: 'Vhyro', created: 'SHoO2' },
  advisorVotes: { owner: 'ETHAd', created: 'wZVjc' },
};
export type Table = keyof typeof tables;
type State = Record<Table, Row[]>;
type Selection = Record<string, string>;
const storageKey = 'cp-retail-independent-preview-v1';

export const products = [
  { id: 'demo-snack-drink', title: 'Snack + drink meal deal' },
  { id: 'demo-coffee', title: 'Ready-to-drink coffee' },
  { id: 'demo-grocery', title: 'Everyday essentials' },
];

function withScenarioResults(fields: Row['fields']) {
  const price = Number(fields.crjGF);
  const cost = fields.aFEq0 == null ? null : Number(fields.aFEq0);
  const discount = Number(fields['4FsPF']);
  const units = Number(fields.Im1uZ);
  const stock = Number(fields['6g9zg']);
  const result = opsModel(price, cost, discount, units, stock);
  return {
    ...fields,
    QsSll: 'Valid',
    '42HJu': result.unitPrice,
    uscaP: result.revenue,
    '2pJyd': result.grossProfit,
    iNqTP: result.remaining,
    oU8hQ: cost == null ? 'Cost unknown' : 'Cost provided',
    sZb7Q: result.remaining < 0 ? 'Stock shortfall' : 'Stock sufficient',
    Zo570: 'Valid',
  };
}

function emptyState(): State {
  return {
    scenarios: [{
      id: 'demo-snack-drink-baseline',
      fields: withScenarioResults({
        '8O3bj': 'Demo baseline · Snack + drink',
        mKkbZ: demoUser.email, pJbQs: [products[0].id], JrVwO: [demoUser.id],
        crjGF: 95, aFEq0: 62.51, '4FsPF': 0, Im1uZ: 1000, '6g9zg': 1350,
        tHTcw: 30, bx1oP: 'Demo store', NNdSa: '2026-11-10T00:00:00Z',
        k9oe3: 'Synthetic assumptions for the independent preview.',
        taLw5: 'Simulated coursework data - assumptions only',
      }),
    }],
    decisions: [], aiRequests: [], datasets: [], feedback: [], advisorVotes: [],
  };
}

function readState(): State {
  const raw = localStorage.getItem(storageKey);
  if (raw === null) return emptyState();
  const state = JSON.parse(raw);
  if (!state || Object.keys(tables).some(table => !Array.isArray(state[table]))) {
    throw Error('The preview records in this browser cannot be read.');
  }
  return state;
}

function readForDisplay() {
  try { return readState(); } catch { return emptyState(); }
}

let state = readForDisplay();
const listeners = new Set<() => void>();
export const getSnapshot = () => state;
export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function publish(next: State) {
  state = next;
  for (const listener of listeners) listener();
}

window.addEventListener('storage', event => {
  if (event.key === storageKey || event.key === null) publish(readForDisplay());
});

async function transact<T>(mutate: (draft: State) => T) {
  const run = () => {
    const draft = readState();
    const result = mutate(draft);
    localStorage.setItem(storageKey, JSON.stringify(draft));
    publish(draft);
    return result;
  };
  return navigator.locks ? navigator.locks.request(storageKey, run) : run();
}

function mapFields(selection: Selection, values: Row['fields']) {
  return Object.fromEntries(Object.entries(selection)
    .filter(([name]) => Object.hasOwn(values, name))
    .map(([name, field]) => [field, values[name]]));
}

function ids(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function createDemoRow(table: Table, selection: Selection, values: Row['fields']) {
  return transact(draft => {
    const { owner, created } = tables[table];
    let fields = { ...mapFields(selection, values), [owner]: demoUser.email };
    if (created) fields[created] = new Date().toISOString();
    if (table === 'scenarios') {
      if (!products.some(product => ids(fields.pJbQs).includes(product.id))) {
        throw Error('Choose a product from the demo catalogue.');
      }
      fields = withScenarioResults(fields);
    }
    if (table === 'decisions') {
      const linked = ids(fields.amMCr);
      if (linked.length !== 1 || !draft.scenarios.some(row => row.id === linked[0] && row.fields.mKkbZ === demoUser.email)) {
        throw Error('Choose one of your saved scenarios.');
      }
      if (draft.decisions.some(row => ids(row.fields.amMCr).includes(linked[0]))) {
        throw Error('A decision already exists for this scenario.');
      }
      fields.kpXrI = 'Pending';
    }
    if (table === 'datasets' && fields.p7uW5 === 'demo:207') {
      const existing = draft.datasets.find(row => row.fields.p7uW5 === 'demo:207');
      if (existing) return existing;
    }
    const row = { id: crypto.randomUUID(), fields };
    draft[table].unshift(row);
    return row;
  });
}

export function updateDemoRow(table: Table, recordId: string, selection: Selection, values: Row['fields']) {
  return transact(draft => {
    const row = draft[table].find(candidate => candidate.id === recordId && candidate.fields[tables[table].owner] === demoUser.email);
    if (!row) throw Error('This preview record is unavailable.');
    Object.assign(row.fields, mapFields(selection, values));
    return row;
  });
}

export function projectRow(snapshot: State, row: Row, select: Selection): Row {
  const creators = [{ id: demoUser.id, title: demoUser.email }];
  const scenarioLinks = snapshot.scenarios.map(scenario => ({ id: scenario.id, title: scenario.fields['8O3bj'] }));
  const fields = Object.fromEntries(Object.entries(select).map(([name, field]) => {
    const value = row.fields[field];
    const links = field === 'pJbQs' ? products : field === 'amMCr' ? scenarioLinks : ['JrVwO', 'oNRE7'].includes(field) ? creators : null;
    return [name, links ? ids(value).map(id => links.find(link => link.id === id)).filter(Boolean) : value ?? null];
  }));
  return { id: row.id, fields };
}
