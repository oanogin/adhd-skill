// scripts/adhd-state.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const STATE_VERSION = 1;
export const STATE_FILE = 'project/state.json';

export const FRONTLOAD_STAGES = ['setup', 'vision', 'features', 'milestones', 'map'];
export const MILESTONE_STAGES = ['surface-overview', 'milestone-ux', 'tracer', 'replan', 'review'];
export const SURFACE_STAGES = ['design', 'plan', 'build'];

export const STAGE_EFFORT = {
  setup: 'low', vision: 'high', features: 'medium', milestones: 'high', map: 'high',
  'surface-overview': 'medium', 'milestone-ux': 'high', tracer: 'high', replan: 'medium',
  review: 'high', design: 'high', plan: 'medium', build: 'medium',
};

export const EFFORT_WEIGHT = { low: 1, medium: 2, high: 3, 'extra-high': 4 };

export const STAGE_STATUSES = ['blocked', 'pending', 'in-progress', 'done'];

export const SURFACE_KINDS = ['ui', 'api', 'lib'];
export const MODES = ['single', 'multi'];

// Gate predecessors. Tokens: {docHome} {N} {surface}.
const STAGE_GATES = {
  setup:              { files: [],                                                  stages: [] },
  vision:             { files: [],                                                  stages: [['frontload', 'setup', 'done']] },
  features:           { files: ['{docHome}/PRODUCT.md'],                             stages: [] },
  milestones:         { files: ['project/features.md'],                             stages: [] },
  map:                { files: ['project/milestones.md'],                           stages: [] },
  'surface-overview': { files: ['project/map.md', '{docHome}/DOMAIN.md'],            stages: [] },
  'milestone-ux':     { files: ['project/milestones/m{N}/overview.md'],             stages: [] },
  tracer:             { files: ['project/milestones/m{N}/ux.md'],                   stages: [] },
  replan:             { files: ['project/milestones/m{N}/tracer.md'],               stages: [] },
  design:             { files: [],                                                  stages: [['milestone', 'replan', 'done']] },
  plan:               { files: ['project/milestones/m{N}/surfaces/{surface}.md'],   stages: [] },
  build:              { files: ['project/milestones/m{N}/plans/{surface}.md'],      stages: [] },
  review:             { files: [],                                                  stages: [['allSurfacesBuilt']] },
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
      stages: Object.fromEntries(
        MILESTONE_STAGES.map((s) => [s, { status: 'blocked', effort: STAGE_EFFORT[s] }]),
      ),
      surfaces: {},
    };
  }
  return state.milestones[key];
}

