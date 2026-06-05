# Design: reorder `stories` before `prototype`, add the `evolve` change-conductor

**Date:** 2026-06-05
**Status:** approved, pending implementation plan

## Problem

Today's groundwork order is `concepts → prototype → stories`, and `stories` is
**derived from the signed-off prototype** by "reading off the stories the prototype
implies" (`reference/stories.md`). That makes the UI the source of scope truth, which is
backwards: a flow nobody drew yields no story, so building the prototype silently drops
stories. Reverse-engineering scope from pixels is lossy — exactly the "agent forgets
important stories at the stories stage" failure.

Two further gaps fall out of the same root:

- There is no enforced coverage relation between stories and the surfaces that realize
  them, so "build the prototype to the stories" is unenforced intent.
- Living-stage changes (`concepts`, `stories`, `prototype` all re-runnable) have no
  conductor. A new idea mid-project ripples across several artifacts with nothing
  sequencing the updates, so docs drift out of sync.

## Solution

1. **Reorder** groundwork to `concepts → stories → prototype`. `stories` is derived from
   `concepts` and becomes the scope spec / soft roadmap; `prototype` *realizes* it. Scope
   before pixels — the correct dependency direction.
2. **Trace + gate.** `stories.md` gains a single-source `Surfaces` column. A story with
   empty `Surfaces` is legal ("not prototyped yet") but **cannot be picked into a
   milestone** — the anti-forgetting teeth, enforced at `milestone-brief`.
3. **`evolve` stage.** A new living *conductor* stage is the single front door for every
   post-groundwork change. It brainstorms the idea, writes an ordered impact plan to a
   work file, and drives the re-runs that bring all affected artifacts up to date.

Net stage count goes from 13 to **14** (one addition, no removals).

## 1. Groundwork reorder

```
['setup', 'vision', 'foundation', 'concepts', 'prototype', 'stories']
  → ['setup', 'vision', 'foundation', 'concepts', 'stories', 'prototype']
```

Gate flips:

- `stories` gate: depends on **`concepts`** (`docs/CONCEPTS.md`), was `prototype`.
- `prototype` gate: depends on **`stories`** (`project/stories.md`), was `concepts`.
- `milestone-brief` gate: depends on **`prototype`** (the new terminal groundwork stage,
  `project/prototype.md` + `project/map.md`), was `stories`. Transitively this still
  requires the whole groundwork chain.

`concepts` (gate unchanged: `foundation`) now hands off to `stories`. `prototype` remains
the producer of `project/map.md` and `project/surfaces/<name>.md`, so `milestone-brief`
still selects surfaces from a catalog that exists before it.

**Scope-truth direction reverses:** `stories` no longer reads off the prototype; it
derives the backlog from `concepts` (entities, actors, lifecycles, governing rules → one
`actor + action + outcome` story per capability). `prototype` is built **to** that
backlog.

`stories` gains the **`brainstorming`** sub-skill (today: none) — it now does generative
breadth from concepts on first run, not mechanical read-off.

## 2. `stories.md` schema + the coverage relation

New column. The table becomes:

```
ID | Story | Value | Depends on | Size | Surfaces
```

- **`Surfaces`** — comma-separated surface names (from `project/map.md`) that realize the
  story. It is the **single source of truth** for the story↔surface relation. `map.md`
  carries **no** back-reference to story IDs — zero duplication.
- **Empty `Surfaces` is legal** = "not prototyped yet." Not an error, not a drift flag.
- Surface names are capability-level (no framework/stack), so the `audit` mechanism scan
  over `stories.md` is unaffected.

**Enrichment model (A+C).** When the prototype reveals a story was too abstract:

- Stories stay **thin and UI-agnostic**. Scope grows by **splitting** a row (`S4` → `S4a`,
  `S4b`), each still `actor + action + outcome`. UI/realization detail lives **only** in
  `prototype.md` / `surfaces/*`, never copied into `stories.md`.
- The `Surfaces` column is the trace link from a story to where it is realized.

## 3. The teeth — empty-`Surfaces` gate at `milestone-brief`

A story whose `Surfaces` is empty **cannot be selected into a milestone**.

Mechanization (the predecessor-artifact gate can't see the selection, so this is
procedural + structural, not a single CLI gate):

- **Procedural:** `reference/milestone-brief.md` forbids listing a story with empty
  `Surfaces` in `brief.md`; the stage must route such a story through `evolve` (to draw
  its surface) first.
