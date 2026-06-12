# adhd — Realize

**Effort:** high
**Gate:** `m{{N}}/flows.md` exists (flows signed off).
**Output:** `m{{N}}/realize.md` (mechanism notes) + `m{{N}}/features.md` (the DAG —
its existence is the done signal).
**Sub-skill:** none.

`realize` turns the signed-off flow set into buildable work: mechanisms + the feature
DAG.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate realize --milestone {{N}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.

## Procedure
1. **Start working memory.** Create `project/work/m{{N}}-realize.md` with `## Gate` +
   `## Left to do` + `## Log`; seed `requirements-confirmed` for the mechanism set.
2. **Pick mechanisms.** For each capability the milestone's flows need, choose the
   concrete mechanism. **Baseline guard:** anything not in `docs/STACK.md` stops for
   the user's ok first; update `STACK.md` and log the decision in `docs/DECISIONS.md`.
   Run an end-to-end spike ONLY when genuinely new infrastructure appears
   — prove the path, then continue. Record mechanism notes in `m{{N}}/realize.md`.
3. **Carve the feature DAG from diagram segments — entity-aware.** For every entity
   (service/store participant) the milestone's flows touch:
   - Run `node {{scripts_path}}/adhd-state.mjs contract <participant>` — its full
     cross-flow interface.
   - The FIRST feature for that entity is its skeleton: schema + interface shaped
     from the full contract, sized for all flows. Per-story features then fill
     behavior. Skeleton built once, extended N times, reworked zero.
   - A frontend feature wires a `ui` participant to its backend features and depends
     on them.
4. **Write `m{{N}}/features.md`** as the standard table — exactly these columns:
   `| ID | Feature | Story | Domain | Repo | Size | Depends on | Build | Verified |`
   Name the flow(s) a feature implements in its `Feature` cell (e.g.
   `redeem endpoint (invite-redeem)`) — `plan`/`build` read it to find the diagrams.
   Size `S` skips `plan`; when unsure write `M`. Leave Build/Verified empty.
5. **Check it.** Run `node {{scripts_path}}/adhd-state.mjs validate` (cycles, unknown
   deps), then the `verify` pass (see [reference/verify.md](verify.md)) for content
   drift.

- **New entity → update `concepts` first.** If this stage surfaces a product entity
  not already in `docs/CONCEPTS.md`, stop and re-run `adhd concepts` to add it before
  continuing — and route the missing flow through `adhd evolve`. The concepts file is
  the single source of the ubiquitous language.

## Output
`project/milestones/m{{N}}/features.md` — the feature DAG (existence = stage done) —
plus `m{{N}}/realize.md` with the mechanism notes and any spike findings.

## On completion
1. Write the output files — the stage is done the moment `m{{N}}/features.md` exists.
2. Drain and delete `project/work/m{{N}}-realize.md`.
3. `node {{scripts_path}}/adhd-state.mjs next --milestone {{N}}` names the first
   feature's `plan` (or `build`, for a Size `S` feature).
