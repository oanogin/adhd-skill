# `adhd` Multi-Repo Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the `adhd` skill to conduct multi-repo products, handle non-UI surfaces, adopt existing projects, and dispatch free-text tasks — without changing the single-repo flow.

**Architecture:** Additive extension (Approach A). `state.json` gains `mode` (`single`|`multi`) and a `repos` registry; surfaces gain `repo` and `kind`. Two new management commands (`workspace`, `adopt`) are added outside the gated stage flow. Single-repo behavior is the zero-config default and is preserved unchanged.

**Tech Stack:** Markdown skill files; Node.js ESM (`.mjs`, no external deps); `node:test`. Build target: `~/.claude/skills/adhd/`.

**Spec:** `docs/2026-05-17-adhd-multi-repo-design.md` — read it fully before starting.

---

## Conventions

- Run the test suite with the quoted glob `node --test 'scripts/*.test.mjs'` — a bare `scripts/` directory argument fails on Node 24.x.
- Reference files follow the existing template (`## Gate check`, `## Procedure`, `## Output`, `## On completion` for stages; management-command files use `## Procedure` + `## On completion`). Placeholder tokens (`{{command_prefix}}`, `{{scripts_path}}`, `{{N}}`, `{{name}}`) are written literally.
- Each task's commit step runs only after the user's explicit approval is already covered by the execution flow; create the commit as written.

## File structure

```
~/.claude/skills/adhd/
  SKILL.md                       MODIFY — Modes, Surface kinds, management commands, Routing rewrite
  reference/
    workspace.md                 CREATE — workspace command playbook
    adopt.md                     CREATE — adopt command playbook + adoptable-repo guidelines
    design.md                    MODIFY — route by surface kind
    map.md                       MODIFY — tag surfaces with kind + repo
    surface-overview.md           MODIFY — tag surfaces with kind + repo
    milestone-ux.md               MODIFY — optional throwaway prototype
    tracer.md                     MODIFY — multi mode: write slice code in target repo
    build.md                      MODIFY — multi mode: cd into target repo
    setup.md                      MODIFY — note mode defaults to single
  scripts/
    adhd-state.mjs                MODIFY — mode, repos registry, surface kind/repo, CLI verbs
    adhd-state.test.mjs           MODIFY — tests for the above
  README.md                       MODIFY — document modes, workspace, adopt, kinds
  docs/
    2026-05-17-adhd-multi-repo-design.md   (exists)
    2026-05-17-adhd-multi-repo-plan.md     (this file)
```

---

## Task 1: `adhd-state.mjs` — mode, repo registry, surface kind/repo

**Files:**
- Modify: `scripts/adhd-state.mjs`
- Modify: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing tests**

Append to the end of `scripts/adhd-state.test.mjs`. First add `setMode, addRepo, removeRepo, listRepos, setSurfaceMeta, SURFACE_KINDS, MODES` to the existing import list from `./adhd-state.mjs` at the top of the file. Then append:

```js
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

test('addRepo registers a repo with absolute path and kind', () => {
  const cwd = tmp();
  initState(cwd);
  const repo = gitRepo();
  addRepo(cwd, { name: 'repo-a', repoPath: repo, kind: 'api' });
  const repos = loadState(cwd).repos;
  assert.equal(repos['repo-a'].kind, 'api');
  assert.equal(repos['repo-a'].path, path.resolve(repo));
});

test('addRepo rejects a missing path, a non-git path, and a bad kind', () => {
  const cwd = tmp();
  initState(cwd);
  assert.throws(() => addRepo(cwd, { name: 'x', repoPath: '/no/such/path', kind: 'api' }), /does not exist/);
  assert.throws(() => addRepo(cwd, { name: 'x', repoPath: tmp(), kind: 'api' }), /Not a git repository/);
  assert.throws(() => addRepo(cwd, { name: 'x', repoPath: gitRepo(), kind: 'bogus' }), /Invalid kind/);
});

test('removeRepo deletes a registered repo', () => {
  const cwd = tmp();
  initState(cwd);
  addRepo(cwd, { name: 'repo-a', repoPath: gitRepo(), kind: 'lib' });
  removeRepo(cwd, 'repo-a');
  assert.deepEqual(loadState(cwd).repos, {});
});

test('listRepos returns the registry', () => {
  const cwd = tmp();
  initState(cwd);
  addRepo(cwd, { name: 'repo-a', repoPath: gitRepo(), kind: 'ui' });
  assert.deepEqual(Object.keys(listRepos(cwd)), ['repo-a']);
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
  assert.throws(() => addRepo(tmp(), { name: 'x', repoPath: gitRepo(), kind: 'api' }), /adhd setup/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test scripts/adhd-state.test.mjs`
