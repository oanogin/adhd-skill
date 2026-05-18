// scripts/adhd-state.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const STATE_VERSION = 1;
export const STATE_FILE = 'project/state.json';
export const LOCAL_REPOS_FILE = 'project/repos.local.json';

export const FRONTLOAD_STAGES = ['setup', 'vision', 'features', 'milestones', 'map'];
export const MILESTONE_STAGES = ['surface-overview', 'milestone-ux', 'prototype', 'tracer', 'replan', 'gap', 'review'];
export const SURFACE_STAGES = ['design', 'plan', 'build'];

export const STAGE_EFFORT = {
  setup: 'low', vision: 'high', features: 'medium', milestones: 'high', map: 'high',
  'surface-overview': 'medium', 'milestone-ux': 'high', prototype: 'medium', tracer: 'high',
  replan: 'medium', gap: 'medium', review: 'high', design: 'high', plan: 'medium', build: 'medium',
};

export const EFFORT_WEIGHT = { low: 1, medium: 2, high: 3, 'extra-high': 4 };

export const STAGE_STATUSES = ['blocked', 'pending', 'in-progress', 'done'];

export const SURFACE_KINDS = ['ui', 'api', 'lib'];
export const MODES = ['single', 'multi'];
export const MILESTONE_TRACKS = ['prototype', 'production'];

// Gate predecessors. Tokens: {docHome} {N} {surface}.
const STAGE_GATES = {
  setup:              { files: [],                                                  stages: [] },
  vision:             { files: [],                                                  stages: [['frontload', 'setup', 'done']] },
  features:           { files: ['{docHome}/PRODUCT.md'],                             stages: [] },
  milestones:         { files: ['project/features.md'],                             stages: [] },
  map:                { files: ['project/milestones.md'],                           stages: [] },
  'surface-overview': { files: ['project/map.md', '{docHome}/GLOSSARY.md'],          stages: [] },
  'milestone-ux':     { files: ['project/milestones/m{N}/overview.md'],             stages: [] },
  design:             { files: [],                                                  stages: [['milestone', 'milestone-ux', 'done']] },
  prototype:          { files: [],                                                  stages: [['allSurfacesDesigned']] },
  tracer:             { files: [],                                                  stages: [['milestone', 'prototype', 'done'], ['productionMilestone']] },
  replan:             { files: ['project/milestones/m{N}/tracer.md'],               stages: [['productionMilestone']] },
  gap:                { files: [],                                                  stages: [['milestone', 'replan', 'done'], ['productionMilestone']] },
  plan:               { files: ['project/milestones/m{N}/surfaces/{surface}.md'],   stages: [['milestone', 'gap', 'done']] },
  build:              { files: ['project/milestones/m{N}/plans/{surface}.md'],      stages: [] },
  review:             { files: [],                                                  stages: [['reviewReady']] },
};

export function statePath(cwd = process.cwd()) {
  return path.join(cwd, STATE_FILE);
}

export function defaultState() {
  const now = new Date().toISOString();
  const stageMap = (stages) =>
    Object.fromEntries(stages.map((s) => [s, { status: 'blocked', effort: STAGE_EFFORT[s] }]));
  return {
    version: STATE_VERSION,
    docHome: 'docs',
    mode: 'single',
    repos: {},
    domains: {},
    createdAt: now,
    updatedAt: now,
    currentMilestone: 1,
    currentSurface: null,
    preflight: { skillsConfirmed: false, confirmedAt: null },
    frontload: stageMap(FRONTLOAD_STAGES),
    milestones: {},
    session: { startedAt: now, stagesRun: [] },
    effortLog: [],
  };
}

export function loadState(cwd = process.cwd()) {
  const p = statePath(cwd);
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`project/state.json is corrupt or not valid JSON: ${e.message}`);
  }
}

export function saveState(cwd, state) {
  state.updatedAt = new Date().toISOString();
  const p = statePath(cwd);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmpPath = p + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2) + '\n');
  fs.renameSync(tmpPath, p);
  return p;
}

