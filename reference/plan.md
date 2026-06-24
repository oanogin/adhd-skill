# adhd — Plan

**Effort:** medium
**Gate:** the feature exists in the milestone's DAG (`m{{N}}/features.md`).
**Output:** `project/milestones/m{{N}}/plans/{{feature}}.md` — an OPTIONAL gap memo.
**Sub-skill:** none.

`plan` is an OPTIONAL, on-demand gap memo for ONE feature. It NEVER gates build — most
features skip it and `build` directly from their flow slice. Run it only when a feature has
genuine unknowns: behavioral ambiguity in a flow's alt/error paths, unclear guard logic, or
mechanism coupling worth surfacing before code.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate plan --milestone {{N}} --feature {{feature}}`.
This is a thin "feature exists in the DAG" check so you may run plan manually. If it reports
the feature does not exist or `features` is not done, HALT and tell the user to run
`adhd realize --milestone {{N}}` first. `build` does not wait on this stage.

## Procedure
Write `project/milestones/m{{N}}/plans/{{slug}}.md` — hard cap ~30 lines, these sections:

- `## Weak points` — where the flow's design is fragile.
- `## Gaps` — behavior the flow assumes but does not show.
- `## Edge cases` — pulled from the flow's alt/error branches.
- `## Open decisions` — what still needs a call (and from whom).
- `## Tasks` — names only, checkbox list, NO step bodies.

**Scoped reads only:** the flow diagram(s) for this slug (`project/flows/<slug>.md`),
`node {{scripts_path}}/adhd-state.mjs contract <participant>`, `docs/STACK.md`, the relevant
`docs/DECISIONS.md` entries, and `m{{N}}/realize.md` if it exists. Whole-product reads are
forbidden — the flow slice IS the context.

**ZERO fenced code blocks.** Inline `identifiers` or short clauses to ASK a question are
fine (e.g. "confirm shape of `APIError.body.code`"), but never a fenced code block and never
pseudo-implementation. If you'd need more than two such clauses, the feature is too big —
re-size it. (`validate`/`verify` flag any plan containing a fenced code block as a blocker.)

## Output
`project/milestones/m{{N}}/plans/{{slug}}.md` — a code-free, ~30-line gap memo. It is a
reference for `build`, not a gate.

## On completion
1. The memo exists; that is the whole deliverable.
2. Tell the user `build` is the next runnable stage for this feature.
   `node {{scripts_path}}/adhd-state.mjs next --milestone {{N}}` names it.
