# adhd — Milestone UX

**Effort:** high
**Gate:** `project/milestones/m{{N}}/overview.md` exists — the Surface Overview stage is done.
**Output:** `project/milestones/m{{N}}/ux.md`.
**Sub-skill:** none.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate milestone-ux --milestone {{N}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `project/milestones/m{{N}}/overview.md` is missing, HALT and tell
the user to run `{{command_prefix}}adhd surface-overview --milestone {{N}}` first.

## Procedure
1. **Design the milestone's UX as a whole.** Work cross-surface, not surface by surface.
   Walk the milestone journey from `overview.md` end to end and verify nothing falls
   between the surfaces: navigation between them, shared state that must survive a
   transition, entry and exit points, and the hand-offs that connect one surface to the
   next. The goal is a coherent milestone, not a set of disconnected screens.
2. **Advise the must-have security and error handling.** Decide the milestone-level
   critical behavior now, so it is never discovered uncovered late during Build:
   - the auth model — who is signed in and how;
   - authz boundaries — what each role may and may not reach;
   - input validation — what must be checked and where;
   - failure modes — how the milestone behaves when a backend, network, or input fails.
   These are decisions, not detailed implementations; the per-surface stages build them.
3. **Write `m{{N}}/ux.md`** capturing the cross-surface walkthrough and the security and
   error-handling commitments.
4. **Optional prototype.** When the milestone has `ui` surfaces and the UX benefits
   from being seen, you may build a clickable throwaway prototype with `impeccable`
   instead of, or alongside, `ux.md` — useful for stakeholder sign-off. The
   prototype is disposable: it is not the real UI, it is not committed to a code
   repo, and it carries no gate. Sign-off on it is informal. Record in `ux.md` that
   a prototype was produced and what was decided from it.

## Output
`project/milestones/m{{N}}/ux.md` with:

- A cross-surface UX walkthrough — the milestone journey, navigation, shared state, and
  transitions, with the gaps between surfaces explicitly closed.
- A `## Must-have security & error handling` section recording the auth model, authz
  boundaries, input validation requirements, and failure modes for the milestone.

## On completion
1. Write the output file(s) above.
2. `node {{scripts_path}}/adhd-state.mjs set milestone-ux done --milestone {{N}}`
3. `node {{scripts_path}}/adhd-state.mjs session-add milestone-ux`
4. `node {{scripts_path}}/context-watch.mjs --next design` — if it advises a fresh
   session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
5. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
6. The per-surface loop now begins. Tell the user the next runnable stage is `design`
   for the first surface of milestone {{N}}.
