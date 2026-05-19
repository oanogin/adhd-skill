// scripts/adhd-state.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const STATE_VERSION = 2;
export const STATE_FILE = 'project/state.json';
export const LOCAL_REPOS_FILE = 'project/repos.local.json';

export const FRONTLOAD_STAGES = ['setup', 'vision', 'stories', 'foundation', 'map'];
export const MILESTONE_STAGES = ['milestone-brief', 'design', 'tracer', 'features', 'review', 'finalize'];
export const FEATURE_STAGES = ['plan', 'build'];

export const STAGE_EFFORT = {
  setup: 'low', vision: 'high', stories: 'medium', foundation: 'medium', map: 'high',
  'milestone-brief': 'medium', design: 'high', tracer: 'high', features: 'high',
  review: 'high', finalize: 'low', plan: 'medium', build: 'medium',
};

export const EFFORT_WEIGHT = { low: 1, medium: 2, high: 3, 'extra-high': 4 };

export const STAGE_STATUSES = ['blocked', 'pending', 'in-progress', 'done'];

export const SURFACE_KINDS = ['ui', 'api', 'lib'];
export const MODES = ['single', 'multi'];
export const MILESTONE_TRACKS = ['prototype', 'production'];
export const PROTOTYPE_TOPOLOGIES = ['colocated', 'standalone'];

// Gate predecessors. Tokens: {docHome} {N} {feature}.
const STAGE_GATES = {
  setup:              { files: [],                                                stages: [] },
  vision:             { files: [],                                                stages: [['frontload', 'setup', 'done']] },
  stories:            { files: ['{docHome}/PRODUCT.md'],                           stages: [] },
  foundation:         { files: ['project/stories.md'],                             stages: [] },
  map:                { files: [],                                                stages: [['frontload', 'foundation', 'done']] },
  'milestone-brief':  { files: ['project/map.md', '{docHome}/GLOSSARY.md'],        stages: [] },
  design:             { files: [],                                                stages: [['milestone', 'milestone-brief', 'done']] },
  tracer:             { files: [],                                                stages: [['milestone', 'design', 'done'], ['productionMilestone']] },
  features:           { files: [],                                                stages: [['milestone', 'tracer', 'done'], ['productionMilestone']] },
  plan:               { files: [],                                                stages: [['featureExists'], ['milestone', 'features', 'done']] },
  build:              { files: ['project/milestones/m{N}/plans/{feature}.md'],     stages: [['featureDepsBuilt']] },
  review:             { files: [],                                                stages: [['reviewReady']] },
  finalize:           { files: [],                                                stages: [['milestone', 'review', 'done']] },
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
    prototypeTopology: 'colocated',
    prototype: { repo: null, subpath: null },
    createdAt: now,
    updatedAt: now,
    currentMilestone: 1,
    currentFeature: null,
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

function stageMap(stages) {
  return Object.fromEntries(stages.map((s) => [s, { status: 'blocked', effort: STAGE_EFFORT[s] }]));
}

function ensureMilestone(state, n) {
  const key = String(n);
  if (!state.milestones[key]) {
    state.milestones[key] = {
      title: null,
      track: null,
      domains: [],
      stories: [],
      stages: stageMap(MILESTONE_STAGES),
      surfaces: {},
      featureGraph: {},
    };
  }
  const m = state.milestones[key];
  if (m.track === undefined) m.track = null;
  if (m.domains === undefined) m.domains = [];
  if (m.stories === undefined) m.stories = [];
  if (m.surfaces === undefined) m.surfaces = {};
  if (m.featureGraph === undefined) m.featureGraph = {};
  if (!m.stages) m.stages = {};
  for (const s of MILESTONE_STAGES) {
    if (!m.stages[s]) m.stages[s] = { status: 'blocked', effort: STAGE_EFFORT[s] };
  }
  return m;
}

function ensureSurface(state, n, name) {
  const m = ensureMilestone(state, n);
  if (!m.surfaces[name]) {
    m.surfaces[name] = { kind: null, domains: [], repo: null, subpath: null };
  }
  const surf = m.surfaces[name];
  if (surf.kind === undefined) surf.kind = null;
  if (surf.domains === undefined) surf.domains = [];
  if (surf.repo === undefined) surf.repo = null;
  if (surf.subpath === undefined) surf.subpath = null;
  return surf;
}

function ensureFeature(state, n, id) {
  const m = ensureMilestone(state, n);
  if (!m.featureGraph[id]) {
    m.featureGraph[id] = {
      story: null,
      domain: null,
      repo: null,
      surface: null,
      dependsOn: [],
      plan: { status: 'blocked', effort: STAGE_EFFORT.plan },
      build: { status: 'blocked', effort: STAGE_EFFORT.build },
      verified: false,
    };
  }
  const f = m.featureGraph[id];
  if (f.dependsOn === undefined) f.dependsOn = [];
  if (!f.plan) f.plan = { status: 'blocked', effort: STAGE_EFFORT.plan };
  if (!f.build) f.build = { status: 'blocked', effort: STAGE_EFFORT.build };
  if (f.verified === undefined) f.verified = false;
  return f;
}

export function setStageStatus(cwd, { stage, status, milestone, surface, feature }) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  const m = milestone ?? state.currentMilestone;
  const feat = feature ?? state.currentFeature;
  let entry;
  if (FRONTLOAD_STAGES.includes(stage)) {
    entry = state.frontload[stage];
  } else if (FEATURE_STAGES.includes(stage)) {
    entry = ensureFeature(state, m, feat)[stage];
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
      feature: FEATURE_STAGES.includes(stage) ? feat : null,
      at: entry.completedAt,
    });
  }
  if (milestone != null) state.currentMilestone = m;
  if (feature != null) state.currentFeature = feature;
  saveState(cwd, state);
  return state;
}

