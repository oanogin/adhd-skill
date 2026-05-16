# 2026-05-17 — `adhd` multi-repo support — design

**Status:** design — brainstorm output, awaiting spec review.
**Type:** extension of the existing `adhd` skill (`~/.claude/skills/adhd/`).
**Builds on:** `docs/2026-05-16-adhd-skill-design.md` (the original skill design).
**Approach:** A — additive extension layer. Single-repo behavior is the zero-config
default and is preserved unchanged; multi-repo is opt-in.

---

## 1. Problem

`adhd` as built assumes a single greenfield repository: one `project/` tree, one
`state.json`, and "surfaces" that are UI screens designed with `impeccable`. Many
real products break those assumptions:

- **Multi-repo products.** A product can span several git repositories — for
  example a backend repo and one or more separate frontend repos — rather than
  living in one repo.
- **Non-UI surfaces.** A backend repo has no screens. Its "surfaces" are API
  capabilities and shared libraries, for which `impeccable` (UI design) does not
  apply.
- **Existing, mature projects.** A project may already have product docs, a
  decision log, and architecture notes. `adhd`'s `setup` is greenfield-only — there
  is no path to bring an existing project under `adhd`.
- **Throwaway prototypes.** A clickable prototype is sometimes built only to
  validate behavior with stakeholders, then discarded; the real UI is built
  separately and later.

This design extends `adhd` to conduct multi-repo products, handle non-UI surfaces,
adopt existing projects, and dispatch free-text tasks — without disturbing the
single-repo flow that already works.

---

## 2. Modes

`state.json` gains a `mode` field:

- **`single`** (default) — today's behavior, unchanged. `project/` lives at the repo
  root; all work happens in that one repo. `setup` always scaffolds in `single` mode.
- **`multi`** — the `project/` tree (vision, features, milestones, surface specs,
  plans, `state.json`) lives in the repo where `setup` ran — the **orchestration
  repo**. Code repos are registered by local path. The orchestration repo may be a
  dedicated docs-only repo or itself a code repo; the only difference is whether it
  is also listed in the registry.

You move to `multi` mode by running the `workspace` command (section 4) — never by a
`setup` branch. `setup` is unchanged.

**Key invariant:** all `adhd` artifacts always live in the orchestration repo's
`project/` and `docs/`. Only two stages — `tracer` and `build` — physically reach
into a target repo, and only to write code. Gate path resolution for `adhd`
documents never consults the repo registry.

---

## 3. `state.json` additions

```json
{
  "mode": "single",
  "repos": {
    "repo-a": { "path": "/abs/path/to/repo-a", "kind": "api" },
    "repo-b": { "path": "/abs/path/to/repo-b", "kind": "ui" }
  },
  "milestones": {
    "1": {
      "surfaces": {
        "<name>": { "repo": "repo-a", "kind": "api", "design": {}, "plan": {}, "build": {} }
      }
    }
  }
}
```

- `mode` — `"single"` | `"multi"`. Default `"single"`.
- `repos` — `{}` in single mode. In multi mode, a map of logical repo name to
  `{ path, kind }`. `path` is absolute; `kind` is `ui` | `api` | `lib` and serves as
  the default `kind` for surfaces tagged to that repo.
- Each surface entry gains:
  - `repo` — which registered repo the surface is built in. `null` in single mode.
  - `kind` — `ui` | `api` | `lib`. Authoritative for `design`-stage routing; the
    repo's `kind` is only a pre-fill default.

A monorepo registers as one repo. A product later split into per-domain repos
registers each part separately. `adhd` is agnostic to that choice; the registry
supports either with no skill change.

---

## 4. The `workspace` command

