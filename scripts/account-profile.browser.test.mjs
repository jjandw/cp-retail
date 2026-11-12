import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';
import { createServer } from 'vite';

// Actual CloudApp and account UI; Auth is an in-browser fixture with no credentials.
// The hosted-auth suite separately covers persistence against isolated GoTrue.
const authFixture = `
const initial = {a:{full_name:'Alex',keep:'a'},b:{full_name:'Blake',keep:'b'}};
const profiles = JSON.parse(localStorage.getItem('profile-qa') || JSON.stringify(initial));
let id = sessionStorage.getItem('profile-user') || 'a';
const user = key => ({id:key,email:key+'@example.com',user_metadata:{...profiles[key]}});
let state = {session:{user:user(id)},recovery:false};
const listeners = new Set();
const emit = () => {state={session:{user:user(id)},recovery:false};for(const fn of listeners)fn();};
let held, release, fail = false;
const writes = [];
export const getAuthState = () => state;
export const subscribeAuth = fn => {listeners.add(fn);return () => listeners.delete(fn);};
export const supabase = {auth:{async updateUser(payload) {
  const owner = id;
  writes.push({owner,payload});
  if(held)await held;
  if(fail){fail=false;return {error:new Error('fixture write failure')};}
  profiles[owner]={...profiles[owner],...payload.data};
  localStorage.setItem('profile-qa',JSON.stringify(profiles));
  emit();
  return {data:{user:user(owner)},error:null};
}}};
window.profileQA = {
  writes, profiles,
  hold(){held=new Promise(resolve=>{release=resolve;});},
  release(){held=null;release();},
  failNext(){fail=true;},
  switchUser(next){id=next;sessionStorage.setItem('profile-user',id);emit();}
};
`;

test('account names preserve in-flight edits, survive reload, and reset on account changes (mock Auth)', { timeout: 60_000 }, async t => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const server = await createServer({
    configFile: false, root, envDir: false,
    resolve: { alias: [
      { find: '@/lib/supabase-client', replacement: '/@qa-auth' },
      { find: './lib/supabase-client', replacement: '/@qa-auth' },
      { find: '@/lib/landing-content', replacement: '/@qa-content' },
      { find: '@', replacement: root + 'src' },
    ] },
    plugins: [{
      name: 'isolated-account-profile-fixture',
      resolveId(id) { if (['/@qa-auth', '/@qa-content', '/@qa-entry'].includes(id)) return id; },
      load(id) {
        if (id === '/@qa-auth') return authFixture;
        if (id === '/@qa-content') return 'export const readLandingRole = async () => null;';
        if (id === '/@qa-entry') return `
          import React from 'react';import {createRoot} from 'react-dom/client';
          import CloudApp from '/src/CloudApp.tsx';import '/src/shell.css';
          createRoot(document.getElementById('root')).render(React.createElement(CloudApp,{path:'/account'}));
        `;
      },
      configureServer(vite) {
        vite.middlewares.use('/account', (_request, response) => {
          response.setHeader('Content-Type', 'text/html');
          response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/@qa-entry"></script></body></html>');
        });
      },
    }],
    server: { host: '127.0.0.1', port: 4176, strictPort: true, hmr: false },
  });
  t.after(() => server.close());
  await server.listen();
  const origin = 'http://127.0.0.1:4176';
  const browser = await chromium.launch({ channel: process.env.CP_RETAIL_BROWSER_CHANNEL || undefined });
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(8_000);
  await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await page.goto(origin + '/account');
  const name = page.getByRole('textbox', { name: 'Name', exact: true });
  const save = page.getByRole('button', { name: 'Update name', exact: true });
  await name.waitFor();
  assert.equal(await name.inputValue(), 'Alex');
  assert.ok(await save.isDisabled());
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await page.evaluate(() => [...document.fonts].some(font => font.family === 'Inter' && font.status === 'loaded')), 'Bundled Inter renders with external origins blocked');
  await name.fill('   ');
  await save.click();
  await page.getByRole('alert').filter({ hasText: 'Enter a name' }).waitFor();
  assert.equal(await page.evaluate(() => window.profileQA.writes.length), 0);
  await name.fill('  林 Alex  ');
  await page.evaluate(() => window.profileQA.hold());
  await save.click();
  await page.getByRole('button', { name: 'Saving name…', exact: true }).waitFor();
  await name.fill('Alex second edit');
  await page.evaluate(() => window.profileQA.release());
  await save.waitFor();
  assert.equal(await name.inputValue(), 'Alex second edit');
  await page.getByText('You have unsaved name changes.', { exact: true }).waitFor();
  assert.equal(await page.getByText('Name updated.', { exact: true }).count(), 0);
  assert.deepEqual(await page.evaluate(() => window.profileQA.writes[0]), { owner: 'a', payload: { data: { full_name: '林 Alex' } } });
  await page.evaluate(() => window.profileQA.failNext());
  await save.click();
  await page.getByRole('alert').filter({ hasText: 'Could not update your name' }).waitFor();
  assert.equal(await name.inputValue(), 'Alex second edit');
  assert.equal(await page.evaluate(() => window.profileQA.profiles.a.full_name), '林 Alex');
  await save.click();
  await page.getByText('Name updated.', { exact: true }).waitFor();
  await page.reload();
  await name.waitFor();
  assert.equal(await name.inputValue(), 'Alex second edit');
  assert.deepEqual(await page.evaluate(() => window.profileQA.profiles.a), { full_name: 'Alex second edit', keep: 'a' });
  assert.deepEqual(await page.evaluate(() => window.profileQA.profiles.b), { full_name: 'Blake', keep: 'b' });
  if (process.env.CP_RETAIL_PROFILE_QA_SCREENSHOT) {
    await mkdir(dirname(process.env.CP_RETAIL_PROFILE_QA_SCREENSHOT), { recursive: true });
    await page.screenshot({ path: process.env.CP_RETAIL_PROFILE_QA_SCREENSHOT });
  }
  await name.fill('Unsaved A text');
  await page.evaluate(() => window.profileQA.switchUser('b'));
  await page.getByText('Signed in as b@example.com', { exact: true }).waitFor();
  assert.equal(await name.inputValue(), 'Blake', 'Switching accounts clears the preceding account draft');
  assert.ok(await save.isDisabled());
  await page.evaluate(() => window.profileQA.switchUser('a'));
  await page.getByText('Signed in as a@example.com', { exact: true }).waitFor();
  assert.equal(await name.inputValue(), 'Alex second edit');
});