function depsBuilt(graph, f) {
  return (f.dependsOn ?? []).every((d) => graph[d]?.build?.status === 'done');
}

export function gate(cwd, stage, { milestone, feature } = {}) {
  const def = STAGE_GATES[stage];
  if (!def) return { pass: false, missing: [`unknown stage: ${stage}`] };
  const state = loadState(cwd);
  const docHome = state?.docHome ?? 'docs';
  const m = milestone ?? state?.currentMilestone ?? 1;
  const fkey = feature ?? state?.currentFeature ?? '';
  const ms = state?.milestones?.[String(m)];
  const missing = [];
  for (const tmpl of def.files) {
    const rel = tmpl.replace('{docHome}', docHome).replace('{N}', m).replace('{feature}', fkey);
    if (!fs.existsSync(path.join(cwd, rel))) missing.push(rel);
  }
  for (const cond of def.stages) {
    if (cond[0] === 'frontload') {
      if (state?.frontload?.[cond[1]]?.status !== cond[2]) missing.push(`front-load stage "${cond[1]}" not ${cond[2]}`);
    } else if (cond[0] === 'milestone') {
      if (ms?.stages?.[cond[1]]?.status !== cond[2]) {
        missing.push(`milestone ${m} stage "${cond[1]}" not ${cond[2]}`);
      }
    } else if (cond[0] === 'productionMilestone') {
      if (ms?.track === 'prototype') {
        missing.push(`milestone ${m} is prototype-only — this stage does not apply`);
      }
    } else if (cond[0] === 'featureExists') {
      if (!ms?.featureGraph?.[fkey]) missing.push(`milestone ${m} has no feature "${fkey}" — run \`adhd features\` first`);
    } else if (cond[0] === 'featureDepsBuilt') {
      const f = ms?.featureGraph?.[fkey];
      if (!f) {
        missing.push(`milestone ${m} has no feature "${fkey}"`);
      } else if (!depsBuilt(ms.featureGraph, f)) {
        const blockers = (f.dependsOn ?? []).filter((d) => ms.featureGraph[d]?.build?.status !== 'done');
        missing.push(`feature "${fkey}" depends on unbuilt feature(s): ${blockers.join(', ')}`);
      }
    } else if (cond[0] === 'reviewReady') {
      if (!ms) {
        missing.push(`milestone ${m} not started`);
      } else if (ms.track === 'prototype') {
        if (ms.stages?.design?.status !== 'done') missing.push(`milestone ${m} design not done`);
      } else {
        if (ms.stages?.features?.status !== 'done') missing.push(`milestone ${m} features not done`);
        for (const [id, f] of Object.entries(ms.featureGraph ?? {})) {
          if (f.build?.status !== 'done') missing.push(`feature "${id}" not built`);
          else if (!f.verified) missing.push(`feature "${id}" built but not verified`);
        }
      }
    }
  }
  return { pass: missing.length === 0, missing };
}