Expected: FAIL — `setMode`, `addRepo`, etc. are not exported / not defined.

- [ ] **Step 3: Apply the implementation edits**

Edit 3a — in `scripts/adhd-state.mjs`, add `mode` and `repos` to `defaultState`. Replace:

```js
  return {
    version: STATE_VERSION,
    docHome: 'docs',
    createdAt: now,
```

with:

```js
  return {
    version: STATE_VERSION,
    docHome: 'docs',
    mode: 'single',
    repos: {},
    createdAt: now,
```

Edit 3b — add two constants. After the line `export const STAGE_STATUSES = ['blocked', 'pending', 'in-progress', 'done'];` add:

```js
export const SURFACE_KINDS = ['ui', 'api', 'lib'];
export const MODES = ['single', 'multi'];
```

Edit 3c — give new surfaces `repo` and `kind`. Replace the `ensureSurface` function:

```js
function ensureSurface(state, n, name) {
  const m = ensureMilestone(state, n);
  if (!m.surfaces[name]) {
    m.surfaces[name] = Object.fromEntries(
      SURFACE_STAGES.map((s) => [s, { status: 'blocked', effort: STAGE_EFFORT[s] }]),
    );
  }
  return m.surfaces[name];
}
```

with:

```js
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
```

Edit 3d — add the new functions. Immediately after the `advanceMilestone` function (before the `// ---- CLI ----` comment) insert:

```js
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
```

Edit 3e — extend `parseFlags`. Replace:

```js
    if (args[i] === '--milestone') flags.milestone = Number(args[++i]);
    else if (args[i] === '--surface') flags.surface = args[++i];
    else if (args[i] === '--doc-home') flags.docHome = args[++i];
    else rest.push(args[i]);
```

with:

```js
    if (args[i] === '--milestone') flags.milestone = Number(args[++i]);
    else if (args[i] === '--surface') flags.surface = args[++i];
    else if (args[i] === '--doc-home') flags.docHome = args[++i];
    else if (args[i] === '--repo') flags.repo = args[++i];
    else if (args[i] === '--kind') flags.kind = args[++i];
    else rest.push(args[i]);
```

Edit 3f — add the CLI cases. In `main`, immediately before the `default:` case insert:

```js
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
```

Edit 3g — update the usage string. Replace:

```js
      console.error('Usage: adhd-state.mjs <init|read|status|next|set|gate|session-add|session-reset|preflight-confirm|advance-milestone>');
```

with:

```js
      console.error('Usage: adhd-state.mjs <init|read|status|next|set|gate|session-add|session-reset|preflight-confirm|advance-milestone|workspace-mode|workspace-add|workspace-remove|workspace-list|surface-meta>');
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test scripts/adhd-state.test.mjs`
Expected: PASS — all tests (the original 31 plus the 10 new) green.

- [ ] **Step 5: Commit**

```bash
git add scripts/adhd-state.mjs scripts/adhd-state.test.mjs
git commit -m "feat: add multi-repo mode, repo registry, and surface kind to adhd-state"
```

---

## Task 2: `SKILL.md` — modes, surface kinds, management commands, routing

**Files:**
- Modify: `SKILL.md`

- [ ] **Step 1: Add the Modes section**

Insert this section immediately after the `## Required-skill preflight (non-optional)` section and before `## Canonical layout`:

