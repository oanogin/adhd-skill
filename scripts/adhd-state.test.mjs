// scripts/adhd-state.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  defaultConfig, loadConfig, saveConfig, initConfig, CONFIG_VERSION,
  GROUNDWORK_STAGES, MILESTONE_STAGES, FEATURE_STAGES, SURFACE_KINDS, MODES, PROTOTYPE_TOPOLOGIES,
  parseTable, parseStories, parseFeatures, milestoneTrack, milestoneDirs,
  groundworkDone, milestoneStageDone, gate, nextStage, statusReport,
  validate, audit, migrate,
  setMode, addRepo, removeRepo, bindRepo, unbindRepo, listRepos,
  setPrototypeTopology, setPrototypeHome, confirmPreflight,
  loadSession, sessionAdd, sessionReset,
} from './adhd-state.mjs';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'adhd-')); }
function w(cwd, rel, body = 'x') {
  const p = path.join(cwd, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body);
}
function gitRepo() { const c = tmp(); fs.mkdirSync(path.join(c, '.git')); return c; }

const FEATURES_MD = [
  '| ID | Feature | Story | Domain | Repo | Depends on | Build | Verified |',
  '|----|---------|-------|--------|------|------------|-------|----------|',
  '| f-api | api work | S1 | reg | backend | | done | yes |',
  '| f-ui  | ui work  | S1 | reg | backend | f-api | | |',
].join('\n');

function groundwork(cwd) {
  initConfig(cwd);
  w(cwd, 'docs/PRODUCT.md');
  w(cwd, 'docs/DECISIONS.md', '# Decisions\n\n## 2026 — a real decision\n');
  w(cwd, 'project/map.md');
  w(cwd, 'docs/GLOSSARY.md');
  w(cwd, 'project/prototype.md');
  w(cwd, 'project/stories.md', '| ID | Story | Depends on |\n|----|----|----|\n| S1 | a | |');
}

test('defaultConfig: version 3, single, colocated', () => {
  const c = defaultConfig();
  assert.equal(c.version, CONFIG_VERSION);
  assert.equal(CONFIG_VERSION, 3);
  assert.equal(c.mode, 'single');
  assert.equal(c.prototypeTopology, 'colocated');
  assert.deepEqual(c.repos, {});
});

test('stage lists', () => {
  assert.deepEqual(GROUNDWORK_STAGES, ['setup', 'vision', 'foundation', 'prototype', 'stories']);
  assert.deepEqual(MILESTONE_STAGES, ['milestone-brief', 'ux-refine', 'tracer', 'features', 'review', 'finalize']);
  assert.deepEqual(FEATURE_STAGES, ['plan', 'build']);
  assert.deepEqual(SURFACE_KINDS, ['ui', 'api', 'lib']);
  assert.deepEqual(MODES, ['single', 'multi']);
  assert.deepEqual(PROTOTYPE_TOPOLOGIES, ['colocated', 'standalone']);
});

test('initConfig writes config.json and is idempotent', () => {
  const cwd = tmp();
  const c1 = initConfig(cwd);
  assert.ok(fs.existsSync(path.join(cwd, 'project/config.json')));
  assert.equal(initConfig(cwd).createdAt, c1.createdAt);
});

test('loadConfig is null when missing, throws on corrupt', () => {
  assert.equal(loadConfig(tmp()), null);
  const cwd = tmp();
  w(cwd, 'project/config.json', '{ not json');
  assert.throws(() => loadConfig(cwd), /corrupt or not valid JSON/);
});

test('parseTable finds the first table, header lowercased', () => {
  const t = '| ID | Name |\n|----|------|\n| a | x |\n| b | y |';
  const { header, rows } = parseTable(t);
  assert.deepEqual(header, ['id', 'name']);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], ['a', 'x']);
});