export function initState(cwd = process.cwd(), { docHome = 'docs' } = {}) {
  const existing = loadState(cwd);
  if (existing) return existing; // idempotent
  const state = defaultState();
  state.docHome = docHome;
  state.frontload.setup.status = 'pending'; // setup has no predecessor
  saveState(cwd, state);
  return state;
}

function ensureMilestone(state, n) {
  const key = String(n);
  if (!state.milestones[key]) {
    state.milestones[key] = {
      title: null,
      track: null,
      domains: [],
      stages: Object.fromEntries(
        MILESTONE_STAGES.map((s) => [s, { status: 'blocked', effort: STAGE_EFFORT[s] }]),
      ),
      surfaces: {},
    };
  }
  const m = state.milestones[key];
  if (m.track === undefined) m.track = null;
  if (m.domains === undefined) m.domains = [];
  // Backfill stages added after this milestone's state was first written.
  for (const s of MILESTONE_STAGES) {
    if (!m.stages[s]) m.stages[s] = { status: 'blocked', effort: STAGE_EFFORT[s] };
  }
  return m;
}

function ensureSurface(state, n, name) {
  const m = ensureMilestone(state, n);
  if (!m.surfaces[name]) {
    const surf = Object.fromEntries(
      SURFACE_STAGES.map((s) => [s, { status: 'blocked', effort: STAGE_EFFORT[s] }]),
    );
    surf.repo = null;
    surf.subpath = null;
    surf.kind = null;
    surf.domains = [];
    m.surfaces[name] = surf;
  }
  const surf = m.surfaces[name];
  if (surf.repo === undefined) surf.repo = null;
  if (surf.subpath === undefined) surf.subpath = null;
  if (surf.kind === undefined) surf.kind = null;
  if (surf.domains === undefined) surf.domains = [];
  return surf;
}

export function setStageStatus(cwd, { stage, status, milestone, surface }) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  const m = milestone ?? state.currentMilestone;
  let entry;
  if (FRONTLOAD_STAGES.includes(stage)) {
    entry = state.frontload[stage];
  } else if (SURFACE_STAGES.includes(stage)) {
    entry = ensureSurface(state, m, surface ?? state.currentSurface)[stage];
  } else if (MILESTONE_STAGES.includes(stage)) {
    entry = ensureMilestone(state, m).stages[stage];
  } else {
    throw new Error(`Unknown stage: ${stage}`);
  }
  entry.status = status;
  if (status === 'done') {
    entry.completedAt = new Date().toISOString();
    state.effortLog.push({
      stage,
      milestone: FRONTLOAD_STAGES.includes(stage) ? null : m,
      surface: SURFACE_STAGES.includes(stage) ? (surface ?? state.currentSurface) : null,
      at: entry.completedAt,
    });
  }
  if (milestone != null) state.currentMilestone = m;
  if (surface != null) state.currentSurface = surface;
  saveState(cwd, state);
  return state;
}

export function gate(cwd, stage, { milestone, surface } = {}) {
  const def = STAGE_GATES[stage];
  if (!def) return { pass: false, missing: [`unknown stage: ${stage}`] };
  const state = loadState(cwd);
  const docHome = state?.docHome ?? 'docs';
  const m = milestone ?? state?.currentMilestone ?? 1;
  const s = surface ?? state?.currentSurface ?? '';
  const missing = [];
  for (const tmpl of def.files) {
    const rel = tmpl.replace('{docHome}', docHome).replace('{N}', m).replace('{surface}', s);
    if (!fs.existsSync(path.join(cwd, rel))) missing.push(rel);
  }
  for (const cond of def.stages) {
    if (cond[0] === 'frontload') {
      if (state?.frontload?.[cond[1]]?.status !== cond[2]) missing.push(`front-load stage "${cond[1]}" not ${cond[2]}`);
    } else if (cond[0] === 'milestone') {
      if (state?.milestones?.[String(m)]?.stages?.[cond[1]]?.status !== cond[2]) {
        missing.push(`milestone ${m} stage "${cond[1]}" not ${cond[2]}`);
      }
    } else if (cond[0] === 'allSurfacesDesigned') {
      const surfaces = state?.milestones?.[String(m)]?.surfaces ?? {};
      const names = Object.keys(surfaces);
      if (names.length === 0) missing.push(`milestone ${m} has no surfaces defined`);
      for (const name of names) {
        if (surfaces[name].design?.status !== 'done') missing.push(`surface "${name}" not designed`);
      }
    } else if (cond[0] === 'productionMilestone') {
      if (state?.milestones?.[String(m)]?.track === 'prototype') {
        missing.push(`milestone ${m} is prototype-only — this stage does not apply`);
      }
    } else if (cond[0] === 'reviewReady') {
      const msObj = state?.milestones?.[String(m)];
      if (msObj?.track === 'prototype') {
        if (msObj?.stages?.prototype?.status !== 'done') missing.push(`milestone ${m} prototype not done`);
      } else {
        const surfaces = msObj?.surfaces ?? {};
        const names = Object.keys(surfaces);
        if (names.length === 0) missing.push(`milestone ${m} has no surfaces defined`);
        for (const name of names) {
          if (surfaces[name].build?.status !== 'done') missing.push(`surface "${name}" not built`);
        }
      }
    }
  }
  return { pass: missing.length === 0, missing };
}