```markdown
## Modes

`adhd` runs in one of two modes, recorded in `project/state.json`:

- **`single`** (default) — `project/` lives at the repo root; all work happens in
  this one repo. `setup` always scaffolds in `single` mode; nothing extra to do.
- **`multi`** — the `project/` tree lives in the repo where `setup` ran (the
  **orchestration repo**); code repos are registered by absolute local path.
  Switch to `multi` and register repos with the `workspace` command.

In `multi` mode every `adhd` artifact still lives in the orchestration repo's
`project/` and `docs/`. Only the `tracer` and `build` stages reach into a
registered code repo, and only to write code there. A `state.json` written before
this feature (no `mode` / `repos` fields) is treated as `single` with an empty
registry.
```

- [ ] **Step 2: Add the Surface kinds section**

Insert immediately after the `## Stages` section (after the "Flow:" / "After a milestone's `review`" paragraphs) and before `## Hard gates`:

```markdown
## Surface kinds

Every surface has a `kind` — `ui`, `api`, or `lib` — assigned during `map` and
`surface-overview`. The `design` stage routes by it:

- `ui` — brainstorming for UX, then `impeccable` for UI.
- `api` — brainstorming for behavior and contract semantics, then API-contract
  design (protobuf, OpenAPI, or similar). `impeccable` is not invoked.
- `lib` — brainstorming for responsibility and public interface, then a spec only.

In `multi` mode each surface is also tagged with the registered `repo` it is built
in. `map` and `surface-overview` record both with
`node {{scripts_path}}/adhd-state.mjs surface-meta <name> --milestone {{N}} --repo <repo> --kind <kind>`.
```

- [ ] **Step 3: Add the Management commands section**

Insert immediately before the `## Routing` section:

```markdown
## Management commands

These are not stages — they have no gates and no place in the stage flow:

- `workspace` — switch a project to `multi` mode and register code repos. See
  [reference/workspace.md](reference/workspace.md).
- `adopt` — bring an existing project under `adhd`; substitutes for the front-load
  loop. See [reference/adopt.md](reference/adopt.md).
```

- [ ] **Step 4: Rewrite the Routing section**

Replace the entire current `## Routing` section (the numbered list of 3 routing rules and the trailing `If state.json does not exist...` line) with:

```markdown
## Routing

1. **No argument** — run `adhd-state.mjs status`, print it, name the next runnable
   stage. Stop.
2. **First word is a stage or a management command** — the 13 stages are in the
   table above; `workspace` and `adopt` are management commands. Load the matching
   `reference/<name>.md` and follow it exactly. The reference owns the gate check
   (stages), the procedure, and the completion steps.
3. **First word matches nothing** — treat the whole input as a task description.
   Run `adhd-state.mjs status`, then select the stage or management command that
   fits the task, gate-aware:
   - route the task to the stage that addresses it (e.g. "this API needs
     designing" → `design` for that surface);
   - if the task implies skipping ahead, name the gate blocking it instead of
     running it;
   - if it is a new feature idea raised mid-project, file it to `features.md` and
     apply the milestone-discipline soft-warn;
   - state the routing decision, then proceed — confirming with the user first
     when the task is ambiguous or the action mutates files.

If `state.json` does not exist, the only runnable stage is `setup`.
```

- [ ] **Step 5: Update the Scripts section**

In the `## Scripts` section, replace the `adhd-state.mjs` usage line:

```bash
node {{scripts_path}}/adhd-state.mjs <init|read|status|next|set|gate|session-add|session-reset|preflight-confirm|advance-milestone>
```

with:

```bash
node {{scripts_path}}/adhd-state.mjs <init|read|status|next|set|gate|session-add|session-reset|preflight-confirm|advance-milestone|workspace-mode|workspace-add|workspace-remove|workspace-list|surface-meta>
```

- [ ] **Step 6: Verify and commit**

Run: `node -e "const t=require('node:fs').readFileSync('SKILL.md','utf8'); for(const h of ['## Modes','## Surface kinds','## Management commands','## Routing']) if(!t.includes(h)) throw new Error('missing '+h); if(!t.includes('reference/workspace.md')||!t.includes('reference/adopt.md')) throw new Error('command links missing'); if(/TBD|FIXME|\[TODO\]/.test(t)) throw new Error('placeholder'); console.log('SKILL.md ok');"`
Expected: `SKILL.md ok`

```bash
git add SKILL.md
git commit -m "feat: document modes, surface kinds, and management commands in adhd SKILL.md"
```

---

