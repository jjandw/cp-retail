import { lstat, realpath, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from 'vite';

const branch = process.env.CF_PAGES_BRANCH;
const commit = process.env.CF_PAGES_COMMIT_SHA;
if (!branch || !/^[0-9a-f]{40}$/.test(commit ?? '')) {
  throw Error('Set CF_PAGES_BRANCH and CF_PAGES_COMMIT_SHA to the source revision.');
}

const production = branch === 'main';
const backendUrl = process.env.VITE_SUPABASE_URL?.trim() ?? '';
const backendKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
const cloud = production || Boolean(backendUrl || backendKey);

if (cloud) {
  if (!backendUrl || !backendKey) throw Error('Set both Supabase URL and publishable key for an account-enabled Pages build.');
  const productionUrl = process.env.CP_RETAIL_PRODUCTION_SUPABASE_URL?.trim();
  const expected = productionUrl && URL.canParse(productionUrl) ? new URL(productionUrl) : null;
  if (!expected || expected.protocol !== 'https:' || expected.href !== expected.origin + '/') {
    throw Error('Set CP_RETAIL_PRODUCTION_SUPABASE_URL to the production Supabase HTTPS origin.');
  }
  const backend = URL.canParse(backendUrl) ? new URL(backendUrl) : null;
  if (production && backend?.origin !== expected.origin) {
    throw Error('The main branch build requires the configured production Supabase origin.');
  }
  if (!production && backend?.origin === expected.origin) {
    throw Error('A branch preview must use a separate Supabase project.');
  }
}

// Use only the host's explicit settings even if the build is reproduced from a local checkout.
process.env.VITE_SUPABASE_URL = backendUrl;
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = backendKey;
process.env.VITE_ENABLE_ADVISOR = cloud && process.env.VITE_ENABLE_ADVISOR === 'true' ? 'true' : 'false';

const root = await realpath(new URL('../', import.meta.url));
const outDir = join(root, 'dist');
try {
  const output = await lstat(outDir);
  if (!output.isDirectory() || await realpath(outDir) !== outDir) {
    throw Error('The Pages output must be a regular dist directory in this checkout.');
  }
  // A preview built after a cloud release must not upload any old release assets.
  await rm(outDir, { recursive: true });
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

await build({ root, mode: cloud ? 'cloud' : 'production', envFile: false, build: { outDir } });
const release = { branch, commit, environment: production ? 'production' : 'preview', cloud };
await writeFile(join(outDir, 'release.json'), JSON.stringify(release) + '\n', 'utf8');
