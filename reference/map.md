# adhd — Map

**Effort:** high
**Gate:** `project/milestones.md` exists — the Milestones stage is done.
**Output:** `project/map.md` and `docs/DOMAIN.md`.
**Sub-skill:** none.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate map`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `milestones` (or `project/milestones.md`) is missing, HALT and
tell the user to run `{{command_prefix}}adhd milestones` first.

## Procedure
1. **Structural inventory only.** Map produces a sitemap, not detailed UX. List every
   surface across all milestones — pages, screens, views, key flows — grouped by the
   milestone that introduces it. Give each surface a one-line purpose. Do not design
   layouts or interactions here; that is the per-surface Design stage's job.

   For each surface, also record its `kind` (`ui` | `api` | `lib`) and — in `multi`
   mode — the registered `repo` it will be built in. Persist both with
   `node {{scripts_path}}/adhd-state.mjs surface-meta <name> --milestone <N> --kind <kind>`
   (add `--repo <repo>` in `multi` mode). A repo's registered `kind` is a sensible
   default for surfaces in that repo; the surface's own `kind` is authoritative.
2. **Sketch the domain glossary.** Identify the core concepts the product is about and
   the relationships between them — each concept's name and what it represents in plain
   product terms. This is product vocabulary, NOT a data model: no field types, no
   persistence, no schema, no database. Write the glossary to `docs/DOMAIN.md`. The data
   model (`docs/DATA.md`) is a tech artifact created later, only when a milestone
   actually persists data — never here.
3. **Write `project/map.md`.** Record the sitemap and overall structure, grouped by
   milestone. Cross-reference `docs/DOMAIN.md` so the structural map and the domain
   glossary stay linked. Name capabilities, never mechanisms — no stack, framework,
   database, or architecture appears in `map.md`.

## Output
- `project/map.md` — a sitemap grouped by milestone. Each milestone heading lists its
  surfaces, and each surface has a one-line purpose. Includes a cross-reference to
  `docs/DOMAIN.md`.
- `docs/DOMAIN.md` — the domain glossary: the core product concepts and the
  relationships between them, in plain product terms. No field types, no schema, no
  persistence.

## On completion
1. Write the output file(s) above.
2. `node {{scripts_path}}/adhd-state.mjs set map done`
3. `node {{scripts_path}}/adhd-state.mjs session-add map`
4. `node {{scripts_path}}/context-watch.mjs --next surface-overview` — if it advises a
   fresh session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the
   prompt.
5. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
6. The front-load loop is now complete. Tell the user the next runnable stage is
   `surface-overview` for milestone 1.