## Task 3: `reference/workspace.md` — the workspace command playbook

**Files:**
- Create: `reference/workspace.md`

- [ ] **Step 1: Write `reference/workspace.md`**

Write the file with this exact content:

```markdown
# adhd — workspace (management command)

**Effort:** low
**Purpose:** switch a project to `multi` mode and manage the registered code repos.
**Not a stage:** no gate, no place in the stage flow. Run it any time.

## Procedure

1. **Read current state.** Run `node {{scripts_path}}/adhd-state.mjs read` and note
   the `mode` and `repos` fields.
2. **Mode.** If `mode` is `single`, explain that multi-repo support requires
   `multi` mode and ask the user to confirm the switch. On confirmation, run
   `node {{scripts_path}}/adhd-state.mjs workspace-mode multi`.
3. **Register repos.** For each code repo the product spans, collect from the user:
   a logical name, an absolute local path to the already-cloned repo, and a `kind`
   (`ui` for a frontend repo, `api` for a backend/API repo, `lib` for a
   shared-library repo). Register each with
   `node {{scripts_path}}/adhd-state.mjs workspace-add <name> <path> <kind>`.
   The command rejects a path that does not exist or is not a git repository —
   relay the error and ask the user to correct it.
4. **Manage.** On a later run, show the current registry with
   `node {{scripts_path}}/adhd-state.mjs workspace-list`. Add repos as above;
   remove one with `node {{scripts_path}}/adhd-state.mjs workspace-remove <name>`.
   To change a repo, remove and re-add it.
5. **Orchestration repo.** The `project/` tree and `state.json` stay in the repo
   where `setup` ran. That orchestration repo may itself be one of the registered
   code repos, or a dedicated docs-only repo — either is fine.

## On completion

1. Confirm the resulting `mode` and registry back to the user
   (`node {{scripts_path}}/adhd-state.mjs workspace-list`).
2. Point the user at the next runnable stage, or at `adopt` if they are bringing an
   existing project under `adhd`.
```

- [ ] **Step 2: Verify**

Run: `node -e "const t=require('node:fs').readFileSync('reference/workspace.md','utf8'); for(const h of ['## Procedure','## On completion']) if(!t.includes(h)) throw new Error('missing '+h); if(!t.includes('workspace-add')) throw new Error('missing verb'); if(/TBD|FIXME|\[TODO\]/.test(t)) throw new Error('placeholder'); console.log('workspace.md ok');"`
Expected: `workspace.md ok`

- [ ] **Step 3: Commit**

```bash
git add reference/workspace.md
git commit -m "feat: add adhd workspace command reference"
```

---

## Task 4: `reference/adopt.md` — the adopt command playbook

**Files:**
- Create: `reference/adopt.md`

- [ ] **Step 1: Write `reference/adopt.md`**

Write the file with this exact content:

```markdown
# adhd — adopt (management command)

**Effort:** high
**Purpose:** bring an existing, already-built project under `adhd`. Substitutes for
the front-load loop (`vision → features → milestones → map`).
**Not a stage:** no gate. Run it once, instead of the front-load stages, when the
project already exists.

## adhd-adoptable repo guidelines

A repo is `adhd`-adoptable when:

- It is a git repository.
- It has one clear responsibility — a single product domain, or a single UI — or it
  is a monorepo registered as one repo.
- Its own reference documentation (architecture, data model, operations) lives in
  the repo's own `docs/`.
- It contains no `adhd` workflow artifacts. `project/`, surface specs, plans, and
  `state.json` live only in the orchestration repo. A code repo is a build target,
  never an `adhd` workspace — unless it is itself the orchestration repo.

If a target repo does not meet these guidelines, note the cleanup as its own
milestone or a `docs/DECISIONS.md` entry. `adopt` does not block on it.

## Procedure

1. **Preconditions.** `project/state.json` must exist (run `setup` first). In
   `multi` mode, the code repos must already be registered (run `workspace` first).
2. **Scan.** Read the existing documentation across the target repo(s) — product
   docs, decision logs, architecture and invariants files, per-module `docs/`,
   READMEs. In `multi` mode, scan every registered repo at its `repos[*].path`.
3. **Draft and confirm, one artifact at a time.** For each front-load artifact
   below, draft the `adhd`-style version from what the scan found and present it to
   the user for review before writing:
   - `docs/PRODUCT.md` — product, users, usage, brand, anti-references, principles.
   - `docs/DOMAIN.md` — entities, key fields, relationships.
   - `docs/DECISIONS.md` — carry over the existing decision log.
   - `project/features.md` — the feature inventory.
   - `project/milestones.md` — the milestone grouping.
   - `project/map.md` — the surface sitemap.
4. **Never invent.** Where the source docs do not cover something (for example, no
   explicit milestone breakdown exists), flag the gap and ask the user — do not
   fabricate vision, scope, or milestones. Same discipline as the `vision` stage.
5. **Record completion.** After the user confirms each artifact, write the
   canonical file, then mark the matching front-load stage `done`:
   `node {{scripts_path}}/adhd-state.mjs set vision done`,
   `... set features done`, `... set milestones done`, `... set map done`.
   (`setup` is already `done` once `state.json` exists.)

## On completion

1. Confirm all five front-load stages are `done`
   (`node {{scripts_path}}/adhd-state.mjs status`).
2. The project now resumes at the per-milestone loop exactly as a front-loaded
   project would. Tell the user the next runnable stage is `surface-overview` for
   milestone 1.
```