export function nextStage(cwd = process.cwd()) {
  const state = loadState(cwd);
  if (!state) return { stage: 'setup', milestone: null, surface: null };
  for (const s of FRONTLOAD_STAGES) {
    if (state.frontload[s].status !== 'done') return { stage: s, milestone: null, surface: null };
  }
  const m = state.currentMilestone;
  const ms = state.milestones[String(m)];
  if (!ms) return { stage: 'surface-overview', milestone: m, surface: null };
  for (const s of ['surface-overview', 'milestone-ux']) {
    if (ms.stages[s]?.status !== 'done') return { stage: s, milestone: m, surface: null };
  }
  for (const [name, surf] of Object.entries(ms.surfaces)) {
    if (surf.design.status !== 'done') return { stage: 'design', milestone: m, surface: name };
  }
  if (ms.stages.prototype?.status !== 'done') return { stage: 'prototype', milestone: m, surface: null };
  if (ms.track !== 'prototype') {
    for (const s of ['tracer', 'replan', 'gap']) {
      if (ms.stages[s]?.status !== 'done') return { stage: s, milestone: m, surface: null };
    }
    for (const [name, surf] of Object.entries(ms.surfaces)) {
      for (const s of ['plan', 'build']) {
        if (surf[s].status !== 'done') return { stage: s, milestone: m, surface: name };
      }
    }
  }
  if (ms.stages.review?.status !== 'done') return { stage: 'review', milestone: m, surface: null };
  return { stage: 'next-milestone', milestone: m + 1, surface: null };
}

const ICON = { done: '✓', 'in-progress': '◐', pending: '○', blocked: '·' };

export function statusReport(cwd = process.cwd()) {
  const state = loadState(cwd);
  if (!state) return 'No project/state.json. Run `{{command_prefix}}adhd setup` to begin.';
  const lines = [];
  lines.push('Front-load:  ' + FRONTLOAD_STAGES.map((s) => `${s} ${ICON[state.frontload[s].status]}`).join('  '));
  for (const [key, ms] of Object.entries(state.milestones)) {
    lines.push(`Milestone ${key}${ms.title ? ` — ${ms.title}` : ''}:`);
    lines.push('  ' + MILESTONE_STAGES.map((s) => `${s} ${ICON[ms.stages[s]?.status]}`).join('  '));
    for (const [name, surf] of Object.entries(ms.surfaces)) {
      lines.push(`  surface ${name}:  ` + SURFACE_STAGES.map((s) => `${s} ${ICON[surf[s].status]}`).join('  '));
    }
  }
  if (state.mode === 'multi') {
    const domains = state.domains ?? {};
    const names = Object.keys(domains);
    if (names.length > 0) {
      lines.push('');
      lines.push('Per-domain milestones:');
      for (const d of names) {
        const ms = Object.entries(state.milestones ?? {})
          .filter(([, m]) => (m.domains ?? []).includes(d))
          .map(([k]) => `M${k}`);
        lines.push(`  ${d}: ${ms.length ? ms.join(', ') : '(none)'}`);
      }
    }
  }
  const next = nextStage(cwd);
  lines.push('');
  lines.push(`Next runnable stage: ${next.stage}` +
    (next.milestone ? ` (milestone ${next.milestone}` + (next.surface ? `, surface ${next.surface})` : ')') : ''));
  return lines.join('\n');
}

