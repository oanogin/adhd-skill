# adhd — Review

**Effort:** high
**Gate:** every surface in milestone {{N}} has its `build` stage done.
**Output:** `project/milestones/m{{N}}/review.md`.
**Sub-skill:** none.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate review --milestone {{N}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

The gate for `review` is state-based: `adhd-state.mjs gate review --milestone {{N}}`
reports any surface in the milestone that is not yet built. If it names an unbuilt
surface, HALT and tell the user to run `{{command_prefix}}adhd build` for that surface
first. Review only runs once every surface in the milestone is built.

## Procedure
1. **Run a fresh-session design audit.** Review is a clean-eyes pass after ALL of the
   milestone's surfaces are built. Start it in a fresh session so the audit is not
   anchored to the build work. Remember: testing-green is not design-green — passing
   tests do not mean the milestone is coherent.
2. **Review every built surface.** Check each surface against `m{{N}}/ux.md`,
   `docs/PRODUCT.md`, and `docs/DESIGN.md`. Look for cross-surface consistency, visual
   and information hierarchy, the milestone journey holding together end to end, and
   whether the security and error-handling commitments made in `milestone-ux` were
   actually delivered.
3. **Write findings to `m{{N}}/review.md`.** Record each finding as an actionable item:
   the issue, the surface it affects, a severity, and the fix.
4. **File and fix defects before closing.** Defects found in review are filed and fixed
   before the milestone closes. Do not advance to the next milestone with open critical
   items.

## Output
`project/milestones/m{{N}}/review.md` with a findings list. Each finding records:

- `item` — the issue found.
- `surface` — the surface it affects.
- `severity` — how serious the finding is.
- `fix` — the action that resolves it.

## On completion
1. Write the output file(s) above.
2. `node {{scripts_path}}/adhd-state.mjs set review done --milestone {{N}}`
3. `node {{scripts_path}}/adhd-state.mjs session-add review`
4. `node {{scripts_path}}/context-watch.mjs --next surface-overview` — if it advises a
   fresh session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the
   prompt.
5. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
6. Milestone {{N}} is complete. Advance to the next milestone with
   `node {{scripts_path}}/adhd-state.mjs advance-milestone` — a single command that
   bumps `currentMilestone`, clears `currentSurface`, and resets the session. The next
   runnable stage is then `surface-overview` for the next milestone.
