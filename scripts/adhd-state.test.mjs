// scripts/adhd-state.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  defaultState, loadState, saveState, initState,
  setStageStatus, gate, nextStage, statusReport,
  sessionAdd, sessionReset, FRONTLOAD_STAGES, MILESTONE_STAGES, FEATURE_STAGES, STAGE_STATUSES,
  confirmPreflight, advanceMilestone, STATE_VERSION,
  setMode, addRepo, removeRepo, listRepos, setSurfaceMeta, SURFACE_KINDS, MODES,
  setMilestoneTrack, setMilestoneTitle, setMilestoneStories, removeMilestone,
  addDomain, removeDomain, listDomains,
  bindRepo, unbindRepo, migrateRepos,
  setMilestoneDomains, validate, audit, migrate,
  setPrototypeTopology, setPrototypeHome, PROTOTYPE_TOPOLOGIES,
  addFeature, setFeatureDeps, removeFeature, listFeatures, verifyFeature,
} from './adhd-state.mjs';

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'adhd-'));
}
function touch(cwd, rel, body = 'x') {
  const p = path.join(cwd, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body);
}
function gitRepo() {
  const cwd = tmp();
  fs.mkdirSync(path.join(cwd, '.git'));
  return cwd;
}
// drive the front-load to done
function frontloadDone(cwd) {
  for (const s of FRONTLOAD_STAGES) setStageStatus(cwd, { stage: s, status: 'done' });
}

test('defaultState: version 2, front-load blocked, single/colocated', () => {
  const s = defaultState();
  assert.equal(s.version, STATE_VERSION);
  assert.equal(STATE_VERSION, 2);
  assert.equal(s.mode, 'single');
  assert.equal(s.prototypeTopology, 'colocated');
  assert.deepEqual(s.prototype, { repo: null, subpath: null });
  assert.equal(s.currentFeature, null);
  for (const stage of FRONTLOAD_STAGES) assert.equal(s.frontload[stage].status, 'blocked');
});

test('FRONTLOAD/MILESTONE/FEATURE stage lists', () => {
  assert.deepEqual(FRONTLOAD_STAGES, ['setup', 'vision', 'stories', 'foundation', 'map']);
  assert.deepEqual(MILESTONE_STAGES, ['milestone-brief', 'design', 'tracer', 'features', 'review', 'finalize']);
  assert.deepEqual(FEATURE_STAGES, ['plan', 'build']);
});

test('initState writes state.json, idempotent, setup pending', () => {
  const cwd = tmp();
  const s1 = initState(cwd);
  assert.ok(fs.existsSync(path.join(cwd, 'project/state.json')));
  assert.equal(s1.frontload.setup.status, 'pending');
  assert.equal(initState(cwd).createdAt, s1.createdAt);
});

test('loadState null when missing; throws on corrupt', () => {
  assert.equal(loadState(tmp()), null);
  const cwd = tmp();
  touch(cwd, 'project/state.json', '{ not json');
  assert.throws(() => loadState(cwd), /corrupt or not valid JSON/);
});

test('saveState round-trips, bumps updatedAt, leaves no .tmp', () => {
  const cwd = tmp();
  const s = initState(cwd);
  s.currentMilestone = 3;
  saveState(cwd, s);
  assert.equal(loadState(cwd).currentMilestone, 3);
  assert.equal(fs.existsSync(path.join(cwd, 'project/state.json.tmp')), false);
});

test('gate(setup) always passes', () => {
  const cwd = tmp();
  initState(cwd);
  assert.equal(gate(cwd, 'setup').pass, true);
});

test('gate(vision) needs setup done', () => {
  const cwd = tmp();
  initState(cwd);
  assert.equal(gate(cwd, 'vision').pass, false);
  setStageStatus(cwd, { stage: 'setup', status: 'done' });
  assert.equal(gate(cwd, 'vision').pass, true);
});

test('gate(stories) needs docs/PRODUCT.md', () => {
  const cwd = tmp();
  initState(cwd);
  assert.equal(gate(cwd, 'stories').pass, false);
  touch(cwd, 'docs/PRODUCT.md');
  assert.equal(gate(cwd, 'stories').pass, true);
});

