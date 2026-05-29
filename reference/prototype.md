# adhd — Prototype

**Effort:** high
**Gate:** the `foundation` stage is done — the firm tech baseline (frontend framework,
prototype topology) is logged in `docs/DECISIONS.md`.
**Output:** `project/map.md`, `docs/GLOSSARY.md`, `project/surfaces/<name>.md` (per
`ui` surface), the wired clickable whole-product prototype app, and `project/prototype.md`
(the sign-off, written last).
**Sub-skill:** `superpowers:brainstorming` + `impeccable`.

`prototype` front-loads the **whole product's UX** as one Hi-Fi, clickable, mock-data
app — built before any stories are written and before any milestone exists. It is how
the vision is translated into something the user and the team can see, click, and agree
on. It establishes *what* is being built and *how* it should behave, and it becomes the
shared **soft roadmap**: milestones are later carved out of a product already visible.

This stage **absorbs the old `map` stage** — it produces the sitemap/surface catalog as
its first step, then builds the prototype from it. It is **mock-data only**: no backend,
no real data, no data store. The clickable prototype is the persistent, always-current
UX reference and is never thrown away.

Scope it to the **critical and important** flow and rules — detailed enough to
communicate intent and order of implementation, not every pixel of every edge case.
Per-milestone detail is added later by `ux-refine`.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate prototype`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `foundation` is not done, HALT and tell the user to run
`adhd foundation` first.

## Procedure
1. **Author the sitemap (absorbs `map`).** Write `project/map.md`: a flat surface
   catalog listing every surface the product is expected to have — `ui`
   screens/workspaces, `api` contracts, `lib` modules. Give each surface a one-line
   purpose and its `kind` (`ui` | `api` | `lib`). Keep `ui` surfaces **workspace-sized**
   — a coherent screen or workspace demoed as one unit, not a sub-tab or a single action;
   finer detail is decomposed later into `features`, never into more surfaces (see
   SKILL.md, "Surfaces"). Do NOT group surfaces by milestone — there is no milestone plan
   yet; a milestone selects from this catalog at `milestone-brief` time.

   Record each surface's **production home** — the real repo it ships from. An
   `api`/`lib` surface takes it from its domain's `home`. A `ui` surface's production home
   is a frontend/microfront repo, which **may legitimately be undecided** — write `TBD`
   rather than guessing. A `ui` surface is **not** the prototype app: never write the
   prototype app (its repo, or a `prototype/`-style path) into a surface's production-home
   column — `audit` flags it. Name capabilities, never mechanisms — no stack, framework,
   database, or architecture in `map.md` (those live in `docs/DECISIONS.md`).
2. **Define domains and deployables (`multi` mode).** With the user, decompose the
   product into logical **domains** — each a named slice with a one-line description and
   an optional `home` (`repo` + `subpath`). Write them as a **Domains** table in
   `map.md`. Record the runnable/deployable units (backend services, frontend apps, the
   prototype app) and which domains each carries as a **Deployables** section. In
   `single` mode skip the domains table; still note the prototype and production apps as
   deployables. The prototype app is one deployable, never a surface's home.
3. **Sketch the domain glossary.** Identify the core product concepts and the
   relationships between them — each concept's name and what it represents in plain
   product terms. This is product vocabulary, NOT a data model: no field types, no
   persistence, no schema. Write it to `docs/GLOSSARY.md`. The data model
   (`docs/DATA.md`) is authored later, only when a milestone persists data.
4. **Design the whole-product UX flow.** Invoke `superpowers:brainstorming` to design
   how the `ui` surfaces connect into one coherent product flow — entry points,
   navigation, the journeys that span surfaces, and the rules that govern them. Write
   each `ui` surface's spec (flows, states, interactions) to
   `project/surfaces/<name>.md`. OVERRIDE the sub-skill output paths to that canonical
   target. For `api`/`lib` surfaces, capture behaviour/contract or responsibility/
   interface in the same `project/surfaces/<name>.md` — `impeccable` is not invoked for
   those.
5. **Build the `ui` surfaces Hi-Fi.** Invoke `impeccable` for each `ui` surface; build
   it Hi-Fi on mock data, matching the design system (`impeccable` reads `docs/PRODUCT.md`
   and `docs/DESIGN.md`). Resolve the prototype app location from `prototypeTopology` in
   `project/config.json` (see SKILL.md, "Prototype topology"): under `colocated` build at
   `/p/<path>`; under `standalone` build into the project-wide prototype app at
   `config.json`'s `prototype` pointer. Resolve any repo path via
   `node {{scripts_path}}/adhd-state.mjs workspace-list`; HALT if a needed repo is unbound.
6. **Wire the clickable whole-product prototype.** Assemble every `ui` surface into ONE
   runnable app — navigation, routing, shared mock state — clickable end to end. Use
   `impeccable craft` so the assembly matches the design system. Back `api`/`lib` surfaces
   with mock implementations where the `ui` needs them.
7. **Get sign-off.** Start the dev server, give the user the URL, and state what to click
   through — the whole-product journey and the critical flows/rules. Capture feedback
   verbatim. If they want changes, revise the surface and re-assemble; do not patch
   silently. Repeat until the user signs off.
8. **Write `project/prototype.md`** — what the prototype covers, the whole-product flow
   and rules it establishes, the user's sign-off, and every change request and how it was
   resolved. Write it LAST: its existence is the stage's done signal.
9. **Respect the commit gate.** The prototype app is code — never `git commit` it without
   the user's explicit "ok".

## Output
- `project/map.md` — the flat surface catalog (each surface: name, one-line purpose,
  `kind`, production home); in `multi` mode also a **Domains** section and a
  **Deployables** section. Cross-references `docs/GLOSSARY.md`. Stays capability-level.
- `docs/GLOSSARY.md` — the domain glossary: core concepts and relationships, plain
  product terms, no schema.
- `project/surfaces/<name>.md` — one project-wide spec per surface (UX/UI for `ui`;
  contract for `api`; responsibility + interface for `lib`).
- the whole product's `ui` surfaces built Hi-Fi into one wired, clickable prototype app,
  signed off — the persistent UX reference.
- `project/prototype.md` — validation and sign-off notes; the stage's done artifact.

## Re-running
`prototype` is **re-runnable**, like `stories`. Re-run it to evolve the *whole-product*
flow or rules as understanding deepens. Per-milestone detail upgrades that do NOT change
the whole-product flow are made by `ux-refine`, not here.

## On completion
1. Write the output file(s) above — the stage is done the moment `project/prototype.md`
   exists (with `project/map.md` and `docs/GLOSSARY.md` also present).
2. `node {{scripts_path}}/adhd-state.mjs session-add prototype`
3. `node {{scripts_path}}/context-watch.mjs --next stories` — if it advises a fresh
   session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
4. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
5. Tell the user the next runnable stage is `stories`.
