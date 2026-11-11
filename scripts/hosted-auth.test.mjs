import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
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
    env: { ...process.env, VITE_SUPABASE_URL: api.origin, VITE_SUPABASE_PUBLISHABLE_KEY: key, VITE_ENABLE_ADVISOR: 'true' },
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
  const context = await newFixtureContext(browser, api);
  const page = await context.newPage();
  page.setDefaultTimeout(12_000);
  return page;
}

async function newFixtureContext(browser, api) {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const origins = new Set([callback, api.origin, 'http://127.0.0.1:54321', 'http://localhost:54321']);
  await context.route('**/*', route => origins.has(new URL(route.request().url()).origin) ? route.continue() : route.abort());
  return context;
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

async function savedAdvisorAnswer(owner, source, version) {
  const row = requireSuccess(await owner.from('ai_requests')
    .select('request_status,answer,answered_at').eq('source_id', source).single(), 'Read the UI-created Advisor review');
  assert.equal(row.request_status, 'Completed');
  assert.ok(row.answered_at, 'The model result was persisted');
  assert.ok(row.answer.startsWith(version + '\n\n'), 'The answer has the expected format');
  return row.answer;
}

async function verifyAdvisorScreens(page, owner, scenarioId) {
  await page.getByRole('button', { name: 'Open demo store', exact: true }).click();
  // Use a different group from the gateway test so both paths generate their own review.
  await page.getByRole('button', { name: /^Recent customers/ }).click();
  const groupCard = page.getByRole('region', { name: 'CP Retail Advisor', exact: true });
  await groupCard.getByRole('button', { name: 'Explain this group', exact: true }).click();
  await groupCard.getByText('AI insight added', { exact: true }).waitFor({ timeout: 25_000 });
  const groupAnswer = await savedAdvisorAnswer(owner, 'PROFILE-recent', 'AI group explanation · v1.0');
  const firstCheck = groupAnswer.match(/\n\nVerify first\n1\. ([^\n]+)/)?.[1];
  assert.ok(firstCheck, 'The saved group answer includes a verification step');
  await groupCard.getByRole('listitem').filter({ hasText: firstCheck }).waitFor();

  await page.getByRole('button', { name: 'Recommendations', exact: true }).click();
  await page.getByRole('combobox', { name: /^Starting scenario/ }).selectOption(scenarioId);
  await page.locator('form').getByRole('button', { name: 'Compare actions', exact: true }).click();
  const decisionCard = page.getByRole('region', { name: 'Decision readiness review', exact: true });
  await decisionCard.getByRole('button', { name: 'Ask AI: what should I verify first?', exact: true }).click();
  await decisionCard.getByText('AI review saved', { exact: true }).waitFor({ timeout: 25_000 });
  const decisionAnswer = await savedAdvisorAnswer(owner, scenarioId, 'AI decision review · v1.2');
  await decisionCard.getByText(decisionAnswer, { exact: true }).waitFor();
}

async function verifyAdvisor({ api, key, owner, other, source, page }) {
  const url = new URL('/functions/v1/advisor', api);
  const call = (recordId, token, origin = callback) => fetch(url, {
    method: 'POST',
    headers: {
      apikey: key, Origin: origin, 'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: JSON.stringify({ recordId }),
  });
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
    // Chromium negotiates the gateway's preflight as part of the actual browser request.
    const wakeFromBrowser = page.evaluate(async ({ endpoint, publicKey, token, id }) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          apikey: publicKey, Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json', 'X-Client-Info': 'cp-retail-ci',
        },
        body: JSON.stringify({ recordId: id }),
      });
      return response.status;
    }, { endpoint: url.href, publicKey: key, token: ownerToken, id: recordId });
    const responses = await Promise.all([wakeFromBrowser, call(recordId, ownerToken).then(response => response.status)]);
    for (const status of responses) assert.equal(status, 202, 'Owner can wake the review');

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

