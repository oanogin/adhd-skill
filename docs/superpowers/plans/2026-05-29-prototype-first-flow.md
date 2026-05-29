# Prototype-First Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the whole-product Hi-Fi clickable prototype to a groundwork stage (`prototype`, absorbing `map`) that runs before `stories`, and shrink the per-milestone `design` stage into `ux-refine`.

**Architecture:** The project state is its files; the stage graph is encoded in `scripts/adhd-state.mjs` and documented in `SKILL.md` + `reference/*.md`. Change the graph in the engine (test-driven), then bring every doc in line. New groundwork order: `setup → vision → foundation → prototype → stories`. Per-milestone `design` → `ux-refine`.

**Tech Stack:** Node.js ESM, `node:test` + `node:assert/strict` (no test runner config; run with `node --test`). Markdown docs.

**Spec:** `docs/superpowers/specs/2026-05-29-prototype-first-flow-design.md`

---

## File Structure

- `scripts/adhd-state.mjs` — stage-graph engine (constants, `groundworkDone`, `gate`, `milestoneNext`, `milestoneStageDone`, `statusReport`, `validate`). One responsibility: derive state from files.
- `scripts/adhd-state.test.mjs` — the engine's test suite; expresses the graph as assertions. Drives Task 1.
- `reference/prototype.md` — NEW; the `prototype` stage procedure (absorbs `map`).
- `reference/ux-refine.md` — RENAMED from `reference/design.md`; narrowed scope.
- `reference/map.md` — DELETED.
- `reference/{vision,foundation,stories,milestone-brief,tracer,features,review,finalize,adopt,workspace,setup}.md` — wiring edits (gate predecessor, next stage, `design`→`ux-refine`).
- `SKILL.md` — stages table, flow, canonical layout, prototype sections, routing.
- `README.md` — flow description.

Tests live beside the engine (`scripts/`). Docs have no tests; verify them with `node adhd-state.mjs` commands on a scratch project and with `grep` for stale references.

---

## Task 1: State engine + test suite (atomic)

The engine functions are tightly coupled to the stage graph, so the engine and its tests change together and are verified green together.

**Files:**
- Modify: `scripts/adhd-state.test.mjs`
- Modify: `scripts/adhd-state.mjs`

- [ ] **Step 1: Update the `groundwork()` test helper to include the prototype sign-off**

In `scripts/adhd-state.test.mjs`, replace the helper (currently lines ~33-40):

```js
function groundwork(cwd) {
  initConfig(cwd);
  w(cwd, 'docs/PRODUCT.md');
  w(cwd, 'docs/DECISIONS.md', '# Decisions\n\n## 2026 — a real decision\n');
  w(cwd, 'project/map.md');
  w(cwd, 'docs/GLOSSARY.md');
  w(cwd, 'project/prototype.md');
  w(cwd, 'project/stories.md', '| ID | Story | Depends on |\n|----|----|----|\n| S1 | a | |');
}
```

- [ ] **Step 2: Update the `stage lists` test**

Replace the first two assertions in the `'stage lists'` test:

```js
  assert.deepEqual(GROUNDWORK_STAGES, ['setup', 'vision', 'foundation', 'prototype', 'stories']);
  assert.deepEqual(MILESTONE_STAGES, ['milestone-brief', 'ux-refine', 'tracer', 'features', 'review', 'finalize']);
```

- [ ] **Step 3: Update the `groundworkDone derives from files` test**

Replace the whole test body:

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
  assert.equal(groundworkDone(cwd, 'prototype'), false);
  w(cwd, 'project/map.md');
  w(cwd, 'docs/GLOSSARY.md');
  assert.equal(groundworkDone(cwd, 'prototype'), false); // map+glossary but no sign-off
  w(cwd, 'project/prototype.md');
  assert.equal(groundworkDone(cwd, 'prototype'), true);
});
```

- [ ] **Step 4: Update the `gate: groundwork chain` test**

Replace the whole test body:

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
  assert.equal(gate(cwd, 'prototype').pass, false);
  w(cwd, 'docs/DECISIONS.md', '# Decisions\n\n## a decision\n');
  assert.equal(gate(cwd, 'prototype').pass, true);
  assert.equal(gate(cwd, 'stories').pass, false);
  w(cwd, 'project/map.md');
  w(cwd, 'docs/GLOSSARY.md');
  w(cwd, 'project/prototype.md');
  assert.equal(gate(cwd, 'stories').pass, true);
  assert.equal(gate(cwd, 'milestone-brief', { milestone: 1 }).pass, false);
  w(cwd, 'project/stories.md', '| ID | Story |\n|--|--|\n| S1 | a |');
  assert.equal(gate(cwd, 'milestone-brief', { milestone: 1 }).pass, true);
});
```

