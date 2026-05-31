# concepts stage + automatic working memory — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a living groundwork stage `concepts` (ubiquitous language: entities + Mermaid ER + helicopter behavior) gated before `prototype`, and an automatic per-task working-memory file on high-effort stages that survives compaction and makes mid-stage handoff seamless.

**Architecture:** `concepts` is registered in `scripts/adhd-state.mjs` like any groundwork stage — its artifact `docs/CONCEPTS.md` (the retired `GLOSSARY.md` folds into it) is its done-signal, and `prototype`'s gate gains it as a predecessor. Working memory is a gitignored `project/work/<stage>[-m<N>].md` file, auto-created on high-effort stages, drained+deleted on completion; `handoff-prompt.mjs` reads it to lead the resume prompt and `audit` flags stale ones. No new dependency, no hooks (stays cross-agent).

**Tech Stack:** Node.js (v18+) ESM, `node:test` + `node:assert/strict`. All scripts in `scripts/*.mjs`. Documentation in `SKILL.md`, `README.md`, `reference/*.md`.

**Spec:** [docs/superpowers/specs/2026-05-31-concepts-stage-and-working-memory-design.md](../specs/2026-05-31-concepts-stage-and-working-memory-design.md)

**Convention note used by several tasks:** the working-memory filename is `<stage>.md` for groundwork stages and `m<N>-<stage>.md` for milestone stages, under `project/work/`. DATA.md entities are `## ` (level-2) headings; CONCEPTS.md must mention every such entity name somewhere in its text.

---

### Task 1: Register the `concepts` stage in `adhd-state.mjs`

**Files:**
- Modify: `scripts/adhd-state.mjs` (`GROUNDWORK_STAGES` line 17; `STAGE_EFFORT` lines 21-25; `groundworkDone` lines 204-219; `gate` lines 248-251)
- Test: `scripts/adhd-state.test.mjs` (`stage lists` line 52; `groundwork` helper lines 33-41; `groundworkDone derives from files` lines 102-120; `gate: groundwork chain` lines 122-142; plus a new test)

- [ ] **Step 1: Update the existing tests to expect `concepts`, and add a new effort test**

In `scripts/adhd-state.test.mjs`, replace the `stage lists` assertion for groundwork (line 53):

```js
  assert.deepEqual(GROUNDWORK_STAGES, ['setup', 'vision', 'foundation', 'concepts', 'prototype', 'stories']);
```

Replace the `groundwork` helper (lines 33-41) so it writes `CONCEPTS.md` instead of `GLOSSARY.md`:

```js
function groundwork(cwd) {
  initConfig(cwd);
  w(cwd, 'docs/PRODUCT.md');
  w(cwd, 'docs/DECISIONS.md', '# Decisions\n\n## 2026 — a real decision\n');
  w(cwd, 'docs/CONCEPTS.md');
  w(cwd, 'project/map.md');
  w(cwd, 'project/prototype.md');
  w(cwd, 'project/stories.md', '| ID | Story | Depends on |\n|----|----|----|\n| S1 | a | |');
}
```

Replace the body of `test('groundworkDone derives from files', ...)` (lines 102-120) with:

```js
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
```

Replace the body of `test('gate: groundwork chain', ...)` (lines 122-142) with:

```js
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
  assert.equal(gate(cwd, 'prototype').pass, false);
  w(cwd, 'docs/CONCEPTS.md');
  assert.equal(gate(cwd, 'prototype').pass, true);
  assert.equal(gate(cwd, 'stories').pass, false);
  w(cwd, 'project/map.md');
  w(cwd, 'project/prototype.md');
  assert.equal(gate(cwd, 'stories').pass, true);
  assert.equal(gate(cwd, 'milestone-brief', { milestone: 1 }).pass, false);
  w(cwd, 'project/stories.md', '| ID | Story |\n|--|--|\n| S1 | a |');
  assert.equal(gate(cwd, 'milestone-brief', { milestone: 1 }).pass, true);
});
```

Add a new test after the `stage lists` test (after line 59), importing nothing new (`STAGE_EFFORT` is needed — add it to the import block at lines 7-16):

```js
test('concepts is a high-effort groundwork stage between foundation and prototype', () => {
  assert.equal(STAGE_EFFORT.concepts, 'high');
  const i = GROUNDWORK_STAGES.indexOf('concepts');
  assert.equal(GROUNDWORK_STAGES[i - 1], 'foundation');
  assert.equal(GROUNDWORK_STAGES[i + 1], 'prototype');
});
```

Add `STAGE_EFFORT` to the import at the top of the test file (line 9 area):

```js
  GROUNDWORK_STAGES, MILESTONE_STAGES, FEATURE_STAGES, SURFACE_KINDS, MODES, PROTOTYPE_TOPOLOGIES,
  STAGE_EFFORT,
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test scripts/adhd-state.test.mjs`
Expected: FAIL — `GROUNDWORK_STAGES` lacks `concepts`, `groundworkDone(cwd,'concepts')` is false-by-default but the new prototype expectations and `STAGE_EFFORT.concepts` are undefined.