async function verifyLandingContent(t, { api, serviceKey, page, editor, reviewer, client }) {
  assert.ok(serviceKey, 'The isolated fixture has a service credential to seed content membership');
  const service = createClient(api.origin, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  assert.equal(editor.user.role, 'authenticated');
  assert.equal(reviewer.user.role, 'authenticated');
  requireSuccess(await service.from('landing_members').insert([
    { user_id: editor.user.id, role: 'editor' },
    { user_id: reviewer.user.id, role: 'reviewer' },
  ]), 'Seed the two local content member roles');

  const context = await newFixtureContext(page.context().browser(), api);
  t.after(() => context.close());
  const visitorPage = await context.newPage();
  visitorPage.setDefaultTimeout(12_000);
  const visitor = client();
  const title = 'Find your next returning customer';
  const defaultTitle = /^Know who to win back/;
  const imageAlt = 'Customer segments promotion';
  const bucket = 'cp-retail-landing';
  const screenshots = process.env.CP_RETAIL_CONTENT_QA_SCREENSHOTS;
  if (screenshots) await mkdir(screenshots, { recursive: true });
  const capture = (target, file) => screenshots ? target.screenshot({ path: join(screenshots, file) }) : Promise.resolve();

  async function checkEditedHomepage(target) {
    await target.getByRole('heading', { name: title, exact: true }).waitFor();
    const image = target.getByRole('img', { name: imageAlt, exact: true });
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(element => element.decode());
    assert.equal(await target.getByRole('link', { name: 'See the retail demo', exact: true }).getAttribute('href'), '/welcome');
  }

  const contentPath = callback + '/content';
  await signOut(page, editor.user.email);
  await page.goto(contentPath);
  await page.waitForURL(callback + '/login?next=%2Fcontent');
  await fillCredentials(page, editor.user.email, editor.password, 'Log in');
  await page.waitForURL(contentPath);
  await page.getByText('Role: Content editor · Published revision 0', { exact: true }).waitFor();
  await page.getByLabel('Homepage title').fill(title);
  await page.getByLabel('Homepage introduction').fill('A synthetic homepage draft for the two-account browser check.');
  await page.getByLabel('Promotional image').setInputFiles('public/studio-media/706fe44e-e1c0-437c-a53f-ca2f8a0919dc.jpeg');
  await page.getByText('Image uploaded. Preview or save the draft.', { exact: true }).waitFor();
  await page.getByLabel('Image description').fill(imageAlt);
  await page.getByLabel('Demo link label').fill('See the retail demo');
  await page.getByLabel('Demo link', { exact: true }).fill('/welcome');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByText('Draft saved.', { exact: true }).waitFor();
  const draft = requireSuccess(await editor.supabase.from('landing_versions')
    .select('id,author_id,image_path,edit_revision,status').single(), 'Read the editor’s saved draft');
  assert.equal(draft.author_id, editor.user.id);
  assert.equal(draft.status, 'draft');
  assert.ok(draft.image_path.startsWith(editor.user.id + '/'));
  assert.deepEqual(requireSuccess(await reviewer.supabase.from('landing_versions').select('id'), 'Check other member draft visibility'), []);
  assert.ok((await visitor.from('landing_versions').select('id')).error, 'Anonymous draft table reads are denied');
  assert.ok((await reviewer.supabase.storage.from(bucket).createSignedUrl(draft.image_path, 60)).error, 'Other member cannot sign a draft image URL');
  assert.ok((await visitor.storage.from(bucket).createSignedUrl(draft.image_path, 60)).error, 'Visitor cannot sign a draft image URL');
  await visitorPage.goto(callback);
  await visitorPage.getByRole('heading', { name: defaultTitle }).waitFor();

  await page.reload();
  await page.getByRole('button', { name: title + ' · draft', exact: true }).click();
  await page.getByRole('button', { name: 'Preview homepage', exact: true }).click();
  await checkEditedHomepage(page);
  await capture(page, '01-editor-preview.png');
  await page.getByRole('button', { name: 'Back to Content studio', exact: true }).click();
  await page.getByRole('button', { name: 'Submit for review', exact: true }).click();
  await page.getByText('Submitted for review.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Approve and publish', exact: true }).count(), 0);
  const forbidden = await editor.supabase.rpc('publish_landing_version', {
    p_id: draft.id, p_edit_revision: draft.edit_revision + 1, p_expected_generation: 0,
  });
  assert.equal(forbidden.error?.code, '42501', 'Editor cannot publish through the API');

  await signOut(page, editor.user.email);
  await page.goto(contentPath);
  await fillCredentials(page, reviewer.user.email, reviewer.password, 'Log in');
  await page.waitForURL(contentPath);
  await page.getByText('Role: Content reviewer · Published revision 0', { exact: true }).waitFor();
  await page.getByRole('button', { name: title + ' · submitted', exact: true }).click();
  const publish = page.getByRole('button', { name: 'Approve and publish', exact: true });
  assert.ok(await publish.isDisabled(), 'Reviewer must open the submitted preview before publishing through the studio');
  await page.getByRole('button', { name: 'Preview homepage', exact: true }).click();
  await checkEditedHomepage(page);
  await capture(page, '02-reviewer-preview.png');
  await page.getByRole('button', { name: 'Back to Content studio', exact: true }).click();
  await publish.click();
  await page.getByText('Homepage published.', { exact: true }).waitFor();
  await visitorPage.reload();
  await checkEditedHomepage(visitorPage);
  await capture(visitorPage, '03-publication.png');

  await page.getByRole('button', { name: 'Restore previous homepage', exact: true }).click();
  await page.getByText('Previous homepage restored.', { exact: true }).waitFor();
  await page.getByText('Revision 2 · rollback', { exact: true }).waitFor();
  await visitorPage.reload();
  await visitorPage.getByRole('heading', { name: defaultTitle }).waitFor();
  await visitorPage.getByRole('img', { name: 'Convenience store', exact: true }).evaluate(element => element.decode());
  await capture(visitorPage, '04-rollback.png');
  assert.deepEqual(requireSuccess(await reviewer.supabase.from('landing_publication_log')
    .select('generation,action,reviewer_id').order('generation'), 'Read publication and rollback history'), [
    { generation: 1, action: 'publish', reviewer_id: reviewer.user.id },
    { generation: 2, action: 'rollback', reviewer_id: reviewer.user.id },
  ]);
  assert.ok((await visitor.storage.from(bucket).createSignedUrl(draft.image_path, 60)).error, 'Visitor cannot mint new image URLs after rollback');
}

