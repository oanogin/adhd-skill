# adhd — agent-driven `verify` (replacing script `audit`)

**Date:** 2026-05-31
**Status:** approved design, pre-implementation
**Supersedes:** the script-based `audit` content checks added in
`2026-05-31-concepts-stage-and-working-memory-design.md` (DATA↔CONCEPTS, stale work
files, mechanism-leak, story/feature integrity).

## Why

The script `audit` did semantic work with substring greps: DATA↔CONCEPTS matching
over-matched on common words, markdown in headings produced false positives, determinism
("no synonyms / no TBD") was unenforceable, and cross-artifact drift (concepts ↔ prototype
↔ surfaces) cannot be judged mechanically at all. These are judgment tasks. A sub-agent
that reads the artifacts does them better than a regex — and it keeps `adhd-state.mjs`
thin and deterministic.

## Decision

- **`adhd-state.mjs` keeps only mechanical, deterministic work:** `gate` (file-existence
  predecessors), `status`, `next`, `validate` (structural config/DAG sanity for routing),
  the `config.json` writers, session scratch, and `migrate`. These need no judgment, run
  fast, and are tested.
- **The `audit` function is removed.** The CLI `audit` subcommand becomes a thin pointer
  that tells the user to run the agent-driven `verify` pass. No judgment logic remains in
  the script.
- **`verify` is a new management command** (like `workspace`, `adopt`) — no gate, runnable
  anytime. Documented in `reference/verify.md`. The conductor runs it by dispatching a
  fresh read-only sub-agent that reads the `.md` artifacts and returns findings + proposed
  edits; the conductor presents them and applies edits only on user approval. Never
  auto-commits.

## What `verify` checks (the sub-agent's checklist)

1. **CONCEPTS ↔ DATA (both directions).** Every `docs/DATA.md` entity is defined in
   `docs/CONCEPTS.md`. On a project with a completed production milestone, flag (warn)
   `CONCEPTS.md` entities with no `DATA.md` coverage, and likely renames (near-match in
   one but not the other).
2. **CONCEPTS determinism.** Duplicate or synonymous terms, a term defined twice, `TBD`/
   `TODO` placeholders, relationships stated inconsistently.
3. **Boundary / duplication.** Entity/state rules duplicated between `CONCEPTS.md` and
   `prototype`/surface specs; navigation/interaction rules leaking into `CONCEPTS.md`;
   fields/schema or surfaces appearing in `CONCEPTS.md` (they belong in `DATA.md` / `map.md`).
4. **Capability, not mechanism.** Stack/framework/database names leaking into the
   product-scope docs (`docs/PRODUCT.md`, `project/stories.md`, `project/map.md`).
5. **Story / feature integrity.** Features referencing unknown stories, dangling
   dependency IDs, dependency cycles, duplicate story IDs (semantic + structural).
6. **Stale work files.** `project/work/*.md` whose stage is already complete → drain
   durable facts to canonical homes, then delete.
7. **notes.md drained.** `project/notes.md` should be empty.
8. **Prototype / surface drift.** Surfaces or the prototype that contradict the
   signed-off flow or the current `CONCEPTS.md`.

The sub-agent reports; it does not edit. The conductor applies approved edits.

## Wiring

- `finalize` runs `verify` instead of `adhd audit`.
- The "new entity → update `concepts` first" back-pressure on `tracer`/`features`/`build`
  is also caught by `verify` at `finalize` (the soft inline reminder stays).
- The cross-cutting "single source of truth" rule and the `features`/`review` reference
  checks point to `verify`.
- SKILL.md management-commands + routing list `verify` alongside `workspace`/`adopt`.

## Also in this change (carried fixes)

- **Handoff milestone bug.** `handoff-prompt.mjs` `activeWorkFile` must not pick a
  non-matching milestone's work file in its fallback, and the `Run:` line must include
  `--milestone N` when the resume stage is a milestone stage.
- **"automatic" → "expected".** The working-memory file is created by each high-effort
  stage's procedure (a discipline), not enforced by a script. Docs are reworded to drop
  the "automatic … cannot corrupt context" overclaim; the honest promise is "created as
  the stage's first step so a session that ends mid-stage resumes cleanly."

## Out of scope

- Hooks (still rejected — keeps the skill cross-agent).
- Auto-applying `verify` edits without user approval.
- Removing `validate` (it is structural/deterministic, not content judgment).