export function nextStage(cwd = process.cwd()) {
  const state = loadState(cwd);
  if (!state) return { stage: 'setup', milestone: null, feature: null };
  for (const s of FRONTLOAD_STAGES) {
    if (state.frontload[s].status !== 'done') return { stage: s, milestone: null, feature: null };
  }
  const m = state.currentMilestone;
  const ms = state.milestones[String(m)];
  if (!ms) return { stage: 'milestone-brief', milestone: m, feature: null };
  for (const s of ['milestone-brief', 'design']) {
    if (ms.stages[s]?.status !== 'done') return { stage: s, milestone: m, feature: null };
  }
  if (ms.track !== 'prototype') {
    for (const s of ['tracer', 'features']) {
      if (ms.stages[s]?.status !== 'done') return { stage: s, milestone: m, feature: null };
    }
    const graph = ms.featureGraph ?? {};
    for (const [id, f] of Object.entries(graph)) {
      if (f.plan.status !== 'done') return { stage: 'plan', milestone: m, feature: id };
    }
    let pendingBuild = null;
    for (const [id, f] of Object.entries(graph)) {
      if (f.build.status !== 'done') {
        if (depsBuilt(graph, f)) return { stage: 'build', milestone: m, feature: id };
        if (!pendingBuild) pendingBuild = id;
      }
    }
    if (pendingBuild) return { stage: 'build', milestone: m, feature: pendingBuild };
  }
  for (const s of ['review', 'finalize']) {
    if (ms.stages[s]?.status !== 'done') return { stage: s, milestone: m, feature: null };
  }
  return { stage: 'next-milestone', milestone: m + 1, feature: null };
}

const ICON = { done: '✓', 'in-progress': '◐', pending: '○', blocked: '·' };

export function statusReport(cwd = process.cwd()) {
  const state = loadState(cwd);
  if (!state) return 'No project/state.json. Run `{{command_prefix}}adhd setup` to begin.';
  const lines = [];
  if ((state.version ?? 1) < STATE_VERSION) {
    lines.push(`! state.json is v${state.version ?? 1} — run \`adhd-state.mjs migrate\` to upgrade.`);
    lines.push('');
  }
  lines.push('Front-load:  ' + FRONTLOAD_STAGES.map((s) => `${s} ${ICON[state.frontload[s]?.status]}`).join('  '));
  for (const [key, ms] of Object.entries(state.milestones)) {
    lines.push(`Milestone ${key}${ms.title ? ` — ${ms.title}` : ''}:`);
    lines.push('  ' + MILESTONE_STAGES.map((s) => `${s} ${ICON[ms.stages[s]?.status]}`).join('  '));
    for (const [id, f] of Object.entries(ms.featureGraph ?? {})) {
      const v = f.verified ? ' verified' : '';
      lines.push(`  feature ${id}:  ` + FEATURE_STAGES.map((s) => `${s} ${ICON[f[s]?.status]}`).join('  ') + v);
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
    (next.milestone ? ` (milestone ${next.milestone}` + (next.feature ? `, feature ${next.feature})` : ')') : ''));
  return lines.join('\n');
}

function findCycle(graph) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = {};
  const stack = [];
  for (const id of Object.keys(graph)) color[id] = WHITE;
  let cycle = null;
  function dfs(id) {
    color[id] = GRAY;
    stack.push(id);
    for (const dep of graph[id]?.dependsOn ?? []) {
      if (!(dep in color)) continue; // unknown dep — reported separately
      if (color[dep] === GRAY) {
        cycle = stack.slice(stack.indexOf(dep)).concat(dep);
        return true;
      }
      if (color[dep] === WHITE && dfs(dep)) return true;
    }
    stack.pop();
    color[id] = BLACK;
    return false;
  }
  for (const id of Object.keys(graph)) {
    if (color[id] === WHITE && dfs(id)) break;
  }
  return cycle;
}

