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

test('handoffPrompt names parking.md, the next stage, and the run command', () => {
  const cwd = tmp();
  initConfig(cwd);
  w(cwd, 'docs/PRODUCT.md'); // setup + vision done -> next is foundation
  const out = handoffPrompt(cwd);
  assert.match(out, /project\/parking\.md/);
  assert.doesNotMatch(out, /notes\.md/);
  assert.match(out, /foundation/);
  assert.match(out, /Run: adhd foundation/);
});

test('handoffPrompt includes a groundwork status line', () => {
  const cwd = tmp();
  initConfig(cwd);
  assert.match(handoffPrompt(cwd), /Groundwork:/);
});

test('handoffPrompt leads with the active work file and inlines checklist + log', () => {
  const cwd = tmp();
  initConfig(cwd);
  w(cwd, 'docs/PRODUCT.md');
  w(cwd, 'docs/DECISIONS.md', '# Decisions\n\n## d\n'); // next stage = concepts
  w(cwd, 'project/work/concepts.md',
    '# Working memory: concepts\n\n## Left to do\n- [x] entities\n- [ ] draw ER diagram\n\n## Log\n- defined Team and Project\n- stuck on cardinality\n');
  const out = handoffPrompt(cwd);
  assert.match(out, /project\/work\/concepts\.md` FIRST/);
  assert.match(out, /draw ER diagram/);
  assert.match(out, /stuck on cardinality/);
  assert.doesNotMatch(out, /entities/);
  assert.match(out, /Run: adhd concepts/);
});

test('handoffPrompt resumes the correct milestone and names --milestone in the run command', () => {
  const cwd = tmp();
  initConfig(cwd); // generation: flows by default
  w(cwd, 'docs/PRODUCT.md');
  w(cwd, 'docs/DECISIONS.md', '# Decisions\n\n## d\n');
  w(cwd, 'docs/CONCEPTS.md');
  w(cwd, 'project/milestones/m1/brief.md'); // next = flows, milestone 1
  w(cwd, 'project/work/m1-flows.md', '## Left to do\n- [ ] draw invite flow\n\n## Log\n- started\n');
  w(cwd, 'project/work/m2-flows.md', '## Left to do\n- [ ] other milestone\n\n## Log\n- nope\n');
  const out = handoffPrompt(cwd);
  assert.match(out, /project\/work\/m1-flows\.md` FIRST/);
  assert.doesNotMatch(out, /m2-flows/);
  assert.match(out, /draw invite flow/);
  assert.match(out, /Run: adhd flows --milestone 1/);
});
