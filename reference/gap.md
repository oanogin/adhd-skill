# adhd — Gap

**Effort:** medium
**Gate:** every surface in the milestone has its `design` stage done.
**Output:** `project/milestones/m{{N}}/gap.md`.
**Sub-skill:** none.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate gap --milestone {{N}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports a surface is "not designed", HALT and tell the user to run
`{{command_prefix}}adhd design --milestone {{N}} --surface <name>` for it first.

## Procedure
1. **Determine the phase.** Read every milestone's `infra` field from
   `project/milestones.md`. The project is in **production phase** if milestone `{{N}}`
   or any earlier milestone has an `infra` other than `none`; otherwise it is in
   **prototype phase**.
2. **Prototype phase — trivial pass.** There is no production app yet. The prototype
   built by this milestone's `design`/`build` is the deliverable. Write a short
   `gap.md` recording: phase = prototype, no production app, gap = none. Done.
3. **Production phase — analyse the gap.** A production app exists (or is about to be
   stood up at the first production milestone). For each `ui` surface in milestone
   `{{N}}`:
   - Compare the **prototype app** against the **production app** — missing surfaces or
     states, data-shape differences (mock shape vs real shape), and any UX that has
     drifted between the two.
   - If real-backend reality contradicts the prototype, **update the prototype first**
     so it stays the current reference, then record what changed. The production UI is
     always moved to match the prototype, never the reverse.
   - Record the concrete delta the `build` stage must close for that surface.
   At the first production milestone the production app does not exist yet, so the gap
   is the whole prototype so far — the surfaces production must be stood up to reach.
4. **Write `m{{N}}/gap.md`.** One block per `ui` surface with its delta; `api`/`lib`
   surfaces have no prototype and are noted as not applicable.

## Output
`project/milestones/m{{N}}/gap.md` with:

- The phase (prototype or production) and why.
- Prototype phase: a note that there is no production app and the gap is none.
- Production phase: one block per `ui` surface — the concrete delta between the
  prototype and the production app that `build` must close, and any prototype updates
  made because reality contradicted it.

## On completion
1. Write the output file(s) above.
2. `node {{scripts_path}}/adhd-state.mjs set gap done --milestone {{N}}`
3. `node {{scripts_path}}/adhd-state.mjs session-add gap`
4. `node {{scripts_path}}/context-watch.mjs --next plan` — if it advises a fresh
   session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
5. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
6. Tell the user the next runnable stage is `plan` for the milestone's first surface.
