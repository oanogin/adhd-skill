---
name: adhd
description: "Use when starting, structuring, or building a software project end-to-end and you want a conductor that front-loads vision, scope, and structure before any code, then forbids skipping ahead. Triggers: /adhd, project kickoff, 'where am I in the build', milestone planning, scope discipline, story backlog, resume after a fresh session, new feature idea raised mid-project, a stage gate refusing to run."
argument-hint: "[stage] [milestone|feature]"
user-invocable: true
license: Apache 2.0
---

`adhd` is a conductor. It front-loads a whole-project view — vision, scope, structure —
then feeds surfaces into `brainstorming` and `impeccable` in the right order, with hard
gates that forbid skipping ahead. It owns sequencing and discipline; the dependency
skills own the work inside each stage.

## Invocation

- `adhd` — report progress (`adhd-state.mjs status`) and name the next runnable stage.
- `adhd <stage>` — run that stage. `<stage>` is one of the table below.
- `adhd <stage> <milestone|feature>` — run a stage for a specific milestone/feature.

On Claude Code, `adhd` is the `/adhd` slash command. On Codex, Cursor, and other
agents there is no slash command — invoke the `adhd` skill directly (load this
`SKILL.md` and follow it) with the stage as the argument. Throughout this skill the
command is written as plain `adhd <stage>`.

## Conventions

**`{{scripts_path}}`** — every command below of the form `node {{scripts_path}}/...`
uses this token. It is the `scripts/` directory of this skill's install directory:
the folder you loaded this `SKILL.md` from, plus `/scripts`. Resolve it **once, now**,
to a real absolute path and substitute it into every such command — never run the
literal `{{scripts_path}}`. On a typical Claude Code global install it is
`~/.claude/skills/adhd/scripts`; under `npx skills` or a plugin install it is wherever
the skill was placed.

## Required-skill preflight (non-optional)

`adhd` hard-depends on two things, with no fallback and no degraded mode:

- the **`superpowers` plugin** — `adhd` invokes `brainstorming` (design stage),
  `writing-plans` (plan stage), and `executing-plans` (build stage) from it.
  The whole plugin is required, not just those three: other superpowers skills
  (e.g. `subagent-driven-development`, `systematic-debugging`) are useful during
  the build stage too.
- the **`impeccable` skill** — UI design for the `design` stage.

Before ANY file mutation, confirm both are available in the current agent.
There is no programmatic probe — self-confirm: state, in the response, that the
`superpowers` plugin and `impeccable` are present and invocable. If either is
missing, name it and HALT. Do not give installation instructions — installing
them is the user's job.

The Setup stage records this: after confirming both dependencies, it runs
`node {{scripts_path}}/adhd-state.mjs preflight-confirm`, which writes
`preflight.skillsConfirmed` in `config.json`.

Codex / Cursor agents must also state this line before mutating files:

```text
ADHD_PREFLIGHT: skills=pass gate=pass|fail:<stage> mutation=open
```

See `reference/codex-tools.md` and `reference/cursor-tools.md` for tool-name mappings.

## The project IS its files

`adhd` keeps no separate state database. The project's state is the `project/` and
`docs/` tree itself:

- **A stage is done the moment its artifact file exists.** `vision` is done when
  `docs/PRODUCT.md` exists; `design` for milestone 2 is done when `m2/design.md`
  exists. There is no status field. So: never create a stage's artifact file until the
  stage is genuinely complete — write drafts to `notes.md`, create the canonical file
  last.
- **`project/config.json`** is the only non-doc file — the irreducible config: `mode`,
  the `repos` registry, `prototypeTopology` + `prototype`, `preflight`. Mutate it only
  through `adhd-state.mjs` config subcommands.
- The agent reads and writes the `.md` artifacts directly. `adhd-state.mjs` is a
  read/derive tool — `status`, `gate`, `next`, `validate`, `audit` — plus the
  `config.json` writers. It does not own the project content.

