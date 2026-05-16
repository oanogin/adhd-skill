// scripts/adhd-state.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  defaultState, loadState, saveState, initState,
  setStageStatus, gate, nextStage, statusReport,
  sessionAdd, sessionReset, FRONTLOAD_STAGES,
} from './adhd-state.mjs';

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'adhd-'));
}
function touch(cwd, rel) {
  const p = path.join(cwd, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, 'x');
}

test('defaultState has all front-load stages blocked and version 1', () => {
  const s = defaultState();
  assert.equal(s.version, 1);
  assert.equal(s.docHome, 'docs');
  assert.equal(s.currentMilestone, 1);
  for (const stage of FRONTLOAD_STAGES) {
    assert.equal(s.frontload[stage].status, 'blocked');
  }
});

test('initState writes state.json, is idempotent, sets setup pending', () => {
  const cwd = tmp();
  const s1 = initState(cwd);
  assert.ok(fs.existsSync(path.join(cwd, 'project/state.json')));
  assert.equal(s1.frontload.setup.status, 'pending');
  const s2 = initState(cwd);
  assert.equal(s2.createdAt, s1.createdAt); // not re-created
});

test('loadState returns null when no state.json', () => {
  assert.equal(loadState(tmp()), null);
});

test('saveState round-trips and bumps updatedAt', () => {
  const cwd = tmp();
  const s = initState(cwd);
  s.currentMilestone = 3;
  saveState(cwd, s);
  assert.equal(loadState(cwd).currentMilestone, 3);
});

test('gate(setup) always passes', () => {
  const cwd = tmp();
  initState(cwd);
  assert.equal(gate(cwd, 'setup').pass, true);
});

test('gate(vision) needs setup done (state-based)', () => {
  const cwd = tmp();
  initState(cwd);
  assert.equal(gate(cwd, 'vision').pass, false);
  setStageStatus(cwd, { stage: 'setup', status: 'done' });
  assert.equal(gate(cwd, 'vision').pass, true);
});

test('gate(features) needs docs/PRODUCT.md (file-based)', () => {
  const cwd = tmp();
  initState(cwd);
  const before = gate(cwd, 'features');
  assert.equal(before.pass, false);
  assert.ok(before.missing.includes('docs/PRODUCT.md'));
  touch(cwd, 'docs/PRODUCT.md');
  assert.equal(gate(cwd, 'features').pass, true);
});

test('gate(milestone-ux) resolves {N} from --milestone', () => {
  const cwd = tmp();
  initState(cwd);
  assert.equal(gate(cwd, 'milestone-ux', { milestone: 2 }).pass, false);
  touch(cwd, 'project/milestones/m2/overview.md');
  assert.equal(gate(cwd, 'milestone-ux', { milestone: 2 }).pass, true);
});

test('gate(design) needs milestone replan done', () => {
  const cwd = tmp();
  initState(cwd);
  assert.equal(gate(cwd, 'design', { milestone: 1 }).pass, false);
  setStageStatus(cwd, { stage: 'replan', status: 'done', milestone: 1 });
  assert.equal(gate(cwd, 'design', { milestone: 1 }).pass, true);
});

test('gate(review) needs every surface built', () => {
  const cwd = tmp();
  initState(cwd);
  setStageStatus(cwd, { stage: 'build', status: 'done', milestone: 1, surface: 'login' });
  setStageStatus(cwd, { stage: 'design', status: 'done', milestone: 1, surface: 'home' });
  assert.equal(gate(cwd, 'review', { milestone: 1 }).pass, false);
  setStageStatus(cwd, { stage: 'build', status: 'done', milestone: 1, surface: 'home' });
  assert.equal(gate(cwd, 'review', { milestone: 1 }).pass, true);
});

test('nextStage walks front-load then milestone then surfaces', () => {
  const cwd = tmp();
  initState(cwd);
  assert.equal(nextStage(cwd).stage, 'setup');
  for (const s of FRONTLOAD_STAGES) setStageStatus(cwd, { stage: s, status: 'done' });
  assert.equal(nextStage(cwd).stage, 'surface-overview');
});

test('sessionAdd / sessionReset track stages this session', () => {
  const cwd = tmp();
  initState(cwd);
  sessionAdd(cwd, 'vision');
  sessionAdd(cwd, 'features');
  assert.deepEqual(loadState(cwd).session.stagesRun, ['vision', 'features']);
  sessionReset(cwd);
  assert.deepEqual(loadState(cwd).session.stagesRun, []);
});

test('statusReport mentions the next runnable stage', () => {
  const cwd = tmp();
  initState(cwd);
  assert.match(statusReport(cwd), /setup/);
});