- [ ] **Step 3: Implement the stage registration in `adhd-state.mjs`**

Replace `GROUNDWORK_STAGES` (line 17):

```js
export const GROUNDWORK_STAGES = ['setup', 'vision', 'foundation', 'concepts', 'prototype', 'stories'];
```

Replace `STAGE_EFFORT` (lines 21-25):

```js
export const STAGE_EFFORT = {
  setup: 'low', vision: 'high', foundation: 'medium', concepts: 'high', prototype: 'high', stories: 'medium',
  'milestone-brief': 'medium', 'ux-refine': 'high', tracer: 'high', features: 'high',
  review: 'high', finalize: 'low', plan: 'medium', build: 'medium',
};
```

In `groundworkDone` (lines 204-219), add the `concepts` case and drop the `GLOSSARY.md` requirement from `prototype`:

```js
    case 'concepts': return exists(cwd, `${docHome}/CONCEPTS.md`);
    case 'prototype':
      return exists(cwd, 'project/prototype.md')
        && exists(cwd, 'project/map.md');
    case 'stories': return exists(cwd, 'project/stories.md');
```

In `gate` (lines 248-251), insert the `concepts` case and re-point `prototype`/`stories`:

```js
    case 'foundation': need(gw('vision'), 'vision not done — docs/PRODUCT.md missing'); break;
    case 'concepts': need(gw('foundation'), 'foundation not done — no decisions logged in docs/DECISIONS.md'); break;
    case 'prototype': need(gw('concepts'), 'concepts not done — docs/CONCEPTS.md missing'); break;
    case 'stories': need(gw('prototype'), 'prototype not done — project/prototype.md / project/map.md missing'); break;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test scripts/adhd-state.test.mjs`
Expected: PASS (all tests, including the new effort test).

- [ ] **Step 5: Commit**

```bash
git add scripts/adhd-state.mjs scripts/adhd-state.test.mjs
git commit -m "feat: register concepts groundwork stage gated before prototype"
```

---

### Task 2: `audit` flags stale working-memory files

**Files:**
- Modify: `scripts/adhd-state.mjs` (`audit`, before the `notes.md` warning at lines 512-514)
- Test: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing test**

Add to `scripts/adhd-state.test.mjs`:

```js
test('audit: warns on a stale work file for a completed stage', () => {
  const cwd = tmp();
  initConfig(cwd);
  w(cwd, 'docs/PRODUCT.md');            // vision done
  w(cwd, 'project/work/vision.md', '# wm');
  assert.ok(audit(cwd).warnings.some((x) => /work\/vision\.md/.test(x) && /done/.test(x)));
  // a work file for an unfinished stage does NOT warn
  w(cwd, 'project/work/prototype.md', '# wm');
  assert.ok(!audit(cwd).warnings.some((x) => /work\/prototype\.md/.test(x)));
  // a milestone work file whose stage is done warns
  w(cwd, 'project/milestones/m1/ux-refine.md');
  w(cwd, 'project/work/m1-ux-refine.md', '# wm');
  assert.ok(audit(cwd).warnings.some((x) => /work\/m1-ux-refine\.md/.test(x)));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/adhd-state.test.mjs --test-name-pattern "stale work file"`
Expected: FAIL — no such warning is produced.

- [ ] **Step 3: Implement the stale-work-file check in `audit`**

In `scripts/adhd-state.mjs`, inside `audit`, immediately before the closing `notes.md` warning block (currently lines 512-514), insert:

```js
  const workDir = path.join(cwd, 'project/work');
  if (fs.existsSync(workDir)) {
    for (const file of fs.readdirSync(workDir)) {
      if (!file.endsWith('.md')) continue;
      const base = file.slice(0, -3);
      const mm = /^m(\d+)-(.+)$/.exec(base);
      const stage = mm ? mm[2] : base;
      const done = mm ? milestoneStageDone(cwd, Number(mm[1]), stage) : groundworkDone(cwd, stage);
      if (done) {
        warnings.push(`project/work/${file}: stage "${stage}" is done — drain durable facts to their canonical home and delete this work file`);
      }
    }
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/adhd-state.test.mjs --test-name-pattern "stale work file"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/adhd-state.mjs scripts/adhd-state.test.mjs
git commit -m "feat: audit flags stale working-memory files"
```

---

### Task 3: `audit` flags `DATA.md` entities missing from `CONCEPTS.md`

**Files:**
- Modify: `scripts/adhd-state.mjs` (`audit`, after the mechanism-keyword loop at lines 503-511)
- Test: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing test**

Add to `scripts/adhd-state.test.mjs`:

```js
test('audit: flags a DATA.md entity missing from CONCEPTS.md', () => {
  const cwd = tmp();
  initConfig(cwd);
  w(cwd, 'docs/CONCEPTS.md', '# Concepts\n\nTeam — a group of people.\n');
  w(cwd, 'docs/DATA.md', '# Data\n\n## Team\nname: string\n\n## Invoice\namount: number\n');
  const r = audit(cwd);
  assert.ok(r.findings.some((f) => /Invoice/.test(f) && /CONCEPTS/.test(f)));
  assert.ok(!r.findings.some((f) => /"Team"/.test(f)));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/adhd-state.test.mjs --test-name-pattern "missing from CONCEPTS"`
Expected: FAIL — no such finding is produced.

- [ ] **Step 3: Implement the DATA↔CONCEPTS check in `audit`**

In `scripts/adhd-state.mjs`, inside `audit`, immediately after the mechanism-keyword `for` loop (after line 511, before the `notes.md`/work-file blocks), insert:

```js
  if (exists(cwd, `${docHome}/DATA.md`) && exists(cwd, `${docHome}/CONCEPTS.md`)) {
    const concepts = read(cwd, `${docHome}/CONCEPTS.md`).toLowerCase();
    const heads = [...read(cwd, `${docHome}/DATA.md`).matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]);
    for (const ent of heads) {
      const name = clean(ent).toLowerCase();
      if (name && !concepts.includes(name)) {
        findings.push(`docs/DATA.md entity "${clean(ent)}" is not defined in docs/CONCEPTS.md — update concepts first`);
      }
    }
  }
```