test('gate(foundation) needs project/stories.md', () => {
  const cwd = tmp();
  initState(cwd);
  assert.equal(gate(cwd, 'foundation').pass, false);
  touch(cwd, 'project/stories.md');
  assert.equal(gate(cwd, 'foundation').pass, true);
});

test('gate(map) needs foundation done', () => {
  const cwd = tmp();
  initState(cwd);
  assert.equal(gate(cwd, 'map').pass, false);
  setStageStatus(cwd, { stage: 'foundation', status: 'done' });
  assert.equal(gate(cwd, 'map').pass, true);
});

test('gate(milestone-brief) needs map.md and GLOSSARY.md', () => {
  const cwd = tmp();
  initState(cwd);
  touch(cwd, 'project/map.md');
  assert.equal(gate(cwd, 'milestone-brief').pass, false);
  touch(cwd, 'docs/GLOSSARY.md');
  assert.equal(gate(cwd, 'milestone-brief').pass, true);
});

test('gate(design) needs milestone-brief done', () => {
  const cwd = tmp();
  initState(cwd);
  assert.equal(gate(cwd, 'design', { milestone: 1 }).pass, false);
  setStageStatus(cwd, { stage: 'milestone-brief', status: 'done', milestone: 1 });
  assert.equal(gate(cwd, 'design', { milestone: 1 }).pass, true);
});

test('gate(tracer) refuses prototype-only, needs design on production', () => {
  const cwd = tmp();
  initState(cwd);
  setMilestoneTrack(cwd, { milestone: 1, track: 'prototype' });
  setStageStatus(cwd, { stage: 'design', status: 'done', milestone: 1 });
  const proto = gate(cwd, 'tracer', { milestone: 1 });
  assert.equal(proto.pass, false);
  assert.ok(proto.missing.some((x) => /prototype-only/.test(x)));

  setMilestoneTrack(cwd, { milestone: 1, track: 'production' });
  assert.equal(gate(cwd, 'tracer', { milestone: 1 }).pass, true);
});

test('gate(features) needs tracer done on a production milestone', () => {
  const cwd = tmp();
  initState(cwd);
  setMilestoneTrack(cwd, { milestone: 1, track: 'production' });
  assert.equal(gate(cwd, 'features', { milestone: 1 }).pass, false);
  setStageStatus(cwd, { stage: 'tracer', status: 'done', milestone: 1 });
  assert.equal(gate(cwd, 'features', { milestone: 1 }).pass, true);
});

test('gate(plan) needs the feature to exist and features stage done', () => {
  const cwd = tmp();
  initState(cwd);
  setMilestoneTrack(cwd, { milestone: 1, track: 'production' });
  assert.equal(gate(cwd, 'plan', { milestone: 1, feature: 'reg-api' }).pass, false);
  addFeature(cwd, { milestone: 1, id: 'reg-api', story: 'S1', domain: 'registry', repo: 'backend' });
  setStageStatus(cwd, { stage: 'features', status: 'done', milestone: 1 });
  assert.equal(gate(cwd, 'plan', { milestone: 1, feature: 'reg-api' }).pass, true);
});

test('gate(build) needs the plan file and all dependency features built', () => {
  const cwd = tmp();
  initState(cwd);
  addFeature(cwd, { milestone: 1, id: 'api', story: 'S1', domain: 'd', repo: 'r' });
  addFeature(cwd, { milestone: 1, id: 'ui', story: 'S1', domain: 'd', repo: 'r', dependsOn: ['api'] });
  touch(cwd, 'project/milestones/m1/plans/ui.md');
  // api not built yet → ui build blocked
  let g = gate(cwd, 'build', { milestone: 1, feature: 'ui' });
  assert.equal(g.pass, false);
  assert.ok(g.missing.some((x) => /unbuilt/.test(x) && /api/.test(x)));
  setStageStatus(cwd, { stage: 'build', status: 'done', milestone: 1, feature: 'api' });
  assert.equal(gate(cwd, 'build', { milestone: 1, feature: 'ui' }).pass, true);
});