export function validate(cwd = process.cwd()) {
  const blockers = [];
  const warnings = [];
  const state = loadState(cwd);
  if (!state) {
    return { ok: false, blockers: ['No project/state.json — run `adhd setup` first.'], warnings: [] };
  }
  if (!Number.isInteger(state.currentMilestone) || state.currentMilestone < 1) {
    blockers.push(`currentMilestone is invalid: ${JSON.stringify(state.currentMilestone)}`);
  }
  let seenIncomplete = false;
  for (const s of FRONTLOAD_STAGES) {
    const st = state.frontload?.[s]?.status;
    if (st !== 'done') seenIncomplete = true;
    else if (seenIncomplete) {
      blockers.push(`front-load stage "${s}" is done but an earlier stage is not — state is incoherent`);
    }
  }
  if (state.mode === 'multi') {
    const local = loadLocalRepos(cwd);
    const domains = state.domains ?? {};
    for (const [name, entry] of Object.entries(state.repos ?? {})) {
      const p = local[name] ?? entry.path ?? null;
      if (!p) {
        blockers.push(`repo "${name}" is registered but not bound to a local path — run \`workspace\` to bind it`);
      } else if (!fs.existsSync(p)) {
        blockers.push(`repo "${name}" local path does not exist: ${p}`);
      } else if (!isGitRepo(p)) {
        blockers.push(`repo "${name}" local path is not a git repository: ${p}`);
      }
    }
    if (state.frontload?.map?.status === 'done' && Object.keys(domains).length === 0) {
      blockers.push('map is done but no domains are defined — run `adhd map` to define them');
    }
    for (const [key, ms] of Object.entries(state.milestones ?? {})) {
      for (const d of ms.domains ?? []) {
        if (!domains[d]) blockers.push(`milestone ${key} references unknown domain "${d}"`);
      }
      for (const [sname, surf] of Object.entries(ms.surfaces ?? {})) {
        for (const d of surf.domains ?? []) {
          if (!domains[d]) blockers.push(`surface "${sname}" (milestone ${key}) references unknown domain "${d}"`);
        }
        if (surf.repo && !(state.repos ?? {})[surf.repo]) {
          blockers.push(`surface "${sname}" (milestone ${key}) references unknown repo "${surf.repo}"`);
        }
      }
    }
  }
  const notesPath = path.join(cwd, 'project/notes.md');
  if (fs.existsSync(notesPath) && fs.readFileSync(notesPath, 'utf-8').trim() !== '') {
    warnings.push('project/notes.md is not empty — drain durable entries to their canonical home');
  }
  return { ok: blockers.length === 0, blockers, warnings };
}

export function sessionAdd(cwd, stage) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  state.session.stagesRun.push(stage);
  saveState(cwd, state);
  return state;
}

export function sessionReset(cwd) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  state.session = { startedAt: new Date().toISOString(), stagesRun: [] };
  saveState(cwd, state);
  return state;
}

export function confirmPreflight(cwd = process.cwd()) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  state.preflight = { skillsConfirmed: true, confirmedAt: new Date().toISOString() };
  saveState(cwd, state);
  return state;
}

export function advanceMilestone(cwd = process.cwd()) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  state.currentMilestone = state.currentMilestone + 1;
  state.currentSurface = null;
  state.session = { startedAt: new Date().toISOString(), stagesRun: [] };
  saveState(cwd, state);
  return state;
}

export function setMode(cwd = process.cwd(), mode) {
  if (!MODES.includes(mode)) throw new Error(`Invalid mode "${mode}". Valid: ${MODES.join(', ')}`);
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  state.mode = mode;
  saveState(cwd, state);
  return state;
}

export function addDomain(cwd = process.cwd(), { name, description, homeRepo, homeSubpath }) {
  if (!name) throw new Error('Domain name is required.');
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  if (!state.domains) state.domains = {};
  const domain = { description: description ?? null };
  if (homeRepo) domain.home = { repo: homeRepo, subpath: homeSubpath ?? null };
  state.domains[name] = domain;
  saveState(cwd, state);
  return state;
}

