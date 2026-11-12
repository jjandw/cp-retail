import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const storageKey = 'cp-retail-independent-preview-v1';
const inputCsv = [
  'transaction_id,customer_id,purchased_on,amount_thb,category',
  'TX-1,TEST-1,2026-11-01,30.00,Coffee',
  'TX-2,TEST-2,2026-10-20,40.00,Snacks',
].join('\n');

test('dataset settings are saved and reopened without marking edits during a write as saved', { timeout: 60_000 }, async t => {
  const server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL('../', import.meta.url)),
    envDir: false,
    resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
    server: { host: '127.0.0.1', port: 4174, strictPort: true, hmr: false },
  });
  t.after(() => server.close());
  await server.listen();
  const address = server.httpServer.address();
  assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch({ channel: process.env.CP_RETAIL_BROWSER_CHANNEL || undefined });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());

  const customers = page.getByRole('button', { name: 'Customers', exact: true });
  const data = page.getByRole('region', { name: 'Your data', exact: true });
  const date = page.getByLabel('Analysis date', { exact: true });
  const lookback = page.getByRole('combobox', { name: /^Lookback window/ });
  const savedData = data.getByRole('combobox', { name: /^Saved data/ });
  const analyze = page.getByRole('button', { name: 'Analyze transactions', exact: true });
  const save = data.getByRole('button', { name: 'Save in this browser', exact: true });
  const openDemo = data.getByRole('button', { name: 'Open demo store', exact: true });
  const waitForSaved = asOf => data.getByText(new RegExp(`analysis date ${asOf} · saved in this browser`)).waitFor();
  const reopen = async (name, asOf, days) => {
    await savedData.selectOption({ label: name });
    await waitForSaved(asOf);
    assert.equal(await lookback.inputValue(), days);
  };
  const datasets = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)).datasets, storageKey);

  await page.goto(origin + '/workspace');
  await customers.click();
  await page.getByRole('textbox', { name: 'Transactions CSV', exact: true }).fill(inputCsv);
  await analyze.click();
  await save.click();
  await waitForSaved('2026-11-05');
  const [original] = await datasets();

  await date.fill('2026-11-06');
  await lookback.selectOption('60');
  await data.getByText('Not saved yet. Analyze transactions to save.', { exact: true }).waitFor();
  await analyze.click();

  // Hold the real browser storage lock to make a pending save deterministic.
  await page.evaluate(key => new Promise(resolve => {
    void navigator.locks.request(key, () => new Promise(release => {
      window.releaseDatasetSave = release;
      resolve();
    }));
  }), storageKey);
  try {
    await save.click();
    await data.getByRole('button', { name: 'Saving…', exact: true }).waitFor();
    await date.fill('2026-11-07');
    await lookback.selectOption('90');
    await analyze.click();
  } finally {
    await page.evaluate(() => window.releaseDatasetSave());
  }
  await save.waitFor();
  await data.getByText(/analysis date 2026-11-07 · not saved yet/).waitFor();
  const [earlierSave, unchanged] = await datasets();
  assert.deepEqual(unchanged, original);
  assert.equal(earlierSave.fields['7fsWK'], '2026-11-06');
  assert.equal(earlierSave.fields['8ucyJ'], 60);

  await save.click();
  await waitForSaved('2026-11-07');
  const [latest] = await datasets();
  assert.equal(latest.fields.p7uW5, inputCsv);
  await page.reload();
  await customers.click();
  await waitForSaved('2026-11-07');
  assert.equal(await lookback.inputValue(), '90');
  await reopen(earlierSave.fields.NAtCh, '2026-11-06', '60');
  await reopen(latest.fields.NAtCh, '2026-11-07', '90');

  await openDemo.click();
  await waitForSaved('2026-11-05');
  const [canonical] = await datasets();
  assert.equal(canonical.fields.p7uW5, 'demo:207');
  await date.fill('2026-11-09');
  await lookback.selectOption('60');
  await analyze.click();
  await save.click();
  await waitForSaved('2026-11-09');
  const [customDemo, unchangedDemo] = await datasets();
  assert.deepEqual(unchangedDemo, canonical);
  assert.equal(customDemo.fields.q2Y8k, 'demo');
  assert.ok(customDemo.fields.p7uW5.startsWith('transaction_id,customer_id,'));
  assert.ok(customDemo.fields.p7uW5.length <= 100_000);
  await reopen(canonical.fields.NAtCh, '2026-11-05', '30');
  await reopen(customDemo.fields.NAtCh, '2026-11-09', '60');

  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key));
    state.datasets.push({ id: 'historical-demo', fields: {
      ...state.datasets.find(row => row.fields.p7uW5 === 'demo:207').fields,
      p7uW5: 'demo:207:softr', NAtCh: 'Imported demo', '7fsWK': '2026-11-03', '8ucyJ': 60,
    } });
    localStorage.setItem(key, JSON.stringify(state));
  }, storageKey);
  await page.reload();
  await customers.click();
  await reopen('Imported demo', '2026-11-03', '60');
});
