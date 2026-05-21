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
- `/adhd <stage> <milestone|feature>` — run a stage for a specific target.

Start a new project with `/adhd setup`.

Two management commands sit outside the stage flow:

- `/adhd workspace` — switch to `multi` mode, register code repos, set prototype topology.
- `/adhd adopt` — bring an existing, already-built project under `adhd` (drafts the
  groundwork docs from the project's existing documentation).

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

Groundwork establishes the product and its structure (mostly once — `stories` stays
re-runnable as a living backlog). There is no pre-planned roadmap: a milestone is
formed just-in-time at `milestone-brief` by choosing stories. The per-milestone loop
then repeats; the per-feature loop repeats inside a production-track milestone.

```
GROUNDWORK
  setup → vision → stories → foundation → map

PER-MILESTONE LOOP
  milestone-brief   (choose stories from the backlog; set the track)
  design            (every surface UX+UI + the wired clickable prototype + sign-off)

  prototype-only milestone (infra: none):  → review → finalize
  production-track milestone:
    tracer → features
    plan → build  (one feature at a time, DAG order — plan it, build it, next)
    review
  → finalize → next milestone (a new m<N>/ folder)
```

Milestones are independent `m<N>/` folders — no global pointer, so two or three can be
in flight at once. The next milestone is started simply by running `milestone-brief`
again.

| Stage | Does | Output |
|---|---|---|
| setup | scaffold layout, init `config.json` | folder tree |
| vision | product, users, usage | `docs/PRODUCT.md` |
| stories | brain-dump every story — the living "spaceship" backlog | `project/stories.md` |
| foundation | the firm tech baseline — no full arch | `docs/DECISIONS.md` |
| map | surface catalog + domains + deployables + glossary | `project/map.md`, `docs/GLOSSARY.md` |
| milestone-brief | choose stories, confirm surfaces, set track, lock security/errors | `m<N>/brief.md` |
| design | every surface UX+UI + the wired clickable prototype + sign-off | `m<N>/surfaces/*`, `m<N>/design.md` |
| tracer | settle the data store; one thin slice through the real backend | `m<N>/tracer.md` + code |
| features | decompose chosen stories into the per-domain feature DAG | `m<N>/features.md` |
| plan | per-feature implementation plan for the production app | `m<N>/plans/<feature>.md` |
| build | build the feature (DAG order), verify it | code |
| review | fresh-session audit of the milestone | `m<N>/review.md` |
| finalize | clean up docs, write the milestone summary | `m<N>/summary.md` |

`tracer`, `features`, `plan`, and `build` run only on **production-track**
milestones. A **prototype-only** milestone (`infra: none`) goes
`design → review → finalize`.

## Prototype and production apps

Every project builds two apps that coexist even in single-repo mode:

- the **prototype app** — the product's UX on mock data, visual and clickable, the
  persistent and always-current reference;
- the **production app** — the real UI on real data and a real backend.

The clickable prototype is built and signed off **before** any backend or data-store
decision — the `design` stage builds each `ui` surface into it and wires the milestone
into one runnable app you open in a browser and validate. Every milestone builds it,
regardless of `infra`.

Where the prototype lives is the project's **`prototypeTopology`**. By default it is
`colocated` — the prototype shares the **production app's codebase and framework**,
under the **`/p/` route prefix** on a mock-data layer, so a production surface at
`/<path>` has its prototype at `/p/<path>`. A project whose prototype is a **standalone
app** — its own repo, possibly its own framework, separate from production — runs
`standalone` topology instead: the prototype app's home is set once via the `workspace`
command, and each `ui` surface's own `repo` is its separate production home.

Each milestone has a **track**, set from its `infra`. A `infra: none` milestone is
**prototype-only** — the clickable prototype is its deliverable. A milestone with real
`infra` is **production-track**: after the prototype is signed off, `tracer` settles the
data store and proves backend reality, `features` decomposes the work into a dependency
DAG, and `build` builds the production app to match the prototype. When reality
contradicts the prototype, the prototype is updated first — it stays the reference, and
the production app moves to match.

Where the two apps live in the repo is a tech decision, logged in `docs/DECISIONS.md`.

## How the gates work

A stage refuses to run unless every predecessor's output exists. **No skip, no
override.** If a gate fails, `adhd` halts and names the predecessor stage to run.
This is the skill's central discipline — it is not a bug when a stage refuses.

The gate is mechanical: it checks whether the predecessor **artifact files exist** on
disk, not your intent. A stage is done the moment its artifact exists — so never
create that file before the stage's work is truly complete. "Small project", "just a
prototype", "go fast", or "I already know the answer" do not open a gate. The commit
gate is absolute: no `git commit` without your explicit "ok".

## What it creates in your project

The project's state IS this tree — there is no separate database. A stage is done
when its artifact file exists.

```
.ruler/                  agent instructions
docs/
  PRODUCT.md  DESIGN.md  GLOSSARY.md  DECISIONS.md
  DATA.md                data model — created lazily, only once a milestone persists data
project/
  config.json            the only non-doc file — mode, repos, prototype topology
  repos.local.json       gitignored — per-user repo→path bindings (multi mode)
  .session.json          gitignored — ephemeral context-watch scratch
  notes.md               transient scratchpad — healthy when empty
  stories.md             the living story backlog
  map.md                 surface catalog + domains + deployables
  milestones/m<N>/        brief, surfaces/, design, tracer, features (the DAG), plans/, review, summary
```

`project/config.json` is owned by `scripts/adhd-state.mjs` — mutate it via the CLI,
not by hand. Everything else is plain markdown you (and `adhd`) edit directly.

## Rules worth knowing

- **Commit gate** — `adhd` never runs `git commit` without your explicit "ok".
- **Milestone discipline** — a new story idea raised mid-project is filed to
  `stories.md` (the living backlog), to be picked up by a future `milestone-brief` —
  not bolted onto the milestone in flight.
- **Product before tech** — the scope stages (`vision`, `stories`, `map`) describe
  *what the product does* in capability terms — never a stack, framework, database, or
  architecture. The firm tech baseline lives in `docs/DECISIONS.md` (`foundation`).
- **Tech, just-in-time** — `foundation` records only the firm, known-from-the-start
  baseline; every other stack decision is made by the milestone that first needs it. A
  milestone can declare `infra: none` and ship as a fully-working UX prototype on mock
  data — no database, no data model. The data model appears in `docs/DATA.md` only once
  a milestone actually persists data.
- **Single source of truth** — `adhd audit` checks the `.md` artifacts for drift,
  orphans, and misplaced info.
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
- `scripts/` — `adhd-state.mjs` (read/derive + `config.json` CLI),
  `context-watch.mjs`, `handoff-prompt.mjs`.