export function removeDomain(cwd = process.cwd(), name) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  if (!state.domains) state.domains = {};
  delete state.domains[name];
  saveState(cwd, state);
  return state;
}

export function listDomains(cwd = process.cwd()) {
  return loadState(cwd)?.domains ?? {};
}

function isGitRepo(p) {
  return fs.existsSync(path.join(p, '.git'));
}

function localReposPath(cwd) {
  return path.join(cwd, LOCAL_REPOS_FILE);
}

function loadLocalRepos(cwd) {
  const p = localReposPath(cwd);
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (e) {
    throw new Error(`${LOCAL_REPOS_FILE} is corrupt or not valid JSON: ${e.message}`);
  }
}

function saveLocalRepos(cwd, obj) {
  const p = localReposPath(cwd);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
}

export function addRepo(cwd = process.cwd(), { name, kind, remote }) {
  if (!name) throw new Error('Repo name is required.');
  if (!SURFACE_KINDS.includes(kind)) throw new Error(`Invalid kind "${kind}". Valid: ${SURFACE_KINDS.join(', ')}`);
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  state.repos[name] = { kind, remote: remote ?? null };
  saveState(cwd, state);
  return state;
}

export function bindRepo(cwd = process.cwd(), name, repoPath) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  if (!state.repos[name]) throw new Error(`No registered repo "${name}". Register it with workspace-add first.`);
  if (!fs.existsSync(repoPath)) throw new Error(`Path does not exist: ${repoPath}`);
  if (!isGitRepo(repoPath)) throw new Error(`Not a git repository: ${repoPath}`);
  const local = loadLocalRepos(cwd);
  local[name] = path.resolve(repoPath);
  saveLocalRepos(cwd, local);
  return local;
}

export function unbindRepo(cwd = process.cwd(), name) {
  const local = loadLocalRepos(cwd);
  delete local[name];
  saveLocalRepos(cwd, local);
  return local;
}

export function removeRepo(cwd = process.cwd(), name) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  delete state.repos[name];
  saveState(cwd, state);
  const local = loadLocalRepos(cwd);
  if (local[name] !== undefined) {
    delete local[name];
    saveLocalRepos(cwd, local);
  }
  return state;
}

export function listRepos(cwd = process.cwd()) {
  const state = loadState(cwd);
  const repos = state?.repos ?? {};
  const local = loadLocalRepos(cwd);
  const out = {};
  for (const [name, entry] of Object.entries(repos)) {
    out[name] = {
      kind: entry.kind,
      remote: entry.remote ?? null,
      path: local[name] ?? null,
      bound: Boolean(local[name]),
    };
  }
  return out;
}

export function migrateRepos(cwd = process.cwd()) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  const local = loadLocalRepos(cwd);
  let migrated = 0;
  for (const [name, repo] of Object.entries(state.repos)) {
    if (repo.path) {
      local[name] = repo.path;
      delete repo.path;
      if (repo.remote === undefined) repo.remote = null;
      migrated++;
    }
  }
  saveLocalRepos(cwd, local);
  saveState(cwd, state);
  return migrated;
}

export function setSurfaceMeta(cwd = process.cwd(), { milestone, surface, repo, subpath, kind, domains }) {
  if (kind !== undefined && !SURFACE_KINDS.includes(kind)) {
    throw new Error(`Invalid kind "${kind}". Valid: ${SURFACE_KINDS.join(', ')}`);
  }
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  const m = milestone ?? state.currentMilestone;
  const surf = ensureSurface(state, m, surface ?? state.currentSurface);
  if (repo !== undefined) surf.repo = repo;
  if (subpath !== undefined) surf.subpath = subpath;
  if (kind !== undefined) surf.kind = kind;
  if (domains !== undefined) surf.domains = domains;
  state.currentMilestone = m;
  if (surface != null) state.currentSurface = surface;
  saveState(cwd, state);
  return state;
}