test('gate(review): prototype-only needs design; production needs every feature built+verified', () => {
  const cwd = tmp();
  initState(cwd);
  setMilestoneTrack(cwd, { milestone: 1, track: 'prototype' });
  assert.equal(gate(cwd, 'review', { milestone: 1 }).pass, false);
  setStageStatus(cwd, { stage: 'design', status: 'done', milestone: 1 });
  assert.equal(gate(cwd, 'review', { milestone: 1 }).pass, true);

  const cwd2 = tmp();
  initState(cwd2);
  setMilestoneTrack(cwd2, { milestone: 1, track: 'production' });
  addFeature(cwd2, { milestone: 1, id: 'api', story: 'S1', domain: 'd', repo: 'r' });
  setStageStatus(cwd2, { stage: 'features', status: 'done', milestone: 1 });
  setStageStatus(cwd2, { stage: 'build', status: 'done', milestone: 1, feature: 'api' });
  assert.equal(gate(cwd2, 'review', { milestone: 1 }).pass, false); // not verified
  verifyFeature(cwd2, { milestone: 1, id: 'api' });
  assert.equal(gate(cwd2, 'review', { milestone: 1 }).pass, true);
});

test('gate(finalize) needs review done', () => {
  const cwd = tmp();
  initState(cwd);
  assert.equal(gate(cwd, 'finalize', { milestone: 1 }).pass, false);
  setStageStatus(cwd, { stage: 'review', status: 'done', milestone: 1 });
  assert.equal(gate(cwd, 'finalize', { milestone: 1 }).pass, true);
});

test('nextStage walks front-load then milestone-brief', () => {
  const cwd = tmp();
  initState(cwd);
  assert.equal(nextStage(cwd).stage, 'setup');
  frontloadDone(cwd);
  assert.equal(nextStage(cwd).stage, 'milestone-brief');
});

test('nextStage on a prototype-only milestone: brief → design → review → finalize', () => {
  const cwd = tmp();
  initState(cwd);
  frontloadDone(cwd);
  setMilestoneTrack(cwd, { milestone: 1, track: 'prototype' });
  setStageStatus(cwd, { stage: 'milestone-brief', status: 'done', milestone: 1 });
  assert.equal(nextStage(cwd).stage, 'design');
  setStageStatus(cwd, { stage: 'design', status: 'done', milestone: 1 });
  assert.equal(nextStage(cwd).stage, 'review');
  setStageStatus(cwd, { stage: 'review', status: 'done', milestone: 1 });
  assert.equal(nextStage(cwd).stage, 'finalize');
  setStageStatus(cwd, { stage: 'finalize', status: 'done', milestone: 1 });
  assert.equal(nextStage(cwd).stage, 'next-milestone');
});

test('nextStage on a production milestone: design → tracer → features → plan → build', () => {
  const cwd = tmp();
  initState(cwd);
  frontloadDone(cwd);
  setMilestoneTrack(cwd, { milestone: 1, track: 'production' });
  setStageStatus(cwd, { stage: 'milestone-brief', status: 'done', milestone: 1 });
  setStageStatus(cwd, { stage: 'design', status: 'done', milestone: 1 });
  assert.equal(nextStage(cwd).stage, 'tracer');
  setStageStatus(cwd, { stage: 'tracer', status: 'done', milestone: 1 });
  assert.equal(nextStage(cwd).stage, 'features');
  setStageStatus(cwd, { stage: 'features', status: 'done', milestone: 1 });
  addFeature(cwd, { milestone: 1, id: 'api', story: 'S1', domain: 'd', repo: 'r' });
  let n = nextStage(cwd);
  assert.equal(n.stage, 'plan');
  assert.equal(n.feature, 'api');
  setStageStatus(cwd, { stage: 'plan', status: 'done', milestone: 1, feature: 'api' });
  n = nextStage(cwd);
  assert.equal(n.stage, 'build');
  assert.equal(n.feature, 'api');
  setStageStatus(cwd, { stage: 'build', status: 'done', milestone: 1, feature: 'api' });
  assert.equal(nextStage(cwd).stage, 'review');
});