test('parseStories / parseFeatures / milestoneTrack', () => {
  const cwd = tmp();
  w(cwd, 'project/stories.md', '| ID | Story | Depends on |\n|--|--|--|\n| S1 | a | |\n| S2 | b | S1 |');
  const stories = parseStories(cwd);
  assert.deepEqual(stories.map((s) => s.id), ['S1', 'S2']);
  assert.deepEqual(stories[1].dependsOn, ['S1']);

  w(cwd, 'project/milestones/m1/features.md', FEATURES_MD);
  const feats = parseFeatures(cwd, 1);
  assert.equal(feats.length, 2);
  assert.equal(feats[0].build, true);
  assert.equal(feats[0].verified, true);
  assert.equal(feats[1].build, false);
  assert.deepEqual(feats[1].dependsOn, ['f-api']);

  w(cwd, 'project/milestones/m1/brief.md', '# Milestone 1 — x\n\nTrack: `production`\n');
  assert.equal(milestoneTrack(cwd, 1), 'production');
});

test('groundworkDone derives from files', () => {
  const cwd = tmp();
  assert.equal(groundworkDone(cwd, 'setup'), false);
  initConfig(cwd);
  assert.equal(groundworkDone(cwd, 'setup'), true);
  assert.equal(groundworkDone(cwd, 'vision'), false);
  w(cwd, 'docs/PRODUCT.md');
  assert.equal(groundworkDone(cwd, 'vision'), true);
  w(cwd, 'docs/DECISIONS.md', '# Decisions\n');
  assert.equal(groundworkDone(cwd, 'foundation'), false); // no ## heading
  w(cwd, 'docs/DECISIONS.md', '# Decisions\n\n## a decision\n');
  assert.equal(groundworkDone(cwd, 'foundation'), true);
  assert.equal(groundworkDone(cwd, 'prototype'), false);
  w(cwd, 'project/map.md');
  w(cwd, 'docs/GLOSSARY.md');
  assert.equal(groundworkDone(cwd, 'prototype'), false); // map+glossary but no sign-off
  w(cwd, 'project/prototype.md');
  assert.equal(groundworkDone(cwd, 'prototype'), true);
});

test('gate: groundwork chain', () => {
  const cwd = tmp();
  assert.equal(gate(cwd, 'setup').pass, true);
  assert.equal(gate(cwd, 'vision').pass, false);
  initConfig(cwd);
  assert.equal(gate(cwd, 'vision').pass, true);
  assert.equal(gate(cwd, 'foundation').pass, false);
  w(cwd, 'docs/PRODUCT.md');
  assert.equal(gate(cwd, 'foundation').pass, true);
  assert.equal(gate(cwd, 'prototype').pass, false);
  w(cwd, 'docs/DECISIONS.md', '# Decisions\n\n## a decision\n');
  assert.equal(gate(cwd, 'prototype').pass, true);
  assert.equal(gate(cwd, 'stories').pass, false);
  w(cwd, 'project/map.md');
  w(cwd, 'docs/GLOSSARY.md');
  w(cwd, 'project/prototype.md');
  assert.equal(gate(cwd, 'stories').pass, true);
  assert.equal(gate(cwd, 'milestone-brief', { milestone: 1 }).pass, false);
  w(cwd, 'project/stories.md', '| ID | Story |\n|--|--|\n| S1 | a |');
  assert.equal(gate(cwd, 'milestone-brief', { milestone: 1 }).pass, true);
});

test('gate: milestone stages need a milestone and predecessors', () => {
  const cwd = tmp();
  groundwork(cwd);
  assert.equal(gate(cwd, 'ux-refine').pass, false); // no --milestone
  assert.equal(gate(cwd, 'milestone-brief', { milestone: 1 }).pass, true);
  assert.equal(gate(cwd, 'ux-refine', { milestone: 1 }).pass, false);
  w(cwd, 'project/milestones/m1/brief.md', 'Track: production');
  assert.equal(gate(cwd, 'ux-refine', { milestone: 1 }).pass, true);
});

test('gate: tracer refuses a prototype-only milestone', () => {
  const cwd = tmp();
  groundwork(cwd);
  w(cwd, 'project/milestones/m1/brief.md', 'Track: prototype');
  w(cwd, 'project/milestones/m1/ux-refine.md');
  const g = gate(cwd, 'tracer', { milestone: 1 });
  assert.equal(g.pass, false);
  assert.ok(g.missing.some((x) => /prototype-only/.test(x)));
});