- [ ] **Step 5: Rename `design` → `ux-refine` and `design.md` → `ux-refine.md` across the rest of the test file**

Apply these exact replacements (each occurs in the noted tests):

- `gate(cwd, 'design'` → `gate(cwd, 'ux-refine'` (test `'gate: milestone stages need a milestone and predecessors'`, 3 occurrences)
- `'project/milestones/m1/design.md'` → `'project/milestones/m1/ux-refine.md'` (tests: tracer-refuses, nextStage-walks, prototype-only-skips, build-order, interleaves — every `w(cwd, 'project/milestones/m1/design.md')`)
- `nextStage(cwd, { milestone: 1 }).stage, 'design'` → `... 'ux-refine'` (tests: `'nextStage walks groundwork then a milestone'`, `'milestones are independent'`, 3 occurrences)

Verify none remain:

```bash
grep -n "'design'\|design\.md" scripts/adhd-state.test.mjs
```
Expected: no output.

- [ ] **Step 6: Run the suite to confirm it fails against the current engine**

Run: `node --test scripts/adhd-state.test.mjs`
Expected: FAIL — `stage lists`, `groundworkDone derives from files`, `gate: groundwork chain`, and several milestone tests fail because the engine still uses the old graph.

- [ ] **Step 7: Update the engine constants**

In `scripts/adhd-state.mjs`, replace:

```js
export const GROUNDWORK_STAGES = ['setup', 'vision', 'foundation', 'prototype', 'stories'];
export const MILESTONE_STAGES = ['milestone-brief', 'ux-refine', 'tracer', 'features', 'review', 'finalize'];
export const FEATURE_STAGES = ['plan', 'build'];

export const STAGE_EFFORT = {
  setup: 'low', vision: 'high', foundation: 'medium', prototype: 'high', stories: 'medium',
  'milestone-brief': 'medium', 'ux-refine': 'high', tracer: 'high', features: 'high',
  review: 'high', finalize: 'low', plan: 'medium', build: 'medium',
};
```

- [ ] **Step 8: Update `groundworkDone`**

Replace the `switch` body:

```js
export function groundworkDone(cwd, stage) {
  const docHome = loadConfig(cwd)?.docHome ?? 'docs';
  switch (stage) {
    case 'setup': return exists(cwd, CONFIG_FILE);
    case 'vision': return exists(cwd, `${docHome}/PRODUCT.md`);
    case 'foundation':
      return exists(cwd, `${docHome}/DECISIONS.md`)
        && /^##\s/m.test(read(cwd, `${docHome}/DECISIONS.md`));
    case 'prototype':
      return exists(cwd, 'project/prototype.md')
        && exists(cwd, 'project/map.md')
        && exists(cwd, `${docHome}/GLOSSARY.md`);
    case 'stories': return exists(cwd, 'project/stories.md');
    default: return false;
  }
}
```

- [ ] **Step 9: Update the `gate` switch — groundwork cases, milestone-brief, and the `needsMilestone` list**

Replace the `needsMilestone` line:

```js
  const needsMilestone = ['milestone-brief', 'ux-refine', 'tracer', 'features', 'plan', 'build', 'review', 'finalize'];
```

Replace the groundwork + milestone-brief + ux-refine + tracer cases:

```js
    case 'setup': break;
    case 'vision': need(gw('setup'), 'setup not done — no project/config.json'); break;
    case 'foundation': need(gw('vision'), 'vision not done — docs/PRODUCT.md missing'); break;
    case 'prototype': need(gw('foundation'), 'foundation not done — no decisions logged in docs/DECISIONS.md'); break;
    case 'stories': need(gw('prototype'), 'prototype not done — project/prototype.md / project/map.md / docs/GLOSSARY.md missing'); break;
    case 'milestone-brief': need(gw('stories'), 'stories not done — project/stories.md missing'); break;
    case 'ux-refine': need(ms('milestone-brief'), `milestone ${milestone}: milestone-brief not done`); break;
    case 'tracer':
      need(ms('ux-refine'), `milestone ${milestone}: ux-refine not done`);
      need(track !== 'prototype', `milestone ${milestone} is prototype-only — tracer does not apply`);
      break;
```