test('nextStage build order respects feature dependencies', () => {
  const cwd = tmp();
  initState(cwd);
  frontloadDone(cwd);
  setMilestoneTrack(cwd, { milestone: 1, track: 'production' });
  for (const s of ['milestone-brief', 'design', 'tracer', 'features']) {
    setStageStatus(cwd, { stage: s, status: 'done', milestone: 1 });
  }
  addFeature(cwd, { milestone: 1, id: 'api', story: 'S1', domain: 'd', repo: 'r' });
  addFeature(cwd, { milestone: 1, id: 'ui', story: 'S1', domain: 'd', repo: 'r', dependsOn: ['api'] });
  for (const id of ['api', 'ui']) setStageStatus(cwd, { stage: 'plan', status: 'done', milestone: 1, feature: id });
  // both plans done; only api is buildable (ui depends on api)
  assert.equal(nextStage(cwd).feature, 'api');
  setStageStatus(cwd, { stage: 'build', status: 'done', milestone: 1, feature: 'api' });
  assert.equal(nextStage(cwd).feature, 'ui');
});

test('setStageStatus updates currentMilestone and currentFeature', () => {
  const cwd = tmp();
  initState(cwd);
  setStageStatus(cwd, { stage: 'build', status: 'in-progress', milestone: 2, feature: 'x' });
  const s = loadState(cwd);
  assert.equal(s.currentMilestone, 2);
  assert.equal(s.currentFeature, 'x');
});

test('effortLog records milestone and feature for feature stages', () => {
  const cwd = tmp();
  initState(cwd);
  setStageStatus(cwd, { stage: 'build', status: 'done', feature: 'api' });
  const log = loadState(cwd).effortLog.at(-1);
  assert.equal(log.milestone, 1);
  assert.equal(log.feature, 'api');
});

test('STAGE_STATUSES lists the four valid statuses', () => {
  assert.deepEqual(STAGE_STATUSES, ['blocked', 'pending', 'in-progress', 'done']);
});

test('sessionAdd / sessionReset track stages; throw without state', () => {
  const cwd = tmp();
  initState(cwd);
  sessionAdd(cwd, 'vision');
  sessionAdd(cwd, 'stories');
  assert.deepEqual(loadState(cwd).session.stagesRun, ['vision', 'stories']);
  sessionReset(cwd);
  assert.deepEqual(loadState(cwd).session.stagesRun, []);
  assert.throws(() => sessionAdd(tmp(), 'vision'), /adhd setup/);
  assert.throws(() => sessionReset(tmp()), /adhd setup/);
});

test('statusReport mentions the next runnable stage', () => {
  const cwd = tmp();
  initState(cwd);
  assert.match(statusReport(cwd), /setup/);
});

test('confirmPreflight sets skillsConfirmed; advanceMilestone bumps and clears', () => {
  const cwd = tmp();
  initState(cwd);
  confirmPreflight(cwd);
  assert.equal(loadState(cwd).preflight.skillsConfirmed, true);
  sessionAdd(cwd, 'vision');
  setStageStatus(cwd, { stage: 'build', status: 'done', feature: 'api' });
  advanceMilestone(cwd);
  const s = loadState(cwd);
  assert.equal(s.currentMilestone, 2);
  assert.equal(s.currentFeature, null);
  assert.deepEqual(s.session.stagesRun, []);
});

test('SURFACE_KINDS / MODES / PROTOTYPE_TOPOLOGIES', () => {
  assert.deepEqual(SURFACE_KINDS, ['ui', 'api', 'lib']);
  assert.deepEqual(MODES, ['single', 'multi']);
  assert.deepEqual(PROTOTYPE_TOPOLOGIES, ['colocated', 'standalone']);
});

test('setMode switches and rejects invalid', () => {
  const cwd = tmp();
  initState(cwd);
  setMode(cwd, 'multi');
  assert.equal(loadState(cwd).mode, 'multi');
  assert.throws(() => setMode(cwd, 'bogus'), /Invalid mode/);
});

