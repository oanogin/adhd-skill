# adhd — Multi-mode domains — design

**Date:** 2026-05-18
**Status:** approved, ready for implementation plan

## Problem

In `multi` mode a project may span several logical slices that progress on one
shared roadmap. Today `multi` mode models only repos: one orchestration repo plus
N registered code repos, with a single global linear milestone sequence and no way
to express which slice of the product a milestone or surface belongs to.

Two concrete shapes the current model cannot represent:

- A backend monorepo split into directories, where each directory is a distinct
  logical slice of the product.
- A UI repo shared across several of those slices — an admin UI that surfaces
  entities and logic from three different backend slices at once.

Separately, the repo registry stores **absolute local paths** in `state.json`,
which is committed. Different users cloning the orchestration repo have different
local paths, so committed artifacts carry machine-specific data that is wrong for
everyone but the author.

## Goal

Add **domains** to `multi` mode: user-defined logical slices of the product. Each
domain has its own milestones (its filtered view of the global roadmap), and a
milestone may be explicitly marked as spanning several domains. Decouple repo
local paths from committed artifacts.

This feature is **`multi`-mode only**. A `single`-mode `state.json` gains nothing;
every gate and stage skips the domain branches entirely.

## Concepts

- **Domain** — a user-defined *logical* slice of the product (e.g. `auth`,
  `billing`). A domain is not a code location. It optionally has a `home`: the
  primary backend location for its code.
- **Repo** — a registered git repository, as today, but now stored as a *logical*
  entry (name, kind, optional remote) with its local path held separately.
- **Surface** — keeps its physical placement (`repo` + optional `subpath` +
  `kind`) and gains a logical `domains` tag (one or more domains).
- **Milestone** — global and linearly ordered as today, gains an explicit
  `domains` list naming the slices it touches.

Domain (logical) and repo (physical) are orthogonal. A domain's code may live in a
monorepo subdirectory; a UI repo may be shared across many domains.

## Naming: glossary rename

The skill already uses "domain" for `docs/DOMAIN.md` — the *domain glossary*
(concepts, ubiquitous language). To free the word for the new structural concept,
`docs/DOMAIN.md` is renamed to `docs/GLOSSARY.md`. After this change "domain"
means only the structural code slice. The `map` stage still produces the glossary,
under the new name.

## Data model

All fields below exist only in `multi`-mode `state.json`.

### Repo registry — split in two

- **Committed**, in `state.json`:
  ```
  repos: { <name>: { kind, remote? } }
  ```
  Logical only — `kind` is `ui|api|lib`, `remote` is an optional git remote URL.
  No local paths.
- **Gitignored**, in `project/repos.local.json`:
  ```
  { <name>: "<absolute local path>" }
  ```
  Per-user. `setup` adds `project/repos.local.json` to `.gitignore`.

On a fresh clone, a registered repo has no local binding. The `workspace` command
detects this and prompts the user for the path. Code-writing stages HALT with a
clear message when a repo they need is unbound.

### Domain registry — new, committed

```
domains: { <name>: { description, home? } }
```

- `description` — one line: what the slice is.
- `home` — optional `{ repo, subpath }`. The domain's primary backend location.
  `repo` is a logical repo name; `subpath` is repo-relative. Path-free. A
  pure-frontend domain may omit `home`.

### Milestone

Each milestone gains:

```
domains: [ <name>, ... ]
```

Explicit list of participating domain names. One name → single-domain milestone;
several → cross-domain milestone. This is the "mark that couple domains
participate in one milestone" requirement.

### Surface

The existing single `repo` field is replaced by `repo` + `subpath`, and a logical
`domains` tag is added:

```
surface: { domains: [...], repo, subpath?, kind }
```

- `domains` — one or more domain names. A surface spanning several slices (e.g. an
  admin screen drawing from three domains) lists all of them.
- `repo` + `subpath` — physical placement. For an `api`/`lib` surface these
  default from the owning domain's `home`; for a shared-UI surface they are set
  explicitly.

## Progression

Unchanged. One global `currentMilestone` pointer; the linear front-load →
per-milestone flow is untouched. Domains never run ahead of one another. "Each
domain has its own milestones" is a *filtered view* of the global roadmap, not an
independent pointer.

## Stage changes

No new gates, no flow reorder. Domains ride inside existing stages.

### `setup`

`multi` mode: add `project/repos.local.json` to `.gitignore`. `single` mode
unchanged.

### `milestones`

Unchanged. Milestones are born domain-less; `map` tags them. (Same pattern as the
`milestones` stage back-filling the candidate-milestone column of `features.md`.)

### `map`

`single` mode unchanged. `multi` mode gains three responsibilities after the
existing sitemap + glossary work:

1. **Define domains.** With the user, decompose the product into logical domains.
   For each: name, one-line description, optional `home` (`repo` + `subpath`).
   `workspace-list` is the input for `home` bindings.
2. **Tag each milestone with its domains.** Walk the global milestone list and
   mark participating domain names on each — a back-fill, like `features.md`.
3. **Assign each surface to domain(s) + a physical location.** Every surface gets
   `domains: [...]`, `repo`, optional `subpath`, and `kind`. `api`/`lib` surfaces
   default their location from the domain `home`; shared-UI surfaces get an
   explicit `repo`.

`map.md` gains a **Domains** section (the registry, human-readable) and the
per-milestone domain tags. The `map` gate is unchanged (still requires
`milestones.md`). Effort stays `high`.

### `surface-overview`

Per-milestone: confirms/refines each surface's `domains` + physical location for
the milestone being entered. The `surface-meta` call gains `--domain`;
`--repo`/`--subpath` become the explicit physical override.

