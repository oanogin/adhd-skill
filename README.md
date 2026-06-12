# adhd

A project conductor skill for Claude Code (also Codex, Cursor).

`adhd` front-loads the whole-project view — vision, scope, structure — **before**
any code, then declares every interaction as mermaid sequence diagram **flows** before
any implementation, with **hard gates** that forbid skipping ahead. It exists to stop
three failures: rewriting the app for lack of an upfront plan, drawing screens before
scope is locked, and uncovering must-have behavior late during implementation.

`adhd` does not design or build itself. It conducts: it owns sequencing and
discipline; `brainstorming`, `impeccable`, and `writing-plans` do the work inside
each stage.

## Requirements

`adhd` hard-depends on two things. No fallback, no degraded mode:

- the **`superpowers` plugin** — `adhd` invokes `brainstorming` (concepts, brief,
  flows, evolve, and park), `writing-plans` (plan stage), and `executing-plans`
  (build stage) from it. The whole plugin is required, not just those three: other
  superpowers skills (`subagent-driven-development`, `systematic-debugging`, and so on)
  are useful during the build stage too.
- the **`impeccable` skill** — UI design, used by the on-demand `prototype` command
  and UI craft inside `build`.

Install both yourself. At preflight `adhd` checks both are available and halts
if either is missing.

## Install

Place this directory at `~/.claude/skills/adhd/`. That is all — no build step.
The scripts in `scripts/` run on plain Node.js (v18+; tested on v24).

## Usage

