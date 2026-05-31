# adhd — Review

**Effort:** high
**Gate:** prototype-only milestone — `ux-refine` is done; production-track milestone —
every feature is built **and** verified.
**Output:** `project/milestones/m{{N}}/review.md`.
**Sub-skill:** none.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate review --milestone {{N}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

The gate is state-based and track-aware. A prototype-only milestone needs `ux-refine`
done. A production-track milestone needs the `features` stage done and every feature
both built and verified — if a feature is built but not verified, run
`adhd build` for it and complete its verification first.

## Procedure
1. **Start working memory.** This high-effort stage may span sessions. Create
   `project/work/m{{N}}-review.md` (`## Left to do` + `## Log`) and append as you work —
   see SKILL.md, "Working memory".
2. **Run a fresh-session audit.** Review is a clean-eyes pass once the milestone is
   complete — the signed-off prototype for a prototype-only milestone, or the built
   production app for a production-track one. Start it in a fresh session so the audit
   is not anchored to the build work. Testing-green is not design-green — passing tests
   do not mean the milestone is coherent.
3. **Review the milestone's surfaces.** Check each surface against
   `m{{N}}/surfaces/<name>.md`, `m{{N}}/brief.md`, `docs/PRODUCT.md`, and
   `docs/DESIGN.md`. On a production-track milestone also check the production app
   against the signed-off prototype. Look for cross-surface consistency, visual and
   information hierarchy, the milestone journey holding together end to end, and whether
   the must-have security and error-handling commitments from `brief.md` were delivered.
4. **Check story and feature coverage.** Verify every story chosen in `m{{N}}/brief.md`
   is actually delivered by the milestone's features, and — for a cross-domain milestone
   — that each participating domain's work was addressed. Nothing chosen should be
   silently skipped. Run `node {{scripts_path}}/adhd-state.mjs audit` and resolve findings.
5. **Write findings to `m{{N}}/review.md`.** Record each as an actionable item: the
   issue, the surface or feature it affects, a severity, and the fix.
6. **File and fix defects before closing.** Defects found in review are fixed before
   `finalize`. Do not advance with open critical items.

## Output
`project/milestones/m{{N}}/review.md` with a findings list. Each finding records:

- `item` — the issue found.
- `where` — the surface or feature it affects.
- `severity` — how serious the finding is.
- `fix` — the action that resolves it.

## On completion
1. Write the output file(s) above — review is done the moment `m{{N}}/review.md` exists.
2. `node {{scripts_path}}/adhd-state.mjs session-add review`
3. `node {{scripts_path}}/context-watch.mjs --next finalize` — if it advises a fresh
   session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
4. Drain `project/notes.md` and `project/work/m{{N}}-review.md`: migrate durable facts to
   their canonical home, then delete the work file. `notes.md` healthy = empty.
5. Tell the user the next runnable stage is `finalize` for milestone {{N}}.
