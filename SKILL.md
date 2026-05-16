---
name: adhd
description: "Use when starting, structuring, or building a software project end-to-end and you want a conductor that front-loads vision, scope, and structure before any code, then forbids skipping ahead. Sequences brainstorming and impeccable per surface, enforces hard stage gates, parks new feature ideas, and tracks progress in project/state.json. Triggers: /adhd, project kickoff, 'where am I in the build', milestone planning, scope discipline, feature parking lot, resume after a fresh session."
argument-hint: "[stage] [milestone|surface]"
user-invocable: true
license: Apache 2.0
---

`adhd` is a conductor. It front-loads a whole-project view — vision, scope, structure —
then feeds surfaces into `brainstorming` and `impeccable` in the right order, with hard
gates that forbid skipping ahead. It owns sequencing and discipline; the dependency
skills own the work inside each stage.

## Invocation

- `{{command_prefix}}adhd` — report progress (`adhd-state.mjs status`) and name the next runnable stage.
- `{{command_prefix}}adhd <stage>` — run that stage. `<stage>` is one of the table below.
- `{{command_prefix}}adhd <stage> <milestone|surface>` — run a stage for a specific milestone/surface.

## Required-skill preflight (non-optional)

`adhd` hard-depends on three skills with no fallback and no degraded mode:
`brainstorming`, `impeccable`, `writing-plans`.

Before ANY file mutation, confirm all three are available in the current agent.
There is no programmatic probe — self-confirm: state, in the response, that each
skill is present and invocable. If any is missing, name the missing skill(s) and
HALT. Do not give installation instructions — installing them is the user's job.

The Setup stage records this: after confirming the three skills, it runs
`node {{scripts_path}}/adhd-state.mjs preflight-confirm`, which writes
`preflight.skillsConfirmed` in `state.json`. Later runs can inspect it with
`node {{scripts_path}}/adhd-state.mjs read`.

Codex / Cursor agents must also state this line before mutating files:

```text
ADHD_PREFLIGHT: skills=pass gate=pass|fail:<stage> mutation=open
```

See `reference/codex-tools.md` and `reference/cursor-tools.md` for tool-name mappings.

## Canonical layout

The Setup stage scaffolds this exact tree in every project. Never deviate.

```
.ruler/                      agent instructions (ruler generates CLAUDE.md / AGENTS.md)
docs/
  PRODUCT.md                 Vision output — impeccable reads this
  DESIGN.md                  design system — impeccable reads/writes this
  DOMAIN.md                  domain / data model — Map output
  DECISIONS.md               decision log
project/
  state.json                 progress, stage status, effort log, doc-home config
  notes.md                   transient scratchpad (healthy = empty)
  features.md                Features stage
  milestones.md              Milestones stage
  map.md                     sitemap + structure
  milestones/m<N>/
    overview.md              Surface overview
    ux.md                    Milestone UX
    tracer.md                tracer slice notes + replan
    surfaces/<name>.md       per-surface Design spec
    plans/<name>.md          per-surface implementation Plan
    review.md                milestone review-pass findings
```

## Stages

| Stage | Loop | Effort | Output | Sub-skill | Reference |
|---|---|---|---|---|---|
| `setup` | front-load | low | layout + `state.json` | none | [reference/setup.md](reference/setup.md) |
| `vision` | front-load | high | `docs/PRODUCT.md` | none | [reference/vision.md](reference/vision.md) |
| `features` | front-load | medium | `project/features.md` | none | [reference/features.md](reference/features.md) |
| `milestones` | front-load | high | `project/milestones.md` | none | [reference/milestones.md](reference/milestones.md) |
| `map` | front-load | high | `project/map.md`, `docs/DOMAIN.md` | none | [reference/map.md](reference/map.md) |
| `surface-overview` | per-milestone | medium | `m<N>/overview.md` | none | [reference/surface-overview.md](reference/surface-overview.md) |
| `milestone-ux` | per-milestone | high | `m<N>/ux.md` | none | [reference/milestone-ux.md](reference/milestone-ux.md) |
| `tracer` | per-milestone | high | `m<N>/tracer.md` + code | none | [reference/tracer.md](reference/tracer.md) |
| `replan` | per-milestone | medium | updated `m<N>/overview.md` + `tracer.md` | none | [reference/replan.md](reference/replan.md) |
| `design` | per-surface | high | `m<N>/surfaces/<name>.md` | brainstorming + impeccable | [reference/design.md](reference/design.md) |
| `plan` | per-surface | medium | `m<N>/plans/<name>.md` | writing-plans | [reference/plan.md](reference/plan.md) |
| `build` | per-surface | medium | code + `state.json` | impeccable craft / executing-plans | [reference/build.md](reference/build.md) |
| `review` | per-milestone | high | `m<N>/review.md` | none | [reference/review.md](reference/review.md) |

