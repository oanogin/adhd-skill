# adhd — Build

**Effort:** medium.
**Gate:** every feature this one depends on is already built. A plan is NOT required —
`build` never blocks on a plan.
**Output:** working code for the feature, plus the `Build`/`Verified` columns of
`m{{N}}/features.md` updated.
**Sub-skill:** `impeccable craft`, `superpowers:executing-plans`.

`build` runs per feature, walking the milestone's feature DAG. A
feature cannot build before the features it depends on — that is how backend work lands
before the frontend that wires it.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate build --milestone {{N}} --feature {{feature}}`.
If it reports unbuilt dependency features, HALT and tell the user to build those first —
the DAG order is not optional. No skip, no override — this is the skill's central
discipline. The gate checks deps only; it does not require a plan.

## Procedure
1. **Build the feature — scoped reads only.** Implement the feature in small,
   verifiable passes with `superpowers:executing-plans`. Read ONLY:
   - the flow diagram(s) for this feature (`project/flows/<slug>.md`);
   - `node {{scripts_path}}/adhd-state.mjs contract <P>` per implemented participant;
   - `docs/STACK.md` + the relevant `docs/DECISIONS.md` entries;
   - `m{{N}}/realize.md` — the tiny mechanism delta, IF it exists (may be absent);
   - the surface stub for `ui` features;
   - the gap memo `m{{N}}/plans/<slug>.md` IF one exists (it usually won't — build
     never requires a plan);
   - the feature's repo code.

   Whole-product reads are forbidden. Implement ONLY the current flow's arrows; keep
   signatures shaped for the full contract. For UI craft within a task use
   `impeccable craft` so the implementation matches the design system — and only for
   `ui` participants; `impeccable` has no role in service/store work.

   **Code lives in `src/lib/flows/<slug>/`** — 1:1 with `project/flows/<slug>.md`. The
   flow slug is the feature ID and the slice dir name. Create and `cd` into the slice
   dir before writing feature code. (Shared-core/infra and ui-surface rows added to
   `features.md` by hand are the exception — they land where their nature dictates.)

   **Code contradicts a diagram → STOP.** Never silently patch either side: a wrong
   diagram is a spec change — route it through `adhd evolve`; wrong code with a right
   diagram is `adhd fix`. This and the commit gate are the only user interrupts
   `build` is allowed.

   **Red flags → STOP and run `adhd plan --milestone {{N}} --feature {{feature}}`
   first.** Build directly by default, but a feature with genuine unknowns deserves a
   gap memo before code. Stop and run `plan` when you hit:
   - contradictory alt/error paths in the flow;
   - unclear guard logic (what condition, what happens on each side);
   - multi-entity interactions you can't reason about from the diagram alone;
   - data-model unknowns (shape of a payload, error code, or stored record).

   The plan is an optional gap memo, never a gate — this judgment rule is what covers
   the missing-plan case, not silence.

   Build in the feature's own `repo` — read it from the feature's row in
   `m{{N}}/features.md`, resolve the repo's absolute local path via
   `node {{scripts_path}}/adhd-state.mjs workspace-list`, and `cd` into it before
   writing code. Honor that repo's own conventions (`CLAUDE.md`, etc.). If the repo is
   unbound, HALT and tell the user to run `adhd workspace`.

   **Baseline guard:** use only technologies listed in `docs/STACK.md`. A task that
   needs a new library or service STOPS first — propose it, get the user's ok, update
   `STACK.md`, log the decision in `docs/DECISIONS.md`, then proceed.
2. **Verify before done.** When the feature is fully built, run the feature's
   verification — the repo's tests, build, and type checks — and confirm it passes. Do
   not claim done on assertion alone; run the commands and read the output.
3. **Mark the feature done in `features.md`.** Edit the feature's row in
   `m{{N}}/features.md`: set the `Build` cell to `done`, and the `Verified` cell to
   `yes` once verification has passed. That row is the single source of truth — the
   `build` gate of dependent features and the `review` gate read it. Do not mark `Build`
   `done` until the feature is fully built; do not mark `Verified` until verification
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
- working, verified code for the feature in `src/lib/flows/<slug>/` (or its by-hand
  location for core/ui rows).
- the feature's row in `m{{N}}/features.md` updated: `Build: done` and `Verified: yes`
  once the feature is fully built and verification has passed.

## On completion
1. Write the code and update the feature's `Build`/`Verified` cells in
   `m{{N}}/features.md`.
2. If the session is getting long, start a fresh one: run
   `node {{scripts_path}}/handoff-prompt.mjs` and give the user the resume prompt.
3. Tell the user the next runnable stage — `node {{scripts_path}}/adhd-state.mjs next
   --milestone {{N}}` names it: the next feature's `build`, or `review` once all
   features are built.
