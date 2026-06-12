---
name: adhd
description: "Use when starting, structuring, planning, or building any software project end-to-end — from first idea to shipped milestones — even if the user doesn't ask for process. Triggers: /adhd, 'start a new project', 'I have an app idea', 'plan my app', project kickoff, milestone planning, 'where am I in the build', resume after a fresh session, a new feature idea raised mid-project, a bugfix on an adhd project, scope discipline, flow diagram sign-off, a stage gate refusing to run."
argument-hint: "[stage] [milestone|feature]"
user-invocable: true
license: Apache 2.0
---

`adhd` is a conductor. It front-loads a whole-project view — vision, scope, structure —
then declares every interaction as sequence-diagram **flows** before any code, with
hard gates that forbid skipping ahead. It owns sequencing and discipline; the
dependency skills own the work inside each stage. This file is the router and the
invariants; every stage's procedure lives in its `reference/<stage>.md`.

## Invocation

- `adhd` — report progress (`adhd-state.mjs status`) and name the next runnable stage.
- `adhd <stage>` — run that stage (table below).
- `adhd <stage> <milestone|feature>` — run a stage for a specific milestone/feature.

On Claude Code, `adhd` is the `/adhd` slash command. On Codex, Cursor, and other
agents, invoke the `adhd` skill directly (load this `SKILL.md` and follow it) with the
stage as the argument. Tool-name mappings: `reference/codex-tools.md`,
`reference/cursor-tools.md`.

## Conventions

**`{{scripts_path}}`** — every `node {{scripts_path}}/...` command uses this token: the
`scripts/` directory under the folder you loaded this `SKILL.md` from. Resolve it
**once, now**, to a real absolute path and substitute it into every such command —
never run the literal `{{scripts_path}}`. **Run every such command from the project
root** — the script resolves `project/config.json` from the current working directory,
not from its own location.

## Required-skill preflight (non-optional)

`adhd` hard-depends on the **`superpowers` plugin** (`brainstorming`, `writing-plans`,
`executing-plans`, and friends) and the **`impeccable` skill** (UI work in the
on-demand `prototype` command and inside `build`). No fallback, no degraded mode —
several stages ARE thin orchestrations of these skills, so "improvising without them"
silently replaces the procedure the user installed `adhd` for.
Before ANY file mutation, self-confirm: state in the response that both are present
and invocable. If either is missing, name it and HALT — installing them is the user's
job. `setup` records the confirmation via `adhd-state.mjs preflight-confirm`.

Codex / Cursor agents must also state this line before mutating files:

```text
ADHD_PREFLIGHT: skills=pass gate=pass|fail:<stage> mutation=open
```

## The project IS its files

No separate state database. The project's state is the `project/` + `docs/` tree
(full canonical layout: [reference/setup.md](reference/setup.md)):

- **A stage is done the moment its artifact file exists.** No status field. Never
  create a stage's artifact until the stage is genuinely complete — draft in
  `project/work/<stage>.md`, create the canonical file last.
- **`project/config.json`** is the only non-doc file (mode, generation, repos,
  prototype topology, preflight). Mutate it only through `adhd-state.mjs` subcommands.
- `adhd-state.mjs` reads and derives (`status`, `gate`, `next`, `validate`,
  `contract`, `closure`); the agent reads/writes the `.md` artifacts directly.

A pre-flows project (config without `generation: flows`) is blocked fail-closed by
`gate` and `validate`, which point at the upgrade path (`adhd-state.mjs upgrade`; see
README, "Upgrading a pre-flows project"). A legacy `project/state.json` converts via
`adhd-state.mjs migrate`.

## Modes

`single` (default) — `project/` lives at the repo root, all work in one repo.
`multi` — the `project/` tree lives in the orchestration repo; code repos are
registered by logical name and the product splits into domains. Switching, repo
binding, domains, prototype topology, and parallel/team work:
[reference/workspace.md](reference/workspace.md).

## Groundwork and milestones

