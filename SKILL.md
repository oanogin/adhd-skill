---
name: adhd
description: "Use when starting, structuring, or building a software project end-to-end and you want a conductor that front-loads vision, scope, and structure before any code, then forbids skipping ahead. Triggers: /adhd, project kickoff, 'where am I in the build', milestone planning, scope discipline, story backlog, flow diagram sign-off, resume after a fresh session, new feature idea raised mid-project, a bugfix or in-place code correction on an adhd project, a stage gate refusing to run."
argument-hint: "[stage] [milestone|feature]"
user-invocable: true
license: Apache 2.0
---

`adhd` is a conductor. It front-loads a whole-project view — vision, scope, structure —
then declares every interaction as sequence-diagram **flows** before any code, with
hard gates that forbid skipping ahead. It owns sequencing and discipline; the
dependency skills own the work inside each stage.

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

- the **`superpowers` plugin** — `adhd` invokes `brainstorming` (concepts, brief,
  flows, evolve, and park), `writing-plans` (plan stage), and `executing-plans`
  (build stage) from it.
  The whole plugin is required, not just those three: other superpowers skills
  (e.g. `subagent-driven-development`, `systematic-debugging`) are useful during
  the build stage too.
- the **`impeccable` skill** — UI design for the on-demand `prototype` command and
  UI craft inside `build`.

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
  `docs/PRODUCT.md` exists; `flows` for milestone 2 is done when `m2/flows.md`
  exists. There is no status field. So: never create a stage's artifact file until the
  stage is genuinely complete — write drafts to the stage's `project/work/<stage>.md`,
  create the canonical file last.
- **`project/config.json`** is the only non-doc file — the irreducible config: `mode`,
  `generation`, the `repos` registry, `prototypeTopology` + `prototype`, `preflight`.
  Mutate it only through `adhd-state.mjs` config subcommands.
- The agent reads and writes the `.md` artifacts directly. `adhd-state.mjs` is a
  read/derive tool — `status`, `gate`, `next`, `validate`, `contract`, `closure` —
  plus the `config.json` writers. It does not own the project content.

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
  slices recorded in `project/map.md`; a milestone may span several domains.

In `multi` mode every `adhd` artifact still lives in the orchestration repo's
`project/` and `docs/`. Only the code-writing stages and commands (`realize` spikes,
`build`, `fix`, the on-demand `prototype`) reach into a registered code repo, and
only to write code there.

## Groundwork and per-milestone work

`adhd` has two phases. **Groundwork** (`setup → vision → foundation → concepts`)
establishes the product and its structure. `concepts` is the terminal groundwork
stage and is **living**: alongside the ubiquitous language, `docs/CONCEPTS.md`
carries the **capability dependency map** — a mermaid flowchart of capability areas
(solid edge = hard prerequisite, dashed = soft/enhances, built areas marked). That
map is the **soft roadmap**: `adhd` keeps no list of future milestones; milestones
are picked off the map (an area is pickable-next when every solid in-edge comes from
a built area). Post-groundwork changes to the living set route through the on-demand
`evolve` conductor.