export function validate(cwd = process.cwd()) {
  const blockers = [];
  const warnings = [];
  const state = loadState(cwd);
  if (!state) {
    return { ok: false, blockers: ['No project/state.json — run `adhd setup` first.'], warnings: [] };
  }
  if ((state.version ?? 1) < STATE_VERSION) {
    blockers.push(`state.json is v${state.version ?? 1} — run \`adhd-state.mjs migrate\` to upgrade to v${STATE_VERSION}`);
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
  if ((state.prototypeTopology ?? 'colocated') === 'standalone') {
    const proto = state.prototype ?? {};
    if (state.frontload?.map?.status === 'done' && !proto.subpath && !proto.repo) {
      blockers.push('prototype topology is "standalone" but no prototype home is set — run `adhd workspace` to set it');
    }
    if (proto.repo && state.mode === 'multi' && !(state.repos ?? {})[proto.repo]) {
      blockers.push(`prototype home references unknown repo "${proto.repo}" — register it with \`workspace\``);
    }
  }
  for (const [key, ms] of Object.entries(state.milestones ?? {})) {
    const graph = ms.featureGraph ?? {};
    for (const [id, f] of Object.entries(graph)) {
      for (const d of f.dependsOn ?? []) {
        if (!graph[d]) blockers.push(`milestone ${key} feature "${id}" depends on unknown feature "${d}"`);
        if (d === id) blockers.push(`milestone ${key} feature "${id}" depends on itself`);
      }
    }
    const cyc = findCycle(graph);
    if (cyc) blockers.push(`milestone ${key}: feature dependency cycle: ${cyc.join(' → ')}`);
  }
  const notesPath = path.join(cwd, 'project/notes.md');
  if (fs.existsSync(notesPath) && fs.readFileSync(notesPath, 'utf-8').trim() !== '') {
    warnings.push('project/notes.md is not empty — drain durable entries to their canonical home');
  }
  return { ok: blockers.length === 0, blockers, warnings };
}

// ---- content audit ----
function parseStoriesTable(cwd) {
  const p = path.join(cwd, 'project/stories.md');
  if (!fs.existsSync(p)) return null;
  const rows = [];
  for (const line of fs.readFileSync(p, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t.startsWith('|')) continue;
    const cells = t.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length === 0) continue;
    if (/^:?-+:?$/.test(cells[0])) continue;          // separator row
    if (cells[0].toLowerCase() === 'id') continue;     // header row
    rows.push(cells);
  }
  return rows;
}

const MECHANISM_KEYWORDS = [
  'postgres', 'postgresql', 'mysql', 'sqlite', 'mongodb', 'redis', 'kafka',
  'react', 'vue', 'svelte', 'angular', 'next.js', 'nextjs',
  'kubernetes', 'docker', 'graphql', 'grpc', 'rest api',
];

function scanMechanismLeak(cwd, docHome) {
  const warnings = [];
  const files = [`${docHome}/PRODUCT.md`, 'project/stories.md', 'project/map.md'];
  for (const rel of files) {
    const p = path.join(cwd, rel);
    if (!fs.existsSync(p)) continue;
    const lower = fs.readFileSync(p, 'utf-8').toLowerCase();
    for (const kw of MECHANISM_KEYWORDS) {
      if (lower.includes(kw)) {
        warnings.push(`${rel}: mentions "${kw}" — product-scope docs should name capabilities, not mechanisms (move to docs/DECISIONS.md)`);
      }
    }
  }
  return warnings;
}