(`clean` and `read` already exist in this module.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/adhd-state.test.mjs --test-name-pattern "missing from CONCEPTS"`
Expected: PASS.

- [ ] **Step 5: Run the full state test suite**

Run: `node --test scripts/adhd-state.test.mjs`
Expected: PASS (every test).

- [ ] **Step 6: Commit**

```bash
git add scripts/adhd-state.mjs scripts/adhd-state.test.mjs
git commit -m "feat: audit checks DATA.md entities exist in CONCEPTS.md"
```

---

### Task 4: `handoff-prompt.mjs` leads with the active work file

**Files:**
- Modify: `scripts/handoff-prompt.mjs` (full rewrite of the module body)
- Test: `scripts/handoff-prompt.test.mjs`

- [ ] **Step 1: Write the failing test**

Add to `scripts/handoff-prompt.test.mjs`:

```js
test('handoffPrompt leads with the active work file and inlines checklist + log', () => {
  const cwd = tmp();
  initConfig(cwd);
  w(cwd, 'docs/PRODUCT.md');
  w(cwd, 'docs/DECISIONS.md', '# Decisions\n\n## d\n'); // next stage = concepts
  w(cwd, 'project/work/concepts.md',
    '# Working memory: concepts\n\n## Left to do\n- [x] entities\n- [ ] draw ER diagram\n\n## Log\n- defined Team and Project\n- stuck on cardinality\n');
  const out = handoffPrompt(cwd);
  assert.match(out, /project\/work\/concepts\.md` FIRST/);
  assert.match(out, /draw ER diagram/);
  assert.match(out, /stuck on cardinality/);
  assert.match(out, /Run: adhd concepts/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/handoff-prompt.test.mjs --test-name-pattern "active work file"`
Expected: FAIL — `handoffPrompt` does not read `project/work/`.

- [ ] **Step 3: Rewrite `scripts/handoff-prompt.mjs`**

Replace the entire file with:

```js
// scripts/handoff-prompt.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, nextStage, statusReport } from './adhd-state.mjs';

// Resolve the working-memory file (if any) for the stage we are resuming into.
function activeWorkFile(cwd, next) {
  const dir = path.join(cwd, 'project/work');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const stage = next.stage === 'next-milestone' ? 'milestone-brief' : next.stage;
  const want = next.milestone ? `m${next.milestone}-${stage}.md` : `${stage}.md`;
  if (files.includes(want)) return want;
  return files.find((f) => f.slice(0, -3).replace(/^m\d+-/, '') === stage) ?? null;
}

// Extract the open checklist items and the last few log lines from a work file.
function summarizeWork(body) {
  const lines = body.split('\n');
  const open = lines.filter((l) => /^\s*- \[ \]/.test(l)).map((l) => l.trim());
  const logIdx = lines.findIndex((l) => /^##\s+log\b/i.test(l));
  const logLines = (logIdx >= 0 ? lines.slice(logIdx + 1) : [])
    .map((l) => l.trim()).filter(Boolean).slice(-3);
  return { open, logLines };
}

export function handoffPrompt(cwd = process.cwd()) {
  const config = loadConfig(cwd);
  if (!config) {
    return 'No project/config.json found. Run `adhd setup` to begin a new project.';
  }
  const next = nextStage(cwd);
  const where = next.stage +
    (next.milestone ? ` — milestone ${next.milestone}` : '') +
    (next.feature ? ` — feature ${next.feature}` : '');
  const runArg = next.stage === 'next-milestone' ? 'milestone-brief' : next.stage;

  const work = activeWorkFile(cwd, next);
  const lines = ['Resume the `adhd` conductor.', ''];
  let n = 1;
  if (work) {
    const { open, logLines } = summarizeWork(fs.readFileSync(path.join(cwd, 'project/work', work), 'utf-8'));
    lines.push(`${n++}. Read \`project/work/${work}\` FIRST — your in-flight working memory for this task.`);
    if (open.length) {
      lines.push('   Left to do:');
      for (const o of open) lines.push(`     ${o}`);
    }
    if (logLines.length) {
      lines.push('   Last progress:');
      for (const l of logLines) lines.push(`     ${l}`);
    }
    lines.push(`${n++}. Then read \`project/notes.md\` — the previous session's scratchpad.`);
  } else {
    lines.push(`${n++}. Read \`project/notes.md\` FIRST — it is the scratchpad from the previous session.`);
  }
  lines.push(`${n++}. Current position: ${where}`);
  lines.push(`${n++}. Run: adhd ${runArg}`);
  lines.push(
    '',
    'State summary:',
    statusReport(cwd).split('\n').map((l) => '  ' + l).join('\n'),
    '',
    `Generated by adhd handoff-prompt at ${new Date().toISOString()}.`,
  );
  return lines.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  console.log(handoffPrompt(process.cwd()));
}
```

- [ ] **Step 4: Run the handoff tests to verify they pass**

Run: `node --test scripts/handoff-prompt.test.mjs`
Expected: PASS — the new test plus the three existing tests (no-config, notes.md-first, groundwork line) all pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/handoff-prompt.mjs scripts/handoff-prompt.test.mjs
git commit -m "feat: handoff prompt leads with the active working-memory file"
```

---

### Task 5: Write `reference/concepts.md`

**Files:**
- Create: `reference/concepts.md`

- [ ] **Step 1: Create the reference file**

Create `reference/concepts.md` with exactly this content:

```markdown
# adhd — Concepts

**Effort:** high
**Gate:** the `foundation` stage is done — the firm tech baseline is logged in
`docs/DECISIONS.md`.
**Output:** `docs/CONCEPTS.md` (the product's ubiquitous language: entities,
relationships, and a helicopter view of how the system works).
**Sub-skill:** `superpowers:brainstorming`.

`concepts` pins down **what exists in the product and how it works** — in one
deterministic, single-meaning reference — **before** any UX is drawn. It is the shared
vocabulary the user and the model speak: named entities, how they relate, and a
bird's-eye view of behavior. It is **not** a data model (no fields/schema — that is
`docs/DATA.md`) and **not** a placement map (no surfaces/deployables — that is
`project/map.md`).

`concepts` is a **living stage**, like `prototype` and `stories`: re-run it as
understanding deepens. When `tracer` or `build` surfaces a new entity not in
`CONCEPTS.md`, update `concepts` **first**, then continue.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate concepts`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `foundation` is not done, HALT and tell the user to run
`adhd foundation` first.

## Procedure
1. **Start working memory.** This high-effort stage may span sessions. Create
   `project/work/concepts.md` with a `## Left to do` checklist and a `## Log` section,
   and append to it as you work. It is transient scratch — never a source of truth (see
   SKILL.md, "Working memory").
2. **Elicit the entities.** With `superpowers:brainstorming`, draw out the core product
   entities and what each represents — one concept at a time, plain product language.
3. **Draw the relationships.** Author a Mermaid `erDiagram` showing the entities and
   their **conceptual cardinality** (e.g. `TEAM ||--o{ PROJECT : owns`). Confirm each
   edge with the user. Cardinality only — no field types, no keys-as-schema.
4. **Capture the helicopter view.** Record the actors/roles, the core entities' key
   states/lifecycles, and the handful of **governing entity/state rules** (invariants).
   **Stop at helicopter altitude** — no step-by-step process flows, no implementation or
   realization detail. Navigation/interaction rules belong to `prototype`; physical
   schema belongs to `docs/DATA.md`.
5. **Determinism pass.** Every term defined once, every relationship stated once, no
   `TBD`, no synonyms. This file is the single, unambiguous home for the product's
   vocabulary and behavior model.
6. **Write `docs/CONCEPTS.md` last** — its existence is the stage's done signal.

## Output
- `docs/CONCEPTS.md`, with three zones:
  - **Ubiquitous language** — each entity, one plain line of what it represents.
  - **Relationships** — a Mermaid `erDiagram` with conceptual cardinality.
  - **Helicopter view** — actors, core lifecycles/states, governing entity/state rules.

## Re-running
`concepts` is **re-runnable**. Re-run it whenever the entity set or its behavior model
evolves — and always before continuing work that introduced a new entity.

## On completion
1. Write `docs/CONCEPTS.md` — the stage is done the moment it exists.
2. `node {{scripts_path}}/adhd-state.mjs session-add concepts`
3. `node {{scripts_path}}/context-watch.mjs --next prototype` — if it advises a fresh
   session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
4. Drain `project/notes.md` and `project/work/concepts.md`: migrate durable facts to
   their canonical home, then delete the work file. `notes.md` healthy = empty.
5. Tell the user the next runnable stage is `prototype`.
```

- [ ] **Step 2: Commit**

```bash
git add reference/concepts.md
git commit -m "docs: add concepts stage reference"
```

---

### Task 6: Update `reference/prototype.md` (drop glossary step, read CONCEPTS, re-gate)

**Files:**
- Modify: `reference/prototype.md`

- [ ] **Step 1: Re-gate the stage**

Replace the `**Gate:**` line (line 4-5) and the gate-check fallback paragraph (lines 31-32):

Gate line becomes:
```markdown
**Gate:** the `concepts` stage is done — `docs/CONCEPTS.md` exists.
```

Gate-check fallback becomes:
```markdown
If the gate reports `concepts` is not done, HALT and tell the user to run
`adhd concepts` first.
```

- [ ] **Step 2: Update Output (line 6-8) to drop GLOSSARY and read CONCEPTS**

Replace the `**Output:**` line so it no longer lists `docs/GLOSSARY.md`:

```markdown
**Output:** `project/map.md`, `project/surfaces/<name>.md` (per `ui` surface), the wired
clickable whole-product prototype app, and `project/prototype.md` (the sign-off, written
last). Reads `docs/CONCEPTS.md` as input.
```

- [ ] **Step 3: Delete the glossary sub-step (step 3, lines 58-62) and renumber**

Remove step 3 ("Sketch the domain glossary…") entirely. Renumber the following steps (old 4-9 become 3-8). In the new step 1 (authoring the sitemap), change the cross-reference from `docs/GLOSSARY.md` to `docs/CONCEPTS.md`, and add to the step that `map.md` groups the `CONCEPTS.md` entities into deployables, DDD bounded contexts, and surfaces (placement — **where** entities live; `concepts` already defines **what & how**).

In the renumbered "Design the whole-product UX flow" step, add this sentence:

```markdown
   The whole-product flow's **navigation and interaction rules** live here; the
   **entity/state rules** they build on live in `docs/CONCEPTS.md` — reference them,
   do not restate them.
```

- [ ] **Step 4: Add the working-memory step and update completion**

Add a new first procedure step (before authoring the sitemap):

```markdown
0. **Start working memory.** This high-effort stage may span sessions. Create
   `project/work/prototype.md` (`## Left to do` + `## Log`) and append as you work — see
   SKILL.md, "Working memory".
```

In the `## Output` section, remove the `docs/GLOSSARY.md` bullet. In `## On completion`, change the drain step to also delete the work file:

```markdown
4. Drain `project/notes.md` and `project/work/prototype.md`: migrate durable facts to
   their canonical home, then delete the work file. `notes.md` healthy = empty.
```

- [ ] **Step 5: Commit**

```bash
git add reference/prototype.md
git commit -m "docs: prototype reads CONCEPTS, drops glossary step, re-gated on concepts"
```

---

### Task 7: Update `reference/setup.md` (gitignore `project/work/`, autoCompact tip)

**Files:**
- Modify: `reference/setup.md`

- [ ] **Step 1: Gitignore `project/work/`**

In step 4 ("Configure `.gitignore`", lines 30-35), add `project/work/` to the appended list. The sentence becomes:

```markdown
4. **Configure `.gitignore`.** Append `.superpowers/`, `project/repos.local.json`,
   `project/.session.json`, and `project/work/` to `.gitignore` (create the file if it
   does not exist). Do NOT gitignore `.impeccable/` — it is tracked. Do NOT gitignore
   `project/` itself — only the per-user/ephemeral files (`project/repos.local.json`,
   `project/.session.json`) and the transient working-memory dir (`project/work/`) are
   ignored.
```

Update the `## Output` `.gitignore` bullet (lines 47-48) to include `project/work/`:

```markdown
- `.gitignore` — extended with `.superpowers/`, `project/repos.local.json`,
  `project/.session.json`, and `project/work/` (`.impeccable/` stays tracked;
  `project/` itself stays tracked).
```

- [ ] **Step 2: Add the autoCompact recommendation**

Add a new step 6 to the Procedure (after step 5, "Seed `.ruler/`"):

```markdown
6. **Recommend `autoCompact: false` (Claude Code only).** Tell the user that turning off
   auto-compaction in Claude Code settings lets them control when to `/clear`, while the
   working-memory files (`project/work/<task>.md`) and canonical artifacts carry state
   across it. It is a recommendation, not a requirement — `adhd` works either way.
```

- [ ] **Step 3: Commit**

```bash
git add reference/setup.md
git commit -m "docs: setup gitignores project/work and recommends autoCompact off"
```

---

### Task 8: Update `reference/finalize.md` (keep DATA.md current; drain CONCEPTS)

**Files:**
- Modify: `reference/finalize.md`

- [ ] **Step 1: Rename GLOSSARY → CONCEPTS in the drain step**

In step 1 (lines 21-23), change the canonical-home list from `docs/GLOSSARY.md` to
`docs/CONCEPTS.md`:

```markdown
1. **Drain and migrate `project/notes.md`.** It must end empty — migrate every durable
   entry to its canonical home (`docs/DECISIONS.md`, `docs/CONCEPTS.md`,
   `docs/DATA.md`, a surface spec, `.ruler/`).
```

- [ ] **Step 2: Make `DATA.md` updating explicit (production-track)**

Replace step 2 (lines 24-27) with:

```markdown
2. **Update the canonical docs to the milestone's reality.** Reflect what the milestone
   actually changed: decisions in `docs/DECISIONS.md`, refined concepts in
   `docs/CONCEPTS.md`. On a **production-track** milestone, update `docs/DATA.md` to the
   current field-level state of every entity this milestone added or changed (create
   `docs/DATA.md` if this is the first milestone to persist data). `DATA.md` entities are
   `## ` headings; every one must be defined in `docs/CONCEPTS.md` — if not, update
   `concepts` first. Run `node {{scripts_path}}/adhd-state.mjs audit` and resolve any
   findings.
```

- [ ] **Step 3: Commit**

```bash
git add reference/finalize.md
git commit -m "docs: finalize keeps DATA.md current and drains to CONCEPTS"
```

---

### Task 9: Update `reference/adopt.md` (produce `CONCEPTS.md`)

**Files:**
- Modify: `reference/adopt.md`

- [ ] **Step 1: Update the purpose line and the artifact list**

Change the `**Purpose:**` line (lines 4-5) groundwork list to include `concepts`:

```markdown
**Purpose:** bring an existing, already-built project under `adhd`. Substitutes for
the groundwork loop (`vision → foundation → concepts → prototype → stories`).
```

In step 3 (lines 38-52), replace the `docs/GLOSSARY.md` bullet with a `docs/CONCEPTS.md`
bullet, and update the `project/prototype.md` bullet's parenthetical so prototype no
longer requires the concepts file:

```markdown
   - `docs/CONCEPTS.md` — the ubiquitous language: entities, their relationships
     (a Mermaid `erDiagram`), and a helicopter view of how the system works. This is the
     `concepts` artifact; draft it from the existing data model and architecture docs.
   - `project/surfaces/<name>.md` — a spec per `ui` surface, read off the existing UI.
   - `project/prototype.md` — the `prototype` artifact. The existing built UI *is* the
     whole-product UX reference, so record what it covers and treat it as signed off;
     no new prototype app is built. (`prototype` is done once `project/prototype.md` and
     `project/map.md` exist.)
```

- [ ] **Step 2: Update the completion count**

In `## On completion` step 1 (lines 65-66), change "all five groundwork stages" to "all
six groundwork stages":

```markdown
1. Confirm all six groundwork stages register as done
   (`node {{scripts_path}}/adhd-state.mjs status`).
```

- [ ] **Step 3: Commit**

```bash
git add reference/adopt.md
git commit -m "docs: adopt produces docs/CONCEPTS.md"
```

---

### Task 10: Update `reference/foundation.md` and `reference/stories.md` (flow pointers)

**Files:**
- Modify: `reference/foundation.md` (lines 47, 50)
- Modify: `reference/stories.md` (lines 4-5, 20-21)

- [ ] **Step 1: Re-point `foundation` to `concepts`**

In `reference/foundation.md` `## On completion`, change step 3 and step 5:

```markdown
3. `node {{scripts_path}}/context-watch.mjs --next concepts` — if it advises a fresh
   session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
```
```markdown
5. Tell the user the next runnable stage is `concepts`.
```

- [ ] **Step 2: Fix the `stories` gate description (prototype no longer owns the glossary)**

In `reference/stories.md`, update the `**Gate:**` line (lines 4-5) and the gate-check
fallback (lines 20-21) to drop `docs/GLOSSARY.md`:

```markdown
**Gate:** `project/prototype.md` exists — the Prototype stage is done (the whole-product
clickable prototype is signed off, and `project/map.md` exists).
```
```markdown
If the gate reports `prototype` (or `project/prototype.md` / `project/map.md`) is
missing, HALT and tell the user to run `adhd prototype` first.
```

- [ ] **Step 3: Commit**

```bash
git add reference/foundation.md reference/stories.md
git commit -m "docs: point foundation at concepts; fix stories gate text"
```

---

### Task 11: Add the working-memory step + back-pressure rule to the long milestone stages

**Files:**
- Modify: `reference/vision.md`, `reference/ux-refine.md`, `reference/tracer.md`, `reference/features.md`, `reference/review.md` (working-memory step)
- Modify: `reference/tracer.md`, `reference/features.md`, `reference/build.md` (back-pressure rule)

- [ ] **Step 1: Add the working-memory step to each high-effort stage reference**

In each of `reference/vision.md`, `reference/ux-refine.md`, `reference/tracer.md`,
`reference/features.md`, `reference/review.md`, add a new **first** step in the
`## Procedure` section. Use the groundwork form for `vision`:

```markdown
1. **Start working memory.** This high-effort stage may span sessions. Create
   `project/work/vision.md` (`## Left to do` + `## Log`) and append as you work — see
   SKILL.md, "Working memory".
```

and the milestone form for `ux-refine`, `tracer`, `features`, `review` (filename
`m<N>-<stage>.md`, e.g. `project/work/m{{N}}-tracer.md`):

```markdown
1. **Start working memory.** This high-effort stage may span sessions. Create
   `project/work/m{{N}}-<stage>.md` (`## Left to do` + `## Log`) and append as you work —
   see SKILL.md, "Working memory".
```

Renumber the existing procedure steps in each file accordingly. In each file's
`## On completion` drain step, add deleting the work file:

```markdown
   Drain `project/notes.md` and this stage's `project/work/*.md`: migrate durable facts
   to their canonical home, then delete the work file. `notes.md` healthy = empty.
```

(`build`, `plan`, `stories`, `milestone-brief`, `finalize`, `setup`, `foundation` are
medium/low effort and get **no** working-memory step.)

- [ ] **Step 2: Add the new-entity back-pressure rule to `tracer`, `features`, `build`**

In `reference/tracer.md`, `reference/features.md`, and `reference/build.md`, add this
bullet to the `## Procedure` section (alongside the existing "park new ideas" rule in
`build.md`):

```markdown
- **New entity → update `concepts` first.** If this stage surfaces a product entity not
  already in `docs/CONCEPTS.md`, stop and re-run `adhd concepts` to add it (entity +
  relationships + any state rule) before continuing. The concepts file is the single
  source of the ubiquitous language; it must not silently fall behind the build.
```

- [ ] **Step 3: Commit**

```bash
git add reference/vision.md reference/ux-refine.md reference/tracer.md reference/features.md reference/review.md reference/build.md
git commit -m "docs: working-memory step on high-effort stages; concepts back-pressure on build/tracer/features"
```

---

### Task 12: Update `SKILL.md`

**Files:**
- Modify: `SKILL.md`

- [ ] **Step 1: Add `concepts` to the stages table and flow text**

In the Stages table (lines 152-166), add a row between `foundation` and `prototype`:

```markdown
| `concepts` | groundwork (living) | high | `docs/CONCEPTS.md` | brainstorming | [reference/concepts.md](reference/concepts.md) |
```

Update the `prototype` row's artifact cell to drop `docs/GLOSSARY.md`:

```markdown
| `prototype` | groundwork (living) | high | `project/prototype.md` + `project/map.md` + prototype app | brainstorming + impeccable | [reference/prototype.md](reference/prototype.md) |
```

In the Flow paragraph (lines 168-174), change the groundwork sequence to
`setup → vision → foundation → concepts → prototype → stories` and note `concepts`,
`prototype`, and `stories` stay re-runnable.

- [ ] **Step 2: Update the canonical layout block (lines 119-148)**

Change the `docs/` block: rename `GLOSSARY.md` to `CONCEPTS.md` with an updated gloss,
and add the `project/work/` entry:

```markdown
  CONCEPTS.md                ubiquitous language — entities, ER relationships, helicopter view — Concepts output
```
```markdown
  notes.md                   transient scratchpad (healthy = empty)
  work/<stage>[-m<N>].md     gitignored — per-task working memory (high-effort stages); deleted on completion
```

- [ ] **Step 3: Add the "Working memory" cross-cutting section**

After the "Groundwork and per-milestone work" section (after line 117), or within
"Cross-cutting rules", add a new subsection:

```markdown
## Working memory (high-effort stages)

A long stage can outlive one session. To survive compaction and make handoff seamless,
every **high-effort** stage (`vision`, `concepts`, `prototype`, `ux-refine`, `tracer`,
`features`, `review`) auto-creates a working-memory file at its start:
`project/work/<stage>.md` for groundwork, `project/work/m<N>-<stage>.md` for a milestone
stage. Medium/low stages (including `build` — its plan already is the memory) create
none.

The file has two light zones:

```
## Left to do      ← checklist; unchecked items are the resume pointer
## Log             ← free-form, newest last: what was done / what failed / decisions
```

Write to it as the work proceeds, so an unexpected compaction cannot corrupt context.
It is **transient scratch — never a source of truth**, exactly like `notes.md`. On stage
completion, drain durable facts to their canonical home (`DECISIONS.md`, `CONCEPTS.md`,
`DATA.md`, a surface spec, `.ruler/`) and **delete** the file. `project/work/` is
gitignored; `audit` flags any work file whose stage is already done.
`handoff-prompt.mjs` reads the active work file and leads the resume prompt with it.
```

- [ ] **Step 4: Rename GLOSSARY → CONCEPTS in the prose rules**

In "Capability, not mechanism" (lines 396-403) and anywhere else `GLOSSARY.md` appears in
`SKILL.md` (e.g. the `notes.md` discipline bullet line 411, the layout note line 129),
replace `docs/GLOSSARY.md`/`GLOSSARY.md` with `docs/CONCEPTS.md`/`CONCEPTS.md`. Update the
`context-watch` cross-cutting bullet (lines 382-383) to mention the auto work file:

```markdown
- **Context watch** — after each stage run `context-watch.mjs`; if it advises a fresh
  session, run `handoff-prompt.mjs` and give the user the resume prompt. On high-effort
  stages the auto working-memory file (see "Working memory") makes that handoff seamless.
```

- [ ] **Step 5: Add two rows to the Common mistakes table (lines 424-441)**

```markdown
| Leaving a `project/work/<task>.md` behind after a stage is done. | It is transient scratch. Drain durable facts to their canonical home and delete it — `audit` flags stale work files. |
| Putting fields, schema, or surfaces into `docs/CONCEPTS.md`. | `CONCEPTS.md` is conceptual (entities + relationships + helicopter behavior). Fields live in `docs/DATA.md`; surfaces/placement live in `project/map.md`. |
```

- [ ] **Step 6: Commit**

```bash
git add SKILL.md
git commit -m "docs: SKILL.md documents concepts stage and working memory"
```

---

### Task 13: Update `README.md`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the flow diagram and stage table**

In the flow code block (lines 82-97), change the groundwork line to:

```
  setup → vision → foundation → concepts → prototype → stories
```

In the stage table (lines 103-118), add a `concepts` row between `foundation` and
`prototype`, and update the `prototype` row's output to drop the glossary:

```markdown
| concepts | ubiquitous language — entities, ER relationships, helicopter view | `docs/CONCEPTS.md` |
| prototype | whole-product UX+UI, wired clickable prototype + sitemap + sign-off | `project/prototype.md`, `project/map.md`, `project/surfaces/*` |
```

- [ ] **Step 2: Update "What it creates in your project" (lines 174-189)**

Rename `GLOSSARY.md` to `CONCEPTS.md` in the `docs/` line, and add the `work/` entry
under `project/`:

```markdown
  PRODUCT.md  DESIGN.md  CONCEPTS.md  DECISIONS.md
```
```markdown
  notes.md               transient scratchpad — healthy when empty
  work/<task>.md         gitignored — per-task working memory (high-effort stages), deleted on completion
```

- [ ] **Step 3: Update the "Rules worth knowing" notes (lines 194-215)**

In the `notes.md` bullet, change `GLOSSARY.md` to `CONCEPTS.md`. Add a working-memory
bullet after the "Context watch" bullet:

```markdown
- **Working memory** — high-effort stages keep a transient `project/work/<task>.md`
  (checklist + log) so a session that ends mid-stage resumes cleanly. It is drained and
  deleted on completion, never a source of truth. Recommended: set `autoCompact: false`
  in Claude Code so you control when to `/clear` while the files carry state.
```

- [ ] **Step 4: Update the "Product before tech" bullet entity reference**

In "Product before tech" (lines 200-204), the data-model sentence stays, but ensure the
glossary mention (if any) reads `CONCEPTS.md`. No other change.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: README documents concepts stage, working memory, autoCompact tip"
```

---

### Task 14: Full verification sweep

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `node --test scripts/`
Expected: PASS — every test in `adhd-state.test.mjs`, `context-watch.test.mjs`, and `handoff-prompt.test.mjs`.

- [ ] **Step 2: Grep for stragglers**

Run: `grep -rn "GLOSSARY" SKILL.md README.md reference/ scripts/`
Expected: no matches (every `GLOSSARY.md` reference has been renamed to `CONCEPTS.md`). If any remain, fix them and re-run.

- [ ] **Step 3: Smoke-test the new stage end-to-end in a scratch project**

```bash
TMP=$(mktemp -d) && cd "$TMP" && git init -q
node ~/.claude/skills/adhd/scripts/adhd-state.mjs init
mkdir -p docs
node ~/.claude/skills/adhd/scripts/adhd-state.mjs gate concepts   # expect pass:false (foundation not done)
printf '# Product\n' > docs/PRODUCT.md
printf '# Decisions\n\n## baseline\n' > docs/DECISIONS.md
node ~/.claude/skills/adhd/scripts/adhd-state.mjs gate concepts   # expect pass:true
node ~/.claude/skills/adhd/scripts/adhd-state.mjs gate prototype  # expect pass:false (concepts not done)
printf '# Concepts\n' > docs/CONCEPTS.md
node ~/.claude/skills/adhd/scripts/adhd-state.mjs gate prototype  # expect pass:true
node ~/.claude/skills/adhd/scripts/adhd-state.mjs status          # concepts appears in groundwork line
cd - && rm -rf "$TMP"
```
Expected: gate results match the inline comments; `status` shows `concepts` in the Groundwork line.

- [ ] **Step 4: Commit any fixes from the sweep**

```bash
git add -A
git commit -m "test: verification sweep for concepts stage + working memory"
```
(Skip if the sweep produced no changes.)
```
