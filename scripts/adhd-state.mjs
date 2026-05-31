// scripts/adhd-state.mjs
//
// Lean adhd state tool. The project's state IS its files: `project/` + `docs/`.
// A stage is done when its artifact file exists. The only json is
// `project/config.json` — the irreducible non-doc config. This tool reads and
// derives; it writes only `config.json` (and the gitignored session scratch).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CONFIG_VERSION = 3;
export const CONFIG_FILE = 'project/config.json';
export const LOCAL_REPOS_FILE = 'project/repos.local.json';
export const SESSION_FILE = 'project/.session.json';
export const LEGACY_STATE_FILE = 'project/state.json';

export const GROUNDWORK_STAGES = ['setup', 'vision', 'foundation', 'concepts', 'prototype', 'stories'];
export const MILESTONE_STAGES = ['milestone-brief', 'ux-refine', 'tracer', 'features', 'review', 'finalize'];
export const FEATURE_STAGES = ['plan', 'build'];

export const STAGE_EFFORT = {
  setup: 'low', vision: 'high', foundation: 'medium', concepts: 'high', prototype: 'high', stories: 'medium',
  'milestone-brief': 'medium', 'ux-refine': 'high', tracer: 'high', features: 'high',
  review: 'high', finalize: 'low', plan: 'medium', build: 'medium',
};
export const EFFORT_WEIGHT = { low: 1, medium: 2, high: 3, 'extra-high': 4 };

export const SURFACE_KINDS = ['ui', 'api', 'lib'];
export const MODES = ['single', 'multi'];
export const MILESTONE_TRACKS = ['prototype', 'production'];
export const PROTOTYPE_TOPOLOGIES = ['colocated', 'standalone'];

// ---- paths & io ----
function configPath(cwd) { return path.join(cwd, CONFIG_FILE); }
function localReposPath(cwd) { return path.join(cwd, LOCAL_REPOS_FILE); }
function sessionPath(cwd) { return path.join(cwd, SESSION_FILE); }
function exists(cwd, rel) { return fs.existsSync(path.join(cwd, rel)); }
function read(cwd, rel) { return fs.readFileSync(path.join(cwd, rel), 'utf-8'); }
function isGitRepo(p) { return fs.existsSync(path.join(p, '.git')); }

function writeJSON(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n');
  fs.renameSync(tmp, p);
}

export function defaultConfig() {
  const now = new Date().toISOString();
  return {
    version: CONFIG_VERSION,
    docHome: 'docs',
    mode: 'single',
    repos: {},
    prototypeTopology: 'colocated',
    prototype: { repo: null, subpath: null },
    preflight: { skillsConfirmed: false, confirmedAt: null },
    createdAt: now,
    updatedAt: now,
  };
}

export function loadConfig(cwd = process.cwd()) {
  const p = configPath(cwd);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (e) {
    throw new Error(`${CONFIG_FILE} is corrupt or not valid JSON: ${e.message}`);
  }
}

export function saveConfig(cwd, config) {
  config.updatedAt = new Date().toISOString();
  writeJSON(configPath(cwd), config);
  return configPath(cwd);
}

export function initConfig(cwd = process.cwd(), { docHome = 'docs' } = {}) {
  const existing = loadConfig(cwd);
  if (existing) return existing;
  const config = defaultConfig();
  config.docHome = docHome;
  saveConfig(cwd, config);
  return config;
}

function requireConfig(cwd) {
  const config = loadConfig(cwd);
  if (!config) throw new Error('No project/config.json — run `adhd setup` first.');
  return config;
}