**Groundwork** (`setup → vision → foundation → concepts`) establishes the product.
`concepts` is the terminal groundwork stage and is **living**: alongside the
ubiquitous language, `docs/CONCEPTS.md` carries the **capability dependency map** — a
mermaid flowchart of capability areas (solid edge = hard prerequisite, dashed =
soft/enhances, built areas marked). That map is the **soft roadmap**: `adhd` keeps no
milestone list; milestones are picked off the map (an area is pickable-next when every
solid in-edge comes from a built area). Post-groundwork changes to the living set
route through `evolve`.

A **milestone** is a **ready-to-use experience** — a complete, business-usable slice
of the product, sized by business value, never by effort. Nothing inside a milestone
needs to be independently usable; the milestone is the usable unit. It is a folder,
`project/milestones/m<N>/`, formed just-in-time: `brief` writes `m<N>/brief.md` and
that *is* the milestone. Milestones are independent — no global "current milestone"
pointer; several can be in flight at once (one developer per milestone — see
[reference/workspace.md](reference/workspace.md)).

The **flows are the spine**: every interaction the milestone ships is declared as a
mermaid sequence diagram — order, branches, guards, error paths — and signed off
before any code. The signed-off flow set is the behavior contract everything
downstream reads.

## Working memory (summary — full rules in [reference/working-memory.md](reference/working-memory.md))

Two non-canonical stores. **Transient scratch**: `project/work/<stage>.md`
(gitignored; high-effort stages + `brief` create one as their first step; drained and
deleted on completion). **Durable, not-yet-actionable ideas**: `project/parking.md`
(committed, user-owned; agent writes it only via `adhd park`; read it at the start of
every stage).

Every work file carries a `## Gate` block — the user confirmations required **before
the stage produces output or writes implementation**, checked fail-closed with
`adhd-state.mjs work-gate <stage> [--milestone N] [--item <id>]`. If it reports
`missing`, HALT and clarify. Never pre-check an item; never invent the user's words.

## Stages

| Stage | Loop | Effort | Artifact (exists ⇔ done) | Sub-skill | Reference |
|---|---|---|---|---|---|
| `setup` | groundwork | low | `project/config.json` | none | [reference/setup.md](reference/setup.md) |
| `vision` | groundwork | high | `docs/PRODUCT.md` | none | [reference/vision.md](reference/vision.md) |
| `foundation` | groundwork | medium | `docs/STACK.md` (+ `DECISIONS.md` entry) | none | [reference/foundation.md](reference/foundation.md) |
| `concepts` | groundwork (living) | high | `docs/CONCEPTS.md` (incl. capability map) | brainstorming | [reference/concepts.md](reference/concepts.md) |
| `brief` | per-milestone | medium | `m<N>/brief.md` | brainstorming | [reference/brief.md](reference/brief.md) |
| `flows` | per-milestone | high | `m<N>/flows.md` + `project/flows/*` + `map.md` registry | brainstorming | [reference/flows.md](reference/flows.md) |
| `realize` | per-milestone | high | `m<N>/features.md` (+ `m<N>/realize.md`) | none | [reference/realize.md](reference/realize.md) |
| `plan` | per-feature | medium | `m<N>/plans/<feature>.md` (skipped for `Size: S`) | writing-plans | [reference/plan.md](reference/plan.md) |
| `build` | per-feature | medium | code + `Build`/`Verified` in `features.md` | impeccable craft / executing-plans | [reference/build.md](reference/build.md) |
| `review` | per-milestone | high | `m<N>/review.md` | none | [reference/review.md](reference/review.md) |
| `finalize` | per-milestone | low | `m<N>/summary.md` | none | [reference/finalize.md](reference/finalize.md) |

Flow: groundwork `setup → vision → foundation → concepts`. Per milestone:
`brief → flows → realize`, then the feature DAG in dependency order **one feature at a
time** — `plan` it then `build` it before moving to the next, never all plans up front
— then `review → finalize`. `prototype` is an **on-demand command**, not a stage.
There is no "advance" step: the next milestone is created by running `brief` again.
`adhd-state.mjs status` shows every milestone; `next --milestone <N>` names a specific
one's next stage.

