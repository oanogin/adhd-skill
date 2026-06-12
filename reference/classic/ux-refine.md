# adhd — UX Refine

**Effort:** high
**Gate:** the milestone's `milestone-brief` stage is done.
**Output:** refined `m{{N}}/surfaces/<name>.md` (per surface) and `m{{N}}/ux-refine.md`,
with the milestone's slice of the prototype app upgraded.
**Sub-skill:** `impeccable` (+ `superpowers:brainstorming` only for genuinely new
milestone-specific flows).

The whole-product clickable prototype already exists — it was built and signed off in
the groundwork `prototype` stage. `ux-refine` **refines only THIS milestone's slice** of
it: deeper UI, milestone-specific states, edge cases, and error handling on the surfaces
this milestone touches. It is **mock-data only**, like the prototype it refines.

**Hard rule — do not change the whole-product flow or rules here.** `ux-refine` adds
depth to a milestone's surfaces; it never rewires the product's overall flow, navigation
model, or governing rules. If a milestone reveals that the whole-product flow itself is
wrong, STOP and run `adhd evolve` to evolve it — then return here.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate ux-refine --milestone {{N}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `milestone-brief` is not done, HALT and tell the user to run
`adhd milestone-brief --milestone {{N}}` first.

## Procedure
1. **Start working memory + seed the gate.** This high-effort stage may span sessions.
   Create `project/work/m{{N}}-ux-refine.md` with `## Gate` + `## Left to do` + `## Log`
   and append as you work — see SKILL.md, "Working memory". Seed `## Gate` with
   `requirements-confirmed` plus one line per surface you refine; clarify with the user and
   check each with their verbatim ok, then
   `node {{scripts_path}}/adhd-state.mjs work-gate ux-refine --milestone {{N}}` must pass
   before you write this stage's output artifact (and per surface before you build it).
2. **Refine each surface in the milestone.** For every surface listed in
   `m{{N}}/brief.md`, start from its project-wide spec in `project/surfaces/<name>.md` and
   the existing prototype, then deepen it for this milestone. Route by `kind`:
   - **`ui`** — `impeccable` for the UI detail (layout, components, visual language,
     states). Use `superpowers:brainstorming` only when the milestone introduces a
     genuinely new milestone-specific interaction not yet covered by the whole-product
     flow. Have `impeccable` read `docs/PRODUCT.md` and `docs/DESIGN.md`.
   - **`api`** — refine the contract semantics for this milestone's needs. `impeccable`
     is not invoked.
   - **`lib`** — refine the responsibility/interface for this milestone. Spec only.
   Write each refined spec to `project/milestones/m{{N}}/surfaces/<name>.md`. OVERRIDE the
   sub-skill output paths to that canonical target. Include this milestone's security and
   error cases — field validation, empty/error states, edge inputs.
3. **Upgrade the milestone's slice of the prototype.** Update the `ui` surfaces this
   milestone touches in the existing prototype app — deeper Hi-Fi detail on mock data,
   matching the design system via `impeccable`. Resolve the prototype app location from
   `prototypeTopology` in `project/config.json` (see SKILL.md, "Prototype topology");
   resolve any repo path via `node {{scripts_path}}/adhd-state.mjs workspace-list`; HALT
   if a needed repo is unbound. Do not touch surfaces outside this milestone, and do not
   alter the whole-product flow/navigation.
4. **Get sign-off.** Start the dev server, give the user the URL, and state what to click
   through — this milestone's refined surfaces. Capture feedback verbatim. If they want
   changes, revise and re-assemble; do not patch silently. Repeat until the user signs off.
5. **Write `m{{N}}/ux-refine.md`** — what was refined, the user's sign-off, and every
   change request and how it was resolved.
6. **Respect the commit gate.** The prototype app is code — never `git commit` it without
   the user's explicit "ok".

## Output
- `project/milestones/m{{N}}/surfaces/<name>.md` — one refined spec per surface (UX/UI
  for `ui`; contract for `api`; responsibility + interface for `lib`; security/errors for
  all).
- the milestone's `ui` surfaces upgraded in the prototype app, signed off.
- `project/milestones/m{{N}}/ux-refine.md` — validation and sign-off notes.

## On completion
1. Write the output file(s) above — the stage is done the moment `m{{N}}/ux-refine.md`
   exists.
2. If the session is getting long, start a fresh one: run
   `node {{scripts_path}}/handoff-prompt.mjs` and give the user the resume prompt.
3. Drain `project/work/m{{N}}-ux-refine.md`: migrate durable facts to their canonical home,
   then delete the work file.
4. Tell the user the next runnable stage: `tracer` for a production-track milestone, or
   `review` for a prototype-only milestone.
