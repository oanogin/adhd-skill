# Parking lot + memory-layer simplification — Design

**Date:** 2026-06-09
**Status:** approved (brainstorming)

## Problem

Details clarified during the `stories` and `prototype` stages — arch ideas, deferred
implementation details, things to discuss later — get lost. They are not yet settled
enough to write into a canonical home (`CONCEPTS.md`, `DATA.md`, `DECISIONS.md`, a
surface spec), and the only non-canonical stores are **transient**: `notes.md`
(healthy = empty) and `work/<stage>.md` (gitignored, deleted on completion). So
not-yet-actionable info either gets crammed into the prototype, or dies in the context
window. When a later stage (`milestone-brief`, `tracer`, `build`) needs that detail, it
cannot be recovered.

There is a real gap: **nowhere durable for information that is clarified but not yet
actionable.**

## Solution overview

1. Add `project/parking.md` — a durable, user-owned, free-form buffer for
   not-yet-implemented ideas and details. The missing third memory store.
2. Simplify the transient layer: **remove `notes.md` entirely.** All transient
   working memory lives in `project/work/*.md` — stage files and freely-named ad-hoc
   task files.
3. Add one standing, advisory enforcement: read `parking.md` at the start of any stage
   or feature.
4. Add `adhd park` — an on-demand command to capture an item into `parking.md` via a
   short brainstorming clarify.

## 1. `project/parking.md` — the durable buffer

- **Free-form markdown.** No table, no status field, no target tags. Long blocks,
  mermaid diagrams, code sketches are all fine. The user owns the file and its
  structure.
- **Durable and committed** — not gitignored, not drained to empty. It persists across
  sessions and stages. This is the property that fixes the leak.
- **Presence = not yet implemented.** An item exists in `parking.md` precisely because
  it is still pending. When the user implements it, the user removes it. There is no
  lifecycle column and no "resolved/deferred" status — the file's contents are always
  exactly the open set.
- **User-owned writes.** The agent never writes to `parking.md` on a standing or
  proactive rule (a standing "offer to park" rule is what rots such files). The **only**
  agent write path is the user-invoked `adhd park` command (§4). Otherwise the user
  edits it directly.
- **Scaffolded empty** by `setup`, with a one-line header explaining its purpose.

### Relationship to the other stores

| Store | Durability | Healthy state | Holds |
|---|---|---|---|
| `project/work/*.md` | transient, gitignored, deleted on completion | n/a | in-flight working memory for a stage or ad-hoc task |
| `project/parking.md` | **durable, committed** | **may be non-empty** | clarified-but-not-yet-implemented ideas/details |
| canonical docs (`CONCEPTS.md`, `DATA.md`, `DECISIONS.md`, surface specs, …) | durable, committed | single source of truth | settled facts |

`parking.md` sits between transient scratch and canonical truth: durable, but explicitly
not-yet-canonical.

## 2. Remove `notes.md` — two-layer memory model

`notes.md` (global transient scratchpad, read first every session, healthy = empty) is
removed from the model. Its role is absorbed:

- **Transient working memory** = `project/work/*.md`:
  - stage files — `<stage>.md`, `m<N>-<stage>.md` (high-effort stages, unchanged);
  - **freely-named ad-hoc task files** — `<task>.md` for any session-scoped scratch that
    is not a stage. New: the model explicitly blesses arbitrary work-file names.
  - All gitignored; all drained to canonical homes and deleted when the work is done.
- **Durable not-yet-actionable info** → `parking.md` (§1).

There is no remaining need for a global always-empty scratchpad. Ad-hoc scratch gets a
named work file; durable parking gets `parking.md`.

## 3. The one enforcement — advisory read

The mechanism that makes parked info "not lost" is that every stage/feature reads
`parking.md` before starting. Because `parking.md` is free-form and unparseable, this
cannot be a hard, per-item machine gate — it is advisory:

- **SKILL.md gate-check discipline gains one rule:** *"Before starting any stage or
  feature, read `project/parking.md` if it is non-empty; fold anything relevant into the
  current work."*
- **`adhd-state.mjs gate`** prints a **non-blocking** advisory line when `parking.md`
  exists and is non-empty — e.g. `note: project/parking.md has content — read it before
  proceeding`. It is surfaced in the gate output but never added to `missing`, so it
  never fails the gate. (No false pressure to empty items that belong to a later stage.)