(The old `case 'map':` line is removed; the old `case 'design':` line is replaced by `case 'ux-refine':` above.)

- [ ] **Step 10: Update the prototype-track `review` predecessor**

In the `case 'review':` block, replace the prototype-track branch:

```js
      if (track === 'prototype') {
        need(ms('ux-refine'), `milestone ${milestone}: ux-refine not done`);
      } else {
```

- [ ] **Step 11: Update `milestoneStageDone` filename map**

```js
  const f = { 'milestone-brief': 'brief.md', 'ux-refine': 'ux-refine.md', tracer: 'tracer.md',
    features: 'features.md', review: 'review.md', finalize: 'summary.md' }[stage];
```

- [ ] **Step 12: Update `milestoneNext`**

Replace the `design` line:

```js
  if (!milestoneStageDone(cwd, m, 'ux-refine')) return at('ux-refine');
```

- [ ] **Step 13: Update `statusReport` — the prototype-track stage list and the stale token**

Replace the prototype-track stage list:

```js
    const stages = track === 'prototype'
      ? ['milestone-brief', 'ux-refine', 'review', 'finalize']
      : MILESTONE_STAGES;
```

Replace the no-config message (removes the stale `{{command_prefix}}` token):

```js
  if (!loadConfig(cwd)) return 'No project/config.json. Run `adhd setup` to begin.';
```

- [ ] **Step 14: Update the `validate` standalone-topology check**

Replace the `groundworkDone(cwd, 'map')` reference:

```js
    if (groundworkDone(cwd, 'prototype') && !proto.subpath && !proto.repo) {
```