Run inside the project you are building (not in this skill's repo):

- `/adhd` — report progress and name the next runnable stage.
- `/adhd <stage>` — run that stage.
- `/adhd <stage> <milestone|feature>` — run a stage for a specific target.

Start a new project with `/adhd setup`.

Management commands sit outside the stage flow:

- `/adhd workspace` — switch to `multi` mode, register code repos, set prototype topology.
- `/adhd adopt` — bring an existing, already-built project under `adhd` (drafts the
  groundwork docs from the project's existing documentation).
- `/adhd verify` — agent-driven consistency & quality audit of the project's docs
  (reports drift and proposes fixes for your approval).
- `/adhd evolve` — change-intake conductor: brainstorm a new idea or update, plan
  the artifact updates across living stages, and drive the re-runs.
- `/adhd park` — capture a not-yet-actionable idea into the durable parking lot
  (`project/parking.md`) after a clarifying dialogue.
- `/adhd fix` — correct existing code in place (a bug, misplaced files, a convention
  violation) when the spec is right and the code is wrong — no milestone or `evolve`
  ceremony. A fix that turns out to change scope escalates to `evolve`.
- `/adhd prototype` — build a clickable, mock-data prototype for a milestone slice
  when UX is genuinely uncertain. On demand, never a gate.

You can also describe a task in plain words — `/adhd <free text>` — and `adhd`
picks the stage or command that fits, respecting the gates.

## Modes

`adhd` runs in one of two modes:

- **`single`** (default) — everything lives in one repo. `setup` scaffolds this;
  nothing extra to do.
- **`multi`** — the product spans several git repos. `adhd`'s `project/` tree lives
  in an orchestration repo; code repos are registered by logical name, and local
  paths live in a gitignored `project/repos.local.json` bound per-user. The product
  is split into user-defined **domains** — logical slices recorded in `project/map.md`.
  Run `/adhd workspace` to switch to `multi` mode and register repos.

## The flow

**Groundwork** (`setup → vision → foundation → concepts`) establishes the product and
its structure. `concepts` is the terminal groundwork stage and is **living**: alongside
the ubiquitous language, `docs/CONCEPTS.md` carries the **capability dependency map** —
a mermaid flowchart of capability areas that serves as the **soft roadmap**. There is no
pre-planned milestone list; milestones are picked off the map just-in-time.

A **milestone** is a **ready-to-use experience** — a complete, business-usable slice of
the product. The **flows are the spine**: every interaction the milestone ships is
declared as a mermaid sequence diagram (`project/flows/<scenario>.md`) and signed off
before any code. The signed-off flow set is the behavior contract everything downstream
reads.

```
GROUNDWORK
  setup → vision → foundation → concepts
          (concepts: ubiquitous language + capability dependency map — the soft roadmap)

PER-MILESTONE LOOP
  brief      (choose capability areas from the map; define the experience; list flows)
  flows      (declare each interaction as a mermaid sequence diagram; sign off)
  realize    (carve flows into a feature DAG; settle mechanisms)

  per feature, DAG order — plan it, build it, next:
    plan     (implementation plan; skipped for Size S)
    build    (build the feature)

  review     (findings table; open criticals block finalize)
  finalize   (clean up docs, write milestone summary)
```

Milestones are independent `project/milestones/m<N>/` folders — no global pointer, so
two or three can be in flight at once. The next milestone is started simply by running
`brief` again.

**Generations.** The chain above is the **flows generation** (`generation: "flows"` in
`project/config.json`), the default for new projects. A project with
`generation: "classic"` predates flows and keeps the classic chain — `stories →
prototype` in groundwork, `milestone-brief → ux-refine → tracer → features` per
milestone; its stage docs live in [reference/classic/](reference/classic/README.md).
`adhd-state.mjs` is generation-aware. New work on a classic project adopts flows
incrementally via `adhd evolve`.

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

## Flows, participants, and the participant registry

A **flow** is one scenario declared as a mermaid sequence diagram —
`project/flows/<scenario>.md`, one scenario per file. Flow files are **global product
truth**: accumulated across milestones, owned by none. Every participant in any diagram
must exist in `project/map.md`'s registry table — `| Participant | Kind | Concept |`,
Kind ∈ `actor`/`ui`/`service`/`store`/`external` — script-enforced by `validate`.

The horizontal view of a participant across all flows is **derived, never stored**:

```bash
node ~/.claude/skills/adhd/scripts/adhd-state.mjs contract <participant>
```

It scans ALL of `project/flows/` and emits every message the participant receives and
sends, plus its guards — each with flow and story refs. Zero drift, no maintenance.

The transitive hard prerequisites of capability areas in the soft roadmap are computed
via the `closure` command:

```bash
node ~/.claude/skills/adhd/scripts/adhd-state.mjs closure <areaId>...
```

**Hard read scope at `plan`/`build`.** A feature's context is EXACTLY: its row in
`m<N>/features.md` + the flow diagram(s) named in its `Feature` cell + `contract <P>`
for every participant it implements + the surface stub (if applicable) + the target
repo's code. Whole-product reads (`docs/CONCEPTS.md`, `project/stories.md`,
`project/map.md` wholesale) are forbidden — the flow slice IS the context.

## Prototype (on demand)

`prototype` is an **on-demand command**, never a stage and never a gate — nothing
depends on it. Run it for a milestone slice when a surface's UX is genuinely uncertain
and a diagram sign-off is too weak: it builds a Hi-Fi, clickable, mock-data app for
just that slice using `impeccable` (`shape → confirm → craft`). See
[reference/prototype.md](reference/prototype.md).

Where prototype code lives is the project-level `prototypeTopology` in `config.json`:

- **`colocated`** (default) — same codebase and framework as the production app, under
  the `/p/` route prefix on a mock-data layer.
- **`standalone`** — its own app, separate repo and possibly framework, recorded once
  in `config.json`.

Switch topology with the `workspace` command.

## How the gates work

A stage refuses to run unless every predecessor's output exists. **No skip, no
override.** If a gate fails, `adhd` halts and names the predecessor stage to run.
This is the skill's central discipline — it is not a bug when a stage refuses.

The gate is mechanical: it checks whether the predecessor **artifact files exist** on
disk, not your intent. A stage is done the moment its artifact exists — so never
create that file before the stage's work is truly complete. "Small project", "just a
prototype", "go fast", or "I already know the answer" do not open a gate. The commit
gate is absolute: no `git commit` without your explicit "ok".

## Confirmation touchpoints

High-effort stages keep a transient `project/work/<stage>.md` with a `## Gate` block
that records the user's confirmed requirements before any output artifact is produced.
`adhd-state.mjs work-gate <stage>` verifies the block is checked and carries the
user's verbatim ok — a bare `[x]` without the parenthetical fails.

Confirmations concentrate at **two touchpoints per milestone**: the `brief` boundary
confirm and the per-area flow sign-off. Everything downstream runs gate-light: `build`'s
only user interrupts are code-contradicts-diagram (→ `evolve`/`fix`) and the commit gate.

## What it creates in your project

The project's state IS this tree — there is no separate database. A stage is done
when its artifact file exists.

```
.ruler/                      agent instructions
docs/
  PRODUCT.md                 Vision output
  DESIGN.md                  design system
  CONCEPTS.md                ubiquitous language + the capability dependency map
                             (the soft roadmap) — Concepts output
  DATA.md                    data model — created lazily, only once a milestone persists data
  STACK.md                   the CURRENT tech stack + approved libraries — edited in place
  DECISIONS.md               append-only log — why each stack/arch choice was made
project/
  config.json                the only non-doc file — mode, generation, repos, prototype
                             topology, preflight
  repos.local.json           gitignored — per-user repo→path bindings (multi mode)
  parking.md                 durable, user-owned buffer for not-yet-actionable ideas (committed)
  work/<stage>.md            gitignored — per-task working memory (high-effort stages);
                             milestone form `m<N>-<stage>.md`; deleted on completion
  flows/<scenario>.md        one flow per scenario — global product truth, accumulated
                             across milestones (Flows output)
  map.md                     participant registry (| Participant | Kind | Concept |)
                             + domains/deployables
  surfaces/<name>.md         surface stub — purpose, UX intent, key states only
                             (behavior is derived: `contract <name>`)
  stories.md                 the accumulated backlog index — rows derived at `flows`;
                             no `Surfaces` column
  milestones/m<N>/
    brief.md                 Brief — the experience, scope closure, `## Flows` list
    flows.md                 Flows sign-off — per-area sign-offs, waivers, change log
    realize.md               Realize — mechanism notes + spike findings
    features.md              the feature DAG
    plans/<feature>.md       per-feature implementation Plan
    review.md                milestone review-pass findings
    summary.md               Finalize — the milestone summary
```

`project/config.json` is owned by `scripts/adhd-state.mjs` — mutate it via the CLI,
not by hand. Everything else is plain markdown you (and `adhd`) edit directly.

## Rules worth knowing

- **Commit gate** — `adhd` never runs `git commit` without your explicit "ok".
- **Milestone discipline** — the front door for a mid-project change or new idea is
  `/adhd evolve` (brainstorm, plan, drive artifact updates); a code-only correction is
  `/adhd fix`. A new story filed to `project/stories.md` is picked up by a future
  `brief` — not bolted onto the milestone in flight.
- **Capability, not mechanism** — the product-scope artifacts (`docs/PRODUCT.md`,
  `project/stories.md`, `project/map.md`, `project/flows/*`) describe *what the product
  does* in capability terms — never a stack, framework, database, or architecture.
  Flows are **logical-altitude**: participants are concepts, never deployment decisions;
  a guard is behavior, not tech. Mechanisms are settled at `realize`.
- **Spec truth lives in the flows** — the signed-off flow set is the behavior spec;
  code follows the diagrams. Wrong diagram → `adhd evolve` (correct the diagram first,
  then code follows); wrong code, right diagram → `adhd fix`.
- **Tech, just-in-time** — `foundation` records only the firm, known-from-the-start
  baseline in `docs/STACK.md`; every other stack decision is made by the milestone that
  first needs it. `STACK.md` is the always-current state, edited in place; every change
  gets a rationale entry appended to `docs/DECISIONS.md`.
- **Single source of truth** — `adhd verify` (an agent-driven pass) checks the `.md`
  artifacts for drift, orphans, and misplaced info; `adhd-state.mjs validate` covers
  fast structural sanity — including flow checks (mermaid parse, undeclared participants,
  registry membership, story links, flow-dependency cycles) whenever `project/flows/`
  has files.
- **parking.md** — a durable, committed buffer you own, for ideas/details not yet ready
  to build. Free-form; an item stays until you implement it, then you remove it. Capture
  into it with `/adhd park`; every stage and feature surfaces it at its gate-check.
- **Fresh sessions** — when a session gets long, `adhd` emits a ready-to-paste resume
  prompt (`handoff-prompt.mjs`); set `autoCompact: false` so you control when to
  `/clear`.
- **Working memory** — high-effort stages keep a transient `project/work/<stage>.md`
  so a session that ends mid-stage resumes cleanly. It is drained and deleted on
  completion, never a source of truth.

## Other agents

Codex and Cursor are supported. See `reference/codex-tools.md` and
`reference/cursor-tools.md` for the tool-name and command mappings.

## Layout

- `SKILL.md` — router: stage table, gates, rules.
- `reference/<stage>.md` — per-stage playbook, loaded on demand.
- `reference/classic/` — classic-generation stage playbooks
  (`stories`, `milestone-brief`, `ux-refine`, `tracer`, `features`).
- `scripts/` — `adhd-state.mjs` (read/derive + `config.json` CLI),
  `handoff-prompt.mjs`.