## Flows, participants, and contracts

A **flow** is one scenario as a mermaid sequence diagram —
`project/flows/<scenario>.md`, one per file. Flow files are **global product truth**:
accumulated across milestones, owned by none; `m<N>/brief.md` lists which flows a
milestone owns. Format and authoring rules:
[reference/flows.md](reference/flows.md).

- **Registry.** Every participant must exist in `project/map.md`'s registry —
  script-enforced by `validate`. No ad-hoc names, no synonym drift. Table format,
  altitude rule, and sizing: [reference/flows.md](reference/flows.md).
- **Derived contracts — never stored.** A flow is vertical (one scenario, many
  participants); rework risk is horizontal (one entity, many flows). The horizontal
  view is computed: `node {{scripts_path}}/adhd-state.mjs contract <participant>`
  emits everything that participant receives, sends, and guards across ALL flows, with
  flow refs. Flows stay the single source of truth — zero drift.
- **Surface stubs.** `project/surfaces/<name>.md` holds a `ui` participant's purpose,
  UX intent, and key states ONLY — its behavior is derived via `contract`.

**Every fact has exactly one home:**

| Fact | Home |
|---|---|
| Rule/invariant statement | `docs/CONCEPTS.md` |
| Rule's place in an interaction | flow arrow (references, never restates) |
| Capability dependency map | `docs/CONCEPTS.md` |
| Participant existence | `project/map.md` registry |
| Pending / not-yet-actionable ideas | `project/parking.md` |
| Surface behavior | derived — `contract <ui-name>` |
| Surface UX intent | `project/surfaces/<name>.md` stub |
| Entity interface across flows | derived — `contract <participant>` |
| Milestone scope + waivers | `m<N>/brief.md` |
| Mechanisms | `docs/STACK.md` + `docs/DECISIONS.md` |

## Features and the work DAG

`realize` carves the signed-off flows into **features** — small work units cut from
diagram segments, each in exactly one domain (one repo), recorded as the
`m<N>/features.md` table (`adhd-state.mjs` parses it for the build-order gate — keep
the column layout intact). `Size: S` skips `plan`. Carving rules, the column spec,
and a worked example: [reference/realize.md](reference/realize.md).

## Prototype (on demand)

A clickable, mock-data prototype for a milestone slice when a surface's UX is
genuinely uncertain — never a stage, never a gate. Procedure and topology
(`colocated` `/p/` prefix vs `standalone`):
[reference/prototype.md](reference/prototype.md).

## Hard gates

A stage refuses to run unless every predecessor is satisfied. **No skip. No
override.** Every reference file begins with the gate check:
`node {{scripts_path}}/adhd-state.mjs gate <stage> [--milestone N] [--feature name]`.
If it reports `missing`, HALT and tell the user which predecessor stage to run.

**Violating the letter of the gates is violating the spirit of `adhd`.** A "harmless"
skip is exactly the failure mode it exists to prevent.

### Red flags — STOP

You are about to break a gate if you catch yourself thinking anything in the left
column. Each row means: STOP. Run the gate. Run the missing predecessor stage.

| Rationalization | Reality |
|---|---|
| "Small product / gates are overkill here — skip the groundwork." | Small scope still needs vision + concepts or the build wanders. They run fast at low effort. Run them. |
| "The user clearly wants code now — skip ahead, backfill the stage later." | `adhd`'s value is code that fits a plan; skipping the plan is the exact thing the user invoked it to prevent. And later lacks the context this stage has now — stages are ordered because each feeds the next. |
| "Setup/vision is obvious / I already know the predecessor's output." | The output is a file later stages and fresh sessions read. In-your-head ≠ on disk. Run the stage. |
| "The gate says `missing` but it's a false positive." | The gate checks whether the artifact file exists. If it says missing, the file is missing. Produce the artifact, never fake the check. |
| "I'll create the artifact file now, finish the work after." | Existence IS the done signal — later stages trust it. An empty/stub file is a broken gate. |
| "I'll run the stage from memory, skip its reference file." | The reference owns the gate check, procedure, and completion steps — and it evolves. Load it. |
| "User said go fast / no clarifying questions, so gates don't apply." | That instruction sets pace, not discipline. A gate is not a question. |
| "One `git commit` without an explicit ok is fine, it's clearly wanted." | The commit gate has zero exceptions. Ask first. |

