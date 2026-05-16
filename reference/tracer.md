# adhd — Tracer

**Effort:** high
**Gate:** `project/milestones/m{{N}}/ux.md` exists — the Milestone UX stage is done.
**Output:** `project/milestones/m{{N}}/tracer.md` plus tracer code.
**Sub-skill:** none.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate tracer --milestone {{N}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `project/milestones/m{{N}}/ux.md` is missing, HALT and tell the
user to run `{{command_prefix}}adhd milestone-ux --milestone {{N}}` first.

## Procedure
1. **Build one deliberate thin slice.** Pick a single surface from the milestone and
   build it end to end with a real backend — not a mock. Choose the slice so it
   exercises the risk classes that hurt late: auth, errors, rate limits, and data
   shape. One slice, threaded all the way through the stack.
2. **Keep it minimal but real.** The point is to surface hard reality early, not to
   ship the surface. Build only enough to make each risk class real; leave the polish,
   the edge cases, and the remaining surfaces for the per-surface stages.

   In `multi` mode the slice's code is written in the relevant registered code
   repo: read the target surface's `repo`
   (`node {{scripts_path}}/adhd-state.mjs surface-meta <name> --milestone {{N}}`),
   resolve its path from `node {{scripts_path}}/adhd-state.mjs workspace-list`, and
   `cd` into that path to write code. The `tracer.md` notes always stay in the
   orchestration repo's `project/`. The commit gate applies in the target repo.
3. **Record findings in `m{{N}}/tracer.md`.** Write down what was built, what each risk
   class revealed when it met a real backend, and every surprise — a rule you
   discovered, an assumption that turned out wrong, a decision that was never made and
   now must be.
4. **Respect the commit gate.** Do not commit the tracer code without the user's
   explicit "ok". Present the work, wait for that confirmation, then commit.

## Output
`project/milestones/m{{N}}/tracer.md` with:

- A description of the slice that was built — which surface, which backend, what path
  through the stack.
- Findings per risk class — what auth, errors, rate limits, and data shape each
  revealed when exercised against a real backend.
- A surprises list — discovered rules, wrong assumptions, and missing decisions.

The tracer code itself is also produced this stage, committed only after the user's
explicit "ok".

## On completion
1. Write the output file(s) above.
2. `node {{scripts_path}}/adhd-state.mjs set tracer done --milestone {{N}}`
3. `node {{scripts_path}}/adhd-state.mjs session-add tracer`
4. `node {{scripts_path}}/context-watch.mjs --next replan` — if it advises a fresh
   session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
5. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
6. Tell the user the next runnable stage is `replan` for milestone {{N}}.