`{{command_prefix}}adhd workspace` — a management command, not a gated stage (it
mirrors `impeccable`'s `pin` / `unpin`). It is recognized by the router and never
appears in the stage table or gate chain.

Behavior:

- First run in a `single`-mode project: offers to switch the project to `multi`.
- Registers code repos interactively: logical name, absolute local path, `kind`.
  Validates that each path exists and is a git repository.
- Re-runnable: lists, adds, removes, and edits registered repos.

Backed by `adhd-state.mjs` CLI verbs:

```
node {{scripts_path}}/adhd-state.mjs workspace-mode <single|multi>
node {{scripts_path}}/adhd-state.mjs workspace-add <name> <path> <kind>
node {{scripts_path}}/adhd-state.mjs workspace-remove <name>
node {{scripts_path}}/adhd-state.mjs workspace-list
```

`workspace-add` rejects a path that does not exist or is not a git repo.

Playbook: new `reference/workspace.md`.

---

## 5. Surface kinds and the `design` stage

Every surface has a `kind`. The `design` stage routes by it:

- **`ui`** — `superpowers:brainstorming` for UX, then `impeccable` for UI. Today's
  behavior unchanged. The surface spec has UX, UI, and surface-security/errors
  sections.
- **`api`** — `superpowers:brainstorming` for behavior and contract semantics
  (endpoints, request/response shape, error codes, idempotency, auth), then API
  contract design (protobuf, OpenAPI, or similar). **`impeccable` is not invoked.**
  The surface spec has API-contract, behavior, and error-semantics sections.
- **`lib`** — `superpowers:brainstorming` for the module's responsibility and public
  interface, then a spec. No `impeccable`, no contract.

`impeccable` is therefore only materially needed when a product has `ui` surfaces.
The required-skill preflight still always requires it — the surface mix is not known
in advance, and `adhd` keeps no degraded mode.

---

## 6. Stage changes

| Stage | Change |
|---|---|
| `map` | When inventorying surfaces, tag each with `kind` and — in multi mode — the target `repo`. The repo's default `kind` pre-fills. |
| `surface-overview` | Same tagging when listing a milestone's surfaces. |
| `milestone-ux` | May optionally deliver a clickable throwaway prototype (via `impeccable`) instead of or alongside `ux.md` — used for stakeholder sign-off. Sign-off is informal; no new stage, no new gate. |
| `tracer` | In multi mode, the thin-slice code is written in the relevant target repo (`cd` into `repos[...].path`). `tracer.md` notes stay in the orchestration `project/`. |
| `design` | Routes by surface `kind` (section 5). |
| `plan` | Output (`plans/<name>.md`) always stays in the orchestration `project/`. Unchanged. |
| `build` | In multi mode, `cd` into `repos[surface.repo].path` to write code. The commit gate applies **in the target repo**, and that repo's own conventions (`CLAUDE.md`, etc.) are respected. `build` status is still tracked in the orchestration `state.json`. |
| `review` | Unchanged — a fresh-session design audit reading the orchestration artifacts. |

Sub-skill output routing is unchanged: `design` and `plan` always write their durable
artifacts to the orchestration `project/milestones/m<N>/`.

---

## 7. Gate engine

Minimal change. All `adhd` artifact paths stay orchestration-repo-relative, so
`STAGE_GATES` in `adhd-state.mjs` is untouched. The only new logic:

- `tracer` and `build` resolve `repos[surface.repo].path` to know which directory to
  `cd` into for code work.
- `workspace-add` validates path existence and git-repo status.

---

## 8. The `adopt` command

`{{command_prefix}}adhd adopt` — a management command for bringing an existing
project under `adhd`. It substitutes for the front-load loop (`vision → features →
milestones → map`) when a project already exists. Works in both modes; in multi mode
it scans every registered repo.

Procedure:

1. Scan the target repo(s) for existing documentation — product docs, decision
   logs, architecture / invariants files, per-module docs, READMEs.
2. For each front-load artifact (`docs/PRODUCT.md`, `docs/DOMAIN.md`,
   `project/features.md`, `project/milestones.md`, `project/map.md`), draft the
   `adhd`-style version from what was found and present it to the user for review,
   one at a time.
3. Where source docs do not cover something (e.g. no explicit milestone breakdown
   exists), flag the gap and ask the user — never invent vision, scope, or
   milestones. Same discipline as the `vision` stage.
4. On the user's confirmation of each draft, write the canonical file and mark the
   corresponding front-load stage `done` in `state.json`.

After `adopt`, the project resumes at the per-milestone loop exactly as a
front-loaded project would. No separate `adopt` state is stored — `adopt` simply
produces the same front-load outputs and stage statuses that the normal flow does.

Playbook: new `reference/adopt.md`. It also carries the **adhd-adoptable repo
guidelines** (section 10).

---

## 9. Routing — intelligent free-text dispatch

`SKILL.md`'s Routing section is rewritten to three cases:

1. **No argument** — run `adhd-state.mjs status`, print it, name the next runnable
   stage. Unchanged.
2. **First word is a stage or a command** (`workspace`, `adopt`) — load the matching
   reference and run it. As today.
3. **First word matches nothing** — treat the whole input as a task description.
   Read `state.json`, then select the stage or command that fits the task —
   gate-aware:
   - route the task to the stage that addresses it (e.g. "this API needs designing"
     → `design` for that surface);
   - if the task implies skipping ahead, name the gate blocking it instead of
     running;
   - if it is a new feature idea raised mid-project, file it to `features.md` and
     apply the milestone-discipline soft-warn;
   - state the routing decision, then proceed — confirming first when the task is
     ambiguous or the action mutates files.

This mirrors `impeccable`'s general invocation (where an unmatched first word is a
design task), but respects `adhd`'s hard gates rather than running blind.

