# adhd — Features

**Effort:** high
**Gate:** the milestone's `tracer` stage is done; production-track milestones only.
**Output:** `project/milestones/m{{N}}/features.md` — the feature DAG.
**Sub-skill:** none.

`features` decomposes the milestone's chosen stories into **features** — small,
concrete units of implementation work, each scoped to exactly one domain (one repo).
Features carry dependency edges; the resulting DAG is the build order. This stage
absorbs the old `gap` and `replan` work: the DAG **is** the work that closes the
prototype↔production delta, grounded in what `tracer` proved real.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate features --milestone {{N}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `tracer` is not done, HALT and tell the user to run
`{{command_prefix}}adhd tracer --milestone {{N}}` first. If it reports the milestone is
"prototype-only", `features` does not apply — a prototype-only milestone goes from
`design` straight to `review`.

## Procedure
1. **Decompose each chosen story into features.** For every story in the milestone,
   break the work into features — each one small, concrete, and living in exactly one
   domain (one repo). A backend feature is a per-domain slice of the story; a frontend
   feature wires a surface to its backend. Reconcile against `m{{N}}/tracer.md`: where
   the tracer's backend reality contradicted the signed-off prototype, the **prototype
   is corrected first** (re-run `{{command_prefix}}adhd design --milestone {{N}}`), then
   the features are written to match reality.
2. **Write `m{{N}}/features.md`** as a table with exactly these columns:

   `| ID | Feature | Story | Domain | Repo | Depends on | Build | Verified |`

   - `ID` — a stable short key for the feature (`f-registry-api`, `f1`, ...).
   - `Story` — the parent story ID from `project/stories.md`.
   - `Domain` / `Repo` — the one domain and the one repo the feature lives in.
   - `Depends on` — comma-separated feature IDs this feature must be built after. A
     frontend feature depends on its backend feature — that is how backend-before-
     frontend order is enforced. The DAG must be acyclic.
   - `Build` / `Verified` — leave **empty** now. `build` fills `Build` with `done` and
     `Verified` with `yes` as each feature completes. The script parses this table for
     the build-order gate.
3. **Note the surface.** If a feature serves a specific surface, name it in the
   `Feature` cell or an extra column — `plan` reads it to find the surface spec.
4. **Check it.** Run `node {{scripts_path}}/adhd-state.mjs audit` — it flags unknown
   stories, unknown repos, unknown dependency IDs, and dependency cycles.

## Output
`project/milestones/m{{N}}/features.md` — the feature DAG as a markdown table
(`ID | Feature | Story | Domain | Repo | Depends on | Build | Verified`), one row per
feature, `Build`/`Verified` empty. This table is the single source of truth for the
DAG and, later, for per-feature build progress.

## On completion
1. Write the output file — the stage is done the moment `m{{N}}/features.md` exists.
2. `node {{scripts_path}}/adhd-state.mjs session-add features`
3. `node {{scripts_path}}/context-watch.mjs --next plan` — if it advises a fresh
   session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
4. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
5. Tell the user the next runnable stage is `plan` for the first feature of the DAG —
   `node {{scripts_path}}/adhd-state.mjs next --milestone {{N}}` names it.
