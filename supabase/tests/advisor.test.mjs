import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdvisorHandler } from '../functions/advisor/handler.mjs';
import { opsAiFingerprint } from '../functions/_shared/advisor/context.mjs';
import { comparison, group } from './fixtures/advisor-contexts.mjs';

const origin = 'https://retail.example';

function setup(context = JSON.stringify(group)) {
  const row = {
    id: 'review-id', owner_id: 'owner-a', request_status: 'Queued',
    name: 'Private label', context, fingerprint: opsAiFingerprint(context),
  };
  const calls = [];
  const config = { allowedOrigins: [origin], apiKey: 'fixture-key' };
  const store = {
    async authenticate(token) {
      return token === 'owner-a' || token === 'owner-b' ? token : null;
    },
    async get(id, owner) {
      return row.id === id && row.owner_id === owner ? { ...row } : null;
    },
    async claim(id, owner) {
      if (row.id !== id || row.owner_id !== owner || row.request_status !== 'Queued') return false;
      row.request_status = 'Processing';
      return true;
    },
    async update(expected, from, patch) {
      assert.equal(expected.owner_id, row.owner_id);
      if (row.request_status === from) Object.assign(row, patch);
    },
  };
  const fetchModel = async (_url, request) => {
    const inputs = JSON.parse(JSON.parse(request.body).messages[1].content);
    calls.push(request.body);
    const content = config.selection ?? JSON.stringify({
      focus: Object.keys(inputs.allowedFocus)[0], checks: Object.keys(inputs.allowedChecks).slice(0, 2),
    });
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content } }] });
  };
  return { row, calls, store, config, fetchModel, handle: createAdvisorHandler({ ...config, store, fetchModel }) };
}

function wake({ token = 'owner-a', from = origin, body = '{"recordId":"review-id"}' } = {}) {
  return new Request('https://advisor.example/advisor', {
    method: 'POST', headers: { Origin: from, Authorization: 'Bearer ' + token }, body,
  });
}

test('the same review can be woken concurrently and persists one grounded answer', async () => {
  const { handle, row, calls } = setup();
  const responses = await Promise.all([handle(wake()), handle(wake()), handle(wake())]);
  for (const response of responses) {
    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), { accepted: true });
  }
  assert.equal(calls.length, 1);
  assert.equal(row.request_status, 'Completed');
  assert.match(row.answer, /30 customers/);
  assert.doesNotMatch(calls[0], /review-id|owner-a|Private label/);
});

test('the operations Advisor still renders the existing decision review', async () => {
  const { handle, row, calls } = setup(comparison);
  assert.equal((await handle(wake())).status, 202);
  assert.equal(row.request_status, 'Completed');
  assert.match(row.answer, /AI decision review · v1.2/);
  assert.match(calls[0], /comparison/);
});

test('invalid authentication, origin, owner or payload cannot reach the model', async () => {
  const { handle, calls, row } = setup();
  assert.equal((await handle(wake({ token: 'invalid' }))).status, 401);
  assert.equal((await handle(wake({ from: 'https://different.example' }))).status, 403);
  assert.equal((await handle(wake({ token: 'owner-b' }))).status, 404);
  assert.equal((await handle(wake({ body: '{"recordId":"review-id","context":"new prompt"}' }))).status, 400);
  assert.equal((await handle(wake({ body: 'x'.repeat(257) }))).status, 400);
  const cors = await handle(new Request('https://advisor.example/advisor', { method: 'OPTIONS', headers: { Origin: origin } }));
  assert.equal(cors.status, 204);
  assert.equal(cors.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(calls.length, 0);
  assert.equal(row.request_status, 'Queued');
});

test('invalid context and a changed fingerprint fail before reserving a model attempt', async () => {
  const badContext = setup(JSON.stringify({ ...group, identifier: 'private data' }));
  const badFingerprint = setup();
  badFingerprint.row.fingerprint = 'mismatch';
  for (const { row, handle, calls } of [badContext, badFingerprint]) {
    await handle(wake());
    assert.equal(row.request_status, 'Failed');
    assert.equal(calls.length, 0);
  }
});

test('a rejected model selection is never replayed for the same row', async () => {
  const { handle, row, calls, config } = setup();
  config.selection = '{"focus":"invented","checks":["trial"]}';
  await handle(wake());
  await handle(wake());
  assert.equal(row.request_status, 'Failed');
  assert.equal(calls.length, 1);
  assert.match(row.error_message, /No automatic model retry/);
  assert.doesNotMatch(row.error_message, /invented/);
});

test('a transient result write retries the same answer, with no second model call', async () => {
  const { row, calls, store, config, fetchModel } = setup();
  const update = store.update;
  let attempts = 0;
  store.update = async (...args) => {
    if (++attempts === 1) throw Error('Temporary network error.');
    await update(...args);
  };
  const handle = createAdvisorHandler({ ...config, store, fetchModel });
  await handle(wake());
  assert.equal(row.request_status, 'Completed');
  assert.equal(attempts, 2);
  assert.equal(calls.length, 1);
});
