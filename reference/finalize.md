# adhd — Finalize

**Effort:** low
**Gate:** the milestone's `review` stage is done.
**Output:** `project/milestones/m{{N}}/summary.md` + cleaned-up canonical docs.
**Sub-skill:** none.

`finalize` closes the milestone. It consolidates everything durable into its canonical
home and writes the milestone summary, so the next milestone starts from a clean,
current set of docs rather than a drift of scratch notes.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate finalize --milestone {{N}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `review` is not done, HALT and tell the user to run
`adhd review --milestone {{N}}` first.

## Procedure
1. **Drain and migrate `project/notes.md`.** It must end empty — migrate every durable
   entry to its canonical home (`docs/DECISIONS.md`, `docs/CONCEPTS.md`,
   `docs/DATA.md`, a surface spec, `.ruler/`).
2. **Update the canonical docs to the milestone's reality.** Reflect what the milestone
   actually changed: decisions in `docs/DECISIONS.md`, refined concepts in
   `docs/CONCEPTS.md`. On a **production-track** milestone, update `docs/DATA.md` to the
   current field-level state of every entity this milestone added or changed (create
   `docs/DATA.md` if this is the first milestone to persist data). `DATA.md` entities are
   `## ` headings; every one must be defined in `docs/CONCEPTS.md` — if not, update
   `concepts` first. Run `node {{scripts_path}}/adhd-state.mjs audit` and resolve any
   findings.
3. **Write `m{{N}}/summary.md`** — what the milestone delivered: stories completed,
   features built, surfaces shipped, key decisions made, and anything explicitly
   carried forward to a future milestone.

There is no "advance" step. Milestones are independent `m<N>/` folders — the next one
is created simply by running `milestone-brief`, which writes a new `m<N>/brief.md`. A
new milestone can be started before this one finalizes; they progress in parallel.

## Output
- `project/milestones/m{{N}}/summary.md` — the milestone summary.
- canonical docs updated; `project/notes.md` empty; `audit` clean.

## On completion
1. Write the output file(s) above — the stage is done the moment `m{{N}}/summary.md`
   exists.
2. `node {{scripts_path}}/adhd-state.mjs session-add finalize`
3. `node {{scripts_path}}/context-watch.mjs --next milestone-brief` — if it advises a
   fresh session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
4. Milestone {{N}} is complete. Tell the user the next runnable stage is
   `milestone-brief` for the next milestone (a new `m<N>/` folder).
