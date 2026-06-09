# Parking lot + memory-layer simplification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a durable, user-owned `project/parking.md` buffer for not-yet-actionable ideas, remove the transient `notes.md` store, add an advisory "read parking.md" gate nudge, and add the on-demand `adhd park` capture command.

**Architecture:** Two code changes in `scripts/` (a non-blocking `notes` advisory added to `gate()`; `handoff-prompt.mjs` re-pointed off `notes.md`), both TDD. The rest is documentation: a new `reference/park.md`, plus mechanical edits across `SKILL.md`, `README.md`, and every `reference/*.md` to drop `notes.md` and introduce `parking.md`.

**Tech Stack:** Node.js ES modules, `node:test` + `node:assert/strict`. Docs are plain markdown.

**Spec:** `docs/superpowers/specs/2026-06-09-parking-lot-design.md`

---

## Task 1: `gate()` parking advisory + remove `notes.md` warning

The `gate()` function returns `{ pass, missing }`. Add a non-blocking `notes` array that flags a non-empty `parking.md`. Separately, delete the `notes.md` non-empty warning from `validate()`.

**Files:**
- Modify: `scripts/adhd-state.mjs` — `gate()` (lines 223-285), CLI `gate` case (lines 646-652), `validate()` warning (lines 502-504)
- Test: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing test**

Add to `scripts/adhd-state.test.mjs` (after the existing gate tests, near line 200). The `w` / `tmp` / `initConfig` helpers already exist in this file — reuse them.

```javascript
test('gate: advises when project/parking.md is non-empty, never blocks', () => {
  const cwd = tmp();
  initConfig(cwd); // setup done -> vision gate passes
  // no parking.md -> no notes
  let g = gate(cwd, 'vision');
  assert.equal(g.pass, true);
  assert.deepEqual(g.notes ?? [], []);
  // empty parking.md -> no notes
  w(cwd, 'project/parking.md', '   \n');
  g = gate(cwd, 'vision');
  assert.equal(g.pass, true);
  assert.deepEqual(g.notes, []);
  // non-empty parking.md -> advisory note, pass still true
  w(cwd, 'project/parking.md', '# Parking lot\n\nOffline-first cache idea\n');
  g = gate(cwd, 'vision');
  assert.equal(g.pass, true);
  assert.ok(g.notes.some((nte) => /parking\.md/.test(nte)));
});

test('validate: does not warn on a non-empty notes.md', () => {
  const cwd = tmp();
  initConfig(cwd);
  w(cwd, 'project/notes.md', 'leftover scratch');
  assert.ok(!validate(cwd).warnings.some((x) => /notes\.md/.test(x)));
});
```

Confirm `gate` and `validate` are imported at the top of the test file (they are used by existing tests, so the import already covers them; if `validate` is not yet imported, add it to the existing import from `./adhd-state.mjs`).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test scripts/adhd-state.test.mjs --test-name-pattern "parking.md is non-empty|does not warn on a non-empty notes"`
Expected: FAIL — `g.notes` is `undefined` (so `g.notes.some` throws), and the `notes.md` warning still fires.

- [ ] **Step 3: Add the `notes` advisory to `gate()`**

In `scripts/adhd-state.mjs`, change the final `return` of `gate()` (currently line 284) from:

```javascript
  return { pass: missing.length === 0, missing };
}
```

to:

```javascript
  const notes = [];
  if (exists(cwd, 'project/parking.md') && read(cwd, 'project/parking.md').trim() !== '') {
    notes.push('project/parking.md has content — read it before proceeding');
  }
  return { pass: missing.length === 0, missing, notes };
}
```

- [ ] **Step 4: Remove the `notes.md` warning from `validate()`**

In `scripts/adhd-state.mjs`, delete these three lines (currently 502-504):

```javascript
  if (exists(cwd, 'project/notes.md') && read(cwd, 'project/notes.md').trim() !== '') {
    warnings.push('project/notes.md is not empty — drain durable entries to their canonical home');
  }
