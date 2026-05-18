# Multi-mode Domains Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user-defined domains to the adhd skill's `multi` mode, decouple repo local paths from committed state, and widen the no-argument invocation into an orient → validate → route check.

**Architecture:** Domains are logical product slices stored in a new `domains` registry in `state.json`; milestones and surfaces gain domain tags. The repo registry is split into a committed logical part (`state.json`) and a gitignored local-path part (`project/repos.local.json`). A new `validate` subcommand performs a read-only health check. All domain machinery is `multi`-mode only. The glossary file `docs/DOMAIN.md` is renamed to `docs/GLOSSARY.md` so "domain" means only the structural slice.

**Tech Stack:** Node.js (v18+), built-in `node:test` runner. No external dependencies.

**Spec:** `reference/2026-05-18-adhd-domains-design.md`.

**Working directory:** all commands assume the current directory is the skill root `/Users/oanogin/.claude/skills/adhd`.

---

## File Structure

- `scripts/adhd-state.mjs` — all state/CLI logic. Modified throughout (Tasks 1–8).
- `scripts/adhd-state.test.mjs` — the test suite. New tests added per task; the existing repo tests are rewritten in Task 3.
- `SKILL.md` — router doc. Modified in Task 9.
- `README.md` — modified in Task 10.
- `reference/setup.md`, `reference/map.md`, `reference/workspace.md`, `reference/surface-overview.md` — modified in Task 11.
- `reference/design.md`, `reference/prototype.md`, `reference/tracer.md`, `reference/build.md`, `reference/review.md` — modified in Task 12.

Run the full suite at any point with:

```bash
node --test scripts/adhd-state.test.mjs
```

Run a single test with:

```bash
node --test --test-name-pattern="<test name>" scripts/adhd-state.test.mjs
```

---

## Task 1: Rename the glossary in the gate definition

`docs/DOMAIN.md` becomes `docs/GLOSSARY.md`. The only code reference is the `surface-overview` gate.

**Files:**
- Modify: `scripts/adhd-state.mjs` (`STAGE_GATES`, line 34)
- Test: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing test**

Add this test to `scripts/adhd-state.test.mjs` (after the existing `gate(milestone-ux)` test):

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --test-name-pattern="gate\\(surface-overview\\) needs" scripts/adhd-state.test.mjs`
Expected: FAIL — `before.missing` contains `docs/DOMAIN.md`, not `docs/GLOSSARY.md`.

- [ ] **Step 3: Update the gate definition**

In `scripts/adhd-state.mjs`, change the `surface-overview` line of `STAGE_GATES`:

```js
  'surface-overview': { files: ['project/map.md', '{docHome}/GLOSSARY.md'],          stages: [] },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --test-name-pattern="gate\\(surface-overview\\) needs" scripts/adhd-state.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/adhd-state.mjs scripts/adhd-state.test.mjs
git commit -m "feat: rename domain glossary gate to GLOSSARY.md"
```

---

## Task 2: Domain registry

A new `domains` registry in `state.json` plus `addDomain` / `removeDomain` / `listDomains`.

**Files:**
- Modify: `scripts/adhd-state.mjs` (`defaultState`, new functions, CLI imports unaffected)
- Test: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing tests**

Add `addDomain, removeDomain, listDomains` to the import block at the top of `scripts/adhd-state.test.mjs`. Then add these tests:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test --test-name-pattern="domain" scripts/adhd-state.test.mjs`
Expected: FAIL — `addDomain` is not exported / `defaultState().domains` is undefined.

- [ ] **Step 3: Implement the domain registry**

In `scripts/adhd-state.mjs`, add `domains: {}` to the object returned by `defaultState()`, immediately after `repos: {}`:

```js
    mode: 'single',
    repos: {},
    domains: {},
```