A **milestone** is a **ready-to-use experience** — a complete, business-usable slice
of the product, sized by business value, never by effort. Nothing inside a milestone
needs to be independently usable; the milestone is the usable unit. It is a folder,
`project/milestones/m<N>/`, formed just-in-time: `brief` writes `m<N>/brief.md`, and
that *is* the milestone. Milestones are **independent** — there is no global "current
milestone" pointer, so two or three can be in flight at once (see "Working in
parallel"). Each runs `brief → flows → realize → (plan → build) per feature →
review → finalize`. The **flows are the spine**: every interaction the milestone
ships is declared as a mermaid sequence diagram — order, branches, guards, error
paths — and signed off before any code. The signed-off flow set is the behavior
contract everything downstream reads.

**Generations.** This document describes the **flows generation** —
`generation: "flows"` in `project/config.json`, the default for new projects. A
project with `generation: "classic"` (or no generation field) predates flows and
keeps the classic chain — `stories → prototype` groundwork, `milestone-brief →
ux-refine → tracer → features` per milestone; its stage docs live in
[reference/classic/](reference/classic/README.md). `adhd-state.mjs` (`status`,
`next`, `gate`) is generation-aware. New work on a classic project adopts flows
incrementally via `adhd evolve`.

## Working memory (high-effort stages)

`adhd` keeps two non-canonical stores. **Transient working memory** lives in
`project/work/*.md` — high-effort stages get a `project/work/<stage>.md` (milestone form
`project/work/m<N>-<stage>.md`), and any ad-hoc, session-scoped task may get a
freely-named `project/work/<task>.md`. All of `project/work/` is gitignored; each file is
drained to its canonical home and deleted when the work is done. **Durable not-yet-actionable
info** lives in `project/parking.md` — see "The parking lot" below. Medium/low stages
(including `build` — its plan already is the memory) create no work file, with one
exception: `brief` (medium) does — it carries user touchpoint #1.

Every high-effort stage (`vision`, `concepts`, `flows`, `realize`, `review`, `evolve`,
and the on-demand `prototype`) creates its work file as its first procedure step (a
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
`CONCEPTS.md`, `DATA.md`, a flow file, a surface stub, `.ruler/`) and **delete** the
file. `project/work/` is
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
   (e.g. `flows` per capability area) adds one gate line per item.
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
  CONCEPTS.md                ubiquitous language + the capability dependency map
                             (the soft roadmap) — Concepts output
  DATA.md                    data model / schema — created lazily when a milestone persists data
  STACK.md                   the CURRENT tech stack + approved libraries — Foundation authors it,
                             edited in place as the stack evolves (always-current state, no history)
  DECISIONS.md               append-only decision log — WHY each stack/arch choice was made;
                             every STACK.md change gets an entry here
project/
  config.json                the only non-doc file — mode, generation, repos, prototype
                             topology, preflight
  repos.local.json           gitignored — per-user repo→path bindings (multi mode)
  parking.md                 durable, user-owned buffer for not-yet-actionable ideas (committed)
  work/<stage>.md            gitignored — per-task working memory (high-effort stages);
                             milestone form `m<N>-<stage>.md`; deleted on completion
  work/evolve.md             gitignored — transient impact plan for the evolve conductor;
                             deleted (drained) when evolve is done
  flows/<scenario>.md        one flow per scenario — global product truth, accumulated
                             across milestones (Flows output)
  map.md                     participant registry (`| Participant | Kind | Concept |`)
                             + domains/deployables
  surfaces/<name>.md         surface stub — purpose, UX intent, key states only
                             (behavior is derived: `contract <name>`)
  stories.md                 the accumulated backlog index — rows derived at `flows`;
                             no `Surfaces` column
  prototype.md               classic-generation artifact (whole-product prototype
                             sign-off) — flows-generation sign-offs live per milestone
                             in `m<N>/flows.md`
  milestones/m<N>/
    brief.md                 Brief — the experience, scope closure, `## Flows` list
    flows.md                 Flows sign-off — per-area sign-offs, waivers, change log
    realize.md               Realize — mechanism notes + spike findings
    features.md              the feature DAG — a table with Build/Verified columns
    plans/<feature>.md       per-feature implementation Plan
    review.md                milestone review-pass findings (arrow coverage)
    summary.md               Finalize — the milestone summary
```

## Stages

| Stage | Loop | Effort | Artifact (exists ⇔ done) | Sub-skill | Reference |
|---|---|---|---|---|---|
| `setup` | groundwork | low | `project/config.json` | none | [reference/setup.md](reference/setup.md) |
| `vision` | groundwork | high | `docs/PRODUCT.md` | none | [reference/vision.md](reference/vision.md) |
| `foundation` | groundwork | medium | `docs/STACK.md` (+ the baseline decision logged in `docs/DECISIONS.md`) | none | [reference/foundation.md](reference/foundation.md) |
| `concepts` | groundwork (living) | high | `docs/CONCEPTS.md` (incl. the capability dependency map) | brainstorming | [reference/concepts.md](reference/concepts.md) |
| `brief` | per-milestone | medium | `m<N>/brief.md` | brainstorming | [reference/brief.md](reference/brief.md) |
| `flows` | per-milestone | high | `m<N>/flows.md` + `project/flows/*` | brainstorming | [reference/flows.md](reference/flows.md) |
| `realize` | per-milestone | high | `m<N>/features.md` (+ `m<N>/realize.md`) | none | [reference/realize.md](reference/realize.md) |
| `plan` | per-feature | medium | `m<N>/plans/<feature>.md` (skipped for `Size: S` features) | writing-plans | [reference/plan.md](reference/plan.md) |
| `build` | per-feature | medium | code + `Build`/`Verified` in `features.md` | impeccable craft / executing-plans | [reference/build.md](reference/build.md) |
| `review` | per-milestone | high | `m<N>/review.md` | none | [reference/review.md](reference/review.md) |
| `finalize` | per-milestone | low | `m<N>/summary.md` | none | [reference/finalize.md](reference/finalize.md) |

Flow: groundwork runs `setup → vision → foundation → concepts` (`concepts` stays
living — post-groundwork re-runs route through `evolve`). Then per milestone:
`brief → flows → realize`, then the feature DAG in dependency order **one feature at
a time** — `plan` it then `build` it before moving to the next feature, not planning
them all up front — then `review → finalize`. A milestone is a ready-to-use
experience; there is no track split. `prototype` is an **on-demand command**, not a
stage (see "Prototype (on demand)"). Classic-generation projects keep the classic
chain — see [reference/classic/README.md](reference/classic/README.md).

There is no "advance" step. The next milestone is created simply by running
`brief` again — it writes a new `m<N>/` folder. `adhd-state.mjs status`
shows every milestone's progress; `adhd-state.mjs next --milestone <N>` names the next
stage for a specific one.

## Flows, participants, and contracts

A **flow** is one scenario declared as a mermaid sequence diagram —
`project/flows/<scenario>.md`, one scenario per file. Flow files are **global product
truth**: accumulated across milestones, owned by none; `m<N>/brief.md` lists which
flows a milestone owns. The format (full spec in
[reference/flows.md](reference/flows.md)):

- header lines `Stories: <IDs>` (the backlog stories this scenario realizes — IDs
  cross-link both ways with `project/stories.md`) and `Depends on: <flow names>`
  (feeds the brief realizability check; must stay acyclic);
- `## Diagram` — exactly one `sequenceDiagram`: order, branches (`alt`/`opt`), guards
  (auth, validation, rate-limit), error paths;
- `## Rules` — behavior that does not fit an arrow; references CONCEPTS, never
  restates it;
- `## Out of scope` — explicit waivers. Every standard concern (authn, authz,
  validation, rate-limit, error paths, empty/zero states, concurrency/idempotency,
  audit) is either drawn or waived — a silent gap is not an option.

**The participant registry.** Every participant in any diagram must exist in
`project/map.md`'s registry table — `| Participant | Kind | Concept |`, Kind ∈
`actor`/`ui`/`service`/`store`/`external` — script-enforced by `validate`; no ad-hoc
names, no synonym drift. In arrows, participant ids are word characters only (`U`,
`SVC`); the `as` label carries the human-readable (hyphenated) name plus a required
`[kind]` suffix that must match the registry row.

**Logical altitude (hard rule).** Participants are concepts — a service, a store, a
surface — never a framework, database, or deployment decision. A guard ("check rate
limit") is behavior, not tech. Mechanisms are settled at `realize`, never in a flow.

**Derived contracts — never stored.** A flow is vertical (one scenario through many
participants); rework risk is horizontal (one entity across many flows). The
horizontal view is computed:

```bash
node {{scripts_path}}/adhd-state.mjs contract <participant>
```

It scans ALL of `project/flows/` and emits, for that participant: every message it
receives (its complete interface), every message it sends (its complete
dependencies), and its guards — each with flow + story refs. Derived, never stored:
flows stay the single source of truth — zero drift, no maintenance. It spans every
milestone's flows, which is the cross-milestone memory that keeps signatures stable
across experience boundaries.

**Surface stubs.** `project/surfaces/<name>.md` holds a `ui` participant's purpose,
UX intent, and key states ONLY. Its behavior is derived — `contract <ui-name>` —
never written into the stub.

**Every fact has exactly one home:**

| Fact | Home |
|---|---|
| Rule/invariant statement | `docs/CONCEPTS.md` |
| Rule's place in an interaction | flow arrow (references, never restates) |
| Capability dependency map | `docs/CONCEPTS.md` |
| Participant existence | `project/map.md` registry |
| Story backlog index | `project/stories.md` (no `Surfaces` column) |
| Story ↔ flow link | flow file header |
| Surface behavior | derived — `contract <ui-name>` |
| Surface UX intent | `project/surfaces/<name>.md` stub |
| Entity interface across flows | derived — `contract <participant>` |
| Milestone scope + waivers | `m<N>/brief.md` |
| Mechanisms | `docs/STACK.md` + `docs/DECISIONS.md` |

**The hard read contract (`plan`/`build`).** A feature's context is EXACTLY: its row
in `m<N>/features.md` + the flow diagram(s) named in its `Feature` cell +
`contract <P>` for every participant it implements + the surface stub (if it serves
a `ui` participant) + the target repo's code. **Whole-product reads are forbidden**
— never open `docs/CONCEPTS.md`, `project/stories.md`, or `project/map.md`
wholesale; the flow slice IS the context. Build rule: implement only the current
flow's arrows; shape signatures and schema against the participant's full contract.

## Features and the work DAG

The `realize` stage carves the milestone's signed-off flows into **features** — small
units of implementation work cut **from diagram segments**, each scoped to exactly one
domain (one repo). Carving is **entity-aware, skeleton-first**: for every entity the
milestone's flows touch, the first feature is that entity's skeleton — schema +
interface shaped from its full `contract`, sized for all flows — and per-story
features then fill behavior. Skeleton built once, extended N times, reworked zero.
The features live in `m<N>/features.md` as a table:
`ID | Feature | Story | Domain | Repo | Size | Depends on | Build | Verified`. The
`Feature` cell names the flow(s) the feature implements (e.g.
`redeem endpoint (invite-redeem)`) — `plan`/`build` read it to find the diagrams. The
`Depends on` edges form a DAG. The DAG is worked **one feature at a time, plan then
build**: `adhd next` returns `plan` for the next workable feature, then `build` for
that same feature, before moving on — so each feature's plan is written against
already-built dependencies, not all features planned up front. `Size` is `S`/`M`/`L`:
a **`Size: S` feature skips `plan` entirely** — small, fully specified by its flow
diagram(s) + contract + row, built directly (`adhd next` goes straight to `build`; an
empty cell counts as `M`). `build` is gated on every feature a
feature `Depends on` showing `Build: done` — which is how backend features land before
the frontend features that wire them. `build` fills the `Build` and `Verified` cells as
each feature completes; `review` cannot run until every feature is `Build: done` and
`Verified: yes`. Review findings that need substantial work are appended to this same
table as new feature rows (e.g. `f-rev-1`) and worked through the same machinery.
`adhd-state.mjs` parses this table for the build-order gate — keep the column layout
intact.

## Prototype (on demand)

`prototype` is an on-demand command, never a stage and never a gate — nothing depends
on it. Run it for a milestone slice when a surface's UX is genuinely uncertain and a
diagram sign-off is too weak: it builds a Hi-Fi, clickable, mock-data app for just
that slice (`impeccable` flow: `shape → confirm → craft`). See
[reference/prototype.md](reference/prototype.md) — on a classic-generation project
the same file is the whole-product groundwork stage.

Where prototype code lives is the project-level `prototypeTopology` in `config.json`:
**`colocated`** (default) — the same codebase and framework as the production app,
under the `/p/` route prefix; **`standalone`** — its own app, separate repo and
possibly framework, recorded once in `config.json`'s `prototype` (`repo` +
`subpath`). Switch with the `workspace` command: `adhd-state.mjs prototype-topology
standalone`, then `adhd-state.mjs prototype-home --repo <name> --subpath <path>`.

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
| "It's a small product — skip the groundwork." | Small scope still needs vision + concepts or the build wanders. They run fast at low effort. Run them. |
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
milestone, `plan`/`build` run per feature, and
the `features.md` DAG marks which features are independent — those parallelize. Three
people = three independent features (or three milestones).

- **Code** goes on git branches per feature, per repo — normal PR flow.
- **Flow files** are per-scenario (`project/flows/<scenario>.md`), so parallel
  milestones drawing different capability areas rarely touch the same file. The
  participant registry in `project/map.md` is shared and append-mostly — git merges
  it like any other shared code. Each milestone's flow work goes on that milestone's
  branch and merges via normal PR flow.
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
- `evolve` — the single front door for every post-sign-off change to the spec. It is
  an on-demand conductor (gate: `concepts` done) that sequences re-runs of the living
  set in the right order — flows generation: `concepts → flows` (plus the participant
  registry in `project/map.md` and the `project/stories.md` index); classic
  generation: `concepts → stories → prototype`. It has no canonical artifact: done
  means its work file `project/work/evolve.md` is drained and deleted. See
  [reference/evolve.md](reference/evolve.md).
- `park` — capture a not-yet-actionable idea or detail into the durable parking lot
  `project/parking.md`, after a full brainstorming clarify. No gate; callable anytime;
  it captures only and never implements. See [reference/park.md](reference/park.md).
- `fix` — correct existing code in place: a bug, misplaced handlers/files, a convention
  violation, a behavior-preserving refactor. For when the **spec is right and the code
  is wrong** — no milestone, no `evolve` ceremony. The moment the spec itself needs to
  change, it escalates to `evolve`. See [reference/fix.md](reference/fix.md).
- `prototype` — build a clickable, mock-data prototype for a milestone slice when UX
  is genuinely uncertain. Never a gate. See "Prototype (on demand)" and
  [reference/prototype.md](reference/prototype.md).

The CLI also exposes `migrate` (convert a legacy `state.json` to `config.json`,
normalize an old project to the parking-lot model, and stamp a pre-flows project
`generation: classic`).
Content/consistency auditing is the agent-driven `verify` command (see
[reference/verify.md](reference/verify.md)), not a script. To drop a milestone, delete
its `m<N>/` folder; to drop a flow or feature, edit the markdown — there are no
special commands.

## Routing

1. **No argument** — orient, validate, route. Run `adhd-state.mjs status` and
   `adhd-state.mjs validate`; print both. State where the project sits in the flow
   and restate user intent in one line. If `validate` reports blockers, name the
   fix and HALT. Otherwise name the next runnable stage. Stop.
2. **First word is a stage or a management command** — the 11 stages are in the
   table above; `workspace`, `adopt`, `verify`, `evolve`, `park`, `fix`, and
   `prototype` are management/on-demand commands. Load the matching
   `reference/<name>.md` and follow it exactly. The reference owns the gate check
   (stages), the procedure, and the completion steps. On a classic-generation
   project the classic stage names (`stories`, `milestone-brief`, `ux-refine`,
   `tracer`, `features`) load `reference/classic/<name>.md`; `prototype` stays
   shared at [reference/prototype.md](reference/prototype.md).
3. **First word matches nothing** — treat the whole input as a task description.
   Run `adhd-state.mjs status`, then select the stage or management command that
   fits the task, gate-aware:
   - route the task to the stage or command that addresses it (e.g. "this behavior
     is wrong or missing in the spec" → `evolve` — the diagram is corrected first,
     code follows; "this code contradicts a signed-off diagram / is buggy or
     misplaced, the spec is fine" → `fix`; "this screen needs deeper UI" → the
     on-demand `prototype` for that slice);
   - if the task implies skipping ahead, name the gate blocking it instead of
     running it;
   - if it is a new story idea raised mid-project, route it through `evolve` (the
     single front door — it files the story to the `project/stories.md` index and
     sequences any concept/flow work; a flow realizes it in a later milestone) and
     apply the milestone-discipline soft-warn;
   - state the routing decision, then proceed — confirming with the user first
     when the task is ambiguous or the action mutates files.

If `project/config.json` does not exist, the only runnable stage is `setup`.

## Cross-cutting rules (active in every stage)

- **Hard gates** — see above. Never bypass.
- **The files are the truth** — every fact has exactly one home (see the table in
  "Flows, participants, and contracts"). `config.json` holds the non-doc config;
  everything else is a `.md` artifact. A stage's artifact file is
  the sole record that the stage ran — there is no second status store, so never
  pre-create an artifact. Run the agent-driven `verify` pass (see
  [reference/verify.md](reference/verify.md)) to catch drift, orphans, and misplaced
  info across the markdown; `adhd-state.mjs validate` covers fast, structural sanity
  (legacy state, config version, repo bindings, DAG cycles — and, whenever
  `project/flows/` has files, the flow checks: mermaid parse, undeclared
  participants, registry membership, story links, flow-dependency cycles).
- **Spec truth lives in the flows** — the signed-off flow set is the behavior spec;
  code follows the diagrams. A contradiction is never silently patched on either
  side: wrong diagram → `adhd evolve` (correct the diagram first, then code follows);
  wrong code, right diagram → `adhd fix`.
- **Effort hints** — each stage carries a suggested reasoning effort; surface it to the user.
- **Fresh sessions** — when a session gets long, start a fresh one: run
  `handoff-prompt.mjs` and give the user the resume prompt. You control compaction
  (`autoCompact: false` recommended); the work-file + handoff make resume clean.
- **Handoff prompts** — on a session switch, the resume prompt leads with the active
  work file (if any) and points at `project/parking.md`.
- **Confirm before implementing (work-file gate)** — every stage that creates a work
  file records the user's confirmed requirements in its `## Gate` block and verifies
  them with `adhd-state.mjs work-gate <stage>` BEFORE producing its output artifact or
  writing implementation. If the gate reports `missing`, HALT and clarify. No skip.
  Confirmations concentrate at **two touchpoints per milestone** — the `brief`
  boundary confirm and the per-area flow sign-off — and everything downstream runs
  gate-light: `build`'s only user interrupts are code-contradicts-diagram
  (→ `evolve`/`fix`) and the commit gate. See "Working memory → The `## Gate` zone".
- **Hard read scope (`plan`/`build`)** — a feature's context is its feature row, its
  flow diagram(s), `contract <P>` per implemented participant, the surface stub, and
  the target repo's code. Whole-product reads (`docs/CONCEPTS.md`,
  `project/stories.md`, `project/map.md` wholesale) are forbidden — the flow slice IS
  the context.
- **Small steps** — every stage and feature is bounded. If a step will not fit cleanly,
  split it before starting.
- **Commit gate** — NEVER run `git commit` without the user's explicit "ok" / "lgtm".
  No exceptions.
- **Milestone discipline (soft warn)** — once a milestone is in flight, a new feature
  idea enters through `adhd evolve` (which files it to the `project/stories.md` index
  and sequences any concept/flow work; a flow realizes it in a later milestone), to be
  picked up by a future `brief`. Warn when an idea would expand the current milestone;
  do not hard-block.
- **No "MVP"** — never write "MVP" in any `adhd` artifact or message. The term is vague
  and smuggles in scope assumptions. Say "Milestone 1" or "the first valuable product".
- **Capability, not mechanism** — the product-scope artifacts (`docs/PRODUCT.md`,
  `project/stories.md`, `project/map.md`, `project/flows/*`) describe *what the product
  does* in capability terms ("data persists", "users sign in"). They never name a
  mechanism — no stack, framework, database, or architecture. Flows are
  **logical-altitude**: participants are concepts (a service, a store, a surface),
  never deployment decisions; a guard is behavior, not tech. The current tech stack
  lives in `docs/STACK.md` (authored by `foundation`); per-milestone mechanisms are
  settled at `realize`.
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
  every code-writing stage and command (`realize`, `build`, `fix`, the on-demand
  `prototype`).
- **Parking lot discipline** — `project/parking.md` is the durable, user-owned buffer
  for not-yet-actionable ideas; read it at the start of each stage and fold anything
  relevant in. The agent writes it only via `adhd park`. Work-file scratch
  (`project/work/<stage>.md`) is transient: drain and delete on stage completion.

## Sub-skill output routing

`brainstorming` and `writing-plans` default their durable output to
`docs/superpowers/specs/` and `docs/superpowers/plans/`. `adhd` overrides this on
every invocation: flow files (from the `flows` stage) go to
`project/flows/<scenario>.md`, surface stubs go to `project/surfaces/`, and feature
plans go to `project/milestones/m<N>/plans/`. Always pass the canonical target path
when invoking a sub-skill. Leave `.superpowers/` and `.impeccable/` untouched —
Setup gitignores `.superpowers/`; `.impeccable/` stays tracked in git.

## Common mistakes

These are operational slips, not gate-skipping (gate rationalizations are tabled above).

| Mistake | Fix |
|---|---|
| Hand-editing `project/config.json`. | It is owned by `adhd-state.mjs`. Mutate it only through the config subcommands. |
| Creating a stage's artifact file before the stage's work is complete. | Existence = done. Draft in the stage's `project/work/<stage>.md`; create the canonical file last. |
| Running a stage from memory, skipping its `reference/<stage>.md`. | Always load the reference file — it owns the gate check, procedure, and completion steps. |
| Letting sub-skills write to their default `docs/superpowers/` paths. | Pass the canonical target on every invocation — flow files to `project/flows/`, surface stubs to `project/surfaces/`, plans to `project/milestones/m<N>/plans/`. |
| Treating `project/parking.md` as a dumping ground the agent fills. | It is user-owned. The agent writes it only via `adhd park`. Items are pending-until-implemented; the user removes them when done. |
| Using an undeclared participant in a flow. | Every participant needs a registry row in `project/map.md` (`Participant \| Kind \| Concept`) — register it first; `validate` fails on ad-hoc names. |
| Restating a CONCEPTS rule inside a flow. | Reference and place, never restate — the invariant appears as a placed arrow/guard with a comment pointing home. A restated rule is a second home that will drift. |
| Hand-picking the story set at `flows`. | Derive it from the CONCEPTS sweep — every declared behavior of every in-scope entity gets an arrow or an explicit waiver. Hand-picking reintroduces silent gaps. |
| Reading `CONCEPTS.md`/`stories.md`/`map.md` wholesale at `plan`/`build`. | Forbidden. The feature's flow slice + `contract <P>` IS the context. |
| Implementing arrows beyond the current flow. | Shape signatures and schema for the participant's full contract; implement only this flow's arrows. |
| Editing a signed-off flow outside `evolve`. | `evolve` is the single front door — the diagram is corrected and re-validated first, then code follows via `fix` or a feature row. |
| Invoking `impeccable` for a non-`ui` participant. | `impeccable` runs only for `ui` work — the on-demand `prototype` and UI craft inside `build`. |
| Breaking the `features.md` column layout. | `adhd-state.mjs` parses that table for the build-order gate — keep `ID | Feature | Story | Domain | Repo | Size | Depends on | Build | Verified`. |
| Running full `plan` ceremony on a `Size: S` feature (or building an `M`/`L` one unplanned). | `S` skips `plan` — build directly from the flow diagram(s) + contract + feature row. `M`/`L` require the plan file. If an `S` feature turns out to need design decisions, re-size it to `M` and plan it. |
| Routing a code-only defect through `evolve` (or a spec change through `fix`). | Spec right + code wrong → `adhd fix`. Spec wrong → `adhd evolve` (spec corrected first, code follows). |
| In `multi` mode, writing `project/` or `docs/` artifacts into a code repo. | All `adhd` artifacts live in the orchestration repo. Only the code-writing stages and commands (`realize` spikes, `build`, `fix`, the on-demand `prototype`) touch a registered code repo, and only to write code. |
| Bolting a mid-project story idea onto the current milestone. | File it through `adhd evolve` — it lands in the `stories.md` index; a flow realizes it in a later milestone. Soft-warn if it would expand the current milestone. |
| Building a feature before its `Depends on` features. | The DAG order is enforced by the `build` gate — build the dependency features first. |
| Leaving a `project/work/<task>.md` behind after a stage is done. | It is transient scratch. Drain durable facts to their canonical home and delete it — the `verify` pass flags stale work files. |
| Starting implementation without the `## Gate` confirmed. | Seed the `## Gate` block, clarify with the user, and run `adhd-state.mjs work-gate <stage>` before any output/implementation. Pre-checking or inventing the verbatim ok defeats the gate. |
| Putting fields, schema, or participants into `docs/CONCEPTS.md`. | `CONCEPTS.md` is conceptual (entities + relationships + helicopter behavior + the capability map). Fields live in `docs/DATA.md`; participants/placement live in the `project/map.md` registry. |

## Scripts

```bash
node {{scripts_path}}/adhd-state.mjs <init|read|status|next|gate|work-gate|validate|migrate|preflight-confirm|workspace-mode|workspace-add|workspace-remove|workspace-list|repo-bind|repo-unbind|prototype-topology|prototype-home|contract|closure>
node {{scripts_path}}/handoff-prompt.mjs
```

- `contract <participant>` — the derived cross-flow view: every message the
  participant receives and sends, plus its guards, with flow + story refs.
- `closure <areaId>...` — the transitive hard prerequisites of capability areas,
  computed from the capability map in `docs/CONCEPTS.md` (the `brief` stage's
  mechanical-closure layer; soft edges are surfaced as decide-explicitly items).