test('addRepo / bindRepo / unbindRepo / removeRepo', () => {
  const cwd = tmp();
  initState(cwd);
  addRepo(cwd, { name: 'backend', kind: 'api', remote: 'git@x:b.git' });
  assert.equal(loadState(cwd).repos.backend.kind, 'api');
  assert.throws(() => addRepo(cwd, { name: 'x', kind: 'bogus' }), /Invalid kind/);
  const repo = gitRepo();
  bindRepo(cwd, 'backend', repo);
  assert.equal(listRepos(cwd).backend.bound, true);
  unbindRepo(cwd, 'backend');
  assert.equal(listRepos(cwd).backend.bound, false);
  removeRepo(cwd, 'backend');
  assert.deepEqual(loadState(cwd).repos, {});
});

test('bindRepo rejects unregistered, missing, non-git paths', () => {
  const cwd = tmp();
  initState(cwd);
  assert.throws(() => bindRepo(cwd, 'ghost', gitRepo()), /No registered repo/);
  addRepo(cwd, { name: 'backend', kind: 'api' });
  assert.throws(() => bindRepo(cwd, 'backend', '/no/such/path'), /does not exist/);
  assert.throws(() => bindRepo(cwd, 'backend', tmp()), /Not a git repository/);
});

test('migrateRepos moves inline paths into the local bindings file', () => {
  const cwd = tmp();
  initState(cwd);
  const repo = gitRepo();
  const s = loadState(cwd);
  s.repos.legacy = { path: repo, kind: 'api' };
  saveState(cwd, s);
  assert.equal(migrateRepos(cwd), 1);
  assert.equal(loadState(cwd).repos.legacy.path, undefined);
  assert.equal(listRepos(cwd).legacy.path, path.resolve(repo));
});

test('domains: add, remove, list, milestone tagging', () => {
  const cwd = tmp();
  initState(cwd);
  addDomain(cwd, { name: 'registry', description: 'truth', homeRepo: 'backend', homeSubpath: 'core' });
  assert.deepEqual(loadState(cwd).domains.registry.home, { repo: 'backend', subpath: 'core' });
  setMilestoneDomains(cwd, { milestone: 1, domains: ['registry'] });
  assert.deepEqual(loadState(cwd).milestones['1'].domains, ['registry']);
  removeDomain(cwd, 'registry');
  assert.deepEqual(listDomains(cwd), {});
});

test('surface-meta records metadata only, no stage status', () => {
  const cwd = tmp();
  initState(cwd);
  setSurfaceMeta(cwd, { milestone: 1, surface: 'admin', domains: ['registry'], repo: 'ui', subpath: 'pages', kind: 'ui' });
  const surf = loadState(cwd).milestones['1'].surfaces.admin;
  assert.deepEqual(surf, { kind: 'ui', domains: ['registry'], repo: 'ui', subpath: 'pages' });
  assert.equal(surf.design, undefined);
});

test('milestone title / stories / track persist', () => {
  const cwd = tmp();
  initState(cwd);
  setMilestoneTitle(cwd, { milestone: 1, title: 'Relationships' });
  setMilestoneStories(cwd, { milestone: 1, stories: ['S1', 'S2'] });
  setMilestoneTrack(cwd, { milestone: 1, track: 'production' });
  const ms = loadState(cwd).milestones['1'];
  assert.equal(ms.title, 'Relationships');
  assert.deepEqual(ms.stories, ['S1', 'S2']);
  assert.equal(ms.track, 'production');
  assert.throws(() => setMilestoneTrack(cwd, { milestone: 1, track: 'bogus' }), /Invalid track/);
});

test('removeMilestone deletes a clean future milestone, guards current and worked ones', () => {
  const cwd = tmp();
  initState(cwd);
  setMilestoneDomains(cwd, { milestone: 2, domains: [] }); // creates an empty M2
  const s = loadState(cwd); s.currentMilestone = 1; saveState(cwd, s);
  removeMilestone(cwd, 2);
  assert.equal(loadState(cwd).milestones['2'], undefined);
  // the current milestone is guarded
  setMilestoneDomains(cwd, { milestone: 1, domains: [] });
  const s1 = loadState(cwd); s1.currentMilestone = 1; saveState(cwd, s1);
  assert.throws(() => removeMilestone(cwd, 1), /current milestone/);
  // a milestone with completed work is guarded
  const s2 = loadState(cwd);
  s2.milestones['4'] = { stages: { 'milestone-brief': { status: 'done' } }, featureGraph: {} };
  saveState(cwd, s2);
  assert.throws(() => removeMilestone(cwd, 4), /completed work/);
  // an unknown milestone errors
  assert.throws(() => removeMilestone(cwd, 9), /No milestone/);
});