test('the built site verifies email, opens the decision bookmark, resets passwords, and keeps data private', {
  skip: !stack,
  timeout: 180_000,
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
  await t.test('the account name persists in GoTrue without changing the other account', async () => {
    await page.goto(callback + '/account');
    await page.getByLabel('Name', { exact: true }).fill('Retail QA Owner');
    await page.getByRole('button', { name: 'Update name', exact: true }).click();
    await page.getByText('Name updated.', { exact: true }).waitFor();
    await page.reload();
    await page.getByLabel('Name', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Name', { exact: true }).inputValue(), 'Retail QA Owner');
    const owner = requireSuccess(await a.supabase.auth.getUser(), 'Read updated account name').user;
    const other = requireSuccess(await b.supabase.auth.getUser(), 'Read other account name').user;
    assert.equal(owner.user_metadata.full_name, 'Retail QA Owner');
    assert.equal(other.user_metadata.full_name, b.user.user_metadata.full_name);
    assert.equal(owner.email, a.email);
    assert.ok(owner.email_confirmed_at, 'Name edits retain email verification');
    await page.goto(callback + '/workspace');
  });
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

  await page.goto(callback + '/old-home');
  await page.getByRole('heading', { name: 'My Scenarios', exact: true }).waitFor();
  await page.getByText(scenario.name, { exact: true }).waitFor();

  const legacyDetail = '/item-details?recordId=' + encodeURIComponent(saved.id);
  await signOut(page, a.email);
  await page.goto(callback + legacyDetail);
  await page.waitForURL(callback + '/login?next=' + encodeURIComponent(legacyDetail));
  await fillCredentials(page, a.email, password, 'Log in');
  await page.waitForURL(callback + legacyDetail);
  await page.getByRole('heading', { name: scenario.name, exact: true }).waitFor();

  await signOut(page, a.email);
  await page.goto(callback + legacyDetail);
  await page.waitForURL(callback + '/login?next=' + encodeURIComponent(legacyDetail));
  await fillCredentials(page, b.email, password, 'Log in');
  await page.waitForURL(callback + legacyDetail);
  await page.getByRole('heading', { name: 'Scenario unavailable', exact: true }).waitFor();
  assert.equal(await page.getByText(scenario.name, { exact: true }).count(), 0);

  const sectionPath = '/workspace?view=profiles';
  await page.goto(callback + '/my-decisions');
  await page.getByRole('button', { name: 'Customers', exact: true }).click();
  await page.waitForURL(callback + sectionPath);
  const otherTab = await page.context().newPage();
  try {
    await signOut(otherTab, b.email);
  } finally { await otherTab.close(); }
  await page.waitForURL(callback + '/login?next=' + encodeURIComponent(sectionPath));
  await fillCredentials(page, b.email, password, 'Log in');
  await page.waitForURL(callback + sectionPath);
  await page.getByRole('heading', { name: 'Customer profiles', exact: true }).waitFor();
  await signOut(page, b.email);

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
  await t.test('customer groups and Recommendations render saved Advisor answers', async () => {
    await verifyAdvisorScreens(page, signedIn, saved.id);
  });
  await t.test('the real Edge handler saves both Advisor answers for the verified owner', async () => {
    await verifyAdvisor({ api, key, owner: signedIn, other: b.supabase, source: saved.id, page });
  });
  await t.test('modified analysis settings reopen from the isolated Supabase dataset', async () => {
    await page.goto(callback + '/workspace?view=profiles');
    const data = page.getByRole('region', { name: 'Your data', exact: true });
    const lookback = page.getByRole('combobox', { name: /^Lookback window/ });
    const savedData = data.getByRole('combobox', { name: /^Saved data/ });
    await data.getByRole('button', { name: 'Open demo store', exact: true }).click();
    await data.getByText(/analysis date 2026-11-05 · saved to your account/).waitFor();
    await page.getByLabel('Analysis date', { exact: true }).fill('2026-11-07');
    await lookback.selectOption('60');
    await page.getByRole('button', { name: 'Analyze transactions', exact: true }).click();
    await data.getByText(/analysis date 2026-11-07 · not saved yet/).waitFor();
    await data.getByRole('button', { name: 'Save to my account', exact: true }).click();
    await data.getByText(/analysis date 2026-11-07 · saved to your account/).waitFor();

    const rows = requireSuccess(await signedIn.from('datasets')
      .select('id,owner_id,source,csv,as_of,window_days'), 'Read saved datasets');
    const canonical = rows.find(row => row.csv === 'demo:207');
    const custom = rows.find(row => row.as_of === '2026-11-07');
    assert.equal(canonical?.window_days, 30);
    assert.equal(custom?.owner_id, a.user.id);
    assert.equal(custom?.source, 'demo');
    assert.equal(custom?.window_days, 60);
    assert.match(custom.csv, /^transaction_id,customer_id,/);

    await page.reload();
    await data.getByText(/analysis date 2026-11-07 · saved to your account/).waitFor();
    assert.equal(await lookback.inputValue(), '60');
    await savedData.selectOption(canonical.id);
    await data.getByText(/analysis date 2026-11-05 · saved to your account/).waitFor();
    assert.equal(await lookback.inputValue(), '30');
    await savedData.selectOption(custom.id);
    await data.getByText(/analysis date 2026-11-07 · saved to your account/).waitFor();
    assert.equal(await lookback.inputValue(), '60');
  });
  await t.test('two ordinary members save, preview, publish, and roll back homepage content', async studioTest => {
    await verifyLandingContent(studioTest, {
      api, serviceKey: status.SECRET_KEY ?? status.SERVICE_ROLE_KEY, page, client,
      editor: { user, supabase: signedIn, password: nextPassword },
      reviewer: { user: b.user, supabase: b.supabase, password },
    });
  });
});
