# Design: front-load a whole-product Hi-Fi prototype

**Date:** 2026-05-29
**Status:** approved, pending implementation plan

## Problem

`adhd` builds the clickable prototype piecemeal, inside each per-milestone `design`
stage. Because milestones are formed just-in-time and there is no roadmap, nothing
forces the whole-product UX to exist before milestone work begins. Result: you ship
milestone 1 (e.g. auth) and milestone 2 (e.g. settings), then stall on "what is
milestone 3?" — the product was never visualized end to end. The author needs to
translate intent into a shared visual artifact *before* slicing work into milestones,
the way a sitemap/prototype is built first on any UI product.

## Solution

Move the whole-product UX prototype to the front, as a groundwork stage, and derive
the story backlog from it. Per-milestone design shrinks to refining one milestone's
slice of an already-existing prototype.

The whole-product prototype becomes the shared **soft roadmap**: milestones are carved
out of a product you can already see and click. This preserves the "no hardcoded
milestone list" rule while removing the "what's next?" trap.

## 1. New stage graph

Net stage count stays 13 (`map` removed, `prototype` added), so "13 stages" references
and most structure are unaffected.

**Groundwork** order changes:

```
['setup', 'vision', 'stories', 'foundation', 'map']
  → ['setup', 'vision', 'foundation', 'prototype', 'stories']
```

Gate changes:

- `foundation` — gate flips to depend on **vision** (`docs/PRODUCT.md`), not `stories`.
  Foundation is the firm baseline derived from vision; it never needed stories. It must
  run before `prototype` because it fixes the frontend framework + prototype topology
  required to build a clickable app.
- `prototype` (NEW) — gate depends on `foundation` (`docs/DECISIONS.md`).
- `stories` — gate flips to depend on **prototype**. Stories are derived from the
  signed-off prototype plus behaviors clarified while building it.
- `milestone-brief` — gate now depends on `stories` (the terminal groundwork stage,
  which it selects from). Previously it depended on `map` as the terminal stage; the
  terminal stage is now `stories`. Gating on `stories` transitively requires the whole
  groundwork chain (`stories` ← `prototype` ← `foundation` ← `vision`).

**Per-milestone:** `design` is renamed **`ux-refine`** everywhere (stage list, gates,
`milestoneNext`, `milestoneStageDone`, `needsMilestone`, status lists). Artifact file
`m<N>/design.md` → `m<N>/ux-refine.md`. Reference `design.md` → `ux-refine.md`.

## 2. The `prototype` stage (absorbs `map`)

- **Effort:** high.
- **Sub-skills:** `brainstorming` (whole-product UX flow) + `impeccable` (Hi-Fi UI per
  `ui` surface).
- **Produces:**
  - `project/map.md` — the sitemap/surface catalog + domains + deployables. Kept as a
    file; now authored by this stage instead of a standalone `map` stage. Stays
    capability-level (names surfaces, not stack).
  - `docs/GLOSSARY.md` — domain glossary (unchanged purpose).
  - `project/surfaces/<name>.md` — project-wide surface specs (NEW location).
  - the wired **Hi-Fi clickable whole-product app** (in the prototype home per topology).
- **Done-artifact:** `project/prototype.md` — sign-off notes, written last. `prototype`
  is done iff `project/prototype.md` AND `project/map.md` AND `docs/GLOSSARY.md` all
  exist.
- **Scope:** critical and important flow & rules, detailed enough to communicate what is
  being built and how it should behave — not every pixel.
- **Re-runnable** (like `stories`): re-run to evolve the *whole-product* flow.
- `reference/map.md` is deleted; `reference/prototype.md` is new (absorbs map's sitemap
  procedure + adds the Hi-Fi clickable build and sign-off).

## 3. `ux-refine` — the narrowed per-milestone stage

- Refines **only this milestone's slice** of the existing prototype: deeper UI,
  milestone-specific states and edge cases. Uses `impeccable` (and `brainstorming` only
  for genuinely new milestone-specific flows).
- **Forbidden** from changing the whole-product flow or rules.
- New hard rule, replacing today's "`features` updates the prototype via `design`":
  - whole-flow / whole-rule change ⇒ re-run the groundwork `prototype` stage;
  - slice-only upgrade ⇒ `ux-refine`.
- Milestone refinements go to `m<N>/surfaces/`; project-wide specs stay in
  `project/surfaces/`.

## 4. Reconciles "no roadmap"

No hardcoded milestone list still — but the whole-product prototype is the shared soft
roadmap. Milestones are carved from a product already visible and clickable, which is
what removes the "what's milestone 3?" frustration.

## 5. Change surface

### `scripts/adhd-state.mjs`

- `GROUNDWORK_STAGES` → `['setup', 'vision', 'foundation', 'prototype', 'stories']`.
- `MILESTONE_STAGES` → `['milestone-brief', 'ux-refine', 'tracer', 'features', 'review', 'finalize']`.
- `STAGE_EFFORT` — drop `map`, add `prototype: 'high'`, rename `design` → `ux-refine`
  (high). Keep entries consistent with new order.
