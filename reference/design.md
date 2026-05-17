# adhd — Design

**Effort:** high
**Gate:** the milestone's `milestone-ux` stage is done.
**Output:** `project/milestones/m{{N}}/surfaces/{{name}}.md` + the `ui` surface built
into the prototype app.
**Sub-skill:** by surface `kind` — see Procedure step 2.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate design --milestone {{N}} --surface {{name}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

The `design` gate is state-based: it requires the milestone's `milestone-ux` stage
status to be `done`. If the gate reports `milestone-ux` is not done, HALT and tell the
user to run `{{command_prefix}}adhd milestone-ux --milestone {{N}}` first.

## Procedure
1. **Pick the surface to design.** Choose one surface from the milestone's revised
   surface plan in `m{{N}}/overview.md`. Every per-surface state command takes
   `--surface {{name}}`; when it runs, `adhd-state.mjs` records that surface as
   `currentSurface` in `state.json`, so `status` and later commands track the active
   surface through the rest of the per-surface loop.
2. **Determine the surface kind.** Read the surface's `kind` with
   `node {{scripts_path}}/adhd-state.mjs surface-meta {{name}} --milestone {{N}}`.
   It is `ui`, `api`, or `lib` (assigned at `map` / `surface-overview`). The kind
   selects the rest of this procedure:
   - **`ui`** — run brainstorming for UX, then `impeccable` for UI (steps 3–4).
   - **`api`** — run `superpowers:brainstorming` for the API's behavior and
     contract semantics (endpoints, request/response shape, error codes,
     idempotency, auth), then design the API contract (protobuf, OpenAPI, or
     similar). Do NOT invoke `impeccable`. The surface spec gets API-contract,
     behavior, and error-semantics sections in place of the UX/UI sections.
   - **`lib`** — run `superpowers:brainstorming` for the module's responsibility
     and public interface, then write the spec. Do NOT invoke `impeccable` and do
     not design a wire contract.
   For `api` and `lib` surfaces, skip the `impeccable` step (step 4); everything
   else in this procedure (output path, surface security/errors, completion) is
   unchanged.
3. **Brainstorm the UX.** Run `superpowers:brainstorming` for the surface's user
   experience — the flows, states, and interactions a user moves through. OVERRIDE its
   default output path: `brainstorming` defaults its spec to `docs/superpowers/specs/`,
   but this skill needs it at the canonical target
   `project/milestones/m{{N}}/surfaces/{{name}}.md`. Pass that path when invoking the
   sub-skill; do not let it write to `docs/superpowers/specs/`.
4. **Design the UI.** Run `impeccable` for the surface's user interface. Have it read
   `docs/PRODUCT.md` and `docs/DESIGN.md` so the surface's layout, components, and
   visual language stay consistent with the product vision and the design system.
5. **Enumerate surface security and error cases.** Write the surface-specific,
   less-critical security and error cases into the spec — field validation, empty
   states, error states, and edge inputs. The milestone-level must-haves were already
   set in `milestone-ux`; this stage catches the rest. Nothing reaches Build undefined.
6. **Consolidate the spec.** Merge the UX/UI (or API-contract) work and the
   security/error cases into a single coherent spec at `surfaces/{{name}}.md`.
7. **Build the `ui` surface into the prototype app.** For a `ui` surface, once the spec
   is consolidated, build this surface into the persistent **prototype app** on mock
   data — hi-fi, matching the design system via `impeccable`. This runs for every
   milestone, regardless of `infra`. The milestone-wide `prototype` stage then wires
   every designed surface into one clickable app for the user to validate. `api` and
   `lib` surfaces have no prototype — their spec is this stage's deliverable.

## Output
`project/milestones/m{{N}}/surfaces/{{name}}.md` with three sections:

- A **UX spec** section — the flows, states, and interactions for the surface, from the
  `brainstorming` work.
- A **UI spec** section — the layout, components, and visual language for the surface,
  from the `impeccable` work and consistent with `docs/PRODUCT.md` and `docs/DESIGN.md`.
- A **Surface security & errors** section — field validation, empty and error states,
  and edge inputs for this surface.

For an `api` surface the spec has API-contract, behavior, and error-semantics
sections instead of UX/UI. For a `lib` surface it has a responsibility and
public-interface spec. The **Surface security & errors** section is written for all
kinds.

A `ui` surface is also built into the prototype app on mock data (Procedure step 7).

## On completion
1. Write the output file(s) above.
2. `node {{scripts_path}}/adhd-state.mjs set design done --milestone {{N}} --surface {{name}}`
3. `node {{scripts_path}}/adhd-state.mjs session-add design`
4. `node {{scripts_path}}/context-watch.mjs --next <stage>` — pass the actual next
   stage: `--next design` when another surface still needs designing, or
   `--next prototype` when this was the last surface. If it advises a fresh session,
   run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
5. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
6. Tell the user the next runnable stage: `design` for the next surface of the
   milestone, or `prototype` once every surface in the milestone is designed.
