# adhd — adopt (management command)

**Effort:** high
**Purpose:** bring an existing, already-built project under `adhd`. Substitutes for
the groundwork loop — flows generation: `vision → foundation → concepts` (the backlog
and flows are then derived per milestone).
**Not a stage:** no gate. Run it once, instead of the groundwork stages, when the
project already exists.

## adhd-adoptable repo guidelines

A repo is `adhd`-adoptable when:

- It is a git repository.
- It has one clear responsibility — a single product domain, or a single UI — or it
  is a monorepo registered as one repo.
- Its own reference documentation (architecture, data model, operations) lives in
  the repo's own `docs/`.
- It contains no `adhd` workflow artifacts. `project/` (every `.md` artifact and
  `config.json`) lives only in the orchestration repo. A code repo is a build target,
  never an `adhd` workspace — unless it is itself the orchestration repo.

If a target repo does not meet these guidelines, note the cleanup as its own
milestone or a `docs/DECISIONS.md` entry. `adopt` does not block on it.

## Procedure

1. **Preconditions.** `project/config.json` must exist (run `setup` first). In
   `multi` mode, the code repos must already be registered (run `workspace` first). If
   the existing project's prototype is a standalone app (its own repo or separate from
   production), the `workspace` run should also set `standalone` prototype topology and
   the prototype home — see [workspace.md](workspace.md).
2. **Scan.** Read the existing documentation across the target repo(s) — product
   docs, decision logs, architecture and invariants files, per-module `docs/`,
   READMEs. In `multi` mode, scan every registered repo at its bound local path from
   `project/repos.local.json` (`node {{scripts_path}}/adhd-state.mjs workspace-list`);
   if a repo is unbound, HALT and tell the user to bind it via
   `adhd workspace`.
3. **Draft and confirm, one artifact at a time.** For each groundwork artifact
   below, draft the `adhd`-style version from what the scan found and present it to
   the user for review before writing:
   - `docs/PRODUCT.md` — product, users, usage, brand, anti-references, principles.
   - `docs/STACK.md` — the current tech stack read off the existing code: `## Baseline`
     (languages, frameworks, repo topology), `## Libraries` (what the repos actually
     use), `## Services` (data stores etc. already in production). This is the
     `foundation` artifact.
   - `docs/DECISIONS.md` — carry over the existing decision log; add one entry
     recording the adopted baseline.
   - `project/map.md` — the surface catalog, domains, and deployables.
   - `docs/CONCEPTS.md` — the ubiquitous language: entities, their relationships
     (a Mermaid `erDiagram`), and a helicopter view of how the system works. This is the
     `concepts` artifact; draft it from the existing data model and architecture docs.
   - `project/surfaces/<name>.md` — a stub per `ui` surface (purpose, UX intent, key
     states), read off the existing UI.

   That is the whole list — plus the **capability dependency
   map** inside `docs/CONCEPTS.md` (mark the already-built areas as built — adoption
   means much of the map is green) and `project/map.md`'s **participant registry**
   seeded from the existing code's surfaces and services. Flows are derived per
   milestone by the `flows` stage.
   There is no roadmap artifact: milestones are formed just-in-time at `brief`,
   so `adopt` does not produce one.
4. **Never invent.** Where the source docs do not cover something, flag the gap and ask
   the user — do not fabricate vision, scope, or behavior. Same discipline as the
   `vision` stage.
5. **Record completion.** After the user confirms each artifact, write the canonical
   file. A groundwork stage is done the moment its artifact exists — there is no
   separate completion command. (`setup` is already done once `config.json` exists;
   `foundation` is done once `docs/DECISIONS.md` carries a logged decision.)

## On completion

1. Confirm all four groundwork stages register as done (`node {{scripts_path}}/adhd-state.mjs status`).
2. The project now resumes at the per-milestone loop exactly as a groundwork-loaded
   project would. Tell the user the next runnable stage is `brief` for milestone 1.
3. For any future changes to concepts, flows, or the data model —
   use `adhd evolve`. It is the single front door for every post-groundwork change.
