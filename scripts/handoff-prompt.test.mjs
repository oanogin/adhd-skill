// scripts/handoff-prompt.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initConfig } from './adhd-state.mjs';
import { handoffPrompt } from './handoff-prompt.mjs';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'adhd-ho-')); }
function w(cwd, rel, body = 'x') {
  const p = path.join(cwd, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body);
}

test('handoffPrompt without config.json tells user to run setup', () => {
  assert.match(handoffPrompt(tmp()), /setup/);
});

test('handoffPrompt names notes.md first, the next stage, and the run command', () => {
  const cwd = tmp();
  initConfig(cwd);
  w(cwd, 'docs/PRODUCT.md'); // setup + vision done -> next is foundation
  const out = handoffPrompt(cwd);
  assert.match(out, /project\/notes\.md/);
  assert.match(out, /foundation/);
  assert.match(out, /Run: adhd foundation/);
});

test('handoffPrompt includes a groundwork status line', () => {
  const cwd = tmp();
  initConfig(cwd);
  assert.match(handoffPrompt(cwd), /Groundwork:/);
});
