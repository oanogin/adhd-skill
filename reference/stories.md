# adhd — Stories

**Effort:** medium
**Gate:** the `concepts` stage is done — `docs/CONCEPTS.md` exists.
**Output:** `project/stories.md`.
**Sub-skill:** `superpowers:brainstorming`.

`stories` is a **living stage**. It seeds the backlog once — **derived from
`concepts`** — turning actors, entity lifecycles, and governing rules into one
`actor + action + outcome` story per capability — and is re-run any time the product
grows or changes (adding, rewording, re-sizing, or removing stories). It is not a
one-shot front-load step: the story backlog evolves across the whole product lifecycle.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate stories`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `concepts` (`docs/CONCEPTS.md`) is missing, HALT and tell the
user to run `adhd concepts` first.

## Procedure
1. **Derive stories from concepts.** With `superpowers:brainstorming`, walk
   `docs/CONCEPTS.md` — its actors, entity lifecycles, and governing rules — with the
   user. For each capability the concepts imply, capture one product-level user story:
   actor + action + outcome. A story may span domains and repos; it is not scoped to one.
   Capture breadth freely now so ideas do not leak into a running milestone later as
   scope creep.
2. **Record each story** with: a stable short ID, the story text (actor + action +
   outcome), its business value, its dependencies (other stories, by ID), and a rough
   size estimate.
3. **Write or amend `project/stories.md`** as a table with the columns
   `ID | Story | Value | Depends on | Size | Surfaces`.
   - `ID` — a stable short key (`S1`, `S2`, ... or a mnemonic like `LEGAL-ENTITY`). It
     is the story's permanent handle and survives any later rewording.
   - `Depends on` — references other stories **by ID**, never by retyping their text.
   - `Surfaces` — comma-separated surface names that realize the story. FILLED BY THE
     `prototype` STAGE; left empty here on first authoring. Empty = "not prototyped yet";
     a story with empty `Surfaces` CANNOT be selected at `milestone-brief`. It is the
     single source of truth for the story↔surface link; `project/map.md` carries no
     story back-references.
   - There is **no milestone column.** A story is not pre-assigned to a milestone — it
     is picked into one at `milestone-brief` time. The backlog is the only
     forward-looking list; `adhd` keeps no separate roadmap.
4. **Re-running.** When `stories` is run again later, amend the table in place. Keep
   IDs stable. A new feature idea raised mid-project is filed here and picked up by a
   future `milestone-brief` — never bolted onto the milestone in flight.

## Output
`project/stories.md` containing:

- A table `ID | Story | Value | Depends on | Size | Surfaces`, one row per envisioned story.
- An "Open questions" section in free text — unresolved scope, fuzzy stories, and
  decisions deferred to a later `milestone-brief`.

## On completion
1. Write the output file — the stage is done the moment `project/stories.md` exists.
   `stories` is re-runnable: simply edit the file again to amend the backlog.
2. If the session is getting long, start a fresh one: run
   `node {{scripts_path}}/handoff-prompt.mjs` and give the user the resume prompt.
3. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
4. On the first run, the groundwork is complete — tell the user the next runnable stage
   is `prototype`. On a mid-project amend, point them back to the per-milestone stage
   they were in.
