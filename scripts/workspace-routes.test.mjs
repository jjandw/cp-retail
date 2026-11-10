import assert from 'node:assert/strict';
import test from 'node:test';
import { staticPaths, workspaceReturnPath } from '../src/lib/routes.mjs';

const origin = 'https://retail.example';
const returnTo = path => workspaceReturnPath('?next=' + encodeURIComponent(path), origin);

test('sign-in returns to the legacy decisions bookmark or the linked scenario', () => {
  assert.ok(staticPaths.includes('/my-decisions'));
  assert.equal(returnTo('/my-decisions/'), '/my-decisions');
  assert.equal(returnTo('/workspace?recordId=scenario-1'), '/workspace?recordId=scenario-1');
  assert.equal(returnTo('/pixso-preview?recordId=scenario-1'), '/workspace?recordId=scenario-1');
});

test('sign-in falls back to the workspace for unsupported or external destinations', () => {
  assert.equal(returnTo('//other.example/my-decisions'), '/workspace');
  assert.equal(returnTo('/account'), '/workspace');
  assert.equal(returnTo('//[broken'), '/workspace');
});
