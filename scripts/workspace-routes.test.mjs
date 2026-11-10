import assert from 'node:assert/strict';
import test from 'node:test';
import { staticPaths, workspaceInitialView, workspaceReturnPath } from '../src/lib/routes.mjs';

const origin = 'https://retail.example';
const returnTo = path => workspaceReturnPath('?next=' + encodeURIComponent(path), origin);

test('sign-in returns to the legacy decisions bookmark or the linked scenario', () => {
  assert.ok(staticPaths.includes('/my-decisions'));
  assert.equal(returnTo('/my-decisions/'), '/my-decisions');
  assert.equal(returnTo('/workspace?recordId=scenario-1'), '/workspace?recordId=scenario-1');
  assert.equal(returnTo('/pixso-preview?recordId=scenario-1'), '/workspace?recordId=scenario-1');
});

test('legacy scenario bookmarks keep the scenario view and record ID after sign-in', () => {
  for (const path of ['/old-home', '/item-details']) {
    assert.ok(staticPaths.includes(path));
    assert.equal(workspaceInitialView(path), 'my-scenarios');
  }
  assert.equal(returnTo('/old-home'), '/old-home');
  assert.equal(returnTo('/item-details?recordId=scenario-1'), '/item-details?recordId=scenario-1');
});

test('sign-in falls back to the workspace for unsupported or external destinations', () => {
  assert.equal(returnTo('//other.example/my-decisions'), '/workspace');
  assert.equal(returnTo('/account'), '/workspace');
  assert.equal(returnTo('//[broken'), '/workspace');
});
