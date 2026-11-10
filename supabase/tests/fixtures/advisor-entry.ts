// Used only inside the disposable GitHub Actions project.
const nativeFetch = globalThis.fetch;
const supabaseOrigin = new URL(Deno.env.get('SUPABASE_URL')!).origin;
const modelUrl = 'https://apim-ent207tc.azure-api.net/deepseek/openai/v1/chat/completions';

globalThis.fetch = async (request, init) => {
  const url = new URL(request instanceof Request ? request.url : request);
  if (url.origin === supabaseOrigin) return nativeFetch(request, init);
  if (url.href !== modelUrl || init?.method !== 'POST' || typeof init.body !== 'string'
    || new Headers(init.headers).get('api-key') !== 'local-advisor-fixture') {
    throw Error('The Advisor fixture allows only the local Supabase API and the mocked model.');
  }
  const modelRequest = JSON.parse(init.body);
  const inputs = JSON.parse(modelRequest.messages[1].content);
  const content = JSON.stringify({
    focus: Object.keys(inputs.allowedFocus)[0],
    checks: Object.keys(inputs.allowedChecks).slice(0, 2),
  });
  return Response.json({ choices: [{ finish_reason: 'stop', message: { content } }] });
};

await import('./production.ts');
