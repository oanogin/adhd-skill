# adhd — Features

**Effort:** high
**Gate:** the milestone's `tracer` stage is done; production-track milestones only.
**Output:** `project/milestones/m{{N}}/features.md` + the feature DAG in `state.json`.
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
2. **Record each feature** in `state.json`:
   `node {{scripts_path}}/adhd-state.mjs feature-add <id> --milestone {{N}} --story <s> --domain <d> --repo <r> [--surface <name>]`.
   A frontend feature names the `--surface` it builds; a backend feature usually does not.
3. **Wire the dependency edges.** A feature depends on another when it cannot be built
   before it — most often a frontend feature depends on its backend feature, which is
   how backend-before-frontend order is enforced. Record:
   `node {{scripts_path}}/adhd-state.mjs feature-dep <id> --depends <f1,f2> --milestone {{N}}`.
   The DAG must be acyclic — run `node {{scripts_path}}/adhd-state.mjs audit` to check.
4. **Write `m{{N}}/features.md`** — the human-readable DAG: each feature with its story,
   domain, repo, the surface it serves, and what it depends on.

## Output
- the feature DAG in `state.json`, via `feature-add` / `feature-dep`.
- `project/milestones/m{{N}}/features.md` — the readable DAG: every feature, its
  story/domain/repo/surface, and its dependencies.

## On completion
1. Write the output file(s) above.
2. `node {{scripts_path}}/adhd-state.mjs set features done --milestone {{N}}`
3. `node {{scripts_path}}/adhd-state.mjs session-add features`
4. `node {{scripts_path}}/context-watch.mjs --next plan` — if it advises a fresh
   session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
5. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
6. Tell the user the next runnable stage is `plan` for the first feature of the DAG —
   `node {{scripts_path}}/adhd-state.mjs next` names it.
