import assert from 'node:assert/strict';
import test from 'node:test';
import { staticPaths, workspaceHref, workspaceLocation, workspaceReturnPath } from '../src/lib/routes.mjs';

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
    assert.equal(workspaceLocation(new URL(path, origin)).view, 'my-scenarios');
  }
  assert.equal(returnTo('/old-home'), '/old-home');
  assert.equal(returnTo('/item-details?recordId=scenario-1'), '/item-details?recordId=scenario-1');
});

test('workspace locations preserve sections and detail IDs through sign-in', () => {
  const section = workspaceHref('profiles');
  assert.equal(section, '/workspace?view=profiles');
  assert.equal(returnTo(section), section);
  assert.deepEqual(workspaceLocation(new URL(section, origin)), { view: 'profiles', recordId: null });
  assert.deepEqual(workspaceLocation(new URL('/workspace?view=unknown', origin)), { view: 'start', recordId: null });
  const recordId = 'legacy+a/b';
  const detail = workspaceHref('my-scenarios', recordId);
  assert.equal(returnTo(detail), detail);
  assert.deepEqual(workspaceLocation(new URL(detail, origin)), { view: 'my-scenarios', recordId });
  assert.deepEqual(workspaceLocation(new URL('/item-details/?recordId=old-1', origin)), { view: 'my-scenarios', recordId: 'old-1' });
  assert.equal(workspaceLocation(new URL('/my-decisions', origin)).view, 'my-decisions');
});

test('sign-in falls back to the workspace for unsupported or external destinations', () => {
  assert.equal(returnTo('//other.example/my-decisions'), '/workspace');
  assert.equal(returnTo('/account'), '/workspace');
  assert.equal(returnTo('//[broken'), '/workspace');
});