export function audit(cwd = process.cwd()) {
  const findings = [];
  const warnings = [];
  const state = loadState(cwd);
  if (!state) return { ok: false, findings: ['No project/state.json — run `adhd setup` first.'], warnings: [] };
  const docHome = state.docHome ?? 'docs';

  const rows = parseStoriesTable(cwd);
  const storyIds = new Set();
  if (rows === null) {
    if (state.frontload?.stories?.status === 'done') {
      findings.push('project/stories.md not found but the stories stage is done');
    }
  } else {
    for (const r of rows) {
      const id = r[0];
      if (!id) { findings.push('stories.md: a row has an empty ID'); continue; }
      if (storyIds.has(id)) findings.push(`stories.md: duplicate story ID "${id}"`);
      storyIds.add(id);
    }
    for (const r of rows) {
      const deps = (r[3] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      for (const d of deps) {
        if (!storyIds.has(d)) findings.push(`stories.md: story "${r[0]}" depends on unknown story ID "${d}"`);
      }
    }
  }

  const proto = state.prototype ?? {};
  const protoSet = Boolean(proto.repo || proto.subpath);
  for (const [key, ms] of Object.entries(state.milestones ?? {})) {
    if (state.frontload?.map?.status === 'done' && (ms.stories ?? []).length === 0
        && ms.stages?.['milestone-brief']?.status === 'done') {
      findings.push(`milestone ${key}: milestone-brief is done but no stories are assigned`);
    }
    for (const [sname, surf] of Object.entries(ms.surfaces ?? {})) {
      if (surf.kind !== 'ui') continue;
      const surfSet = Boolean(surf.repo || surf.subpath);
      if (protoSet && surfSet
          && (surf.repo ?? null) === (proto.repo ?? null)
          && (surf.subpath ?? null) === (proto.subpath ?? null)) {
        findings.push(`milestone ${key} surface "${sname}": its repo/subpath points at the prototype app — a ui surface's repo is its production home, not the prototype`);
      }
    }
    for (const s of ms.stories ?? []) {
      if (storyIds.size && !storyIds.has(s)) findings.push(`milestone ${key}: story "${s}" is not in stories.md`);
    }
    const graph = ms.featureGraph ?? {};
    const fids = new Set(Object.keys(graph));
    for (const [fid, f] of Object.entries(graph)) {
      if (f.story && storyIds.size && !storyIds.has(f.story)) {
        findings.push(`milestone ${key} feature "${fid}": unknown story "${f.story}"`);
      }
      if (f.story && (ms.stories ?? []).length && !(ms.stories ?? []).includes(f.story)) {
        findings.push(`milestone ${key} feature "${fid}": story "${f.story}" is not assigned to this milestone`);
      }
      if (f.domain && !(state.domains ?? {})[f.domain]) {
        findings.push(`milestone ${key} feature "${fid}": unknown domain "${f.domain}"`);
      }
      if (f.repo && !(state.repos ?? {})[f.repo]) {
        findings.push(`milestone ${key} feature "${fid}": unknown repo "${f.repo}"`);
      }
      if (f.surface && !(ms.surfaces ?? {})[f.surface]) {
        findings.push(`milestone ${key} feature "${fid}": unknown surface "${f.surface}"`);
      }
      for (const d of f.dependsOn ?? []) {
        if (d === fid) findings.push(`milestone ${key} feature "${fid}": depends on itself`);
        else if (!fids.has(d)) findings.push(`milestone ${key} feature "${fid}": depends on unknown feature "${d}"`);
      }
    }
    const cyc = findCycle(graph);
    if (cyc) findings.push(`milestone ${key}: feature dependency cycle: ${cyc.join(' → ')}`);
  }

  warnings.push(...scanMechanismLeak(cwd, docHome));
  const notesPath = path.join(cwd, 'project/notes.md');
  if (fs.existsSync(notesPath) && fs.readFileSync(notesPath, 'utf-8').trim() !== '') {
    warnings.push('project/notes.md is not empty — drain durable entries to their canonical home');
  }
  return { ok: findings.length === 0, findings, warnings };
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
  state.currentFeature = null;
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
  const surf = ensureSurface(state, m, surface);
  if (repo !== undefined) surf.repo = repo;
  if (subpath !== undefined) surf.subpath = subpath;
  if (kind !== undefined) surf.kind = kind;
  if (domains !== undefined) surf.domains = domains;
  state.currentMilestone = m;
  saveState(cwd, state);
  return state;
}

export function removeSurface(cwd = process.cwd(), { milestone, surface }) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  const m = milestone ?? state.currentMilestone;
  const ms = state.milestones?.[String(m)];
  if (ms?.surfaces) delete ms.surfaces[surface];
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

export function setMilestoneTitle(cwd = process.cwd(), { milestone, title }) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  const m = milestone ?? state.currentMilestone;
  ensureMilestone(state, m).title = title ?? null;
  state.currentMilestone = m;
  saveState(cwd, state);
  return state;
}