A project created before this model has a `project/state.json`; run
`node {{scripts_path}}/adhd-state.mjs migrate` to convert it to `config.json`.

## Modes

`adhd` runs in one of two modes, recorded in `project/config.json`:

- **`single`** (default) — `project/` lives at the repo root; all work happens in
  this one repo. `setup` always scaffolds in `single` mode; nothing extra to do.
- **`multi`** — the `project/` tree lives in the repo where `setup` ran (the
  **orchestration repo**); code repos are registered by logical name, and their
  local paths live in a gitignored `project/repos.local.json` (bound per-user).
  Switch to `multi` and register repos with the `workspace` command. In `multi`
  mode the product is also split into user-defined **domains** — logical product
  slices defined during the `map` stage; a milestone may span several domains.

In `multi` mode every `adhd` artifact still lives in the orchestration repo's
`project/` and `docs/`. Only the code-writing stages (`design`, `tracer`, `build`)
reach into a registered code repo, and only to write code there.

## Groundwork and per-milestone work

`adhd` has two phases. **Groundwork** (`setup → vision → stories → foundation → map`)
establishes the product and its structure. It is mostly run once — except `stories`,
which is a **living backlog**: re-run it any time to add or change stories. There is
**no pre-planned roadmap**: `adhd` keeps no list of future milestones.

A **milestone** is a folder, `project/milestones/m<N>/`. It is formed just-in-time:
`milestone-brief` writes `m<N>/brief.md`, and that *is* the milestone. Milestones are
**independent** — there is no global "current milestone" pointer, so two or three can
be in flight at once (see "Working in parallel"). Each runs its own per-milestone loop.

## Canonical layout

The Setup stage scaffolds this exact tree. The tree IS the project state.

```
.ruler/                      agent instructions (ruler generates CLAUDE.md / AGENTS.md)
docs/
  PRODUCT.md                 Vision output — impeccable reads this
  DESIGN.md                  design system — impeccable reads/writes this
  GLOSSARY.md                domain glossary (concepts + relationships) — Map output
  DATA.md                    data model / schema — created lazily when a milestone persists data
  DECISIONS.md               decision log + firm tech baseline — Foundation seeds it
project/
  config.json                the only non-doc file — mode, repos, prototype topology, preflight
  repos.local.json           gitignored — per-user repo→path bindings (multi mode)
  .session.json              gitignored — ephemeral context-watch scratch
  notes.md                   transient scratchpad (healthy = empty)
  stories.md                 Stories — the living story backlog
  map.md                     surface catalog + domains + deployables
  milestones/m<N>/
    brief.md                 Milestone Brief — chosen stories, surfaces, track, security/errors
    surfaces/<name>.md       per-surface Design spec
    design.md                Design sign-off notes
    tracer.md                tracer slice notes (production-track)
    features.md              the feature DAG — a table with Build/Verified columns
    plans/<feature>.md       per-feature implementation Plan (production-track)
    review.md                milestone review-pass findings
    summary.md               Finalize — the milestone summary
```

## Stages

| Stage | Loop | Effort | Artifact (exists ⇔ done) | Sub-skill | Reference |
|---|---|---|---|---|---|
| `setup` | groundwork | low | `project/config.json` | none | [reference/setup.md](reference/setup.md) |
| `vision` | groundwork | high | `docs/PRODUCT.md` | none | [reference/vision.md](reference/vision.md) |
| `stories` | groundwork (living) | medium | `project/stories.md` | none | [reference/stories.md](reference/stories.md) |
| `foundation` | groundwork | medium | a logged decision in `docs/DECISIONS.md` | none | [reference/foundation.md](reference/foundation.md) |
| `map` | groundwork | high | `project/map.md` + `docs/GLOSSARY.md` | none | [reference/map.md](reference/map.md) |
| `milestone-brief` | per-milestone | medium | `m<N>/brief.md` | none | [reference/milestone-brief.md](reference/milestone-brief.md) |
| `design` | per-milestone | high | `m<N>/design.md` + `surfaces/*` + prototype | brainstorming + impeccable | [reference/design.md](reference/design.md) |
| `tracer` | per-milestone (production) | high | `m<N>/tracer.md` + code | none | [reference/tracer.md](reference/tracer.md) |
| `features` | per-milestone (production) | high | `m<N>/features.md` (the DAG) | none | [reference/features.md](reference/features.md) |
| `plan` | per-feature (production) | medium | `m<N>/plans/<feature>.md` | writing-plans | [reference/plan.md](reference/plan.md) |
| `build` | per-feature (production) | medium | code + `Build`/`Verified` in `features.md` | impeccable craft / executing-plans | [reference/build.md](reference/build.md) |
| `review` | per-milestone | high | `m<N>/review.md` | none | [reference/review.md](reference/review.md) |
| `finalize` | per-milestone | low | `m<N>/summary.md` | none | [reference/finalize.md](reference/finalize.md) |

