# adhd — verify (management command)

**Effort:** medium
**Purpose:** an agent-driven consistency & quality audit of the project's artifacts. It
reads the `.md` artifacts, reports drift, contradictions, and determinism problems, and
proposes edits for the user to approve. It replaces the old script `audit`: judgment
about *content* belongs to a reading agent, not a regex.
**Not a stage:** no gate. Run it anytime; it is recommended at `finalize` and after
running `evolve` (or after re-running any individual groundwork stage).

## How it runs

`verify` is performed by a **fresh, read-only sub-agent**, so it judges the artifacts
with clean eyes and does not pollute the conductor's context:

1. Dispatch a sub-agent with read access to `docs/` and `project/`. Give it the checklist
   below and tell it: **report findings only — do not edit any file.** On an agent
   without sub-agent dispatch (some Codex/Cursor setups), do the same pass inline as a
   focused read-only sweep.
2. The sub-agent returns a findings list (each: severity + file + the concrete problem +
   a suggested edit).
3. The conductor presents the findings and the proposed edits to the **user**. Apply
   edits only on approval. Never auto-apply; never `git commit` without the user's "ok".

## The checklist (what the sub-agent verifies)

1. **CONCEPTS ↔ DATA, both directions.** Every entity in `docs/DATA.md` (its `## `
   headings) is defined in `docs/CONCEPTS.md`. If a production-track milestone is
   complete, also flag (as a warning) `CONCEPTS.md` entities that have no `DATA.md`
   coverage, and likely **renames** — a near-match name present in one file but not the
   other.
2. **CONCEPTS determinism.** Duplicate or synonymous terms, a term defined more than
   once, `TBD`/`TODO` placeholders, relationships stated inconsistently. `CONCEPTS.md`
   must be single-meaning.
3. **Boundary / duplication.** Entity/state rules duplicated between `CONCEPTS.md` and
   the `prototype`/surface specs; navigation or interaction rules that have leaked into
   `CONCEPTS.md`; fields, schema, or surfaces appearing in `CONCEPTS.md` (fields belong
   in `docs/DATA.md`, surfaces/placement in `project/map.md`).
4. **Capability, not mechanism.** Stack, framework, or database names leaking into the
   product-scope docs (`docs/PRODUCT.md`, `project/stories.md`, `project/map.md`). The
   prototype *app* is the only legitimate place mechanisms appear.
5. **Story / feature integrity.** Features pointing at unknown stories, unknown repo
   references (a `multi`-mode feature naming a repo not registered in `config.json`),
   dangling dependency IDs, dependency cycles, duplicate story IDs.
6. **Stale work files.** Any `project/work/*.md` whose stage is already complete (its
   artifact exists) is stale — its durable facts should have been drained to their
   canonical home and the file deleted.
7. **notes.md drained.** `project/notes.md` should be empty; flag any durable entry that
   belongs in a canonical home (`docs/DECISIONS.md`, `docs/CONCEPTS.md`, `docs/DATA.md`,
   a surface spec, `.ruler/`).
8. **Prototype / surface drift.** Surfaces or the prototype that contradict the
   signed-off whole-product flow or the current `CONCEPTS.md`.
9. **Undrained story changes.** `project/work/prototype.md` has an undrained
   `## Story changes` block while the `prototype` stage is done — story changes were
   written during a prototype run but never folded into `project/stories.md`.
10. **Empty Surfaces cell.** An `m<N>/brief.md` references a story whose `Surfaces`
    cell is empty in `project/stories.md` — the story was never drawn in the prototype
    and is therefore not implementable (mirrors the `adhd-state.mjs validate` blocker).
11. **Abandoned evolve work file.** `project/work/evolve.md` still exists — either an
    `evolve` cascade was abandoned mid-way, or all `## Impact plan` items are checked
    but the file was not deleted as required by the `evolve` on-completion steps.

## Output

- A findings list with severities, each tied to a file and a concrete proposed edit.
- The conductor's summary to the user, and — once approved — the applied edits.

## Wiring

- `finalize` runs `verify` (not the old `adhd audit`) and resolves its findings before
  writing the milestone summary.
- The "new entity → update `concepts` first" rule on `tracer`/`features`/`build` is a
  soft inline reminder; `verify` at `finalize` is the backstop that catches a
  `CONCEPTS.md` that fell behind.
- Structural, mechanical sanity (legacy state file, config version, repo bindings,
  feature-DAG cycles for routing) stays in `node {{scripts_path}}/adhd-state.mjs validate`
  — run that for a fast pre-flight; run `verify` for the content/consistency judgment.