- **Structural:** `adhd-state.mjs validate` and the `verify` pass flag any `brief.md`
  whose chosen story IDs include one with an empty `Surfaces` cell in `stories.md`.

`prototype` writes the surface name into a story's `Surfaces` cell the moment it draws
that surface — that write is the empty→implementable flip.

## 4. `prototype` write-access to `stories.md` (option C + work-file buffer)

`prototype` may edit `stories.md` in two narrow ways, both **staged through its work
file** first:

- Write `Surfaces` cells directly (routine realization — no journaling needed).
- **Split** a story, or add a **brand-new** UI-emergent story.

Every new/split story is first written to a `## Story changes` block in
`project/work/prototype.md`, then **drained into `stories.md` on stage completion** (the
existing high-effort work-file drain step). A `verify`-family check **blocks `prototype`
from being treated as done while `## Story changes` holds unreconciled rows** — this is
the anti-forgetting teeth for UI-emergent stories.

**Scope-creep rule:** splitting a story already picked into an in-flight or shipped
milestone produces **backlog** rows (picked up by a future `milestone-brief`) — the new
rows are never bolted onto the milestone in flight. This mirrors the existing
"new idea → backlog, not the running milestone" discipline.

Genuinely new *scope* (brand-new story) still gets the `stories` breadth treatment when
folded in via `evolve` (§5); a mere split (same scope, finer rows) stays inline.

## 5. New living stage: `evolve` (the change conductor)

`evolve` is the single front door for **every** change after groundwork is complete —
new features and updates to any living artifact alike. It does not produce a canonical
artifact; it **mutates** `concepts` / `stories` / `prototype` (and `data` / `map`) by
sequencing their re-runs.

- **Effort:** high. **Sub-skill:** `brainstorming`.
- **Gate:** groundwork complete — `prototype` done (`groundworkDone(cwd, 'prototype')`).
  Before groundwork is complete the first pass is linear; `evolve` does not apply.
- **Not in the linear progression.** `evolve` is invoked on demand, like `workspace` /
  `adopt` / `verify`. It is **not** added to `GROUNDWORK_STAGES` or `MILESTONE_STAGES`
  (those drive `nextStage` by artifact existence, which `evolve` lacks). It gets its own
  `gate` case and is excluded from `needsMilestone`.
- **Procedure:**
  1. `brainstorming` clarifies the idea; seed `project/work/evolve.md` with a `## Gate`
     block (`requirements-confirmed`) and pass `work-gate evolve` on the user's verbatim
     ok.
  2. Write the **impact plan** into `project/work/evolve.md`: an ordered checklist of
     which living artifacts must change, in what order, and why
     (`concepts → stories → prototype → data/map …`).
  3. User confirms the plan.
  4. Execute each checklist item by re-running that stage's procedure; each sub-run keeps
     its own gates, including the empty-`Surfaces` flip when a new story needs a surface.
- **Done = every checklist item complete AND `project/work/evolve.md` drained/deleted.**
  The one stage whose "done" is *work file gone + scheduled re-runs complete* rather than
  an artifact appearing. `verify` flags a leftover `evolve.md` (abandoned mid-cascade, or
  all items checked but the file not deleted).
- **Milestone boundary:** `evolve` only touches groundwork living artifacts. It **never**
  creates or modifies a milestone and never auto-starts one. A new story lands in the
  backlog with a drawn surface; the user then runs `milestone-brief` to schedule it.

The living re-run cascade (re-running `concepts` may stale `stories` may stale
`prototype`) is therefore handled by routing through `evolve` rather than by a
mtime/staleness check — the conductor plans the ordered updates explicitly.

## 6. Change surface

### `scripts/adhd-state.mjs`

- `GROUNDWORK_STAGES` → `['setup', 'vision', 'foundation', 'concepts', 'stories', 'prototype']`.
- `groundworkDone` — switch cases are keyed by name (order-independent); no case logic
  changes. `prototype` still requires `project/prototype.md` + `project/map.md`;
  `stories` still requires `project/stories.md`.
- `gate` — flip three predecessors: `stories` ← `concepts`; `prototype` ← `stories`;
  `milestone-brief` ← `prototype`. Add an `evolve` case ← `prototype` (groundwork
  complete). `evolve` is **not** added to `needsMilestone`.
- `validate` — groundwork-order coherence loop auto-updates from `GROUNDWORK_STAGES`. Add
  a structural check: any `m<N>/brief.md` whose selected story IDs include a story with an
  empty `Surfaces` cell in `project/stories.md` is a blocker (the empty-`Surfaces` teeth).