```

- [ ] **Step 5: Surface the advisory in the CLI `gate` case**

In `scripts/adhd-state.mjs`, change the CLI `gate` case (currently lines 646-652) from:

```javascript
    case 'gate': {
      const [stage] = rest;
      const result = gate(cwd, stage, flags);
      console.log(JSON.stringify(result, null, 2));
      if (!result.pass) process.exitCode = 1;
      break;
    }
```

to:

```javascript
    case 'gate': {
      const [stage] = rest;
      const result = gate(cwd, stage, flags);
      console.log(JSON.stringify(result, null, 2));
      for (const nte of result.notes ?? []) console.log(`note: ${nte}`);
      if (!result.pass) process.exitCode = 1;
      break;
    }
```

- [ ] **Step 6: Run the full script test suite**

Run: `node --test scripts/adhd-state.test.mjs`
Expected: PASS — all tests, including the two new ones. (Existing gate tests use `.pass`/`.missing` accessors only, so the added `notes` key does not break them.)

- [ ] **Step 7: Commit**

```bash
git add scripts/adhd-state.mjs scripts/adhd-state.test.mjs
git commit -m "feat: gate advises on non-empty parking.md; drop notes.md warning"
```

---

## Task 2: `handoff-prompt.mjs` points at `parking.md`, not `notes.md`

The resume prompt currently tells the user to read `notes.md`. Re-point it at `parking.md` (durable parked items). The active-work-file behavior is unchanged.

**Files:**
- Modify: `scripts/handoff-prompt.mjs` (lines 64, 66)
- Test: `scripts/handoff-prompt.test.mjs` (lines 21-29)

- [ ] **Step 1: Update the failing test**

In `scripts/handoff-prompt.test.mjs`, replace the test at lines 21-29:

```javascript
test('handoffPrompt names notes.md first, the next stage, and the run command', () => {
  const cwd = tmp();
  initConfig(cwd);
  w(cwd, 'docs/PRODUCT.md'); // setup + vision done -> next is foundation
  const out = handoffPrompt(cwd);
  assert.match(out, /project\/notes\.md/);
  assert.match(out, /foundation/);
  assert.match(out, /Run: adhd foundation/);
});
```

with:

```javascript
test('handoffPrompt names parking.md, the next stage, and the run command', () => {
  const cwd = tmp();
  initConfig(cwd);
  w(cwd, 'docs/PRODUCT.md'); // setup + vision done -> next is foundation
  const out = handoffPrompt(cwd);
  assert.match(out, /project\/parking\.md/);
  assert.doesNotMatch(out, /notes\.md/);
  assert.match(out, /foundation/);
  assert.match(out, /Run: adhd foundation/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/handoff-prompt.test.mjs --test-name-pattern "names parking.md"`
Expected: FAIL — the output still says `notes.md`, so `/project\/parking\.md/` does not match and `/notes\.md/` still does.

- [ ] **Step 3: Re-point the prompt**

In `scripts/handoff-prompt.mjs`, change line 64 from:

```javascript
    lines.push(`${n++}. Then read \`project/notes.md\` — the previous session's scratchpad.`);
```

to:

```javascript
    lines.push(`${n++}. Then check \`project/parking.md\` — durable parked ideas/details not yet implemented.`);
```

And change line 66 from:

```javascript
    lines.push(`${n++}. Read \`project/notes.md\` FIRST — it is the scratchpad from the previous session.`);
```

to:

```javascript
    lines.push(`${n++}. Check \`project/parking.md\` FIRST — durable parked ideas/details not yet implemented.`);
```

- [ ] **Step 4: Run the handoff test suite**

Run: `node --test scripts/handoff-prompt.test.mjs`
Expected: PASS — all five tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/handoff-prompt.mjs scripts/handoff-prompt.test.mjs
git commit -m "feat: handoff prompt points at parking.md instead of notes.md"
```

---

## Task 3: New `reference/park.md` — the `adhd park` command

A management/on-demand command (peer to `verify`/`evolve`): no gate, callable anytime. Runs the full brainstorming clarifying dialogue, then appends one entry to `project/parking.md`. Never implements.

**Files:**
- Create: `reference/park.md`

- [ ] **Step 1: Create `reference/park.md`**

```markdown
# adhd — park (management command)

**Effort:** low
**Purpose:** capture a not-yet-actionable idea or detail into the durable parking lot,
`project/parking.md`, after clarifying it with the user.
**Not a stage:** no gate. Run it anytime, in any project state.

## What this command is

`park` is the one sanctioned way the agent writes to `project/parking.md`. Everywhere
else the user owns that file and edits it directly; `park` exists so a half-formed idea
can be sharpened into a clear, self-contained entry before it is stored. It **captures
only** — it never implements, never writes a spec, and never proceeds to `writing-plans`.

`project/parking.md` is durable and committed. An item lives there precisely because it
is not yet implemented; when it is implemented, the user removes it. There is no status
field and no structure imposed by `adhd` — long prose, mermaid diagrams, and code
sketches are all fine.

## Procedure

1. **Clarify with `superpowers:brainstorming`.** Run its full clarifying dialogue with
   **no cap on the number of questions** — draw out intent, scope, constraints, and any
   sketch the user has in mind. Run only the clarifying portion: do NOT continue to a
   design document or to `writing-plans`. The goal is a clear, self-contained entry, not
   a design.
2. **Append the entry to `project/parking.md`.** Create the file with a single
   `# Parking lot` heading first if it does not exist. Write the clarified item as a
   self-contained block under that heading, in whatever form fits it best (prose,
   list, mermaid, code). Make it understandable cold, months later, with no session
   context.
3. **Confirm and stop.** Show the user the entry as written. `park` is done the moment
   the entry is in `project/parking.md`. Do not implement anything; do not commit without
   the user's explicit "ok".

## Output

A new entry in `project/parking.md`. Nothing else.

## On completion

1. The entry exists in `project/parking.md` — the command is done.
2. Tell the user the item is parked and that any stage or feature will surface
   `parking.md` at its gate-check.
```

- [ ] **Step 2: Commit**

```bash
git add reference/park.md
git commit -m "docs: add reference/park.md for the adhd park command"
```

---

## Task 4: `SKILL.md` — register `park`, swap stores, add the read rule

**Files:**
- Modify: `SKILL.md` (lines 38-40, 124-147, 213, 424-439, 453-454, 487-488, 539, 542)

- [ ] **Step 1: Add `park` to the superpowers-dependency list**

Change lines 38-40 from:

```markdown
- the **`superpowers` plugin** — `adhd` invokes `brainstorming` (stories, prototype,
  and evolve stages), `writing-plans` (plan stage), and `executing-plans` (build stage)
  from it.
```

to:

```markdown
- the **`superpowers` plugin** — `adhd` invokes `brainstorming` (stories, prototype,
  evolve, and park), `writing-plans` (plan stage), and `executing-plans` (build stage)
  from it.
```

- [ ] **Step 2: Rewrite the Working-memory store description**

Replace the first paragraph of the "## Working memory" section (lines 124-133, ending at "...create none.") with:

```markdown
`adhd` keeps two non-canonical stores. **Transient working memory** lives in
`project/work/*.md` — high-effort stages get a `project/work/<stage>.md` (milestone form
`project/work/m<N>-<stage>.md`), and any ad-hoc, session-scoped task may get a
freely-named `project/work/<task>.md`. All of `project/work/` is gitignored; each file is
drained to its canonical home and deleted when the work is done. **Durable not-yet-actionable
info** lives in `project/parking.md` — see "The parking lot" below. Medium/low stages
(including `build` — its plan already is the memory) create no work file.

Every high-effort stage (`vision`, `concepts`, `prototype`, `evolve`, `ux-refine`,
`tracer`, `features`, `review`) creates its work file as its first procedure step (a
discipline the stage follows, not a script-enforced step).
```

- [ ] **Step 3: Add "The parking lot" subsection**

Immediately after the working-memory file's three-zone description and lifecycle paragraph (after line 147, before the "### The `## Gate` zone" heading at line 150), insert:

```markdown
### The parking lot — durable, not-yet-actionable info

`project/parking.md` is the durable, committed buffer for ideas and details that are
clarified but **not yet ready to implement** — arch sketches, deferred decisions, things
to discuss later. Unlike the transient stores, it is never drained to empty and survives
across sessions: an item lives there precisely because it is still pending, and the user
removes it once it is implemented. It is free-form (prose, mermaid, code) and **user-owned**:
the agent never writes to it on a standing rule — the only agent write path is the
user-invoked `adhd park` command. Before starting any stage or feature, read
`project/parking.md` if it is non-empty and fold anything relevant into the current work;
`adhd-state.mjs gate` prints a non-blocking `note:` when it has content.
```

- [ ] **Step 4: Update the Canonical layout tree**

Change line 213 from:

```markdown
  notes.md                   transient scratchpad (healthy = empty)
```

to:

```markdown
  parking.md                 durable, user-owned buffer for not-yet-actionable ideas (committed)
```

- [ ] **Step 5: Register `park` in the management-commands list**

After the `evolve` bullet (ends line 439), add:

```markdown
- `park` — capture a not-yet-actionable idea or detail into the durable parking lot
  `project/parking.md`, after a full brainstorming clarify. No gate; callable anytime;
  it captures only and never implements. See [reference/park.md](reference/park.md).
```

- [ ] **Step 6: Add `park` to the routing list**

Change lines 453-454 from:

```markdown
2. **First word is a stage or a management command** — the 14 stages are in the
   table above; `workspace`, `adopt`, `verify`, and `evolve` are management/on-demand
```

to:

```markdown
2. **First word is a stage or a management command** — the 14 stages are in the
   table above; `workspace`, `adopt`, `verify`, `evolve`, and `park` are management/on-demand
```

- [ ] **Step 7: Fix the Handoff-prompts cross-cutting bullet**

Change lines 487-488 from:

```markdown
- **Handoff prompts** — on a session switch, the resume prompt always says "read
  `project/notes.md` first".
```

to:

```markdown
- **Handoff prompts** — on a session switch, the resume prompt leads with the active
  work file (if any) and points at `project/parking.md`.
```

- [ ] **Step 8: Fix the two `notes.md` references in the Common-mistakes table**

Change line 539 from:

```markdown
| Creating a stage's artifact file before the stage's work is complete. | Existence = done. Draft in `notes.md`; create the canonical file last. |
```

to:

```markdown
| Creating a stage's artifact file before the stage's work is complete. | Existence = done. Draft in the stage's `project/work/<stage>.md`; create the canonical file last. |
```

Replace line 542:

```markdown
| Treating `project/notes.md` as durable storage. | It is a transient scratchpad. Migrate durable facts to `DECISIONS.md`, `CONCEPTS.md`, a surface spec, or `.ruler/`. Healthy `notes.md` is empty. |
```

with:

```markdown
| Treating `project/parking.md` as a dumping ground the agent fills. | It is user-owned. The agent writes it only via `adhd park`. Items are pending-until-implemented; the user removes them when done. |
```

- [ ] **Step 9: Commit**

```bash
git add SKILL.md
git commit -m "docs: SKILL.md — add park command, parking.md store, drop notes.md"
```

---

## Task 5: `reference/setup.md` — scaffold `parking.md`, not `notes.md`

**Files:**
- Modify: `reference/setup.md` (lines 24, 37, 48, 70)

- [ ] **Step 1: Scaffold `parking.md` in the create-tree step**

Change line 24 (inside step 2) from:

```markdown
   and `project/milestones/`. Create an empty `project/notes.md`. Create
```

to:

```markdown
   and `project/milestones/`. Create `project/parking.md` containing only a
   single `# Parking lot` heading. Create
```

- [ ] **Step 2: Fix the `.ruler/` seed note (step 5, line 37)**

Change line 37 from:

```markdown
   stating that this project is run by the `adhd` conductor and that
   `project/notes.md` is read first at the start of every session.
```

to:

```markdown
   stating that this project is run by the `adhd` conductor and that
   `project/parking.md` (durable parked ideas) is checked at the start of every stage.
```

- [ ] **Step 3: Fix the Output bullet (line 48)**

Change line 48 from:

```markdown
- `project/` — with `config.json` and an empty `notes.md`.
```

to:

```markdown
- `project/` — with `config.json` and a `parking.md` (just a `# Parking lot` heading).
```

- [ ] **Step 4: Fix the On-completion drain step (line 70)**

Change line 70 from:

```markdown
3. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
```

to:

```markdown
3. Drain any `project/work/*.md` you created: migrate durable facts to their canonical home, then delete the file.
```

- [ ] **Step 5: Commit**

```bash
git add reference/setup.md
git commit -m "docs: setup scaffolds parking.md instead of notes.md"
```

---

## Task 6: `reference/verify.md` — drop the notes.md check

**Files:**
- Modify: `reference/verify.md` (lines 48-50)

- [ ] **Step 1: Remove checklist item 7**

Delete lines 48-50:

```markdown
7. **notes.md drained.** `project/notes.md` should be empty; flag any durable entry that
   belongs in a canonical home (`docs/DECISIONS.md`, `docs/CONCEPTS.md`, `docs/DATA.md`,
   a surface spec, `.ruler/`).
```

Then renumber the subsequent checklist items: the old item 8 ("Prototype / surface drift") becomes 7, and the old item 9 ("Undrained story changes") becomes 8. Do not add any `parking.md` check — it is user-owned and `verify` does not police it.

- [ ] **Step 2: Commit**

```bash
git add reference/verify.md
git commit -m "docs: verify no longer checks notes.md (removed from model)"
```

---

## Task 7: Drop the `notes.md` drain line from every stage's On-completion

Each of these `reference/*.md` files has an On-completion step that drains `notes.md`. Two patterns exist; fix each occurrence.

**Files (with the exact current line):**
- `reference/vision.md:57-58`, `reference/concepts.md:66-67`, `reference/prototype.md:186-187`, `reference/tracer.md:80-81`, `reference/features.md:75-76`, `reference/ux-refine.md:76-77`, `reference/review.md:59-60` — pattern A (work-file stages)
- `reference/foundation.md:48`, `reference/stories.md:61`, `reference/milestone-brief.md:67`, `reference/plan.md:44`, `reference/build.md:64` — pattern B (no work file)
- `reference/evolve.md:70`, `reference/finalize.md:21-43` — special cases

- [ ] **Step 1: Pattern A — work-file stages**

In each of `vision.md`, `concepts.md`, `prototype.md`, `tracer.md`, `features.md`, `ux-refine.md`, `review.md`, find the On-completion step of this shape (the milestone files use `m{{N}}-<stage>.md`):

```markdown
3. Drain `project/notes.md` and `project/work/<stage>.md`: migrate durable facts to
   their canonical home, then delete the work file. `notes.md` healthy = empty.
```

Replace it with (keep the original step number and the exact work-file name from that file):

```markdown
3. Drain `project/work/<stage>.md`: migrate durable facts to their canonical home,
   then delete the work file.
```

For example, `reference/concepts.md` becomes `Drain \`project/work/concepts.md\`: …` and `reference/tracer.md` becomes `Drain \`project/work/m{{N}}-tracer.md\`: …`.

- [ ] **Step 2: Pattern B — no-work-file stages**

In each of `foundation.md`, `stories.md`, `milestone-brief.md`, `plan.md`, `build.md`, delete the line:

```markdown
3. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
```

Renumber any On-completion steps that followed it so the list stays sequential.

- [ ] **Step 3: `reference/evolve.md`**

Change lines 69-70 from:

```markdown
2. Drain durable facts to their canonical homes first — nothing informational should
   remain only in the work file. `project/notes.md` healthy = empty.
```

to:

```markdown
2. Drain durable facts to their canonical homes first — nothing informational should
   remain only in the work file.
```

- [ ] **Step 4: `reference/finalize.md`**

Open `reference/finalize.md`. Replace the "Drain and migrate `project/notes.md`" step (line 21) and the matching Output clause (line 43) so they no longer reference `notes.md`:

- Step 21 — change the step that begins `1. **Drain and migrate \`project/notes.md\`.**` to drain the work files instead:

```markdown
1. **Drain and migrate any `project/work/*.md`.** Migrate every durable fact to its
   canonical home, then delete the work file — the milestone's record is the current
   set of docs, not a drift of scratch files.
```

- Output line 43 — change `canonical docs updated; \`project/notes.md\` empty; \`verify\` findings resolved.` to:

```markdown
- canonical docs updated; no stale `project/work/*.md` left; `verify` findings resolved.
```

Read the file first to confirm the exact surrounding wording before editing, since this file phrases the step differently from the others.

- [ ] **Step 5: Verify no stage reference still mentions notes.md**

Run: `grep -rn "notes\.md" reference/`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add reference/
git commit -m "docs: drop notes.md drain step from all stage references"
```

---

## Task 8: `README.md` — update the store list and tree

**Files:**
- Modify: `README.md` (lines 191, 225-226)

- [ ] **Step 1: Update the tree**

Change line 191 from:

```markdown
  notes.md               transient scratchpad — healthy when empty
```

to:

```markdown
  parking.md             durable, user-owned buffer for not-yet-actionable ideas (committed)
```

- [ ] **Step 2: Replace the notes.md "Rules worth knowing" bullet**

Change lines 225-226 from:

```markdown
- **notes.md** — a scratchpad read first every session; durable facts get
  migrated to their real home (`DECISIONS.md`, `CONCEPTS.md`, a surface spec).
```

to:

```markdown
- **parking.md** — a durable, committed buffer you own, for ideas/details not yet ready
  to build (arch sketches, deferred decisions, "discuss later"). Free-form; an item stays
  until you implement it, then you remove it. Capture into it with `/adhd park`; every
  stage and feature surfaces it at its gate-check.
```

- [ ] **Step 3: Verify no README reference still mentions notes.md**

Run: `grep -n "notes\.md" README.md`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: README — replace notes.md with parking.md"
```

---

## Task 9: Final audit

- [ ] **Step 1: Run the full test suite**

Run: `node --test scripts/`
Expected: PASS — all tests in both `adhd-state.test.mjs` and `handoff-prompt.test.mjs`.

- [ ] **Step 2: Grep for any leftover `notes.md` in live files**

Run: `grep -rn "notes\.md" SKILL.md README.md reference/ scripts/`
Expected: no output. (The `docs/superpowers/plans/` and `docs/superpowers/specs/` history is intentionally untouched and excluded from this grep.)

- [ ] **Step 3: Confirm `parking.md` and `park` are wired in**

Run: `grep -rln "parking\.md\|adhd park\| park " SKILL.md README.md reference/setup.md reference/park.md scripts/adhd-state.mjs`
Expected: lists `SKILL.md`, `README.md`, `reference/setup.md`, `reference/park.md`, and `scripts/adhd-state.mjs`.

- [ ] **Step 4: Final commit (if anything is uncommitted)**

```bash
git status
# if clean, nothing to do; otherwise stage and commit the remainder
```
