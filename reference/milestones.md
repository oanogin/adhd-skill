# adhd — Milestones

**Effort:** high
**Gate:** `project/features.md` exists — the Features stage is done.
**Output:** `project/milestones.md`.
**Sub-skill:** none.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate milestones`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `features` (or `project/features.md`) is missing, HALT and tell
the user to run `{{command_prefix}}adhd features` first.

## Procedure
1. **Group features into milestones**, respecting the dependencies recorded in
   `project/features.md` — a feature cannot land in a milestone before the features
   it depends on.
2. **Define Milestone 1** as the first genuinely valuable, shippable product that
   covers the target users' core needs. It is not a tech demo and not the whole
   spaceship — it is the smallest thing real users would actually find worth using.
   Every later milestone is the parking lot: ambitious features wait there in order.
3. **Record each milestone** with: an id, a title, the features it includes, the user
   value it unlocks, the rationale for its ordering, and its `infra` need — the
   capabilities it newly requires, in capability terms only ("none — mock data",
   "persistence", "auth", "realtime"). Never name a mechanism here. A milestone with
   `infra: none` is a valid, fully-working UX prototype — it needs no data model and no
   database, and ends at the clickable `prototype` stage. Defer every infra capability
   you can: the later a milestone introduces one, the later its mechanism must be chosen.
   The `infra` field sets each milestone's **track**: `infra: none` → a prototype-only
   milestone (`surface-overview → milestone-ux → design → prototype → review`); any real
   `infra` → a production-track milestone, which also runs `tracer → replan → gap →
   plan → build` (see SKILL.md, "Prototype and production apps").
4. **Back-fill `project/features.md`.** Fill the previously blank `Candidate milestone`
   column so every feature is assigned to the milestone it now belongs to.

## Output
`project/milestones.md` with one block per milestone, each containing:

- `id` — the milestone identifier (Milestone 1, Milestone 2, ...).
- `title` — a short name for the milestone.
- `features` — the features included in this milestone.
- `value` — the user value this milestone unlocks.
- `rationale` — why this milestone is ordered where it is.
- `infra` — the capabilities this milestone newly requires, in capability terms only
  (`none — mock data`, `persistence`, `auth`, ...). No mechanisms.

`project/features.md` is also updated: the `Candidate milestone` column is filled in.

## On completion
1. Write the output file(s) above.
2. `node {{scripts_path}}/adhd-state.mjs set milestones done`
3. `node {{scripts_path}}/adhd-state.mjs session-add milestones`
4. `node {{scripts_path}}/context-watch.mjs --next map` — if it advises a fresh
   session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
5. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
6. Confirm `currentMilestone` in `project/state.json` is `1` — the first milestone is
   the active one as the project moves into per-milestone work. Tell the user the next
   runnable stage is `map`.
