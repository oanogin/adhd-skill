# adhd — Build

**Effort:** medium — effort scales with the number of tasks in the feature plan.
**Gate:** `project/milestones/m{{N}}/plans/{{feature}}.md` exists (Plan done) — waived
for a `Size: S` feature — AND every feature this one depends on is already built.
**Output:** working code for the feature, plus the `Build`/`Verified` columns of
`m{{N}}/features.md` updated.
**Sub-skill:** `impeccable craft`, `superpowers:executing-plans`.

`build` runs per feature, walking the milestone's feature DAG. A
feature cannot build before the features it depends on — that is how backend work lands
before the frontend that wires it.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate build --milestone {{N}} --feature {{feature}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports the plan file is missing, HALT and tell the user to run
`adhd plan --milestone {{N}} --feature {{feature}}` first. If it
reports unbuilt dependency features, HALT and tell the user to build those first — the
DAG order is not optional.

## Procedure
1. **Execute the plan task-by-task — scoped reads only.** Work through
   `plans/{{feature}}.md` with `superpowers:executing-plans`, one task at a time. The
   read contract is the same as `plan`'s: feature row + its flow diagram(s) +
   `node {{scripts_path}}/adhd-state.mjs contract <P>` per implemented participant +
   surface stub + repo code. Whole-product reads are forbidden. Implement ONLY the
   current flow's arrows; keep signatures shaped for the full contract. For UI craft
   within a task use `impeccable craft` so the implementation matches the design
   system — and only for `ui` participants; `impeccable` has no role in
   service/store work.

   **Code contradicts a diagram → STOP.** Never silently patch either side: a wrong
   diagram is a spec change — route it through `adhd evolve`; wrong code with a right
   diagram is `adhd fix`. This and the commit gate are the only user interrupts
   `build` is allowed.

   **A `Size: S` feature has no plan file** — build it directly under the same
   scoped-read contract: its feature row, its flow diagram(s) and `contract <P>`,
   in one small, verifiable pass. If mid-build it turns out to need real design
   decisions, STOP: set its
   `Size` to `M` in `features.md` and run `plan` first.

   Build in the feature's own `repo` — read it from the feature's row in
   `m{{N}}/features.md`, resolve the repo's absolute local path via
   `node {{scripts_path}}/adhd-state.mjs workspace-list`, and `cd` into it before
   writing code. Honor that repo's own conventions (`CLAUDE.md`, etc.). If the repo is
   unbound, HALT and tell the user to run `adhd workspace`.

   **Baseline guard:** use only technologies listed in `docs/STACK.md`. A task that
   needs a new library or service STOPS first — propose it, get the user's ok, update
   `STACK.md`, log the decision in `docs/DECISIONS.md`, then proceed.
2. **Verify before done.** When the whole plan is complete, run the feature's
   verification — the repo's tests, build, and type checks — and confirm it passes. Do
   not claim done on assertion alone; run the commands and read the output.
3. **Mark the feature done in `features.md`.** Edit the feature's row in
   `m{{N}}/features.md`: set the `Build` cell to `done`, and the `Verified` cell to
   `yes` once verification has passed. That row is the single source of truth — the
   `build` gate of dependent features and the `review` gate read it. Do not mark `Build`
   `done` until the whole plan is complete; do not mark `Verified` until verification
   actually passed.
4. **Respect the commit gate.** NEVER `git commit` without the user's explicit "ok" /
   "lgtm" — in the target repo as much as the orchestration repo. Present the work,
   wait for confirmation, then commit.
5. **Park new ideas.** A new idea raised mid-build goes to `adhd park` (not yet
   actionable) or `adhd evolve` (actionable now) — never bolted onto the running
   milestone.
- **New entity → update `concepts` first.** If this stage surfaces a product entity not
  already in `docs/CONCEPTS.md`, stop and re-run `adhd concepts` to add it (entity +
  relationships + any state rule) before continuing. The concepts file is the single
  source of the ubiquitous language; it must not silently fall behind the build. In the
  flows generation a new entity also means a missing registry row and likely a missing
  flow — escalate to `adhd evolve`, never freelance the participant.

## Output
- working, verified code for the feature — the plan `plans/{{feature}}.md` executed to
  completion.
- the feature's row in `m{{N}}/features.md` updated: `Build: done` and `Verified: yes`
  once the whole plan is complete and verification has passed.

## On completion
1. Write the code and update the feature's `Build`/`Verified` cells in
   `m{{N}}/features.md`.
2. If the session is getting long, start a fresh one: run
   `node {{scripts_path}}/handoff-prompt.mjs` and give the user the resume prompt.
3. Tell the user the next runnable stage — `node {{scripts_path}}/adhd-state.mjs next
   --milestone {{N}}` names it: the next feature's `plan`/`build`, or `review` once all
   features are built.