## 4. `adhd park` — on-demand capture command

A management/on-demand command, peer to `workspace`, `adopt`, `verify`, `evolve`. Not a
pipeline stage: no gate, no place in the stage flow, callable anytime in any project
state.

**Procedure (in `reference/park.md`):**
1. Launch the `superpowers:brainstorming` sub-skill and run its **full clarifying
   dialogue with no cap on question count** — sharpen what the user wants to capture
   (intent, scope, any sketch/constraints) into a clear, self-contained entry. Only the
   clarifying portion runs; it does not continue to a design doc or `writing-plans`.
2. Append that entry to `project/parking.md`.
3. **Terminal action is the `parking.md` entry.** `park` never implements anything and
   never proceeds to `writing-plans` or any implementation skill. It is capture, not
   build. (This is the one allowed agent write path to `parking.md`, and it is always
   user-invoked — consistent with the user-owned-writes rule in §1.)

No `adhd-state.mjs` support is needed for `park`: routing is the existing
"first word is a management command → load `reference/<name>.md`" path, and the command
writes markdown directly.

## Files touched (live skill only)

- **`scripts/adhd-state.mjs`** — add the `parking.md` non-empty advisory to `gate`;
  **remove** the `notes.md` non-empty warning (currently ~line 502 in the warnings path).
- **`scripts/handoff-prompt.mjs`** (+ `handoff-prompt.test.mjs`) — drop "read
  `notes.md` first"; the resume prompt leads with the active work file and points at
  `parking.md`. Update the test that asserts `notes.md` is named.
- **`scripts/adhd-state.test.mjs`** — add tests: `gate` emits the advisory when
  `parking.md` is non-empty; stays silent when it is empty or absent; the advisory never
  flips `pass` to false.
- **`SKILL.md`**:
  - Canonical layout tree — swap the `notes.md` line for `parking.md` (durable,
    committed); note ad-hoc `work/<task>.md`.
  - Working memory section — describe the two-layer model and ad-hoc work files.
  - Add the "read `parking.md` before any stage/feature" gate-check rule.
  - Management-commands list — register `park`; routing list (~line 453) adds `park`.
  - Cross-cutting "Handoff prompts" bullet (~line 488) — drop the "read `notes.md`
    first" wording.
  - Pitfalls table — drop the two `notes.md` rows; add a one-line `parking.md` note
    (durable, user-owned, presence = pending).
- **`reference/park.md`** — new file; the `adhd park` procedure (§4).
- **`reference/setup.md`** — scaffold an empty `parking.md` with a header; stop
  scaffolding `notes.md`.
- **`reference/verify.md`** — remove the "notes.md drained" checklist item (item 7);
  `verify` does **not** police `parking.md` (it is user-owned).
- **Every `reference/*.md` "On completion" drain step** — remove the `notes.md` drain
  line; keep the work-file drain-and-delete. Affected: `vision`, `foundation`,
  `concepts`, `stories`, `prototype`, `evolve`, `milestone-brief`, `ux-refine`,
  `tracer`, `features`, `plan`, `build`, `review`, `finalize`.
- **`README.md`** — update the store list and the tree (drop `notes.md`, add
  `parking.md`).

## Out of scope

- Historical `docs/superpowers/plans/*` and `docs/superpowers/specs/*` — past design
  records, left untouched.
- Any per-item/target gating of `parking.md` — explicitly rejected; the file is
  free-form and the enforcement is advisory only.
- `verify` policing `parking.md` content — it is user-owned.

## Why this shape

- **Durable + committed** fixes the actual leak: parked info survives sessions and
  compaction.
- **Free-form, no status, presence = pending** keeps the file zero-ceremony so it does
  not itself rot — the user manages it like a notepad, and "implemented → deleted" is the
  only lifecycle rule.
- **User-owned writes (only `adhd park` writes for the user)** avoids the standing
  agent-write rule that bloats such files.
- **Advisory read** is the honest enforcement for an unparseable file; a hard gate would
  need structure the user rejected and would pressure premature emptying.
- **Removing `notes.md`** collapses the transient layer to one place (`work/*.md`),
  leaving a clean three-store story: transient `work/*`, durable buffer `parking.md`,
  canonical docs.
