# adhd — Milestone Brief

**Effort:** medium
**Gate:** `project/map.md` and `docs/GLOSSARY.md` exist — the Map stage is done.
**Output:** `project/milestones/m{{N}}/brief.md`.
**Sub-skill:** none.

`milestone-brief` is where a milestone comes into being. `adhd` keeps no pre-planned
roadmap — a milestone is **formed here**, just-in-time, by choosing stories from the
living backlog. The brief stays light: cross-surface coherence is proven later by the
clickable prototype, not pre-written on paper.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate milestone-brief --milestone {{N}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `project/map.md` or `docs/GLOSSARY.md` is missing, HALT and tell
the user to run `{{command_prefix}}adhd map` first.

## Procedure
1. **Choose the stories.** With the user, pick the stories from `project/stories.md`
   that this milestone will deliver — the smallest set that is genuinely valuable to
   real users, not a tech demo and not the whole spaceship. Respect story dependencies:
   a story cannot land before the stories it depends on. Persist the choice:
   - `node {{scripts_path}}/adhd-state.mjs milestone-stories <s1,s2,...> --milestone {{N}}`
   - `node {{scripts_path}}/adhd-state.mjs milestone-title "<title>" --milestone {{N}}`
2. **Identify the surfaces touched.** From `project/map.md`, list the surfaces this
   milestone's stories add or change. Keep `ui` surfaces **workspace-sized** — one
   coherent workspace you would demo as a unit, not one per screen-area; the milestone's
   prototype should be a small, coherent handful of `ui` surfaces (see SKILL.md,
   "Surfaces"). For each, confirm or refine its `kind`, `domains`, and physical
   placement with
   `node {{scripts_path}}/adhd-state.mjs surface-meta <name> --milestone {{N}} --kind <kind> [--domain <d1,d2>] [--repo <r>] [--subpath <p>]`.
3. **Set the track.** Decide the milestone's `infra` need, in capability terms only.
   `infra: none` → **prototype-only** (`milestone-brief → design → review → finalize`);
   any real infra → **production-track** (also `tracer → features → plan → build`).
   Persist: `node {{scripts_path}}/adhd-state.mjs milestone-track <prototype|production> --milestone {{N}}`.
   In `multi` mode also tag the milestone's domains:
   `node {{scripts_path}}/adhd-state.mjs milestone-domains <d1,d2,...> --milestone {{N}}`.
4. **Lock the must-have security & error handling.** Decide the milestone-level
   critical behaviour now, so it is never discovered uncovered late in `build`: the
   auth model, authz boundaries, input validation, and failure modes. These are
   decisions, not implementations.
5. **Write `m{{N}}/brief.md`** — the chosen stories, the surfaces they touch, the
   track, and the must-have security/error commitments.

## Output
`project/milestones/m{{N}}/brief.md` with:

- the chosen story IDs and why this set is the milestone;
- the surfaces the milestone touches, each with a one-line purpose;
- the track (`prototype-only` or `production`) and the `infra` need behind it;
- a `## Must-have security & error handling` section.

## On completion
1. Write the output file(s) above.
2. `node {{scripts_path}}/adhd-state.mjs set milestone-brief done --milestone {{N}}`
3. `node {{scripts_path}}/adhd-state.mjs session-add milestone-brief`
4. `node {{scripts_path}}/context-watch.mjs --next design` — if it advises a fresh
   session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
5. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
6. Tell the user the next runnable stage is `design` for milestone {{N}}.