export function setMilestoneStories(cwd = process.cwd(), { milestone, stories }) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  const m = milestone ?? state.currentMilestone;
  ensureMilestone(state, m).stories = stories;
  state.currentMilestone = m;
  saveState(cwd, state);
  return state;
}

export function removeMilestone(cwd = process.cwd(), id) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  const key = String(id);
  const ms = state.milestones?.[key];
  if (!ms) throw new Error(`No milestone ${key}.`);
  if (Number(key) === state.currentMilestone) {
    throw new Error(`Milestone ${key} is the current milestone — cannot remove it.`);
  }
  const hasWork = Object.values(ms.stages ?? {}).some((s) => s.status === 'done')
    || Object.keys(ms.featureGraph ?? {}).length > 0;
  if (hasWork) {
    throw new Error(`Milestone ${key} has completed work — refusing to remove. Edit state.json by hand if this is truly intended.`);
  }
  delete state.milestones[key];
  saveState(cwd, state);
  return state;
}

export function setPrototypeTopology(cwd = process.cwd(), topology) {
  if (!PROTOTYPE_TOPOLOGIES.includes(topology)) {
    throw new Error(`Invalid topology "${topology}". Valid: ${PROTOTYPE_TOPOLOGIES.join(', ')}`);
  }
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  state.prototypeTopology = topology;
  saveState(cwd, state);
  return state;
}

export function setPrototypeHome(cwd = process.cwd(), { repo, subpath }) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  state.prototype = { repo: repo ?? null, subpath: subpath ?? null };
  saveState(cwd, state);
  return state;
}

export function addFeature(cwd = process.cwd(), { milestone, id, story, domain, repo, surface, dependsOn }) {
  if (!id) throw new Error('Feature id is required.');
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  const m = milestone ?? state.currentMilestone;
  const f = ensureFeature(state, m, id);
  if (story !== undefined) f.story = story;
  if (domain !== undefined) f.domain = domain;
  if (repo !== undefined) f.repo = repo;
  if (surface !== undefined) f.surface = surface;
  if (dependsOn !== undefined) f.dependsOn = dependsOn;
  state.currentMilestone = m;
  saveState(cwd, state);
  return state;
}

export function setFeatureDeps(cwd = process.cwd(), { milestone, id, dependsOn }) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  const m = milestone ?? state.currentMilestone;
  ensureFeature(state, m, id).dependsOn = dependsOn ?? [];
  state.currentMilestone = m;
  saveState(cwd, state);
  return state;
}

export function removeFeature(cwd = process.cwd(), { milestone, id }) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  const m = milestone ?? state.currentMilestone;
  const ms = ensureMilestone(state, m);
  delete ms.featureGraph[id];
  saveState(cwd, state);
  return state;
}

export function listFeatures(cwd = process.cwd(), milestone) {
  const state = loadState(cwd);
  if (!state) return {};
  const m = milestone ?? state.currentMilestone;
  return state.milestones?.[String(m)]?.featureGraph ?? {};
}

export function verifyFeature(cwd = process.cwd(), { milestone, id }) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  const m = milestone ?? state.currentMilestone;
  ensureFeature(state, m, id).verified = true;
  state.currentMilestone = m;
  saveState(cwd, state);
  return state;
}

