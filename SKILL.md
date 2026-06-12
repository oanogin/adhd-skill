---
name: adhd
description: "Use when starting, structuring, or building a software project end-to-end and you want a conductor that front-loads vision, scope, and structure before any code, then forbids skipping ahead. Triggers: /adhd, project kickoff, 'where am I in the build', milestone planning, scope discipline, story backlog, resume after a fresh session, new feature idea raised mid-project, a bugfix or in-place code correction on an adhd project, a stage gate refusing to run."
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

- the **`superpowers` plugin** — `adhd` invokes `brainstorming` (stories, prototype,
  evolve, and park), `writing-plans` (plan stage), and `executing-plans` (build stage)
  from it.
  The whole plugin is required, not just those three: other superpowers skills
  (e.g. `subagent-driven-development`, `systematic-debugging`) are useful during
  the build stage too.
- the **`impeccable` skill** — UI design for the `prototype` (groundwork) and
  `ux-refine` (per-milestone) stages.

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
  `docs/PRODUCT.md` exists; `ux-refine` for milestone 2 is done when `m2/ux-refine.md`
  exists. There is no status field. So: never create a stage's artifact file until the
  stage is genuinely complete — write drafts to the stage's `project/work/<stage>.md`,
  create the canonical file last.
- **`project/config.json`** is the only non-doc file — the irreducible config: `mode`,
  the `repos` registry, `prototypeTopology` + `prototype`, `preflight`. Mutate it only
  through `adhd-state.mjs` config subcommands.
- The agent reads and writes the `.md` artifacts directly. `adhd-state.mjs` is a
  read/derive tool — `status`, `gate`, `next`, `validate` — plus the
  `config.json` writers. It does not own the project content.

A project created before this model has a `project/state.json`; run
`node {{scripts_path}}/adhd-state.mjs migrate` to convert it to `config.json`. The same
command also normalizes a project to the parking-lot model: it scaffolds
`project/parking.md` if missing and removes a `project/notes.md` that is empty (a
non-empty `notes.md` is kept so you can drain it to a canonical home first, then delete
it).

## Modes

`adhd` runs in one of two modes, recorded in `project/config.json`:

- **`single`** (default) — `project/` lives at the repo root; all work happens in
  this one repo. `setup` always scaffolds in `single` mode; nothing extra to do.
- **`multi`** — the `project/` tree lives in the repo where `setup` ran (the
  **orchestration repo**); code repos are registered by logical name, and their
  local paths live in a gitignored `project/repos.local.json` (bound per-user).
  Switch to `multi` and register repos with the `workspace` command. In `multi`
  mode the product is also split into user-defined **domains** — logical product
  slices defined during the `prototype` stage; a milestone may span several domains.

In `multi` mode every `adhd` artifact still lives in the orchestration repo's
`project/` and `docs/`. Only the code-writing stages (`prototype`, `ux-refine`,
`tracer`, `build`) reach into a registered code repo, and only to write code there.

## Groundwork and per-milestone work

`adhd` has two phases. **Groundwork** (`setup → vision → foundation → concepts →
stories → prototype`) establishes the product and its structure. `stories` is derived
from `concepts` — it is the scope spec and soft roadmap carved out of the ubiquitous
language. `prototype` is the terminal groundwork stage: it builds a Hi-Fi, clickable,
mock-data app for the entire product, realising the story backlog and completing the
`Surfaces` column for every story (`stories` may seed obvious names — a `?` suffix
marks a not-yet-prototyped surface; a story with no confirmed surface cannot be
selected at `milestone-brief`). It is mostly run once — except `concepts`, `stories`,
and `prototype`, which are **living**: re-run `concepts` to evolve the ubiquitous
language, `stories` to add or change stories, and `prototype` to evolve the
whole-product flow. All three can be re-run post-groundwork through the on-demand
`evolve` conductor, which sequences their re-runs in the right order. There is still
**no pre-planned roadmap** — `adhd` keeps no list of future milestones — but the
whole-product prototype is the shared **soft roadmap** the milestones are carved out of.

A **milestone** is a folder, `project/milestones/m<N>/`. It is formed just-in-time:
`milestone-brief` writes `m<N>/brief.md`, and that *is* the milestone. Milestones are
**independent** — there is no global "current milestone" pointer, so two or three can
be in flight at once (see "Working in parallel"). Each runs its own per-milestone loop.

