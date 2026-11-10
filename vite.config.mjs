import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

function publishable(key) {
  if (key.startsWith('sb_publishable_')) return true;
  try {
    return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')).role === 'anon';
  } catch {
    return false;
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_SUPABASE_');
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (Boolean(url) !== Boolean(key)) throw Error('Set both Supabase URL and publishable key to enable cloud accounts.');
  if (key && !publishable(key)) throw Error('Use a Supabase publishable or legacy anon key in the frontend.');
  return { resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } } };
});
