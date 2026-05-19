# adhd — Build

**Effort:** medium — effort scales with the number of tasks in the feature plan.
**Gate:** `project/milestones/m{{N}}/plans/{{feature}}.md` exists (Plan done) AND every
feature this one depends on is already built.
**Output:** working code for the feature, plus an updated `state.json`.
**Sub-skill:** `impeccable craft`, `superpowers:executing-plans`.

`build` runs per feature, on production-track milestones, walking the feature DAG. A
feature cannot build before the features it depends on — that is how backend work lands
before the frontend that wires it.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate build --milestone {{N}} --feature {{feature}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports the plan file is missing, HALT and tell the user to run
`{{command_prefix}}adhd plan --milestone {{N}} --feature {{feature}}` first. If it
reports unbuilt dependency features, HALT and tell the user to build those first — the
DAG order is not optional.

## Procedure
1. **Execute the plan task-by-task.** Work through `plans/{{feature}}.md` with
   `superpowers:executing-plans`, one task at a time. For UI craft within a task use
   `impeccable craft` so the implementation matches the design system. Keep the
   feature's `build` status at `in-progress` while underway.

   Build in the feature's own `repo`. Read it with
   `node {{scripts_path}}/adhd-state.mjs feature-list --milestone {{N}}`, resolve the
   repo's absolute local path via `node {{scripts_path}}/adhd-state.mjs workspace-list`,
   and `cd` into it (plus the surface `subpath` if relevant) before writing code. Honor
   that repo's own conventions (`CLAUDE.md`, etc.). If the repo is unbound, HALT and
   tell the user to run `{{command_prefix}}adhd workspace`. The `build` status is
   tracked in the orchestration repo's `state.json`.
2. **Verify before done.** When the whole plan is complete, run the feature's
   verification — the repo's tests, build, and type checks — and confirm it passes. Do
   not claim done on assertion alone; run the commands and read the output. Record the
   pass: `node {{scripts_path}}/adhd-state.mjs feature-verify {{feature}} --milestone {{N}}`.
   The `review` gate requires every feature verified — unverified code cannot reach review.
3. **Respect the commit gate.** NEVER `git commit` without the user's explicit "ok" /
   "lgtm" — in the target repo as much as the orchestration repo. Present the work,
   wait for confirmation, then commit.
4. **Park new ideas.** A new story idea raised mid-build is filed to `project/stories.md`
   (re-run `stories`), never bolted onto the running milestone.

## Output
- working, verified code for the feature — the plan `plans/{{feature}}.md` executed to
  completion.
- `state.json` updated: the feature's `build` status `done` and `verified` true once
  the whole plan is complete and verification has passed.

## On completion
1. Write the output file(s) above.
2. `node {{scripts_path}}/adhd-state.mjs set build done --milestone {{N}} --feature {{feature}}`
   (use `set build in-progress` partway through; only `done` when the plan is complete).
3. `node {{scripts_path}}/adhd-state.mjs feature-verify {{feature}} --milestone {{N}}`
4. `node {{scripts_path}}/adhd-state.mjs session-add build`
5. `node {{scripts_path}}/context-watch.mjs --next <stage>` — `--next plan` or
   `--next build` when more features remain, `--next review` when this was the last. If
   it advises a fresh session, run `node {{scripts_path}}/handoff-prompt.mjs` and give
   the user the prompt.
6. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
7. Tell the user the next runnable stage — `node {{scripts_path}}/adhd-state.mjs next`
   names it: the next feature's `plan`/`build`, or `review` once all features are built.
