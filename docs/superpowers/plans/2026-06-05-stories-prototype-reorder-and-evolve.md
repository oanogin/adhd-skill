# Reorder `stories`/`prototype` + `evolve` Conductor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder groundwork to `concepts → stories → prototype` (stories derived from concepts, prototype realizes them), add a single-source `Surfaces` trace column gated at `milestone-brief`, and add the `evolve` change-conductor stage.

**Architecture:** `scripts/adhd-state.mjs` is the state machine (stage lists, gates, derivations) with a `node:test` suite in `scripts/adhd-state.test.mjs`. Behaviour is doc-driven: `reference/<stage>.md` playbooks + `SKILL.md` router + `README.md`. Code changes are TDD against the existing suite; the per-stage procedures live in the references. `evolve` is an on-demand conductor (like `verify`/`adopt`) — not in the linear `GROUNDWORK_STAGES`/`MILESTONE_STAGES` arrays; it gets its own `gate` case and drives re-runs of the living stages.

**Tech Stack:** Node.js (v18+, ESM `.mjs`), `node:test` + `node:assert/strict`. No build, no package.json. Markdown reference/skill docs.

**Spec:** `docs/superpowers/specs/2026-06-05-stories-prototype-reorder-and-evolve-design.md`

**Test command (used throughout):** `node --test scripts/adhd-state.test.mjs`

---

## File Structure

- `scripts/adhd-state.mjs` — MODIFY: `GROUNDWORK_STAGES` order; `gate` predecessor flips + `evolve` case; `parseStories` gains `surfaces`; new `briefStoryIds()` helper; `validate` empty-`Surfaces` blocker.
- `scripts/adhd-state.test.mjs` — MODIFY: order assertions, gate-chain assertions; ADD: `surfaces` parse, `briefStoryIds`, validate empty-`Surfaces`, `evolve` gate tests.
- `reference/stories.md` — MODIFY: gate→concepts, derive-from-concepts, `Surfaces` column, `brainstorming` sub-skill, next→prototype.
- `reference/prototype.md` — MODIFY: gate→stories, realize-the-backlog, `Surfaces`-cell write, `## Story changes` work-buffer + drain, split scope-creep rule, next→milestone-brief.
- `reference/concepts.md` — MODIFY: next→stories.
- `reference/milestone-brief.md` — MODIFY: gate→prototype, empty-`Surfaces` selection ban.
- `reference/evolve.md` — CREATE: the conductor procedure.
- `reference/ux-refine.md`, `features.md`, `review.md`, `finalize.md`, `tracer.md` — MODIFY: post-groundwork change routes through `evolve`.
- `reference/adopt.md`, `setup.md`, `workspace.md` — MODIFY: groundwork order + `Surfaces` column + `evolve` mention.
- `reference/verify.md` — MODIFY: add the three new drift checks.
- `SKILL.md` — MODIFY: stages table, flow, living-stages, working-memory list, canonical layout, common-mistakes, stage count.
- `README.md` — MODIFY: flow diagram, stage table, usage, rules, requirements.

---

## Task 1: Reorder `GROUNDWORK_STAGES` and flip the gate chain

**Files:**
- Modify: `scripts/adhd-state.mjs:16` (`GROUNDWORK_STAGES`), `scripts/adhd-state.mjs:222-224` (gate cases)
- Test: `scripts/adhd-state.test.mjs:52-64`, `:130-145`

- [ ] **Step 1: Update the failing tests to express the new order**

In `scripts/adhd-state.test.mjs`, replace the `stage lists` assertion (currently line ~53):

```javascript
  assert.deepEqual(GROUNDWORK_STAGES, ['setup', 'vision', 'foundation', 'concepts', 'stories', 'prototype']);
```

Replace the `concepts is a groundwork stage…` test (lines ~61-65) with:

```javascript
test('concepts → stories → prototype groundwork order', () => {
  const i = GROUNDWORK_STAGES.indexOf('concepts');
  assert.equal(GROUNDWORK_STAGES[i + 1], 'stories');
  assert.equal(GROUNDWORK_STAGES[i + 2], 'prototype');
  assert.equal(GROUNDWORK_STAGES.at(-1), 'prototype');
});
```

In the `gate: groundwork chain` test, the predecessor order changes. Locate the tail of that test (around lines ~141-146, after `concepts` passes) and replace the `prototype`/`stories` ordering so `stories` gates on `concepts` and `prototype` gates on `stories`:

