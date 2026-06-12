# adhd — Finalize

**Effort:** low
**Gate:** the milestone's `review` stage is done AND no `critical` finding in
`m{{N}}/review.md` is still `open`.
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
`adhd review --milestone {{N}}` first. If it reports an open `critical` review
finding, HALT — resolve it first (`adhd fix`, a feature row, or `Status: accepted`
with the user's explicit ok; see [review.md](review.md)).

## Procedure
1. **Drain and migrate any `project/work/*.md`.** Migrate every durable fact to its
   canonical home, then delete the work file — the milestone's record is the current
   set of docs, not a drift of scratch files.
2. **Update the canonical docs to the milestone's reality.** Reflect what the milestone
   actually changed: decisions in `docs/DECISIONS.md`, the current stack in
   `docs/STACK.md` (every stack change the milestone made must be there, with its
   decision logged), refined concepts in `docs/CONCEPTS.md`. **Mark the milestone's
   shipped capability areas as built** in the capability dependency map in
   `docs/CONCEPTS.md` — the pickable-next rule and the next `brief` depend on the map
   staying current. When the milestone persisted real data, update `docs/DATA.md` to the
   current field-level state of every entity this milestone added or changed (create
   `docs/DATA.md` if this is the first milestone to persist data). `DATA.md` entities are
   `## ` headings; every one must be defined in `docs/CONCEPTS.md` — if an entity is
   missing from `docs/CONCEPTS.md`, STOP and run `adhd concepts` — do not inline-edit
   `CONCEPTS.md` here. Run the `verify` pass (see [reference/verify.md](verify.md)) and
   resolve any findings.
3. **Write `m{{N}}/summary.md`** — what the milestone delivered: stories completed,
   features built, surfaces shipped, key decisions made, and anything explicitly
   carried forward to a future milestone.

There is no "advance" step. Milestones are independent `m<N>/` folders — the next one
is created simply by running `brief`, which writes a new `m<N>/brief.md`. A new
milestone can be started before this one finalizes; they progress in parallel.

## Output
- `project/milestones/m{{N}}/summary.md` — the milestone summary.
- canonical docs updated; no stale `project/work/*.md` left; `verify` findings resolved.

## On completion
1. Write the output file(s) above — the stage is done the moment `m{{N}}/summary.md`
   exists.
2. If the session is getting long, start a fresh one: run
   `node {{scripts_path}}/handoff-prompt.mjs` and give the user the resume prompt.
3. Milestone {{N}} is complete. Tell the user the next runnable stage is
   `brief` for the next milestone (a new `m<N>/` folder).