- `groundworkDone` — drop the `map` case; add `prototype` (requires `project/prototype.md`
  + `project/map.md` + `docs/GLOSSARY.md`). `foundation`/`vision`/`stories` checks are
  unchanged (order is driven by `GROUNDWORK_STAGES`).
- `gate` — flips: `stories` ← `prototype`; `foundation` ← `vision`; add `prototype` case
  ← `foundation`; `milestone-brief` ← `stories`; remove `map` case. Rename every
  `design` reference to `ux-refine` (the `tracer` predecessor, the prototype-track
  `review` predecessor, the `needsMilestone` array).
- `milestoneStageDone` — map `'ux-refine': 'ux-refine.md'` (was `design: 'design.md'`).
- `milestoneNext` — `design` → `ux-refine`.
- `statusReport` — prototype-track stage list `['milestone-brief', 'design', 'review',
  'finalize']` → `['milestone-brief', 'ux-refine', 'review', 'finalize']`.
- `validate` — standalone-topology check uses `groundworkDone(cwd, 'prototype')` (was
  `'map'`).
- `audit` — MECHANISM_KEYWORDS scan still covers `PRODUCT.md`, `stories.md`, `map.md`
  (all capability-level). Do NOT scan `prototype.md` or the prototype app — they
  legitimately use the chosen framework.
- Drive-by: stale `{{command_prefix}}` token in `statusReport` (line ~348) — remove,
  matching the earlier `command_prefix` cleanup.

### References

- NEW `reference/prototype.md`.
- DELETE `reference/map.md`.
- RENAME `reference/design.md` → `reference/ux-refine.md`; narrow its scope, add the
  whole-flow-vs-slice rule.
- EDIT `vision.md` (next stage → `foundation`), `foundation.md` (gate → vision, next →
  `prototype`), `stories.md` (gate → prototype, derive stories from prototype, next →
  `milestone-brief`), `milestone-brief.md` (gate → prototype, next → `ux-refine`,
  selects surfaces from `map.md`), `tracer.md` / `features.md` / `review.md` /
  `finalize.md` (`design` → `ux-refine`; `features` updates prototype via `ux-refine`
  for slice changes, re-runs `prototype` for whole-flow changes), `adopt.md` (groundwork
  loop order + prototype), `workspace.md` (domains now defined in `prototype`),
  `setup.md` (canonical layout / stage order references).

### `SKILL.md`

- Stages table — remove `map` row, add `prototype` row (groundwork, high, artifact
  `project/prototype.md`, sub-skill brainstorming + impeccable, ref `prototype.md`);
  rename `design` row → `ux-refine` (per-milestone, high, artifact `m<N>/ux-refine.md`,
  sub-skill impeccable + brainstorming).
- Flow paragraph — new groundwork order; per-milestone `milestone-brief → ux-refine`.
- "Groundwork and per-milestone work" — new loop; note `prototype` is re-runnable for
  whole-flow evolution; stories derived from prototype.
- "Canonical layout" — add `project/prototype.md`, add `project/surfaces/<name>.md`,
  rename `m<N>/design.md` → `m<N>/ux-refine.md`.
- "Required-skill preflight" — impeccable now used in `prototype` (groundwork) and
  `ux-refine`.
- "Prototype and production apps" — rewrite: prototype built and signed off in the
  groundwork `prototype` stage, before any milestone; `ux-refine` upgrades only the
  milestone's slice; whole-flow contradiction ⇒ re-run `prototype`.
- "No roadmap" line — reconcile: still no milestone list, but the prototype is the
  shared soft roadmap.
- "Capability, not mechanism" — the *sitemap* portion (`map.md`) stays capability-only;
  the prototype app legitimately uses the framework chosen at `foundation`.
- Common-mistakes table — rename `design` → `ux-refine`; add "changing the whole-product
  flow inside `ux-refine`" (fix: re-run the groundwork `prototype` stage).
- Routing — keep "13 stages"; update any `design` mention to `ux-refine`.
- Sub-skill output routing — project-wide surface specs → `project/surfaces/`;
  milestone surface specs → `m<N>/surfaces/`; plans → `m<N>/plans/`.

### `README.md`

- Update the flow description to the new order and the prototype-first model.

## Naming overlap (explicit, accepted)

The milestone **track** value is already `'prototype'` (a prototype-only milestone,
`infra: none`). The new groundwork **stage** is also named `prototype`. Different
namespaces (track value vs stage name). A clarifying note is added in `SKILL.md` so the
two are not conflated.

## Out of scope

- No new `adhd-state.mjs` subcommands.
- No change to the `plan`/`build` per-feature loop or the feature DAG.
- No change to `config.json` schema or `CONFIG_VERSION` (no migration needed).
