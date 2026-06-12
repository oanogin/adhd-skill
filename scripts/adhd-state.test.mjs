// scripts/adhd-state.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  defaultConfig, loadConfig, saveConfig, initConfig, CONFIG_VERSION,
  GROUNDWORK_STAGES, MILESTONE_STAGES, FEATURE_STAGES, SURFACE_KINDS, MODES, PROTOTYPE_TOPOLOGIES,
  GENERATIONS, generation,
  GROUNDWORK_STAGES_FLOWS, MILESTONE_STAGES_FLOWS, groundworkStages, milestoneStages,
  parseTable, parseTables, parseStories, parseFeatures, parseReviewFindings,
  milestoneTrack, milestoneDirs, briefStoryIds,
  groundworkDone, milestoneStageDone, gate, nextStage, statusReport,
  validate, migrate,
  setMode, addRepo, removeRepo, bindRepo, unbindRepo, listRepos,
  setPrototypeTopology, setPrototypeHome, confirmPreflight,
  workFileRel, parseGateItems, workGate,
  parseFlowDiagram, parseFlows,
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
  w(cwd, 'docs/CONCEPTS.md');
  w(cwd, 'project/map.md');
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
  assert.equal(c.generation, 'flows');
});

test('stage lists', () => {
  assert.deepEqual(GROUNDWORK_STAGES, ['setup', 'vision', 'foundation', 'concepts', 'stories', 'prototype']);
  assert.deepEqual(MILESTONE_STAGES, ['milestone-brief', 'ux-refine', 'tracer', 'features', 'review', 'finalize']);
  assert.deepEqual(FEATURE_STAGES, ['plan', 'build']);
  assert.deepEqual(SURFACE_KINDS, ['ui', 'api', 'lib']);
  assert.deepEqual(MODES, ['single', 'multi']);
  assert.deepEqual(PROTOTYPE_TOPOLOGIES, ['colocated', 'standalone']);
  assert.deepEqual(GENERATIONS, ['classic', 'flows']);
});

