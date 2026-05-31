# adhd — Stories

**Effort:** medium
**Gate:** `project/prototype.md` exists — the Prototype stage is done (the whole-product
clickable prototype is signed off, and `project/map.md` exists).
**Output:** `project/stories.md`.
**Sub-skill:** none.

`stories` is a **living stage**. It seeds the backlog once — **derived from the
signed-off whole-product prototype** and the behaviours clarified while building it — and
is re-run any time the product grows or changes (adding, rewording, re-sizing, or
removing stories). It is not a one-shot front-load step: the story backlog evolves across
the whole product lifecycle.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate stories`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `prototype` (or `project/prototype.md` / `project/map.md`) is
missing, HALT and tell the user to run `adhd prototype` first.

## Procedure
1. **Derive stories from the prototype.** Walk the signed-off whole-product prototype —
   its surfaces, flows, and rules — with the user, and capture each as a product-level
   user story: actor + action + outcome. Because the prototype already shows the full,
   ambitious "spaceship", this is mostly *reading off* the stories the prototype implies,
   plus any the user adds. A story may span domains and repos; it is not scoped to one.
   Capture breadth freely now so ideas do not leak into a running milestone later as
   scope creep.
2. **Record each story** with: a stable short ID, the story text (actor + action +
   outcome), its business value, its dependencies (other stories, by ID), and a rough
   size estimate.
3. **Write or amend `project/stories.md`** as a table with the columns
   `ID | Story | Value | Depends on | Size`.
   - `ID` — a stable short key (`S1`, `S2`, ... or a mnemonic like `LEGAL-ENTITY`). It
     is the story's permanent handle and survives any later rewording.
   - `Depends on` — references other stories **by ID**, never by retyping their text.
   - There is **no milestone column.** A story is not pre-assigned to a milestone — it
     is picked into one at `milestone-brief` time. The backlog is the only
     forward-looking list; `adhd` keeps no separate roadmap.
4. **Re-running.** When `stories` is run again later, amend the table in place. Keep
   IDs stable. A new feature idea raised mid-project is filed here and picked up by a
   future `milestone-brief` — never bolted onto the milestone in flight.

## Output
`project/stories.md` containing:

- A table `ID | Story | Value | Depends on | Size`, one row per envisioned story.
- An "Open questions" section in free text — unresolved scope, fuzzy stories, and
  decisions deferred to a later `milestone-brief`.

## On completion
1. Write the output file — the stage is done the moment `project/stories.md` exists.
   `stories` is re-runnable: simply edit the file again to amend the backlog.
2. `node {{scripts_path}}/adhd-state.mjs session-add stories`
3. `node {{scripts_path}}/context-watch.mjs --next milestone-brief` — if it advises a
   fresh session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
4. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
5. On the first run, the groundwork is complete — tell the user the next runnable stage
   is `milestone-brief` for milestone 1. On a mid-project amend, point them back to the
   per-milestone stage they were in.
