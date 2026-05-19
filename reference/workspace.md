# adhd — workspace (management command)

**Effort:** low
**Purpose:** switch a project to `multi` mode and manage the registered code repos.
**Not a stage:** no gate, no place in the stage flow. Run it any time.

## Procedure

1. **Read current config.** Run `node {{scripts_path}}/adhd-state.mjs read` and note
   the `mode` and `repos` fields of `project/config.json`. If the project still has a
   legacy `project/state.json`, run `node {{scripts_path}}/adhd-state.mjs migrate`
   first — it produces `config.json` and removes `state.json`.
2. **Mode.** If `mode` is `single`, explain that multi-repo support requires
   `multi` mode and ask the user to confirm the switch. On confirmation, run
   `node {{scripts_path}}/adhd-state.mjs workspace-mode multi`.
3. **Register repos (logical).** For each code repo the product spans, collect from
   the user a logical name, a `kind` (`ui` for a frontend repo, `api` for a
   backend/API repo, `lib` for a shared-library repo), and optionally a git remote
   URL. Register each with
   `node {{scripts_path}}/adhd-state.mjs workspace-add <name> <kind> [--remote <url>]`.
   No local path is stored in `config.json` — the registry is logical and committed.
4. **Bind local paths.** For each registered repo, bind its absolute local path with
   `node {{scripts_path}}/adhd-state.mjs repo-bind <name> <path>`. The command rejects
   a path that does not exist or is not a git repository — relay the error and ask the
   user to correct it. Bindings are written to `project/repos.local.json`, which is
   gitignored and per-user: on a fresh clone every repo starts unbound and must be
   re-bound here. Unbind one with
   `node {{scripts_path}}/adhd-state.mjs repo-unbind <name>`.
5. **Manage.** On a later run, show the current registry with
   `node {{scripts_path}}/adhd-state.mjs workspace-list` — it reports each repo's
   `bound`/`unbound` status. Bind any `unbound` repo with `repo-bind`. Add repos as
   in step 3; remove one with
   `node {{scripts_path}}/adhd-state.mjs workspace-remove <name>` (this also clears
   its local binding). To change a repo, remove and re-add it.
6. **Prototype topology.** A project whose prototype app is **not** co-located with
   production under a `/p/` route — e.g. the prototype is a standalone app, or it lives
   in a different repo from the production UI — runs `standalone` topology. Confirm with
   the user, then:
   - `node {{scripts_path}}/adhd-state.mjs prototype-topology standalone`
   - `node {{scripts_path}}/adhd-state.mjs prototype-home --repo <name> --subpath <path>`
     — the one project-wide location of the prototype app. `--repo` names a registered
     repo; omit it to mean the orchestration repo. `--subpath` is the path within it.

   The default is `colocated` (prototype under `/p/` in the production app's codebase);
   leave it unset for that. The prototype home is global — one prototype app for the
   whole project — so it is set here, not per surface. See SKILL.md, "Prototype
   topology".
7. **Orchestration repo.** The `project/` tree (every `.md` artifact and
   `config.json`) stays in the repo where `setup` ran. That orchestration repo may
   itself be one of the registered
   code repos, or a dedicated docs-only repo — either is fine. The orchestration repo
   may also host the standalone prototype app (`prototype-home` with no `--repo`).

## On completion

1. Confirm the resulting `mode` and registry back to the user
   (`node {{scripts_path}}/adhd-state.mjs workspace-list`).
2. Point the user at the next runnable stage, or at `adopt` if they are bringing an
   existing project under `adhd`.