### `design`, `prototype`, `tracer`, `build`

Each code-writing stage resolves a surface's target location from `repo` +
`subpath`, then looks up the absolute path in `project/repos.local.json`. If the
repo is unbound, HALT and tell the user to run `workspace`. The `/p/`
prototype-prefix rule is unchanged — it applies within whichever repo/subpath the
surface lives in.

### `review`

Per-milestone: when a milestone is cross-domain, `review` notes per-domain
coverage so nothing in a shared milestone is silently skipped.

## CLI — `adhd-state.mjs` subcommands

- `workspace-add <name> <kind> [--remote <url>]` — registers a *logical* repo, no
  path. **Breaking change:** drops the path argument.
- `repo-bind <name> <path>` / `repo-unbind <name>` — writes/clears
  `project/repos.local.json`. The bind command rejects a path that does not exist
  or is not a git repository.
- `workspace-list` — shows each repo's binding status (`bound` / `unbound`).
- `domain-add <name> --description <text> [--home-repo <r>] [--home-subpath <p>]`
- `domain-list`
- `domain-remove <name>`
- `milestone-domains <N> <d1,d2,...>` — sets a milestone's domain list.
- `surface-meta <name> --milestone N --domain <d1,d2,...> --kind <k> [--repo <r>]
  [--subpath <p>]` — `--repo`/`--subpath` override the domain `home` default.
- `validate` — read-only config/state health check (see "No-argument invocation").

## `status`

In `multi` mode, after the normal report, `status` prints a per-domain milestone
roadmap derived from milestone `domains` tags — e.g.:

```
auth:    M1, M3
billing: M3, M4
```

This is the "each domain has its own milestones" view.

## No-argument invocation: orient, validate, route

Today `{{command_prefix}}adhd` with no argument runs `status`, prints it, and names
the next runnable stage. This feature widens it into an **orient → validate →
route** check, because the split repo registry makes a fresh clone arrive in a
broken-but-recoverable state (registered repos, no local bindings) that a bare
`status` would not surface.

The no-arg invocation does three things, in order:

1. **Orient.** Report where the project is in the flow — current mode, milestone,
   stage, and track — and restate user intent in one line ("you are mid-build on
   Milestone 2, surface `checkout`").
2. **Validate.** Run a new `validate` subcommand (below) and print its report.
3. **Route.** If validation is clean, name the next runnable stage. If validation
   found a blocker, name the fix instead of a next stage, and HALT.

### `validate` subcommand

`node {{scripts_path}}/adhd-state.mjs validate` checks config/state consistency
and prints a short health report. Checks:

- `state.json` exists and parses. If absent, the only runnable stage is `setup`.
- `currentMilestone` is within the defined milestone range; stage statuses are
  coherent (no stage marked `done` whose predecessor is not).
- **`multi` mode only:**
  - every registered repo has a binding in `project/repos.local.json`; each bound
    path exists and is a git repo. Unbound or missing → list them, point to
    `workspace`.
  - once `map` is `done`, at least one domain is defined.
  - every `milestone.domains` and `surface.domains` entry names a registered
    domain; every `surface.repo` names a registered repo.
- `project/notes.md` health — non-empty is a soft warning (transient scratchpad,
  healthy when empty).

The **required-skill preflight** (superpowers plugin + `impeccable` invocable)
stays a self-confirm statement — there is no programmatic probe. The no-arg
invocation restates it; `validate` does not attempt to probe it.

`validate` exits with a clean/blocked status so the no-arg routing can decide
between naming a next stage and naming a fix. It is read-only — it never mutates
`state.json`.

## Canonical layout (`SKILL.md`)

```
docs/GLOSSARY.md             renamed from DOMAIN.md — domain glossary
project/repos.local.json     gitignored — per-user repo→path bindings
```

## `workspace` command

`workspace.md` updates to the split registry:

- Register a logical repo with `workspace-add <name> <kind> [--remote <url>]`.
- Bind/rebind local paths with `repo-bind` / `repo-unbind`; the orchestration repo
  itself may be one of the bound repos.
- On a run where any registered repo is unbound, prompt the user for its local
  path and bind it.

Domains are **not** defined in `workspace` — they are a structural decision owned
by the `map` stage.

## Migration

A pre-feature `state.json` (no `domains`, repos carrying absolute paths) is read as
before. On its next run, `workspace` offers to migrate each repo's stored path into
`project/repos.local.json` and strip it from the committed entry. Existing
`surface.repo` values are kept; `subpath` and `domains` default empty.

## Documentation to update

- `SKILL.md` — Modes section, canonical layout (GLOSSARY.md + repos.local.json),
  `map` stage row, scripts list, multi-mode notes, and the **Routing** section
  (no-arg invocation: orient → validate → route).
- `README.md` — multi-mode description.
- `reference/map.md` — the three new `multi`-mode responsibilities + Domains
  section in output.
- `reference/workspace.md` — split repo registry, `repo-bind`, migration.
- `reference/setup.md` — gitignore `project/repos.local.json`.
- `reference/surface-overview.md` — `--domain` on `surface-meta`.
- `reference/design.md`, `reference/prototype.md`, `reference/tracer.md`,
  `reference/build.md` — resolve location via `repos.local.json`, HALT on unbound.
- `reference/review.md` — per-domain coverage note for cross-domain milestones.
- All references to `docs/DOMAIN.md` → `docs/GLOSSARY.md`.

## Out of scope

- Domains in `single` mode.
- Per-domain milestone pointers / independent domain progression.
- Domains as a replacement for the repo concept.
