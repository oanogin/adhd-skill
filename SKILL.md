---
name: adhd
description: "Use when starting, structuring, or building a software project end-to-end and you want a conductor that front-loads vision, scope, and structure before any code, then forbids skipping ahead. Triggers: /adhd, project kickoff, 'where am I in the build', milestone planning, scope discipline, feature parking lot, resume after a fresh session, new feature idea raised mid-project, a stage gate refusing to run."
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

`adhd` hard-depends on two things, with no fallback and no degraded mode:

- the **`superpowers` plugin** — `adhd` invokes `brainstorming` (design stage),
  `writing-plans` (plan stage), and `executing-plans` (build stage) from it.
  The whole plugin is required, not just those three: other superpowers skills
  (e.g. `subagent-driven-development`, `systematic-debugging`) are useful during
  the build stage too.
- the **`impeccable` skill** — UI design for the `design` and `build` stages.

Before ANY file mutation, confirm both are available in the current agent.
There is no programmatic probe — self-confirm: state, in the response, that the
`superpowers` plugin and `impeccable` are present and invocable. If either is
missing, name it and HALT. Do not give installation instructions — installing
them is the user's job.

The Setup stage records this: after confirming both dependencies, it runs
`node {{scripts_path}}/adhd-state.mjs preflight-confirm`, which writes
`preflight.skillsConfirmed` in `state.json`. Later runs can inspect it with
`node {{scripts_path}}/adhd-state.mjs read`.

Codex / Cursor agents must also state this line before mutating files:

```text
ADHD_PREFLIGHT: skills=pass gate=pass|fail:<stage> mutation=open
```

See `reference/codex-tools.md` and `reference/cursor-tools.md` for tool-name mappings.

## Modes

`adhd` runs in one of two modes, recorded in `project/state.json`:

- **`single`** (default) — `project/` lives at the repo root; all work happens in
  this one repo. `setup` always scaffolds in `single` mode; nothing extra to do.
- **`multi`** — the `project/` tree lives in the repo where `setup` ran (the
  **orchestration repo**); code repos are registered by absolute local path.
  Switch to `multi` and register repos with the `workspace` command.

In `multi` mode every `adhd` artifact still lives in the orchestration repo's
`project/` and `docs/`. Only the `tracer` and `build` stages reach into a
registered code repo, and only to write code there. A `state.json` written before
this feature (no `mode` / `repos` fields) is treated as `single` with an empty
registry.

## Canonical layout

The Setup stage scaffolds this exact tree in every project. Never deviate.