test('prototype topology + home', () => {
  const cwd = tmp();
  initState(cwd);
  setPrototypeTopology(cwd, 'standalone');
  setPrototypeHome(cwd, { repo: 'backend', subpath: 'prototype' });
  assert.equal(loadState(cwd).prototypeTopology, 'standalone');
  assert.deepEqual(loadState(cwd).prototype, { repo: 'backend', subpath: 'prototype' });
  assert.throws(() => setPrototypeTopology(cwd, 'bogus'), /Invalid topology/);
});

test('features: add, deps, list, verify, remove', () => {
  const cwd = tmp();
  initState(cwd);
  addFeature(cwd, { milestone: 1, id: 'api', story: 'S1', domain: 'registry', repo: 'backend' });
  addFeature(cwd, { milestone: 1, id: 'ui', story: 'S1', domain: 'registry', repo: 'ui', surface: 'admin' });
  setFeatureDeps(cwd, { milestone: 1, id: 'ui', dependsOn: ['api'] });
  const graph = listFeatures(cwd, 1);
  assert.equal(graph.api.story, 'S1');
  assert.deepEqual(graph.ui.dependsOn, ['api']);
  assert.equal(graph.ui.surface, 'admin');
  assert.equal(graph.api.verified, false);
  verifyFeature(cwd, { milestone: 1, id: 'api' });
  assert.equal(listFeatures(cwd, 1).api.verified, true);
  removeFeature(cwd, { milestone: 1, id: 'ui' });
  assert.equal(listFeatures(cwd, 1).ui, undefined);
});

test('validate passes on a fresh single-mode project', () => {
  const cwd = tmp();
  initState(cwd);
  const r = validate(cwd);
  assert.equal(r.ok, true);
  assert.deepEqual(r.blockers, []);
});

test('validate blocks with no state.json', () => {
  const r = validate(tmp());
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => /setup/.test(b)));
});

test('validate flags an unbound repo and an unknown domain in multi mode', () => {
  const cwd = tmp();
  initState(cwd);
  setMode(cwd, 'multi');
  addRepo(cwd, { name: 'backend', kind: 'api' });
  setMilestoneDomains(cwd, { milestone: 1, domains: ['ghost'] });
  const r = validate(cwd);
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => /backend/.test(b) && /bound/.test(b)));
  assert.ok(r.blockers.some((b) => /ghost/.test(b)));
});

test('validate warns on a non-empty notes.md', () => {
  const cwd = tmp();
  initState(cwd);
  touch(cwd, 'project/notes.md', 'leftover');
  assert.ok(validate(cwd).warnings.some((w) => /notes\.md/.test(w)));
});

test('validate flags a standalone topology with no prototype home once map is done', () => {
  const cwd = tmp();
  initState(cwd);
  setPrototypeTopology(cwd, 'standalone');
  frontloadDone(cwd);
  const r = validate(cwd);
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => /standalone/.test(b) && /prototype home/.test(b)));
});

test('validate flags a feature dependency cycle and an unknown dependency', () => {
  const cwd = tmp();
  initState(cwd);
  addFeature(cwd, { milestone: 1, id: 'a', dependsOn: ['b'] });
  addFeature(cwd, { milestone: 1, id: 'b', dependsOn: ['a'] });
  const r = validate(cwd);
  assert.ok(r.blockers.some((b) => /cycle/.test(b)));

  const cwd2 = tmp();
  initState(cwd2);
  addFeature(cwd2, { milestone: 1, id: 'a', dependsOn: ['ghost'] });
  assert.ok(validate(cwd2).blockers.some((b) => /unknown feature "ghost"/.test(b)));
});

test('audit: clean on a fresh project', () => {
  const cwd = tmp();
  initState(cwd);
  assert.equal(audit(cwd).ok, true);
});

