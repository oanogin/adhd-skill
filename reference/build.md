# adhd — Build

**Effort:** medium — the plan notes it is effectively per-task; effort scales with the
number of tasks in the surface plan.
**Gate:** `project/milestones/m{{N}}/plans/{{name}}.md` exists — the Plan stage is done.
**Output:** working code for the surface, plus an updated `state.json`.
**Sub-skill:** `impeccable craft`, `superpowers:executing-plans`.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate build --milestone {{N}} --surface {{name}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `project/milestones/m{{N}}/plans/{{name}}.md` is missing, HALT and
tell the user to run `{{command_prefix}}adhd plan --milestone {{N}} --surface {{name}}`
first.

## Procedure
1. **Execute the plan task-by-task.** Work through the surface plan
   `plans/{{name}}.md` with `superpowers:executing-plans`, completing one task at a
   time. For UI craft within a task, use `impeccable craft` so the implementation
   matches the design system. The plan's tasks already target the right app for the
   project's phase — the **prototype app** on mock data in prototype phase, the
   **production app** (closing this surface's `m{{N}}/gap.md` delta) in production
   phase. See SKILL.md, "Prototype and production apps".

   In `multi` mode, code is written in the surface's registered repo. Read the
   surface's `repo` with
   `node {{scripts_path}}/adhd-state.mjs surface-meta {{name}} --milestone {{N}}`,
   resolve its path from `node {{scripts_path}}/adhd-state.mjs workspace-list`, and
   `cd` into that path before writing code. Honor that repo's own conventions
   (`CLAUDE.md`, etc.). The commit gate applies in the target repo — never `git
   commit` there without the user's explicit "ok". The `build` status is still
   tracked in the orchestration repo's `state.json`.
2. **Track progress.** Keep the surface's `build` status at `in-progress` while work is
   underway, and set it to `done` only when the whole surface plan is complete — every
   task finished. Do not mark the surface done partway through.
3. **Respect the commit gate.** NEVER run `git commit` without the user's explicit
   "ok" or "lgtm". Present the work, wait for that confirmation, then commit.
4. **Park new feature ideas.** If a new feature idea surfaces mid-build, do not silently
   grow scope. File it to `project/features.md` and assign it a milestone. If the idea
   would expand the current milestone, warn the user explicitly before continuing.

## Output
- Working code for the surface — the surface plan `plans/{{name}}.md` executed to
  completion, task by task.
- An updated `state.json` reflecting the surface's `build` progress (`in-progress`
  while working, `done` once the whole surface plan is complete).

## On completion
1. Write the output file(s) above.
2. `node {{scripts_path}}/adhd-state.mjs set build done --milestone {{N}} --surface {{name}}`
   The conductor may also set `build` to `in-progress` partway through the surface:
   `node {{scripts_path}}/adhd-state.mjs set build in-progress --milestone {{N}} --surface {{name}}`.
   Only mark `done` when the entire surface plan is complete.
3. `node {{scripts_path}}/adhd-state.mjs session-add build`
4. `node {{scripts_path}}/context-watch.mjs --next <stage>` — pass the actual next
   stage: `--next plan` when another surface still needs planning/building, or
   `--next review` when this was the last surface. If it advises a fresh session, run
   `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
5. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
6. Tell the user the next runnable stage: `plan` for the next surface of the
   milestone, or `review` once all surfaces in the milestone are built.