Flow: groundwork runs `setup → vision → stories → foundation → map` (`stories` stays
re-runnable). Then per milestone: `milestone-brief → design`. A **prototype-only**
milestone (`infra: none`) then goes straight to `review → finalize`. A
**production-track** milestone instead continues `tracer → features`, then works
through the feature DAG in dependency order **one feature at a time** — `plan` it then
`build` it before moving to the next feature, not planning them all up front — then
`review → finalize`.

There is no "advance" step. The next milestone is created simply by running
`milestone-brief` again — it writes a new `m<N>/` folder. `adhd-state.mjs status`
shows every milestone's progress; `adhd-state.mjs next --milestone <N>` names the next
stage for a specific one.

## Surfaces

A **surface** is a distinct place something touches the product. Every surface has a
`kind`:

- **`ui`** — a screen or workspace a *person* uses. It is the only kind that appears
  in the clickable prototype.
- **`api`** — a contract another *system* calls. Not visual; never in the prototype.
- **`lib`** — a module other *code* imports. Not visual; never in the prototype.

A `ui` surface is **workspace-sized** — a coherent screen or workspace you would demo
as one unit, not a sub-tab or a single action. Decompose finer detail with **features**
(the per-domain work units the `features` stage produces), never by splitting one
workspace into many surfaces. A milestone's prototype is the handful of `ui` surfaces
it touches, wired together — keep that handful small and coherent.

Surfaces are catalogued in `project/map.md` and selected into a milestone in
`m<N>/brief.md` — plain markdown, authored directly. The `design` stage routes by
`kind`: `ui` → brainstorming for UX then `impeccable` for UI; `api` → brainstorming
then API-contract design; `lib` → brainstorming then a spec.

