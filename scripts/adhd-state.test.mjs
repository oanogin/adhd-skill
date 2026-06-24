// scripts/adhd-state.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  defaultConfig, loadConfig, saveConfig, initConfig, CONFIG_VERSION,
  GROUNDWORK_STAGES, MILESTONE_STAGES, FEATURE_STAGES, SURFACE_KINDS, MODES, PROTOTYPE_TOPOLOGIES,
  PARTICIPANT_KINDS,
  parseTable, parseTables, parseFeatures, parseReviewFindings,
  milestoneDirs,
  groundworkDone, milestoneStageDone, gate, nextStage, statusReport,
  validate, migrate, upgradeGeneration,
  setMode, addRepo, removeRepo, bindRepo, unbindRepo, listRepos,
  setPrototypeTopology, setPrototypeHome, confirmPreflight,
  workFileRel, parseGateItems, workGate,
  parseFlowDiagram, parseFlows,
  parseRegistry,
  contract,
  parseCapabilityMap, closure,
  parseBriefFlows,
  featuresScaffold, affectedFlows,
} from './adhd-state.mjs';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'adhd-')); }
function w(cwd, rel, body = 'x') {
  const p = path.join(cwd, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body);
}
function gitRepo() { const c = tmp(); fs.mkdirSync(path.join(c, '.git')); return c; }

const FEATURES_MD = [
  '| ID | Feature | Domain | Repo | Depends on | Build | Verified |',
  '|----|---------|--------|------|------------|-------|----------|',
  '| f-api | api work | reg | backend | | done | yes |',
  '| f-ui  | ui work  | reg | backend | f-api | | |',
].join('\n');

// Flows-generation groundwork helper (the only chain now).
function groundwork(cwd) {
  initConfig(cwd); // generation: flows by default
  w(cwd, 'docs/PRODUCT.md');
  w(cwd, 'docs/STACK.md');
  w(cwd, 'docs/CONCEPTS.md', CONCEPTS_MD);
}

test('defaultConfig: version 3, single, colocated, flows generation', () => {
  const c = defaultConfig();
  assert.equal(c.version, CONFIG_VERSION);
  assert.equal(CONFIG_VERSION, 3);
  assert.equal(c.mode, 'single');
  assert.equal(c.prototypeTopology, 'colocated');
  assert.deepEqual(c.repos, {});
  assert.equal(c.generation, 'flows');
});