export function setMilestoneTrack(cwd = process.cwd(), { milestone, track }) {
  if (!MILESTONE_TRACKS.includes(track)) {
    throw new Error(`Invalid track "${track}". Valid: ${MILESTONE_TRACKS.join(', ')}`);
  }
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  const m = milestone ?? state.currentMilestone;
  ensureMilestone(state, m).track = track;
  state.currentMilestone = m;
  saveState(cwd, state);
  return state;
}

export function setMilestoneDomains(cwd = process.cwd(), { milestone, domains }) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  const m = milestone ?? state.currentMilestone;
  ensureMilestone(state, m).domains = domains;
  state.currentMilestone = m;
  saveState(cwd, state);
  return state;
}

// ---- CLI ----
function parseFlags(args) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--milestone') flags.milestone = Number(args[++i]);
    else if (args[i] === '--surface') flags.surface = args[++i];
    else if (args[i] === '--doc-home') flags.docHome = args[++i];
    else if (args[i] === '--repo') flags.repo = args[++i];
    else if (args[i] === '--kind') flags.kind = args[++i];
    else if (args[i] === '--remote') flags.remote = args[++i];
    else if (args[i] === '--domain') flags.domain = args[++i];
    else if (args[i] === '--subpath') flags.subpath = args[++i];
    else if (args[i] === '--description') flags.description = args[++i];
    else if (args[i] === '--home-repo') flags.homeRepo = args[++i];
    else if (args[i] === '--home-subpath') flags.homeSubpath = args[++i];
    else rest.push(args[i]);
  }
  return { flags, rest };
}