## Working memory (high-effort stages)

`adhd` keeps two non-canonical stores. **Transient working memory** lives in
`project/work/*.md` — high-effort stages get a `project/work/<stage>.md` (milestone form
`project/work/m<N>-<stage>.md`), and any ad-hoc, session-scoped task may get a
freely-named `project/work/<task>.md`. All of `project/work/` is gitignored; each file is
drained to its canonical home and deleted when the work is done. **Durable not-yet-actionable
info** lives in `project/parking.md` — see "The parking lot" below. Medium/low stages
(including `build` — its plan already is the memory) create no work file.

Every high-effort stage (`vision`, `concepts`, `prototype`, `evolve`, `ux-refine`,
`tracer`, `features`, `review`) creates its work file as its first procedure step (a
discipline the stage follows, not a script-enforced step).

The file has three light zones:

```
## Gate            ← required user confirmations; machine-checked before implementation
## Left to do      ← checklist; unchecked items are the resume pointer
## Log             ← free-form, newest last: what was done / what failed / decisions
```

Write to it as the work proceeds, so a session that ends mid-stage resumes cleanly.
It is **transient scratch — never a source of truth**. On stage
completion, drain durable facts to their canonical home (`DECISIONS.md`, `STACK.md`,
`CONCEPTS.md`, `DATA.md`, a surface spec, `.ruler/`) and **delete** the file. `project/work/` is
gitignored; the `verify` pass flags any work file whose stage is already done.
`handoff-prompt.mjs` reads the active work file and leads the resume prompt with it.

### The parking lot — durable, not-yet-actionable info

`project/parking.md` is the durable, committed buffer for ideas and details that are
clarified but **not yet ready to implement** — arch sketches, deferred decisions, things
to discuss later. Unlike the transient stores, it is never drained to empty and survives
across sessions: an item lives there precisely because it is still pending, and the user
removes it once it is implemented. It is free-form (prose, mermaid, code) and **user-owned**:
the agent never writes to it on a standing rule — the only agent write path is the
user-invoked `adhd park` command. Before starting any stage or feature, read
`project/parking.md` if it is non-empty and fold anything relevant into the current work;
`adhd-state.mjs gate` prints a non-blocking `note:` when it has content.

### The `## Gate` zone — confirm before you implement (hard rule)

Every work file carries a `## Gate` block: the requirements/direction the user must
**confirm before the stage produces its output artifact or writes any implementation.**
This is the discipline that stops an agent from charging into the wrong work and forces
the clarification step that is otherwise skipped (especially on Codex / Cursor).

Each gate item is one line, satisfied **only** when it is checked AND records the user's
verbatim ok in parentheses:

```
## Gate
- [ ] requirements-confirmed — user confirmed scope/direction before implementation
- [ ] <item> — <what this item confirms>
```

→ once the user confirms:

```
- [x] requirements-confirmed — scope/direction confirmed (yes, that's right — go)
- [x] <item> — confirmed (<user's verbatim words>)
```

**Rule, every high-effort stage:**

1. **Seed** the `## Gate` block as the first procedure step (when you create the work
   file). It MUST contain at least `requirements-confirmed`. A stage with a per-item loop
   (e.g. `prototype` per `ui` surface) adds one gate line per item.
2. **Clarify, then confirm.** Gather the requirements with the user. Mark an item `[x]`
   with their verbatim ok ONLY after they actually confirm — never pre-check, never
   invent the words.
3. **Check the gate before implementing.** Before the implementation/output-producing
   steps, run:
   ```bash
   node {{scripts_path}}/adhd-state.mjs work-gate <stage> [--milestone N] [--item <id>]
   ```
   It returns `pass` only when the targeted gate items are checked **and** carry the
   verbatim confirmation. If it reports `missing`, **HALT** — go back and clarify. No
   skip. Fail-closed: a missing work file, an absent `## Gate` block, or a bare `[x]`
   without the parenthetical all fail.