test('stage lists: flows chain only', () => {
  assert.deepEqual(GROUNDWORK_STAGES, ['setup', 'vision', 'foundation', 'concepts']);
  assert.deepEqual(MILESTONE_STAGES, ['brief', 'flows', 'realize', 'review', 'finalize']);
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

test('parseFeatures', () => {
  const cwd = tmp();
  w(cwd, 'project/milestones/m1/features.md', FEATURES_MD);
  const feats = parseFeatures(cwd, 1);
  assert.equal(feats.length, 2);
  assert.equal(feats[0].build, true);
  assert.equal(feats[0].verified, true);
  assert.equal(feats[1].build, false);
  assert.deepEqual(feats[1].dependsOn, ['f-api']);
  assert.equal(feats[0].story, undefined); // no story field anymore
});

test('parseFeatures: an old table with a Story column still parses (column ignored)', () => {
  const cwd = tmp();
  w(cwd, 'project/milestones/m1/features.md', [
    '| ID | Feature | Story | Domain | Repo | Depends on | Build | Verified |',
    '|----|---------|-------|--------|------|------------|-------|----------|',
    '| f-api | api work | S1 | reg | backend | | done | yes |',
    '| f-ui  | ui work  | S1 | reg | backend | f-api | | |',
  ].join('\n'));
  const feats = parseFeatures(cwd, 1);
  assert.equal(feats.length, 2);
  assert.equal(feats[0].story, undefined);
  assert.equal(feats[0].domain, 'reg'); // header-name lookup unaffected by the extra column
  assert.deepEqual(feats[1].dependsOn, ['f-api']);
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
  // prototype and stories no longer in groundwork chain — returns false for unknown stage
  assert.equal(groundworkDone(cwd, 'prototype'), false);
  assert.equal(groundworkDone(cwd, 'stories'), false);
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

test('gate: groundwork chain (flows only)', () => {
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
  w(cwd, 'docs/CONCEPTS.md');
  assert.equal(gate(cwd, 'concepts').pass, true);
  // brief needs concepts done
  assert.equal(gate(cwd, 'brief', { milestone: 1 }).pass, true);
});

test('gate: milestone stages need a milestone and predecessors', () => {
  const cwd = tmp();
  groundwork(cwd);
  assert.equal(gate(cwd, 'flows').pass, false); // no --milestone
  assert.equal(gate(cwd, 'brief', { milestone: 1 }).pass, true);
  assert.equal(gate(cwd, 'flows', { milestone: 1 }).pass, false);
  w(cwd, 'project/milestones/m1/brief.md');
  assert.equal(gate(cwd, 'flows', { milestone: 1 }).pass, true);
});

test('gate: build is blocked by an unbuilt dependency feature', () => {
  const cwd = tmp();
  groundwork(cwd);
  w(cwd, 'project/milestones/m1/brief.md');
  w(cwd, 'project/milestones/m1/flows.md');
  w(cwd, 'project/milestones/m1/features.md', FEATURES_MD);
  w(cwd, 'project/milestones/m1/plans/f-ui.md');
  // f-ui depends on f-api which IS built in FEATURES_MD -> passes
  assert.equal(gate(cwd, 'build', { milestone: 1, feature: 'f-ui' }).pass, true);
  // flip f-api to unbuilt
  w(cwd, 'project/milestones/m1/features.md', FEATURES_MD.replace('| f-api | api work | reg | backend | | done | yes |',
    '| f-api | api work | reg | backend | | | |'));
  const g = gate(cwd, 'build', { milestone: 1, feature: 'f-ui' });
  assert.equal(g.pass, false);
  assert.ok(g.missing.some((x) => /unbuilt/.test(x) && /f-api/.test(x)));
});

test('gate: review needs realize done + every feature built and verified', () => {
  const cwd = tmp();
  groundwork(cwd);
  w(cwd, 'project/milestones/m1/brief.md');
  w(cwd, 'project/milestones/m1/flows.md');
  w(cwd, 'project/milestones/m1/features.md', FEATURES_MD); // f-ui not built
  assert.equal(gate(cwd, 'review', { milestone: 1 }).pass, false);
  w(cwd, 'project/milestones/m1/features.md', FEATURES_MD
    .replace('| f-ui  | ui work  | reg | backend | f-api | | |',
      '| f-ui  | ui work  | reg | backend | f-api | done | yes |'));
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

test('gate: pre-flows project is blocked by upgrade guard (all stages except setup)', () => {
  const cwd = tmp();
  initConfig(cwd);
  const cfg = loadConfig(cwd);
  delete cfg.generation;
  saveConfig(cwd, cfg);
  // setup is exempt
  assert.equal(gate(cwd, 'setup').pass, true);
  // all other stages fail
  const r = gate(cwd, 'vision');
  assert.equal(r.pass, false);
  assert.ok(r.missing.some((m) => /pre-flows project/.test(m)));
  const r2 = gate(cwd, 'brief', { milestone: 1 });
  assert.equal(r2.pass, false);
  assert.ok(r2.missing.some((m) => /pre-flows project/.test(m)));
});

test('gate: after upgradeGeneration, pre-flows project gates pass', () => {
  const cwd = tmp();
  initConfig(cwd);
  const cfg = loadConfig(cwd);
  delete cfg.generation;
  saveConfig(cwd, cfg);
  upgradeGeneration(cwd);
  assert.equal(loadConfig(cwd).generation, 'flows');
  assert.equal(gate(cwd, 'vision').pass, true);
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
  assert.deepEqual(nextStage(cwd), { stage: 'brief', milestone: 1, feature: null });
  w(cwd, 'project/milestones/m1/brief.md');
  assert.equal(nextStage(cwd, { milestone: 1 }).stage, 'flows');
  w(cwd, 'project/milestones/m1/flows.md');
  assert.equal(nextStage(cwd, { milestone: 1 }).stage, 'realize');
});

test('nextStage: build order follows feature dependencies', () => {
  const cwd = tmp();
  groundwork(cwd);
  w(cwd, 'project/milestones/m1/brief.md');
  w(cwd, 'project/milestones/m1/flows.md');
  w(cwd, 'project/milestones/m1/features.md', FEATURES_MD.replace(/done|yes/g, '')); // nothing built
  w(cwd, 'project/milestones/m1/plans/f-api.md');
  w(cwd, 'project/milestones/m1/plans/f-ui.md');
  // both planned, nothing built -> only f-api is buildable (f-ui depends on f-api)
  assert.equal(nextStage(cwd, { milestone: 1 }).feature, 'f-api');
});

test('nextStage routes straight to build (plan is on-demand, never routed)', () => {
  const cwd = tmp();
  groundwork(cwd);
  w(cwd, 'project/milestones/m1/brief.md');
  w(cwd, 'project/milestones/m1/flows.md');
  const feats = [
    '| ID | Feature | Domain | Repo | Depends on | Build | Verified |',
    '|--|--|--|--|--|--|--|',
    '| f-api | a | d | r | | | |',
    '| f-ui  | b | d | r | f-api | | |',
  ].join('\n');
  w(cwd, 'project/milestones/m1/features.md', feats);
  const nx = () => { const n = nextStage(cwd, { milestone: 1 }); return [n.stage, n.feature]; };
  // nothing built -> build the first workable feature directly (NO plan routing)
  assert.deepEqual(nx(), ['build', 'f-api']);
  // even with a plan memo present, routing is still build
  w(cwd, 'project/milestones/m1/plans/f-api.md', '## Gaps\n- none\n');
  assert.deepEqual(nx(), ['build', 'f-api']);
  // f-api built -> build f-ui next (deps satisfied)
  w(cwd, 'project/milestones/m1/features.md',
    feats.replace('| f-api | a | d | r | | | |', '| f-api | a | d | r | | done | yes |'));
  assert.deepEqual(nx(), ['build', 'f-ui']);
});

test('milestones are independent — two can be in flight', () => {
  const cwd = tmp();
  groundwork(cwd);
  w(cwd, 'project/milestones/m1/brief.md');
  w(cwd, 'project/milestones/m2/brief.md');
  assert.deepEqual(milestoneDirs(cwd), [1, 2]);
  assert.equal(nextStage(cwd, { milestone: 1 }).stage, 'flows');
  assert.equal(nextStage(cwd, { milestone: 2 }).stage, 'flows');
});

test('statusReport mentions the next stage and is legacy-aware', () => {
  const cwd = tmp();
  groundwork(cwd);
  assert.match(statusReport(cwd), /brief/);
  w(cwd, 'project/state.json', '{}');
  assert.match(statusReport(cwd), /legacy/);
});

test('statusReport: shows the flows chain, no classic stages', () => {
  const cwd = tmp();
  groundwork(cwd);
  w(cwd, 'project/milestones/m1/brief.md');
  const s = statusReport(cwd);
  assert.match(s, /brief ✓\s+flows ·\s+realize ·/);
  assert.doesNotMatch(s, /ux-refine|tracer|milestone-brief/);
});

test('validate: fresh flows project ok; legacy state.json blocks', () => {
  const cwd = tmp();
  initConfig(cwd);
  assert.equal(validate(cwd).ok, true);
  w(cwd, 'project/state.json', '{}');
  const r = validate(cwd);
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => /migrate/.test(b)));
});

test('validate: pre-flows project (no generation field) emits upgrade blocker', () => {
  const cwd = tmp();
  initConfig(cwd);
  const cfg = loadConfig(cwd);
  delete cfg.generation;
  saveConfig(cwd, cfg);
  const r = validate(cwd);
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => /pre-flows project/.test(b)));
});

test('validate: after upgradeGeneration, upgrade blocker gone', () => {
  const cwd = tmp();
  initConfig(cwd);
  const cfg = loadConfig(cwd);
  delete cfg.generation;
  saveConfig(cwd, cfg);
  upgradeGeneration(cwd);
  assert.equal(validate(cwd).ok, true);
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


test('migrate converts a v2 state.json to config.json and removes it (no generation stamped)', () => {
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
  assert.equal(r.stateConverted, true);
  assert.equal(fs.existsSync(path.join(cwd, 'project/state.json')), false);
  const c = loadConfig(cwd);
  assert.equal(c.version, 3);
  assert.equal(c.mode, 'multi');
  assert.equal(c.repos.backend.kind, 'api');
  assert.equal(c.prototypeTopology, 'standalone');
  assert.equal(c.preflight.skillsConfirmed, true);
  // migrate does NOT set generation — upgrade command owns that
  assert.equal(c.generation, undefined);
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
  assert.equal(workFileRel('concepts'), 'project/work/concepts.md');
  assert.equal(workFileRel('flows', 2), 'project/work/m2-flows.md');
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
  const r = workGate(cwd, 'concepts');
  assert.equal(r.pass, false);
  assert.match(r.missing[0], /work file not found/);
});

test('workGate: empty / absent gate block fails closed', () => {
  const cwd = tmp();
  w(cwd, 'project/work/concepts.md', '## Left to do\n- [ ] stuff\n');
  const r = workGate(cwd, 'concepts');
  assert.equal(r.pass, false);
  assert.match(r.missing[0], /no ## Gate items/);
});

test('workGate: unchecked and unconfirmed items reported', () => {
  const cwd = tmp();
  w(cwd, 'project/work/concepts.md', [
    '## Gate',
    '- [ ] requirements-confirmed — pending',
    '- [x] dashboard — confirmed',
  ].join('\n'));
  const r = workGate(cwd, 'concepts');
  assert.equal(r.pass, false);
  assert.equal(r.missing.length, 2);
  assert.match(r.missing[0], /not checked/);
  assert.match(r.missing[1], /missing the user's verbatim/);
});

test('workGate: all items checked + confirmed passes', () => {
  const cwd = tmp();
  w(cwd, 'project/work/concepts.md', [
    '## Gate',
    '- [x] requirements-confirmed — (yes go ahead)',
    '- [x] dashboard — (looks good)',
  ].join('\n'));
  const r = workGate(cwd, 'concepts');
  assert.equal(r.pass, true);
  assert.deepEqual(r.missing, []);
});

test('workGate: --item checks a single surface', () => {
  const cwd = tmp();
  w(cwd, 'project/work/concepts.md', [
    '## Gate',
    '- [ ] requirements-confirmed — pending',
    '- [x] dashboard — (confirmed ok)',
  ].join('\n'));
  assert.equal(workGate(cwd, 'concepts', { item: 'dashboard' }).pass, true);
  assert.equal(workGate(cwd, 'concepts', { item: 'requirements-confirmed' }).pass, false);
  const unknown = workGate(cwd, 'concepts', { item: 'nope' });
  assert.equal(unknown.pass, false);
  assert.match(unknown.missing[0], /no gate item "nope"/);
});

test('workGate: milestone work file resolves m<N> path', () => {
  const cwd = tmp();
  w(cwd, 'project/work/m3-flows.md', '## Gate\n- [x] requirements-confirmed — (ok)\n');
  assert.equal(workGate(cwd, 'flows', { milestone: 3 }).pass, true);
});

test('parseFeatures: Size column read; missing column defaults to M', () => {
  const cwd = tmp();
  w(cwd, 'project/milestones/m1/features.md', [
    '| ID | Feature | Domain | Repo | Size | Depends on | Build | Verified |',
    '|--|--|--|--|--|--|--|--|',
    '| f-a | a | d | r | S | | | |',
    '| f-b | b | d | r | L | f-a | | |',
    '| f-c | c | d | r | | f-a | | |',
  ].join('\n'));
  const feats = parseFeatures(cwd, 1);
  assert.deepEqual(feats.map((f) => f.size), ['S', 'L', 'M']);
  w(cwd, 'project/milestones/m2/features.md', FEATURES_MD); // no Size column
  assert.ok(parseFeatures(cwd, 2).every((f) => f.size === 'M'));
});

test('gate: size drives no routing — both S and M build without a plan', () => {
  const cwd = tmp();
  groundwork(cwd);
  w(cwd, 'project/milestones/m1/brief.md');
  w(cwd, 'project/milestones/m1/flows.md');
  w(cwd, 'project/milestones/m1/features.md', [
    '| ID | Feature | Domain | Repo | Size | Depends on | Build | Verified |',
    '|--|--|--|--|--|--|--|--|',
    '| f-s | small | d | r | S | | | |',
    '| f-m | medium | d | r | M | | | |',
  ].join('\n'));
  assert.equal(gate(cwd, 'build', { milestone: 1, feature: 'f-s' }).pass, true);
  const g = gate(cwd, 'build', { milestone: 1, feature: 'f-m' });
  assert.equal(g.pass, true);
  assert.ok(!g.missing.some((x) => /not planned/.test(x)));
});

test('nextStage: size is informational — every deps-ready feature routes to build', () => {
  const cwd = tmp();
  groundwork(cwd);
  w(cwd, 'project/milestones/m1/brief.md');
  w(cwd, 'project/milestones/m1/flows.md');
  w(cwd, 'project/milestones/m1/features.md', [
    '| ID | Feature | Domain | Repo | Size | Depends on | Build | Verified |',
    '|--|--|--|--|--|--|--|--|',
    '| f-s | small | d | r | S | | | |',
    '| f-m | medium | d | r | M | f-s | | |',
  ].join('\n'));
  let n = nextStage(cwd, { milestone: 1 });
  assert.deepEqual([n.stage, n.feature], ['build', 'f-s']);
  w(cwd, 'project/milestones/m1/features.md', [
    '| ID | Feature | Domain | Repo | Size | Depends on | Build | Verified |',
    '|--|--|--|--|--|--|--|--|',
    '| f-s | small | d | r | S | | done | yes |',
    '| f-m | medium | d | r | M | f-s | | |',
  ].join('\n'));
  n = nextStage(cwd, { milestone: 1 });
  assert.deepEqual([n.stage, n.feature], ['build', 'f-m']);
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
  w(cwd, 'project/milestones/m1/brief.md');
  w(cwd, 'project/milestones/m1/flows.md');
  w(cwd, 'project/milestones/m1/features.md', FEATURES_MD
    .replace('| f-ui  | ui work  | reg | backend | f-api | | |',
      '| f-ui  | ui work  | reg | backend | f-api | done | yes |'));
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

test('evolve gates on concepts done and needs no milestone', () => {
  const cwd = tmp();
  w(cwd, 'project/config.json', JSON.stringify(defaultConfig()));
  assert.equal(gate(cwd, 'evolve').pass, false); // concepts not done
  w(cwd, 'docs/PRODUCT.md');
  w(cwd, 'docs/DECISIONS.md', '## d');
  w(cwd, 'docs/CONCEPTS.md');
  assert.equal(gate(cwd, 'evolve').pass, true);
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
  // old classic stages return false
  assert.equal(milestoneStageDone(c, 1, 'milestone-brief'), false);
  assert.equal(milestoneStageDone(c, 1, 'tracer'), false);
});

// ---- flow parsing ----

const FLOW_MD = `# Flow: invite-redeem

Purpose: a recipient turns an invite code into membership
Depends on: context-switch

## Diagram
\`\`\`mermaid
sequenceDiagram
  actor R as Recipient
  participant RES as invite-resolver [ui]
  participant INV as invitation [service]
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
  assert.equal(d.participants[0].kind, 'actor'); // actor keyword sets kind='actor'
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
  assert.deepEqual(flows[0].dependsOn, ['context-switch']);
  assert.equal(flows[0].arrows.length, 5);
  assert.equal(flows[0].stories, undefined); // story layer dropped
});

test('parseFlows: an old file with a Stories: line still parses (line ignored)', () => {
  const c = tmp();
  w(c, 'project/flows/invite-redeem.md', FLOW_MD.replace(
    'Purpose: a recipient turns an invite code into membership',
    'Stories: S1, S2'));
  const flows = parseFlows(c);
  assert.equal(flows.length, 1);
  assert.equal(flows[0].stories, undefined);
  assert.deepEqual(flows[0].dependsOn, ['context-switch']);
  assert.equal(flows[0].arrows.length, 5);
});

const MAP_MD = `# Map

## Participant registry

| Participant | Kind | Concept |
|---|---|---|
| Recipient | actor | Account |
| invite-resolver | ui | Invitation code |
| invitation | service | Invitation code |
`;

test('parseRegistry: reads the participant table from map.md', () => {
  const c = tmp();
  assert.equal(parseRegistry(c), null); // no map.md
  w(c, 'project/map.md', MAP_MD);
  const reg = parseRegistry(c);
  assert.equal(reg.length, 3);
  assert.deepEqual(reg[1], { name: 'invite-resolver', kind: 'ui' });
  assert.deepEqual(PARTICIPANT_KINDS, ['actor', 'ui', 'service', 'store', 'external']);
});

test('contract: receives/sends/guards across all flows, with flow refs', () => {
  const c = tmp();
  w(c, 'project/flows/invite-redeem.md', FLOW_MD);
  const r = contract(c, 'invitation');
  assert.equal(r.receives.length, 1);
  assert.match(r.receives[0], /redeem\(code\)/);
  assert.match(r.receives[0], /← invite-resolver/);
  assert.match(r.receives[0], /\[invite-redeem\]/);
  assert.doesNotMatch(r.receives[0], /·/); // no story suffix
  assert.equal(r.sends.length, 2); // refused + member granted -> invite-resolver
  assert.equal(r.guards.length, 1); // rate-limit self-arrow
  assert.match(r.guards[0], /rate-limit check/);
});

test('contract: matches by participant id or label', () => {
  const c = tmp();
  w(c, 'project/flows/invite-redeem.md', FLOW_MD);
  assert.deepEqual(contract(c, 'INV'), contract(c, 'invitation'));
});

// ---- capability dependency map ----

const CONCEPTS_MD = `# Concepts

## Capability dependency map

\`\`\`mermaid
flowchart LR
  ID[Identity]
  ORG[Organizations]
  EV[Events]
  RT[Runtime]
  INV[Invitations]
  ID --> ORG
  ORG --> EV
  EV --> RT
  ID --> INV
  EV -.-> INV
\`\`\`
`;

test('parseCapabilityMap: solid and soft edges from CONCEPTS flowchart', () => {
  const c = tmp();
  initConfig(c);
  w(c, 'docs/CONCEPTS.md', CONCEPTS_MD);
  const m = parseCapabilityMap(c);
  assert.deepEqual(m.solid, [['ID', 'ORG'], ['ORG', 'EV'], ['EV', 'RT'], ['ID', 'INV']]);
  assert.deepEqual(m.soft, [['EV', 'INV']]);
});

test('closure: transitive solid prerequisites + soft in-edges surfaced', () => {
  const c = tmp();
  initConfig(c);
  w(c, 'docs/CONCEPTS.md', CONCEPTS_MD);
  const r = closure(c, ['RT']);
  assert.deepEqual(new Set(r.areas), new Set(['RT', 'EV', 'ORG', 'ID']));
  assert.deepEqual(new Set(r.pulled), new Set(['EV', 'ORG', 'ID']));
  assert.deepEqual(r.soft, []); // INV's soft edge points INTO INV, which is out of scope
  const r2 = closure(c, ['INV']);
  assert.deepEqual(r2.soft, ['EV -.-> INV']); // soft in-edge: decide, never blocks
});

test('gate: brief → flows → realize chain', () => {
  const c = tmp();
  groundwork(c);
  assert.equal(gate(c, 'brief', { milestone: 1 }).pass, true);
  assert.equal(gate(c, 'flows', { milestone: 1 }).pass, false); // no brief.md
  w(c, 'project/milestones/m1/brief.md');
  assert.equal(gate(c, 'flows', { milestone: 1 }).pass, true);
  assert.equal(gate(c, 'realize', { milestone: 1 }).pass, false); // no flows.md sign-off
  w(c, 'project/milestones/m1/flows.md');
  assert.equal(gate(c, 'realize', { milestone: 1 }).pass, true);
});

test('gate: plan/build/review/finalize ride the features DAG, no tracks', () => {
  const c = tmp();
  groundwork(c);
  w(c, 'project/milestones/m1/brief.md');
  w(c, 'project/milestones/m1/flows.md');
  w(c, 'project/milestones/m1/features.md', FEATURES_MD);
  assert.equal(gate(c, 'plan', { milestone: 1, feature: 'f-ui' }).pass, true); // thin "feature exists"
  assert.equal(gate(c, 'build', { milestone: 1, feature: 'f-ui' }).pass, true); // f-api built; plan never gates
  assert.equal(gate(c, 'review', { milestone: 1 }).pass, false); // f-ui not built
  assert.equal(gate(c, 'evolve', {}).pass, true); // concepts done is enough
});

test('validate: an existing stories.md is inert — nothing reads it, nothing blocks', () => {
  const c = tmp();
  groundwork(c);
  w(c, 'project/stories.md', '| ID | Story | Surfaces |\n|---|---|---|\n| S1 | a | Dashboard |');
  w(c, 'project/milestones/m1/brief.md', 'covers invite-redeem');
  w(c, 'project/map.md', MAP_MD);
  w(c, 'project/flows/invite-redeem.md', FLOW_MD.replace('Depends on: context-switch', 'Depends on:'));
  const r = validate(c);
  assert.ok(!r.blockers.some((b) => /stor/i.test(b)));
  assert.ok(!r.warnings.some((x) => /stor/i.test(x)));
});

test('validate: flow checks — unknown dep, undeclared participant', () => {
  const c = tmp();
  groundwork(c);
  w(c, 'project/map.md', MAP_MD);
  w(c, 'project/flows/invite-redeem.md', FLOW_MD.replace('Depends on: context-switch', 'Depends on: nope'));
  let r = validate(c);
  assert.ok(r.blockers.some((b) => /depends on unknown flow "nope"/.test(b)));
  // arrow to an undeclared participant id
  w(c, 'project/flows/bad.md', FLOW_MD.replace('RES->>INV: redeem(code)', 'RES->>GHOST: boo').replace('Depends on: context-switch', 'Depends on:'));
  r = validate(c);
  assert.ok(r.blockers.some((b) => /flow "bad": arrow references undeclared participant "GHOST"/.test(b)));
});

// ---- Fix 1: activation token arrows ----

test('parseFlowDiagram: mermaid activation tokens (+/-) are parsed, not dropped', () => {
  const md = `
\`\`\`mermaid
sequenceDiagram
  participant RES as invite-resolver
  participant INV as invitation
  RES->>+INV: redeem(code)
  INV-->>-RES: done
\`\`\`
`;
  const d = parseFlowDiagram(md);
  assert.equal(d.arrows.length, 2, 'both activation-token arrows should parse');
  assert.deepEqual(d.arrows[0], { from: 'RES', to: 'INV', msg: 'redeem(code)' });
  assert.deepEqual(d.arrows[1], { from: 'INV', to: 'RES', msg: 'done' });
  assert.deepEqual(d.unparsed ?? [], [], 'no unparsed lines expected');
});

// ---- Fix 2: unparsed arrow-like line detection ----

test('parseFlowDiagram: arrow-like lines that fail to parse are collected in unparsed', () => {
  const md = `
\`\`\`mermaid
sequenceDiagram
  participant RES as invite-resolver
  participant INV as invitation
  RES->INV missing colon
  RES->>INV: valid arrow
\`\`\`
`;
  const d = parseFlowDiagram(md);
  assert.equal(d.arrows.length, 1, 'only the valid arrow should parse');
  assert.ok(Array.isArray(d.unparsed), 'unparsed should be an array');
  assert.equal(d.unparsed.length, 1);
  assert.match(d.unparsed[0], /RES->INV missing colon/);
});

test('validate: unparseable arrow-like lines produce blockers', () => {
  const c = tmp();
  groundwork(c);
  const badFlow = `# Flow: bad-flow
Purpose: exercise unparseable arrows

\`\`\`mermaid
sequenceDiagram
  participant RES as invite-resolver
  participant INV as invitation
  RES->INV missing colon
  RES->>INV: valid
\`\`\`
`;
  w(c, 'project/flows/bad-flow.md', badFlow);
  const r = validate(c);
  assert.ok(r.blockers.some((b) => /unparseable arrow/.test(b) && /RES->INV missing colon/.test(b)),
    `expected unparseable-arrow blocker, got: ${JSON.stringify(r.blockers)}`);
});

// ---- Fix 3: [kind] suffix enforcement ----

test('validate: participant kind mismatch with registry → blocker', () => {
  const c = tmp();
  groundwork(c);
  w(c, 'project/map.md', MAP_MD);
  // We construct a fresh flow where invitation is declared as [api] but registry says service
  const flowWithWrongKind = `# Flow: invite-redeem
Purpose: redeem an invite

\`\`\`mermaid
sequenceDiagram
  actor R as Recipient
  participant RES as invite-resolver [ui]
  participant INV as invitation [api]
  R->>RES: paste code
  RES->>INV: redeem(code)
\`\`\`
`;
  w(c, 'project/flows/invite-redeem.md', flowWithWrongKind);
  const r = validate(c);
  assert.ok(r.blockers.some((b) => /invitation.*\[api\].*registry says service/.test(b) || /\[api\].*service/.test(b)),
    `expected kind-mismatch blocker, got: ${JSON.stringify(r.blockers)}`);
});

test('validate: participant with no [kind] suffix → warning (not blocker)', () => {
  const c = tmp();
  groundwork(c);
  w(c, 'project/map.md', MAP_MD);
  // invite-resolver has no [kind] suffix in the flow
  const flowNoKind = `# Flow: invite-redeem
Purpose: redeem an invite

\`\`\`mermaid
sequenceDiagram
  actor R as Recipient
  participant RES as invite-resolver
  participant INV as invitation [service]
  R->>RES: paste code
  RES->>INV: redeem(code)
\`\`\`
`;
  w(c, 'project/flows/invite-redeem.md', flowNoKind);
  const r = validate(c);
  assert.ok(!r.blockers.some((b) => /invite-resolver.*no \[kind\]/.test(b)),
    `should not be a blocker, got blockers: ${JSON.stringify(r.blockers)}`);
  assert.ok(r.warnings.some((w) => /invite-resolver.*no \[kind\]/.test(w) || /no \[kind\] suffix/.test(w)),
    `expected no-kind warning, got warnings: ${JSON.stringify(r.warnings)}`);
});

test('validate: actor participant with no [kind] suffix and registry kind actor → no warning', () => {
  const c = tmp();
  groundwork(c);
  w(c, 'project/map.md', MAP_MD);
  // Recipient is declared as `actor R as Recipient` — no [kind] suffix; registry says actor
  const flowActorNoSuffix = `# Flow: invite-redeem
Purpose: redeem an invite

\`\`\`mermaid
sequenceDiagram
  actor R as Recipient
  participant RES as invite-resolver [ui]
  participant INV as invitation [service]
  R->>RES: paste code
  RES->>INV: redeem(code)
\`\`\`
`;
  w(c, 'project/flows/invite-redeem.md', flowActorNoSuffix);
  const r = validate(c);
  assert.ok(!r.warnings.some((w) => /Recipient.*no \[kind\]/.test(w)),
    `actor with matching registry kind should not warn, got: ${JSON.stringify(r.warnings)}`);
});

// ---- upgrade detector ----

test('upgradeGeneration: sets generation = flows on config', () => {
  const cwd = tmp();
  initConfig(cwd);
  const cfg = loadConfig(cwd);
  delete cfg.generation;
  saveConfig(cwd, cfg);
  assert.equal(loadConfig(cwd).generation, undefined);
  upgradeGeneration(cwd);
  assert.equal(loadConfig(cwd).generation, 'flows');
});

// ---- brief ## Flows coverage (validate) ----

const BRIEF_WITH_FLOWS = `# Milestone 1 — Test

## Scope
- stuff

## Flows
- invite-redeem
- missing-flow
`;

test('validate: flows stage done + brief-listed flow file missing → blocker', () => {
  const c = tmp();
  groundwork(c);
  w(c, 'project/milestones/m1/brief.md', BRIEF_WITH_FLOWS);
  w(c, 'project/milestones/m1/flows.md');
  w(c, 'project/flows/invite-redeem.md', '# Flow: invite-redeem\n');
  const r = validate(c);
  assert.ok(r.blockers.some((b) => /brief lists flow "missing-flow"/.test(b)),
    `expected brief-coverage blocker, got: ${JSON.stringify(r.blockers)}`);
  assert.ok(!r.blockers.some((b) => /brief lists flow "invite-redeem"/.test(b)));
});

test('validate: flows stage not done yet → listed-but-missing flow is not a blocker', () => {
  const c = tmp();
  groundwork(c);
  w(c, 'project/milestones/m1/brief.md', BRIEF_WITH_FLOWS);
  const r = validate(c);
  assert.ok(!r.blockers.some((b) => /brief lists flow/.test(b)),
    `expected no brief-coverage blocker before flows is done, got: ${JSON.stringify(r.blockers)}`);
});

test('validate: flows done + every brief-listed flow has its file → no coverage blocker', () => {
  const c = tmp();
  groundwork(c);
  w(c, 'project/milestones/m1/brief.md', '# M1\n\n## Flows\n- invite-redeem\n');
  w(c, 'project/milestones/m1/flows.md');
  w(c, 'project/flows/invite-redeem.md', '# Flow: invite-redeem\n');
  const r = validate(c);
  assert.ok(!r.blockers.some((b) => /brief lists flow/.test(b)),
    `expected no brief-coverage blocker, got: ${JSON.stringify(r.blockers)}`);
});

// ---- features-scaffold (flows → features DAG generation) ----

// Two flows. checkout depends on cart (its "Depends on:" line). Both touch a
// `cart` store + an `order` service; checkout also touches a [ui] and an actor.
const FLOW_CART = `# Flow: cart-add
Depends on: none

\`\`\`mermaid
sequenceDiagram
  actor U as Shopper
  participant PG as cart-page [ui]
  participant CART as cart [store]
  U->>PG: add item
  PG->>CART: put(item)
\`\`\`
`;
const FLOW_CHECKOUT = `# Flow: checkout
Depends on: cart-add

\`\`\`mermaid
sequenceDiagram
  actor U as Shopper
  participant PG as checkout-page [ui]
  participant CART as cart [store]
  participant ORD as order [service]
  participant PAY as stripe [external]
  U->>PG: submit
  PG->>CART: read()
  PG->>ORD: place(cart)
  ORD->>PAY: charge()
\`\`\`
`;

function scaffoldSetup(c) {
  groundwork(c);
  w(c, 'project/milestones/m1/brief.md', '# M1\n\n## Flows\n- cart-add\n- checkout\n');
  w(c, 'project/flows/cart-add.md', FLOW_CART);
  w(c, 'project/flows/checkout.md', FLOW_CHECKOUT);
}

test('featuresScaffold: initial generation — slug IDs, skeleton rows for service/store only, derived deps', () => {
  const c = tmp();
  scaffoldSetup(c);
  const res = featuresScaffold(c, 1);
  assert.equal(res.written, true);
  const feats = parseFeatures(c, 1);
  const ids = feats.map((f) => f.id);
  // skeleton rows only for store/service participants (cart, order) — NOT ui/actor/external
  assert.ok(ids.includes('cart-skeleton'));
  assert.ok(ids.includes('order-skeleton'));
  assert.ok(!ids.includes('cart-page-skeleton'));
  assert.ok(!ids.includes('stripe-skeleton'));
  assert.ok(!ids.includes('shopper-skeleton'));
  // per-flow rows keyed by slug
  assert.ok(ids.includes('cart-add'));
  assert.ok(ids.includes('checkout'));
  // cart-add deps = cart-skeleton (its store) ∪ none
  const cartAdd = feats.find((f) => f.id === 'cart-add');
  assert.deepEqual(new Set(cartAdd.dependsOn), new Set(['cart-skeleton']));
  // checkout deps = (cart-skeleton, order-skeleton) ∪ (cart-add from Depends on)
  const checkout = feats.find((f) => f.id === 'checkout');
  assert.deepEqual(new Set(checkout.dependsOn), new Set(['cart-skeleton', 'order-skeleton', 'cart-add']));
});

test('featuresScaffold: idempotent re-run preserves Build/Verified/Domain/Repo/Size and agent-added rows', () => {
  const c = tmp();
  scaffoldSetup(c);
  featuresScaffold(c, 1);
  // Agent fills Domain/Repo/Size and adds a non-flow core row + a ui row by hand.
  const filled = [
    '| ID | Feature | Domain | Repo | Size | Depends on | Build | Verified |',
    '|--|--|--|--|--|--|--|--|',
    '| scaffold | project scaffold | infra | app | S | | done | yes |',
    '| cart-skeleton | cart skeleton | commerce | app | S | scaffold | done | yes |',
    '| order-skeleton | order skeleton | commerce | app | M | scaffold | | |',
    '| cart-add | cart-add flow | commerce | app | M | cart-skeleton | done | yes |',
    '| checkout | checkout flow | commerce | app | L | cart-skeleton, order-skeleton, cart-add | | |',
    '| storefront-ui | storefront surface | ui | app | M | cart-add, checkout | | |',
  ].join('\n');
  w(c, 'project/milestones/m1/features.md', filled);
  featuresScaffold(c, 1);
  const feats = parseFeatures(c, 1);
  const byId = Object.fromEntries(feats.map((f) => [f.id, f]));
  // scaffold-owned rows keep their agent-set columns
  assert.equal(byId['cart-add'].domain, 'commerce');
  assert.equal(byId['cart-add'].repo, 'app');
  assert.equal(byId['cart-add'].size, 'M');
  assert.equal(byId['cart-add'].build, true);
  assert.equal(byId['cart-add'].verified, true);
  assert.equal(byId['cart-skeleton'].build, true);
  // agent-added rows survive verbatim
  assert.ok(byId['scaffold']);
  assert.equal(byId['scaffold'].build, true);
  assert.ok(byId['storefront-ui']);
  assert.deepEqual(new Set(byId['storefront-ui'].dependsOn), new Set(['cart-add', 'checkout']));
});

test('featuresScaffold: slug/skeleton collision is an error', () => {
  const c = tmp();
  groundwork(c);
  // a flow literally named "cart-skeleton" whose own store implies a cart-skeleton row
  w(c, 'project/milestones/m1/brief.md', '# M1\n\n## Flows\n- cart-skeleton\n');
  w(c, 'project/flows/cart-skeleton.md', `# Flow: cart-skeleton
Depends on: none

\`\`\`mermaid
sequenceDiagram
  participant PG as page [ui]
  participant CART as cart [store]
  PG->>CART: put()
\`\`\`
`);
  assert.throws(() => featuresScaffold(c, 1), /collision|rename/i);
});

test('featuresScaffold: a scaffold-type row whose flow no longer exists is dropped and reported', () => {
  const c = tmp();
  scaffoldSetup(c);
  featuresScaffold(c, 1);
  // remove the checkout flow + drop it from the brief
  fs.rmSync(path.join(c, 'project/flows/checkout.md'));
  w(c, 'project/milestones/m1/brief.md', '# M1\n\n## Flows\n- cart-add\n');
  const res = featuresScaffold(c, 1);
  const ids = parseFeatures(c, 1).map((f) => f.id);
  assert.ok(!ids.includes('checkout'));
  assert.ok(!ids.includes('order-skeleton')); // its only owner was checkout
  assert.ok(res.dropped.includes('checkout'));
});

test('featuresScaffold: --dry-run prints the diff without writing', () => {
  const c = tmp();
  scaffoldSetup(c);
  const res = featuresScaffold(c, 1, { dryRun: true });
  assert.equal(res.written, false);
  assert.equal(fs.existsSync(path.join(c, 'project/milestones/m1/features.md')), false);
  assert.ok(typeof res.table === 'string' && /cart-add/.test(res.table));
});

// ---- affected <entity> ----

test('affectedFlows: matches by participant id and by label, reports slice path', () => {
  const c = tmp();
  scaffoldSetup(c);
  // by label "cart" — present in both flows
  const byLabel = affectedFlows(c, 'cart');
  assert.deepEqual(byLabel.map((x) => x.slug).sort(), ['cart-add', 'checkout']);
  assert.equal(byLabel[0].flowFile, `project/flows/${byLabel[0].slug}.md`);
  assert.equal(byLabel[0].codeSlice, `src/lib/flows/${byLabel[0].slug}/`);
  // by id "ORD" — only checkout
  const byId = affectedFlows(c, 'ORD');
  assert.deepEqual(byId.map((x) => x.slug), ['checkout']);
  // case-insensitive
  assert.deepEqual(affectedFlows(c, 'CART').map((x) => x.slug).sort(), ['cart-add', 'checkout']);
});

// ---- gate/next no longer require a plan ----

test('gate: build no longer requires a plan (deps-only)', () => {
  const c = tmp();
  groundwork(c);
  w(c, 'project/milestones/m1/brief.md');
  w(c, 'project/milestones/m1/flows.md');
  w(c, 'project/milestones/m1/features.md', [
    '| ID | Feature | Domain | Repo | Size | Depends on | Build | Verified |',
    '|--|--|--|--|--|--|--|--|',
    '| f-m | medium | d | r | M | | | |',
  ].join('\n'));
  // M-size feature with no plan file -> still passes (plan no longer gates build)
  const g = gate(c, 'build', { milestone: 1, feature: 'f-m' });
  assert.equal(g.pass, true);
  assert.ok(!g.missing.some((x) => /not planned/.test(x)));
});

test('nextStage: a deps-ready M feature routes to build, not plan', () => {
  const c = tmp();
  groundwork(c);
  w(c, 'project/milestones/m1/brief.md');
  w(c, 'project/milestones/m1/flows.md');
  w(c, 'project/milestones/m1/features.md', [
    '| ID | Feature | Domain | Repo | Size | Depends on | Build | Verified |',
    '|--|--|--|--|--|--|--|--|',
    '| f-m | medium | d | r | M | | | |',
  ].join('\n'));
  const n = nextStage(c, { milestone: 1 });
  assert.deepEqual([n.stage, n.feature], ['build', 'f-m']);
});

test('gate: plan stays runnable as a thin "feature exists" check, never gates build', () => {
  const c = tmp();
  groundwork(c);
  w(c, 'project/milestones/m1/brief.md');
  w(c, 'project/milestones/m1/flows.md');
  w(c, 'project/milestones/m1/features.md', [
    '| ID | Feature | Domain | Repo | Size | Depends on | Build | Verified |',
    '|--|--|--|--|--|--|--|--|',
    '| f-m | medium | d | r | M | | | |',
  ].join('\n'));
  assert.equal(gate(c, 'plan', { milestone: 1, feature: 'f-m' }).pass, true);
  assert.equal(gate(c, 'plan', { milestone: 1, feature: 'ghost' }).pass, false);
});

// ---- validate: code-in-plan blocker ----

test('validate: a plan file with a fenced code block is a blocker', () => {
  const c = tmp();
  groundwork(c);
  w(c, 'project/milestones/m1/brief.md');
  w(c, 'project/milestones/m1/plans/checkout.md',
    '## Tasks\n- [ ] wire it\n\n```ts\nconst x = 1;\n```\n');
  const r = validate(c);
  assert.ok(r.blockers.some((b) => /plan/i.test(b) && /code block/i.test(b)),
    `expected code-in-plan blocker, got: ${JSON.stringify(r.blockers)}`);
});

test('validate: a clean plan file (no fence) is fine', () => {
  const c = tmp();
  groundwork(c);
  w(c, 'project/milestones/m1/brief.md');
  w(c, 'project/milestones/m1/plans/checkout.md',
    '## Gaps\n- confirm shape of `APIError.body.code`\n\n## Tasks\n- [ ] wire it\n');
  const r = validate(c);
  assert.ok(!r.blockers.some((b) => /code block/i.test(b)));
});

test('validate: a features.md ID that is neither flow-slug nor skeleton → warning (graceful)', () => {
  const c = tmp();
  groundwork(c);
  w(c, 'project/milestones/m1/brief.md', '# M1\n\n## Flows\n- cart-add\n');
  w(c, 'project/flows/cart-add.md', FLOW_CART);
  w(c, 'project/milestones/m1/features.md', [
    '| ID | Feature | Domain | Repo | Size | Depends on | Build | Verified |',
    '|--|--|--|--|--|--|--|--|',
    '| cart-add | flow | d | r | M | cart-skeleton | | |',
    '| cart-skeleton | sk | d | r | S | | | |',
    '| weird-orphan | ? | d | r | M | | | |',
  ].join('\n'));
  const r = validate(c);
  assert.ok(r.warnings.some((x) => /weird-orphan/.test(x)),
    `expected unknown-id warning, got: ${JSON.stringify(r.warnings)}`);
  // legit ids do not warn
  assert.ok(!r.warnings.some((x) => /"cart-add"/.test(x)));
  assert.ok(!r.warnings.some((x) => /"cart-skeleton"/.test(x)));
});