Then add these exported functions (place them after `setMode`):

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test --test-name-pattern="domain" scripts/adhd-state.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/adhd-state.mjs scripts/adhd-state.test.mjs
git commit -m "feat: add domain registry to adhd state"
```

---

## Task 3: Split the repo registry

`state.json` keeps a logical repo entry (`{ kind, remote }`); local paths move to a gitignored `project/repos.local.json`. `addRepo` no longer takes a path; new `bindRepo` / `unbindRepo` / `migrateRepos` manage local paths; `listRepos` reports binding status.

**Files:**
- Modify: `scripts/adhd-state.mjs` (`addRepo`, `removeRepo`, `listRepos`, new functions/constants)
- Test: `scripts/adhd-state.test.mjs` (rewrite the existing repo tests)

- [ ] **Step 1: Rewrite the repo tests**

In `scripts/adhd-state.test.mjs`, add `bindRepo, unbindRepo, migrateRepos` to the import block. Then **delete** the existing tests named:
- `'addRepo registers a repo with absolute path and kind'`
- `'addRepo rejects a missing path, a non-git path, and a bad kind'`
- `'removeRepo deletes a registered repo'`
- `'listRepos returns the registry'`

And **replace** the test `'setMode / addRepo throw a clear error when no state.json'` and add the new repo tests. Final set of repo tests:

```js
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

