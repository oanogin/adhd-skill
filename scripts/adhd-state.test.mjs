// scripts/adhd-state.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  defaultState, loadState, saveState, initState,
  setStageStatus, gate, nextStage, statusReport,
  sessionAdd, sessionReset, FRONTLOAD_STAGES, STAGE_STATUSES,
  confirmPreflight, advanceMilestone,
  setMode, addRepo, removeRepo, listRepos, setSurfaceMeta, SURFACE_KINDS, MODES,
  setMilestoneTrack,
  addDomain, removeDomain, listDomains,
  bindRepo, unbindRepo, migrateRepos,
  setMilestoneDomains, validate,
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

test('gate(surface-overview) needs map.md and docs/GLOSSARY.md', () => {
  const cwd = tmp();
  initState(cwd);
  touch(cwd, 'project/map.md');
  const before = gate(cwd, 'surface-overview');
  assert.equal(before.pass, false);
  assert.ok(before.missing.includes('docs/GLOSSARY.md'));
  touch(cwd, 'docs/GLOSSARY.md');
  assert.equal(gate(cwd, 'surface-overview').pass, true);
});

test('gate(design) needs milestone milestone-ux done', () => {
  const cwd = tmp();
  initState(cwd);
  assert.equal(gate(cwd, 'design', { milestone: 1 }).pass, false);
  setStageStatus(cwd, { stage: 'milestone-ux', status: 'done', milestone: 1 });
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

test('gate(prototype) needs every surface designed', () => {
  const cwd = tmp();
  initState(cwd);
  setStageStatus(cwd, { stage: 'design', status: 'done', milestone: 1, surface: 'login' });
  setStageStatus(cwd, { stage: 'design', status: 'in-progress', milestone: 1, surface: 'home' });
  assert.equal(gate(cwd, 'prototype', { milestone: 1 }).pass, false);
  setStageStatus(cwd, { stage: 'design', status: 'done', milestone: 1, surface: 'home' });
  assert.equal(gate(cwd, 'prototype', { milestone: 1 }).pass, true);
});

test('tracer refuses to run on a prototype-only milestone', () => {
  const cwd = tmp();
  initState(cwd);
  setMilestoneTrack(cwd, { milestone: 1, track: 'prototype' });
  setStageStatus(cwd, { stage: 'prototype', status: 'done', milestone: 1 });
  const t = gate(cwd, 'tracer', { milestone: 1 });
  assert.equal(t.pass, false);
  assert.ok(t.missing.some((x) => /prototype-only/.test(x)));
});

test('gate(tracer) needs the prototype done on a production milestone', () => {
  const cwd = tmp();
  initState(cwd);
  setMilestoneTrack(cwd, { milestone: 1, track: 'production' });
  assert.equal(gate(cwd, 'tracer', { milestone: 1 }).pass, false);
  setStageStatus(cwd, { stage: 'prototype', status: 'done', milestone: 1 });
  assert.equal(gate(cwd, 'tracer', { milestone: 1 }).pass, true);
});

test('gate(plan) needs the surface spec and the milestone gap done', () => {
  const cwd = tmp();
  initState(cwd);
  touch(cwd, 'project/milestones/m1/surfaces/login.md');
  assert.equal(gate(cwd, 'plan', { milestone: 1, surface: 'login' }).pass, false);
  setStageStatus(cwd, { stage: 'gap', status: 'done', milestone: 1 });
  assert.equal(gate(cwd, 'plan', { milestone: 1, surface: 'login' }).pass, true);
});

test('nextStage on a production milestone: design then prototype then tracer', () => {
  const cwd = tmp();
  initState(cwd);
  for (const s of FRONTLOAD_STAGES) setStageStatus(cwd, { stage: s, status: 'done' });
  setMilestoneTrack(cwd, { milestone: 1, track: 'production' });
  for (const s of ['surface-overview', 'milestone-ux']) {
    setStageStatus(cwd, { stage: s, status: 'done', milestone: 1 });
  }
  setStageStatus(cwd, { stage: 'design', status: 'in-progress', milestone: 1, surface: 'login' });
  assert.equal(nextStage(cwd).stage, 'design');
  setStageStatus(cwd, { stage: 'design', status: 'done', milestone: 1, surface: 'login' });
  assert.equal(nextStage(cwd).stage, 'prototype');
  setStageStatus(cwd, { stage: 'prototype', status: 'done', milestone: 1 });
  assert.equal(nextStage(cwd).stage, 'tracer');
});

test('nextStage on a prototype-only milestone skips tracer..build, goes to review', () => {
  const cwd = tmp();
  initState(cwd);
  for (const s of FRONTLOAD_STAGES) setStageStatus(cwd, { stage: s, status: 'done' });
  setMilestoneTrack(cwd, { milestone: 1, track: 'prototype' });
  for (const s of ['surface-overview', 'milestone-ux']) {
    setStageStatus(cwd, { stage: s, status: 'done', milestone: 1 });
  }
  setStageStatus(cwd, { stage: 'design', status: 'done', milestone: 1, surface: 'login' });
  assert.equal(nextStage(cwd).stage, 'prototype');
  setStageStatus(cwd, { stage: 'prototype', status: 'done', milestone: 1 });
  assert.equal(nextStage(cwd).stage, 'review');
});

test('review gate on a prototype-only milestone needs only the prototype done', () => {
  const cwd = tmp();
  initState(cwd);
  setMilestoneTrack(cwd, { milestone: 1, track: 'prototype' });
  setStageStatus(cwd, { stage: 'design', status: 'done', milestone: 1, surface: 'login' });
  assert.equal(gate(cwd, 'review', { milestone: 1 }).pass, false);
  setStageStatus(cwd, { stage: 'prototype', status: 'done', milestone: 1 });
  assert.equal(gate(cwd, 'review', { milestone: 1 }).pass, true);
});

test('setMilestoneTrack rejects an invalid track', () => {
  const cwd = tmp();
  initState(cwd);
  assert.throws(() => setMilestoneTrack(cwd, { milestone: 1, track: 'bogus' }), /Invalid track/);
});

test('ensureMilestone backfills stages and track missing from older state', () => {
  const cwd = tmp();
  initState(cwd);
  const s = loadState(cwd);
  s.milestones['1'] = { title: null, stages: { 'surface-overview': { status: 'done' } }, surfaces: {} };
  saveState(cwd, s);
  setStageStatus(cwd, { stage: 'milestone-ux', status: 'done', milestone: 1 });
  const after = loadState(cwd).milestones['1'];
  assert.ok(after.stages.prototype);
  assert.equal(after.stages.prototype.status, 'blocked');
  assert.equal(after.track, null);
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

test('loadState throws a clear error on corrupt state.json', () => {
  const cwd = tmp();
  fs.mkdirSync(path.join(cwd, 'project'), { recursive: true });
  fs.writeFileSync(path.join(cwd, 'project/state.json'), '{ not json');
  assert.throws(() => loadState(cwd), /corrupt or not valid JSON/);
});

test('sessionAdd throws a clear error when no state.json', () => {
  assert.throws(() => sessionAdd(tmp(), 'vision'), /adhd setup/);
});

test('sessionReset throws a clear error when no state.json', () => {
  assert.throws(() => sessionReset(tmp()), /adhd setup/);
});

test('effortLog records the resolved milestone and surface for surface stages', () => {
  const cwd = tmp();
  initState(cwd);
  setStageStatus(cwd, { stage: 'build', status: 'done', surface: 'home' });
  const log = loadState(cwd).effortLog.at(-1);
  assert.equal(log.milestone, 1);
  assert.equal(log.surface, 'home');
});

test('saveState leaves no .tmp file behind', () => {
  const cwd = tmp();
  initState(cwd);
  assert.equal(fs.existsSync(path.join(cwd, 'project/state.json.tmp')), false);
});

test('STAGE_STATUSES lists the four valid statuses', () => {
  assert.deepEqual(STAGE_STATUSES, ['blocked', 'pending', 'in-progress', 'done']);
});

test('confirmPreflight sets skillsConfirmed true with a timestamp', () => {
  const cwd = tmp();
  initState(cwd);
  confirmPreflight(cwd);
  const s = loadState(cwd);
  assert.equal(s.preflight.skillsConfirmed, true);
  assert.ok(s.preflight.confirmedAt);
});

test('confirmPreflight throws a clear error when no state.json', () => {
  assert.throws(() => confirmPreflight(tmp()), /adhd setup/);
});

test('advanceMilestone bumps currentMilestone, clears surface, resets session', () => {
  const cwd = tmp();
  initState(cwd);
  sessionAdd(cwd, 'vision');
  setStageStatus(cwd, { stage: 'design', status: 'done', surface: 'home' });
  advanceMilestone(cwd);
  const s = loadState(cwd);
  assert.equal(s.currentMilestone, 2);
  assert.equal(s.currentSurface, null);
  assert.deepEqual(s.session.stagesRun, []);
});

test('advanceMilestone throws a clear error when no state.json', () => {
  assert.throws(() => advanceMilestone(tmp()), /adhd setup/);
});

test('setStageStatus updates the currentMilestone and currentSurface pointers', () => {
  const cwd = tmp();
  initState(cwd);
  setStageStatus(cwd, { stage: 'design', status: 'in-progress', milestone: 2, surface: 'login' });
  const s = loadState(cwd);
  assert.equal(s.currentMilestone, 2);
  assert.equal(s.currentSurface, 'login');
});

function gitRepo() {
  const cwd = tmp();
  fs.mkdirSync(path.join(cwd, '.git'));
  return cwd;
}

test('defaultState has mode "single" and empty repos', () => {
  const s = defaultState();
  assert.equal(s.mode, 'single');
  assert.deepEqual(s.repos, {});
});

test('SURFACE_KINDS and MODES list the valid values', () => {
  assert.deepEqual(SURFACE_KINDS, ['ui', 'api', 'lib']);
  assert.deepEqual(MODES, ['single', 'multi']);
});

test('setMode switches mode and rejects an invalid value', () => {
  const cwd = tmp();
  initState(cwd);
  setMode(cwd, 'multi');
  assert.equal(loadState(cwd).mode, 'multi');
  assert.throws(() => setMode(cwd, 'bogus'), /Invalid mode/);
});

test('addRepo registers a logical repo with kind and optional remote', () => {
  const cwd = tmp();
  initState(cwd);
  addRepo(cwd, { name: 'backend', kind: 'api', remote: 'git@github.com:x/backend.git' });
  addRepo(cwd, { name: 'admin-ui', kind: 'ui' });
  const repos = loadState(cwd).repos;
  assert.equal(repos.backend.kind, 'api');
  assert.equal(repos.backend.remote, 'git@github.com:x/backend.git');
  assert.equal(repos['admin-ui'].remote, null);
  assert.equal(repos.backend.path, undefined);
});

test('addRepo rejects a bad kind', () => {
  const cwd = tmp();
  initState(cwd);
  assert.throws(() => addRepo(cwd, { name: 'x', kind: 'bogus' }), /Invalid kind/);
});

test('bindRepo writes a local path; unbindRepo clears it', () => {
  const cwd = tmp();
  initState(cwd);
  addRepo(cwd, { name: 'backend', kind: 'api' });
  const repo = gitRepo();
  bindRepo(cwd, 'backend', repo);
  assert.equal(listRepos(cwd).backend.bound, true);
  assert.equal(listRepos(cwd).backend.path, path.resolve(repo));
  unbindRepo(cwd, 'backend');
  assert.equal(listRepos(cwd).backend.bound, false);
});

test('bindRepo rejects an unregistered repo, a missing path, and a non-git path', () => {
  const cwd = tmp();
  initState(cwd);
  assert.throws(() => bindRepo(cwd, 'ghost', gitRepo()), /No registered repo/);
  addRepo(cwd, { name: 'backend', kind: 'api' });
  assert.throws(() => bindRepo(cwd, 'backend', '/no/such/path'), /does not exist/);
  assert.throws(() => bindRepo(cwd, 'backend', tmp()), /Not a git repository/);
});

test('listRepos reports binding status without exposing paths in committed state', () => {
  const cwd = tmp();
  initState(cwd);
  addRepo(cwd, { name: 'backend', kind: 'api' });
  const before = listRepos(cwd).backend;
  assert.equal(before.bound, false);
  assert.equal(before.path, null);
});

test('local repo bindings are stored outside state.json', () => {
  const cwd = tmp();
  initState(cwd);
  addRepo(cwd, { name: 'backend', kind: 'api' });
  bindRepo(cwd, 'backend', gitRepo());
  assert.ok(fs.existsSync(path.join(cwd, 'project/repos.local.json')));
  assert.equal(loadState(cwd).repos.backend.path, undefined);
});

test('removeRepo deletes the registry entry and its local binding', () => {
  const cwd = tmp();
  initState(cwd);
  addRepo(cwd, { name: 'backend', kind: 'lib' });
  bindRepo(cwd, 'backend', gitRepo());
  removeRepo(cwd, 'backend');
  assert.deepEqual(loadState(cwd).repos, {});
  assert.equal(listRepos(cwd).backend, undefined);
});

test('migrateRepos moves an inline path into the local bindings file', () => {
  const cwd = tmp();
  initState(cwd);
  const repo = gitRepo();
  const s = loadState(cwd);
  s.repos.legacy = { path: repo, kind: 'api' };
  saveState(cwd, s);
  const migrated = migrateRepos(cwd);
  assert.equal(migrated, 1);
  assert.equal(loadState(cwd).repos.legacy.path, undefined);
  assert.equal(listRepos(cwd).legacy.path, path.resolve(repo));
});

test('a new surface has null repo and null kind', () => {
  const cwd = tmp();
  initState(cwd);
  setStageStatus(cwd, { stage: 'design', status: 'in-progress', milestone: 1, surface: 'home' });
  const surf = loadState(cwd).milestones['1'].surfaces.home;
  assert.equal(surf.repo, null);
  assert.equal(surf.kind, null);
});

test('setSurfaceMeta sets repo and kind, and validates kind', () => {
  const cwd = tmp();
  initState(cwd);
  setSurfaceMeta(cwd, { milestone: 1, surface: 'home', repo: 'repo-a', kind: 'ui' });
  const surf = loadState(cwd).milestones['1'].surfaces.home;
  assert.equal(surf.repo, 'repo-a');
  assert.equal(surf.kind, 'ui');
  assert.throws(() => setSurfaceMeta(cwd, { milestone: 1, surface: 'home', kind: 'bogus' }), /Invalid kind/);
});

test('setMode / addRepo throw a clear error when no state.json', () => {
  assert.throws(() => setMode(tmp(), 'multi'), /adhd setup/);
  assert.throws(() => addRepo(tmp(), { name: 'x', kind: 'api' }), /adhd setup/);
});

test('defaultState has an empty domains registry', () => {
  assert.deepEqual(defaultState().domains, {});
});

test('addDomain registers a domain with description and optional home', () => {
  const cwd = tmp();
  initState(cwd);
  addDomain(cwd, { name: 'auth', description: 'sign-in and sessions' });
  addDomain(cwd, { name: 'billing', description: 'invoices', homeRepo: 'backend', homeSubpath: 'services/billing' });
  const d = loadState(cwd).domains;
  assert.equal(d.auth.description, 'sign-in and sessions');
  assert.equal(d.auth.home, undefined);
  assert.deepEqual(d.billing.home, { repo: 'backend', subpath: 'services/billing' });
});

test('removeDomain deletes a domain; listDomains returns the registry', () => {
  const cwd = tmp();
  initState(cwd);
  addDomain(cwd, { name: 'auth', description: 'x' });
  assert.deepEqual(Object.keys(listDomains(cwd)), ['auth']);
  removeDomain(cwd, 'auth');
  assert.deepEqual(listDomains(cwd), {});
});

test('addDomain throws a clear error when no state.json', () => {
  assert.throws(() => addDomain(tmp(), { name: 'auth' }), /adhd setup/);
});

test('a new milestone has an empty domains list', () => {
  const cwd = tmp();
  initState(cwd);
  setStageStatus(cwd, { stage: 'surface-overview', status: 'in-progress', milestone: 1 });
  assert.deepEqual(loadState(cwd).milestones['1'].domains, []);
});

test('setMilestoneDomains records the participating domains', () => {
  const cwd = tmp();
  initState(cwd);
  setMilestoneDomains(cwd, { milestone: 2, domains: ['auth', 'billing'] });
  assert.deepEqual(loadState(cwd).milestones['2'].domains, ['auth', 'billing']);
});

test('ensureMilestone backfills domains on older state', () => {
  const cwd = tmp();
  initState(cwd);
  const s = loadState(cwd);
  s.milestones['1'] = { title: null, track: null, stages: {}, surfaces: {} };
  saveState(cwd, s);
  setMilestoneDomains(cwd, { milestone: 1, domains: ['auth'] });
  assert.deepEqual(loadState(cwd).milestones['1'].domains, ['auth']);
});

test('a new surface has empty domains and null subpath', () => {
  const cwd = tmp();
  initState(cwd);
  setStageStatus(cwd, { stage: 'design', status: 'in-progress', milestone: 1, surface: 'home' });
  const surf = loadState(cwd).milestones['1'].surfaces.home;
  assert.deepEqual(surf.domains, []);
  assert.equal(surf.subpath, null);
});

test('setSurfaceMeta sets domains and subpath alongside repo and kind', () => {
  const cwd = tmp();
  initState(cwd);
  setSurfaceMeta(cwd, {
    milestone: 1, surface: 'admin',
    domains: ['auth', 'billing'], repo: 'admin-ui', subpath: 'pages/admin', kind: 'ui',
  });
  const surf = loadState(cwd).milestones['1'].surfaces.admin;
  assert.deepEqual(surf.domains, ['auth', 'billing']);
  assert.equal(surf.subpath, 'pages/admin');
  assert.equal(surf.repo, 'admin-ui');
  assert.equal(surf.kind, 'ui');
});

test('validate passes on a fresh single-mode project', () => {
  const cwd = tmp();
  initState(cwd);
  const r = validate(cwd);
  assert.equal(r.ok, true);
  assert.deepEqual(r.blockers, []);
});

test('validate blocks when there is no state.json', () => {
  const r = validate(tmp());
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => /setup/.test(b)));
});

test('validate flags an unbound repo in multi mode', () => {
  const cwd = tmp();
  initState(cwd);
  setMode(cwd, 'multi');
  addRepo(cwd, { name: 'backend', kind: 'api' });
  const r = validate(cwd);
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => /backend/.test(b) && /bound/.test(b)));
});

test('validate flags a milestone referencing an unknown domain', () => {
  const cwd = tmp();
  initState(cwd);
  setMode(cwd, 'multi');
  setMilestoneDomains(cwd, { milestone: 1, domains: ['ghost'] });
  const r = validate(cwd);
  assert.ok(r.blockers.some((b) => /ghost/.test(b)));
});

test('validate warns when notes.md is not empty', () => {
  const cwd = tmp();
  initState(cwd);
  touch(cwd, 'project/notes.md');
  const r = validate(cwd);
  assert.ok(r.warnings.some((w) => /notes\.md/.test(w)));
});