- [ ] **Step 2: Verify**

Run: `node -e "const t=require('node:fs').readFileSync('reference/adopt.md','utf8'); for(const h of ['## adhd-adoptable repo guidelines','## Procedure','## On completion']) if(!t.includes(h)) throw new Error('missing '+h); if(/TBD|FIXME|\[TODO\]/.test(t)) throw new Error('placeholder'); console.log('adopt.md ok');"`
Expected: `adopt.md ok`

- [ ] **Step 3: Commit**

```bash
git add reference/adopt.md
git commit -m "feat: add adhd adopt command reference"
```

---

## Task 5: `reference/design.md` — route by surface kind

**Files:**
- Modify: `reference/design.md`

- [ ] **Step 1: Read the current file**

Read `reference/design.md`. It currently has a `## Procedure` whose steps run `brainstorming` then `impeccable` unconditionally, and a `**Sub-skill:**` header line.

- [ ] **Step 2: Apply the edits**

Edit 5a — the `**Sub-skill:**` header line currently reads ``**Sub-skill:** `superpowers:brainstorming`, then `impeccable`.`` Replace it with:

```markdown
**Sub-skill:** by surface `kind` — see Procedure step 1.
```

Edit 5b — at the start of `## Procedure`, before the existing first step, insert a new first step (and renumber the existing steps so the list stays sequential):

```markdown
1. **Determine the surface kind.** Read the surface's `kind` with
   `node {{scripts_path}}/adhd-state.mjs surface-meta {{name}} --milestone {{N}}`.
   It is `ui`, `api`, or `lib` (assigned at `map` / `surface-overview`). The kind
   selects the rest of this procedure:
   - **`ui`** — run brainstorming for UX, then `impeccable` for UI (steps below).
   - **`api`** — run `superpowers:brainstorming` for the API's behavior and
     contract semantics (endpoints, request/response shape, error codes,
     idempotency, auth), then design the API contract (protobuf, OpenAPI, or
     similar). Do NOT invoke `impeccable`. The surface spec gets API-contract,
     behavior, and error-semantics sections in place of the UX/UI sections.
   - **`lib`** — run `superpowers:brainstorming` for the module's responsibility
     and public interface, then write the spec. Do NOT invoke `impeccable` and do
     not design a wire contract.
   For `api` and `lib` surfaces, skip the `impeccable` step below; everything else
   in this procedure (output path, surface security/errors, completion) is
   unchanged.
```

Edit 5c — in the `## Output` section, after the existing description of the `ui` spec sections, add:

```markdown
For an `api` surface the spec has API-contract, behavior, and error-semantics
sections instead of UX/UI. For a `lib` surface it has a responsibility and
public-interface spec. The "Surface security & errors" section is written for all
kinds.
```

- [ ] **Step 3: Verify**

