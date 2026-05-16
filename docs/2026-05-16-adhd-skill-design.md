# 2026-05-16 — `adhd` skill — design

**Status:** design — brainstorm output, awaiting spec review.
**Type:** personal Claude Code skill, installed at `~/.claude/skills/adhd/`, used in every project the author builds.
**Depends on:** `superpowers:brainstorming`, `impeccable`, `superpowers:writing-plans`.

---

## 1. Problem

The author repeatedly starts building backend and screens before the whole-project picture is locked, and cannot stop inventing features. Concrete failures:

- The current app was rewritten 3–4 times for lack of an upfront whole-project view.
- Drawing every screen (via Claude Design) before product, scope, and behavior were nailed produced a design that mismatched intent.
- Implementation kept *uncovering* behavior that should have been decided earlier (rate limits, slug regex, error handling), causing rework and exhaustion.
- Project docs are scattered across `.ruler/`, `docs/`, and `tasks/` with no fixed home.
- No discipline separating a shippable first product from an ever-growing "spaceship" feature set.

`brainstorming` and `impeccable` already handle per-surface UX and UI. What is missing is the **layer above them**: a conductor that front-loads vision, scope, and structure, then feeds surfaces into those skills in the right order, with hard gates that forbid skipping ahead.

`adhd` is that conductor.

---

## 2. Skill architecture

Installed at `~/.claude/skills/adhd/`, mirroring the `impeccable` layout:

- `SKILL.md` — router: stage table, hard-gate rules, the fixed canonical layout, cross-cutting rules.
- `reference/<stage>.md` — one file per stage, loaded on demand.
- `scripts/` — state read/write, context-window watch helper, handoff-prompt generator.

**Invocation:**
- `/adhd` (no argument) — report current progress from `state.json` and the next runnable stage.
- `/adhd <stage>` — run that stage.

**Hard gates:** a stage refuses to run unless every predecessor stage's output file exists. No skip, no override. This is the skill's central discipline.

---

## 3. Fixed canonical layout

Every project gets the identical layout. The Setup stage scaffolds it.

```
.ruler/                  agent instructions (ruler generates CLAUDE.md / AGENTS.md)
docs/
  PRODUCT.md             Vision output — impeccable reads this
  DESIGN.md              design system — impeccable reads this
  DOMAIN.md              domain / data model — Map output
  DECISIONS.md           decision log
project/
  state.json             progress, stage gates, effort log, doc-home config
  notes.md               transient scratchpad (see section 6)
  features.md            Features stage
  milestones.md          Milestones stage
  map.md                 sitemap + structure
  milestones/m<N>/
    overview.md           Surface overview
    ux.md                 Milestone UX
    tracer.md             tracer slice notes + replan
    surfaces/<name>.md     per-surface Design spec
    plans/<name>.md        per-surface implementation Plan
    review.md             milestone review-pass findings
```

`brainstorming` and `impeccable` already read `docs/PRODUCT.md` and `docs/DESIGN.md`, so this layout integrates with them without glue.

---

## 4. Stage flow

Front-load runs once per project. The per-milestone loop then repeats for each milestone; the per-surface loop repeats for each surface within a milestone.

```
FRONT-LOAD (once)
  1 Setup → 2 Vision → 3 Features → 4 Milestones → 5 Map

PER-MILESTONE LOOP
  6 Surface overview
  7 Milestone UX
  T Tracer
  R Replan
  PER-SURFACE LOOP
    8 Design → 9 Plan → 10 Build
  V Review
  → next milestone (back to 6)
```

### Front-load

| # | Stage | Does | Output | Effort |
|---|---|---|---|---|
| 1 | Setup | Scaffold the canonical layout, init `state.json` | folder tree | low |
| 2 | Vision | Capture product, target users, where/how it is used | `docs/PRODUCT.md` | high |
| 3 | Features | Brain-dump every envisioned feature, its business value, and dependencies. The "spaceship" belongs here — this is its right home | `project/features.md` | medium |
| 4 | Milestones | Group features into milestones respecting dependencies; identify Milestone 1 = the first genuinely valuable product covering target users' needs. Later milestones are the parking lot | `project/milestones.md` | high |
| 5 | Map | Structural inventory only: sitemap of surfaces + domain / data model sketch | `project/map.md`, `docs/DOMAIN.md` | high |

### Per-milestone loop

| # | Stage | Does | Output | Effort |
|---|---|---|---|---|
| 6 | Surface overview | Helicopter view: list every surface in the milestone with rough purpose / content. Low detail, understandable | `m<N>/overview.md` | medium |
| 7 | Milestone UX | Design the milestone's UX as a whole, cross-surface, to verify nothing is forgotten. **Must-have security and error handling are advised here** | `m<N>/ux.md` | high |
| T | Tracer | Build one deliberate thin end-to-end slice (one surface, real backend) that exercises the risk classes: auth, errors, rate limits, data shape. Surfaces hard reality early | `m<N>/tracer.md` + code | high |
| R | Replan | Revise the milestone's surface plan against what the tracer discovered | updated `m<N>/overview.md` + `tracer.md` | medium |
| V | Review | Fresh-session design audit once all milestone surfaces are built. Testing-green is not design-green | `m<N>/review.md` | high |

### Per-surface loop

