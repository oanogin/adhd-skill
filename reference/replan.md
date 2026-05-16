# adhd — Replan

**Effort:** medium
**Gate:** `project/milestones/m{{N}}/tracer.md` exists — the Tracer stage is done.
**Output:** an updated `project/milestones/m{{N}}/overview.md` and an updated
`project/milestones/m{{N}}/tracer.md`.
**Sub-skill:** none.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate replan --milestone {{N}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `project/milestones/m{{N}}/tracer.md` is missing, HALT and tell the
user to run `{{command_prefix}}adhd tracer --milestone {{N}}` first.

## Procedure
1. **Revise the surface plan against the tracer.** Re-read the tracer findings and the
   surprises list. Update `m{{N}}/overview.md` so the milestone's surface plan reflects
   what the tracer actually discovered — add surfaces that the reality made necessary,
   remove ones that no longer make sense, reorder them, and adjust scope where the
   tracer proved the original estimate wrong.
2. **Record what changed.** Append a `## Replan decisions` section to `tracer.md`
   listing each change to the plan and the tracer finding that drove it.
3. **Migrate durable rules.** Any durable rule the tracer uncovered belongs in its
   canonical home, not in the tracer notes: domain rules go to `docs/DOMAIN.md`,
   decisions go to `docs/DECISIONS.md`. Move them now so later stages see them.

## Output
- `project/milestones/m{{N}}/overview.md` — revised so the surface plan matches what the
  tracer discovered (surfaces added, removed, reordered, or rescoped).
- `project/milestones/m{{N}}/tracer.md` — gains a `## Replan decisions` section
  recording each plan change and the finding behind it.
- Durable rules uncovered by the tracer migrated into `docs/DOMAIN.md` or
  `docs/DECISIONS.md`.

## On completion
1. Write the output file(s) above.
2. `node {{scripts_path}}/adhd-state.mjs set replan done --milestone {{N}}`
3. `node {{scripts_path}}/adhd-state.mjs session-add replan`
4. `node {{scripts_path}}/context-watch.mjs --next design` — if it advises a fresh
   session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
5. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
6. The per-surface loop now begins. Tell the user the next runnable stage is `design`
   for the first surface of milestone {{N}}.