// ---- local repo bindings (gitignored) ----
function loadLocalRepos(cwd) {
  const p = localReposPath(cwd);
  if (!fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
  catch (e) { throw new Error(`${LOCAL_REPOS_FILE} is corrupt or not valid JSON: ${e.message}`); }
}
function saveLocalRepos(cwd, obj) { writeJSON(localReposPath(cwd), obj); }

// ---- session scratch (gitignored, ephemeral) ----
export function loadSession(cwd = process.cwd()) {
  const p = sessionPath(cwd);
  if (!fs.existsSync(p)) return { startedAt: null, stagesRun: [] };
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
  catch { return { startedAt: null, stagesRun: [] }; }
}
export function sessionAdd(cwd = process.cwd(), stage) {
  const s = loadSession(cwd);
  if (!s.startedAt) s.startedAt = new Date().toISOString();
  s.stagesRun.push(stage);
  writeJSON(sessionPath(cwd), s);
  return s;
}
export function sessionReset(cwd = process.cwd()) {
  const s = { startedAt: new Date().toISOString(), stagesRun: [] };
  writeJSON(sessionPath(cwd), s);
  return s;
}

// ---- markdown parsing ----
// Parse the first markdown table in `text` -> { header: [lowercased], rows: [[cells]] }.
export function parseTable(text) {
  const rowLines = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (t.startsWith('|') && t.endsWith('|')) rowLines.push(t);
  }
  const cells = (l) => l.slice(1, -1).split('|').map((c) => c.trim());
  let sep = -1;
  for (let i = 0; i < rowLines.length; i++) {
    const cs = cells(rowLines[i]);
    if (cs.length && cs.every((c) => /^:?-+:?$/.test(c))) { sep = i; break; }
  }
  if (sep < 1) return { header: [], rows: [] };
  return {
    header: cells(rowLines[sep - 1]).map((h) => h.toLowerCase()),
    rows: rowLines.slice(sep + 1).map(cells),
  };
}

const clean = (s) => (s ?? '').replace(/`/g, '').trim();

export function parseStories(cwd) {
  if (!exists(cwd, 'project/stories.md')) return null;
  const { header, rows } = parseTable(read(cwd, 'project/stories.md'));
  const idC = header.indexOf('id');
  const depC = header.indexOf('depends on');
  if (idC < 0) return [];
  return rows.map((r) => ({
    id: clean(r[idC]),
    dependsOn: depC >= 0 ? clean(r[depC]).split(',').map((s) => s.trim()).filter(Boolean) : [],
  })).filter((s) => s.id);
}

function milestoneRel(m, ...sub) { return path.join('project/milestones', `m${m}`, ...sub); }

export function milestoneDirs(cwd) {
  const dir = path.join(cwd, 'project/milestones');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .map((d) => /^m(\d+)$/.exec(d))
    .filter(Boolean)
    .map((mm) => Number(mm[1]))
    .sort((a, b) => a - b);
}

export function parseFeatures(cwd, m) {
  const rel = milestoneRel(m, 'features.md');
  if (!exists(cwd, rel)) return null;
  const { header, rows } = parseTable(read(cwd, rel));
  const c = (name) => header.indexOf(name);
  const idC = c('id'), storyC = c('story'), domainC = c('domain'),
    repoC = c('repo'), depC = c('depends on'), buildC = c('build'), verC = c('verified');
  return rows.map((r) => ({
    id: clean(r[idC]),
    story: storyC >= 0 ? clean(r[storyC]) || null : null,
    domain: domainC >= 0 ? clean(r[domainC]) || null : null,
    repo: repoC >= 0 ? clean(r[repoC]) || null : null,
    dependsOn: depC >= 0 ? clean(r[depC]).split(',').map((s) => s.trim()).filter(Boolean) : [],
    build: buildC >= 0 && /\bdone\b/i.test(r[buildC] ?? ''),
    verified: verC >= 0 && /\b(yes|done|x)\b/i.test(r[verC] ?? ''),
  })).filter((f) => f.id);
}

export function milestoneTrack(cwd, m) {
  const rel = milestoneRel(m, 'brief.md');
  if (!exists(cwd, rel)) return null;
  const mt = read(cwd, rel).match(/track:\s*`?(production|prototype)/i);
  return mt ? mt[1].toLowerCase() : 'production';
}

