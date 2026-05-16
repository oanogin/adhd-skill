# adhd — Design

**Effort:** high
**Gate:** the milestone's `replan` stage is done.
**Output:** `project/milestones/m{{N}}/surfaces/{{name}}.md`.
**Sub-skill:** `superpowers:brainstorming`, then `impeccable`.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate design --milestone {{N}} --surface {{name}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

The `design` gate is state-based: it requires the milestone's `replan` stage status to
be `done`. If the gate reports `replan` is not done, HALT and tell the user to run
`{{command_prefix}}adhd replan --milestone {{N}}` first.

## Procedure
1. **Pick the surface to design.** Choose one surface from the milestone's revised
   surface plan in `m{{N}}/overview.md`. Every per-surface state command takes
   `--surface {{name}}`; when it runs, `adhd-state.mjs` records that surface as
   `currentSurface` in `state.json`, so `status` and later commands track the active
   surface through the rest of the per-surface loop.
2. **Brainstorm the UX.** Run `superpowers:brainstorming` for the surface's user
   experience — the flows, states, and interactions a user moves through. OVERRIDE its
   default output path: `brainstorming` defaults its spec to `docs/superpowers/specs/`,
   but this skill needs it at the canonical target
   `project/milestones/m{{N}}/surfaces/{{name}}.md`. Pass that path when invoking the
   sub-skill; do not let it write to `docs/superpowers/specs/`.
3. **Design the UI.** Run `impeccable` for the surface's user interface. Have it read
   `docs/PRODUCT.md` and `docs/DESIGN.md` so the surface's layout, components, and
   visual language stay consistent with the product vision and the design system.
4. **Enumerate surface security and error cases.** Write the surface-specific,
   less-critical security and error cases into the spec — field validation, empty
   states, error states, and edge inputs. The milestone-level must-haves were already
   set in `milestone-ux`; this stage catches the rest. Nothing reaches Build undefined.
5. **Consolidate the spec.** Merge the UX and UI work and the security/error cases into
   a single coherent spec at `surfaces/{{name}}.md`.

## Output
`project/milestones/m{{N}}/surfaces/{{name}}.md` with three sections:

- A **UX spec** section — the flows, states, and interactions for the surface, from the
  `brainstorming` work.
- A **UI spec** section — the layout, components, and visual language for the surface,
  from the `impeccable` work and consistent with `docs/PRODUCT.md` and `docs/DESIGN.md`.
- A **Surface security & errors** section — field validation, empty and error states,
  and edge inputs for this surface.

## On completion
1. Write the output file(s) above.
2. `node {{scripts_path}}/adhd-state.mjs set design done --milestone {{N}} --surface {{name}}`
3. `node {{scripts_path}}/adhd-state.mjs session-add design`
4. `node {{scripts_path}}/context-watch.mjs --next plan` — if it advises a fresh
   session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
5. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
6. Tell the user the next runnable stage is `plan` for this surface.