test('concepts → stories → prototype groundwork order', () => {
  const i = GROUNDWORK_STAGES.indexOf('concepts');
  assert.equal(GROUNDWORK_STAGES[i + 1], 'stories');
  assert.equal(GROUNDWORK_STAGES[i + 2], 'prototype');
  assert.equal(GROUNDWORK_STAGES.at(-1), 'prototype');
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

test('parseTables splits separate tables instead of merging them', () => {
  const t = [
    '| ID | Name |', '|--|--|', '| a | x |',
    '', 'prose between tables', '',
    '| Severity | Status |', '|--|--|', '| critical | open |',
  ].join('\n');
  const tables = parseTables(t);
  assert.equal(tables.length, 2);
  assert.deepEqual(tables[0].header, ['id', 'name']);
  assert.equal(tables[0].rows.length, 1);
  assert.deepEqual(tables[1].header, ['severity', 'status']);
  // parseTable still returns the first
  assert.deepEqual(parseTable(t).header, ['id', 'name']);
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
  assert.equal(groundworkDone(cwd, 'concepts'), false);
  w(cwd, 'docs/CONCEPTS.md');
  assert.equal(groundworkDone(cwd, 'concepts'), true);
  assert.equal(groundworkDone(cwd, 'prototype'), false);
  w(cwd, 'project/map.md');
  assert.equal(groundworkDone(cwd, 'prototype'), false); // map but no sign-off
  w(cwd, 'project/prototype.md');
  assert.equal(groundworkDone(cwd, 'prototype'), true);
});

test('foundation: docs/STACK.md is the canonical done signal; decision log is legacy', () => {
  const cwd = tmp();
  initConfig(cwd);
  w(cwd, 'docs/PRODUCT.md');
  assert.equal(groundworkDone(cwd, 'foundation'), false);
  // canonical: STACK.md alone
  w(cwd, 'docs/STACK.md', '## Baseline\n- TypeScript\n## Libraries\n- zod — validation\n');
  assert.equal(groundworkDone(cwd, 'foundation'), true);
  assert.equal(gate(cwd, 'concepts').pass, true);
  // legacy: decision log alone, no STACK.md -> done, but validate warns
  const cwd2 = tmp();
  initConfig(cwd2);
  w(cwd2, 'docs/PRODUCT.md');
  w(cwd2, 'docs/DECISIONS.md', '# Decisions\n\n## baseline\n');
  assert.equal(groundworkDone(cwd2, 'foundation'), true);
  assert.ok(validate(cwd2).warnings.some((x) => /STACK\.md is missing/.test(x)));
  w(cwd2, 'docs/STACK.md', '## Baseline\n');
  assert.ok(!validate(cwd2).warnings.some((x) => /STACK\.md is missing/.test(x)));
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
  assert.equal(gate(cwd, 'concepts').pass, false);
  w(cwd, 'docs/DECISIONS.md', '# Decisions\n\n## a decision\n');
  assert.equal(gate(cwd, 'concepts').pass, true);
  // concepts done -> stories runnable; prototype NOT yet (stories.md absent)
  w(cwd, 'docs/CONCEPTS.md');
  assert.equal(gate(cwd, 'concepts').pass, true);
  assert.equal(gate(cwd, 'stories').pass, true);
  assert.equal(gate(cwd, 'prototype').pass, false);
  // stories done -> prototype runnable
  w(cwd, 'project/stories.md', '| ID | Story | Depends on | Surfaces |\n|--|--|--|--|\n| S1 | a | | |');
  assert.equal(gate(cwd, 'prototype').pass, true);
  // milestone-brief NOT yet (prototype.md/map.md absent)
  assert.equal(gate(cwd, 'milestone-brief', { milestone: 1 }).pass, false);
  // prototype done -> milestone-brief runnable
  w(cwd, 'project/map.md');
  w(cwd, 'project/prototype.md');
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

test('gate: advises when project/parking.md is non-empty, never blocks', () => {
  const cwd = tmp();
  initConfig(cwd); // setup done -> vision gate passes
  let g = gate(cwd, 'vision');
  assert.equal(g.pass, true);
  assert.deepEqual(g.notes ?? [], []);
  w(cwd, 'project/parking.md', '   \n');
  g = gate(cwd, 'vision');
  assert.equal(g.pass, true);
  assert.deepEqual(g.notes, []);
  w(cwd, 'project/parking.md', '# Parking lot\n\nOffline-first cache idea\n');
  g = gate(cwd, 'vision');
  assert.equal(g.pass, true);
  assert.ok(g.notes.some((nte) => /parking\.md/.test(nte)));
});

test('validate: no longer emits the old notes.md drain warning', () => {
  const cwd = tmp();
  initConfig(cwd);
  w(cwd, 'project/notes.md', 'leftover scratch');
  assert.ok(!validate(cwd).warnings.some((x) => /drain durable entries to their canonical home/.test(x)));
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

test('migrate scaffolds parking.md and deletes an empty notes.md', () => {
  const cwd = tmp();
  initConfig(cwd);
  w(cwd, 'project/notes.md', '   \n');
  const r = migrate(cwd);
  assert.equal(r.parkingCreated, true);
  assert.equal(r.notesDeleted, true);
  assert.equal(r.migrated, true);
  assert.equal(fs.existsSync(path.join(cwd, 'project/notes.md')), false);
  assert.match(fs.readFileSync(path.join(cwd, 'project/parking.md'), 'utf-8'), /# Parking lot/);
});

test('migrate preserves a non-empty notes.md and reports it kept', () => {
  const cwd = tmp();
  initConfig(cwd);
  w(cwd, 'project/notes.md', 'undrained durable fact');
  const r = migrate(cwd);
  assert.equal(r.notesKept, true);
  assert.equal(r.notesDeleted, false);
  assert.equal(fs.existsSync(path.join(cwd, 'project/notes.md')), true);
  assert.equal(fs.existsSync(path.join(cwd, 'project/parking.md')), true);
});

test('migrate is idempotent once parking.md exists and notes.md is gone', () => {
  const cwd = tmp();
  initConfig(cwd);
  migrate(cwd); // creates parking.md
  const r = migrate(cwd);
  assert.equal(r.migrated, false);
  assert.equal(r.parkingCreated, false);
});

test('validate warns when a legacy notes.md is present', () => {
  const cwd = tmp();
  initConfig(cwd);
  w(cwd, 'project/notes.md', 'anything');
  assert.ok(validate(cwd).warnings.some((x) => /notes\.md is legacy/.test(x)));
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

test('saveConfig leaves no .tmp file behind', () => {
  const cwd = tmp();
  initConfig(cwd);
  assert.equal(fs.existsSync(path.join(cwd, 'project/config.json.tmp')), false);
});


// ---- work-file confirmation gate ----

test('workFileRel: groundwork vs milestone path', () => {
  assert.equal(workFileRel('prototype'), 'project/work/prototype.md');
  assert.equal(workFileRel('ux-refine', 2), 'project/work/m2-ux-refine.md');
});

test('parseGateItems: only reads under ## Gate, parses id/checked/confirmed', () => {
  const md = [
    '## Left to do',
    '- [ ] not a gate item',
    '',
    '## Gate',
    '- [ ] requirements-confirmed — user confirmed direction',
    '- [x] dashboard — shape brief confirmed (ok, ship it)',
    '- [x] settings — confirmed',
    '',
    '## Log',
    '- [x] decoy — should be ignored (nope)',
  ].join('\n');
  const items = parseGateItems(md);
  assert.deepEqual(items.map((i) => i.id), ['requirements-confirmed', 'dashboard', 'settings']);
  assert.equal(items[0].checked, false);
  assert.equal(items[1].confirmed, true);
  assert.equal(items[1].confirmation, 'ok, ship it');
  // checked but no verbatim parenthetical -> not confirmed
  assert.equal(items[2].checked, true);
  assert.equal(items[2].confirmed, false);
});

test('workGate: missing work file fails closed', () => {
  const cwd = tmp();
  const r = workGate(cwd, 'prototype');
  assert.equal(r.pass, false);
  assert.match(r.missing[0], /work file not found/);
});

test('workGate: empty / absent gate block fails closed', () => {
  const cwd = tmp();
  w(cwd, 'project/work/prototype.md', '## Left to do\n- [ ] stuff\n');
  const r = workGate(cwd, 'prototype');
  assert.equal(r.pass, false);
  assert.match(r.missing[0], /no ## Gate items/);
});

test('workGate: unchecked and unconfirmed items reported', () => {
  const cwd = tmp();
  w(cwd, 'project/work/prototype.md', [
    '## Gate',
    '- [ ] requirements-confirmed — pending',
    '- [x] dashboard — confirmed',
  ].join('\n'));
  const r = workGate(cwd, 'prototype');
  assert.equal(r.pass, false);
  assert.equal(r.missing.length, 2);
  assert.match(r.missing[0], /not checked/);
  assert.match(r.missing[1], /missing the user's verbatim/);
});

test('workGate: all items checked + confirmed passes', () => {
  const cwd = tmp();
  w(cwd, 'project/work/prototype.md', [
    '## Gate',
    '- [x] requirements-confirmed — (yes go ahead)',
    '- [x] dashboard — (looks good)',
  ].join('\n'));
  const r = workGate(cwd, 'prototype');
  assert.equal(r.pass, true);
  assert.deepEqual(r.missing, []);
});

test('workGate: --item checks a single surface', () => {
  const cwd = tmp();
  w(cwd, 'project/work/prototype.md', [
    '## Gate',
    '- [ ] requirements-confirmed — pending',
    '- [x] dashboard — (confirmed ok)',
  ].join('\n'));
  assert.equal(workGate(cwd, 'prototype', { item: 'dashboard' }).pass, true);
  assert.equal(workGate(cwd, 'prototype', { item: 'requirements-confirmed' }).pass, false);
  const unknown = workGate(cwd, 'prototype', { item: 'nope' });
  assert.equal(unknown.pass, false);
  assert.match(unknown.missing[0], /no gate item "nope"/);
});

test('workGate: milestone work file resolves m<N> path', () => {
  const cwd = tmp();
  w(cwd, 'project/work/m3-ux-refine.md', '## Gate\n- [x] requirements-confirmed — (ok)\n');
  assert.equal(workGate(cwd, 'ux-refine', { milestone: 3 }).pass, true);
});

test('parseStories reads the Surfaces column', () => {
  const cwd = tmp();
  w(cwd, 'project/stories.md',
    '| ID | Story | Depends on | Surfaces |\n|--|--|--|--|\n' +
    '| S1 | a | | Dashboard, Settings |\n' +
    '| S2 | b | S1 | |');
  const s = parseStories(cwd);
  assert.deepEqual(s[0].surfaces, ['Dashboard', 'Settings']);
  assert.deepEqual(s[1].surfaces, []);
});

test('parseStories: `?`-suffixed surfaces are provisional, not confirmed', () => {
  const cwd = tmp();
  w(cwd, 'project/stories.md',
    '| ID | Story | Surfaces |\n|--|--|--|\n' +
    '| S1 | a | Dashboard, Reports? |\n' +
    '| S2 | b | Billing? |');
  const s = parseStories(cwd);
  assert.deepEqual(s[0].surfaces, ['Dashboard']);
  assert.deepEqual(s[0].provisionalSurfaces, ['Reports']);
  assert.deepEqual(s[1].surfaces, []);
  assert.deepEqual(s[1].provisionalSurfaces, ['Billing']);
});

test('validate blocks a brief selecting a story with only provisional Surfaces', () => {
  const cwd = tmp();
  w(cwd, 'project/config.json', JSON.stringify(defaultConfig()));
  w(cwd, 'docs/PRODUCT.md');
  w(cwd, 'docs/DECISIONS.md', '## d');
  w(cwd, 'docs/CONCEPTS.md');
  w(cwd, 'project/map.md');
  w(cwd, 'project/prototype.md');
  w(cwd, 'project/stories.md',
    '| ID | Story | Surfaces |\n|--|--|--|\n| S1 | a | Dash |\n| S2 | b | Billing? |');
  w(cwd, 'project/milestones/m1/brief.md', '# Milestone 1 — x\nStories: S1, S2.');
  const r = validate(cwd);
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => /S2/.test(b) && /provisional/.test(b)),
    `expected a provisional-Surfaces blocker, got: ${JSON.stringify(r.blockers)}`);
});

test('parseFeatures: Size column read; missing column defaults to M', () => {
  const cwd = tmp();
  w(cwd, 'project/milestones/m1/features.md', [
    '| ID | Feature | Story | Domain | Repo | Size | Depends on | Build | Verified |',
    '|--|--|--|--|--|--|--|--|--|',
    '| f-a | a | S1 | d | r | S | | | |',
    '| f-b | b | S1 | d | r | L | f-a | | |',
    '| f-c | c | S1 | d | r | | f-a | | |',
  ].join('\n'));
  const feats = parseFeatures(cwd, 1);
  assert.deepEqual(feats.map((f) => f.size), ['S', 'L', 'M']);
  w(cwd, 'project/milestones/m2/features.md', FEATURES_MD); // no Size column
  assert.ok(parseFeatures(cwd, 2).every((f) => f.size === 'M'));
});

test('gate: a Size S feature may build without a plan; M may not', () => {
  const cwd = tmp();
  groundwork(cwd);
  w(cwd, 'project/milestones/m1/brief.md', 'Track: production');
  w(cwd, 'project/milestones/m1/features.md', [
    '| ID | Feature | Story | Domain | Repo | Size | Depends on | Build | Verified |',
    '|--|--|--|--|--|--|--|--|--|',
    '| f-s | small | S1 | d | r | S | | | |',
    '| f-m | medium | S1 | d | r | M | | | |',
  ].join('\n'));
  assert.equal(gate(cwd, 'build', { milestone: 1, feature: 'f-s' }).pass, true);
  const g = gate(cwd, 'build', { milestone: 1, feature: 'f-m' });
  assert.equal(g.pass, false);
  assert.ok(g.missing.some((x) => /not planned/.test(x)));
});

test('nextStage: Size S feature skips plan and goes straight to build', () => {
  const cwd = tmp();
  groundwork(cwd);
  w(cwd, 'project/milestones/m1/brief.md', 'Track: production');
  w(cwd, 'project/milestones/m1/ux-refine.md');
  w(cwd, 'project/milestones/m1/tracer.md');
  w(cwd, 'project/milestones/m1/features.md', [
    '| ID | Feature | Story | Domain | Repo | Size | Depends on | Build | Verified |',
    '|--|--|--|--|--|--|--|--|--|',
    '| f-s | small | S1 | d | r | S | | | |',
    '| f-m | medium | S1 | d | r | M | f-s | | |',
  ].join('\n'));
  let n = nextStage(cwd, { milestone: 1 });
  assert.deepEqual([n.stage, n.feature], ['build', 'f-s']);
  w(cwd, 'project/milestones/m1/features.md', [
    '| ID | Feature | Story | Domain | Repo | Size | Depends on | Build | Verified |',
    '|--|--|--|--|--|--|--|--|--|',
    '| f-s | small | S1 | d | r | S | | done | yes |',
    '| f-m | medium | S1 | d | r | M | f-s | | |',
  ].join('\n'));
  n = nextStage(cwd, { milestone: 1 });
  assert.deepEqual([n.stage, n.feature], ['plan', 'f-m']);
});

test('parseReviewFindings reads the severity/status table; empty status = open', () => {
  const cwd = tmp();
  assert.equal(parseReviewFindings(cwd, 1), null); // no review.md
  w(cwd, 'project/milestones/m1/review.md', 'no table here');
  assert.deepEqual(parseReviewFindings(cwd, 1), []);
  w(cwd, 'project/milestones/m1/review.md', [
    '# Review',
    '',
    '| Surface | Note |', '|--|--|', '| Dash | fine |', // decoy table
    '',
    '| ID | Finding | Where | Severity | Fix | Status |',
    '|--|--|--|--|--|--|',
    '| R1 | broken auth | Dash | critical | redo guard | open |',
    '| R2 | misaligned | Dash | minor | nudge css | fixed |',
    '| R3 | no empty state | Dash | major | add state | |',
  ].join('\n'));
  const f = parseReviewFindings(cwd, 1);
  assert.equal(f.length, 3);
  assert.deepEqual([f[0].severity, f[0].status], ['critical', 'open']);
  assert.deepEqual([f[2].severity, f[2].status], ['major', 'open']); // empty -> open
});

test('gate: finalize blocked by an open critical review finding', () => {
  const cwd = tmp();
  groundwork(cwd);
  w(cwd, 'project/milestones/m1/brief.md', 'Track: prototype');
  w(cwd, 'project/milestones/m1/review.md', [
    '| ID | Finding | Where | Severity | Fix | Status |',
    '|--|--|--|--|--|--|',
    '| R1 | broken auth | Dash | critical | redo guard | open |',
  ].join('\n'));
  let g = gate(cwd, 'finalize', { milestone: 1 });
  assert.equal(g.pass, false);
  assert.ok(g.missing.some((x) => /R1/.test(x) && /critical/.test(x)));
  // fixed / accepted criticals do not block; open majors do not block
  w(cwd, 'project/milestones/m1/review.md', [
    '| ID | Finding | Where | Severity | Fix | Status |',
    '|--|--|--|--|--|--|',
    '| R1 | broken auth | Dash | critical | redo guard | fixed |',
    '| R2 | slow load | Dash | critical | cache | accepted |',
    '| R3 | no empty state | Dash | major | add state | open |',
  ].join('\n'));
  assert.equal(gate(cwd, 'finalize', { milestone: 1 }).pass, true);
  // a review.md without a findings table keeps the old file-exists semantics
  w(cwd, 'project/milestones/m1/review.md', 'free-form notes');
  assert.equal(gate(cwd, 'finalize', { milestone: 1 }).pass, true);
});

test('validate blocks a brief selecting a story with empty Surfaces', () => {
  const cwd = tmp();
  // satisfy groundwork so validate's order check is clean
  w(cwd, 'project/config.json', JSON.stringify(defaultConfig()));
  w(cwd, 'docs/PRODUCT.md');
  w(cwd, 'docs/DECISIONS.md', '## d');
  w(cwd, 'docs/CONCEPTS.md');
  w(cwd, 'project/map.md');
  w(cwd, 'project/prototype.md');
  w(cwd, 'project/stories.md',
    '| ID | Story | Surfaces |\n|--|--|--|\n| S1 | a | Dash |\n| S2 | b | |');
  w(cwd, 'project/milestones/m1/brief.md', '# Milestone 1 — x\nStories: S1, S2.');
  const r = validate(cwd);
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => /S2/.test(b) && /surfaces/i.test(b)),
    `expected an empty-Surfaces blocker, got: ${JSON.stringify(r.blockers)}`);
});

test('evolve gates on groundwork complete and needs no milestone', () => {
  const cwd = tmp();
  w(cwd, 'project/config.json', JSON.stringify(defaultConfig()));
  assert.equal(gate(cwd, 'evolve').pass, false); // groundwork not done
  w(cwd, 'docs/PRODUCT.md');
  w(cwd, 'docs/DECISIONS.md', '## d');
  w(cwd, 'docs/CONCEPTS.md');
  w(cwd, 'project/stories.md', '| ID | Story | Surfaces |\n|--|--|--|\n| S1 | a | Dash |');
  w(cwd, 'project/map.md');
  w(cwd, 'project/prototype.md');
  assert.equal(gate(cwd, 'evolve').pass, true);
});

test('briefStoryIds matches story IDs as whole words in brief.md', () => {
  const cwd = tmp();
  w(cwd, 'project/stories.md',
    '| ID | Story | Surfaces |\n|--|--|--|\n| S1 | a | Dash |\n| S2 | b | |\n| LEGAL | c | Page |');
  w(cwd, 'project/milestones/m1/brief.md',
    '# Milestone 1 — x\nChosen stories: S1 and LEGAL. Note: S22 is a separate id.');
  const ids = briefStoryIds(cwd, 1);
  assert.deepEqual([...ids].sort(), ['LEGAL', 'S1']);
});

test('generation: new projects are flows-gen, legacy configs are classic', () => {
  const c = tmp();
  assert.equal(generation(c), 'flows'); // pre-setup default
  initConfig(c);
  assert.equal(loadConfig(c).generation, 'flows');
  assert.equal(generation(c), 'flows');
  // simulate a legacy config with no generation field
  const cfg = loadConfig(c);
  delete cfg.generation;
  saveConfig(c, cfg);
  assert.equal(generation(c), 'classic');
});

test('migrate: stamps generation classic on a legacy config', () => {
  const c = tmp();
  initConfig(c);
  const cfg = loadConfig(c);
  delete cfg.generation;
  saveConfig(c, cfg);
  const r = migrate(c);
  assert.equal(loadConfig(c).generation, 'classic');
  assert.equal(r.generationStamped, true);
});

test('flows-gen stage lists', () => {
  assert.deepEqual(GROUNDWORK_STAGES_FLOWS, ['setup', 'vision', 'foundation', 'concepts']);
  assert.deepEqual(MILESTONE_STAGES_FLOWS, ['brief', 'flows', 'realize', 'review', 'finalize']);
});

test('milestoneStageDone: flows-gen artifacts', () => {
  const c = tmp();
  initConfig(c);
  w(c, 'project/milestones/m1/brief.md');
  w(c, 'project/milestones/m1/flows.md');
  w(c, 'project/milestones/m1/features.md', FEATURES_MD);
  assert.equal(milestoneStageDone(c, 1, 'brief'), true);
  assert.equal(milestoneStageDone(c, 1, 'flows'), true);
  assert.equal(milestoneStageDone(c, 1, 'realize'), true); // done signal = features.md
  assert.equal(milestoneStageDone(c, 1, 'review'), false);
});

// ---- flow parsing ----

const FLOW_MD = `# Flow: invite-redeem

Stories: S1, S2
Depends on: context-switch

## Diagram
\`\`\`mermaid
sequenceDiagram
  actor R as Recipient
  participant RES as invite-resolver [ui]
  participant INV as invitation [api]
  R->>RES: paste code
  RES->>INV: redeem(code)
  INV->>INV: rate-limit check
  alt limit hit
    INV-->>RES: refused
  else valid
    INV-->>RES: member granted
  end
\`\`\`

## Rules
none

## Out of scope
none
`;

test('parseFlowDiagram: participants, arrows, kinds, self-arrows', () => {
  const d = parseFlowDiagram(FLOW_MD);
  assert.deepEqual(d.participants.map((p) => p.id), ['R', 'RES', 'INV']);
  assert.equal(d.participants[1].kind, 'ui');
  assert.equal(d.participants[0].kind, null);
  assert.equal(d.arrows.length, 5);
  assert.deepEqual(d.arrows[1], { from: 'RES', to: 'INV', msg: 'redeem(code)' });
  assert.deepEqual(d.arrows[3], { from: 'INV', to: 'RES', msg: 'refused' }); // double-dash op keeps from intact
  assert.deepEqual(d.branchIssues, []);
});

test('parseFlowDiagram: dangling alt branch is reported', () => {
  const bad = FLOW_MD.replace('    INV-->>RES: refused\n', '');
  const d = parseFlowDiagram(bad);
  assert.equal(d.branchIssues.length, 1);
  assert.match(d.branchIssues[0], /alt limit hit/);
});

test('parseFlows: header fields + diagram per file', () => {
  const c = tmp();
  w(c, 'project/flows/invite-redeem.md', FLOW_MD);
  const flows = parseFlows(c);
  assert.equal(flows.length, 1);
  assert.equal(flows[0].name, 'invite-redeem');
  assert.deepEqual(flows[0].stories, ['S1', 'S2']);
  assert.deepEqual(flows[0].dependsOn, ['context-switch']);
  assert.equal(flows[0].arrows.length, 5);
});