function main(argv) {
  const [cmd, ...args] = argv;
  const { flags, rest } = parseFlags(args);
  const cwd = process.cwd();
  switch (cmd) {
    case 'init':
      initState(cwd, { docHome: flags.docHome ?? 'docs' });
      console.log('Initialized project/state.json');
      break;
    case 'read':
      console.log(JSON.stringify(loadState(cwd), null, 2));
      break;
    case 'status':
      console.log(statusReport(cwd));
      break;
    case 'next':
      console.log(JSON.stringify(nextStage(cwd)));
      break;
    case 'set': {
      const [stage, status] = rest;
      if (!stage || !status) {
        console.error('Usage: adhd-state.mjs set <stage> <status> [--milestone N] [--surface name]');
        process.exitCode = 1;
        break;
      }
      if (!STAGE_STATUSES.includes(status)) {
        console.error(`Invalid status "${status}". Valid: ${STAGE_STATUSES.join(', ')}`);
        process.exitCode = 1;
        break;
      }
      setStageStatus(cwd, { stage, status, milestone: flags.milestone, surface: flags.surface });
      console.log(`set ${stage} = ${status}`);
      break;
    }
    case 'gate': {
      const [stage] = rest;
      const result = gate(cwd, stage, flags);
      console.log(JSON.stringify(result, null, 2));
      if (!result.pass) process.exitCode = 1;
      break;
    }
    case 'session-add':
      sessionAdd(cwd, rest[0]);
      console.log(`session-add ${rest[0]}`);
      break;
    case 'session-reset':
      sessionReset(cwd);
      console.log('session reset');
      break;
    case 'preflight-confirm':
      confirmPreflight(cwd);
      console.log('preflight confirmed: required skills recorded');
      break;
    case 'advance-milestone': {
      const s = advanceMilestone(cwd);
      console.log(`advanced to milestone ${s.currentMilestone}`);
      break;
    }
    case 'workspace-mode': {
      const [mode] = rest;
      setMode(cwd, mode);
      console.log(`mode = ${mode}`);
      break;
    }
    case 'workspace-add': {
      const [name, kind] = rest;
      if (!name || !kind) {
        console.error('Usage: adhd-state.mjs workspace-add <name> <ui|api|lib> [--remote <url>]');
        process.exitCode = 1;
        break;
      }
      addRepo(cwd, { name, kind, remote: flags.remote });
      console.log(`registered repo "${name}"`);
      break;
    }
    case 'repo-bind': {
      const [name, repoPath] = rest;
      if (!name || !repoPath) {
        console.error('Usage: adhd-state.mjs repo-bind <name> <local-path>');
        process.exitCode = 1;
        break;
      }
      bindRepo(cwd, name, repoPath);
      console.log(`bound repo "${name}"`);
      break;
    }
    case 'repo-unbind':
      unbindRepo(cwd, rest[0]);
      console.log(`unbound repo "${rest[0]}"`);
      break;
    case 'migrate-repos': {
      const n = migrateRepos(cwd);
      console.log(`migrated ${n} repo path(s) into ${LOCAL_REPOS_FILE}`);
      break;
    }
    case 'domain-add': {
      const [name] = rest;
      if (!name) {
        console.error('Usage: adhd-state.mjs domain-add <name> --description <text> [--home-repo <r>] [--home-subpath <p>]');
        process.exitCode = 1;
        break;
      }
      addDomain(cwd, { name, description: flags.description, homeRepo: flags.homeRepo, homeSubpath: flags.homeSubpath });
      console.log(`registered domain "${name}"`);
      break;
    }
    case 'domain-remove':
      removeDomain(cwd, rest[0]);
      console.log(`removed domain "${rest[0]}"`);
      break;
    case 'domain-list':
      console.log(JSON.stringify(listDomains(cwd), null, 2));
      break;
    case 'milestone-domains': {
      const [csv] = rest;
      if (!csv) {
        console.error('Usage: adhd-state.mjs milestone-domains <d1,d2,...> [--milestone N]');
        process.exitCode = 1;
        break;
      }
      const s = setMilestoneDomains(cwd, { milestone: flags.milestone, domains: csv.split(',') });
      console.log(`milestone ${s.currentMilestone} domains = ${csv}`);
      break;
    }
    case 'validate': {
      const r = validate(cwd);
      for (const b of r.blockers) console.log(`BLOCKER: ${b}`);
      for (const w of r.warnings) console.log(`warning: ${w}`);
      console.log(r.ok ? 'validate: ok' : 'validate: blocked');
      if (!r.ok) process.exitCode = 1;
      break;
    }
    case 'workspace-remove':
      removeRepo(cwd, rest[0]);
      console.log(`removed repo "${rest[0]}"`);
      break;
    case 'workspace-list':
      console.log(JSON.stringify(listRepos(cwd), null, 2));
      break;
    case 'milestone-track': {
      const [track] = rest;
      if (!track) {
        console.error('Usage: adhd-state.mjs milestone-track <prototype|production> [--milestone N]');
        process.exitCode = 1;
        break;
      }
      const s = setMilestoneTrack(cwd, { milestone: flags.milestone, track });
      console.log(`milestone ${s.currentMilestone} track = ${track}`);
      break;
    }
    case 'surface-meta': {
      const [surface] = rest;
      if (!surface) {
        console.error('Usage: adhd-state.mjs surface-meta <surface> [--milestone N] [--domain d1,d2] [--repo name] [--subpath path] [--kind ui|api|lib]');
        process.exitCode = 1;
        break;
      }
      const noWrite = flags.repo === undefined && flags.kind === undefined
        && flags.domain === undefined && flags.subpath === undefined;
      if (noWrite) {
        const state = loadState(cwd);
        const m = flags.milestone ?? state?.currentMilestone ?? 1;
        const surf = state?.milestones?.[String(m)]?.surfaces?.[surface];
        console.log(JSON.stringify({
          domains: surf?.domains ?? [],
          repo: surf?.repo ?? null,
          subpath: surf?.subpath ?? null,
          kind: surf?.kind ?? null,
        }, null, 2));
        break;
      }
      setSurfaceMeta(cwd, {
        milestone: flags.milestone, surface,
        repo: flags.repo, subpath: flags.subpath, kind: flags.kind,
        domains: flags.domain === undefined ? undefined : flags.domain.split(','),
      });
      console.log(`surface "${surface}" updated`);
      break;
    }
    default:
      console.error('Usage: adhd-state.mjs <init|read|status|next|set|gate|validate|session-add|session-reset|preflight-confirm|advance-milestone|workspace-mode|workspace-add|workspace-remove|workspace-list|repo-bind|repo-unbind|migrate-repos|domain-add|domain-remove|domain-list|milestone-track|milestone-domains|surface-meta>');
      process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main(process.argv.slice(2));
}
