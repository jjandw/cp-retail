import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { parseEnv } from 'node:util';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';

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
  return { access_token, refresh_token };
}

test('local Supabase accepts verified email accounts, isolates workspace rows, and resets passwords', {
  skip: !stack,
  timeout: 90_000,
}, async () => {
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
  const password = 'Synthetic!' + randomUUID();
  const seen = new Set();
  const signup = async label => {
    const supabase = client();
    const email = 'cp-retail-' + label + '-' + randomUUID().slice(0, 8) + '@example.com';
    const signupResult = requireSuccess(await supabase.auth.signUp({
      email, password, options: { emailRedirectTo: callback + '/workspace' },
    }), 'Sign up ' + label);
    assert.equal(signupResult.session, null, 'Sign up requires email verification');
    const before = await supabase.auth.signInWithPassword({ email, password });
    assert.equal(before.error?.code, 'email_not_confirmed');
    await verifyLink(await mailLink(mailpit, email, 'signup', seen), callback + '/workspace');
    const { user } = requireSuccess(await supabase.auth.signInWithPassword({ email, password }), 'Sign in ' + label);
    assert.equal(user.id, signupResult.user.id);
    assert.ok(user.email_confirmed_at, 'Email is marked confirmed');
    return { supabase, email, user };
  };

  const a = await signup('a');
  const b = await signup('b');
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

  const recovering = client();
  await delay(1_050); // Respect the fixture's per-account mail interval.
  requireSuccess(await recovering.auth.resetPasswordForEmail(a.email, { redirectTo: callback + '/reset-password' }), 'Send recovery email');
  const recoveredSession = await verifyLink(await mailLink(mailpit, a.email, 'recovery', seen), callback + '/reset-password');
  requireSuccess(await recovering.auth.setSession(recoveredSession), 'Open recovery session');
  const nextPassword = 'Recovered!' + randomUUID();
  requireSuccess(await recovering.auth.updateUser({ password: nextPassword }), 'Update password');
  const wrongPassword = await client().auth.signInWithPassword({ email: a.email, password });
  assert.equal(wrongPassword.error?.code, 'invalid_credentials');
  const signedIn = client();
  const { user } = requireSuccess(await signedIn.auth.signInWithPassword({ email: a.email, password: nextPassword }), 'Sign in with recovered password');
  assert.equal(user.id, a.user.id);
  const retained = requireSuccess(await signedIn.from('scenarios').select('id').eq('id', saved.id).single(), 'Read scenario after recovery');
  assert.equal(retained.id, saved.id);
});
