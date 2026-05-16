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
  in an orchestration repo; code repos are registered by local path. Run
  `/adhd workspace` to switch to `multi` mode and register repos.

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
  surface-overview → milestone-ux → tracer → replan
  PER-SURFACE LOOP
    design → plan → build
  review
  → advance-milestone → next milestone
```

| Stage | Does | Output |
|---|---|---|
| setup | scaffold layout, init `state.json` | folder tree |
| vision | product, users, usage | `docs/PRODUCT.md` |
| features | brain-dump every feature — the "spaceship" lives here | `project/features.md` |
| milestones | group features; Milestone 1 = first valuable product | `project/milestones.md` |
| map | sitemap of surfaces + domain model | `project/map.md`, `docs/DOMAIN.md` |
| surface-overview | helicopter view of a milestone's surfaces | `m<N>/overview.md` |
| milestone-ux | cross-surface UX; must-have security & errors | `m<N>/ux.md` |
| tracer | one thin end-to-end slice — surfaces hard reality early | `m<N>/tracer.md` + code |
| replan | revise surface plan against tracer findings | updated `overview.md` + `tracer.md` |
| design | per-surface UX then UI; surface-specific security & errors | `surfaces/<name>.md` |
| plan | per-surface implementation plan | `plans/<name>.md` |
| build | implement the surface | code |
| review | fresh-session design audit of the milestone | `m<N>/review.md` |

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
  PRODUCT.md  DESIGN.md  DOMAIN.md  DECISIONS.md
project/
  state.json             workflow progress — never hand-edit
  notes.md               transient scratchpad — healthy when empty
  features.md  milestones.md  map.md
  milestones/m<N>/        overview, ux, tracer, surfaces/, plans/, review
```

`project/state.json` is owned by `scripts/adhd-state.mjs`. Never edit it by hand;
use the CLI (`/adhd` drives it for you).

## Rules worth knowing

- **Commit gate** — `adhd` never runs `git commit` without your explicit "ok".
- **Milestone discipline** — a new feature idea raised mid-project is filed to
  `features.md` and parked in a later milestone, not bolted onto the current one.
- **notes.md** — a scratchpad read first every session; durable facts get
  migrated to their real home (`DECISIONS.md`, `DOMAIN.md`, a surface spec).
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
