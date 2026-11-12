import * as ops from '../_shared/advisor/review.mjs';
import * as profile from '../_shared/advisor/profile.mjs';
import { PROMPT } from '../_shared/advisor/prompt.mjs';

const MODEL_URL = 'https://apim-ent207tc.azure-api.net/deepseek/openai/v1/chat/completions';
const MAX_BODY_BYTES = 256;

class ReviewError extends Error {}

function reviewInputs(row) {
  if (ops.opsAiFingerprint(row.context) !== row.fingerprint) throw Error('Review fingerprint changed.');
  const groupReview = JSON.parse(row.context).version === 'profile-ai-1.0';
  const reviewer = groupReview ? profile : ops;
  const context = reviewer.sanitize(row.context);
  const { focuses, checks } = reviewer.choices(context);
  return {
    reviewer,
    context,
    messages: [
      { role: 'system', content: groupReview ? profile.PROMPT : PROMPT },
      { role: 'user', content: JSON.stringify({
        [groupReview ? profile.CONTEXT_KEY : 'comparison']: context,
        allowedFocus: focuses,
        allowedChecks: checks,
      }) },
    ],
  };
}

async function modelAnswer({ reviewer, context, messages }, apiKey, fetchModel) {
  const response = await fetchModel(MODEL_URL, {
    method: 'POST',
    headers: { 'api-key': apiKey, Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'DeepSeek-V4-Flash', max_tokens: 220, messages }),
    signal: AbortSignal.timeout(22000),
  });
  if (!response.ok) throw new ReviewError('DeepSeek cloud review failed (' + response.status + ').');
  const { choices } = await response.json();
  const choice = choices?.[0];
  if (!choice || ![undefined, null, 'stop'].includes(choice.finish_reason)) {
    throw new ReviewError('DeepSeek returned an incomplete review.');
  }
  const answer = reviewer.render(context, reviewer.selection(choice.message?.content, context));
  if (!reviewer.validAnswer(answer, context)) throw Error('Review failed grounding validation.');
  return answer;
}

async function runClaimedReview(store, row, inputs, apiKey, fetchModel) {
  let answer;
  try {
    answer = await modelAnswer(inputs, apiKey, fetchModel);
  } catch (error) {
    const message = error instanceof ReviewError ? error.message : 'The cloud AI result could not be confirmed.';
    await store.update(row, 'Processing', { request_status: 'Failed', error_message: message + ' No automatic model retry was made.' });
    return;
  }

  const result = { request_status: 'Completed', answer, answered_at: new Date().toISOString(), error_message: null };
  try {
    await store.update(row, 'Processing', result);
  } catch {
    // A network error during the final write can be retried with the same answer.
    await store.update(row, 'Processing', result);
  }
}

async function readRecordId(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const bytes = new Uint8Array(MAX_BODY_BYTES);
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (length + value.length > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      bytes.set(value, length);
      length += value.length;
    }
    const input = JSON.parse(new TextDecoder().decode(bytes.subarray(0, length)));
    return input && Object.keys(input).join() === 'recordId'
      && typeof input.recordId === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(input.recordId)
      ? input.recordId : null;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export function createAdvisorHandler({ store, apiKey, allowedOrigins, fetchModel = fetch, waitUntil }) {
  return async function handle(request) {
    const origin = request.headers.get('Origin');
    const allowed = origin && allowedOrigins.includes(origin);
    const headers = {
      'Cache-Control': 'no-store',
      Vary: 'Origin',
      ...(allowed ? { 'Access-Control-Allow-Origin': origin } : {}),
    };
    const reply = (status, error) => Response.json(error ? { error } : { accepted: true }, { status, headers });
    if (origin && !allowed) return reply(403, 'Origin is not allowed.');
    if (request.method === 'OPTIONS') return new Response(null, {
      status: 204,
      headers: {
        ...headers,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-region',
      },
    });
    if (request.method !== 'POST') return reply(405, 'Use POST.');
    const token = /^Bearer ([^\s]+)$/i.exec(request.headers.get('Authorization') ?? '')?.[1];
    if (!token) return reply(401, 'Sign in to request a review.');
    if (!store || !apiKey) return reply(503, 'The AI service is unavailable.');

    try {
      const actor = await store.authenticate(token);
      if (!actor) return reply(401, 'Sign in to request a review.');
      const recordId = await readRecordId(request);
      if (!recordId) return reply(400, 'Provide a valid request ID.');
      const row = await store.get(recordId, actor);
      if (!row) return reply(404, 'Review request unavailable.');
      if (row.request_status === 'Processing') {
        // A check can expire an uncertain claim. It cannot replay a model call.
        await store.claim(recordId, actor);
        return reply(202);
      }
      if (row.request_status !== 'Queued') return reply(202);

      let inputs;
      try {
        inputs = reviewInputs(row);
      } catch {
        await store.update(row, 'Queued', {
          request_status: 'Failed',
          error_message: 'The numerical context is invalid or changed. Recalculate the comparison in the app.',
        });
        return reply(202);
      }
      if (await store.claim(recordId, actor)) {
        const work = runClaimedReview(store, row, inputs, apiKey, fetchModel).catch(() => {
          console.error('Advisor result persistence failed.');
        });
        if (waitUntil) waitUntil(work);
        else await work;
      }
      return reply(202);
    } catch {
      return reply(503, 'The review could not be checked. Check the same request again.');
    }
  };
}