export function migrate(cwd = process.cwd()) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  if ((state.version ?? 1) >= STATE_VERSION) return { migrated: false, version: state.version ?? STATE_VERSION };
  const fl = state.frontload ?? {};
  if (fl.features && !fl.stories) fl.stories = fl.features;
  const newFl = {};
  for (const s of FRONTLOAD_STAGES) {
    if (s === 'foundation' && !fl.foundation) {
      newFl.foundation = { status: fl.map?.status === 'done' ? 'done' : 'blocked', effort: STAGE_EFFORT.foundation };
    } else {
      newFl[s] = fl[s] ?? { status: 'blocked', effort: STAGE_EFFORT[s] };
    }
  }
  state.frontload = newFl;
  for (const ms of Object.values(state.milestones ?? {})) {
    const old = ms.stages ?? {};
    const briefDone = old['surface-overview']?.status === 'done' && old['milestone-ux']?.status === 'done';
    const newStages = stageMap(MILESTONE_STAGES);
    if (briefDone) newStages['milestone-brief'].status = 'done';
    if (old.prototype?.status === 'done') newStages.design.status = 'done';
    if (old.tracer?.status) newStages.tracer.status = old.tracer.status;
    if (old.review?.status) newStages.review.status = old.review.status;
    ms.stages = newStages;
    ms.stories = ms.stories ?? [];
    ms.featureGraph = ms.featureGraph ?? {};
    ms.track = ms.track ?? null;
    ms.domains = ms.domains ?? [];
    for (const [sn, surf] of Object.entries(ms.surfaces ?? {})) {
      ms.surfaces[sn] = {
        kind: surf.kind ?? null,
        domains: surf.domains ?? [],
        repo: surf.repo ?? null,
        subpath: surf.subpath ?? null,
      };
    }
  }
  delete state.currentSurface;
  if (state.currentFeature === undefined) state.currentFeature = null;
  if (state.prototypeTopology === undefined) state.prototypeTopology = 'colocated';
  if (state.prototype === undefined) state.prototype = { repo: null, subpath: null };
  state.version = STATE_VERSION;
  saveState(cwd, state);
  return { migrated: true, version: STATE_VERSION };
}

// ---- CLI ----
function parseFlags(args) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--milestone') flags.milestone = Number(args[++i]);
    else if (args[i] === '--surface') flags.surface = args[++i];
    else if (args[i] === '--feature') flags.feature = args[++i];
    else if (args[i] === '--story') flags.story = args[++i];
    else if (args[i] === '--doc-home') flags.docHome = args[++i];
    else if (args[i] === '--repo') flags.repo = args[++i];
    else if (args[i] === '--kind') flags.kind = args[++i];
    else if (args[i] === '--remote') flags.remote = args[++i];
    else if (args[i] === '--domain') flags.domain = args[++i];
    else if (args[i] === '--depends') flags.depends = args[++i];
    else if (args[i] === '--subpath') flags.subpath = args[++i];
    else if (args[i] === '--description') flags.description = args[++i];
    else if (args[i] === '--home-repo') flags.homeRepo = args[++i];
    else if (args[i] === '--home-subpath') flags.homeSubpath = args[++i];
    else rest.push(args[i]);
  }
  return { flags, rest };
}