```javascript
  // concepts done -> stories runnable; prototype NOT yet (stories.md absent)
  w(cwd, 'docs/CONCEPTS.md');
  assert.equal(gate(cwd, 'concepts').pass, true);
  assert.equal(gate(cwd, 'stories').pass, true);
  assert.equal(gate(cwd, 'prototype').pass, false);
  // stories done -> prototype runnable
  w(cwd, 'project/stories.md', '| ID | Story | Depends on | Surfaces |\n|--|--|--|--|\n| S1 | a | | |');
  assert.equal(gate(cwd, 'prototype').pass, true);
  // milestone-brief NOT yet (prototype.md/map.md absent)
  assert.equal(gate(cwd, 'milestone-brief', { milestone: 1 }).pass, false);
  // prototype done -> milestone-brief runnable
  w(cwd, 'project/map.md');
  w(cwd, 'project/prototype.md');
  assert.equal(gate(cwd, 'milestone-brief', { milestone: 1 }).pass, true);
```

> Note: delete any now-contradictory lines later in that test that asserted the old `prototype`-before-`stories` order. The test must read top-to-bottom as `concepts → stories → prototype → milestone-brief`.

- [ ] **Step 2: Run the tests, verify they fail**

Run: `node --test scripts/adhd-state.test.mjs`
Expected: FAIL — `GROUNDWORK_STAGES` deepEqual mismatch and gate-chain assertions fail (source still has old order).

- [ ] **Step 3: Reorder `GROUNDWORK_STAGES`**

`scripts/adhd-state.mjs:16`:

```javascript
export const GROUNDWORK_STAGES = ['setup', 'vision', 'foundation', 'concepts', 'stories', 'prototype'];
```

- [ ] **Step 4: Flip the three gate predecessors**

`scripts/adhd-state.mjs`, in `gate()` replace the `stories`, `prototype`, and `milestone-brief` cases (lines ~223-224):

```javascript
    case 'stories': need(gw('concepts'), 'concepts not done — docs/CONCEPTS.md missing'); break;
    case 'prototype': need(gw('stories'), 'stories not done — project/stories.md missing'); break;
    case 'milestone-brief': need(gw('prototype'), 'prototype not done — project/prototype.md / project/map.md missing'); break;
```

