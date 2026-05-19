# adhd — adopt (management command)

**Effort:** high
**Purpose:** bring an existing, already-built project under `adhd`. Substitutes for
the groundwork loop (`vision → stories → foundation → map`).
**Not a stage:** no gate. Run it once, instead of the groundwork stages, when the
project already exists.

## adhd-adoptable repo guidelines

A repo is `adhd`-adoptable when:

- It is a git repository.
- It has one clear responsibility — a single product domain, or a single UI — or it
  is a monorepo registered as one repo.
- Its own reference documentation (architecture, data model, operations) lives in
  the repo's own `docs/`.
- It contains no `adhd` workflow artifacts. `project/`, surface specs, plans, and
  `state.json` live only in the orchestration repo. A code repo is a build target,
  never an `adhd` workspace — unless it is itself the orchestration repo.

If a target repo does not meet these guidelines, note the cleanup as its own
milestone or a `docs/DECISIONS.md` entry. `adopt` does not block on it.

## Procedure

1. **Preconditions.** `project/state.json` must exist (run `setup` first). In
   `multi` mode, the code repos must already be registered (run `workspace` first). If
   the existing project's prototype is a standalone app (its own repo or separate from
   production), the `workspace` run should also set `standalone` prototype topology and
   the prototype home — see [workspace.md](workspace.md).
2. **Scan.** Read the existing documentation across the target repo(s) — product
   docs, decision logs, architecture and invariants files, per-module `docs/`,
   READMEs. In `multi` mode, scan every registered repo at its bound local path from
   `project/repos.local.json` (`node {{scripts_path}}/adhd-state.mjs workspace-list`);
   if a repo is unbound, HALT and tell the user to bind it via
   `{{command_prefix}}adhd workspace`.
3. **Draft and confirm, one artifact at a time.** For each groundwork artifact
   below, draft the `adhd`-style version from what the scan found and present it to
   the user for review before writing:
   - `docs/PRODUCT.md` — product, users, usage, brand, anti-references, principles.
   - `docs/GLOSSARY.md` — entities, key fields, relationships.
   - `docs/DECISIONS.md` — carry over the existing decision log and the firm tech
     baseline (the `foundation` artifact).
   - `project/stories.md` — the story backlog (`ID | Story | Value | Depends on | Size`).
   - `project/map.md` — the surface catalog, domains, and deployables.
   There is no roadmap artifact: milestones are formed just-in-time at `milestone-brief`,
   so `adopt` does not produce one.
4. **Never invent.** Where the source docs do not cover something, flag the gap and ask
   the user — do not fabricate vision, scope, or stories. Same discipline as the
   `vision` stage.
5. **Record completion.** After the user confirms each artifact, write the
   canonical file, then mark the matching groundwork stage `done`:
   `node {{scripts_path}}/adhd-state.mjs set vision done`,
   `... set stories done`, `... set foundation done`, `... set map done`.
   (`setup` is already `done` once `state.json` exists.)

## On completion

1. Confirm all five groundwork stages are `done`
   (`node {{scripts_path}}/adhd-state.mjs status`).
2. The project now resumes at the per-milestone loop exactly as a groundwork-loaded
   project would. Tell the user the next runnable stage is `milestone-brief` for
   milestone 1.