## Management commands

Not stages — callable anytime; only `evolve` carries a gate of its own (groundwork
must be complete, since it mutates the living artifacts). One line each; the
reference owns the procedure:

- `workspace` — multi mode, repo registry, prototype topology, parallel work.
  [reference/workspace.md](reference/workspace.md)
- `adopt` — bring an existing project under `adhd` (substitutes groundwork).
  [reference/adopt.md](reference/adopt.md)
- `verify` — agent-driven content/consistency audit of the artifacts.
  [reference/verify.md](reference/verify.md)
- `evolve` — the single front door for every post-sign-off spec change; sequences
  `concepts → flows` (+ registry) re-runs.
  [reference/evolve.md](reference/evolve.md)
- `park` — capture a not-yet-actionable idea into `project/parking.md`.
  [reference/park.md](reference/park.md)
- `fix` — correct code in place when the spec is right and the code is wrong;
  escalates to `evolve` the moment the spec itself must change.
  [reference/fix.md](reference/fix.md)
- `prototype` — on-demand clickable prototype for an uncertain slice.
  [reference/prototype.md](reference/prototype.md)

The CLI also exposes `migrate` (legacy `state.json` → `config.json`, parking-lot
normalization) and `upgrade` (stamp a pre-flows project `generation: flows` after the
manual upgrade steps). To drop a milestone, delete its `m<N>/` folder; to drop a flow
or feature, edit the markdown.

## Routing

1. **No argument** — orient, validate, route. Run `adhd-state.mjs status` and
   `adhd-state.mjs validate`; print both. Then list `project/work/` — an existing
   work file means a stage is in flight and **that file is the resume pointer**
   (its unchecked `## Left to do` items say where to pick up; its `## Gate` items
   may still need confirmation): load
   [reference/working-memory.md](reference/working-memory.md) and resume there.
   This matters most after an unplanned compaction, when no handoff prompt was
   generated. State where the project sits and restate user intent in one line. If
   `validate` reports blockers, name the fix and HALT. Otherwise name the next
   runnable stage. Stop.
2. **First word is a stage or management command** — the stages are in the table;
   the management commands are above. Load the matching `reference/<name>.md` and
   follow it exactly — it owns the gate check, the procedure, and the completion
   steps. Never run a stage from memory.
3. **First word matches nothing** — treat the input as a task description. Run
   `adhd-state.mjs status`, then route gate-aware:
   - "behavior is wrong or missing in the spec" → `evolve` (diagram corrected first,
     code follows); "code contradicts a signed-off diagram / is buggy or misplaced,
     spec is fine" → `fix`; "this screen needs deeper UI" → on-demand `prototype`;
   - a new idea mid-project → `adhd park` if not yet actionable, `evolve` if
     actionable now (it lands as a flow; a later milestone schedules it); warn if it
     would expand the current milestone — do not hard-block;
   - if the task implies skipping ahead, name the blocking gate instead of running it;
   - state the routing decision, then proceed — confirming first when the task is
     ambiguous or the action mutates files.

If `project/config.json` does not exist, the only runnable stage is `setup`.

## Cross-cutting rules (active in every stage)

- **Hard gates** — see above. Never bypass.
- **The files are the truth** — every fact has exactly one home (table above); never
  pre-create an artifact. `adhd-state.mjs validate` = fast structural sanity (incl.
  flow checks); the `verify` command = agent-driven content judgment.
- **Spec truth lives in the flows** — code follows the diagrams. A contradiction is
  never silently patched on either side: wrong diagram → `evolve`; wrong code →
  `fix`.