Flow: front-load runs once (`setup → vision → features → milestones → map`). Then per
milestone: `surface-overview → milestone-ux → tracer → replan`, then per surface
`design → plan → build`, then `review`, then the next milestone.

After a milestone's `review` passes, advance with
`node {{scripts_path}}/adhd-state.mjs advance-milestone` — it bumps
`currentMilestone`, clears `currentSurface`, and resets the context-watch
session. Then run `surface-overview` for the new milestone. When
`adhd-state.mjs status` reports the next stage as `next-milestone`, this is
the step it means.

## Hard gates

A stage refuses to run unless every predecessor is satisfied. **No skip. No override.**
This is the skill's central discipline.

Every stage's reference file begins with a gate check:
`node {{scripts_path}}/adhd-state.mjs gate <stage> [--milestone N] [--surface name]`.
If it reports `missing`, HALT and tell the user which predecessor stage to run.

## Routing

1. **No argument** — run `adhd-state.mjs status`, print it, name the next runnable stage. Stop.
2. **First word is a stage** — load `reference/<stage>.md` and follow it exactly. The
   reference owns the gate check, the procedure, and the completion steps.
3. **First word is not a stage** — treat the whole argument as context for the next
   runnable stage; confirm with the user before running it.

If `state.json` does not exist, the only runnable stage is `setup`.

## Cross-cutting rules (active in every stage)

- **Hard gates** — see above. Never bypass.
- **Effort hints** — each stage carries a suggested reasoning effort; surface it to the user.
- **Context watch** — after each stage run `context-watch.mjs`; if it advises a fresh
  session, run `handoff-prompt.mjs` and give the user the resume prompt.
- **Handoff prompts** — on a session switch, the resume prompt always says "read
  `project/notes.md` first".
- **Small steps** — every stage and slice is bounded. If a step will not fit cleanly,
  split it before starting.
- **Commit gate** — NEVER run `git commit` without the user's explicit "ok" / "lgtm".
  No exceptions.
- **Milestone discipline (soft warn)** — once milestones are set, a new feature idea is
  filed to `features.md` and assigned a milestone (usually later). Warn when an idea
  would expand the current milestone; do not hard-block.
- **notes.md discipline** — `project/notes.md` is a transient scratchpad, read first
  every session, healthy when empty. Migrate anything durable to its canonical home
  (`DECISIONS.md`, `DOMAIN.md`, a surface spec, `.ruler/`, `milestones.md`).

## Sub-skill output routing

`brainstorming` and `writing-plans` default their durable output to
`docs/superpowers/specs/` and `docs/superpowers/plans/`. `adhd` overrides this on
every invocation: surface specs go to `project/milestones/m<N>/surfaces/`, plans to
`project/milestones/m<N>/plans/`. Always pass the canonical target path when invoking
a sub-skill. Leave `.superpowers/` and `.impeccable/` untouched — Setup adds both to
`.gitignore`.

## Scripts

```bash
node {{scripts_path}}/adhd-state.mjs <init|read|status|next|set|gate|session-add|session-reset|preflight-confirm|advance-milestone>
node {{scripts_path}}/context-watch.mjs [--next <stage>]
node {{scripts_path}}/handoff-prompt.mjs
```