test('audit flags a duplicate story ID and an unresolved story dependency', () => {
  const cwd = tmp();
  initState(cwd);
  touch(cwd, 'project/stories.md', [
    '| ID | Story | Value | Depends on | Size |',
    '|----|-------|-------|------------|------|',
    '| S1 | a | v | | M |',
    '| S1 | b | v | | S |',
    '| S2 | c | v | S9 | L |',
  ].join('\n'));
  const r = audit(cwd);
  assert.equal(r.ok, false);
  assert.ok(r.findings.some((f) => /duplicate story ID "S1"/.test(f)));
  assert.ok(r.findings.some((f) => /unknown story ID "S9"/.test(f)));
});

test('audit flags a feature pointing at an unknown story', () => {
  const cwd = tmp();
  initState(cwd);
  touch(cwd, 'project/stories.md', [
    '| ID | Story | Value | Depends on | Size |',
    '|----|-------|-------|------------|------|',
    '| S1 | a | v | | M |',
  ].join('\n'));
  addFeature(cwd, { milestone: 1, id: 'api', story: 'S404', domain: 'd', repo: 'r' });
  assert.ok(audit(cwd).findings.some((f) => /unknown story "S404"/.test(f)));
});

test('audit warns about a mechanism leak in product-scope docs', () => {
  const cwd = tmp();
  initState(cwd);
  touch(cwd, 'docs/PRODUCT.md', 'The product stores data in PostgreSQL.');
  assert.ok(audit(cwd).warnings.some((w) => /postgres/.test(w)));
});

test('migrate upgrades a v1 state to v2', () => {
  const cwd = tmp();
  initState(cwd);
  const s = loadState(cwd);
  s.version = 1;
  s.frontload = {
    setup: { status: 'done' }, vision: { status: 'done' },
    features: { status: 'done' }, milestones: { status: 'done' }, map: { status: 'done' },
  };
  s.milestones = {
    '1': {
      title: 'M1', track: 'production',
      stages: {
        'surface-overview': { status: 'done' }, 'milestone-ux': { status: 'done' },
        prototype: { status: 'done' }, tracer: { status: 'in-progress' },
        replan: { status: 'blocked' }, gap: { status: 'blocked' }, review: { status: 'blocked' },
      },
      surfaces: { admin: { kind: 'ui', repo: 'ui', design: { status: 'done' } } },
    },
  };
  s.currentSurface = 'admin';
  saveState(cwd, s);

  const r = migrate(cwd);
  assert.equal(r.migrated, true);
  const after = loadState(cwd);
  assert.equal(after.version, 2);
  assert.equal(after.frontload.stories.status, 'done');
  assert.equal(after.frontload.features, undefined);
  assert.ok(after.frontload.foundation);
  assert.equal(after.frontload.foundation.status, 'done'); // map was done
  assert.equal(after.milestones['1'].stages['milestone-brief'].status, 'done');
  assert.equal(after.milestones['1'].stages.design.status, 'done');
  assert.equal(after.milestones['1'].stages.tracer.status, 'in-progress');
  assert.equal(after.milestones['1'].stages.replan, undefined);
  assert.deepEqual(after.milestones['1'].featureGraph, {});
  assert.equal(after.milestones['1'].surfaces.admin.design, undefined);
  assert.equal(after.currentSurface, undefined);
  assert.equal(after.currentFeature, null);
  assert.equal(migrate(cwd).migrated, false); // idempotent
});

test('validate blocks on a v1 state until migrated', () => {
  const cwd = tmp();
  initState(cwd);
  const s = loadState(cwd);
  s.version = 1;
  saveState(cwd, s);
  assert.ok(validate(cwd).blockers.some((b) => /v1/.test(b) && /migrate/.test(b)));
});

test('statusReport lists per-domain milestones in multi mode and omits it in single', () => {
  const cwd = tmp();
  initState(cwd);
  setMode(cwd, 'multi');
  addDomain(cwd, { name: 'registry', description: 'x' });
  setMilestoneDomains(cwd, { milestone: 1, domains: ['registry'] });
  assert.match(statusReport(cwd), /registry: M1/);
  const cwd2 = tmp();
  initState(cwd2);
  assert.doesNotMatch(statusReport(cwd2), /Per-domain milestones/);
});
