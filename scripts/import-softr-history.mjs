import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { decodeSoftrArchive } from './softr-archive.mjs';
import { prepareSoftrHistory, summarizeSoftrHistory } from './softr-history.mjs';

function run() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const quarantineRetained = args.includes('--quarantine-retained');
  if (args.some(arg => !['--apply', '--quarantine-retained'].includes(arg))) {
    throw Error('Usage: import-softr-history.mjs [--apply] [--quarantine-retained]');
  }
  if (!process.env.PGHOST || !process.env.PGDATABASE || !process.env.PGUSER) {
    throw Error('Set PGHOST, PGDATABASE and PGUSER for the intended destination.');
  }
  const snapshot = decodeSoftrArchive(JSON.parse(readFileSync(0, 'utf8')));
  const plan = prepareSoftrHistory(snapshot);
  if (apply && plan.quarantine.length && !quarantineRetained) {
    throw Error('Retain the original export in approved private storage before applying a plan with quarantined records.');
  }

  const sql = readFileSync(new URL('./import-softr-history.sql', import.meta.url), 'utf8');
  const payload = JSON.stringify({ products: plan.products, owners: plan.owners });
  const csvCell = '"' + payload.replaceAll('"', '""') + '"';
  const program = [
    'begin;',
    'create temp table cp_history_input (payload jsonb not null) on commit drop;',
    'copy cp_history_input (payload) from stdin with (format csv);',
    csvCell,
    '\\.',
    sql,
    apply ? `do $$
      begin
        if (select count(*) from cp_history_owners)
          <> (select jsonb_array_length(payload->'owners') from cp_history_input) then
          raise exception using errcode = '22023', message = 'Every historical owner must match one verified account.';
        end if;
      end;
      $$;
      commit;` : 'rollback;',
  ].join('\n');

  const result = spawnSync('psql', ['-X', '-qAtw', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=sqlstate'], {
    input: program, encoding: 'utf8', env: { ...process.env, PGCLIENTENCODING: 'UTF8' },
  });
  if (result.error || result.status !== 0) {
    const sqlState = result.stderr?.match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})\b/)?.[1];
    const hint = sqlState === '22023' ? ' Every historical owner needs exactly one verified account.' : '';
    throw Error('Historical import failed and rolled back.' + (sqlState ? ' SQLSTATE ' + sqlState + '.' : '') + hint);
  }
  const resultLine = result.stdout.trim().split(/\r?\n/).at(-1);
  const report = JSON.parse(resultLine);
  console.log(JSON.stringify({ mode: apply ? 'applied' : 'rolled-back', ...summarizeSoftrHistory(plan), ...report }, null, 2));
}

try {
  run();
} catch (error) {
  console.error(error instanceof SyntaxError ? 'The export or database report is invalid.' : error.message);
  process.exitCode = 1;
}