Run: `node -e "const t=require('node:fs').readFileSync('reference/design.md','utf8'); for(const h of ['## Gate check','## Procedure','## Output','## On completion']) if(!t.includes(h)) throw new Error('missing '+h); for(const k of ['\`ui\`','\`api\`','\`lib\`']) if(!t.includes(k)) throw new Error('missing kind '+k); if(/TBD|FIXME|\[TODO\]/.test(t)) throw new Error('placeholder'); console.log('design.md ok');"`
Expected: `design.md ok`

- [ ] **Step 4: Commit**

```bash
git add reference/design.md
git commit -m "feat: route adhd design stage by surface kind"
```

---

## Task 6: `reference/map.md` and `surface-overview.md` — tag surfaces

**Files:**
- Modify: `reference/map.md`
- Modify: `reference/surface-overview.md`

- [ ] **Step 1: Edit `reference/map.md`**

In `reference/map.md`, in the `## Procedure` section's step that lists/inventories surfaces (the sitemap step), append this paragraph to that step:

```markdown
   For each surface, also record its `kind` (`ui` | `api` | `lib`) and — in `multi`
   mode — the registered `repo` it will be built in. Persist both with
   `node {{scripts_path}}/adhd-state.mjs surface-meta <name> --milestone <N> --kind <kind>`
   (add `--repo <repo>` in `multi` mode). A repo's registered `kind` is a sensible
   default for surfaces in that repo; the surface's own `kind` is authoritative.
```

- [ ] **Step 2: Edit `reference/surface-overview.md`**

In `reference/surface-overview.md`, in the `## Procedure` step that lists the milestone's surfaces, append this paragraph to that step:

```markdown
   Tag each surface with its `kind` (`ui` | `api` | `lib`) and — in `multi` mode —
   the registered `repo` it will be built in, using
   `node {{scripts_path}}/adhd-state.mjs surface-meta <name> --milestone {{N}} --kind <kind>`
   (add `--repo <repo>` in `multi` mode). If `map` already tagged the surface,
   confirm the tag still fits and correct it if not.
```

- [ ] **Step 3: Verify**

Run: `for f in map surface-overview; do node -e "const t=require('node:fs').readFileSync('reference/$f.md','utf8'); for(const h of ['## Gate check','## Procedure','## Output','## On completion']) if(!t.includes(h)) throw new Error('$f missing '+h); if(!t.includes('surface-meta')) throw new Error('$f missing surface-meta'); if(/TBD|FIXME|\[TODO\]/.test(t)) throw new Error('$f placeholder'); console.log('$f ok');"; done`
Expected: `map ok`, `surface-overview ok`

- [ ] **Step 4: Commit**

```bash
git add reference/map.md reference/surface-overview.md
git commit -m "feat: tag surfaces with kind and repo in adhd map and surface-overview"
```

---

## Task 7: `milestone-ux.md`, `tracer.md`, `build.md`, `setup.md` — prototype and multi-repo

**Files:**
- Modify: `reference/milestone-ux.md`
- Modify: `reference/tracer.md`
- Modify: `reference/build.md`
- Modify: `reference/setup.md`

- [ ] **Step 1: Edit `reference/milestone-ux.md`**

In `reference/milestone-ux.md`, at the end of the `## Procedure` section, add a new final step:

```markdown
4. **Optional prototype.** When the milestone has `ui` surfaces and the UX benefits
   from being seen, you may build a clickable throwaway prototype with `impeccable`
   instead of, or alongside, `ux.md` — useful for stakeholder sign-off. The
   prototype is disposable: it is not the real UI, it is not committed to a code
   repo, and it carries no gate. Sign-off on it is informal. Record in `ux.md` that
   a prototype was produced and what was decided from it.
```

- [ ] **Step 2: Edit `reference/tracer.md`**

In `reference/tracer.md`, in the `## Procedure` section, append this paragraph to the step that builds the thin slice:

```markdown
   In `multi` mode the slice's code is written in the relevant registered code
   repo: read the target surface's `repo`
   (`node {{scripts_path}}/adhd-state.mjs surface-meta <name> --milestone {{N}}`),
   resolve its path from `node {{scripts_path}}/adhd-state.mjs workspace-list`, and
   `cd` into that path to write code. The `tracer.md` notes always stay in the
   orchestration repo's `project/`. The commit gate applies in the target repo.
```

