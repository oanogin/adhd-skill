# adhd — Map

**Effort:** high
**Gate:** the `foundation` stage is done.
**Output:** `project/map.md` and `docs/GLOSSARY.md`.
**Sub-skill:** none.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate map`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `foundation` is not done, HALT and tell the user to run
`adhd foundation` first.

## Procedure
1. **Structural inventory only.** Map produces a sitemap, not detailed UX and not a
   roadmap. List every surface the product is expected to have — `ui`
   screens/workspaces, `api` contracts, `lib` modules — as a flat catalog in `map.md`.
   Give each surface a one-line purpose and its `kind` (`ui` | `api` | `lib`). Keep `ui`
   surfaces **workspace-sized** — a coherent screen or workspace demoed as one unit, not
   a sub-tab or a single action; finer detail is decomposed later into `features`, never
   into more surfaces (see SKILL.md, "Surfaces"). Do NOT group surfaces by milestone:
   there is no milestone plan yet. A milestone selects from this catalog at
   `milestone-brief` time.

   Record each surface's **production home** — the real repo it ships from. An
   `api`/`lib` surface takes it from its domain's `home`. A `ui` surface's production
   home is a frontend/microfront repo, which **may legitimately be undecided** at this
   stage — write `TBD` rather than guessing. A `ui` surface is **not** the prototype
   app: every `ui` surface also has a presence in the single project-wide prototype app,
   but the prototype is built by `design` and is never a surface's production home.
   Never write the prototype app (its repo, or a `prototype/`-style path) into a
   surface's production-home column — `audit` flags it.
2. **Define domains (`multi` mode only).** With the user, decompose the product into
   logical domains — each a named slice with a one-line description and an optional
   `home` (`repo` + `subpath`) for its backend code. Write them as a **Domains** table
   in `map.md`. In `single` mode skip this step.
3. **List deployables.** Record the runnable/deployable units the product ships —
   backend services, frontend apps, the prototype app — and which domains each carries,
   as a **Deployables** section in `map.md`. This is a structural map, not a deployment
   spec.
4. **Sketch the domain glossary.** Identify the core product concepts and the
   relationships between them — each concept's name and what it represents in plain
   product terms. This is product vocabulary, NOT a data model: no field types, no
   persistence, no schema. Write it to `docs/GLOSSARY.md`. The data model
   (`docs/DATA.md`) is a tech artifact authored later, only when a milestone persists
   data.
5. **Write `project/map.md`.** Record the surface catalog, the domains, and the
   deployables. Cross-reference `docs/GLOSSARY.md`. Name capabilities, never mechanisms —
   no stack, framework, database, or architecture in `map.md` (those live in
   `docs/DECISIONS.md`).

## Output
- `project/map.md` — a flat surface catalog (each surface: name, one-line purpose,
  `kind`, production home); in `multi` mode also a **Domains** section (name,
  description, `home`) and a **Deployables** section (each deployable and the domains it
  carries; the prototype app is one of the deployables). Cross-references
  `docs/GLOSSARY.md`. A surface's production home is the repo it ships from — a `ui`
  surface's may be `TBD`. The prototype app is listed once among the deployables, not
  as any surface's home; its location is the project-wide prototype pointer in
  `config.json` (set via `workspace`).
- `docs/GLOSSARY.md` — the domain glossary: core product concepts and their
  relationships, in plain product terms. No field types, no schema, no persistence.

`map.md` is the source of truth for the surface catalog and the domains — they are
authored here as plain markdown, not recorded anywhere else.

## On completion
1. Write the output file(s) above — the stage is done once `project/map.md` and
   `docs/GLOSSARY.md` both exist.
2. `node {{scripts_path}}/adhd-state.mjs session-add map`
3. `node {{scripts_path}}/context-watch.mjs --next milestone-brief` — if it advises a
   fresh session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
4. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
5. The groundwork is complete. Tell the user the next runnable stage is
   `milestone-brief` for milestone 1.