(`groundworkDone`'s switch is keyed by stage name and needs no change; `nextStage`/`statusReport`/`validate` read `GROUNDWORK_STAGES` and follow automatically.)

- [ ] **Step 5: Run the tests, verify they pass**

Run: `node --test scripts/adhd-state.test.mjs`
Expected: PASS (33+ tests).

- [ ] **Step 6: Commit**

```bash
git add scripts/adhd-state.mjs scripts/adhd-state.test.mjs
git commit -m "feat: reorder groundwork to concepts -> stories -> prototype"
```

---

## Task 2: `parseStories` gains `surfaces`; `briefStoryIds` helper

**Files:**
- Modify: `scripts/adhd-state.mjs:117-127` (`parseStories`), add helper near `milestoneTrack` (~line 164)
- Test: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing tests**

Add to `scripts/adhd-state.test.mjs` (import `briefStoryIds` alongside the other named imports at the top):

```javascript
test('parseStories reads the Surfaces column', () => {
  const cwd = tmp();
  w(cwd, 'project/stories.md',
    '| ID | Story | Depends on | Surfaces |\n|--|--|--|--|\n' +
    '| S1 | a | | Dashboard, Settings |\n' +
    '| S2 | b | S1 | |');
  const s = parseStories(cwd);
  assert.deepEqual(s[0].surfaces, ['Dashboard', 'Settings']);
  assert.deepEqual(s[1].surfaces, []);
});

test('briefStoryIds matches story IDs as whole words in brief.md', () => {
  const cwd = tmp();
  w(cwd, 'project/stories.md',
    '| ID | Story | Surfaces |\n|--|--|--|\n| S1 | a | Dash |\n| S2 | b | |\n| LEGAL | c | Page |');
  w(cwd, 'project/milestones/m1/brief.md',
    '# Milestone 1 — x\nChosen stories: S1 and LEGAL. (S2 is deferred-ish text S22 should not match.)');
  const ids = briefStoryIds(cwd, 1);
  assert.deepEqual([...ids].sort(), ['LEGAL', 'S1']);
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `node --test scripts/adhd-state.test.mjs`
Expected: FAIL — `surfaces` is `undefined`; `briefStoryIds` is not exported.

- [ ] **Step 3: Add `surfaces` to `parseStories`**

`scripts/adhd-state.mjs`, in `parseStories` (lines ~120-126):

```javascript
  const idC = header.indexOf('id');
  const depC = header.indexOf('depends on');
  const surfC = header.indexOf('surfaces');
  if (idC < 0) return [];
  return rows.map((r) => ({
    id: clean(r[idC]),
    dependsOn: depC >= 0 ? clean(r[depC]).split(',').map((s) => s.trim()).filter(Boolean) : [],
    surfaces: surfC >= 0 ? clean(r[surfC]).split(',').map((s) => s.trim()).filter(Boolean) : [],
  })).filter((s) => s.id);
```

- [ ] **Step 4: Add the `briefStoryIds` helper**

`scripts/adhd-state.mjs`, after `milestoneTrack` (~line 164), add and export:

```javascript
// Story IDs (from stories.md) that appear as whole words in m<N>/brief.md.
// Used to enforce the empty-Surfaces selection gate without mandating a brief format.
export function briefStoryIds(cwd, m) {
  const rel = milestoneRel(m, 'brief.md');
  if (!exists(cwd, rel)) return new Set();
  const text = read(cwd, rel);
  const ids = (parseStories(cwd) ?? []).map((s) => s.id);
  const found = new Set();
  for (const id of ids) {
    const re = new RegExp(`(?<![\\w-])${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`);
    if (re.test(text)) found.add(id);
  }
  return found;
}
```

- [ ] **Step 5: Run the tests, verify they pass**

Run: `node --test scripts/adhd-state.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/adhd-state.mjs scripts/adhd-state.test.mjs
git commit -m "feat: parse Surfaces column and brief story IDs"
```

---

## Task 3: `validate` blocks a brief that selects an empty-`Surfaces` story

**Files:**
- Modify: `scripts/adhd-state.mjs` `validate()` (~line 421, inside the milestone loop region)
- Test: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
test('validate blocks a brief selecting a story with empty Surfaces', () => {
  const cwd = tmp();
  fullGroundwork(cwd); // helper that writes config + all groundwork artifacts (see Step 3 note)
  w(cwd, 'project/stories.md',
    '| ID | Story | Surfaces |\n|--|--|--|\n| S1 | a | Dash |\n| S2 | b | |');
  w(cwd, 'project/milestones/m1/brief.md', '# Milestone 1 — x\nStories: S1, S2.');
  const r = validate(cwd);
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => /S2/.test(b) && /surfaces/i.test(b)),
    `expected an empty-Surfaces blocker, got: ${JSON.stringify(r.blockers)}`);
});
```

> If a `fullGroundwork`/equivalent helper does not already exist in the test file, write the four `w(...)` calls inline (config via `initConfig`, `docs/PRODUCT.md`, `docs/DECISIONS.md` with a `## h`, `docs/CONCEPTS.md`, `project/stories.md`, `project/map.md`, `project/prototype.md`) so `groundworkDone` is satisfied. Reuse the existing `seedGroundwork`/`w` helpers already in the file if present.

- [ ] **Step 2: Run the test, verify it fails**

Run: `node --test scripts/adhd-state.test.mjs`
Expected: FAIL — no such blocker is produced.

- [ ] **Step 3: Add the check to `validate`**

`scripts/adhd-state.mjs`, inside `validate()`, in the loop over `milestoneDirs(cwd)` (add a new block; if no milestone loop exists yet in `validate`, add one):

```javascript
  // empty-Surfaces selection gate: a brief may not pick a story with no Surfaces.
  const stories = parseStories(cwd) ?? [];
  const surfacesById = Object.fromEntries(stories.map((s) => [s.id, s.surfaces]));
  for (const m of milestoneDirs(cwd)) {
    for (const id of briefStoryIds(cwd, m)) {
      if ((surfacesById[id] ?? []).length === 0) {
        blockers.push(`milestone ${m}: brief selects story "${id}" which has empty Surfaces in project/stories.md — run \`adhd evolve\` to prototype it first`);
      }
    }
  }
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `node --test scripts/adhd-state.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/adhd-state.mjs scripts/adhd-state.test.mjs
git commit -m "feat: validate blocks selecting an unprototyped (empty-Surfaces) story"
```