function ensureSurface(state, n, name) {
  const m = ensureMilestone(state, n);
  if (!m.surfaces[name]) {
    const surf = Object.fromEntries(
      SURFACE_STAGES.map((s) => [s, { status: 'blocked', effort: STAGE_EFFORT[s] }]),
    );
    surf.repo = null;
    surf.kind = null;
    m.surfaces[name] = surf;
  }
  const surf = m.surfaces[name];
  if (surf.repo === undefined) surf.repo = null;
  if (surf.kind === undefined) surf.kind = null;
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
    } else if (cond[0] === 'allSurfacesBuilt') {
      const surfaces = state?.milestones?.[String(m)]?.surfaces ?? {};
      const names = Object.keys(surfaces);
      if (names.length === 0) missing.push(`milestone ${m} has no surfaces defined`);
      for (const name of names) {
        if (surfaces[name].build?.status !== 'done') missing.push(`surface "${name}" not built`);
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
  for (const s of ['surface-overview', 'milestone-ux', 'tracer', 'replan']) {
    if (ms.stages[s].status !== 'done') return { stage: s, milestone: m, surface: null };
  }
  for (const [name, surf] of Object.entries(ms.surfaces)) {
    for (const s of SURFACE_STAGES) {
      if (surf[s].status !== 'done') return { stage: s, milestone: m, surface: name };
    }
  }
  if (ms.stages.review.status !== 'done') return { stage: 'review', milestone: m, surface: null };
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
    lines.push('  ' + MILESTONE_STAGES.map((s) => `${s} ${ICON[ms.stages[s].status]}`).join('  '));
    for (const [name, surf] of Object.entries(ms.surfaces)) {
      lines.push(`  surface ${name}:  ` + SURFACE_STAGES.map((s) => `${s} ${ICON[surf[s].status]}`).join('  '));
    }
  }
  const next = nextStage(cwd);
  lines.push('');
  lines.push(`Next runnable stage: ${next.stage}` +
    (next.milestone ? ` (milestone ${next.milestone}` + (next.surface ? `, surface ${next.surface})` : ')') : ''));
  return lines.join('\n');
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

function isGitRepo(p) {
  return fs.existsSync(path.join(p, '.git'));
}

export function addRepo(cwd = process.cwd(), { name, repoPath, kind }) {
  if (!name) throw new Error('Repo name is required.');
  if (!SURFACE_KINDS.includes(kind)) throw new Error(`Invalid kind "${kind}". Valid: ${SURFACE_KINDS.join(', ')}`);
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  if (!fs.existsSync(repoPath)) throw new Error(`Path does not exist: ${repoPath}`);
  if (!isGitRepo(repoPath)) throw new Error(`Not a git repository: ${repoPath}`);
  state.repos[name] = { path: path.resolve(repoPath), kind };
  saveState(cwd, state);
  return state;
}

export function removeRepo(cwd = process.cwd(), name) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  delete state.repos[name];
  saveState(cwd, state);
  return state;
}

export function listRepos(cwd = process.cwd()) {
  const state = loadState(cwd);
  return state?.repos ?? {};
}

export function setSurfaceMeta(cwd = process.cwd(), { milestone, surface, repo, kind }) {
  if (kind !== undefined && !SURFACE_KINDS.includes(kind)) {
    throw new Error(`Invalid kind "${kind}". Valid: ${SURFACE_KINDS.join(', ')}`);
  }
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  const m = milestone ?? state.currentMilestone;
  const surf = ensureSurface(state, m, surface ?? state.currentSurface);
  if (repo !== undefined) surf.repo = repo;
  if (kind !== undefined) surf.kind = kind;
  state.currentMilestone = m;
  if (surface != null) state.currentSurface = surface;
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
      const [name, repoPath, kind] = rest;
      if (!name || !repoPath || !kind) {
        console.error('Usage: adhd-state.mjs workspace-add <name> <path> <ui|api|lib>');
        process.exitCode = 1;
        break;
      }
      addRepo(cwd, { name, repoPath, kind });
      console.log(`registered repo "${name}"`);
      break;
    }
    case 'workspace-remove':
      removeRepo(cwd, rest[0]);
      console.log(`removed repo "${rest[0]}"`);
      break;
    case 'workspace-list':
      console.log(JSON.stringify(listRepos(cwd), null, 2));
      break;
    case 'surface-meta': {
      const [surface] = rest;
      if (!surface) {
        console.error('Usage: adhd-state.mjs surface-meta <surface> [--milestone N] [--repo name] [--kind ui|api|lib]');
        process.exitCode = 1;
        break;
      }
      if (flags.repo === undefined && flags.kind === undefined) {
        const state = loadState(cwd);
        const m = flags.milestone ?? state?.currentMilestone ?? 1;
        const surf = state?.milestones?.[String(m)]?.surfaces?.[surface];
        console.log(JSON.stringify({ repo: surf?.repo ?? null, kind: surf?.kind ?? null }, null, 2));
        break;
      }
      setSurfaceMeta(cwd, { milestone: flags.milestone, surface, repo: flags.repo, kind: flags.kind });
      console.log(`surface "${surface}" updated`);
      break;
    }
    default:
      console.error('Usage: adhd-state.mjs <init|read|status|next|set|gate|session-add|session-reset|preflight-confirm|advance-milestone|workspace-mode|workspace-add|workspace-remove|workspace-list|surface-meta>');
      process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main(process.argv.slice(2));
}