- `statusReport` — groundwork line auto-updates from `GROUNDWORK_STAGES`; no edit needed.
- No new subcommand. `workFileRel('evolve')` already yields `project/work/evolve.md`;
  `work-gate evolve` works generically. `STAGE_EFFORT` does not exist as code (effort is
  doc-only), so there is nothing to extend there.

### References

- NEW `reference/evolve.md` — the conductor procedure (§5).
- `concepts.md` — "next stage" → `stories` (was `prototype`). Gate unchanged.
- `stories.md` — gate → `concepts`; rewrite "derive from prototype" → **derive from
  concepts**; add the `Surfaces` column to the schema and output; add `brainstorming`
  sub-skill; note that `prototype` later fills `Surfaces` and that empty `Surfaces` blocks
  selection at `milestone-brief`; "next stage" → `prototype`.
- `prototype.md` — gate → `stories`; rewrite scope to **realize the story backlog**; add
  the `Surfaces`-cell write, the `## Story changes` work-file buffer, the
  unreconciled-rows completion check, and the split-scope-creep rule; "next stage" →
  `milestone-brief`.
- `milestone-brief.md` — gate → `prototype`; add the rule forbidding selection of a story
  with empty `Surfaces` (route through `evolve` first).
- `ux-refine.md` — whole-product flow/rule change today says "re-run the groundwork
  `prototype` stage"; change to "run `evolve`" (all post-groundwork change routes through
  the conductor).
- `features.md`, `review.md`, `finalize.md`, `tracer.md` — any "new story idea → re-run
  `stories` / `prototype`" mention now routes through `evolve`.
- `verify.md` — add checks: (a) `project/work/prototype.md` `## Story changes` not drained
  while `prototype` is done; (b) a `brief.md` referencing a story with empty `Surfaces`;
  (c) a leftover `project/work/evolve.md`.
- `adopt.md` — groundwork loop order (`concepts → stories → prototype`); mention `evolve`
  as the post-adoption change door.
- `setup.md` — canonical-layout / stage-order references updated; `stories.md` shown with
  the `Surfaces` column.
- `workspace.md` — domains are defined in `prototype` (unchanged), verify no stale order
  reference.

### `SKILL.md`

- Stages table — reorder `stories` above `prototype`; update `stories` artifact note
  (derived from concepts, `Surfaces` column) and sub-skill (add `brainstorming`); add an
  `evolve` row (living conductor, high, `brainstorming`, gate `prototype`, ref
  `evolve.md`, artifact: none — done when its work file is drained).
- Flow / two-phase paragraphs — new groundwork order; `stories` is the scope spec derived
  from concepts and the soft roadmap; `prototype` realizes it; describe `evolve` as the
  single change door.
- "Living stages" — now `concepts`, `stories`, `prototype` (re-runnable) plus `evolve`
  (the conductor that sequences their re-runs).
- "Working memory (high-effort stages)" — add `evolve` to the high-effort list.
- Canonical layout — `stories.md` gains the `Surfaces` column; add `work/evolve.md` (the
  conductor's transient impact plan).
- Common-mistakes table — add: picking a story with empty `Surfaces` into a milestone
  (fix: run `evolve` to draw its surface first); making a post-groundwork change outside
  `evolve` (fix: route it through `evolve`).
- "13 stages" routing string (line ~436) → **14 stages**, and ensure `evolve` is listed
  among the management/on-demand stages.
- Note the existing `prototype` (stage) vs `prototype` (milestone track) caveat stays.

### `README.md`

- "The flow" — new groundwork order and ASCII diagram; `stories` derived from concepts,
  `prototype` realizes it; mention the `Surfaces` column and the empty-`Surfaces`
  milestone gate.
- Stage table — reorder `stories`/`prototype` rows, update their "Does"/"Output" text
  (`stories` output gains `Surfaces`), add an `evolve` row.
- Usage / management-commands list — add `/adhd evolve` as the change-intake conductor
  alongside `workspace` / `adopt` / `verify`.
- "Rules worth knowing" — the milestone-discipline bullet now points at `evolve` as the
  front door for mid-project change; note empty-`Surfaces` stories are not selectable.
- Requirements line listing where `brainstorming` is invoked — add `stories` and
  `evolve`.

## Out of scope

- No change to the per-feature `plan` / `build` loop or the feature DAG.
- No change to `config.json` schema or `CONFIG_VERSION` (no migration).
- No mtime/staleness auto-check for the living cascade — `evolve` plans it explicitly.
- No story-ID back-references in `map.md` (the `Surfaces` column is the only join).
