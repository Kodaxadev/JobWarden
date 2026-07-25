import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNavigationGuard } from '../js/ui/navigationGuard.js';

test('a clean form can leave without asking', async () => {
  let asks = 0;
  const guard = createNavigationGuard(() => { asks += 1; return false; });
  assert.equal(await guard.canLeave(), true);
  assert.equal(asks, 0);
});

test('a dirty form asks and respects the answer', async () => {
  const answers = [false, true];
  const guard = createNavigationGuard(() => answers.shift());
  guard.markDirty();
  assert.equal(guard.isDirty(), true);
  assert.equal(await guard.canLeave(), false);
  assert.equal(await guard.canLeave(), true);
});

test('reset makes a saved form clean again', async () => {
  const guard = createNavigationGuard(() => false);
  guard.markDirty();
  guard.reset();
  assert.equal(guard.isDirty(), false);
  assert.equal(await guard.canLeave(), true);
});