The gate lives in the transient work file (gitignored, deleted on completion), so it
never pollutes the stable docs. The durable record of *what was decided* still migrates
to its canonical home on completion, as usual. Honest limit: the agent writes the
checkbox, so this cannot make confirmation physically impossible to fake — it makes a
skip an **explicit, auditable** line instead of a silent freelance, and on a compliant
harness it reliably forces the real clarification.

## Canonical layout

The Setup stage scaffolds this exact tree. The tree IS the project state.

```
.ruler/                      agent instructions (ruler generates CLAUDE.md / AGENTS.md)
docs/
  PRODUCT.md                 Vision output — impeccable reads this
  DESIGN.md                  design system — impeccable reads/writes this
  CONCEPTS.md                ubiquitous language — entities, ER relationships, helicopter view — Concepts output
  DATA.md                    data model / schema — created lazily when a milestone persists data
  STACK.md                   the CURRENT tech stack + approved libraries — Foundation authors it,
                             edited in place as the stack evolves (always-current state, no history)
  DECISIONS.md               append-only decision log — WHY each stack/arch choice was made;
                             every STACK.md change gets an entry here
project/
  config.json                the only non-doc file — mode, repos, prototype topology, preflight
  repos.local.json           gitignored — per-user repo→path bindings (multi mode)
  parking.md                 durable, user-owned buffer for not-yet-actionable ideas (committed)
  work/<stage>.md            gitignored — per-task working memory (high-effort stages);
                             milestone form `m<N>-<stage>.md`; deleted on completion
  work/evolve.md             gitignored — transient impact plan for the evolve conductor;
                             deleted (drained) when evolve is done
  prototype.md               Prototype sign-off — whole-product UX flow & rules (done artifact)
  map.md                     surface catalog + domains + deployables (Prototype output)
  surfaces/<name>.md         project-wide surface spec (Prototype output)
  stories.md                 Stories — the living story backlog (derived from concepts);
                             includes a `Surfaces` column seeded here when obvious
                             (`?` = provisional), completed by the `prototype` stage
  milestones/m<N>/
    brief.md                 Milestone Brief — chosen stories, surfaces, track, security/errors
    surfaces/<name>.md       per-milestone refined surface spec
    ux-refine.md             UX Refine sign-off notes (this milestone's slice)
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
| `foundation` | groundwork | medium | `docs/STACK.md` (+ the baseline decision logged in `docs/DECISIONS.md`) | none | [reference/foundation.md](reference/foundation.md) |
| `concepts` | groundwork (living) | high | `docs/CONCEPTS.md` | brainstorming | [reference/concepts.md](reference/concepts.md) |
| `stories` | groundwork (living) | medium | `project/stories.md` (derived from concepts; includes `Surfaces` column) | brainstorming | [reference/stories.md](reference/stories.md) |
| `prototype` | groundwork (living) | high | `project/prototype.md` + `project/map.md` + prototype app | brainstorming + impeccable | [reference/prototype.md](reference/prototype.md) |
| `evolve` | groundwork (on-demand conductor) | high | — (done when `project/work/evolve.md` drained/deleted) | brainstorming | [reference/evolve.md](reference/evolve.md) |
| `milestone-brief` | per-milestone | medium | `m<N>/brief.md` | none | [reference/milestone-brief.md](reference/milestone-brief.md) |
| `ux-refine` | per-milestone | high | `m<N>/ux-refine.md` + `surfaces/*` + prototype slice | impeccable (+ brainstorming) | [reference/ux-refine.md](reference/ux-refine.md) |
| `tracer` | per-milestone (production) | high | `m<N>/tracer.md` + code | none | [reference/tracer.md](reference/tracer.md) |
| `features` | per-milestone (production) | high | `m<N>/features.md` (the DAG) | none | [reference/features.md](reference/features.md) |
| `plan` | per-feature (production) | medium | `m<N>/plans/<feature>.md` (skipped for `Size: S` features) | writing-plans | [reference/plan.md](reference/plan.md) |
| `build` | per-feature (production) | medium | code + `Build`/`Verified` in `features.md` | impeccable craft / executing-plans | [reference/build.md](reference/build.md) |
| `review` | per-milestone | high | `m<N>/review.md` | none | [reference/review.md](reference/review.md) |
| `finalize` | per-milestone | low | `m<N>/summary.md` | none | [reference/finalize.md](reference/finalize.md) |

Flow: groundwork runs `setup → vision → foundation → concepts → stories → prototype`
(`concepts`, `stories`, and `prototype` stay re-runnable; `evolve` is the on-demand
conductor that sequences their re-runs post-groundwork). Then per milestone:
`milestone-brief → ux-refine`. A
**prototype-only** milestone (`infra: none`) then goes straight to `review → finalize`.
A **production-track** milestone instead continues `tracer → features`, then works
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

Surfaces are catalogued in `project/map.md` (authored by the `prototype` stage) and
selected into a milestone in `m<N>/brief.md` — plain markdown, authored directly. The
`prototype` stage routes by `kind`: `ui` → brainstorming for UX then `impeccable` for
UI; `api` → brainstorming then API-contract design; `lib` → brainstorming then a spec.
Per milestone, `ux-refine` deepens only the chosen surfaces' detail.

A surface's production home is the repo it ships from. A `ui` surface's production home
is a frontend repo and **may be undecided** (`TBD`) — that is normal. A `ui` surface is
**not** the prototype: the prototype app is one project-wide app (see "Prototype
topology"), never a surface's production home.

## Features and the work DAG

On a production-track milestone the `features` stage decomposes the milestone's chosen
stories into **features** — small units of implementation work, each scoped to exactly
one domain (one repo). The features live in `m<N>/features.md` as a table:
`ID | Feature | Story | Domain | Repo | Size | Depends on | Build | Verified`. The
`Depends on` edges form a DAG. The DAG is worked **one feature at a time, plan then
build**: `adhd next` returns `plan` for the next workable feature, then `build` for
that same feature, before moving on — so each feature's plan is written against
already-built dependencies, not all features planned up front. `Size` is `S`/`M`/`L`:
a **`Size: S` feature skips `plan` entirely** — small, fully specified by its surface
spec + row, built directly (`adhd next` goes straight to `build`; an empty cell counts
as `M`). `build` is gated on every feature a
feature `Depends on` showing `Build: done` — which is how backend features land before
the frontend features that wire them. `build` fills the `Build` and `Verified` cells as
each feature completes; `review` cannot run until every feature is `Build: done` and
`Verified: yes`. Review findings that need substantial work are appended to this same
table as new feature rows (e.g. `f-rev-1`) and worked through the same machinery.
`adhd-state.mjs` parses this table for the build-order gate — keep the column layout
intact.

## Prototype and production apps

Every `adhd` project builds two apps that coexist even in `single` mode:

- the **prototype app** — the product's UX on mock data, visual and clickable. The
  groundwork `prototype` stage builds **every `ui` surface of the whole product** into
  it and wires them into one runnable app the user opens in a browser and signs off —
  before any milestone exists. Per milestone, `ux-refine` deepens only that milestone's
  slice. It is the persistent, always-current UX reference and is never thrown away.
- the **production app** — the real UI on real data and a real backend.

The clickable prototype is built and signed off in the groundwork `prototype` stage —
**before** any stories, any milestone, any backend, data store, or `tracer` decision. It
is decoupled from `infra`: it exists for the whole product up front, and every milestone
refines its own slice.

Each milestone has a **track**, set at `milestone-brief` from its `infra` field and
written as a `Track:` line in `brief.md`:

- **prototype-only** (`infra: none`) — `milestone-brief → ux-refine → review → finalize`.
  The refined prototype slice is the deliverable. No `tracer`, no production app, no data
  model, no database.
- **production-track** (any real `infra`) — the same up to `ux-refine`, then continues
  `tracer → features → plan → build → review → finalize`.

> **Naming note.** The milestone **track** value `prototype` (a prototype-only
> milestone) is distinct from the groundwork **stage** named `prototype` (which builds
> the whole-product prototype app). Same word, different namespaces: a `Track: prototype`
> milestone still runs `ux-refine`, never the groundwork `prototype` stage.

When real-backend reality contradicts the prototype, the prototype is updated FIRST and
the production app is moved to match it: a milestone-slice contradiction is fixed via
`ux-refine`; a whole-product flow or rule contradiction is fixed by re-running the
groundwork `prototype` stage. The prototype always stays the current reference.

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
parses `features.md` for dependency order and `Size`; for `finalize`, parses
`m<N>/review.md` for open `critical` findings). If it reports `missing`, HALT and tell
the user which predecessor stage to run.

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
in flight at once. Parallel milestones are a **team** feature: the model is **one
developer per milestone** — one person never juggles two milestones at once. Within a
production milestone, `plan`/`build` run per feature, and
the `features.md` DAG marks which features are independent — those parallelize. Three
people = three independent features (or three milestones).

- **Code** goes on git branches per feature, per repo — normal PR flow.
- **The prototype app** is shared code, handled the same way: each milestone's
  `ux-refine` changes go on that milestone's branch and merge via normal PR flow.
  `ux-refine` only touches its own milestone's surfaces (a hard rule), so overlap is
  limited to the shared shell — navigation, routing, mock state — which git merges
  like any other shared code.
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
- `verify` — an agent-driven consistency & quality audit of the `.md` artifacts: a
  read-only sub-agent reports drift, contradictions, and determinism issues and proposes
  edits for your approval. Replaces the old script content-audit. See
  [reference/verify.md](reference/verify.md).
- `evolve` — the single front door for every post-groundwork change to concepts,
  stories, or the whole-product prototype. It is an on-demand conductor (gate =
  groundwork complete / prototype done) that sequences re-runs of the living stages
  in the right order. It has no canonical artifact: done means its work file
  `project/work/evolve.md` is drained and deleted. See
  [reference/evolve.md](reference/evolve.md).
- `park` — capture a not-yet-actionable idea or detail into the durable parking lot
  `project/parking.md`, after a full brainstorming clarify. No gate; callable anytime;
  it captures only and never implements. See [reference/park.md](reference/park.md).
- `fix` — correct existing code in place: a bug, misplaced handlers/files, a convention
  violation, a behavior-preserving refactor. For when the **spec is right and the code
  is wrong** — no milestone, no `evolve` ceremony. The moment the spec itself needs to
  change, it escalates to `evolve`. See [reference/fix.md](reference/fix.md).

The CLI also exposes `migrate` (convert a legacy `state.json` to `config.json`, and
normalize an old project to the parking-lot model — scaffold `project/parking.md`, drop
an empty `project/notes.md`, keep a non-empty one for manual draining).
Content/consistency auditing is the agent-driven `verify` command (see
[reference/verify.md](reference/verify.md)), not a script. To drop a milestone, delete
its `m<N>/` folder; to drop a surface or feature, edit the markdown — there are no
special commands.

## Routing

1. **No argument** — orient, validate, route. Run `adhd-state.mjs status` and
   `adhd-state.mjs validate`; print both. State where the project sits in the flow
   and restate user intent in one line. If `validate` reports blockers, name the
   fix and HALT. Otherwise name the next runnable stage. Stop.
2. **First word is a stage or a management command** — the 14 stages are in the
   table above; `workspace`, `adopt`, `verify`, `evolve`, `park`, and `fix` are
   management/on-demand commands. Load the matching
   `reference/<name>.md` and follow it exactly. The reference owns the gate check
   (stages), the procedure, and the completion steps.
3. **First word matches nothing** — treat the whole input as a task description.
   Run `adhd-state.mjs status`, then select the stage or management command that
   fits the task, gate-aware:
   - route the task to the stage that addresses it (e.g. "this milestone's screen
     needs deeper UI" → `ux-refine` for that milestone; "the product flow is wrong" →
     `evolve`, which sequences the `prototype` re-run; "this code is buggy /
     misplaced, the spec is fine" → `fix`);
   - if the task implies skipping ahead, name the gate blocking it instead of
     running it;
   - if it is a new story idea raised mid-project, route it through `evolve` (the
     single front door — it files the story to `stories.md` and sequences any surface
     work) and apply the milestone-discipline soft-warn;
   - state the routing decision, then proceed — confirming with the user first
     when the task is ambiguous or the action mutates files.

If `project/config.json` does not exist, the only runnable stage is `setup`.

## Cross-cutting rules (active in every stage)

- **Hard gates** — see above. Never bypass.
- **The files are the truth** — every fact has exactly one home. `config.json` holds
  the non-doc config; everything else is a `.md` artifact. A stage's artifact file is
  the sole record that the stage ran — there is no second status store, so never
  pre-create an artifact. Run the agent-driven `verify` pass (see
  [reference/verify.md](reference/verify.md)) to catch drift, orphans, and misplaced
  info across the markdown; `adhd-state.mjs validate` covers fast, structural sanity
  (legacy state, config version, repo bindings, DAG cycles).
- **Effort hints** — each stage carries a suggested reasoning effort; surface it to the user.
- **Fresh sessions** — when a session gets long, start a fresh one: run
  `handoff-prompt.mjs` and give the user the resume prompt. You control compaction
  (`autoCompact: false` recommended); the work-file + handoff make resume clean.
- **Handoff prompts** — on a session switch, the resume prompt leads with the active
  work file (if any) and points at `project/parking.md`.
- **Confirm before implementing (work-file gate)** — every high-effort stage records
  the user's confirmed requirements in its work file's `## Gate` block and verifies them
  with `adhd-state.mjs work-gate <stage>` BEFORE producing its output artifact or writing
  implementation. If the gate reports `missing`, HALT and clarify. No skip. See "Working
  memory → The `## Gate` zone".
- **Small steps** — every stage and feature is bounded. If a step will not fit cleanly,
  split it before starting.
- **Commit gate** — NEVER run `git commit` without the user's explicit "ok" / "lgtm".
  No exceptions.
- **Milestone discipline (soft warn)** — once a milestone is in flight, a new feature
  idea enters through `adhd evolve` (which files it to `stories.md` and sequences any
  surface work), to be picked up by a future `milestone-brief`. Warn when an idea would
  expand the current milestone; do not hard-block.
- **No "MVP"** — never write "MVP" in any `adhd` artifact or message. The term is vague
  and smuggles in scope assumptions. Say "Milestone 1" or "the first valuable product".
- **Capability, not mechanism** — the product-scope artifacts (`docs/PRODUCT.md`,
  `project/stories.md`, `project/map.md`) describe *what the product does* in capability
  terms ("data persists", "users sign in"). They never name a mechanism — no stack,
  framework, database, or architecture. (The prototype *app* itself is the exception: it
  is real code, so it legitimately uses the frontend framework chosen at `foundation` —
  but `map.md`, the sitemap it is built from, stays capability-level.) The current tech
  stack lives in `docs/STACK.md` (authored by `foundation`); per-feature mechanisms are
  settled at `tracer`.
- **Tech at the latest responsible moment** — `foundation` records only the firm,
  known-from-the-start baseline (languages, frontend framework, repo topology, approved
  libraries) in `docs/STACK.md`. Every other stack/architecture decision is made by the
  milestone that first needs the capability, never earlier. `docs/STACK.md` is the
  always-current state — update it in place; `docs/DECISIONS.md` is the append-only log
  — every STACK.md change gets an entry there with its rationale. The data model lives
  in `docs/DATA.md`, created lazily the first time a milestone persists real data.
- **Baseline guard** — never introduce a framework, library, or stack element that is
  not in `docs/STACK.md` without stopping first: propose it, get the user's ok, update
  `STACK.md`, and log the decision in `docs/DECISIONS.md` — then use it. Applies in
  every code-writing stage (`prototype`, `ux-refine`, `tracer`, `build`, `fix`).
- **Parking lot discipline** — `project/parking.md` is the durable, user-owned buffer
  for not-yet-actionable ideas; read it at the start of each stage and fold anything
  relevant in. The agent writes it only via `adhd park`. Work-file scratch
  (`project/work/<stage>.md`) is transient: drain and delete on stage completion.

## Sub-skill output routing

`brainstorming` and `writing-plans` default their durable output to
`docs/superpowers/specs/` and `docs/superpowers/plans/`. `adhd` overrides this on
every invocation: project-wide surface specs (from the groundwork `prototype` stage) go
to `project/surfaces/`, per-milestone refined surface specs (from `ux-refine`) go to
`project/milestones/m<N>/surfaces/`, and feature plans go to
`project/milestones/m<N>/plans/`. Always pass the canonical target path when invoking a
sub-skill. Leave `.superpowers/` and `.impeccable/` untouched — Setup gitignores
`.superpowers/`; `.impeccable/` stays tracked in git.

## Common mistakes

These are operational slips, not gate-skipping (gate rationalizations are tabled above).

| Mistake | Fix |
|---|---|
| Hand-editing `project/config.json`. | It is owned by `adhd-state.mjs`. Mutate it only through the config subcommands. |
| Creating a stage's artifact file before the stage's work is complete. | Existence = done. Draft in the stage's `project/work/<stage>.md`; create the canonical file last. |
| Running a stage from memory, skipping its `reference/<stage>.md`. | Always load the reference file — it owns the gate check, procedure, and completion steps. |
| Letting sub-skills write to their default `docs/superpowers/` paths. | Pass the canonical target on every invocation — project-wide specs to `project/surfaces/`, milestone specs to `project/milestones/m<N>/surfaces/`, plans to `.../plans/`. |
| Treating `project/parking.md` as a dumping ground the agent fills. | It is user-owned. The agent writes it only via `adhd park`. Items are pending-until-implemented; the user removes them when done. |
| Invoking `impeccable` for an `api` or `lib` surface. | `impeccable` runs only for `ui` surfaces. `api` → contract design; `lib` → spec only. |
| Breaking the `features.md` column layout. | `adhd-state.mjs` parses that table for the build-order gate — keep `ID | Feature | Story | Domain | Repo | Size | Depends on | Build | Verified`. |
| Running full `plan` ceremony on a `Size: S` feature (or building an `M`/`L` one unplanned). | `S` skips `plan` — build directly from the surface spec + feature row. `M`/`L` require the plan file. If an `S` feature turns out to need design decisions, re-size it to `M` and plan it. |
| Routing a code-only defect through `evolve` (or a spec change through `fix`). | Spec right + code wrong → `adhd fix`. Spec wrong → `adhd evolve` (spec corrected first, code follows). |
| In `multi` mode, writing `project/` or `docs/` artifacts into a code repo. | All `adhd` artifacts live in the orchestration repo. Only the code-writing stages (`prototype`, `ux-refine`, `tracer`, `build`) touch a registered code repo, and only to write code. |
| Bolting a mid-project story idea onto the current milestone. | File it to `stories.md` and let a future `milestone-brief` pick it up. Soft-warn if it would expand the current milestone. |
| Building a feature before its `Depends on` features. | The DAG order is enforced by the `build` gate — build the dependency features first. |
| Building a `ui` surface's production code into the prototype app (or vice versa). | Under `standalone` topology they are different repos. The `prototype`/`ux-refine` stages write the prototype app; `build` writes the feature's production `repo`. |
| Changing the whole-product flow or rules inside `ux-refine`. | `ux-refine` only refines the current milestone's slice. To change the whole-product flow, run `adhd evolve` (it sequences the `prototype` re-run). |
| Leaving a `project/work/<task>.md` behind after a stage is done. | It is transient scratch. Drain durable facts to their canonical home and delete it — the `verify` pass flags stale work files. |
| Starting implementation without the `## Gate` confirmed. | Seed the `## Gate` block, clarify with the user, and run `adhd-state.mjs work-gate <stage>` before any output/implementation. Pre-checking or inventing the verbatim ok defeats the gate. |
| Putting fields, schema, or surfaces into `docs/CONCEPTS.md`. | `CONCEPTS.md` is conceptual (entities + relationships + helicopter behavior). Fields live in `docs/DATA.md`; surfaces/placement live in `project/map.md`. |
| Selecting a story whose `Surfaces` cell is empty or only `?`-provisional into a milestone brief. | A `?`-suffixed name was seeded at `stories` but never prototyped. Run `adhd evolve` to draw the surface (clearing the `?`), then re-select. |
| Making a post-groundwork change to concepts, stories, or the prototype outside `evolve`. | All such changes must be routed through `adhd evolve` — it is the single front door that sequences the living stages in the right order. |

## Scripts

```bash
node {{scripts_path}}/adhd-state.mjs <init|read|status|next|gate|work-gate|validate|migrate|preflight-confirm|workspace-mode|workspace-add|workspace-remove|workspace-list|repo-bind|repo-unbind|prototype-topology|prototype-home>
node {{scripts_path}}/handoff-prompt.mjs
```
