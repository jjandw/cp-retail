import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';
import { createServer } from 'vite';

test('workspace sections and scenario details survive reload and browser history', { timeout: 60_000 }, async t => {
  const port = 4175;
  const server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL('../', import.meta.url)),
    envDir: false,
    resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
    server: { host: '127.0.0.1', port, strictPort: true, hmr: false },
  });
  t.after(() => server.close());
  await server.listen();
  const origin = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch({ channel: process.env.CP_RETAIL_BROWSER_CHANNEL || undefined });
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(8_000);
  await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());

  const shown = async (path, heading) => {
    await page.waitForURL(origin + path);
    await page.getByRole('heading', { name: heading, exact: true }).waitFor();
  };
  const section = name => page.getByRole('navigation').getByRole('button', { name, exact: true });
  const profilePath = '/workspace?view=profiles';
  const dashboardPath = '/workspace?view=dashboard';
  const decisionsPath = '/workspace?view=my-decisions';
  await page.goto(origin + profilePath);
  await shown(profilePath, 'Customer profiles');
  await section('Dashboard').click();
  await shown(dashboardPath, 'No sales data yet');
  await section('My decisions').click();
  await shown(decisionsPath, 'My Decisions');
  await page.reload();
  await shown(decisionsPath, 'My Decisions');
  await page.goBack();
  await shown(dashboardPath, 'No sales data yet');
  await page.goBack();
  await shown(profilePath, 'Customer profiles');
  await page.goForward();
  await shown(dashboardPath, 'No sales data yet');
  await page.goForward();
  await shown(decisionsPath, 'My Decisions');

  const record = 'demo-snack-drink-baseline';
  const legacyDetail = '/item-details?recordId=' + record;
  const detail = '/workspace?recordId=' + record;
  const scenarios = '/workspace?view=my-scenarios';
  const scenarioName = 'Demo baseline · Snack + drink';
  await page.goto(origin + '/my-decisions');
  await shown('/my-decisions', 'My Decisions');
  await page.goto(origin + '/old-home');
  await shown('/old-home', 'My Scenarios');
  await page.goto(origin + legacyDetail);
  await shown(legacyDetail, scenarioName);
  await page.getByRole('button', { name: 'Back to My Scenarios', exact: true }).click();
  await shown(scenarios, 'My Scenarios');
  await page.goBack();
  await shown(legacyDetail, scenarioName);
  await page.goForward();
  await shown(scenarios, 'My Scenarios');
  await page.getByRole('link', { name: 'View details', exact: true }).click();
  await shown(detail, scenarioName);
  await page.reload();
  await shown(detail, scenarioName);
  await section('Customers').click();
  await shown(profilePath, 'Customer profiles');
  await page.goBack();
  await shown(detail, scenarioName);
  await page.goForward();
  await shown(profilePath, 'Customer profiles');
});
