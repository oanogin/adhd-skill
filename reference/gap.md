# adhd — Gap

**Effort:** medium
**Gate:** the milestone's `replan` stage is done; production-track milestones only.
**Output:** `project/milestones/m{{N}}/gap.md`.
**Sub-skill:** none.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate gap --milestone {{N}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `replan` is not done, HALT and tell the user to run
`{{command_prefix}}adhd replan --milestone {{N}}` first. `gap` runs only on
production-track milestones — a prototype-only milestone has no production app and goes
straight from `prototype` to `review`.

## What this stage is

The prototype is signed off and reconciled with the tracer's backend reality. `gap`
measures the delta the production app must close to match it, surface by surface, so
`plan` and `build` have a concrete target.

## Procedure
0. **UI-less milestone — trivial pass.** If the milestone has no `ui` surfaces (every
   surface is `api` or `lib`), there is no prototype-vs-production UI delta. Write a
   short `m{{N}}/gap.md` recording "no `ui` surfaces — no UI gap; `plan`/`build` carry
   the backend work", mark the stage done, and proceed to `plan`. Skip steps 1–3.
1. **Diff prototype against production, per `ui` surface.** For each `ui` surface in
   milestone `{{N}}`, compare the **prototype app** against the current **production
   app** — missing surfaces or states, data-shape differences (mock shape vs the real
   shape from `docs/DATA.md`), and any behaviour the production app still lacks. At the
   first production-track milestone the production app does not exist yet, so the gap is
   the whole prototype so far — the surfaces production must be stood up to reach.
2. **The prototype is the target, never the other way round.** If something still
   contradicts the prototype, that is a `replan` reconciliation that was missed — fix
   the prototype first, then record the gap. The production UI is always moved to match
   the prototype.
3. **Write `m{{N}}/gap.md`.** One block per `ui` surface with the concrete delta
   `build` must close. `api`/`lib` surfaces have no prototype — note them as not
   applicable.

## Output
`project/milestones/m{{N}}/gap.md` with one block per `ui` surface — the concrete delta
between the signed-off prototype and the production app that `build` must close,
including where mock data shape must become the real `docs/DATA.md` shape.

## On completion
1. Write the output file(s) above.
2. `node {{scripts_path}}/adhd-state.mjs set gap done --milestone {{N}}`
3. `node {{scripts_path}}/adhd-state.mjs session-add gap`
4. `node {{scripts_path}}/context-watch.mjs --next plan` — if it advises a fresh
   session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
5. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
6. Tell the user the next runnable stage is `plan` for the milestone's first surface.