test('gate: build is blocked by an unbuilt dependency feature', () => {
  const cwd = tmp();
  groundwork(cwd);
  w(cwd, 'project/milestones/m1/brief.md', 'Track: production');
  w(cwd, 'project/milestones/m1/features.md', FEATURES_MD);
  w(cwd, 'project/milestones/m1/plans/f-ui.md');
  // f-ui depends on f-api which IS built in FEATURES_MD -> passes
  assert.equal(gate(cwd, 'build', { milestone: 1, feature: 'f-ui' }).pass, true);
  // flip f-api to unbuilt
  w(cwd, 'project/milestones/m1/features.md', FEATURES_MD.replace('| f-api | api work | S1 | reg | backend | | done | yes |',
    '| f-api | api work | S1 | reg | backend | | | |'));
  const g = gate(cwd, 'build', { milestone: 1, feature: 'f-ui' });
  assert.equal(g.pass, false);
  assert.ok(g.missing.some((x) => /unbuilt/.test(x) && /f-api/.test(x)));
});

test('gate: review needs every feature built and verified (production)', () => {
  const cwd = tmp();
  groundwork(cwd);
  w(cwd, 'project/milestones/m1/brief.md', 'Track: production');
  w(cwd, 'project/milestones/m1/features.md', FEATURES_MD); // f-ui not built
  assert.equal(gate(cwd, 'review', { milestone: 1 }).pass, false);
  w(cwd, 'project/milestones/m1/features.md', FEATURES_MD
    .replace('| f-ui  | ui work  | S1 | reg | backend | f-api | | |',
      '| f-ui  | ui work  | S1 | reg | backend | f-api | done | yes |'));
  assert.equal(gate(cwd, 'review', { milestone: 1 }).pass, true);
});

test('nextStage walks groundwork then a milestone', () => {
  const cwd = tmp();
  assert.equal(nextStage(cwd).stage, 'setup');
  groundwork(cwd);
  assert.deepEqual(nextStage(cwd), { stage: 'milestone-brief', milestone: 1, feature: null });
  w(cwd, 'project/milestones/m1/brief.md', 'Track: production');
  assert.equal(nextStage(cwd, { milestone: 1 }).stage, 'ux-refine');
  w(cwd, 'project/milestones/m1/ux-refine.md');
  assert.equal(nextStage(cwd, { milestone: 1 }).stage, 'tracer');
});

test('nextStage: prototype-only milestone skips tracer/features', () => {
  const cwd = tmp();
  groundwork(cwd);
  w(cwd, 'project/milestones/m1/brief.md', 'Track: prototype');
  w(cwd, 'project/milestones/m1/ux-refine.md');
  assert.equal(nextStage(cwd, { milestone: 1 }).stage, 'review');
});

test('nextStage: build order follows feature dependencies', () => {
  const cwd = tmp();
  groundwork(cwd);
  w(cwd, 'project/milestones/m1/brief.md', 'Track: production');
  w(cwd, 'project/milestones/m1/ux-refine.md');
  w(cwd, 'project/milestones/m1/tracer.md');
  w(cwd, 'project/milestones/m1/features.md', FEATURES_MD.replace(/done|yes/g, '')); // nothing built
  w(cwd, 'project/milestones/m1/plans/f-api.md');
  w(cwd, 'project/milestones/m1/plans/f-ui.md');
  // both planned, nothing built -> only f-api is buildable (f-ui depends on f-api)
  assert.equal(nextStage(cwd, { milestone: 1 }).feature, 'f-api');
});

