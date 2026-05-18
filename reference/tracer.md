# adhd — Tracer

**Effort:** high
**Gate:** the milestone's `prototype` stage is done, and the milestone is
production-track.
**Output:** `project/milestones/m{{N}}/tracer.md` plus tracer code.
**Sub-skill:** none.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate tracer --milestone {{N}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `prototype` is not done, HALT and tell the user to run
`{{command_prefix}}adhd prototype --milestone {{N}}` first. If it reports the milestone
is "prototype-only", `tracer` does not apply — a prototype-only milestone goes straight
from `prototype` to `review`.

## What this stage is

The clickable prototype is signed off; the UX is validated. `tracer` now proves the
**backend reality** for this production-track milestone — before the production app is
planned and built. It runs only on production-track milestones.

## Procedure
1. **Settle the infra mechanism — latest responsible moment.** Read the milestone's
   `infra` need from `project/milestones.md`. For each capability it requires that has
   no mechanism chosen yet, decide the mechanism now, with the user, and log it in
   `docs/DECISIONS.md`. The tracer is the first stage that needs a real backend, so
   this is where the data store and other deferred tech decisions are made.
2. **Build one deliberate thin slice.** Pick a single surface from the milestone and
   build it end to end through the real mechanism — not a mock. Choose the slice so it
   exercises the risk classes that hurt late: auth, errors, rate limits, and data
   shape. One slice, threaded all the way through the stack. If the slice persists real
   data, this is where `docs/DATA.md` is first authored — write the schema for the
   entities the slice touches.
3. **Keep it minimal but real.** The point is to surface hard reality early, not to
   ship the surface. Build only enough to make each risk class real; leave the polish,
   the edge cases, and the remaining surfaces for the per-surface stages.

   In `multi` mode, resolve the slice's target location from the target surface's
   `repo` + `subpath`
   (`node {{scripts_path}}/adhd-state.mjs surface-meta <name> --milestone {{N}}`), then
   look up the repo's absolute local path in `project/repos.local.json` (via
   `node {{scripts_path}}/adhd-state.mjs workspace-list`). If the repo is unbound — no
   entry, e.g. a fresh clone — HALT and tell the user to run
   `{{command_prefix}}adhd workspace` to bind it; never guess a path. `cd` into the
   resolved path (plus `subpath` if set) to write code. The `tracer.md` notes always
   stay in the orchestration repo's `project/`. The commit gate applies in the target
   repo.
4. **Record findings in `m{{N}}/tracer.md`.** Write down what was built, what each risk
   class revealed when it met the real backend, and every surprise — a rule you
   discovered, an assumption that turned out wrong, a decision that was never made and
   now must be. Note especially anything that contradicts the signed-off prototype.
5. **Respect the commit gate.** Do not commit the tracer code without the user's
   explicit "ok". Present the work, wait for that confirmation, then commit.

## Output
`project/milestones/m{{N}}/tracer.md` with:

- A description of the slice that was built — which surface, which mechanism, what path
  through the stack.
- Findings per risk class — what auth, errors, rate limits, and data shape each
  revealed against the real mechanism.
- A surprises list — discovered rules, wrong assumptions, missing decisions, and
  anything that contradicts the signed-off prototype (the `replan` stage acts on it).

The tracer code itself is also produced this stage, committed only after the user's
explicit "ok". `docs/DATA.md` is authored here if the slice persists data.

## On completion
1. Write the output file(s) above.
2. `node {{scripts_path}}/adhd-state.mjs set tracer done --milestone {{N}}`
3. `node {{scripts_path}}/adhd-state.mjs session-add tracer`
4. `node {{scripts_path}}/context-watch.mjs --next replan` — if it advises a fresh
   session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
5. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
6. Tell the user the next runnable stage is `replan` for milestone {{N}}.
