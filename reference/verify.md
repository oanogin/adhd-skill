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
   the flow files — a flow references and places a rule, never restates it; navigation
   or interaction rules that have leaked into `CONCEPTS.md`; fields, schema, or surfaces
   appearing in `CONCEPTS.md` (fields belong in `docs/DATA.md`, participants/placement
   in `project/map.md`).
4. **Capability, not mechanism.** Stack, framework, or database names leaking into the
   product-scope docs (`docs/PRODUCT.md`, `project/stories.md`, `project/map.md`,
   `project/flows/*`). The prototype *app* is the only legitimate place mechanisms
   appear.
5. **Story / feature integrity.** Features pointing at unknown stories, unknown repo
   references (a `multi`-mode feature naming a repo not registered in `config.json`),
   dangling dependency IDs, dependency cycles, duplicate story IDs.
6. **Stale work files.** Any `project/work/*.md` whose stage is already complete (its
   artifact exists) is stale — its durable facts should have been drained to their
   canonical home and the file deleted.
7. **Abandoned evolve work file.** `project/work/evolve.md` still exists — either an
   `evolve` cascade was abandoned mid-way, or all `## Impact plan` items are checked
   but the file was not deleted as required by the `evolve` on-completion steps.
8. **Review findings hygiene.** An `m<N>/review.md` whose findings table is missing
   the `Severity`/`Status` columns (the `finalize` gate cannot parse it), or a
   finalized milestone (`summary.md` exists) with findings still `open`.
9. **STACK ↔ DECISIONS drift.** A technology named in `docs/STACK.md` with no
   corresponding entry in `docs/DECISIONS.md` (warning), or — stronger — a stack
   element that decisions or `realize` notes show in use but that is absent from
   `docs/STACK.md`. `STACK.md` is current state; `DECISIONS.md` is the log — both
   must tell the same story.
10. **Flow checks (when `project/flows/` exists):** same trigger → contradictory
    outcomes across flows; participant pairs whose message contracts conflict; state
    transitions violating `docs/CONCEPTS.md` lifecycles; messages consumed that no flow
    produces; registry orphans (registered participants no flow uses); flows owned by
    no milestone brief's `## Flows` list. Structural sanity (mermaid parse, undeclared
    participants, unknown deps, cycles) is covered by `adhd-state.mjs validate` — do
    not re-audit it here.

## Output

- A findings list with severities, each tied to a file and a concrete proposed edit.
- The conductor's summary to the user, and — once approved — the applied edits.

## Wiring

- `finalize` runs `verify` (not the old `adhd audit`) and resolves its findings before
  writing the milestone summary.
- The "new entity → update `concepts` first" rule on `realize`/`build` is a
  soft inline reminder; `verify` at `finalize` is the backstop that catches a
  `CONCEPTS.md` that fell behind.
- Structural, mechanical sanity (legacy state file, config version, repo bindings,
  feature-DAG cycles for routing) stays in `node {{scripts_path}}/adhd-state.mjs validate`
  — run that for a fast pre-flight; run `verify` for the content/consistency judgment.