test('nextStage interleaves plan and build feature by feature', () => {
  const cwd = tmp();
  groundwork(cwd);
  w(cwd, 'project/milestones/m1/brief.md', 'Track: production');
  w(cwd, 'project/milestones/m1/ux-refine.md');
  w(cwd, 'project/milestones/m1/tracer.md');
  const feats = [
    '| ID | Feature | Story | Domain | Repo | Depends on | Build | Verified |',
    '|--|--|--|--|--|--|--|--|',
    '| f-api | a | S1 | d | r | | | |',
    '| f-ui  | b | S1 | d | r | f-api | | |',
  ].join('\n');
  w(cwd, 'project/milestones/m1/features.md', feats);
  const nx = () => { const n = nextStage(cwd, { milestone: 1 }); return [n.stage, n.feature]; };
  // nothing planned/built -> plan the first workable feature
  assert.deepEqual(nx(), ['plan', 'f-api']);
  // f-api planned -> next is BUILD f-api, NOT plan f-ui (interleaved, not plan-all-first)
  w(cwd, 'project/milestones/m1/plans/f-api.md');
  assert.deepEqual(nx(), ['build', 'f-api']);
  // f-api built -> now plan f-ui
  w(cwd, 'project/milestones/m1/features.md',
    feats.replace('| f-api | a | S1 | d | r | | | |', '| f-api | a | S1 | d | r | | done | yes |'));
  assert.deepEqual(nx(), ['plan', 'f-ui']);
  // f-ui planned -> build f-ui
  w(cwd, 'project/milestones/m1/plans/f-ui.md');
  assert.deepEqual(nx(), ['build', 'f-ui']);
});

test('milestones are independent — two can be in flight', () => {
  const cwd = tmp();
  groundwork(cwd);
  w(cwd, 'project/milestones/m1/brief.md', 'Track: prototype');
  w(cwd, 'project/milestones/m2/brief.md', 'Track: prototype');
  assert.deepEqual(milestoneDirs(cwd), [1, 2]);
  assert.equal(nextStage(cwd, { milestone: 1 }).stage, 'ux-refine');
  assert.equal(nextStage(cwd, { milestone: 2 }).stage, 'ux-refine');
});

test('statusReport mentions the next stage and is legacy-aware', () => {
  const cwd = tmp();
  groundwork(cwd);
  assert.match(statusReport(cwd), /milestone-brief/);
  w(cwd, 'project/state.json', '{}');
  assert.match(statusReport(cwd), /legacy/);
});

test('validate: fresh project ok; legacy state.json blocks', () => {
  const cwd = tmp();
  initConfig(cwd);
  assert.equal(validate(cwd).ok, true);
  w(cwd, 'project/state.json', '{}');
  const r = validate(cwd);
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => /migrate/.test(b)));
});

test('validate: multi-mode unbound repo, standalone topology, feature cycle', () => {
  const cwd = tmp();
  groundwork(cwd);
  setMode(cwd, 'multi');
  addRepo(cwd, { name: 'backend', kind: 'api' });
  assert.ok(validate(cwd).blockers.some((b) => /backend/.test(b) && /bound/.test(b)));

  const cwd2 = tmp();
  groundwork(cwd2);
  setPrototypeTopology(cwd2, 'standalone');
  assert.ok(validate(cwd2).blockers.some((b) => /standalone/.test(b)));

  const cwd3 = tmp();
  initConfig(cwd3);
  w(cwd3, 'project/milestones/m1/features.md', [
    '| ID | Depends on |', '|--|--|', '| a | b |', '| b | a |',
  ].join('\n'));
  assert.ok(validate(cwd3).blockers.some((b) => /cycle/.test(b)));
});

test('audit: clean fresh project; flags dup story and unknown dep', () => {
  const cwd = tmp();
  initConfig(cwd);
  assert.equal(audit(cwd).ok, true);
  w(cwd, 'project/stories.md', [
    '| ID | Story | Depends on |', '|--|--|--|',
    '| S1 | a | |', '| S1 | b | |', '| S2 | c | S9 |',
  ].join('\n'));
  const r = audit(cwd);
  assert.ok(r.findings.some((f) => /duplicate story ID "S1"/.test(f)));
  assert.ok(r.findings.some((f) => /unknown story ID "S9"/.test(f)));
});