A surface's production home is the repo it ships from. A `ui` surface's production home
is a frontend repo and **may be undecided** (`TBD`) — that is normal. A `ui` surface is
**not** the prototype: the prototype app is one project-wide app (see "Prototype
topology"), never a surface's production home.

## Features and the work DAG

On a production-track milestone the `features` stage decomposes the milestone's chosen
stories into **features** — small units of implementation work, each scoped to exactly
one domain (one repo). The features live in `m<N>/features.md` as a table:
`ID | Feature | Story | Domain | Repo | Depends on | Build | Verified`. The `Depends
on` edges form a DAG. The DAG is worked **one feature at a time, plan then build**:
`adhd next` returns `plan` for the next workable feature, then `build` for that same
feature, before moving on — so each feature's plan is written against already-built
dependencies, not all features planned up front. `build` is gated on every feature a
feature `Depends on` showing `Build: done` — which is how backend features land before
the frontend features that wire them. `build` fills the `Build` and `Verified` cells as
each feature completes; `review` cannot run until every feature is `Build: done` and
`Verified: yes`.
`adhd-state.mjs` parses this table for the build-order gate — keep the column layout
intact.

## Prototype and production apps

Every `adhd` project builds two apps that coexist even in `single` mode:

- the **prototype app** — the product's UX on mock data, visual and clickable. The
  `design` stage builds each `ui` surface into it and wires the milestone into one
  runnable app the user opens in a browser and validates. It is the persistent,
  always-current UX reference and is never thrown away.
- the **production app** — the real UI on real data and a real backend.

The clickable prototype is built and signed off in `design` — **before** any backend,
data store, or `tracer` decision. It is decoupled from `infra`: every milestone builds it.

Each milestone has a **track**, set at `milestone-brief` from its `infra` field and
written as a `Track:` line in `brief.md`:

- **prototype-only** (`infra: none`) — `milestone-brief → design → review → finalize`.
  The clickable prototype is the deliverable. No `tracer`, no production app, no data
  model, no database.
- **production-track** (any real `infra`) — the same up to `design`, then continues
  `tracer → features → plan → build → review → finalize`.

When real-backend reality contradicts the prototype, `features` updates the prototype
FIRST (via `design`) — it stays the current reference, and the production app is moved
to match it.

### Prototype topology

How the prototype app relates to the production app is a project-level setting,
`prototypeTopology` in `config.json`:

- **`colocated`** (default) — the prototype lives in the **same codebase and framework
  as the production app**, under the **`/p/` route prefix**. A production surface at
  `/<path>` has its prototype at `/p/<path>`.
- **`standalone`** — the prototype is its **own app**, separate from production, with
  its own repo and possibly its own framework. There is no `/p/` prefix. Its location
  is recorded once, project-wide, in `config.json`'s `prototype` (`repo` + `subpath`).

`setup` scaffolds `colocated`. Switch with the `workspace` command:
`adhd-state.mjs prototype-topology standalone`, then `adhd-state.mjs prototype-home
--repo <name> --subpath <path>` (`--repo` names a registered repo, or is omitted to
mean the orchestration repo).

## Hard gates

A stage refuses to run unless every predecessor is satisfied. **No skip. No override.**
This is the skill's central discipline.

Every stage's reference file begins with a gate check:
`node {{scripts_path}}/adhd-state.mjs gate <stage> [--milestone N] [--feature name]`.
The gate checks whether the predecessor **artifact files exist** (and, for `build`,
parses `features.md` for dependency order). If it reports `missing`, HALT and tell the
user which predecessor stage to run.

**Violating the letter of the gates is violating the spirit of `adhd`.** A "harmless"
skip is exactly the failure mode it exists to prevent.

### Red flags — STOP

You are about to break a gate if you catch yourself thinking any of these:

- "The user clearly wants code, I'll skip ahead and backfill the stage later."
- "This project is small / just a prototype, gates are overkill here."
- "Setup/vision is obvious, I'll start a stage or two in."
- "The gate says `missing` but I already know the answer in my head."
- "I'll create the artifact file now and finish the stage's work after."
- "I'll run the stage but skip its reference file — I remember the procedure."
- "User said go fast / no clarifying questions, so gates don't apply."
- "One `git commit` without an explicit ok is fine, it's clearly wanted."

Each of these means: STOP. Run the gate. Run the missing predecessor stage.

### Rationalization table

| Excuse | Reality |
|---|---|
| "It's a prototype — skip the groundwork." | Prototype scope still needs vision + stories or the build wanders. They run fast at low effort. Run them. |
| "User wants code now." | `adhd`'s value is code that fits a plan. Skipping the plan is the exact thing the user invoked `adhd` to prevent. |
| "I know the predecessor's output — no need to run it." | The output is a file later stages and fresh sessions read. In-your-head ≠ on disk. Run the stage. |
| "'No clarifying questions' means skip gates." | That instruction sets pace, not discipline. A gate is not a question. |
| "The gate is a false positive." | The gate checks whether the artifact file exists. If it says missing, the file is missing. Produce the artifact, never fake the check. |
| "I'll create the file now, finish the work later." | The artifact's existence IS the done signal — later stages and gates trust it. An empty/stub file is a broken gate. Create it only when the stage is truly complete. |
| "I'll backfill the skipped stage afterward." | Later lacks the context this stage has now. Stages are ordered because each feeds the next. |
| "One commit without explicit ok is harmless." | The commit gate has zero exceptions. Ask first. |

## Working in parallel

Milestones are independent `m<N>/` folders with no shared pointer, so several can be
in flight at once. Within a production milestone, `plan`/`build` run per feature, and
the `features.md` DAG marks which features are independent — those parallelize. Three
people = three independent features (or three milestones).

- **Code** goes on git branches per feature, per repo — normal PR flow.
- **The orchestration `project/` tree** is shared coordination state — keep its
  `.md` edits on one branch. Different `m<N>/` folders and different `features.md`
  files rarely collide; `config.json` changes rarely. There is no single mutated
  state file to fight over.
- A feature's `build` gate blocks until its dependency features are built — the DAG
  enforces order across people automatically.

## Management commands

These are not stages — they have no gates and no place in the stage flow:

- `workspace` — switch a project to `multi` mode, register code repos, and set the
  prototype topology. See [reference/workspace.md](reference/workspace.md).
- `adopt` — bring an existing project under `adhd`; substitutes for the groundwork
  loop. See [reference/adopt.md](reference/adopt.md).

The CLI also exposes `migrate` (convert a legacy `state.json` to `config.json`) and
`audit` (a content check across the `.md` artifacts — see Cross-cutting rules). To
drop a milestone, delete its `m<N>/` folder; to drop a surface or feature, edit the
markdown — there are no special commands.

## Routing

1. **No argument** — orient, validate, route. Run `adhd-state.mjs status` and
   `adhd-state.mjs validate`; print both. State where the project sits in the flow
   and restate user intent in one line. If `validate` reports blockers, name the
   fix and HALT. Otherwise name the next runnable stage. Stop.
2. **First word is a stage or a management command** — the 13 stages are in the
   table above; `workspace` and `adopt` are management commands. Load the matching
   `reference/<name>.md` and follow it exactly. The reference owns the gate check
   (stages), the procedure, and the completion steps.
3. **First word matches nothing** — treat the whole input as a task description.
   Run `adhd-state.mjs status`, then select the stage or management command that
   fits the task, gate-aware:
   - route the task to the stage that addresses it (e.g. "this API needs
     designing" → `design` for that milestone);
   - if the task implies skipping ahead, name the gate blocking it instead of
     running it;
   - if it is a new story idea raised mid-project, file it to `stories.md` and
     apply the milestone-discipline soft-warn;
   - state the routing decision, then proceed — confirming with the user first
     when the task is ambiguous or the action mutates files.

If `project/config.json` does not exist, the only runnable stage is `setup`.

## Cross-cutting rules (active in every stage)

- **Hard gates** — see above. Never bypass.
- **The files are the truth** — every fact has exactly one home. `config.json` holds
  the non-doc config; everything else is a `.md` artifact. A stage's artifact file is
  the sole record that the stage ran — there is no second status store, so never
  pre-create an artifact. Run `node {{scripts_path}}/adhd-state.mjs audit` to catch
  drift, orphans, and misplaced info across the markdown.
- **Effort hints** — each stage carries a suggested reasoning effort; surface it to the user.
- **Context watch** — after each stage run `context-watch.mjs`; if it advises a fresh
  session, run `handoff-prompt.mjs` and give the user the resume prompt.
- **Handoff prompts** — on a session switch, the resume prompt always says "read
  `project/notes.md` first".
- **Small steps** — every stage and feature is bounded. If a step will not fit cleanly,
  split it before starting.
- **Commit gate** — NEVER run `git commit` without the user's explicit "ok" / "lgtm".
  No exceptions.
- **Milestone discipline (soft warn)** — once a milestone is in flight, a new feature
  idea is filed to `stories.md` (re-run `stories`), to be picked up by a future
  `milestone-brief`. Warn when an idea would expand the current milestone; do not
  hard-block.
- **No "MVP"** — never write "MVP" in any `adhd` artifact or message. The term is vague
  and smuggles in scope assumptions. Say "Milestone 1" or "the first valuable product".
- **Capability, not mechanism** — the product-scope stages (`vision`, `stories`, `map`)
  describe *what the product does* in capability terms ("data persists", "users sign
  in"). They never name a mechanism — no stack, framework, database, or architecture.
  The firm tech baseline is logged by `foundation` in `docs/DECISIONS.md`; per-feature
  mechanisms are settled at `tracer`.
- **Tech at the latest responsible moment** — `foundation` records only the firm,
  known-from-the-start baseline (languages, frontend framework, repo topology). Every
  other stack/architecture decision is made by the milestone that first needs the
  capability, never earlier, and logged in `docs/DECISIONS.md`. The data model lives in
  `docs/DATA.md`, created lazily the first time a milestone persists real data.
- **notes.md discipline** — `project/notes.md` is a transient scratchpad, read first
  every session, healthy when empty. Migrate anything durable to its canonical home
  (`DECISIONS.md`, `GLOSSARY.md`, `DATA.md`, a surface spec, `.ruler/`).

## Sub-skill output routing

`brainstorming` and `writing-plans` default their durable output to
`docs/superpowers/specs/` and `docs/superpowers/plans/`. `adhd` overrides this on
every invocation: surface specs go to `project/milestones/m<N>/surfaces/`, feature
plans to `project/milestones/m<N>/plans/`. Always pass the canonical target path when
invoking a sub-skill. Leave `.superpowers/` and `.impeccable/` untouched — Setup
gitignores `.superpowers/`; `.impeccable/` stays tracked in git.

## Common mistakes

These are operational slips, not gate-skipping (gate rationalizations are tabled above).

| Mistake | Fix |
|---|---|
| Hand-editing `project/config.json`. | It is owned by `adhd-state.mjs`. Mutate it only through the config subcommands. |
| Creating a stage's artifact file before the stage's work is complete. | Existence = done. Draft in `notes.md`; create the canonical file last. |
| Running a stage from memory, skipping its `reference/<stage>.md`. | Always load the reference file — it owns the gate check, procedure, and completion steps. |
| Letting sub-skills write to their default `docs/superpowers/` paths. | Pass the canonical target on every invocation — specs to `project/milestones/m<N>/surfaces/`, plans to `.../plans/`. |
| Treating `project/notes.md` as durable storage. | It is a transient scratchpad. Migrate durable facts to `DECISIONS.md`, `GLOSSARY.md`, a surface spec, or `.ruler/`. Healthy `notes.md` is empty. |
| Invoking `impeccable` for an `api` or `lib` surface. | `impeccable` runs only for `ui` surfaces. `api` → contract design; `lib` → spec only. |
| Breaking the `features.md` column layout. | `adhd-state.mjs` parses that table for the build-order gate — keep `ID | Feature | Story | Domain | Repo | Depends on | Build | Verified`. |
| In `multi` mode, writing `project/` or `docs/` artifacts into a code repo. | All `adhd` artifacts live in the orchestration repo. Only the code-writing stages (`design`, `tracer`, `build`) touch a registered code repo, and only to write code. |
| Bolting a mid-project story idea onto the current milestone. | File it to `stories.md` and let a future `milestone-brief` pick it up. Soft-warn if it would expand the current milestone. |
| Building a feature before its `Depends on` features. | The DAG order is enforced by the `build` gate — build the dependency features first. |
| Building a `ui` surface's production code into the prototype app (or vice versa). | Under `standalone` topology they are different repos. `design` writes the prototype app; `build` writes the feature's production `repo`. |

## Scripts

```bash
node {{scripts_path}}/adhd-state.mjs <init|read|status|next|gate|validate|audit|migrate|session-add|session-reset|preflight-confirm|workspace-mode|workspace-add|workspace-remove|workspace-list|repo-bind|repo-unbind|prototype-topology|prototype-home>
node {{scripts_path}}/context-watch.mjs [--next <stage>]
node {{scripts_path}}/handoff-prompt.mjs
```