- **Confirm before implementing** — the work-file `## Gate` rule (see "Working
  memory"). The two heavy touchpoints per milestone are the `brief` boundary and the
  per-area flow sign-off; `realize` and `review` each open with a light scope ok;
  `build` runs gate-light — its only user interrupts are code-contradicts-diagram
  and the commit gate.
- **Hard read scope (`plan`/`build`)** — the flow slice IS the feature's context;
  whole-product reads are forbidden. The exact read list lives in
  [reference/plan.md](reference/plan.md) / [reference/build.md](reference/build.md).
- **Commit gate** — never `git commit` without the user's explicit "ok" / "lgtm". No
  exceptions: commits are the user's audit trail and publish point — only they decide
  when work is ready to become history.
- **Small steps** — every stage and feature is bounded; split before starting if it
  will not fit cleanly.
- **Effort hints** — each stage carries a suggested reasoning effort; surface it.
- **Fresh sessions** — when a session gets long, run `handoff-prompt.mjs` and hand the
  user the resume prompt (it leads with the active work file and points at
  `parking.md`). `autoCompact: false` recommended.
- **No "MVP"** — never write "MVP" in any artifact or message. Say "Milestone 1" or
  "the first valuable product": MVP framing invites effort-sized, cut-down scoping,
  which contradicts the value-sized, ready-to-use milestone definition.
- **Capability, not mechanism** — product-scope artifacts (`PRODUCT.md`,
  `map.md`, `flows/*`) name capabilities, never stack/framework/
  database/architecture. Flows are logical-altitude.
- **Tech at the latest responsible moment** — `foundation` records only the firm
  baseline in `STACK.md`; every other mechanism is settled by the milestone that
  first needs it (`realize`). `STACK.md` = current state, edited in place;
  `DECISIONS.md` = append-only why-log; `DATA.md` created lazily on first persisted
  data.
- **Baseline guard** — never introduce a stack element absent from `STACK.md` without
  stopping: propose, get the ok, update `STACK.md` + log in `DECISIONS.md`, then use.
  Applies in `realize`, `build`, `fix`, and the on-demand `prototype`.
- **Parking lot** — read `project/parking.md` at the start of every stage; the agent
  writes it only via `adhd park`.

## Sub-skill output routing

`brainstorming` and `writing-plans` default output to `docs/superpowers/` — an
artifact landing there is orphaned outside the canonical layout and breaks
the-files-are-the-truth. Override the path on every invocation: flow files →
`project/flows/<scenario>.md`, surface stubs → `project/surfaces/`, feature plans →
`project/milestones/m<N>/plans/`. Leave
`.superpowers/` (gitignored) and `.impeccable/` (tracked) untouched.

## Common mistakes

Cross-stage operational slips (gate rationalizations are tabled above; stage-local
mistakes live in each stage's reference file, loaded when the stage runs):

| Mistake | Fix |
|---|---|
| Hand-editing `project/config.json`. | Owned by `adhd-state.mjs` — config subcommands only. |
| Letting sub-skills write to their default `docs/superpowers/` paths. | Pass the canonical target on every invocation (see "Sub-skill output routing"). |
| In `multi` mode, writing `project/`/`docs/` artifacts into a code repo. | All artifacts live in the orchestration repo; code repos get only code. |
| Routing a code-only defect through `evolve` (or a spec change through `fix`). | Spec right + code wrong → `fix`. Spec wrong → `evolve`. |

## Scripts

```bash
node {{scripts_path}}/adhd-state.mjs <init|read|status|next|gate|work-gate|validate|migrate|upgrade|preflight-confirm|workspace-mode|workspace-add|workspace-remove|workspace-list|repo-bind|repo-unbind|prototype-topology|prototype-home|contract|closure>
node {{scripts_path}}/handoff-prompt.mjs
```

- `contract <participant>` — derived cross-flow view: receives/sends/guards with flow
  refs.
- `closure <areaId>...` — transitive hard prerequisites off the capability map (the
  `brief` stage's mechanical-closure layer; soft edges surfaced as decide-explicitly).