function milestoneTitle(cwd, m) {
  const rel = milestoneRel(m, 'brief.md');
  if (!exists(cwd, rel)) return null;
  const mt = read(cwd, rel).match(/^#\s+(.+)$/m);
  if (!mt) return null;
  return mt[1].trim().replace(/^milestone\s*\d+\s*[—–-]\s*/i, '') || null;
}

// ---- stage completion (derived from files) ----
export function groundworkDone(cwd, stage) {
  const docHome = loadConfig(cwd)?.docHome ?? 'docs';
  switch (stage) {
    case 'setup': return exists(cwd, CONFIG_FILE);
    case 'vision': return exists(cwd, `${docHome}/PRODUCT.md`);
    case 'foundation':
      return exists(cwd, `${docHome}/DECISIONS.md`)
        && /^##\s/m.test(read(cwd, `${docHome}/DECISIONS.md`));
    case 'concepts': return exists(cwd, `${docHome}/CONCEPTS.md`);
    case 'prototype':
      return exists(cwd, 'project/prototype.md')
        && exists(cwd, 'project/map.md');
    case 'stories': return exists(cwd, 'project/stories.md');
    default: return false;
  }
}

export function milestoneStageDone(cwd, m, stage) {
  const f = { 'milestone-brief': 'brief.md', 'ux-refine': 'ux-refine.md', tracer: 'tracer.md',
    features: 'features.md', review: 'review.md', finalize: 'summary.md' }[stage];
  return f ? exists(cwd, milestoneRel(m, f)) : false;
}

function planDone(cwd, m, feature) { return exists(cwd, milestoneRel(m, 'plans', `${feature}.md`)); }

function depsBuilt(features, f) {
  const byId = Object.fromEntries(features.map((x) => [x.id, x]));
  return (f.dependsOn ?? []).every((d) => byId[d]?.build);
}

// ---- gates ----
export function gate(cwd, stage, { milestone, feature } = {}) {
  const missing = [];
  const need = (ok, msg) => { if (!ok) missing.push(msg); };
  const gw = (s) => groundworkDone(cwd, s);
  const ms = (s) => milestone != null && milestoneStageDone(cwd, milestone, s);
  const needsMilestone = ['milestone-brief', 'ux-refine', 'tracer', 'features', 'plan', 'build', 'review', 'finalize'];
  if (needsMilestone.includes(stage) && milestone == null) {
    return { pass: false, missing: ['--milestone is required for this stage'] };
  }
  const track = milestone != null ? milestoneTrack(cwd, milestone) : null;

  switch (stage) {
    case 'setup': break;
    case 'vision': need(gw('setup'), 'setup not done — no project/config.json'); break;
    case 'foundation': need(gw('vision'), 'vision not done — docs/PRODUCT.md missing'); break;
    case 'concepts': need(gw('foundation'), 'foundation not done — no decisions logged in docs/DECISIONS.md'); break;
    case 'prototype': need(gw('concepts'), 'concepts not done — docs/CONCEPTS.md missing'); break;
    case 'stories': need(gw('prototype'), 'prototype not done — project/prototype.md / project/map.md missing'); break;
    case 'milestone-brief': need(gw('stories'), 'stories not done — project/stories.md missing'); break;
    case 'ux-refine': need(ms('milestone-brief'), `milestone ${milestone}: milestone-brief not done`); break;
    case 'tracer':
      need(ms('ux-refine'), `milestone ${milestone}: ux-refine not done`);
      need(track !== 'prototype', `milestone ${milestone} is prototype-only — tracer does not apply`);
      break;
    case 'features':
      need(ms('tracer'), `milestone ${milestone}: tracer not done`);
      need(track !== 'prototype', `milestone ${milestone} is prototype-only — features does not apply`);
      break;
    case 'plan': {
      need(ms('features'), `milestone ${milestone}: features not done`);
      const feats = parseFeatures(cwd, milestone) ?? [];
      need(feats.some((f) => f.id === feature), `milestone ${milestone}: no feature "${feature}" in features.md`);
      break;
    }
    case 'build': {
      need(planDone(cwd, milestone, feature), `feature "${feature}": not planned — m${milestone}/plans/${feature}.md missing`);
      const feats = parseFeatures(cwd, milestone) ?? [];
      const f = feats.find((x) => x.id === feature);
      if (!f) { missing.push(`milestone ${milestone}: no feature "${feature}" in features.md`); break; }
      if (!depsBuilt(feats, f)) {
        const byId = Object.fromEntries(feats.map((x) => [x.id, x]));
        const blockers = (f.dependsOn ?? []).filter((d) => !byId[d]?.build);
        missing.push(`feature "${feature}" depends on unbuilt feature(s): ${blockers.join(', ')}`);
      }
      break;
    }
    case 'review':
      if (track === 'prototype') {
        need(ms('ux-refine'), `milestone ${milestone}: ux-refine not done`);
      } else {
        need(ms('features'), `milestone ${milestone}: features not done`);
        for (const f of parseFeatures(cwd, milestone) ?? []) {
          if (!f.build) missing.push(`feature "${f.id}" not built`);
          else if (!f.verified) missing.push(`feature "${f.id}" built but not verified`);
        }
      }
      break;
    case 'finalize': need(ms('review'), `milestone ${milestone}: review not done`); break;
    default: return { pass: false, missing: [`unknown stage: ${stage}`] };
  }
  return { pass: missing.length === 0, missing };
}

// ---- next stage ----
export function nextStage(cwd = process.cwd(), { milestone } = {}) {
  if (!loadConfig(cwd)) return { stage: 'setup', milestone: null, feature: null };
  for (const s of GROUNDWORK_STAGES) {
    if (!groundworkDone(cwd, s)) return { stage: s, milestone: null, feature: null };
  }
  const dirs = milestoneDirs(cwd);
  let target = milestone;
  if (target == null) {
    target = dirs.find((m) => !milestoneComplete(cwd, m));
    if (target == null) return { stage: 'milestone-brief', milestone: (dirs.at(-1) ?? 0) + 1, feature: null };
  }
  return milestoneNext(cwd, target);
}

function milestoneComplete(cwd, m) {
  return milestoneNext(cwd, m).stage === 'done';
}

function milestoneNext(cwd, m) {
  const at = (stage, feature = null) => ({ stage, milestone: m, feature });
  if (!milestoneStageDone(cwd, m, 'milestone-brief')) return at('milestone-brief');
  if (!milestoneStageDone(cwd, m, 'ux-refine')) return at('ux-refine');
  if (milestoneTrack(cwd, m) !== 'prototype') {
    if (!milestoneStageDone(cwd, m, 'tracer')) return at('tracer');
    if (!milestoneStageDone(cwd, m, 'features')) return at('features');
    // Interleaved plan -> build, one feature at a time, in dependency order:
    // for the first not-yet-built feature whose deps are built, plan it if it
    // is not planned yet, otherwise build it. Only then move to the next feature.
    const feats = parseFeatures(cwd, m) ?? [];
    let blocked = null;
    for (const f of feats) {
      if (f.build) continue;
      if (depsBuilt(feats, f)) {
        if (!planDone(cwd, m, f.id)) return at('plan', f.id);
        return at('build', f.id);
      }
      if (!blocked) blocked = f;
    }
    if (blocked) {
      if (!planDone(cwd, m, blocked.id)) return at('plan', blocked.id);
      return at('build', blocked.id);
    }
  }
  if (!milestoneStageDone(cwd, m, 'review')) return at('review');
  if (!milestoneStageDone(cwd, m, 'finalize')) return at('finalize');
  return at('done');
}

// ---- status ----
const ICON = (done) => (done ? '✓' : '·');

export function statusReport(cwd = process.cwd()) {
  if (!loadConfig(cwd)) return 'No project/config.json. Run `adhd setup` to begin.';
  const lines = [];
  if (exists(cwd, LEGACY_STATE_FILE)) {
    lines.push('! legacy project/state.json present — run `adhd-state.mjs migrate`.', '');
  }
  lines.push('Groundwork:  ' + GROUNDWORK_STAGES.map((s) => `${s} ${ICON(groundworkDone(cwd, s))}`).join('  '));
  for (const m of milestoneDirs(cwd)) {
    const title = milestoneTitle(cwd, m);
    const track = milestoneTrack(cwd, m);
    lines.push(`Milestone ${m}${title ? ` — ${title}` : ''}${track ? ` [${track}]` : ''}:`);
    const stages = track === 'prototype'
      ? ['milestone-brief', 'ux-refine', 'review', 'finalize']
      : MILESTONE_STAGES;
    lines.push('  ' + stages.map((s) => `${s} ${ICON(milestoneStageDone(cwd, m, s))}`).join('  '));
    for (const f of parseFeatures(cwd, m) ?? []) {
      lines.push(`  feature ${f.id}:  plan ${ICON(planDone(cwd, m, f.id))}  build ${ICON(f.build)}` +
        (f.verified ? '  verified' : ''));
    }
  }
  const next = nextStage(cwd);
  lines.push('', `Next runnable stage: ${next.stage}` +
    (next.milestone ? ` (milestone ${next.milestone}` + (next.feature ? `, feature ${next.feature})` : ')') : ''));
  return lines.join('\n');
}

// ---- validate ----
function findCycle(features) {
  const byId = Object.fromEntries(features.map((f) => [f.id, f]));
  const color = {};
  const stack = [];
  let cycle = null;
  function dfs(id) {
    color[id] = 1; stack.push(id);
    for (const d of byId[id]?.dependsOn ?? []) {
      if (!byId[d]) continue;
      if (color[d] === 1) { cycle = stack.slice(stack.indexOf(d)).concat(d); return true; }
      if (!color[d] && dfs(d)) return true;
    }
    stack.pop(); color[id] = 2; return false;
  }
  for (const f of features) if (!color[f.id] && dfs(f.id)) break;
  return cycle;
}

export function validate(cwd = process.cwd()) {
  const blockers = [];
  const warnings = [];
  const config = loadConfig(cwd);
  if (!config) {
    return { ok: false, blockers: ['No project/config.json — run `adhd setup` first.'], warnings: [] };
  }
  if (exists(cwd, LEGACY_STATE_FILE)) {
    blockers.push('legacy project/state.json present — run `adhd-state.mjs migrate` to upgrade');
  }
  if ((config.version ?? 0) !== CONFIG_VERSION) {
    warnings.push(`config.json version is ${config.version} (expected ${CONFIG_VERSION})`);
  }
  // groundwork order coherence
  let seenIncomplete = false;
  for (const s of GROUNDWORK_STAGES) {
    if (!groundworkDone(cwd, s)) seenIncomplete = true;
    else if (seenIncomplete) blockers.push(`groundwork stage "${s}" is done but an earlier stage is not`);
  }
  // multi-mode repos
  if (config.mode === 'multi') {
    const local = loadLocalRepos(cwd);
    for (const name of Object.keys(config.repos ?? {})) {
      const p = local[name];
      if (!p) blockers.push(`repo "${name}" is registered but not bound — run \`workspace\` to bind it`);
      else if (!fs.existsSync(p)) blockers.push(`repo "${name}" local path does not exist: ${p}`);
      else if (!isGitRepo(p)) blockers.push(`repo "${name}" local path is not a git repository: ${p}`);
    }
  }
  // standalone prototype topology needs a home
  if ((config.prototypeTopology ?? 'colocated') === 'standalone') {
    const proto = config.prototype ?? {};
    if (groundworkDone(cwd, 'prototype') && !proto.subpath && !proto.repo) {
      blockers.push('prototype topology is "standalone" but no prototype home is set — run `adhd workspace`');
    }
    if (proto.repo && config.mode === 'multi' && !(config.repos ?? {})[proto.repo]) {
      blockers.push(`prototype home references unknown repo "${proto.repo}"`);
    }
  }
  // feature DAG sanity per milestone
  for (const m of milestoneDirs(cwd)) {
    const feats = parseFeatures(cwd, m);
    if (!feats) continue;
    const ids = new Set(feats.map((f) => f.id));
    for (const f of feats) {
      for (const d of f.dependsOn) {
        if (d === f.id) blockers.push(`milestone ${m} feature "${f.id}" depends on itself`);
        else if (!ids.has(d)) blockers.push(`milestone ${m} feature "${f.id}" depends on unknown feature "${d}"`);
      }
    }
    const cyc = findCycle(feats);
    if (cyc) blockers.push(`milestone ${m}: feature dependency cycle: ${cyc.join(' → ')}`);
  }
  if (exists(cwd, 'project/notes.md') && read(cwd, 'project/notes.md').trim() !== '') {
    warnings.push('project/notes.md is not empty — drain durable entries to their canonical home');
  }
  return { ok: blockers.length === 0, blockers, warnings };
}

// ---- audit ----
const MECHANISM_KEYWORDS = [
  'postgres', 'postgresql', 'mysql', 'sqlite', 'mongodb', 'redis', 'kafka',
  'react', 'vue', 'svelte', 'angular', 'next.js', 'nextjs',
  'kubernetes', 'docker', 'graphql', 'grpc', 'rest api',
];

export function audit(cwd = process.cwd()) {
  const findings = [];
  const warnings = [];
  const config = loadConfig(cwd);
  if (!config) return { ok: false, findings: ['No project/config.json — run `adhd setup` first.'], warnings: [] };
  const docHome = config.docHome ?? 'docs';

  const stories = parseStories(cwd);
  const storyIds = new Set();
  if (stories === null) {
    if (groundworkDone(cwd, 'stories')) findings.push('project/stories.md not found but the stories stage is done');
  } else {
    for (const s of stories) {
      if (storyIds.has(s.id)) findings.push(`stories.md: duplicate story ID "${s.id}"`);
      storyIds.add(s.id);
    }
    for (const s of stories) {
      for (const d of s.dependsOn) {
        if (!storyIds.has(d)) findings.push(`stories.md: story "${s.id}" depends on unknown story ID "${d}"`);
      }
    }
  }

  for (const m of milestoneDirs(cwd)) {
    const feats = parseFeatures(cwd, m);
    if (!feats) continue;
    const ids = new Set(feats.map((f) => f.id));
    for (const f of feats) {
      if (f.story && storyIds.size && !storyIds.has(f.story)) {
        findings.push(`milestone ${m} feature "${f.id}": unknown story "${f.story}"`);
      }
      if (f.repo && config.mode === 'multi' && !(config.repos ?? {})[f.repo]) {
        findings.push(`milestone ${m} feature "${f.id}": unknown repo "${f.repo}"`);
      }
      for (const d of f.dependsOn) {
        if (d === f.id) findings.push(`milestone ${m} feature "${f.id}": depends on itself`);
        else if (!ids.has(d)) findings.push(`milestone ${m} feature "${f.id}": depends on unknown feature "${d}"`);
      }
    }
    const cyc = findCycle(feats);
    if (cyc) findings.push(`milestone ${m}: feature dependency cycle: ${cyc.join(' → ')}`);
  }

  for (const rel of [`${docHome}/PRODUCT.md`, 'project/stories.md', 'project/map.md']) {
    if (!exists(cwd, rel)) continue;
    const lower = read(cwd, rel).toLowerCase();
    for (const kw of MECHANISM_KEYWORDS) {
      if (lower.includes(kw)) {
        warnings.push(`${rel}: mentions "${kw}" — product-scope docs should name capabilities, not mechanisms`);
      }
    }
  }
  if (exists(cwd, 'project/notes.md') && read(cwd, 'project/notes.md').trim() !== '') {
    warnings.push('project/notes.md is not empty — drain durable entries to their canonical home');
  }
  return { ok: findings.length === 0, findings, warnings };
}

// ---- config writers ----
export function setMode(cwd = process.cwd(), mode) {
  if (!MODES.includes(mode)) throw new Error(`Invalid mode "${mode}". Valid: ${MODES.join(', ')}`);
  const config = requireConfig(cwd);
  config.mode = mode;
  saveConfig(cwd, config);
  return config;
}

export function addRepo(cwd = process.cwd(), { name, kind, remote }) {
  if (!name) throw new Error('Repo name is required.');
  if (!SURFACE_KINDS.includes(kind)) throw new Error(`Invalid kind "${kind}". Valid: ${SURFACE_KINDS.join(', ')}`);
  const config = requireConfig(cwd);
  config.repos[name] = { kind, remote: remote ?? null };
  saveConfig(cwd, config);
  return config;
}

export function removeRepo(cwd = process.cwd(), name) {
  const config = requireConfig(cwd);
  delete config.repos[name];
  saveConfig(cwd, config);
  const local = loadLocalRepos(cwd);
  if (local[name] !== undefined) { delete local[name]; saveLocalRepos(cwd, local); }
  return config;
}

export function bindRepo(cwd = process.cwd(), name, repoPath) {
  const config = requireConfig(cwd);
  if (!config.repos[name]) throw new Error(`No registered repo "${name}". Register it with workspace-add first.`);
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

export function listRepos(cwd = process.cwd()) {
  const config = loadConfig(cwd);
  const local = loadLocalRepos(cwd);
  const out = {};
  for (const [name, entry] of Object.entries(config?.repos ?? {})) {
    out[name] = { kind: entry.kind, remote: entry.remote ?? null, path: local[name] ?? null, bound: Boolean(local[name]) };
  }
  return out;
}

export function setPrototypeTopology(cwd = process.cwd(), topology) {
  if (!PROTOTYPE_TOPOLOGIES.includes(topology)) {
    throw new Error(`Invalid topology "${topology}". Valid: ${PROTOTYPE_TOPOLOGIES.join(', ')}`);
  }
  const config = requireConfig(cwd);
  config.prototypeTopology = topology;
  saveConfig(cwd, config);
  return config;
}

export function setPrototypeHome(cwd = process.cwd(), { repo, subpath }) {
  const config = requireConfig(cwd);
  config.prototype = { repo: repo ?? null, subpath: subpath ?? null };
  saveConfig(cwd, config);
  return config;
}

export function confirmPreflight(cwd = process.cwd()) {
  const config = requireConfig(cwd);
  config.preflight = { skillsConfirmed: true, confirmedAt: new Date().toISOString() };
  saveConfig(cwd, config);
  return config;
}

// ---- migrate v2 state.json -> v3 config.json ----
export function migrate(cwd = process.cwd()) {
  if (loadConfig(cwd)) {
    if (!fs.existsSync(path.join(cwd, LEGACY_STATE_FILE))) return { migrated: false, reason: 'already migrated' };
  }
  const legacy = path.join(cwd, LEGACY_STATE_FILE);
  if (!fs.existsSync(legacy)) return { migrated: false, reason: 'no legacy state.json' };
  let old;
  try { old = JSON.parse(fs.readFileSync(legacy, 'utf-8')); }
  catch (e) { throw new Error(`legacy state.json is not valid JSON: ${e.message}`); }
  const config = defaultConfig();
  config.docHome = old.docHome ?? 'docs';
  config.mode = old.mode ?? 'single';
  config.repos = old.repos ?? {};
  config.prototypeTopology = old.prototypeTopology ?? 'colocated';
  config.prototype = old.prototype ?? { repo: null, subpath: null };
  config.preflight = old.preflight ?? { skillsConfirmed: false, confirmedAt: null };
  if (old.createdAt) config.createdAt = old.createdAt;
  saveConfig(cwd, config);
  fs.rmSync(legacy);
  return { migrated: true };
}

// ---- CLI ----
function parseFlags(args) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--milestone') flags.milestone = Number(args[++i]);
    else if (args[i] === '--feature') flags.feature = args[++i];
    else if (args[i] === '--doc-home') flags.docHome = args[++i];
    else if (args[i] === '--repo') flags.repo = args[++i];
    else if (args[i] === '--kind') flags.kind = args[++i];
    else if (args[i] === '--remote') flags.remote = args[++i];
    else if (args[i] === '--subpath') flags.subpath = args[++i];
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
      initConfig(cwd, { docHome: flags.docHome ?? 'docs' });
      console.log('Initialized project/config.json');
      break;
    case 'read':
      console.log(JSON.stringify(loadConfig(cwd), null, 2));
      break;
    case 'status':
      console.log(statusReport(cwd));
      break;
    case 'next':
      console.log(JSON.stringify(nextStage(cwd, { milestone: flags.milestone })));
      break;
    case 'gate': {
      const [stage] = rest;
      const result = gate(cwd, stage, flags);
      console.log(JSON.stringify(result, null, 2));
      if (!result.pass) process.exitCode = 1;
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
    case 'migrate': {
      const r = migrate(cwd);
      console.log(r.migrated ? 'migrated project/state.json -> project/config.json' : `nothing to migrate (${r.reason})`);
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
    case 'workspace-mode':
      setMode(cwd, rest[0]);
      console.log(`mode = ${rest[0]}`);
      break;
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
    case 'workspace-remove':
      removeRepo(cwd, rest[0]);
      console.log(`removed repo "${rest[0]}"`);
      break;
    case 'workspace-list':
      console.log(JSON.stringify(listRepos(cwd), null, 2));
      break;
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
    case 'prototype-topology':
      setPrototypeTopology(cwd, rest[0]);
      console.log(`prototype topology = ${rest[0]}`);
      break;
    case 'prototype-home': {
      const c = setPrototypeHome(cwd, { repo: flags.repo, subpath: flags.subpath });
      console.log(`prototype home = repo:${c.prototype.repo ?? '(orchestration)'} subpath:${c.prototype.subpath ?? '(root)'}`);
      break;
    }
    default:
      console.error('Usage: adhd-state.mjs <init|read|status|next|gate|validate|audit|migrate|session-add|session-reset|preflight-confirm|workspace-mode|workspace-add|workspace-remove|workspace-list|repo-bind|repo-unbind|prototype-topology|prototype-home>');
      process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main(process.argv.slice(2));
}
