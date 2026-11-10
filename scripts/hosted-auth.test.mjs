import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { parseEnv } from 'node:util';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { opsAiFingerprint } from '../supabase/functions/_shared/advisor/context.mjs';
import { comparison, group } from '../supabase/tests/fixtures/advisor-contexts.mjs';

const stack = process.env.CP_RETAIL_AUTH_QA_STACK;
const callback = 'http://127.0.0.1:4173';

function loopbackUrl(value, port) {
  const url = new URL(value);
  assert.ok(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)
    && url.port === port && !url.username && !url.password, 'Auth QA must stay on the local fixture');
  return url;
}

function requireSuccess(result, step) {
  assert.ok(!result.error, step + (result.error?.code ? ' (' + result.error.code + ')' : ''));
  return result.data;
}

async function mailLink(mailpit, email, type, seen) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const response = await fetch(new URL('/api/v1/messages', mailpit));
    assert.equal(response.status, 200, 'Mailpit message list');
    const { messages } = await response.json();
    for (const message of messages ?? []) {
      if (seen.has(message.ID) || !message.To?.some(recipient => recipient.Address === email)) continue;
      const detail = await fetch(new URL('/api/v1/message/' + encodeURIComponent(message.ID), mailpit));
      assert.equal(detail.status, 200, 'Mailpit message detail');
      const { HTML } = await detail.json();
      const links = (HTML ?? '').matchAll(/href=["']([^"']+)["']/gi);
      for (const [, href] of links) {
        const link = new URL(href.replaceAll('&amp;', '&'));
        if (link.pathname !== '/auth/v1/verify' || link.searchParams.get('type') !== type) continue;
        seen.add(message.ID);
        return loopbackUrl(link, '54321');
      }
    }
    await delay(250);
  }
  assert.fail('No local ' + type + ' email arrived');
}

async function verifyLink(link, expectedDestination) {
  const response = await fetch(link, { redirect: 'manual' });
  assert.ok([302, 303].includes(response.status), 'GoTrue accepted the email verification link');
  const destination = new URL(response.headers.get('Location'));
  assert.equal(destination.origin + destination.pathname + destination.search, expectedDestination);
  const session = new URLSearchParams(destination.hash.slice(1));
  const access_token = session.get('access_token');
  const refresh_token = session.get('refresh_token');
  assert.ok(access_token && refresh_token, 'Verification returned a local session');
}

