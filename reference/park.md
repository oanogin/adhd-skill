# adhd — park (management command)

**Effort:** low
**Purpose:** capture a not-yet-actionable idea or detail into the durable parking lot,
`project/parking.md`, after clarifying it with the user.
**Not a stage:** no gate. Run it anytime, in any project state.

## What this command is

`park` is the one sanctioned way the agent writes to `project/parking.md`. Everywhere
else the user owns that file and edits it directly; `park` exists so a half-formed idea
can be sharpened into a clear, self-contained entry before it is stored. It **captures
only** — it never implements, never writes a spec, and never proceeds to `writing-plans`.

`project/parking.md` is durable and committed. It is also the project's **idea
backlog**: a new idea that is not yet actionable is parked here (an actionable one
goes through `adhd evolve` as a flow). An item lives there precisely because it
is not yet implemented; when it is implemented, the user removes it. There is no status
field and no structure imposed by `adhd` — long prose, mermaid diagrams, and code
sketches are all fine.

## Procedure

1. **Clarify with `superpowers:brainstorming`.** Run its full clarifying dialogue with
   **no cap on the number of questions** — draw out intent, scope, constraints, and any
   sketch the user has in mind. Run only the clarifying portion: do NOT continue to a
   design document or to `writing-plans`. The goal is a clear, self-contained entry, not
   a design.
2. **Append the entry to `project/parking.md`.** Create the file with a single
   `# Parking lot` heading first if it does not exist. Write the clarified item as a
   self-contained block under that heading, in whatever form fits it best (prose,
   list, mermaid, code). Make it understandable cold, months later, with no session
   context. Example entry:

   ```markdown
   ## Bulk import from spreadsheet
   Users with an existing inventory want a one-time import instead of manual entry.
   Needs: column-mapping step, duplicate handling (merge vs skip — user undecided),
   and a dry-run preview. Blocked on: the item model gaining stable external ids.
   ```
3. **Confirm and stop.** Show the user the entry as written. `park` is done the moment
   the entry is in `project/parking.md`. Do not implement anything; do not commit without
   the user's explicit "ok".

## Output

A new entry in `project/parking.md`. Nothing else.

## On completion

1. The entry exists in `project/parking.md` — the command is done.
2. Tell the user the item is parked and that any stage or feature will surface
   `parking.md` at its gate-check.