- [ ] **Step 3: Edit `reference/build.md`**

In `reference/build.md`, in the `## Procedure` section, append this paragraph to the step that executes the surface plan:

```markdown
   In `multi` mode, code is written in the surface's registered repo. Read the
   surface's `repo` with
   `node {{scripts_path}}/adhd-state.mjs surface-meta {{name}} --milestone {{N}}`,
   resolve its path from `node {{scripts_path}}/adhd-state.mjs workspace-list`, and
   `cd` into that path before writing code. Honor that repo's own conventions
   (`CLAUDE.md`, etc.). The commit gate applies in the target repo — never `git
   commit` there without the user's explicit "ok". The `build` status is still
   tracked in the orchestration repo's `state.json`.
```

- [ ] **Step 4: Edit `reference/setup.md`**

In `reference/setup.md`, in the `## Output` section, add this paragraph:

```markdown
`setup` always scaffolds in `single` mode — `state.json` is created with
`mode: "single"` and an empty `repos` registry. For a multi-repo product, run the
`workspace` command after `setup` to switch to `multi` mode and register code
repos; for an existing project, run `adopt` instead of the front-load stages.
```

- [ ] **Step 5: Verify**

Run: `for f in milestone-ux tracer build setup; do node -e "const t=require('node:fs').readFileSync('reference/$f.md','utf8'); for(const h of ['## Procedure','## On completion']) if(!t.includes(h)) throw new Error('$f missing '+h); if(/TBD|FIXME|\[TODO\]/.test(t)) throw new Error('$f placeholder'); console.log('$f ok');"; done`
Expected: `milestone-ux ok`, `tracer ok`, `build ok`, `setup ok`

- [ ] **Step 6: Commit**

```bash
git add reference/milestone-ux.md reference/tracer.md reference/build.md reference/setup.md
git commit -m "feat: add prototype option and multi-repo behavior to adhd stage references"
```

---

## Task 8: `README.md` — document the new capabilities

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a Modes section**

In `README.md`, after the `## Usage` section, insert:

```markdown
## Modes

`adhd` runs in one of two modes:

- **`single`** (default) — everything lives in one repo. `setup` scaffolds this;
  nothing extra to do.
- **`multi`** — the product spans several git repos. `adhd`'s `project/` tree lives
  in an orchestration repo; code repos are registered by local path. Run
  `/adhd workspace` to switch to `multi` mode and register repos.

Surfaces carry a `kind` — `ui`, `api`, or `lib`. The `design` stage uses
`impeccable` only for `ui` surfaces; `api` surfaces get an API-contract design and
`lib` surfaces get a plain spec.
```

- [ ] **Step 2: Document the management commands**

In `README.md`, in the `## Usage` section, after the existing list of invocations, add:

```markdown
Two management commands sit outside the stage flow:

- `/adhd workspace` — switch to `multi` mode and register code repos.
- `/adhd adopt` — bring an existing, already-built project under `adhd` (drafts the
  front-load docs from the project's existing documentation).

You can also describe a task in plain words — `/adhd <free text>` — and `adhd`
picks the stage or command that fits, respecting the gates.
```

- [ ] **Step 3: Verify**

