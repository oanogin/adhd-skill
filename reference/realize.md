# adhd — Realize

**Effort:** high
**Gate:** `m{{N}}/flows.md` exists (flows signed off).
**Output:** `m{{N}}/features.md` (GENERATED — its existence is the done signal) +
a tiny `m{{N}}/realize.md` mechanism delta (or none, baseline-only).
**Sub-skill:** none.

`realize` does two things: settle mechanisms, then generate the feature DAG from the
flows. It does NOT carve a DAG out of diagram prose and does NOT write a verbose notes
file — the script derives the DAG; flows stay the single source of behavior.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate realize --milestone {{N}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.

## Procedure

### a) Settle mechanisms
For each capability the milestone's flows need beyond the `docs/STACK.md` baseline, pick
the concrete mechanism.

- **Baseline guard:** anything new (lib/store/provider not in `STACK.md`) STOPS for the
  user's ok first; then update `docs/STACK.md` and append a `docs/DECISIONS.md` entry.
  Run an end-to-end spike ONLY for genuinely new infrastructure — prove the path, continue.
- **Requirements-confirmed work-gate (only when a new mechanism enters):** create
  `project/work/m{{N}}-realize.md` with `## Gate` + `## Left to do` + `## Log`; seed
  `requirements-confirmed` for the mechanism set. Present the set to the user, record their
  verbatim ok, then run
  `node {{scripts_path}}/adhd-state.mjs work-gate realize --milestone {{N}}` — it must pass
  before generating the DAG.
- **Record the delta.** Write `m{{N}}/realize.md` as TERSE bullets ONLY: each new
  lib/store/provider this milestone adds + one phrase on how it's used, each
  cross-referenced to its `DECISIONS.md` entry. This is `build`'s scoped mechanism context —
  it is NOT prose and is NOT read by the user.
  - **Baseline-only milestone** (nothing beyond `STACK.md`): SKIP the file entirely. State
    "mechanisms: baseline only — `<the list>`" and proceed. No work file, no work-gate.

Example `m{{N}}/realize.md`:

```markdown
# m2 realize — mechanism delta
- localForage — per-order IndexedDB record (DECISIONS.md#offline-store)
- zod — request-shape validation at service boundary (DECISIONS.md#validation)
```

### b) Generate the feature DAG
Run:

```bash
node {{scripts_path}}/adhd-state.mjs features-scaffold --milestone {{N}}
```

This GENERATES `m{{N}}/features.md` from the flows — slug IDs, derived deps,
`<entity>-skeleton` rows for each service/store participant. Standard 8-col table:
`| ID | Feature | Domain | Repo | Size | Depends on | Build | Verified |`.

Then by hand:

1. **Fill `Domain` / `Repo` / `Size`** on every generated row. Size is informational
   (it drives no routing). Use `node {{scripts_path}}/adhd-state.mjs contract <participant>`
   to size the skeleton rows.
2. **Add non-flow rows** the script can't derive: shared-core infra (scaffold/schema/auth)
   and one UI-surface row per `project/surfaces/` stub, its `Depends on` = the flows that
   surface drives.

**Idempotent re-run:** re-running `features-scaffold` merges by ID — it preserves
`Build`/`Verified`/`Domain`/`Repo`/`Size` and leaves your hand-added rows VERBATIM. A
scaffold row whose flow no longer exists is dropped and reported. Use `--dry-run` to see the
diff without writing.

### c) Check it
Run `node {{scripts_path}}/adhd-state.mjs validate` (cycles, unknown deps, code-in-plan).

- **New entity → update `concepts` first.** If this stage surfaces a product entity not in
  `docs/CONCEPTS.md`, stop and re-run `adhd concepts` to add it, and route the missing flow
  through `adhd evolve`. CONCEPTS is the single source of the ubiquitous language.

## Conventions
- Feature ID = the flow slug (stable, human-readable). The slug is also the code-slice dir
  name `src/lib/flows/<slug>/`, 1:1 with `project/flows/<slug>.md`.
- Skeleton IDs are `<entity>-skeleton`. A flow slug colliding with a skeleton name is a hard
  error — rename the flow through `evolve`, do not auto-disambiguate.

## Output
`m{{N}}/features.md` (generated, then hand-filled — existence = stage done) + a tiny
`m{{N}}/realize.md` mechanism delta, or none for a baseline-only milestone. Mechanism FACTS
live in `STACK.md`/`DECISIONS.md`; `realize.md` is only the per-milestone delta.

## On completion
1. The stage is done the moment `m{{N}}/features.md` exists.
2. Drain and delete `project/work/m{{N}}-realize.md` if one was created.
3. `node {{scripts_path}}/adhd-state.mjs next --milestone {{N}}` names the first feature's
   `build`. Run `plan` on-demand only when a feature has real unknowns.
