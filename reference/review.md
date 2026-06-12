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
1. **Start working memory + seed the gate.** This high-effort stage may span sessions.
   Create `project/work/m{{N}}-review.md` with `## Gate` + `## Left to do` + `## Log` and
   append as you work — see SKILL.md, "Working memory". Seed `## Gate` with
   `requirements-confirmed`; confirm the review scope/approach with the user and check it
   with their verbatim ok, then
   `node {{scripts_path}}/adhd-state.mjs work-gate review --milestone {{N}}` must pass
   before you write this stage's output artifact.
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
   silently skipped. Run the `verify` pass (see [reference/verify.md](verify.md)) and resolve findings.
5. **Arrow coverage (flows generation).** For every flow the milestone owns
   (the `## Flows` list in `brief.md`): every arrow has an implementation, and every
   implementation traces to an arrow. Run it per entity too — compare
   `node {{scripts_path}}/adhd-state.mjs contract <participant>` against what the code
   exposes; partial implementations must be explicit (deferred arrows listed with their
   waiver), never silent. Unimplemented arrows or untraceable code are findings.
6. **Write findings to `m{{N}}/review.md`** as a table with exactly these columns —
   `adhd-state.mjs` parses it for the `finalize` gate:

   `| ID | Finding | Where | Severity | Fix | Status |`

   - `Severity` — `critical` | `major` | `minor`.
   - `Status` — `open` | `fixed` | `accepted`. Every finding starts `open`; an empty
     cell counts as `open` (fail-closed). `accepted` means the user explicitly chose to
     live with it — record their ok in the `Fix` cell.
7. **Resolve each finding through the right door — never freelance:**
   - **small code defect** → `adhd fix` (see [fix.md](fix.md)), then set `Status: fixed`;
   - **substantial production work** (production-track) → append a feature row
     (e.g. `f-rev-1`) to `m{{N}}/features.md` with a `Size` and dependencies — the
     normal `plan`/`build` machinery and gates apply; set the finding `fixed` once that
     feature is built and verified;
   - **prototype-slice problem** → `adhd ux-refine --milestone {{N}}` (slice fix);
   - **the spec itself is wrong** (whole-product flow, concepts, stories) →
     `adhd evolve`;
   - **consciously deferred** → `Status: accepted`, with the user's explicit ok.

   The `finalize` gate refuses to run while any `critical` finding is `open` — that is
   the machine check behind "do not advance with open critical items".

## Output
`project/milestones/m{{N}}/review.md` with the findings table
(`ID | Finding | Where | Severity | Fix | Status`), one row per finding, each resolved
(`fixed`/`accepted`) or consciously left `open` (non-critical only).

## On completion
1. Write the output file(s) above — review is done the moment `m{{N}}/review.md` exists.
2. If the session is getting long, start a fresh one: run
   `node {{scripts_path}}/handoff-prompt.mjs` and give the user the resume prompt.
3. Drain `project/work/m{{N}}-review.md`: migrate durable facts to their canonical home,
   then delete the work file.
4. Tell the user the next runnable stage is `finalize` for milestone {{N}}.
