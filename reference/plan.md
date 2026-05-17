# adhd — Plan

**Effort:** medium
**Gate:** the surface spec `surfaces/{{name}}.md` exists (Design done) AND the
milestone's `gap` stage is done.
**Output:** `project/milestones/m{{N}}/plans/{{name}}.md`.
**Sub-skill:** `superpowers:writing-plans`.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate plan --milestone {{N}} --surface {{name}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `project/milestones/m{{N}}/surfaces/{{name}}.md` is missing, HALT
and tell the user to run `{{command_prefix}}adhd design --milestone {{N}} --surface {{name}}`
first. If it reports the milestone's `gap` stage is not done, HALT and tell the user to
run `{{command_prefix}}adhd gap --milestone {{N}}` first.

## Procedure
1. **Write the implementation plan.** Run `superpowers:writing-plans` against the
   surface spec `surfaces/{{name}}.md`. The plan turns the spec into an ordered set of
   concrete implementation tasks for the Build stage. `plan` runs only on
   production-track milestones, so the plan targets the **production app**: it must
   close this surface's delta from `m{{N}}/gap.md` — moving the production UI to match
   the signed-off prototype, on real data, is the plan's job.
2. **Override the plan output path.** `writing-plans` defaults its plan to
   `docs/superpowers/plans/`. OVERRIDE that: save the plan to the canonical target
   `project/milestones/m{{N}}/plans/{{name}}.md`. Pass that path when invoking the
   sub-skill; do not let it write to `docs/superpowers/plans/`.
3. **Keep tasks bite-sized.** Every task should be a small, independently verifiable
   step. If the surface is large, the plan splits it into more, smaller tasks rather
   than fewer large ones — small steps is a cross-cutting rule of this skill.

## Output
`project/milestones/m{{N}}/plans/{{name}}.md` — an implementation plan in the
`writing-plans` format: an ordered list of bite-sized, independently verifiable tasks
that take the surface spec `surfaces/{{name}}.md` through to working code.

## On completion
1. Write the output file(s) above.
2. `node {{scripts_path}}/adhd-state.mjs set plan done --milestone {{N}} --surface {{name}}`
3. `node {{scripts_path}}/adhd-state.mjs session-add plan`
4. `node {{scripts_path}}/context-watch.mjs --next build` — if it advises a fresh
   session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
5. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
6. Tell the user the next runnable stage is `build` for this surface.
