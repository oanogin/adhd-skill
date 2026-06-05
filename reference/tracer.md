# adhd — Tracer

**Effort:** high
**Gate:** the milestone's `ux-refine` stage is done, and the milestone is production-track.
**Output:** `project/milestones/m{{N}}/tracer.md` plus tracer code.
**Sub-skill:** none.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate tracer --milestone {{N}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `ux-refine` is not done, HALT and tell the user to run
`adhd ux-refine --milestone {{N}}` first. If it reports the milestone is
"prototype-only", `tracer` does not apply — a prototype-only milestone goes from
`ux-refine` straight to `review`.

## What this stage is

The clickable prototype is signed off; the UX is validated. `tracer` now proves the
**backend reality** for this production-track milestone — before the work is decomposed
into features and built. It runs only on production-track milestones.

## Procedure
1. **Start working memory + seed the gate.** This high-effort stage may span sessions.
   Create `project/work/m{{N}}-tracer.md` with `## Gate` + `## Left to do` + `## Log` and
   append as you work — see SKILL.md, "Working memory". Seed `## Gate` with
   `requirements-confirmed`; clarify scope/direction with the user and check it with their
   verbatim ok, then
   `node {{scripts_path}}/adhd-state.mjs work-gate tracer --milestone {{N}}` must pass
   before you write this stage's output artifact or any code.
2. **Settle the infra mechanism — latest responsible moment.** Read the milestone's
   `infra` need from `m{{N}}/brief.md`. For each capability it requires that has no
   mechanism chosen yet, decide the mechanism now, with the user, and log it in
   `docs/DECISIONS.md`. The tracer is the first stage that needs a real backend, so
   this is where the data store and other deferred tech decisions are made.
3. **Build one deliberate thin slice.** Pick a single surface from `m{{N}}/brief.md`
   and build it end to end through the real mechanism — not a mock. Choose the slice so
   it exercises the risk classes that hurt late: auth, errors, rate limits, and data
   shape. One slice, threaded all the way through the stack. If the slice persists real
   data, this is where `docs/DATA.md` is first authored — write the schema for the
   entities the slice touches.
4. **Keep it minimal but real.** The point is to surface hard reality early, not to
   ship the surface. Build only enough to make each risk class real; leave the polish
   and the remaining work for the `features` decomposition and the per-feature stages.

   In `multi` mode, read the slice surface's `repo` + `subpath` from `m{{N}}/brief.md`,
   then look up the repo's absolute local path via
   `node {{scripts_path}}/adhd-state.mjs workspace-list`. If the repo is unbound, HALT
   and tell the user to run `adhd workspace` to bind it; never guess a
   path. The `tracer.md` notes always stay in the orchestration repo's `project/`.
5. **Record findings in `m{{N}}/tracer.md`.** Write down what was built, what each risk
   class revealed against the real backend, and every surprise — a rule discovered, an
   assumption that turned out wrong, a decision that must now be made. Note especially
   anything that contradicts the signed-off prototype: the `features` stage acts on it,
   correcting the prototype first.
6. **Respect the commit gate.** Do not commit the tracer code without the user's
   explicit "ok".

- **New entity → update `concepts` first.** If this stage surfaces a product entity not
  already in `docs/CONCEPTS.md`, stop and re-run `adhd concepts` to add it (entity +
  relationships + any state rule) before continuing. The concepts file is the single
  source of the ubiquitous language; it must not silently fall behind the build.

## Output
`project/milestones/m{{N}}/tracer.md` with:

- the slice that was built — which surface, which mechanism, what path through the stack;
- findings per risk class — what auth, errors, rate limits, and data shape each revealed;
- a surprises list — discovered rules, wrong assumptions, missing decisions, and
  anything that contradicts the signed-off prototype.

The tracer code itself is also produced, committed only after the user's explicit "ok".
`docs/DATA.md` is authored here if the slice persists data.

## On completion
1. Write the output file(s) above — tracer is done the moment `m{{N}}/tracer.md` exists.
2. If the session is getting long, start a fresh one: run
   `node {{scripts_path}}/handoff-prompt.mjs` and give the user the resume prompt.
3. Drain `project/notes.md` and `project/work/m{{N}}-tracer.md`: migrate durable facts to
   their canonical home, then delete the work file. `notes.md` healthy = empty.
4. Tell the user the next runnable stage is `features` for milestone {{N}}.