---

## 10. adhd-adoptable repo guidelines

Documented in `reference/adopt.md`. A repo is `adhd`-adoptable when:

- It is a git repository.
- It has one clear responsibility — a single product domain, or a single UI — or it
  is a monorepo registered as one repo.
- Its own reference documentation (architecture, data model, operations) lives in the
  repo's own `docs/`.
- It contains **no `adhd` workflow artifacts.** `project/`, surface specs, plans, and
  `state.json` live only in the orchestration repo. A code repo is a build target,
  never an `adhd` workspace (unless it is itself the orchestration repo in an
  embedded multi-repo setup).

---

## 11. Deliverable 1 — changes to the `adhd` skill

- **`scripts/adhd-state.mjs`** — `defaultState` gains `mode: "single"` and
  `repos: {}`; surface entries gain `repo` and `kind`; new exported functions
  `setMode`, `addRepo`, `removeRepo`, `listRepos` (with path-exists and is-git
  validation); new CLI verbs `workspace-mode`, `workspace-add`, `workspace-remove`,
  `workspace-list`. New tests covering all of it.
- **`SKILL.md`** — new "Modes" section; `workspace` and `adopt` registered as
  management commands; Routing section rewritten for intelligent free-text dispatch
  (section 9); surface kinds and multi-repo `tracer` / `build` behavior documented.
- **`reference/workspace.md`** (new) — the `workspace` command playbook.
- **`reference/adopt.md`** (new) — the `adopt` command playbook plus the
  adhd-adoptable repo guidelines.
- **`reference/design.md`** — route by surface `kind` (`ui` / `api` / `lib`).
- **`reference/map.md`, `reference/surface-overview.md`** — tag each surface with
  `kind` and, in multi mode, `repo`.
- **`reference/milestone-ux.md`** — optional clickable throwaway prototype for
  stakeholder sign-off.
- **`reference/tracer.md`, `reference/build.md`** — multi mode: `cd` into the target
  repo for code work; commit gate applies per target repo.
- **`reference/setup.md`** — note `mode` defaults to `single`; point to `workspace`
  for multi-repo.
- **`README.md`** — document modes, `workspace`, `adopt`, surface kinds.

Single-repo projects with an existing `state.json` that lacks `mode` / `repos` are
treated as `mode: "single"` with an empty registry — no migration needed.

---

## 12. Deliverable 2 — adopting an existing multi-repo product

A generic walkthrough for bringing an existing, already-built product under `adhd`:

1. Create an orchestration repo — a dedicated docs repo is recommended.
2. In it: run `{{command_prefix}}adhd setup`, then `{{command_prefix}}adhd
   workspace` — switch to `multi` and register each code repo with its absolute
   path and `kind` (`api` for backend repos, `ui` for frontend repos, `lib` for
   shared-library repos).
3. Run `{{command_prefix}}adhd adopt`. `adhd` reads the existing product docs,
   decision logs, architecture notes, and per-module docs across the registered
   repos and drafts the `adhd`-style `docs/PRODUCT.md`, `docs/DOMAIN.md`,
   `docs/DECISIONS.md`, `project/features.md`, `project/milestones.md`, and
   `project/map.md`. Review and confirm each draft; `adhd` flags any gap and asks
   rather than inventing.
4. Define Milestone 1 as the next real chunk of work. Run the per-milestone loop —
   `surface-overview → milestone-ux → tracer → replan → (design → plan → build) →
   review` — tagging each surface with the `kind` and target `repo` it belongs to.
5. If a repo's structure does not meet the adhd-adoptable guidelines (section 10),
   the cleanup is tracked as its own milestone or a `docs/DECISIONS.md` entry —
   `adhd` does not force it.
6. The monorepo-versus-multi-repo split stays the team's decision. If a monorepo is
   later split into per-domain repos, register each as its own repo and re-tag the
   affected surfaces. No `adhd` change is required.

---

## 13. Out of scope

- No automated migration of an existing `state.json` — the `mode` / `repos`
  defaults make old files valid as-is.
- No remote-repo cloning or fetching — registered repos must already be cloned
  locally; `adhd` only references local paths.
- No cross-repo dependency graph or build orchestration — `adhd` conducts design and
  planning; it does not run a multi-repo build pipeline.
- No change to the single-repo flow's behavior, gates, or stage outputs.