function csv(v) {
  return v === undefined ? undefined : v.split(',').map((s) => s.trim()).filter(Boolean);
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
        console.error('Usage: adhd-state.mjs set <stage> <status> [--milestone N] [--feature name]');
        process.exitCode = 1;
        break;
      }
      if (!STAGE_STATUSES.includes(status)) {
        console.error(`Invalid status "${status}". Valid: ${STAGE_STATUSES.join(', ')}`);
        process.exitCode = 1;
        break;
      }
      setStageStatus(cwd, { stage, status, milestone: flags.milestone, feature: flags.feature });
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
    case 'migrate': {
      const r = migrate(cwd);
      console.log(r.migrated ? `migrated state.json to v${r.version}` : `already v${r.version} — nothing to do`);
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
      const [v] = rest;
      if (!v) {
        console.error('Usage: adhd-state.mjs milestone-domains <d1,d2,...> [--milestone N]');
        process.exitCode = 1;
        break;
      }
      const s = setMilestoneDomains(cwd, { milestone: flags.milestone, domains: csv(v) });
      console.log(`milestone ${s.currentMilestone} domains = ${v}`);
      break;
    }
    case 'milestone-stories': {
      const [v] = rest;
      if (!v) {
        console.error('Usage: adhd-state.mjs milestone-stories <s1,s2,...> [--milestone N]');
        process.exitCode = 1;
        break;
      }
      const s = setMilestoneStories(cwd, { milestone: flags.milestone, stories: csv(v) });
      console.log(`milestone ${s.currentMilestone} stories = ${v}`);
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
    case 'audit': {
      const r = audit(cwd);
      for (const f of r.findings) console.log(`FINDING: ${f}`);
      for (const w of r.warnings) console.log(`warning: ${w}`);
      console.log(r.ok ? 'audit: clean' : 'audit: issues found');
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
    case 'milestone-remove': {
      const [id] = rest;
      if (!id) {
        console.error('Usage: adhd-state.mjs milestone-remove <N>');
        process.exitCode = 1;
        break;
      }
      removeMilestone(cwd, Number(id));
      console.log(`removed milestone ${id}`);
      break;
    }
    case 'milestone-title': {
      const title = rest.join(' ');
      if (!title) {
        console.error('Usage: adhd-state.mjs milestone-title <title> [--milestone N]');
        process.exitCode = 1;
        break;
      }
      const s = setMilestoneTitle(cwd, { milestone: flags.milestone, title });
      console.log(`milestone ${s.currentMilestone} title = ${title}`);
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
        domains: csv(flags.domain),
      });
      console.log(`surface "${surface}" updated`);
      break;
    }
    case 'surface-remove': {
      const [surface] = rest;
      if (!surface) {
        console.error('Usage: adhd-state.mjs surface-remove <name> [--milestone N]');
        process.exitCode = 1;
        break;
      }
      removeSurface(cwd, { milestone: flags.milestone, surface });
      console.log(`removed surface "${surface}"`);
      break;
    }
    case 'prototype-topology': {
      const [topology] = rest;
      if (!topology) {
        console.error('Usage: adhd-state.mjs prototype-topology <colocated|standalone>');
        process.exitCode = 1;
        break;
      }
      setPrototypeTopology(cwd, topology);
      console.log(`prototype topology = ${topology}`);
      break;
    }
    case 'prototype-home': {
      const s = setPrototypeHome(cwd, { repo: flags.repo, subpath: flags.subpath });
      console.log(`prototype home = repo:${s.prototype.repo ?? '(orchestration)'} subpath:${s.prototype.subpath ?? '(root)'}`);
      break;
    }
    case 'feature-add': {
      const [id] = rest;
      if (!id) {
        console.error('Usage: adhd-state.mjs feature-add <id> [--milestone N] --story <s> --domain <d> --repo <r> [--surface <name>] [--depends f1,f2]');
        process.exitCode = 1;
        break;
      }
      addFeature(cwd, {
        milestone: flags.milestone, id,
        story: flags.story, domain: flags.domain, repo: flags.repo,
        surface: flags.surface, dependsOn: csv(flags.depends),
      });
      console.log(`feature "${id}" added`);
      break;
    }
    case 'feature-dep': {
      const [id] = rest;
      if (!id) {
        console.error('Usage: adhd-state.mjs feature-dep <id> --depends f1,f2 [--milestone N]');
        process.exitCode = 1;
        break;
      }
      setFeatureDeps(cwd, { milestone: flags.milestone, id, dependsOn: csv(flags.depends) ?? [] });
      console.log(`feature "${id}" dependsOn = ${flags.depends ?? '(none)'}`);
      break;
    }
    case 'feature-remove': {
      const [id] = rest;
      if (!id) {
        console.error('Usage: adhd-state.mjs feature-remove <id> [--milestone N]');
        process.exitCode = 1;
        break;
      }
      removeFeature(cwd, { milestone: flags.milestone, id });
      console.log(`feature "${id}" removed`);
      break;
    }
    case 'feature-list':
      console.log(JSON.stringify(listFeatures(cwd, flags.milestone), null, 2));
      break;
    case 'feature-verify': {
      const [id] = rest;
      if (!id) {
        console.error('Usage: adhd-state.mjs feature-verify <id> [--milestone N]');
        process.exitCode = 1;
        break;
      }
      verifyFeature(cwd, { milestone: flags.milestone, id });
      console.log(`feature "${id}" marked verified`);
      break;
    }
    default:
      console.error('Usage: adhd-state.mjs <init|read|status|next|set|gate|validate|audit|migrate|session-add|session-reset|preflight-confirm|advance-milestone|workspace-mode|workspace-add|workspace-remove|workspace-list|repo-bind|repo-unbind|migrate-repos|domain-add|domain-remove|domain-list|milestone-track|milestone-title|milestone-domains|milestone-stories|milestone-remove|surface-meta|surface-remove|prototype-topology|prototype-home|feature-add|feature-dep|feature-remove|feature-list|feature-verify>');
      process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main(process.argv.slice(2));
}
