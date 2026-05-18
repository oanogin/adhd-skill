# adhd

A project conductor skill for Claude Code (also Codex, Cursor).

`adhd` front-loads the whole-project view — vision, scope, structure — **before**
any code, then feeds surfaces into design and planning skills in the right order,
with **hard gates** that forbid skipping ahead. It exists to stop three failures:
rewriting the app for lack of an upfront plan, drawing screens before scope is
locked, and uncovering must-have behavior late during implementation.

`adhd` does not design or build itself. It conducts: it owns sequencing and
discipline; `brainstorming`, `impeccable`, and `writing-plans` do the work inside
each stage.

## Requirements

`adhd` hard-depends on two things. No fallback, no degraded mode:

- the **`superpowers` plugin** — `adhd` invokes `brainstorming` (design stage),
  `writing-plans` (plan stage), and `executing-plans` (build stage) from it. The
  whole plugin is required, not just those three: other superpowers skills
  (`subagent-driven-development`, `systematic-debugging`, and so on) are useful
  during the build stage too.
- the **`impeccable` skill** — UI design, used by the `design` and `build` stages.

Install both yourself. At preflight `adhd` checks both are available and halts
if either is missing.

## Install

Place this directory at `~/.claude/skills/adhd/`. That is all — no build step.
The three `scripts/*.mjs` files run on plain Node.js (v18+; tested on v24).

## Usage