| # | Stage | Does | Output | Skill | Effort |
|---|---|---|---|---|---|
| 8 | Design | Detailed UX then UI per surface. **Surface-specific (less-critical) security and errors enumerated here** | `surfaces/<name>.md` | brainstorming → impeccable | high |
| 9 | Plan | Implementation order + plan for the surface | `plans/<name>.md` | writing-plans | medium |
| 10 | Build | Implement the surface; track progress in `state.json` | code + `state.json` | impeccable craft / executing-plans | per-task |

### Security and error handling

- **Milestone UX (7):** the conductor advises the *must-have* security and error handling for the milestone.
- **Design (8):** each surface enumerates its *surface-specific, less-critical* security and errors.
- Nothing reaches Build undefined. This directly targets the "behavior uncovered during implementation" failure.

---

## 5. Cross-cutting rules

Active in every stage.

- **Hard gates** — a stage refuses to run if a predecessor output is missing. No skip, no override.
- **Effort hints** — every stage carries a suggested reasoning effort (low → extra-high), so the author is not guessing.
- **Context watch** — the conductor monitors context pressure and flags when to start a fresh session.
- **Handoff prompts** — on a session switch the conductor emits a ready-to-paste resume prompt: current stage, state summary, and "read `project/notes.md` first".
- **Small steps** — every stage and slice is bounded in size and complexity. If a step will not fit cleanly, the conductor splits it before starting.
- **Commit gate** — the conductor NEVER runs `git commit` without the author's explicit "ok" / "lgtm". No exceptions.
- **MILESTONE discipline (soft warn)** — once milestones are set, a new feature idea raised mid-project is filed to `features.md` and assigned to a milestone (usually a later one); the conductor warns when an idea would expand the current milestone but does not hard-block.

---

## 6. `project/notes.md` discipline

`notes.md` is a **transient scratchpad, not a source of truth.**

- Read FIRST by every session.
- Healthy state is **empty**.
- Anything durable — a decision, a discovered rule, a mechanism — is migrated to its canonical home: `DECISIONS.md`, `DOMAIN.md`, the relevant surface spec, `.ruler/`, `milestones.md`, etc.
- The conductor drains `notes.md` opportunistically: whenever an entry has a clear home, it moves it. No fixed schedule.
- Kept small. It is helpful working memory, never the primary record.

---

## 7. Integration with the dependency skills

- **Stage 2 Vision** produces `docs/PRODUCT.md` in the shape `impeccable` expects.
- **Stage 8 Design** runs `brainstorming` for the surface's UX, then `impeccable` for its UI.
- **Stage 9 Plan** runs `superpowers:writing-plans`.
- **Stage 10 Build** runs `impeccable craft` / `superpowers:executing-plans`.
- The conductor owns sequencing and gates; the dependency skills own the work inside each stage.

---

## 8. Agent portability

The skill must run on Claude Code, Codex, and Cursor (the author's collaborators use Cursor and Codex).

### Tool and command portability

- Reference Claude Code tool names and `/`-commands through placeholder tokens (`{{command_prefix}}`, `{{scripts_path}}`, etc.), resolved per agent — the pattern `impeccable` already uses.
- Ship per-agent tool-mapping reference files (e.g. `reference/codex-tools.md`, `reference/cursor-tools.md`) translating Claude Code tool names to each agent's equivalents.
- Non-Claude-Code agents state a preflight state line before mutating files, mirroring `impeccable`'s `IMPECCABLE_PREFLIGHT`.

### Required-skill preflight

- `adhd` hard-depends on all three skills: `brainstorming`, `impeccable`, `writing-plans`. All three are **required** — there is no fallback and no degraded mode.
- Before running, `adhd` checks that all three are available in the current agent.
- If any is missing, `adhd` names the missing required skill(s) and halts. It does **not** provide installation instructions — installing them is the user's responsibility.

---

## 9. Folder ownership and sub-skill output routing

The dependency skills create their own folders. None collide with the canonical layout on path, but `adhd` must route their durable outputs or the project fragments — the exact doc-sprawl this skill exists to prevent.

| Folder | Owner | Type | `adhd` handling |
|---|---|---|---|
| `docs/superpowers/specs/`, `docs/superpowers/plans/` | `brainstorming`, `writing-plans` default output | durable | `adhd` overrides the output path on every invocation: surface specs to `project/milestones/m<N>/surfaces/`, plans to `project/milestones/m<N>/plans/`. Both skills honor a caller-specified location |
| `.superpowers/` (root) | `brainstorming` visual companion | transient scratch | left as-is; added to `.gitignore` by Setup |
| `.impeccable/` (root: `design.json`, `live/`) | `impeccable` | `impeccable`'s private state | left to `impeccable`; never touched by `adhd`; added to `.gitignore` by Setup |

- **No path collision** — `.ruler/`, `docs/*.md`, and `project/` are all distinct from the sub-skills' folders.
- **State files coexist** — `project/state.json` (adhd workflow progress) and `.impeccable/design.json` (impeccable's design-system cache) have different scopes and paths; they do not conflict.
- **Routing rule** — any stage that invokes a sub-skill passes the canonical `project/` target path. `adhd` owns where durable artifacts land; the sub-skills own only their own private and transient directories.

---

## 10. Open items for the build phase

- Exact `state.json` schema (stage status, gate flags, effort log, doc-home config).
- Whether the context-watch helper estimates usage heuristically or via a harness signal.
- Per-stage `reference/<stage>.md` content — the detailed instructions for each stage.
- Per-agent skill-availability detection mechanism for the required-skill preflight.
- Handoff-prompt template wording.
- Where this design doc itself lives long-term (currently `docs/superpowers/specs/`).
