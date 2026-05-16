// scripts/context-watch.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initState, sessionAdd } from './adhd-state.mjs';
import { pressure } from './context-watch.mjs';

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'adhd-cw-'));
}

test('fresh session has zero score and does not advise', () => {
  const cwd = tmp();
  initState(cwd);
  const p = pressure(cwd);
  assert.equal(p.score, 0);
  assert.equal(p.advise, false);
});

test('three high-effort stages cross the threshold', () => {
  const cwd = tmp();
  initState(cwd);
  sessionAdd(cwd, 'vision');     // high = 3
  sessionAdd(cwd, 'milestones'); // high = 3
  sessionAdd(cwd, 'map');        // high = 3  -> 9 >= 8
  const p = pressure(cwd);
  assert.equal(p.score, 9);
  assert.equal(p.advise, true);
});

test('--next pre-emptively advises when the next stage would cross', () => {
  const cwd = tmp();
  initState(cwd);
  sessionAdd(cwd, 'vision');   // 3
  sessionAdd(cwd, 'features'); // 2  -> 5
  const p = pressure(cwd, { next: 'milestone-ux' }); // high = 3 -> 8
  assert.equal(p.advise, true);
  assert.match(p.reason, /milestone-ux/);
});

test('below threshold does not advise', () => {
  const cwd = tmp();
  initState(cwd);
  sessionAdd(cwd, 'setup');    // 1
  sessionAdd(cwd, 'features'); // 2  -> 3
  assert.equal(pressure(cwd).advise, false);
});
