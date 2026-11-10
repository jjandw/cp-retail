import { createHash } from 'node:crypto';

const format = 'cp-retail-softr-record-pages-v1';
const databaseId = '46d15e55-e03a-437d-bd06-8bdc35b79943';
const tableIds = {
  products: 'yBg8PjqD7zRU7J',
  scenarios: 'd9JdBdtgBZvXBv',
  decisions: 'vBQOXSAciKnZFw',
  datasets: 'xFjXoMY8AEM85y',
  aiRequests: 'sYjhtglIOT61Tv',
  testFeedback: 'GrPIYH8dfuu2KE',
  advisorVotes: 'OpxJ1wWvMPbC9m',
};
const maxRawBytes = 64 * 1024 * 1024;
const maxPageRecords = 100;
const utf8 = new TextDecoder('utf-8', { fatal: true });

const isObject = value => value != null && typeof value === 'object' && !Array.isArray(value);
const isCount = value => Number.isSafeInteger(value) && value >= 0;

function requireArchive(condition) {
  if (!condition) throw Error('The Softr archive is incomplete or invalid.');
}

function parsePage(bytes) {
  try {
    return JSON.parse(utf8.decode(bytes));
  } catch {
    // JSON parsing errors can include source content.
    requireArchive(false);
  }
}

export function decodeSoftrArchive(input) {
  if (input?.format !== format) return input;
  requireArchive(input.databaseId === databaseId && isObject(input.tables)
    && Object.keys(input.tables).length === Object.keys(tableIds).length);

  const snapshot = {};
  let remainingBytes = maxRawBytes;
  for (const [name, tableId] of Object.entries(tableIds)) {
    const table = input.tables[name];
    requireArchive(isObject(table) && table.tableId === tableId && isCount(table.count)
      && Array.isArray(table.pages) && table.pages.length > 0
      && table.pages.length <= Math.max(1, table.count));

    const rows = [];
    const ids = new Set();
    for (const page of table.pages) {
      requireArchive(isObject(page) && page.offset === rows.length && isCount(page.count)
        && page.count <= maxPageRecords && rows.length + page.count <= table.count
        && (page.count > 0 || table.count === 0)
        && typeof page.responseBase64 === 'string'
        && page.responseBase64.length <= 4 * Math.ceil(remainingBytes / 3));
      const bytes = Buffer.from(page.responseBase64, 'base64');
      requireArchive(bytes.length > 0 && bytes.length <= remainingBytes
        && bytes.toString('base64') === page.responseBase64
        && createHash('sha256').update(bytes).digest('hex') === page.sha256);
      remainingBytes -= bytes.length;

      const raw = parsePage(bytes);
      requireArchive(Array.isArray(raw?.data) && raw.data.length === page.count
        && isObject(raw.metadata) && raw.metadata.offset === page.offset && raw.metadata.total === table.count);
      for (const record of raw.data) {
        requireArchive(isObject(record) && typeof record.id === 'string' && record.id.trim() !== ''
          && (record.tableId == null || record.tableId === tableId) && !ids.has(record.id));
        ids.add(record.id);
        rows.push(record);
      }
    }
    requireArchive(rows.length === table.count);
    snapshot[name] = rows;
  }
  return snapshot;
}
