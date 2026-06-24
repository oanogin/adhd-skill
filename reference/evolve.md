# adhd — evolve (management command)

**Effort:** high
**Gate:** the only gated management command — groundwork must be complete (`concepts`
done, `docs/CONCEPTS.md` exists), because `evolve` mutates the living artifacts.
**Output:** none of its own — it mutates the living groundwork artifacts; "done" = its
work file is drained and deleted.
**Sub-skill:** `superpowers:brainstorming`.

`evolve` is the **single front door for every change after groundwork is complete** —
new features, adjustments to concepts, flow edits, prototype revisions, data-model
updates, and map changes all enter through here. The one thing that does NOT come
through `evolve` is a **code-only correction** — a bug, misplaced code, a convention
violation — where the spec is already right and the code is wrong: that is
`adhd fix` (see [fix.md](fix.md)). It is a **living, on-demand conductor**
(like `verify` or `adopt`), not part of the linear groundwork progression. It does NOT
produce a canonical artifact of its own; instead it sequences re-runs of the living
groundwork artifacts so the whole set stays internally consistent. In the **flows
generation** that living set is `concepts → flows` (plus the participant registry in
`project/map.md`). A new idea mid-project routes by actionability: not yet actionable
→ `adhd park` (the parking lot is the idea backlog); actionable now → `evolve`
sequences it into the spec as a flow. `evolve` **never creates or starts a
milestone** — a new flow lands in the global flow set; the user then runs `brief` to
schedule it.

## Gate check

Run `node {{scripts_path}}/adhd-state.mjs gate evolve`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run
(e.g. `adhd concepts`).
No skip, no override — this is the skill's central discipline.

## Procedure

1. **Clarify with `superpowers:brainstorming` + seed working memory.** This high-effort
   command may span sessions. Create `project/work/evolve.md` with a `## Gate` block, an
   `## Impact plan` checklist, and a `## Log` section, and append to it as you work. It
   is transient scratch — never a source of truth (see reference/working-memory.md). Seed
   `## Gate` with `requirements-confirmed`; clarify scope and direction with the user and
   record their verbatim ok, then
   `node {{scripts_path}}/adhd-state.mjs work-gate evolve` must pass before executing any
   step of the impact plan.

2. **Write the impact plan.** Populate `## Impact plan` in `project/work/evolve.md` with
   an **ordered checklist** of which living artifacts must change and why, in dependency
   order (`concepts → flows → map …`). Include only the stages the
   change actually touches. Each checklist item names the stage and the specific mutation
   it must make (e.g. `[ ] concepts — add "Subscription" entity and its lifecycle`).

3. **Confirm the plan with the user.** Walk the user through the impact plan, explain
   why each stage is included, and get explicit agreement before making any changes.
   Adjust the plan if they redirect.

4. **Execute each impact-plan item in order.** For each checked stage, re-run that
   stage's full procedure — `adhd concepts` / `adhd flows` / etc.
   Each sub-run keeps its **own gates and work-gates**; they must not be skipped.
   Check the item in `## Impact plan` only after the sub-run's own `## On completion`
   steps finish.

   > **Milestone boundary:** `evolve` never creates or starts a milestone. A new flow
   > lands in the global flow set. When the impact plan is fully executed, the user
   > runs `brief` to schedule it.

   > **Flow change.** Correct the diagram first: edit
   > `project/flows/<scenario>.md`, update the registry if participants
   > changed, run `node {{scripts_path}}/adhd-state.mjs validate` plus the flow
   > checks of the `verify` pass, get the user's sign-off on the diagram diff — then
   > route the affected code to `adhd fix` (code wrong, diagram right) or a new feature
   > row in the owning milestone's `features.md` (new work).

   > **Two-places bug rule.** A bug is fixed in **two** places: the flow diagram (if the
   > behavior it draws is wrong) **+** the flow's code in `src/lib/flows/<slug>/`. A
   > *new* mechanism or schema choice is the only thing that adds a **third** place — one
   > line in `docs/DECISIONS.md`. Nothing else gets re-narrated anywhere.

   > **Worked example — renaming a flow.** The slug is the stable feature ID *and* the
   > code-slice dir name, so a rename is a breaking change, never a casual edit:
   > 1. Edit the flow file (`project/flows/<old>.md` → `<new>.md`) and the participant
   >    registry in `project/map.md`.
   > 2. `node {{scripts_path}}/adhd-state.mjs validate`, then run the flow checks of the
   >    `verify` pass and get the user's sign-off on the diff.
   > 3. `node {{scripts_path}}/adhd-state.mjs features-scaffold --milestone <N>` to
   >    re-derive the feature row under the new slug ID (merge preserves
   >    Build/Verified/Domain/Repo/Size).
   > 4. Rename the gap memo `m<N>/plans/<old>.md` → `<new>.md` if one exists, and the
   >    code slice `src/lib/flows/<old>/` → `src/lib/flows/<new>/`.

## Output

None of its own. `evolve` leaves the living artifacts updated and mutually consistent:
`docs/CONCEPTS.md`, `project/flows/`, `project/map.md` (participant
registry), `docs/DATA.md` (as applicable).

## On completion

1. The command is **done** when every `## Impact plan` item is checked AND
   `project/work/evolve.md` is drained and deleted.
2. Drain durable facts to their canonical homes first — nothing informational should
   remain only in the work file.
3. Delete `project/work/evolve.md`. The `verify` pass flags a leftover `evolve.md`.
4. Tell the user the relevant next step — for example: run `brief` to schedule a
   newly-specced flow into an upcoming milestone.