---

## Task 4: `evolve` gate case (groundwork-complete, no milestone)

**Files:**
- Modify: `scripts/adhd-state.mjs` `gate()` (~line 217-264)
- Test: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
test('evolve gates on groundwork complete and needs no milestone', () => {
  const cwd = tmp();
  w(cwd, 'project/config.json', JSON.stringify(defaultConfig()));
  assert.equal(gate(cwd, 'evolve').pass, false); // groundwork not done
  w(cwd, 'docs/PRODUCT.md'); w(cwd, 'docs/DECISIONS.md', '## d');
  w(cwd, 'docs/CONCEPTS.md'); w(cwd, 'project/stories.md', '| ID | Story | Surfaces |\n|--|--|--|\n| S1 | a | Dash |');
  w(cwd, 'project/map.md'); w(cwd, 'project/prototype.md');
  assert.equal(gate(cwd, 'evolve').pass, true);
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `node --test scripts/adhd-state.test.mjs`
Expected: FAIL — `gate` hits `default: unknown stage: evolve`.

- [ ] **Step 3: Add the `evolve` case**

`scripts/adhd-state.mjs`, in `gate()`, add a case before `default:` (it must NOT be in `needsMilestone`, so no `--milestone` is demanded):

```javascript
    case 'evolve': need(gw('prototype'), 'groundwork not complete — prototype not done (project/prototype.md / project/map.md)'); break;
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `node --test scripts/adhd-state.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/adhd-state.mjs scripts/adhd-state.test.mjs
git commit -m "feat: add evolve gate (groundwork-complete conductor stage)"
```

---

## Task 5: Rewrite `reference/stories.md` (derive from concepts + Surfaces column)

**Files:**
- Modify: `reference/stories.md`

- [ ] **Step 1: Apply the edits**

Make these exact changes:

1. Header block:
   - `**Gate:**` → `the \`concepts\` stage is done — \`docs/CONCEPTS.md\` exists.`
   - `**Sub-skill:**` → `superpowers:brainstorming` (was `none`).
2. Replace the opening "derived from the signed-off whole-product prototype" framing with: stories are **derived from `concepts`** — actors, entity lifecycles, and governing rules become one `actor + action + outcome` story per capability. It remains a **living** stage.
3. Gate-check section: a failing gate names **`concepts`** (`docs/CONCEPTS.md`), not `prototype`. Tell the user to run `adhd concepts` first.
4. Procedure step 1: replace "Derive stories from the prototype / reading off the prototype" with "Derive stories from `concepts` with `brainstorming` for breadth." Capture breadth now so ideas don't leak as later scope creep.
5. Procedure step 3 (table schema): add the `Surfaces` column:
   `ID | Story | Value | Depends on | Size | Surfaces`. Add a bullet:
   - `Surfaces` — comma-separated surface names that realize the story. **Filled by the `prototype` stage**, left empty here on first authoring. Empty = "not prototyped yet"; a story with empty `Surfaces` **cannot be selected at `milestone-brief`**. It is the single source of truth for story↔surface; `map.md` carries no story back-refs.
6. "On completion" step 4: next runnable stage is **`prototype`** (was `milestone-brief`).

- [ ] **Step 2: Sanity-check the file reads coherently**

Run: `node --test scripts/adhd-state.test.mjs` (must still pass — references aren't imported, this just guards against accidental code edits) and visually confirm no remaining "derived from the prototype" or "next … milestone-brief" text in `reference/stories.md`.

Run: `grep -nE "prototype|milestone-brief|Surfaces|concepts" reference/stories.md`
Expected: gate/derivation reference `concepts`; next stage is `prototype`; `Surfaces` column documented.

- [ ] **Step 3: Commit**

```bash
git add reference/stories.md
git commit -m "docs: stories derives from concepts, adds Surfaces column"
```

---

## Task 6: Rewrite `reference/prototype.md` (realize the backlog + Surfaces writes + work-buffer)

**Files:**
- Modify: `reference/prototype.md`

- [ ] **Step 1: Apply the edits**

1. Header `**Gate:**` → `the \`stories\` stage is done — \`project/stories.md\` exists.` Gate-check section: a failing gate names **`stories`**; tell the user to run `adhd stories` first.
2. Scope: rewrite from "derive stories from the prototype" to **"realize the story backlog"** — build the Hi-Fi clickable whole-product app so that every story in `stories.md` is realized by ≥1 surface.
3. Add a **Surfaces write** rule: the moment a surface realizing a story is drawn, write that surface's name into the story's `Surfaces` cell in `project/stories.md`. This is the empty→implementable flip.
4. Add a **`## Story changes` work-buffer** subsection: new or split stories surfaced while building go first to a `## Story changes` block in `project/work/prototype.md`, then are **drained into `stories.md` on completion**. The stage is not done while `## Story changes` holds unreconciled rows (the `verify` pass flags this).
5. Add the **split scope-creep rule**: splitting a story already picked into an in-flight/shipped milestone yields **backlog** rows for a future `milestone-brief` — never bolted onto the running milestone.
6. "On completion": next runnable stage is **`milestone-brief`**; drain `## Story changes` into `stories.md` before deleting the work file.

- [ ] **Step 2: Sanity-check**

Run: `grep -nE "stories|Surfaces|Story changes|milestone-brief" reference/prototype.md`
Expected: gate references `stories`; `Surfaces`-cell write + `## Story changes` drain present; next stage `milestone-brief`.

- [ ] **Step 3: Commit**

```bash
git add reference/prototype.md
git commit -m "docs: prototype realizes the backlog, writes Surfaces, buffers story changes"
```

---

## Task 7: `reference/concepts.md` + `reference/milestone-brief.md` edits

**Files:**
- Modify: `reference/concepts.md`, `reference/milestone-brief.md`

- [ ] **Step 1: `concepts.md`**

"On completion" final step: next runnable stage is **`stories`** (was `prototype`). No gate change.

- [ ] **Step 2: `milestone-brief.md`**

1. Header `**Gate:**` and gate-check section → predecessor is **`prototype`** (`project/prototype.md` + `project/map.md`), not `stories`. A failing gate tells the user to run `adhd prototype` first.
2. Procedure step 1 ("Choose the stories"): add the ban — **a story with an empty `Surfaces` cell in `project/stories.md` may not be chosen.** If a wanted story has no surface yet, stop and run `adhd evolve` to prototype it first. (`adhd-state.mjs validate` enforces this structurally.)

- [ ] **Step 3: Sanity-check**

Run: `grep -nE "stories|prototype|Surfaces|evolve" reference/milestone-brief.md; grep -n "next runnable" reference/concepts.md`
Expected: brief gates on `prototype`, bans empty-`Surfaces` selection; concepts points to `stories`.

- [ ] **Step 4: Commit**

```bash
git add reference/concepts.md reference/milestone-brief.md
git commit -m "docs: concepts -> stories handoff; brief gates on prototype + bans empty-Surfaces"
```

---

## Task 8: Create `reference/evolve.md` (the conductor)

**Files:**
- Create: `reference/evolve.md`

- [ ] **Step 1: Write the file**

Model it on the other reference playbooks (header block + Gate check + Procedure + Output + On completion). Content:

- **Effort:** high. **Gate:** groundwork complete — `prototype` done (`project/prototype.md` + `project/map.md`). **Output:** none of its own — it mutates the living groundwork artifacts. **Sub-skill:** `superpowers:brainstorming`.
- Opening: `evolve` is the **single front door** for every change after groundwork is complete — new features and updates to `concepts`/`stories`/`prototype`/`data`/`map` alike. It does not create or modify a milestone.
- Gate check: run `node {{scripts_path}}/adhd-state.mjs gate evolve`; if groundwork isn't complete, HALT and name the missing stage.
- Procedure:
  1. **Clarify with `brainstorming`.** Create `project/work/evolve.md` with a `## Gate` block (seed `requirements-confirmed`), a `## Impact plan` checklist, and a `## Log`. Pass `node {{scripts_path}}/adhd-state.mjs work-gate evolve` on the user's verbatim ok before executing any step.
  2. **Write the impact plan** into `## Impact plan`: an ordered checklist of which living artifacts must change and why, in dependency order (`concepts → stories → prototype → data/map …`). Only include the stages the change actually touches.
  3. **Confirm the plan** with the user.
  4. **Execute each item** by re-running that stage's procedure (its own gates and work-gates still apply; a new story needs its `Surfaces` filled by a `prototype` re-run before it is implementable).
- Milestone boundary: `evolve` never creates/starts a milestone. A new story lands in the backlog with a drawn surface; the user then runs `milestone-brief` to schedule it.
- On completion: the stage is **done when every `## Impact plan` item is checked AND `project/work/evolve.md` is drained and deleted.** Drain durable facts to their canonical homes first. `verify` flags a leftover `evolve.md`.

- [ ] **Step 2: Verify it parses as a work-file host**

Run: `node scripts/adhd-state.mjs workFileRel evolve 2>/dev/null || node -e "import('./scripts/adhd-state.mjs').then(m=>console.log(m.workFileRel('evolve')))"`
Expected: prints `project/work/evolve.md`.

- [ ] **Step 3: Commit**

```bash
git add reference/evolve.md
git commit -m "docs: add evolve conductor reference"
```

---

## Task 9: Route post-groundwork change through `evolve` in the remaining references

**Files:**
- Modify: `reference/ux-refine.md`, `reference/features.md`, `reference/review.md`, `reference/finalize.md`, `reference/tracer.md`, `reference/verify.md`, `reference/adopt.md`, `reference/setup.md`, `reference/workspace.md`

- [ ] **Step 1: Find every stale instruction**

Run: `grep -rnE "re-run.*(prototype|stories)|derived from the prototype|next.*milestone-brief|concepts → prototype|concepts, prototype" reference/`
Expected: a list of the lines to fix across the files below.

- [ ] **Step 2: Apply edits**

- `ux-refine.md` — where it says a whole-product flow/rule change means "re-run the groundwork `prototype` stage", change to "run `adhd evolve`". Slice-only upgrades stay in `ux-refine`.
- `features.md`, `review.md`, `finalize.md`, `tracer.md` — any "new story idea → re-run `stories`/`prototype`" mention now routes through `adhd evolve`.
- `verify.md` — add three checks to the audit list:
  1. `project/work/prototype.md` has an undrained `## Story changes` block while `prototype` is done.
  2. an `m<N>/brief.md` references a story whose `Surfaces` is empty (mirror of the `validate` blocker).
  3. a leftover `project/work/evolve.md` (abandoned mid-cascade, or all items checked but not deleted).
- `adopt.md` — groundwork loop order → `concepts → stories → prototype`; mention `evolve` as the post-adoption change door.
- `setup.md` — canonical-layout / stage-order references → new order; show `stories.md` with the `Surfaces` column.
- `workspace.md` — confirm domains are defined in `prototype`; fix any stale `concepts → prototype` ordering text.

- [ ] **Step 3: Verify no stale routing remains**

Run: `grep -rnE "re-run the groundwork .prototype. stage|derived from the prototype|stories.*derived from.*prototype" reference/`
Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add reference/
git commit -m "docs: route post-groundwork change through evolve; add verify checks"
```

---

## Task 10: Update `SKILL.md`

**Files:**
- Modify: `SKILL.md`

- [ ] **Step 1: Apply edits**

1. **Stages table** — reorder so `stories` precedes `prototype`; update the `stories` row (artifact note: derived from concepts; sub-skill `brainstorming`); add an `evolve` row: groundwork (on-demand conductor) · high · artifact `—` (done when `project/work/evolve.md` drained) · `brainstorming` · `reference/evolve.md`.
2. **Groundwork flow paragraph** (lines ~104-112) — new order `setup → vision → foundation → concepts → stories → prototype`; `stories` is the scope spec derived from concepts and the soft roadmap; `prototype` realizes it. Living stages: `concepts`, `stories`, `prototype` + `evolve` (the conductor that sequences their re-runs).
3. **Working memory list** (line ~122) — add `evolve` to the high-effort stages.
4. **Canonical layout** (lines ~201-215) — `stories.md` line notes the `Surfaces` column; add `work/evolve.md` (transient impact plan).
5. **Common-mistakes** — add: selecting a story with empty `Surfaces` into a milestone (fix: `adhd evolve` to draw its surface first); making a post-groundwork change outside `evolve` (fix: route through `evolve`).
6. **Routing line ~436** — "13 stages" → "14 stages"; ensure `evolve` is named among the management/on-demand stages alongside `workspace`/`adopt`/`verify`.
7. Required-skill preflight — `brainstorming` now also used by `stories` and `evolve`.

- [ ] **Step 2: Verify**

Run: `grep -nE "concepts → stories → prototype|evolve|14 stage|Surfaces" SKILL.md`
Expected: new order, `evolve` rows/mentions, `14 stage`, `Surfaces` all present.

Run: `node --test scripts/adhd-state.test.mjs`
Expected: PASS (guards against accidental edits to code).

- [ ] **Step 3: Commit**

```bash
git add SKILL.md
git commit -m "docs: SKILL router — new order, evolve stage, Surfaces gate"
```

---

## Task 11: Update `README.md`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Apply edits**

1. **"The flow"** (lines ~74-99) — groundwork sentence + ASCII diagram → `setup → vision → foundation → concepts → stories → prototype`; `stories` derived from concepts, `prototype` realizes it (the signed-off clickable whole-product app); the soft roadmap is still the prototype, but the backlog is the forward list.
2. **Stage table** (lines ~105-120) — reorder `stories` above `prototype`; update their Does/Output cells (`stories` output gains the `Surfaces` column; `stories` derived from concepts); add an `evolve` row (change-conductor · mutates living artifacts · output: none).
3. **Usage / management commands** (lines ~45-51) — add `/adhd evolve` — the change-intake conductor (brainstorm a new idea/update, plan the artifact updates, drive the re-runs).
4. **Modes** (line ~64) — domains defined in `prototype` stays correct.
5. **Rules worth knowing** (lines ~199-207) — milestone-discipline bullet: the front door for mid-project change is `evolve`; note a story with empty `Surfaces` cannot be selected into a milestone. Product-before-tech bullet: `Surfaces` names are capability-level.
6. **Requirements** (lines ~19-25) — `brainstorming` now also invoked in `stories` and `evolve`.

- [ ] **Step 2: Verify**

Run: `grep -nE "concepts → stories → prototype|evolve|Surfaces" README.md`
Expected: new order, `evolve`, `Surfaces` present.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README — new order, evolve conductor, Surfaces gate"
```

---

## Task 12: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `node --test scripts/adhd-state.test.mjs`
Expected: PASS, 0 fail (all original + new tests).

- [ ] **Step 2: Self-consistency scan across docs**

Run: `grep -rnE "concepts → prototype → stories|derived from the (signed-off )?prototype|13 stages" SKILL.md README.md reference/`
Expected: **no matches** (every old-order/old-derivation/old-count string is gone).

- [ ] **Step 3: Smoke-test the state machine on a scratch project**

Run:
```bash
T=$(mktemp -d); node scripts/adhd-state.mjs gate stories 2>&1 | head -1; \
node -e "import('./scripts/adhd-state.mjs').then(m=>{const c=process.argv[1];['stories','prototype','milestone-brief','evolve'].forEach(s=>console.log(s, JSON.stringify(m.gate(c,s,{milestone:1}).missing)))})" "$T"
```
Expected: with an empty project, `stories` reports `concepts` missing, `prototype` reports `stories` missing, `milestone-brief` reports `prototype` missing, `evolve` reports groundwork/prototype missing — i.e. the new chain.

- [ ] **Step 4: Final commit (if the smoke test surfaced any doc nits, fix and commit)**

```bash
git add -A
git commit -m "chore: final consistency pass for stories/prototype reorder + evolve" || echo "nothing to commit"
```

---

## Self-Review

- **Spec coverage:** §1 reorder → Task 1. §2 `Surfaces` column → Tasks 2, 5. §3 empty-`Surfaces` gate → Tasks 3 (validate), 7 (brief reference). §4 prototype write-access + work-buffer → Task 6 (+ verify check Task 9). §5 `evolve` → Tasks 4 (gate), 8 (reference), 9 (routing), 10/11 (SKILL/README). Change-surface §6 script → Tasks 1-4; references → Tasks 5-9; SKILL → Task 10; README → Task 11.
- **Placeholder scan:** code steps carry full code; doc steps carry exact target text/sections + grep verifications. No TBD/TODO.
- **Type consistency:** `parseStories` returns `{id, dependsOn, surfaces}`; `briefStoryIds` returns a `Set<string>`; `validate` uses `surfacesById[id]`. `gate` case `evolve` mirrors the existing `need(gw(...), msg)` shape. Names consistent across Tasks 2-4.