test('setMode / addRepo throw a clear error when no state.json', () => {
  assert.throws(() => setMode(tmp(), 'multi'), /adhd setup/);
  assert.throws(() => addRepo(tmp(), { name: 'x', kind: 'api' }), /adhd setup/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test --test-name-pattern="[Rr]epo" scripts/adhd-state.test.mjs`
Expected: FAIL — `bindRepo` not exported; `addRepo` still expects `repoPath`.

- [ ] **Step 3: Implement the split registry**

In `scripts/adhd-state.mjs`, add this constant near `STATE_FILE` (line 7):

```js
export const LOCAL_REPOS_FILE = 'project/repos.local.json';
```

Add these helpers (place them just above `addRepo`, next to `isGitRepo`):

```js
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
```

Replace the existing `addRepo`, `removeRepo`, and `listRepos` functions with:

```js
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
  for (const entry of Object.entries(state.repos)) {
    const [name, repo] = entry;
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test --test-name-pattern="[Rr]epo" scripts/adhd-state.test.mjs`
Expected: PASS (all repo tests). Also run the full suite — `node --test scripts/adhd-state.test.mjs` — and confirm no other test broke.

- [ ] **Step 5: Commit**

```bash
git add scripts/adhd-state.mjs scripts/adhd-state.test.mjs
git commit -m "feat: split repo registry into committed logical and gitignored local parts"
```

---

## Task 4: Milestone domain tags

Each milestone gains a `domains` array; `setMilestoneDomains` sets it.

**Files:**
- Modify: `scripts/adhd-state.mjs` (`ensureMilestone`, new `setMilestoneDomains`)
- Test: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing tests**

Add `setMilestoneDomains` to the import block. Add these tests:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test --test-name-pattern="domains|milestone has an empty" scripts/adhd-state.test.mjs`
Expected: FAIL — `setMilestoneDomains` not exported; `.domains` undefined.

- [ ] **Step 3: Implement milestone domains**

In `scripts/adhd-state.mjs`, in `ensureMilestone`, add `domains: []` to the new-milestone object literal:

```js
    state.milestones[key] = {
      title: null,
      track: null,
      domains: [],
      stages: Object.fromEntries(
        MILESTONE_STAGES.map((s) => [s, { status: 'blocked', effort: STAGE_EFFORT[s] }]),
      ),
      surfaces: {},
    };
```

And add a backfill line in `ensureMilestone`, next to the existing `if (m.track === undefined)` line:

```js
  if (m.track === undefined) m.track = null;
  if (m.domains === undefined) m.domains = [];
```

Add this exported function after `setMilestoneTrack`:

```js
export function setMilestoneDomains(cwd = process.cwd(), { milestone, domains }) {
  const state = loadState(cwd);
  if (!state) throw new Error('No state.json — run `adhd setup` first.');
  const m = milestone ?? state.currentMilestone;
  ensureMilestone(state, m).domains = domains;
  state.currentMilestone = m;
  saveState(cwd, state);
  return state;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test --test-name-pattern="domains|milestone has an empty" scripts/adhd-state.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/adhd-state.mjs scripts/adhd-state.test.mjs
git commit -m "feat: add domain tags to milestones"
```

---

## Task 5: Surface domain tags and subpath

Each surface gains a `domains` array and a `subpath` field; `setSurfaceMeta` accepts both.

**Files:**
- Modify: `scripts/adhd-state.mjs` (`ensureSurface`, `setSurfaceMeta`)
- Test: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing tests**

Add these tests:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test --test-name-pattern="surface has empty domains|setSurfaceMeta sets domains" scripts/adhd-state.test.mjs`
Expected: FAIL — `surf.domains` undefined; `setSurfaceMeta` ignores `domains`/`subpath`.

- [ ] **Step 3: Implement surface domains and subpath**

In `scripts/adhd-state.mjs`, in `ensureSurface`, set the new fields on a freshly-created surface (next to `surf.repo = null; surf.kind = null;`):

```js
    surf.repo = null;
    surf.subpath = null;
    surf.kind = null;
    surf.domains = [];
    m.surfaces[name] = surf;
```

And add backfill lines next to the existing `if (surf.repo === undefined)` block:

```js
  if (surf.repo === undefined) surf.repo = null;
  if (surf.subpath === undefined) surf.subpath = null;
  if (surf.kind === undefined) surf.kind = null;
  if (surf.domains === undefined) surf.domains = [];
```

In `setSurfaceMeta`, extend the destructured argument and the assignments:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test --test-name-pattern="surface has empty domains|setSurfaceMeta sets domains" scripts/adhd-state.test.mjs`
Expected: PASS (2 tests). Run the full suite to confirm the existing `'a new surface has null repo and null kind'` and `'setSurfaceMeta sets repo and kind'` tests still pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/adhd-state.mjs scripts/adhd-state.test.mjs
git commit -m "feat: add domain tags and subpath to surfaces"
```

---

## Task 6: The `validate` health check

A read-only function that reports config/state blockers and warnings.

**Files:**
- Modify: `scripts/adhd-state.mjs` (new `validate` function)
- Test: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing tests**

Add `validate` to the import block. Add these tests:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test --test-name-pattern="validate" scripts/adhd-state.test.mjs`
Expected: FAIL — `validate` is not exported.

- [ ] **Step 3: Implement `validate`**

In `scripts/adhd-state.mjs`, add this exported function after `statusReport`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test --test-name-pattern="validate" scripts/adhd-state.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/adhd-state.mjs scripts/adhd-state.test.mjs
git commit -m "feat: add validate health check to adhd state"
```

---

## Task 7: Per-domain milestone roadmap in `statusReport`

In `multi` mode, `statusReport` appends a per-domain milestone list.

**Files:**
- Modify: `scripts/adhd-state.mjs` (`statusReport`)
- Test: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing tests**

Add these tests:

```js
test('statusReport lists per-domain milestones in multi mode', () => {
  const cwd = tmp();
  initState(cwd);
  setMode(cwd, 'multi');
  addDomain(cwd, { name: 'auth', description: 'x' });
  setMilestoneDomains(cwd, { milestone: 1, domains: ['auth'] });
  const out = statusReport(cwd);
  assert.match(out, /Per-domain milestones/);
  assert.match(out, /auth: M1/);
});

test('statusReport omits the per-domain section in single mode', () => {
  const cwd = tmp();
  initState(cwd);
  assert.doesNotMatch(statusReport(cwd), /Per-domain milestones/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test --test-name-pattern="per-domain milestones|omits the per-domain" scripts/adhd-state.test.mjs`
Expected: FAIL — no `Per-domain milestones` section in output.

- [ ] **Step 3: Implement the roadmap section**

In `scripts/adhd-state.mjs`, in `statusReport`, insert this block immediately before `const next = nextStage(cwd);`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test --test-name-pattern="per-domain milestones|omits the per-domain" scripts/adhd-state.test.mjs`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/adhd-state.mjs scripts/adhd-state.test.mjs
git commit -m "feat: show per-domain milestone roadmap in adhd status"
```

---

## Task 8: CLI wiring

Wire all new/changed functions into the `adhd-state.mjs` CLI. The CLI is not unit-tested (consistent with the existing code); verify with the full test suite plus a manual smoke test.

**Files:**
- Modify: `scripts/adhd-state.mjs` (`parseFlags`, `main`)

- [ ] **Step 1: Extend `parseFlags`**

In `scripts/adhd-state.mjs`, replace the body of `parseFlags` with:

```js
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
```

- [ ] **Step 2: Update the `workspace-add` and `surface-meta` cases, and add the new cases**

In `main`, replace the `workspace-add` case with:

```js
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
```

Replace the `surface-meta` case with:

```js
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
```

Update the `default` usage string to list the new subcommands:

```js
    default:
      console.error('Usage: adhd-state.mjs <init|read|status|next|set|gate|validate|session-add|session-reset|preflight-confirm|advance-milestone|workspace-mode|workspace-add|workspace-remove|workspace-list|repo-bind|repo-unbind|migrate-repos|domain-add|domain-remove|domain-list|milestone-track|milestone-domains|surface-meta>');
      process.exitCode = 1;
```

- [ ] **Step 3: Verify the full suite still passes**

Run: `node --test scripts/adhd-state.test.mjs`
Expected: PASS — all tests green.

- [ ] **Step 4: Smoke-test the CLI**

Run these commands and confirm the described output:

```bash
SKILL=/Users/oanogin/.claude/skills/adhd
D=$(mktemp -d) && cd "$D"
node "$SKILL/scripts/adhd-state.mjs" init
node "$SKILL/scripts/adhd-state.mjs" workspace-mode multi
node "$SKILL/scripts/adhd-state.mjs" workspace-add backend api --remote git@github.com:x/backend.git
node "$SKILL/scripts/adhd-state.mjs" validate           # expect: BLOCKER about repo "backend" not bound; validate: blocked
node "$SKILL/scripts/adhd-state.mjs" domain-add auth --description "sign-in and sessions"
node "$SKILL/scripts/adhd-state.mjs" domain-list        # expect: { "auth": { "description": "sign-in and sessions" } }
node "$SKILL/scripts/adhd-state.mjs" milestone-domains auth --milestone 1
node "$SKILL/scripts/adhd-state.mjs" status             # expect: a "Per-domain milestones:" section listing "auth: M1"
cd - && rm -rf "$D"
```

Expected: `validate` prints a `BLOCKER` line naming `backend` and exits blocked; `status` shows the `Per-domain milestones:` section.

- [ ] **Step 5: Commit**

```bash
git add scripts/adhd-state.mjs
git commit -m "feat: wire domain, repo-binding, and validate subcommands into the CLI"
```

---

## Task 9: Update `SKILL.md`

**Files:**
- Modify: `SKILL.md`

- [ ] **Step 1: Make the edits**

Apply all of the following to `SKILL.md`:

1. **Modes section** — in the `multi` bullet, change "code repos are registered by absolute local path" to "code repos are registered by logical name; their local paths live in a gitignored `project/repos.local.json`". Add a sentence: "In `multi` mode the product is also split into user-defined **domains** — logical product slices defined during the `map` stage."

2. **Canonical layout block** — rename `docs/DOMAIN.md` to `docs/GLOSSARY.md` and update its comment to `domain glossary (concepts + relationships) — Map output`. Add under `project/`:
   ```
   repos.local.json           gitignored — per-user repo→path bindings (multi mode)
   ```

3. **Stages table** — in the `map` row, change the Output column from `project/map.md`, `docs/DOMAIN.md` to `project/map.md`, `docs/GLOSSARY.md`. The `map` row Loop/Effort are unchanged.

4. **Surface kinds section** — after the existing `surface-meta` line, add: "In `multi` mode a surface also carries one or more `domains` (logical slices) and an optional `subpath` within its repo. Set them with `--domain <d1,d2>` and `--subpath <path>` on `surface-meta`."

5. **Routing section, rule 1** — replace the "No argument" rule with:
   > 1. **No argument** — orient, validate, route. Run `adhd-state.mjs status` and `adhd-state.mjs validate`; print both. State where the project sits in the flow and restate user intent in one line. If `validate` reports blockers, name the fix and HALT. Otherwise name the next runnable stage. Stop.

6. **Scripts block** — update the `adhd-state.mjs` subcommand list to include `validate`, `repo-bind`, `repo-unbind`, `migrate-repos`, `domain-add`, `domain-remove`, `domain-list`, and `milestone-domains`.

7. Search `SKILL.md` for any remaining `DOMAIN.md` and change each to `GLOSSARY.md`.

- [ ] **Step 2: Verify no stale references remain**

Run: `grep -n "DOMAIN.md\|absolute local path" SKILL.md`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add SKILL.md
git commit -m "docs: document domains, split repo registry, and no-arg validate in SKILL.md"
```

---

## Task 10: Update `README.md`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Make the edits**

Apply all of the following to `README.md`:

1. **Modes section** — in the `multi` bullet, change "code repos are registered by local path" to "code repos are registered by logical name; local paths live in a gitignored `project/repos.local.json` and are bound per-user. The product is split into user-defined **domains** — logical slices defined in the `map` stage; a milestone may span several domains."

2. **The flow / stages table** — in the `map` row, change `docs/DOMAIN.md` to `docs/GLOSSARY.md`.

3. **"What it creates in your project" block** — rename `DOMAIN.md` to `GLOSSARY.md` in the `docs/` line. Add to the `project/` block:
   ```
   repos.local.json       gitignored — per-user repo→path bindings (multi mode)
   ```

4. **"Rules worth knowing" / notes.md bullet** — change `DOMAIN.md` to `GLOSSARY.md`.

5. Search `README.md` for any remaining `DOMAIN.md` and change each to `GLOSSARY.md`.

- [ ] **Step 2: Verify no stale references remain**

Run: `grep -n "DOMAIN.md" README.md`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document domains and split repo registry in README"
```

---

## Task 11: Update the front-load reference files

**Files:**
- Modify: `reference/setup.md`, `reference/map.md`, `reference/workspace.md`, `reference/surface-overview.md`

- [ ] **Step 1: Update `reference/setup.md`**

In step 4 ("Configure `.gitignore`"), add `project/repos.local.json` to the files appended to `.gitignore`. Change the sentence to: "Append `.superpowers/` and `project/repos.local.json` to `.gitignore`". In the Output section's `.gitignore` bullet, note both entries. Keep the existing rule that `project/` itself stays tracked — only the single file `project/repos.local.json` is ignored.

- [ ] **Step 2: Update `reference/map.md`**

1. Change Output (header and the Output section) from `docs/DOMAIN.md` to `docs/GLOSSARY.md`, everywhere it appears.
2. In step 1, change the `multi`-mode tagging instruction to use domains: "in `multi` mode, record the `domains` it belongs to and its physical location (`repo` + optional `subpath`), with `node {{scripts_path}}/adhd-state.mjs surface-meta <name> --milestone <N> --domain <d1,d2> --kind <kind> [--repo <r>] [--subpath <p>]`. An `api`/`lib` surface defaults its location from its domain's `home`; a shared-UI surface gets an explicit `--repo`."
3. Add a new procedure step 2 ("Define domains — `multi` mode only") before the glossary step: "With the user, decompose the product into logical domains — each a named slice with a one-line description and an optional `home` (`repo` + `subpath`) for its backend code. Register each with `node {{scripts_path}}/adhd-state.mjs domain-add <name> --description <text> [--home-repo <r>] [--home-subpath <p>]`. Then walk the milestone list and tag each milestone with the domains it touches: `node {{scripts_path}}/adhd-state.mjs milestone-domains <d1,d2,...> --milestone <N>`. In `single` mode skip this step." Renumber the following steps.
4. In the Output section, add: "In `multi` mode, `map.md` also has a **Domains** section listing each domain, its description, and its `home`; and each milestone heading notes the domains it touches."
5. Search the file for any remaining `DOMAIN.md` and change to `GLOSSARY.md`.

- [ ] **Step 3: Update `reference/workspace.md`**

1. Step 3 ("Register repos") — change to register *logical* repos: "collect a logical name and a `kind` (`ui`/`api`/`lib`); optionally a git remote URL. Register with `node {{scripts_path}}/adhd-state.mjs workspace-add <name> <kind> [--remote <url>]`. No local path is stored in `state.json`."
2. Add a new step 4 ("Bind local paths"): "For each registered repo, bind its absolute local path with `node {{scripts_path}}/adhd-state.mjs repo-bind <name> <path>`. The command rejects a path that does not exist or is not a git repository. Bindings are written to `project/repos.local.json`, which is gitignored and per-user — on a fresh clone every repo starts unbound and must be re-bound here. Unbind with `repo-unbind <name>`." Renumber following steps.
3. Add a migration note: "A project created before the split stores repo paths inside `state.json`. On the first `workspace` run after upgrading, run `node {{scripts_path}}/adhd-state.mjs migrate-repos` — it moves each inline path into `project/repos.local.json` and strips it from the committed entry."
4. In the management step, note that `workspace-list` now shows each repo's `bound`/`unbound` status, and the user should bind any `unbound` repo.

- [ ] **Step 4: Update `reference/surface-overview.md`**

1. Change the Gate line and the gate-check text from `docs/DOMAIN.md` to `docs/GLOSSARY.md`.
2. In procedure step 1, change the `multi`-mode tagging to use domains, matching `map.md`: "in `multi` mode, confirm/refine the surface's `domains` and physical location with `node {{scripts_path}}/adhd-state.mjs surface-meta <name> --milestone {{N}} --domain <d1,d2> --kind <kind> [--repo <r>] [--subpath <p>]`."
3. Search the file for any remaining `DOMAIN.md` and change to `GLOSSARY.md`.

- [ ] **Step 5: Verify and commit**

Run: `grep -rn "DOMAIN.md" reference/setup.md reference/map.md reference/workspace.md reference/surface-overview.md`
Expected: no output.

```bash
git add reference/setup.md reference/map.md reference/workspace.md reference/surface-overview.md
git commit -m "docs: update front-load references for domains and split repo registry"
```

---

## Task 12: Update the code-writing and review reference files

**Files:**
- Modify: `reference/design.md`, `reference/prototype.md`, `reference/tracer.md`, `reference/build.md`, `reference/review.md`

- [ ] **Step 1: Update the four code-writing references**

In each of `reference/design.md`, `reference/prototype.md`, `reference/tracer.md`, and `reference/build.md`, add a short paragraph in the procedure (where it describes writing code into a repo, in `multi` mode) stating:

> In `multi` mode, resolve the target location from the surface's `repo` + `subpath`. Look up the repo's absolute local path in `project/repos.local.json`. If the repo is unbound (no entry — e.g. a fresh clone), HALT and tell the user to run `{{command_prefix}}adhd workspace` to bind it. Never guess a path.

- [ ] **Step 2: Update `reference/review.md`**

In the procedure, add: "If the milestone is cross-domain (its `domains` list names more than one domain), check coverage per domain — confirm each participating domain's surfaces were addressed, so nothing in a shared milestone is silently skipped."

- [ ] **Step 3: Repo-wide check for stale glossary references**

Run: `grep -rn "DOMAIN.md" . --include="*.md" --include="*.mjs"`
Expected: no output. If any file still references `DOMAIN.md` (for example `reference/codex-tools.md`, `reference/cursor-tools.md`, or `reference/adopt.md`), change it to `GLOSSARY.md`. Do not change the historical design/plan files dated `2026-05-16` or `2026-05-17`, or this plan and its spec — those are point-in-time records; leave them as written.

- [ ] **Step 4: Commit**

```bash
git add reference/design.md reference/prototype.md reference/tracer.md reference/build.md reference/review.md
git commit -m "docs: route code-writing stages through repo bindings; per-domain review coverage"
```

If Step 3 changed any additional files, stage and commit them too with a `docs:` message.

---

## Final Verification

- [ ] **Run the full test suite**

Run: `node --test scripts/adhd-state.test.mjs`
Expected: PASS — every test green, no failures.

- [ ] **Confirm no stale glossary references in active docs**

Run: `grep -rln "DOMAIN.md" SKILL.md README.md reference/*.md scripts/*.mjs | grep -v "2026-05-1[67]" | grep -v "2026-05-18-adhd-domains"`
Expected: no output.

- [ ] **Confirm the working tree is clean**

Run: `git status`
Expected: clean — all changes committed.