```
.ruler/                      agent instructions (ruler generates CLAUDE.md / AGENTS.md)
docs/
  PRODUCT.md                 Vision output — impeccable reads this
  DESIGN.md                  design system — impeccable reads/writes this
  DOMAIN.md                  domain glossary (concepts + relationships) — Map output
  DATA.md                    data model / schema — created lazily when a milestone persists data
  DECISIONS.md               decision log, incl. tech stack (decided just-in-time)
project/
  state.json                 progress, stage status, effort log, doc-home config
  notes.md                   transient scratchpad (healthy = empty)
  features.md                Features stage
  milestones.md              Milestones stage
  map.md                     sitemap + structure
  milestones/m<N>/
    overview.md              Surface overview
    ux.md                    Milestone UX
    surfaces/<name>.md       per-surface Design spec
    prototype.md             prototype sign-off notes
    tracer.md                tracer slice notes + replan (production-track)
    gap.md                   prototype-vs-production gap analysis (production-track)
    plans/<name>.md          per-surface implementation Plan (production-track)
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
| `design` | per-surface | high | `m<N>/surfaces/<name>.md` + prototype surface | brainstorming + impeccable | [reference/design.md](reference/design.md) |
| `prototype` | per-milestone | medium | clickable prototype app + `m<N>/prototype.md` | impeccable craft | [reference/prototype.md](reference/prototype.md) |
| `tracer` | per-milestone (production) | high | `m<N>/tracer.md` + code | none | [reference/tracer.md](reference/tracer.md) |
| `replan` | per-milestone (production) | medium | updated `m<N>/overview.md` + `tracer.md` | none | [reference/replan.md](reference/replan.md) |
| `gap` | per-milestone (production) | medium | `m<N>/gap.md` | none | [reference/gap.md](reference/gap.md) |
| `plan` | per-surface (production) | medium | `m<N>/plans/<name>.md` | writing-plans | [reference/plan.md](reference/plan.md) |
| `build` | per-surface (production) | medium | code + `state.json` | impeccable craft / executing-plans | [reference/build.md](reference/build.md) |
| `review` | per-milestone | high | `m<N>/review.md` | none | [reference/review.md](reference/review.md) |

Flow: front-load runs once (`setup → vision → features → milestones → map`). Then per
milestone: `surface-overview → milestone-ux`, then `design` for every surface, then the
milestone-wide `prototype` (clickable UX checkpoint). A **prototype-only** milestone
(`infra: none`) then goes straight to `review`. A **production-track** milestone instead
continues `tracer → replan → gap`, then `plan → build` for every surface, then
`review`. Then the next milestone.

After a milestone's `review` passes, advance with
`node {{scripts_path}}/adhd-state.mjs advance-milestone` — it bumps
`currentMilestone`, clears `currentSurface`, and resets the context-watch
session. Then run `surface-overview` for the new milestone. When
`adhd-state.mjs status` reports the next stage as `next-milestone`, this is
the step it means.

## Surface kinds

Every surface has a `kind` — `ui`, `api`, or `lib` — assigned during `map` and
`surface-overview`. The `design` stage routes by it:

- `ui` — brainstorming for UX, then `impeccable` for UI.
- `api` — brainstorming for behavior and contract semantics, then API-contract
  design (protobuf, OpenAPI, or similar). `impeccable` is not invoked.
- `lib` — brainstorming for responsibility and public interface, then a spec only.

In `multi` mode each surface is also tagged with the registered `repo` it is built
in. `map` and `surface-overview` record both with
`node {{scripts_path}}/adhd-state.mjs surface-meta <name> --milestone {{N}} --repo <repo> --kind <kind>`.

## Prototype and production apps

Every `adhd` project builds two apps that coexist even in `single` mode:

- the **prototype app** — the product's UX on mock data, visual and clickable. The
  `design` stage builds each `ui` surface into it; the `prototype` stage wires the
  milestone's surfaces into one runnable app the user opens in a browser and validates.
  It is the persistent, always-current UX reference and is never thrown away.
- the **production app** — the real UI on real data and a real backend.

The clickable prototype is built and signed off **before** any backend, data store, or
`tracer` decision. It is decoupled from `infra`: every milestone builds it.

Each milestone has a **track**, set at `surface-overview` from its `infra` field:

- **prototype-only** (`infra: none`) — `surface-overview → milestone-ux → design →
  prototype → review`. The clickable prototype is the deliverable. No `tracer`, no
  production app, no data model, no database.
- **production-track** (any real `infra`) — the same up to `prototype`, then continues
  `tracer → replan → gap → plan → build → review`. `tracer` settles the data store and
  proves backend reality; `build` builds the production app; `gap` measures the delta
  the production app must close to match the signed-off prototype.

When real-backend reality contradicts the prototype, `replan` updates the prototype
FIRST — it stays the current reference, and the production UI is moved to match it.

Where the two apps live in the repo is a tech decision, logged in `docs/DECISIONS.md`
at the milestone that needs it — `adhd` does not fix the layout.

## Hard gates

A stage refuses to run unless every predecessor is satisfied. **No skip. No override.**
This is the skill's central discipline.

Every stage's reference file begins with a gate check:
`node {{scripts_path}}/adhd-state.mjs gate <stage> [--milestone N] [--surface name]`.
If it reports `missing`, HALT and tell the user which predecessor stage to run.

**Violating the letter of the gates is violating the spirit of `adhd`.** The whole
skill IS the gate discipline. A "harmless" skip is exactly the failure mode it exists
to prevent.

### Red flags — STOP

You are about to break a gate if you catch yourself thinking any of these:

- "The user clearly wants code, I'll skip ahead and backfill the stage later."
- "This project is small / just a prototype, gates are overkill here."
- "Setup/vision is obvious, I'll start a stage or two in."
- "The gate says `missing` but I already know the answer in my head."
- "I'll run the stage but skip its reference file — I remember the procedure."
- "User said go fast / no clarifying questions, so gates don't apply."
- "One `git commit` without an explicit ok is fine, it's clearly wanted."

Each of these means: STOP. Run the gate. Run the missing predecessor stage.

### Rationalization table

| Excuse | Reality |
|---|---|
| "It's a prototype — skip the front-load." | Prototype scope still needs vision + milestones or the build wanders. They run fast at low effort. Run them. |
| "User wants code now." | `adhd`'s value is code that fits a plan. Skipping the plan is the exact thing the user invoked `adhd` to prevent. |
| "I know the predecessor's output — no need to run it." | The output is a file later stages and fresh sessions read. In-your-head ≠ on disk. Run the stage. |
| "'No clarifying questions' means skip gates." | That instruction sets pace, not discipline. A gate is not a question. |
| "The gate is a false positive." | The gate reads `state.json`. If it says `missing`, the artifact is missing. Fix the artifact, never the gate. |
| "I'll backfill the skipped stage afterward." | Later lacks the context this stage has now. Stages are ordered because each feeds the next. |
| "One commit without explicit ok is harmless." | The commit gate has zero exceptions. Ask first. |

## Management commands

These are not stages — they have no gates and no place in the stage flow:

- `workspace` — switch a project to `multi` mode and register code repos. See
  [reference/workspace.md](reference/workspace.md).
- `adopt` — bring an existing project under `adhd`; substitutes for the front-load
  loop. See [reference/adopt.md](reference/adopt.md).

## Routing

1. **No argument** — run `adhd-state.mjs status`, print it, name the next runnable
   stage. Stop.
2. **First word is a stage or a management command** — the 15 stages are in the
   table above; `workspace` and `adopt` are management commands. Load the matching
   `reference/<name>.md` and follow it exactly. The reference owns the gate check
   (stages), the procedure, and the completion steps.
3. **First word matches nothing** — treat the whole input as a task description.
   Run `adhd-state.mjs status`, then select the stage or management command that
   fits the task, gate-aware:
   - route the task to the stage that addresses it (e.g. "this API needs
     designing" → `design` for that surface);
   - if the task implies skipping ahead, name the gate blocking it instead of
     running it;
   - if it is a new feature idea raised mid-project, file it to `features.md` and
     apply the milestone-discipline soft-warn;
   - state the routing decision, then proceed — confirming with the user first
     when the task is ambiguous or the action mutates files.

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
- **No "MVP"** — never write "MVP" in any `adhd` artifact or message. The term is vague
  and smuggles in scope assumptions. Say "Milestone 1" or "the first valuable product".
- **Capability, not mechanism** — the product-scope stages (`vision`, `features`,
  `milestones`, `map`) describe *what the product does* in capability terms ("data
  persists", "users sign in", "results update live"). They never name a mechanism — no
  stack, framework, database, or architecture. Mechanism talk belongs in
  `docs/DECISIONS.md`, never in a product-scope artifact.
- **Tech at the latest responsible moment** — a stack/architecture decision is made by
  the milestone that first needs the capability, never earlier, and logged in
  `docs/DECISIONS.md`. A known-firm choice (e.g. a frontend framework) may be logged at
  any time, but is never required to start. A capability with no mechanism yet is
  normal: a milestone whose infra need is "none" is a valid, fully-working UX prototype —
  mock data, no data model, no database. The data model lives in `docs/DATA.md`, created
  lazily the first time a milestone persists real data.
- **notes.md discipline** — `project/notes.md` is a transient scratchpad, read first
  every session, healthy when empty. Migrate anything durable to its canonical home
  (`DECISIONS.md`, `DOMAIN.md`, `DATA.md`, a surface spec, `.ruler/`, `milestones.md`).

## Sub-skill output routing

`brainstorming` and `writing-plans` default their durable output to
`docs/superpowers/specs/` and `docs/superpowers/plans/`. `adhd` overrides this on
every invocation: surface specs go to `project/milestones/m<N>/surfaces/`, plans to
`project/milestones/m<N>/plans/`. Always pass the canonical target path when invoking
a sub-skill. Leave `.superpowers/` and `.impeccable/` untouched — Setup gitignores
`.superpowers/`; `.impeccable/` stays tracked in git.

## Common mistakes

These are operational slips, not gate-skipping (gate rationalizations are tabled above).

| Mistake | Fix |
|---|---|
| Hand-editing `project/state.json`. | It is owned by `adhd-state.mjs`. Mutate it only through CLI subcommands — hand edits desync gates and the effort log. |
| Running a stage from memory, skipping its `reference/<stage>.md`. | Always load the reference file. It owns the gate check, procedure, and completion steps; memory drifts from the current version. |
| Letting sub-skills write to their default `docs/superpowers/` paths. | Pass the canonical target on every invocation — specs to `project/milestones/m<N>/surfaces/`, plans to `.../plans/`. |
| Treating `project/notes.md` as durable storage. | It is a transient scratchpad. Migrate durable facts to `DECISIONS.md`, `DOMAIN.md`, a surface spec, or `.ruler/`. Healthy `notes.md` is empty. |
| Invoking `impeccable` for an `api` or `lib` surface. | `impeccable` runs only for `ui` surfaces. `api` → contract design; `lib` → spec only. |
| Forgetting `advance-milestone` after a milestone's `review` passes. | Run `adhd-state.mjs advance-milestone` — without it `currentMilestone` never bumps and `status` keeps reporting the finished milestone. |
| In `multi` mode, writing `project/` or `docs/` artifacts into a code repo. | All `adhd` artifacts live in the orchestration repo. Only the code-writing stages (`design`, `prototype`, `tracer`, `build`) touch a registered code repo, and only to write code. |
| Bolting a mid-project feature idea onto the current milestone. | File it to `features.md` and assign a later milestone. Soft-warn if it would expand the current milestone. |

## Scripts

```bash
node {{scripts_path}}/adhd-state.mjs <init|read|status|next|set|gate|session-add|session-reset|preflight-confirm|advance-milestone|workspace-mode|workspace-add|workspace-remove|workspace-list|milestone-track|surface-meta>
node {{scripts_path}}/context-watch.mjs [--next <stage>]
node {{scripts_path}}/handoff-prompt.mjs
```
