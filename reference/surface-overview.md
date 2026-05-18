# adhd — Surface Overview

**Effort:** medium
**Gate:** `project/map.md` and `docs/GLOSSARY.md` exist — the Map stage is done.
**Output:** `project/milestones/m{{N}}/overview.md`.
**Sub-skill:** none.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate surface-overview --milestone {{N}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `project/map.md` or `docs/GLOSSARY.md` is missing, HALT and tell the
user to run `{{command_prefix}}adhd map` first.

## Procedure
1. **Helicopter view of the current milestone.** Take milestone `{{N}}` from
   `project/milestones.md` and `project/map.md`. List every surface it introduces —
   pages, screens, views, key flows. For each surface give a rough purpose and the
   content it holds. Keep the detail low: this document must stay easy to read whole
   in one pass. Detailed layout and interaction are the per-surface Design stage's job,
   not this one.

   Tag each surface with its `kind` (`ui` | `api` | `lib`). In `multi` mode, confirm
   or refine the surface's `domains` and physical location (`repo` + optional
   `subpath`) with
   `node {{scripts_path}}/adhd-state.mjs surface-meta <name> --milestone {{N}} --domain <d1,d2> --kind <kind> [--repo <r>] [--subpath <p>]`.
   If `map` already tagged the surface, confirm the tags still fit and correct them
   if not.
2. **Note cross-surface relationships.** Describe how the milestone's surfaces connect:
   which surface leads to which, the shared state that moves between them, and the
   rough user journey a real user takes through the milestone end to end.
3. **Record the milestone track.** Read this milestone's `infra` need from
   `project/milestones.md`. If `infra` is `none`, the milestone is **prototype-only** —
   its deliverable is the clickable prototype, and it ends at `prototype → review`. If
   `infra` names any real capability (persistence, auth, ...), the milestone is
   **production-track** — it also runs `tracer → replan → gap → plan → build`. Persist
   the track with `node {{scripts_path}}/adhd-state.mjs milestone-track <prototype|production>
   --milestone {{N}}`. Do NOT choose any mechanism here — the data store and other tech
   decisions are made later, at `tracer`.
4. **Write the overview.** Create the milestone folder `project/milestones/m{{N}}/` if
   it does not already exist, then write `overview.md` inside it.

## Output
`project/milestones/m{{N}}/overview.md` with:

- One block per surface in the milestone, each containing the surface name, its rough
  purpose, and the rough content it holds.
- A journey sketch — the rough path a user takes through the milestone's surfaces,
  noting the cross-surface relationships and shared state between them.

## On completion
1. Write the output file(s) above.
2. `node {{scripts_path}}/adhd-state.mjs set surface-overview done --milestone {{N}}`
3. `node {{scripts_path}}/adhd-state.mjs session-add surface-overview`
4. `node {{scripts_path}}/context-watch.mjs --next milestone-ux` — if it advises a fresh
   session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
5. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
6. Tell the user the next runnable stage is `milestone-ux` for milestone {{N}}.
