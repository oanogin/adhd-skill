# adhd — Design

**Effort:** high
**Gate:** the milestone's `milestone-brief` stage is done.
**Output:** `m{{N}}/surfaces/<name>.md` (per surface), `m{{N}}/design.md`, and the
milestone built into the prototype app.
**Sub-skill:** `superpowers:brainstorming` + `impeccable`.

`design` covers the whole milestone's UX in one stage — every surface designed, then
wired into one clickable prototype and signed off. It merges what used to be the
per-surface `design` loop and the milestone `prototype` stage. It is **mock-data only**:
no backend, no real data, no data store. The clickable prototype is the cross-surface
coherence proof and the persistent, always-current UX reference.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate design --milestone {{N}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `milestone-brief` is not done, HALT and tell the user to run
`{{command_prefix}}adhd milestone-brief --milestone {{N}}` first.

## Procedure
1. **Design each surface.** For every surface listed in `m{{N}}/brief.md`, route by its
   `kind` (read it from the brief's surface list):
   - **`ui`** — `superpowers:brainstorming` for the UX (flows, states, interactions),
     then `impeccable` for the UI (layout, components, visual language). Have
     `impeccable` read `docs/PRODUCT.md` and `docs/DESIGN.md`.
   - **`api`** — `brainstorming` for behaviour and contract semantics, then design the
     API contract (protobuf, OpenAPI, or similar). `impeccable` is not invoked.
   - **`lib`** — `brainstorming` for responsibility and public interface, then a spec.
   Write each surface spec to `project/milestones/m{{N}}/surfaces/<name>.md`. OVERRIDE
   the sub-skill output paths to that canonical target. Include the surface's
   security and error cases — field validation, empty/error states, edge inputs.
2. **Build the `ui` surfaces into the prototype app.** Build each `ui` surface hi-fi on
   mock data, matching the design system via `impeccable`. Resolve the prototype app
   location from `prototypeTopology` in `project/config.json` (see SKILL.md, "Prototype
   topology"): under `colocated` build at `/p/<path>`; under `standalone` build into the
   project-wide prototype app at `config.json`'s `prototype` pointer. Resolve any repo
   path via `node {{scripts_path}}/adhd-state.mjs workspace-list`; HALT if a needed repo
   is unbound.
3. **Wire the clickable prototype.** Assemble the milestone's `ui` surfaces into one
   runnable app — navigation, routing, shared mock state — clickable end to end. Use
   `impeccable craft` so the assembly matches the design system. Back `api`/`lib`
   surfaces with mock implementations where the `ui` needs them.
4. **Get sign-off.** Start the dev server, give the user the URL, and state what to
   click through — the milestone's surfaces and the journey. Capture feedback verbatim.
   If they want changes, revise the surface and re-assemble; do not patch silently.
   Repeat until the user signs off.
5. **Write `m{{N}}/design.md`** — what was validated, the user's sign-off, and every
   change request and how it was resolved.
6. **Respect the commit gate.** The prototype app is code — never `git commit` it
   without the user's explicit "ok".

## Output
- `project/milestones/m{{N}}/surfaces/<name>.md` — one spec per surface (UX/UI for
  `ui`; API-contract for `api`; responsibility + interface for `lib`; security/errors
  for all).
- the milestone's `ui` surfaces built into the prototype app, wired clickable and
  signed off — the persistent UX reference.
- `project/milestones/m{{N}}/design.md` — validation and sign-off notes.

## On completion
1. Write the output file(s) above — the stage is done the moment `m{{N}}/design.md`
   exists.
2. `node {{scripts_path}}/adhd-state.mjs session-add design`
3. `node {{scripts_path}}/context-watch.mjs --next <stage>` — `--next tracer` for a
   production-track milestone, `--next review` for a prototype-only one. If it advises a
   fresh session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
4. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
5. Tell the user the next runnable stage: `tracer` for a production-track milestone, or
   `review` for a prototype-only milestone.
