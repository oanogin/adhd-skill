# adhd — Plan

**Effort:** medium
**Gate:** the feature exists in the milestone's DAG, and the `features` stage is done.
**Output:** `project/milestones/m{{N}}/plans/{{feature}}.md`.
**Sub-skill:** `superpowers:writing-plans`.

`plan` turns one feature into an ordered set of bite-sized implementation tasks. It
runs per feature, on production-track milestones.

**Size `S` features skip this stage.** A feature whose `Size` cell in
`m{{N}}/features.md` is `S` is built directly from its surface spec + feature row —
`adhd next` returns `build` for it and the `build` gate does not require a plan file.
Planning an `S` feature anyway is allowed (the plan file is simply honored), but the
default is skip. If, on inspection, an `S` feature turns out to need real design
decisions, change its `Size` to `M` in `features.md` and plan it — do not build
unplanned work that deserved a plan.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate plan --milestone {{N}} --feature {{feature}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports the feature does not exist or `features` is not done, HALT and tell
the user to run `adhd features --milestone {{N}}` first.

## Procedure
1. **Write the implementation plan.** Run `superpowers:writing-plans` for the feature.
   Read the feature's row in `m{{N}}/features.md` — its story, domain, repo, and the
   surface it serves — and the relevant surface spec(s) in `m{{N}}/surfaces/`. The plan
   turns the feature into an ordered set of concrete implementation tasks for the Build
   stage.
2. **Override the plan output path.** `writing-plans` defaults to
   `docs/superpowers/plans/`. OVERRIDE that: save to the canonical target
   `project/milestones/m{{N}}/plans/{{feature}}.md`. Pass that path when invoking the
   sub-skill.
3. **Keep tasks bite-sized.** Every task is a small, independently verifiable step. If
   the feature is large, the plan splits it into more, smaller tasks — small steps is a
   cross-cutting rule of this skill. The plan targets the feature's own `repo`; honor
   that repo's conventions.

## Output
`project/milestones/m{{N}}/plans/{{feature}}.md` — an implementation plan in the
`writing-plans` format: an ordered list of bite-sized, independently verifiable tasks
that take the feature through to working, verified code.

## On completion
1. Write the output file(s) above — the feature is planned the moment
   `m{{N}}/plans/{{feature}}.md` exists.
2. If the session is getting long, start a fresh one: run
   `node {{scripts_path}}/handoff-prompt.mjs` and give the user the resume prompt.
3. Tell the user the next runnable stage is `build` for this feature — or `plan` for
   the next feature; `node {{scripts_path}}/adhd-state.mjs next --milestone {{N}}` names it.