async function openBrowser(t, api, key) {
  const outDir = join(stack, 'web-dist');
  const vite = 'node_modules/vite/bin/vite.js';
  execFileSync(process.execPath, [vite, 'build', '--outDir', outDir], {
    env: { ...process.env, VITE_SUPABASE_URL: api.origin, VITE_SUPABASE_PUBLISHABLE_KEY: key, VITE_ENABLE_ADVISOR: 'false' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const server = spawn(process.execPath, [vite, 'preview', '--outDir', outDir, '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
    stdio: 'ignore',
  });
  t.after(() => { server.kill(); });
  const deadline = Date.now() + 10_000;
  while (true) {
    if (await fetch(callback).then(result => result.ok, () => false)) break;
    assert.ok(server.exitCode === null && Date.now() < deadline, 'Built frontend starts on the fixture port');
    await delay(200);
  }
  const browser = await chromium.launch({ channel: process.env.CP_RETAIL_BROWSER_CHANNEL || undefined });
  t.after(() => browser.close());
  const context = await browser.newContext();
  const origins = new Set([callback, api.origin, 'http://127.0.0.1:54321', 'http://localhost:54321']);
  await context.route('**/*', route => origins.has(new URL(route.request().url()).origin) ? route.continue() : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(12_000);
  return page;
}

async function fillCredentials(page, email, password, submit) {
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: submit, exact: true }).click();
}

async function signOut(page, email) {
  await page.goto(callback + '/account');
  await page.getByText('Signed in as ' + email, { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await page.waitForURL(callback + '/login');
}

async function verifyAdvisor({ api, key, owner, other, source }) {
  const url = new URL('/functions/v1/advisor', api);
  const call = (recordId, token, origin = callback) => fetch(url, {
    method: 'POST',
    headers: {
      apikey: key, Origin: origin, 'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: JSON.stringify({ recordId }),
  });
  const preflight = await fetch(url, { method: 'OPTIONS', headers: { Origin: callback } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), callback);
  const ownerToken = requireSuccess(await owner.auth.getSession(), 'Read first test session').session.access_token;
  const otherToken = requireSuccess(await other.auth.getSession(), 'Read second test session').session.access_token;
  const contexts = [
    { context: JSON.stringify(group), expected: /30 customers/ },
    { context: comparison, expected: /AI decision review · v1\.2/ },
  ];
  for (const { context, expected } of contexts) {
    const args = {
      p_name: 'Synthetic Advisor review', p_source_id: source, p_context: context, p_fingerprint: opsAiFingerprint(context),
    };
    const recordId = requireSuccess(await owner.rpc('queue_advisor_review', args), 'Queue an Advisor review');
    assert.equal((await call(recordId)).status, 401, 'Missing user token is denied');
    assert.equal((await call(recordId, otherToken)).status, 404, 'Other account cannot wake the review');
    assert.equal((await call(recordId, ownerToken, 'http://127.0.0.1:4189')).status, 403, 'Different browser origin is denied');
    const responses = await Promise.all([call(recordId, ownerToken), call(recordId, ownerToken)]);
    for (const response of responses) assert.equal(response.status, 202, 'Owner can wake the review');

    const deadline = Date.now() + 15_000;
    while (true) {
      const row = requireSuccess(await owner.from('ai_requests')
        .select('request_status,answer,answered_at').eq('id', recordId).single(), 'Read the saved review');
      if (row.request_status === 'Completed') {
        assert.ok(row.answered_at, 'The Edge background task persisted a timestamp');
        assert.match(row.answer, expected);
        break;
      }
      assert.ok(row.request_status !== 'Failed' && Date.now() < deadline, 'Edge review must reach Completed');
      await delay(250);
    }
    assert.equal(requireSuccess(await owner.rpc('queue_advisor_review', args), 'Reuse a completed review'), recordId);
    const foreign = requireSuccess(await other.from('ai_requests').select('id').eq('id', recordId).maybeSingle(), 'Read other review');
    assert.equal(foreign, null);
  }
}

test('the built site verifies email, opens the decision bookmark, resets passwords, and keeps data private', {
  skip: !stack,
  timeout: 120_000,
}, async t => {
  const status = parseEnv(execFileSync('supabase', ['status', '-o', 'env'], {
    cwd: stack, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  }));
  const api = loopbackUrl(status.API_URL, '54321');
  const mailpit = loopbackUrl(status.MAILPIT_URL, '54324');
  const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  assert.ok(key, 'Local fixture has a public client key');
  const client = () => createClient(api.href, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'implicit' },
  });
  const page = await openBrowser(t, api, key);
  const password = 'Synthetic!' + randomUUID();
  const seen = new Set();
  const a = { email: 'cp-retail-a-' + randomUUID().slice(0, 8) + '@example.com', supabase: client() };
  const b = { email: 'cp-retail-b-' + randomUUID().slice(0, 8) + '@example.com', supabase: client() };

  await page.goto(callback + '/sign-up');
  await fillCredentials(page, a.email, password, 'Create account');
  await page.getByText('Check your email for a verification link.', { exact: false }).waitFor();
  const before = await a.supabase.auth.signInWithPassword({ email: a.email, password });
  assert.equal(before.error?.code, 'email_not_confirmed');
  await page.goto((await mailLink(mailpit, a.email, 'signup', seen)).href);
  await page.waitForURL(url => url.origin === callback && url.pathname === '/workspace');
  await page.getByRole('button', { name: 'My decisions', exact: true }).waitFor();
  a.user = requireSuccess(await a.supabase.auth.signInWithPassword({ email: a.email, password }), 'Sign in first account').user;
  assert.ok(a.user.email_confirmed_at, 'First email is marked confirmed');

  const secondSignup = requireSuccess(await b.supabase.auth.signUp({
    email: b.email, password, options: { emailRedirectTo: callback + '/workspace' },
  }), 'Sign up second account');
  assert.equal(secondSignup.session, null, 'Sign up requires email verification');
  await verifyLink(await mailLink(mailpit, b.email, 'signup', seen), callback + '/workspace');
  b.user = requireSuccess(await b.supabase.auth.signInWithPassword({ email: b.email, password }), 'Sign in second account').user;
  assert.equal(b.user.id, secondSignup.user.id);
  assert.notEqual(a.user.id, b.user.id);
  const scenario = {
    name: 'Synthetic promo', product_id: 'demo-snack-drink', reference_price: 95,
    unit_cost: 62.51, discount: 5, units: 1250, stock: 1350, period_days: 30,
  };
  const saved = requireSuccess(await a.supabase.from('scenarios').insert(scenario).select('id,owner_id,revenue').single(), 'Save owner scenario');
  assert.equal(saved.owner_id, a.user.id);
  assert.equal(saved.revenue, 112812.5);
  const foreignScenario = requireSuccess(await b.supabase.from('scenarios').select('id').eq('id', saved.id).maybeSingle(), 'Read with other account');
  assert.equal(foreignScenario, null);
  const visibleToB = requireSuccess(await b.supabase.from('scenarios').select('id'), 'List rows as other account');
  assert.deepEqual(visibleToB, []);
  assert.ok((await client().from('scenarios').select('id').eq('id', saved.id)).error, 'Anonymous API access is denied');

  const decision = { name: 'Synthetic decision', scenario_id: saved.id, reason: 'Compare trial demand', snapshot: '{}' };
  const linked = requireSuccess(await a.supabase.from('decisions').insert(decision).select('status').single(), 'Save linked decision');
  assert.equal(linked.status, 'Pending');
  const crossOwner = await b.supabase.from('decisions').insert(decision);
  assert.equal(crossOwner.error?.code, '23503', 'Cross-account decision link is denied');

  await signOut(page, a.email);
  await page.goto(callback + '/my-decisions');
  await page.waitForURL(callback + '/login?next=%2Fmy-decisions');
  await fillCredentials(page, a.email, password, 'Log in');
  await page.waitForURL(callback + '/my-decisions');
  await page.getByRole('heading', { name: 'My Decisions', exact: true }).waitFor();
  await page.getByText(decision.name, { exact: true }).waitFor();

  await signOut(page, a.email);
  await page.goto(callback + '/forgot-password');
  await delay(1_050); // Respect the fixture's per-account mail interval.
  await page.getByLabel('Email', { exact: true }).fill(a.email);
  await page.getByRole('button', { name: 'Send reset link', exact: true }).click();
  await page.getByText('If an account uses that email, look for a password reset link.', { exact: true }).waitFor();
  await page.goto((await mailLink(mailpit, a.email, 'recovery', seen)).href);
  await page.waitForURL(url => url.origin === callback && url.pathname === '/reset-password');
  const nextPassword = 'Recovered!' + randomUUID();
  await page.getByLabel('New password', { exact: true }).fill(nextPassword);
  await page.getByRole('button', { name: 'Save password', exact: true }).click();
  await page.waitForURL(callback + '/workspace');
  await page.getByRole('button', { name: 'My decisions', exact: true }).waitFor();
  const wrongPassword = await client().auth.signInWithPassword({ email: a.email, password });
  assert.equal(wrongPassword.error?.code, 'invalid_credentials');
  const signedIn = client();
  const { user } = requireSuccess(await signedIn.auth.signInWithPassword({ email: a.email, password: nextPassword }), 'Sign in with recovered password');
  assert.equal(user.id, a.user.id);
  const retained = requireSuccess(await signedIn.from('scenarios').select('id').eq('id', saved.id).single(), 'Read scenario after recovery');
  assert.equal(retained.id, saved.id);
  await t.test('the real Edge handler saves both Advisor answers for the verified owner', async () => {
    await verifyAdvisor({ api, key, owner: signedIn, other: b.supabase, source: saved.id });
  });
});