Run inside the project you are building (not in this skill's repo):

- `/adhd` — report progress and name the next runnable stage.
- `/adhd <stage>` — run that stage.
- `/adhd <stage> <milestone|surface>` — run a stage for a specific target.

Start a new project with `/adhd setup`.

Two management commands sit outside the stage flow:

- `/adhd workspace` — switch to `multi` mode and register code repos.
- `/adhd adopt` — bring an existing, already-built project under `adhd` (drafts the
  front-load docs from the project's existing documentation).

You can also describe a task in plain words — `/adhd <free text>` — and `adhd`
picks the stage or command that fits, respecting the gates.

## Modes

`adhd` runs in one of two modes:

- **`single`** (default) — everything lives in one repo. `setup` scaffolds this;
  nothing extra to do.
- **`multi`** — the product spans several git repos. `adhd`'s `project/` tree lives
  in an orchestration repo; code repos are registered by logical name, and local
  paths live in a gitignored `project/repos.local.json` bound per-user. The product
  is split into user-defined **domains** — logical slices defined in the `map` stage;
  a milestone may span several domains. Run `/adhd workspace` to switch to `multi`
  mode and register repos.

Surfaces carry a `kind` — `ui`, `api`, or `lib`. The `design` stage uses
`impeccable` only for `ui` surfaces; `api` surfaces get an API-contract design and
`lib` surfaces get a plain spec.

## The flow

Front-load runs once. The per-milestone loop then repeats; the per-surface loop
repeats inside each milestone.

```
FRONT-LOAD (once)
  setup → vision → features → milestones → map

PER-MILESTONE LOOP
  surface-overview → milestone-ux
  design       (every surface — also builds the prototype surface)
  prototype    (assemble the clickable app; you click through and sign off)

  prototype-only milestone (infra: none):  → review
  production-track milestone:
    tracer → replan → gap
    plan → build  (every surface — the production app)
    review
  → advance-milestone → next milestone
```

| Stage | Does | Output |
|---|---|---|
| setup | scaffold layout, init `state.json` | folder tree |
| vision | product, users, usage | `docs/PRODUCT.md` |
| features | brain-dump every feature — the "spaceship" lives here | `project/features.md` |
| milestones | group features; Milestone 1 = first valuable product | `project/milestones.md` |
| map | sitemap of surfaces + domain glossary | `project/map.md`, `docs/GLOSSARY.md` |
| surface-overview | helicopter view of a milestone's surfaces; sets the track | `m<N>/overview.md` |
| milestone-ux | cross-surface UX; must-have security & errors | `m<N>/ux.md` |
| design | per-surface UX then UI; builds the surface into the prototype app | `surfaces/<name>.md` |
| prototype | assemble the clickable prototype; user clicks through and signs off | clickable app + `m<N>/prototype.md` |
| tracer | settle the data store; one thin slice through the real backend | `m<N>/tracer.md` + code |
| replan | revise the plan and reconcile the prototype against tracer findings | updated `overview.md` + `tracer.md` |
| gap | per-milestone delta between the prototype and the production app | `m<N>/gap.md` |
| plan | per-surface implementation plan for the production app | `plans/<name>.md` |
| build | build the production app, closing the gap | code |
| review | fresh-session design audit of the milestone | `m<N>/review.md` |

`tracer`, `replan`, `gap`, `plan`, and `build` run only on **production-track**
milestones. A **prototype-only** milestone (`infra: none`) ends at `prototype → review`.

## Prototype and production apps

Every project builds two apps that coexist even in single-repo mode:

- the **prototype app** — the product's UX on mock data, visual and clickable, the
  persistent and always-current reference;
- the **production app** — the real UI on real data and a real backend.

The clickable prototype is built and signed off **before** any backend or data-store
decision — `design` builds each `ui` surface into it, then the `prototype` stage wires
the milestone into one runnable app you open in a browser and validate. Every milestone
builds it, regardless of `infra`.

The prototype is not a separate project: it lives in the **same codebase and framework
as the production app**, under the **`/p/` route prefix** on a mock-data layer. A
production surface at `/<path>` has its prototype at `/p/<path>`. `adhd` applies this by
default; an unusual setup records its alternative in `docs/DECISIONS.md`.

Each milestone has a **track**, set from its `infra`. A `infra: none` milestone is
**prototype-only** — the clickable prototype is its deliverable. A milestone with real
`infra` is **production-track**: after the prototype is signed off, `tracer` settles the
data store and proves backend reality, `gap` measures the delta, and `build` builds the
production app to match the prototype. When reality contradicts the prototype, the
prototype is updated first — it stays the reference, and the production UI moves to match.

Where the two apps live in the repo is a tech decision, logged in `docs/DECISIONS.md`.

## How the gates work

A stage refuses to run unless every predecessor's output exists. **No skip, no
override.** If a gate fails, `adhd` halts and names the predecessor stage to run.
This is the skill's central discipline — it is not a bug when a stage refuses.

The gate is mechanical: it reads `state.json`, not intent. "Small project", "just
a prototype", "go fast", or "I already know the answer" do not open it — `adhd`
treats those as the failure mode the gate exists to catch, and the only way past
is to run the missing stage. The commit gate is absolute: no `git commit` without
your explicit "ok".

## What it creates in your project

```
.ruler/                  agent instructions
docs/
  PRODUCT.md  DESIGN.md  GLOSSARY.md  DECISIONS.md
  DATA.md                data model — created lazily, only once a milestone persists data
project/
  state.json             workflow progress — never hand-edit
  repos.local.json       gitignored — per-user repo→path bindings (multi mode)
  notes.md               transient scratchpad — healthy when empty
  features.md  milestones.md  map.md
  milestones/m<N>/        overview, ux, surfaces/, prototype, tracer, gap, plans/, review
```

`project/state.json` is owned by `scripts/adhd-state.mjs`. Never edit it by hand;
use the CLI (`/adhd` drives it for you).

## Rules worth knowing

- **Commit gate** — `adhd` never runs `git commit` without your explicit "ok".
- **Milestone discipline** — a new feature idea raised mid-project is filed to
  `features.md` and parked in a later milestone, not bolted onto the current one.
- **Product before tech** — the scope stages (`vision`, `features`, `milestones`,
  `map`) describe *what the product does* in capability terms — never a stack,
  framework, database, or architecture. Tech decisions live in `docs/DECISIONS.md`.
- **Tech, just-in-time** — each stack decision is made by the milestone that first
  needs it, not up front. A milestone can declare `infra: none` and ship as a
  fully-working UX prototype on mock data — no database, no data model. The data model
  appears in `docs/DATA.md` only once a milestone actually persists data.
- **notes.md** — a scratchpad read first every session; durable facts get
  migrated to their real home (`DECISIONS.md`, `GLOSSARY.md`, a surface spec).
- **Context watch** — `adhd` flags when to start a fresh session and emits a
  ready-to-paste resume prompt.

## Other agents

Codex and Cursor are supported. See `reference/codex-tools.md` and
`reference/cursor-tools.md` for the tool-name and command mappings.

## Layout

- `SKILL.md` — router: stage table, gates, rules.
- `reference/<stage>.md` — per-stage playbook, loaded on demand.
- `scripts/` — `adhd-state.mjs` (state + CLI), `context-watch.mjs`,
  `handoff-prompt.mjs`.
- `docs/` — design spec and implementation plan (rationale; not loaded at runtime).
