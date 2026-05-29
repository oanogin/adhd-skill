// scripts/context-watch.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initConfig, sessionAdd } from './adhd-state.mjs';
import { pressure } from './context-watch.mjs';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'adhd-cw-')); }

test('fresh session has zero score and does not advise', () => {
  const cwd = tmp();
  initConfig(cwd);
  const p = pressure(cwd);
  assert.equal(p.score, 0);
  assert.equal(p.advise, false);
});

test('three high-effort stages cross the threshold', () => {
  const cwd = tmp();
  initConfig(cwd);
  sessionAdd(cwd, 'vision');    // high = 3
  sessionAdd(cwd, 'prototype');  // high = 3
  sessionAdd(cwd, 'ux-refine');  // high = 3  -> 9 >= 8
  const p = pressure(cwd);
  assert.equal(p.score, 9);
  assert.equal(p.advise, true);
});

test('--next pre-emptively advises when the next stage would cross', () => {
  const cwd = tmp();
  initConfig(cwd);
  sessionAdd(cwd, 'vision');  // 3
  sessionAdd(cwd, 'stories'); // 2  -> 5
  const p = pressure(cwd, { next: 'ux-refine' }); // high = 3 -> 8
  assert.equal(p.advise, true);
  assert.match(p.reason, /ux-refine/);
});

test('below threshold does not advise', () => {
  const cwd = tmp();
  initConfig(cwd);
  sessionAdd(cwd, 'setup');   // 1
  sessionAdd(cwd, 'stories'); // 2  -> 3
  assert.equal(pressure(cwd).advise, false);
});
