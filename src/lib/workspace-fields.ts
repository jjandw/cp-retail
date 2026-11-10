import type { Row, Table } from './demo-data';
import type { WorkspaceUser } from './user';
import type { Selection } from './workspace-query';

export const tableNames: Record<Table, string> = {
  scenarios: 'scenarios',
  decisions: 'decisions',
  datasets: 'datasets',
  feedback: 'test_feedback',
  aiRequests: 'ai_requests',
  advisorVotes: 'advisor_votes',
};

// The imported screens use these field IDs. The database uses named columns.
const columns: Record<Table, Record<string, string>> = {
  scenarios: {
    '8O3bj': 'name', mKkbZ: 'owner_id', pJbQs: 'product_id', JrVwO: 'owner_id',
    k9oe3: 'notes', crjGF: 'reference_price', aFEq0: 'unit_cost', '4FsPF': 'discount',
    Im1uZ: 'units', '6g9zg': 'stock', tHTcw: 'period_days', bx1oP: 'comparison_group',
    NNdSa: 'created_at', taLw5: 'source', KA0B8: 'status',
    '42HJu': 'discounted_price', uscaP: 'revenue', '2pJyd': 'gross_profit', iNqTP: 'remaining_stock',
  },
  decisions: {
    tJKbj: 'name', WCx8e: 'owner_id', amMCr: 'scenario_id', oNRE7: 'owner_id',
    '6Src1': 'reason', kpXrI: 'status', ayDEN: 'decided_at', NFs9O: 'snapshot',
  },
  datasets: {
    NAtCh: 'name', nHOGb: 'owner_id', q2Y8k: 'source', p7uW5: 'csv',
    oPGHK: 'row_count', '7fsWK': 'as_of', '8ucyJ': 'window_days', upHaI: 'created_at',
  },
  feedback: {
    '4FQWC': 'name', Vhyro: 'owner_id', GUpre: 'completed', fbz4j: 'tasks_json',
    BWmF4: 'clarity', Txzzg: 'usefulness', migJX: 'trust', DuL4m: 'comment',
    daLng: 'app_version', SHoO2: 'created_at',
  },
  aiRequests: {
    cMQ0c: 'name', jeWoT: 'owner_id', H6ZBD: 'source_id', '02Rf3': 'context',
    KSpPc: 'fingerprint', cP2Qs: 'request_status', TSTsb: 'answer', Vwg10: 'error_message',
    zUKuD: 'created_at', ijPNc: 'answered_at',
  },
  advisorVotes: {
    gmvg6: 'name', ETHAd: 'owner_id', eVte2: 'surface', BFDnY: 'vote', '3WoL9': 'segment_id',
    '8VCpn': 'request_id', OGNn3: 'ai_answered', sd63q: 'app_version', wZVjc: 'created_at',
  },
};

export function columnFor(table: Table, id: string) {
  const column = columns[table][id];
  if (!column) throw Error('The requested workspace field is unavailable.');
  return column;
}

export function selectColumns(table: Table, select: Selection) {
  const fields = new Set(['id']);
  for (const id of Object.values(select)) {
    switch (id) {
      case 'pJbQs': fields.add('product:products(id,title)'); break;
      case 'amMCr': fields.add('scenario:scenarios(id,name)'); break;
      case 'oU8hQ': fields.add('unit_cost'); break;
      case 'sZb7Q': fields.add('remaining_stock'); break;
      case 'QsSll':
      case 'Zo570': break;
      default: fields.add(columnFor(table, id));
    }
  }
  return [...fields].join(',');
}

export type DatabaseRow = Record<string, unknown> & {
  id: string;
  product?: { id: string; title: string };
  scenario?: { id: string; name: string };
};

export function projectWorkspaceRow(table: Table, row: DatabaseRow, selection: Selection, user: WorkspaceUser): Row {
  const fields = Object.fromEntries(Object.entries(selection).map(([name, id]) => {
    switch (id) {
      case 'pJbQs': return [name, row.product ? [row.product] : []];
      case 'amMCr': return [name, row.scenario ? [{ id: row.scenario.id, title: row.scenario.name }] : []];
      case 'JrVwO':
      case 'oNRE7': return [name, [{ id: user.id, title: user.email }]];
      case 'QsSll':
      case 'Zo570': return [name, 'Valid'];
      case 'oU8hQ': return [name, row.unit_cost == null ? 'Cost unknown' : 'Cost provided'];
      case 'sZb7Q': return [name, Number(row.remaining_stock) < 0 ? 'Stock shortfall' : 'Stock sufficient'];
      default: {
        const column = columnFor(table, id);
        return [name, column === 'owner_id' ? user.email : row[column] ?? null];
      }
    }
  }));
  return { id: row.id, fields };
}

export function workspaceWrite(table: Table, selection: Selection, values: Row['fields']) {
  const fields: Record<string, unknown> = {};
  for (const [name, id] of Object.entries(selection)) {
    if (!Object.hasOwn(values, name)) continue;
    const column = columnFor(table, id);
    if (column === 'owner_id') continue;
    const value = values[name];
    if (column === 'product_id' || column === 'scenario_id') {
      if (!Array.isArray(value) || value.length !== 1 || typeof value[0] !== 'string') {
        throw Error('Select exactly one linked record.');
      }
      fields[column] = value[0];
    } else {
      fields[column] = value;
    }
  }
  return fields;
}
