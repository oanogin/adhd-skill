# adhd — Evolve

**Effort:** high
**Gate:** groundwork complete — the `prototype` stage is done (`project/prototype.md` +
`project/map.md` exist).
**Output:** none of its own — it mutates the living groundwork artifacts; "done" = its
work file is drained and deleted.
**Sub-skill:** `superpowers:brainstorming`.

`evolve` is the **single front door for every change after groundwork is complete** —
new features, adjustments to concepts, story edits, prototype revisions, data-model
updates, and map changes all enter through here. It is a **living, on-demand conductor**
(like `verify` or `adopt`), not part of the linear groundwork progression. It does NOT
produce a canonical artifact of its own; instead it sequences re-runs of the living
groundwork stages (`concepts`, `stories`, `prototype`, and the lazily-created
`docs/DATA.md` / `project/map.md`) so the whole set stays internally consistent. It
**never creates or starts a milestone** — a new story lands in the backlog with a drawn
surface; the user then runs `milestone-brief` to schedule it.

## Gate check

Run `node {{scripts_path}}/adhd-state.mjs gate evolve`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run
(e.g. `adhd prototype`).
No skip, no override — this is the skill's central discipline.

## Procedure

1. **Clarify with `superpowers:brainstorming` + seed working memory.** This high-effort
   stage may span sessions. Create `project/work/evolve.md` with a `## Gate` block, an
   `## Impact plan` checklist, and a `## Log` section, and append to it as you work. It
   is transient scratch — never a source of truth (see SKILL.md, "Working memory"). Seed
   `## Gate` with `requirements-confirmed`; clarify scope and direction with the user and
   record their verbatim ok, then
   `node {{scripts_path}}/adhd-state.mjs work-gate evolve` must pass before executing any
   step of the impact plan.

2. **Write the impact plan.** Populate `## Impact plan` in `project/work/evolve.md` with
   an **ordered checklist** of which living artifacts must change and why, in dependency
   order (`concepts → stories → prototype → data/map …`). Include only the stages the
   change actually touches. Each checklist item names the stage and the specific mutation
   it must make (e.g. `[ ] concepts — add "Subscription" entity and its lifecycle`).

3. **Confirm the plan with the user.** Walk the user through the impact plan, explain
   why each stage is included, and get explicit agreement before making any changes.
   Adjust the plan if they redirect.

4. **Execute each impact-plan item in order.** For each checked stage, re-run that
   stage's full procedure — `adhd concepts` / `adhd stories` / `adhd prototype` / etc.
   Each sub-run keeps its **own gates and work-gates**; they must not be skipped.
   Check the item in `## Impact plan` only after the sub-run's own `## On completion`
   steps finish. A new story **must** have its `Surfaces` cell filled by a `prototype`
   re-run before it is implementable or selectable at `milestone-brief`.

   > **Milestone boundary:** `evolve` never creates or starts a milestone. A new story
   > lands in the backlog with a drawn surface. When the impact plan is fully executed,
   > the user runs `milestone-brief` to schedule it.

## Output

None of its own. `evolve` leaves the living artifacts —
`docs/CONCEPTS.md`, `project/stories.md`, `project/prototype.md`, `project/map.md`,
`docs/DATA.md` (as applicable) — updated and mutually consistent.

## On completion

1. The stage is **done** when every `## Impact plan` item is checked AND
   `project/work/evolve.md` is drained and deleted.
2. Drain durable facts to their canonical homes first — nothing informational should
   remain only in the work file.
3. Delete `project/work/evolve.md`. The `verify` pass flags a leftover `evolve.md`.
4. Tell the user the relevant next step — for example: run `milestone-brief` to schedule
   a newly-prototyped story into an upcoming milestone.
