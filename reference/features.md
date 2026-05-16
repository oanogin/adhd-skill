# adhd — Features

**Effort:** medium
**Gate:** `docs/PRODUCT.md` exists — the Vision stage is done.
**Output:** `project/features.md`.
**Sub-skill:** none.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate features`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `vision` (or `docs/PRODUCT.md`) is missing, HALT and tell the user
to run `{{command_prefix}}adhd vision` first.

## Procedure
1. **Brain-dump every envisioned feature** with the user. This is the right and only
   home for the ambitious, full "spaceship" feature set — capture all of it here.
   Encourage breadth: list features freely now so they do not leak into milestones
   later as scope creep. Nothing is too big or too speculative for this list.
2. **Record each feature** with: a name, its business value (what it does for the
   user or the business), its dependencies (other features it needs in place first),
   and a rough size estimate.
3. **Write `project/features.md`** as a table with the columns
   `Feature | Value | Depends on | Size | Candidate milestone`. Leave the
   `Candidate milestone` column blank for every row — the Milestones stage fills it in.

## Output
`project/features.md` containing:

- A table with columns `Feature | Value | Depends on | Size | Candidate milestone`,
  one row per envisioned feature. The `Candidate milestone` column is left blank.
- An "Open questions" section in free text — unresolved feature questions, fuzzy
  scope, and decisions deferred to the Milestones stage.

## On completion
1. Write the output file(s) above.
2. `node {{scripts_path}}/adhd-state.mjs set features done`
3. `node {{scripts_path}}/adhd-state.mjs session-add features`
4. `node {{scripts_path}}/context-watch.mjs --next milestones` — if it advises a fresh
   session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
5. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
6. Tell the user the next runnable stage is `milestones`.
