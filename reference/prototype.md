# adhd — Prototype

**Effort:** medium
**Gate:** every surface in the milestone has its `design` stage done.
**Output:** a runnable, clickable prototype app + `project/milestones/m{{N}}/prototype.md`.
**Sub-skill:** `impeccable craft`.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate prototype --milestone {{N}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports a surface is "not designed", HALT and tell the user to run
`{{command_prefix}}adhd design --milestone {{N}} --surface <name>` for it first.

## What this stage is

The clickable UX checkpoint. Every `ui` surface of the milestone was already built
into the **prototype app** on mock data by its `design` stage. This stage wires them
into one coherent, runnable app the user can open in a browser and click through —
**before** any backend, data store, or `tracer` decision. It is decoupled from
`infra`: every milestone runs it, prototype-only and production milestones alike.

## Procedure
0. **UI-less milestone — trivial pass.** If the milestone has no `ui` surfaces (every
   surface is `api` or `lib`), there is nothing clickable to assemble. Write a short
   `m{{N}}/prototype.md` recording "no `ui` surfaces — no clickable prototype for this
   milestone", mark the stage done, and proceed to `tracer`. Skip steps 1–5.
1. **Assemble the milestone.** Wire the milestone's designed `ui` surfaces into one
   runnable prototype app — navigation, routing, and the shared mock state that moves
   between surfaces — so the whole milestone is clickable end to end. Use
   `impeccable craft` so the assembly matches the design system. `api` and `lib`
   surfaces have no prototype; back them with mock implementations where the `ui`
   needs them.
2. **Run it.** Start the dev server and give the user the URL. State plainly what to
   click through — the milestone's surfaces and the journey from `m{{N}}/ux.md`.
3. **Get sign-off.** Wait for the user to click through and validate the UX. Capture
   their feedback verbatim. If they want changes, do NOT patch silently: note the
   surface and the change, run `{{command_prefix}}adhd design --milestone {{N}}
   --surface <name>` to revise it, then re-assemble and re-run this stage.
4. **Respect the commit gate.** The prototype app is code — do not `git commit` it
   without the user's explicit "ok".
5. **Write `m{{N}}/prototype.md`.** Record what was validated, the user's sign-off,
   and any change requests and how they were resolved.

## Output
- A runnable, clickable prototype app for milestone `{{N}}` on mock data — the
  persistent, always-current UX reference.
- `project/milestones/m{{N}}/prototype.md` — what was validated, the user's sign-off,
  and the change requests resolved this stage.

## On completion
1. Write the output file(s) above.
2. `node {{scripts_path}}/adhd-state.mjs set prototype done --milestone {{N}}`
3. `node {{scripts_path}}/adhd-state.mjs session-add prototype`
4. `node {{scripts_path}}/context-watch.mjs --next <stage>` — pass `--next tracer` for
   a production-track milestone, or `--next review` for a prototype-only milestone. If
   it advises a fresh session, run `node {{scripts_path}}/handoff-prompt.mjs` and give
   the user the prompt.
5. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
6. Tell the user the next runnable stage: `tracer` for a production-track milestone,
   or `review` for a prototype-only milestone.