(`audit`'s MECHANISM scan list keeps `project/map.md` — no change. `map.md` stays capability-level.)

- [ ] **Step 15: Run the suite to confirm green**

Run: `node --test scripts/adhd-state.test.mjs`
Expected: PASS — all tests pass.

Also run the sibling suites to confirm no collateral breakage:

Run: `node --test scripts/`
Expected: PASS — all files green.

- [ ] **Step 16: Smoke-test the CLI on a scratch project**

```bash
cd "$(mktemp -d)" && node ~/.claude/skills/adhd/scripts/adhd-state.mjs init >/dev/null
node ~/.claude/skills/adhd/scripts/adhd-state.mjs status
```
Expected: `Groundwork:  setup ✓  vision ·  foundation ·  prototype ·  stories ·` and `Next runnable stage: vision`.

- [ ] **Step 17: Commit**

```bash
git add scripts/adhd-state.mjs scripts/adhd-state.test.mjs
git commit -m "feat: prototype-first stage graph; rename design->ux-refine"
```

---

## Task 2: New `reference/prototype.md`; delete `reference/map.md`

**Files:**
- Create: `reference/prototype.md`
- Delete: `reference/map.md`

- [ ] **Step 1: Write `reference/prototype.md`**

Model it on the existing reference shape (effort / gate / output / sub-skill header, gate-check block, procedure, output, on-completion). Content:

- **Effort:** high. **Gate:** `foundation` is done (`docs/DECISIONS.md` has a logged decision). **Output:** `project/prototype.md` (sign-off), `project/map.md`, `docs/GLOSSARY.md`, `project/surfaces/<name>.md`, and the wired clickable prototype app. **Sub-skill:** brainstorming + impeccable.
- Gate-check block: `node {{scripts_path}}/adhd-state.mjs gate prototype`; if `foundation` missing, HALT and tell the user to run `adhd foundation`.
- Procedure:
  1. **Sitemap (absorbs `map`).** Author `project/map.md`: flat surface catalog (each surface name, one-line purpose, `kind` ui|api|lib, production home — `ui` may be `TBD`); in `multi` mode the **Domains** table and **Deployables** section; keep `ui` surfaces workspace-sized. Name capabilities, not mechanisms. (Lift the procedure text from the deleted `map.md`.)
  2. **Glossary.** Author `docs/GLOSSARY.md` — core concepts + relationships, plain product terms, no schema.
  3. **Whole-product UX flow.** Invoke `brainstorming` to design how the `ui` surfaces connect into one product flow; write project-wide surface specs to `project/surfaces/<name>.md` (pass this target path explicitly).
  4. **Hi-Fi UI.** Invoke `impeccable` for each `ui` surface; build them into ONE wired, clickable prototype app in the prototype home (per `prototypeTopology`). Mock data only — no backend, no real persistence. Cover critical/important flow and rules, detailed enough to communicate intent; not every pixel.
  5. **Sign-off.** Walk the user through the clickable prototype. Only when they approve, write `project/prototype.md` (what the prototype covers, the flow, open questions). This file existing = stage done.
- On-completion: write outputs; `session-add prototype`; `context-watch.mjs --next stories`; drain `notes.md`; tell the user the next runnable stage is `stories`.
- Note: `prototype` is re-runnable — re-run to evolve the whole-product flow (per-milestone slice changes are `ux-refine`).

- [ ] **Step 2: Delete `reference/map.md`**

```bash
git rm reference/map.md
```

- [ ] **Step 3: Verify no reference points at the deleted file**

```bash
grep -rn "reference/map.md\|adhd map\b" reference SKILL.md README.md
```
Expected: no output (later tasks fix `SKILL.md`/refs; if anything shows here it is fixed in Task 4/5).

- [ ] **Step 4: Commit**

```bash
git add reference/prototype.md
git commit -m "feat: add prototype stage reference, remove map reference"
```

---

## Task 3: Rename `reference/design.md` → `reference/ux-refine.md`, narrow scope

**Files:**
- Rename: `reference/design.md` → `reference/ux-refine.md`

- [ ] **Step 1: Rename the file**

```bash
git mv reference/design.md reference/ux-refine.md
```

- [ ] **Step 2: Rewrite the header + scope**

Edit `reference/ux-refine.md`:
- Header **Gate:** `milestone-brief` is done for milestone N. **Output:** `project/milestones/m<N>/ux-refine.md` + refined entries under `m<N>/surfaces/`. **Sub-skill:** impeccable (+ brainstorming only for genuinely new milestone-specific flows).
- Gate-check block: `node {{scripts_path}}/adhd-state.mjs gate ux-refine --milestone <N>`; if `milestone-brief` missing, HALT.
- Procedure: the whole-product prototype already exists (built in groundwork `prototype`). This stage **refines only THIS milestone's slice** — deeper UI, milestone-specific states and edge cases — on the milestone's chosen `ui` surfaces. Write refinements to `m<N>/surfaces/<name>.md` (pass this target to impeccable). Route by surface `kind` as before (`ui` → impeccable; `api` → contract; `lib` → spec).
- **Hard rule (new, prominent):** `ux-refine` must NOT change the whole-product flow or rules. If a milestone reveals the whole-product flow is wrong, STOP and re-run the groundwork `prototype` stage instead.
- On-completion: write `m<N>/ux-refine.md`; `session-add ux-refine`; `context-watch.mjs --next tracer` (production) — note prototype-only milestones go to `review`; drain notes; next runnable stage is `tracer` (production) or `review` (prototype-only).

- [ ] **Step 3: Verify**

```bash
grep -rn "design\.md\|adhd design\b\|stage design" reference/ux-refine.md
```
Expected: no stale `design` self-references.

- [ ] **Step 4: Commit**

```bash
git add reference/ux-refine.md
git commit -m "refactor: rename design stage to ux-refine, narrow to milestone slice"
```

---

## Task 4: Re-wire the remaining reference files

Each edit changes only gate predecessors, next-stage pointers, and `design`→`ux-refine` / `map`→`prototype` mentions.

**Files (Modify):** `reference/vision.md`, `reference/foundation.md`, `reference/stories.md`, `reference/milestone-brief.md`, `reference/tracer.md`, `reference/features.md`, `reference/review.md`, `reference/finalize.md`, `reference/adopt.md`, `reference/workspace.md`, `reference/setup.md`

- [ ] **Step 1: `vision.md`** — change the on-completion next stage and context-watch from `stories` to `foundation`: `context-watch.mjs --next foundation`; final line "the next runnable stage is `foundation`".

- [ ] **Step 2: `foundation.md`** — Gate header + gate-check: depends on **vision** (`docs/PRODUCT.md`), not `stories.md`. On-completion: `context-watch.mjs --next prototype`; final line "the next runnable stage is `prototype`". Keep the multi-repo/workspace + topology steps (still set before the prototype is built).

- [ ] **Step 3: `stories.md`** — Gate header + gate-check: depends on **prototype** (`project/prototype.md` / `project/map.md` / `docs/GLOSSARY.md`), not vision. Procedure: stories are **derived from the signed-off prototype** and the behaviors clarified while building it — walk the prototype's surfaces/flows and capture them as stories. On-completion: `context-watch.mjs --next milestone-brief`; final line "the next runnable stage is `milestone-brief` for milestone 1". (Stories remains a living backlog.)

- [ ] **Step 4: `milestone-brief.md`** — Gate header + gate-check: depends on **stories** (`project/stories.md`). It still selects surfaces from `project/map.md` (now authored by `prototype`). On-completion next stage: `ux-refine` (was `design`); `context-watch.mjs --next ux-refine`.

- [ ] **Step 5: `tracer.md`** — Gate depends on **`ux-refine`** (was `design`). Replace every `design` mention with `ux-refine`.

- [ ] **Step 6: `features.md`** — Replace `design` with `ux-refine`. Update the "updates the prototype FIRST" rule: when real-backend reality contradicts the prototype, a **milestone-slice** change is made via `ux-refine`; a **whole-product flow/rule** change requires re-running the groundwork `prototype` stage.

- [ ] **Step 7: `review.md`** — Replace any `design` mention with `ux-refine` (prototype-only milestones gate `review` on `ux-refine`).

- [ ] **Step 8: `finalize.md`** — Replace any `design` mention with `ux-refine` if present.

- [ ] **Step 9: `adopt.md`** — Update the groundwork-loop description to the new order `setup → vision → foundation → prototype → stories`; mention the prototype substitute/expectation.

- [ ] **Step 10: `workspace.md`** — Where it says domains are defined during `map`, change to **`prototype`**.

- [ ] **Step 11: `setup.md`** — Update any canonical-layout / stage-order references: groundwork order, `m<N>/design.md` → `m<N>/ux-refine.md`, add `project/prototype.md` and `project/surfaces/` if the layout is reproduced here.

- [ ] **Step 12: Verify no stale references remain in `reference/`**

```bash
grep -rn "\bmap\b\|design\.md\|\bdesign\b\|{{command_prefix}}" reference/ | grep -v "ux-refine\|sitemap\|prototype.md\|roadmap"
```
Expected: review each hit; legitimate uses of the word "map" inside `prototype.md` (the sitemap procedure) are fine. No reference to a `map` *stage*, `design` *stage*, or `design.md` file should remain.

- [ ] **Step 13: Commit**

```bash
git add reference/
git commit -m "docs: rewire reference stages for prototype-first flow"
```

---

## Task 5: Update `SKILL.md`

**Files:**
- Modify: `SKILL.md`

- [ ] **Step 1: Stages table** — Remove the `map` row. Add a `prototype` row: `groundwork | high | project/prototype.md (+ map.md + GLOSSARY.md) | brainstorming + impeccable | reference/prototype.md`. Rename the `design` row to `ux-refine`: `per-milestone | high | m<N>/ux-refine.md | impeccable | reference/ux-refine.md`. Place `prototype` between `foundation` and `stories`.

- [ ] **Step 2: Flow paragraph** — Rewrite groundwork order to `setup → vision → foundation → prototype → stories` (`stories` and `prototype` re-runnable). Per-milestone: `milestone-brief → ux-refine`, then prototype-only → `review → finalize`; production → `tracer → features → plan/build → review → finalize`.

- [ ] **Step 3: "Groundwork and per-milestone work" section** — New loop order; note `prototype` is re-runnable for whole-product flow evolution and `stories` is derived from it.

- [ ] **Step 4: "Canonical layout"** — Add `project/prototype.md` (sign-off) and `project/surfaces/<name>.md` (project-wide surface specs). Rename `milestones/m<N>/design.md` → `ux-refine.md`. Remove the standalone `map` stage note if any; `map.md` stays, authored by `prototype`.

- [ ] **Step 5: "Required-skill preflight"** — `impeccable` is used in the `prototype` (groundwork) and `ux-refine` stages; `brainstorming` in `prototype`, `writing-plans` in `plan`, `executing-plans` in `build`.

- [ ] **Step 6: "Prototype and production apps"** — Rewrite: the clickable prototype is built and signed off in the groundwork `prototype` stage, before any milestone. `ux-refine` upgrades only the milestone's slice. When production reality contradicts the prototype: slice-only → `ux-refine`; whole-flow → re-run `prototype`.

- [ ] **Step 7: "No roadmap"** — Reconcile: still no hardcoded milestone list, but the whole-product prototype is the shared soft roadmap that milestones are carved from.

- [ ] **Step 8: "Capability, not mechanism"** — The product-scope artifacts (`PRODUCT.md`, `stories.md`, `map.md`) stay capability-only; the prototype *app* legitimately uses the frontend framework chosen at `foundation`.

- [ ] **Step 9: Common-mistakes table** — Rename `design` → `ux-refine`. Add a row: "Changing the whole-product flow inside `ux-refine`." → "That belongs to the groundwork `prototype` stage — re-run it; `ux-refine` only refines the milestone's slice."

- [ ] **Step 10: Routing + any other `design`/`map` mention** — Keep "13 stages". Update remaining `design`→`ux-refine`. Add the naming-overlap note (the milestone **track** value `prototype` is distinct from the groundwork **stage** `prototype`).

- [ ] **Step 11: Verify**

```bash
grep -n "\bmap\b\|\bdesign\b\|design\.md\|{{command_prefix}}" SKILL.md | grep -v "sitemap\|roadmap\|ux-refine\|prototype"
```
Expected: review each hit; no reference to a `map` stage or a `design` stage/file should remain.

- [ ] **Step 12: Commit**

```bash
git add SKILL.md
git commit -m "docs: SKILL.md prototype-first flow and ux-refine rename"
```

---

## Task 6: Update `README.md`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the flow description** — New groundwork order, the prototype-first model, and the `design`→`ux-refine` rename wherever the README describes stages.

- [ ] **Step 2: Verify**

```bash
grep -n "\bmap\b\|\bdesign\b" README.md | grep -v "sitemap\|roadmap\|ux-refine\|prototype"
```
Expected: no stale `map`/`design` stage references.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README prototype-first flow"
```

---

## Task 7: Final verification sweep

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `node --test scripts/`
Expected: PASS — all suites green.

- [ ] **Step 2: Repo-wide stale-reference grep**

```bash
grep -rn "design\.md\|GROUNDWORK.*map\|adhd map\b\|{{command_prefix}}" \
  --include='*.md' --include='*.mjs' . | grep -v docs/superpowers/
```
Expected: no output. (The spec/plan under `docs/superpowers/` legitimately discuss the old names.)

- [ ] **Step 3: End-to-end CLI walk on a scratch project**

```bash
D="$(mktemp -d)"; S=~/.claude/skills/adhd/scripts/adhd-state.mjs
cd "$D" && node "$S" init >/dev/null
mkdir -p docs project
printf 'x' > docs/PRODUCT.md
printf '# Decisions\n\n## baseline\n' > docs/DECISIONS.md
node "$S" next   # expect stage: prototype
printf 'x' > project/map.md; printf 'x' > docs/GLOSSARY.md; printf 'x' > project/prototype.md
node "$S" next   # expect stage: stories
printf '| ID | Story |\n|--|--|\n| S1 | a |\n' > project/stories.md
node "$S" next   # expect stage: milestone-brief, milestone 1
node "$S" validate  # expect: validate: ok
```
Expected: `next` walks `prototype → stories → milestone-brief`; `validate: ok`.

- [ ] **Step 4: Report** — Summarize: tests green, no stale references, CLI walk correct. Do NOT commit (no changes in this task).

---

## Self-Review

**Spec coverage:** Task 1 covers all `adhd-state.mjs` + test edits (constants, `groundworkDone`, `gate` incl. `milestone-brief ← stories`, `milestoneStageDone`, `milestoneNext`, `statusReport`, `validate`, `{{command_prefix}}`). Task 2 = new `prototype.md` + delete `map.md`. Task 3 = `design.md`→`ux-refine.md` rename + narrow. Task 4 = reference rewiring. Task 5 = SKILL.md sections. Task 6 = README. Task 7 = verification. Every spec §5 bullet maps to a step.

**Placeholder scan:** Engine code steps show full code. Doc steps describe exact section + edit; doc prose is authored at execution time against the live file (the spec defines the required content), which is appropriate for prose docs — every doc step names the exact file, section, and required change, with a grep verification.

**Type/name consistency:** `ux-refine` (stage) and `ux-refine.md` (artifact) used uniformly; `prototype` stage done-artifact `project/prototype.md`; `milestone-brief ← stories`; effort `prototype: 'high'`, `ux-refine: 'high'`. Consistent across tasks.
