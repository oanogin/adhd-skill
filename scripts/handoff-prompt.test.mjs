// scripts/handoff-prompt.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initState, setStageStatus } from './adhd-state.mjs';
import { handoffPrompt } from './handoff-prompt.mjs';

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'adhd-ho-'));
}

test('handoffPrompt without state.json tells user to run setup', () => {
  const out = handoffPrompt(tmp());
  assert.match(out, /setup/);
});

test('handoffPrompt names notes.md first, the next stage, and the run command', () => {
  const cwd = tmp();
  initState(cwd);
  setStageStatus(cwd, { stage: 'setup', status: 'done' });
  const out = handoffPrompt(cwd);
  assert.match(out, /project\/notes\.md/);
  assert.match(out, /vision/);
  assert.match(out, /\{\{command_prefix\}\}adhd vision/);
});

test('handoffPrompt includes a front-load status line with icons', () => {
  const cwd = tmp();
  initState(cwd);
  const out = handoffPrompt(cwd);
  assert.match(out, /Front-load:/);
});
