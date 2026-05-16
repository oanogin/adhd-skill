# adhd — workspace (management command)

**Effort:** low
**Purpose:** switch a project to `multi` mode and manage the registered code repos.
**Not a stage:** no gate, no place in the stage flow. Run it any time.

## Procedure

1. **Read current state.** Run `node {{scripts_path}}/adhd-state.mjs read` and note
   the `mode` and `repos` fields.
2. **Mode.** If `mode` is `single`, explain that multi-repo support requires
   `multi` mode and ask the user to confirm the switch. On confirmation, run
   `node {{scripts_path}}/adhd-state.mjs workspace-mode multi`.
3. **Register repos.** For each code repo the product spans, collect from the user:
   a logical name, an absolute local path to the already-cloned repo, and a `kind`
   (`ui` for a frontend repo, `api` for a backend/API repo, `lib` for a
   shared-library repo). Register each with
   `node {{scripts_path}}/adhd-state.mjs workspace-add <name> <path> <kind>`.
   The command rejects a path that does not exist or is not a git repository —
   relay the error and ask the user to correct it.
4. **Manage.** On a later run, show the current registry with
   `node {{scripts_path}}/adhd-state.mjs workspace-list`. Add repos as above;
   remove one with `node {{scripts_path}}/adhd-state.mjs workspace-remove <name>`.
   To change a repo, remove and re-add it.
5. **Orchestration repo.** The `project/` tree and `state.json` stay in the repo
   where `setup` ran. That orchestration repo may itself be one of the registered
   code repos, or a dedicated docs-only repo — either is fine.

## On completion

1. Confirm the resulting `mode` and registry back to the user
   (`node {{scripts_path}}/adhd-state.mjs workspace-list`).
2. Point the user at the next runnable stage, or at `adopt` if they are bringing an
   existing project under `adhd`.