test('audit: flags a feature pointing at an unknown story; warns on mechanism leak', () => {
  const cwd = tmp();
  initConfig(cwd);
  w(cwd, 'project/stories.md', '| ID | Story |\n|--|--|\n| S1 | a |');
  w(cwd, 'project/milestones/m1/features.md', [
    '| ID | Story | Depends on |', '|--|--|--|', '| f1 | S404 | |',
  ].join('\n'));
  assert.ok(audit(cwd).findings.some((f) => /unknown story "S404"/.test(f)));
  w(cwd, 'docs/PRODUCT.md', 'We store data in PostgreSQL.');
  assert.ok(audit(cwd).warnings.some((w) => /postgres/.test(w)));
});

test('migrate converts a v2 state.json to config.json and removes it', () => {
  const cwd = tmp();
  w(cwd, 'project/state.json', JSON.stringify({
    version: 2, docHome: 'docs', mode: 'multi',
    repos: { backend: { kind: 'api', remote: null } },
    prototypeTopology: 'standalone', prototype: { repo: 'backend', subpath: 'proto' },
    preflight: { skillsConfirmed: true, confirmedAt: '2026-01-01' },
    milestones: { 1: {} }, session: {}, effortLog: [],
  }));
  const r = migrate(cwd);
  assert.equal(r.migrated, true);
  assert.equal(fs.existsSync(path.join(cwd, 'project/state.json')), false);
  const c = loadConfig(cwd);
  assert.equal(c.version, 3);
  assert.equal(c.mode, 'multi');
  assert.equal(c.repos.backend.kind, 'api');
  assert.equal(c.prototypeTopology, 'standalone');
  assert.equal(c.preflight.skillsConfirmed, true);
  assert.equal(migrate(cwd).migrated, false); // idempotent
});

test('config writers: mode, repos, prototype, preflight', () => {
  const cwd = tmp();
  initConfig(cwd);
  setMode(cwd, 'multi');
  assert.equal(loadConfig(cwd).mode, 'multi');
  assert.throws(() => setMode(cwd, 'bogus'), /Invalid mode/);
  addRepo(cwd, { name: 'backend', kind: 'api' });
  assert.equal(loadConfig(cwd).repos.backend.kind, 'api');
  assert.throws(() => addRepo(cwd, { name: 'x', kind: 'bogus' }), /Invalid kind/);
  const repo = gitRepo();
  bindRepo(cwd, 'backend', repo);
  assert.equal(listRepos(cwd).backend.bound, true);
  unbindRepo(cwd, 'backend');
  assert.equal(listRepos(cwd).backend.bound, false);
  removeRepo(cwd, 'backend');
  assert.deepEqual(loadConfig(cwd).repos, {});
  setPrototypeTopology(cwd, 'standalone');
  setPrototypeHome(cwd, { repo: null, subpath: 'prototype' });
  assert.deepEqual(loadConfig(cwd).prototype, { repo: null, subpath: 'prototype' });
  confirmPreflight(cwd);
  assert.equal(loadConfig(cwd).preflight.skillsConfirmed, true);
});

test('bindRepo rejects unregistered / missing / non-git paths', () => {
  const cwd = tmp();
  initConfig(cwd);
  assert.throws(() => bindRepo(cwd, 'ghost', gitRepo()), /No registered repo/);
  addRepo(cwd, { name: 'backend', kind: 'api' });
  assert.throws(() => bindRepo(cwd, 'backend', '/no/such/path'), /does not exist/);
  assert.throws(() => bindRepo(cwd, 'backend', tmp()), /Not a git repository/);
});

test('session scratch: add and reset', () => {
  const cwd = tmp();
  initConfig(cwd);
  sessionAdd(cwd, 'vision');
  sessionAdd(cwd, 'stories');
  assert.deepEqual(loadSession(cwd).stagesRun, ['vision', 'stories']);
  sessionReset(cwd);
  assert.deepEqual(loadSession(cwd).stagesRun, []);
});

test('saveConfig leaves no .tmp file behind', () => {
  const cwd = tmp();
  initConfig(cwd);
  assert.equal(fs.existsSync(path.join(cwd, 'project/config.json.tmp')), false);
});