Run: `node -e "const t=require('node:fs').readFileSync('README.md','utf8'); for(const s of ['## Modes','workspace','adopt','single','multi']) if(!t.includes(s)) throw new Error('missing '+s); if(/TBD|FIXME|\[TODO\]/.test(t)) throw new Error('placeholder'); console.log('README.md ok');"`
Expected: `README.md ok`

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document adhd modes, workspace, adopt, and surface kinds"
```

---

## Task 9: Full-skill smoke test

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `node --test 'scripts/*.test.mjs'`
Expected: PASS — all tests green, 0 failures.

- [ ] **Step 2: Smoke-test the new CLI end-to-end**

Run this in a throwaway directory:

```bash
D=$(mktemp -d) && R=$(mktemp -d) && cd "$R" && git init -q && cd "$D" && \
node ~/.claude/skills/adhd/scripts/adhd-state.mjs init && \
node ~/.claude/skills/adhd/scripts/adhd-state.mjs workspace-mode multi && \
node ~/.claude/skills/adhd/scripts/adhd-state.mjs workspace-add repo-a "$R" api && \
node ~/.claude/skills/adhd/scripts/adhd-state.mjs workspace-list && \
node ~/.claude/skills/adhd/scripts/adhd-state.mjs set design in-progress --milestone 1 --surface home && \
node ~/.claude/skills/adhd/scripts/adhd-state.mjs surface-meta home --milestone 1 --repo repo-a --kind ui && \
node ~/.claude/skills/adhd/scripts/adhd-state.mjs surface-meta home --milestone 1 && \
cd / && rm -rf "$D" "$R"
```

Expected: `init` confirms; `workspace-mode multi` prints `mode = multi`; `workspace-add` prints `registered repo "repo-a"`; `workspace-list` shows `repo-a` with an absolute path and `"kind": "api"`; `surface-meta ... --repo --kind` prints `surface "home" updated`; the final `surface-meta home --milestone 1` prints `{ "repo": "repo-a", "kind": "ui" }`. No errors.

- [ ] **Step 3: Verify the file inventory**

Run: `ls SKILL.md README.md reference/{workspace,adopt,design,map,surface-overview,milestone-ux,tracer,build,setup}.md scripts/adhd-state.mjs`
Expected: all listed, no `No such file` error.

- [ ] **Step 4: Commit (only if Steps 1–3 surfaced fixes)**

If any step required a fix, commit it:

```bash
git add -A
git commit -m "fix: address adhd multi-repo smoke-test findings"
```

If no fixes were needed, there is nothing to commit — skip this step.

---

## Self-review

**Spec coverage:**
- §2 modes (`single`/`multi`) → Task 1 (state), Task 2 (SKILL.md Modes). ✓
- §3 `state.json` additions (`mode`, `repos`, surface `repo`/`kind`) → Task 1. ✓
- §4 `workspace` command + CLI verbs → Task 1 (verbs), Task 3 (`reference/workspace.md`). ✓
- §5 surface kinds drive `design` → Task 1 (`SURFACE_KINDS`, `setSurfaceMeta`), Task 5 (`design.md`). ✓
- §6 stage changes (map/surface-overview tag, milestone-ux prototype, tracer/build multi-repo) → Tasks 6, 7. ✓
- §7 gate engine — `STAGE_GATES` untouched; `tracer`/`build` resolve repo path → Task 7; `workspace-add` validation → Task 1. ✓
- §8 `adopt` command → Task 4 (`reference/adopt.md`); uses existing `set ... done` CLI, no new state. ✓
- §9 routing rewrite → Task 2 Step 4. ✓
- §10 adhd-adoptable repo guidelines → Task 4 (`adopt.md` section). ✓
- §11 deliverable 1 (every file in the list) → Tasks 1–8. ✓
- §12 deliverable 2 (adoption walkthrough) — a generic doc, already in the spec; not a build artifact, so no task. ✓
- §13 out of scope — no migration task (old `state.json` defaults handled by `ensureSurface` undefined-guard and the SKILL.md note); honored. ✓

**Placeholder scan:** every reference-file task gives verbatim content or exact append text; all have a `TBD|FIXME|[TODO]` verification grep. Task 1 shows full code for every edit. No "implement later" anywhere.

**Type consistency:** export names used across tasks — `setMode`, `addRepo`, `removeRepo`, `listRepos`, `setSurfaceMeta`, `SURFACE_KINDS`, `MODES` — match between Task 1's implementation, its tests, and the CLI cases. CLI verbs (`workspace-mode`, `workspace-add`, `workspace-remove`, `workspace-list`, `surface-meta`) match between Task 1's `main` switch, the SKILL.md Scripts line (Task 2 Step 5), and the reference-file commands (Tasks 3, 6, 7). The `surface-meta` flag set (`--milestone`, `--repo`, `--kind`) matches `parseFlags` (Edit 3e) and every reference invocation.

---

## Execution Handoff

Plan complete and saved to `docs/2026-05-17-adhd-multi-repo-plan.md`. Two execution options:

1. **Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — tasks executed in this session via `executing-plans`, batched checkpoints.

Which approach?
