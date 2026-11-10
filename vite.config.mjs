import { fileURLToPath, URL } from 'node:url';
import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { defineConfig, loadEnv } from 'vite';

const entryRoutes = ['welcome', 'workspace', 'pixso-preview', 'login', 'sign-up', 'forgot-password', 'reset-password', 'account'];

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
  if (mode === 'cloud' && !url) throw Error('A cloud build requires the Supabase URL and publishable key.');
  return {
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    plugins: [{
      name: 'cp-retail-cloud-entry-routes',
      apply: 'build',
      async writeBundle({ dir }) {
        if (mode !== 'cloud') return;
        // Static hosts can serve password links and workspace deep links as directory indexes.
        await Promise.all(entryRoutes.map(async route => {
          const target = join(dir, route);
          await mkdir(target, { recursive: true });
          await copyFile(join(dir, 'index.html'), join(target, 'index.html'));
        }));
      },
    }],
  };
});
