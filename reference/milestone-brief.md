# adhd — Milestone Brief

**Effort:** medium
**Gate:** `project/stories.md` exists — the Stories stage is done (which in turn
required the whole-product `prototype` and the rest of groundwork).
**Output:** `project/milestones/m{{N}}/brief.md`.
**Sub-skill:** none.

`milestone-brief` is where a milestone comes into being. `adhd` keeps no pre-planned
roadmap — a milestone is **formed here**, just-in-time, by choosing stories from the
living backlog. Creating `m{{N}}/brief.md` *is* creating milestone `{{N}}`; milestones
are independent `m<N>/` folders, so several can be in flight at once.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate milestone-brief --milestone {{N}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `project/stories.md` is missing, HALT and tell the user to run
`adhd stories` first.

## Procedure
The whole stage writes one file — `m{{N}}/brief.md`. There are no state commands; the
brief *is* the milestone's record.

1. **Choose the stories.** With the user, pick the stories from `project/stories.md`
   that this milestone will deliver — the smallest set that is genuinely valuable to
   real users, not a tech demo and not the whole spaceship. Respect story dependencies:
   a story cannot land before the stories it depends on. List the chosen story IDs in
   `brief.md`, with a one-line title for the milestone.
2. **Identify the surfaces touched.** From `project/map.md`, list the surfaces this
   milestone's stories add or change. Keep `ui` surfaces **workspace-sized** — one
   coherent workspace you would demo as a unit, not one per screen-area; the milestone's
   prototype should be a small, coherent handful of `ui` surfaces (see SKILL.md,
   "Surfaces"). Record each surface in `brief.md` with its `kind`, `domains`, and
   production home (a `ui` surface's may be `TBD`).
3. **Set the track.** Decide the milestone's `infra` need, in capability terms only.
   `infra: none` → **prototype-only** (`milestone-brief → ux-refine → review → finalize`);
   any real infra → **production-track** (also `tracer → features → plan → build`).
   Write a line `Track: production` or `Track: prototype` in `brief.md` — the gates and
   `status` parse it. In `multi` mode also note the milestone's domains.
4. **Lock the must-have security & error handling.** Decide the milestone-level
   critical behaviour now, so it is never discovered uncovered late in `build`: the
   auth model, authz boundaries, input validation, and failure modes. These are
   decisions, not implementations.
5. **Write `m{{N}}/brief.md`** — the chosen stories, the surfaces they touch, the
   `Track:` line, and the must-have security/error commitments.

## Output
`project/milestones/m{{N}}/brief.md` — the milestone's record, with:

- a `# Milestone {{N}} — <title>` heading;
- the chosen story IDs and why this set is the milestone;
- the surfaces the milestone touches — name, `kind`, `domains`, production home;
- a `Track: production` / `Track: prototype` line and the `infra` need behind it;
- a `## Must-have security & error handling` section.

## On completion
1. Write the output file — milestone `{{N}}` exists and the stage is done the moment
   `m{{N}}/brief.md` exists.
2. If the session is getting long, start a fresh one: run
   `node {{scripts_path}}/handoff-prompt.mjs` and give the user the resume prompt.
3. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
4. Tell the user the next runnable stage is `ux-refine` for milestone {{N}}.
