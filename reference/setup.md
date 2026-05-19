# adhd — Setup

**Effort:** low
**Gate:** none — Setup is always runnable; it bootstraps the project.
**Output:** the canonical project layout (see `SKILL.md`) plus `project/config.json`.
**Sub-skill:** none.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate setup`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

Setup has no predecessor, so the gate normally passes. If `project/config.json`
already exists, Setup has already run; report progress with `status` instead of
re-scaffolding.

## Procedure
1. **Required-skill preflight.** Run the preflight from `SKILL.md`. State explicitly,
   in your response, that the `superpowers` plugin and the `impeccable` skill are
   present and invocable in this agent. If either is missing, name it and HALT — do
   not give installation instructions; installing them is the user's job. Do not
   mutate any file until both are confirmed.
2. **Create the canonical directory tree.** Create `.ruler/`, `docs/`, `project/`,
   and `project/milestones/`. Create an empty `project/notes.md`. Create
   `docs/DECISIONS.md` containing only a single `# Decisions` heading.
3. **Initialise config.** Run `node {{scripts_path}}/adhd-state.mjs init` to create
   `project/config.json`. Then run
   `node {{scripts_path}}/adhd-state.mjs preflight-confirm` to record in `config.json`
   that both required dependencies were confirmed in step 1.
4. **Configure `.gitignore`.** Append `.superpowers/`, `project/repos.local.json`, and
   `project/.session.json` to `.gitignore` (create the file if it does not exist). Do
   NOT gitignore `.impeccable/` — it is tracked. Do NOT gitignore `project/` itself — it
   holds the project's tracked, durable state (every `.md` artifact and `config.json`)
   and must be committed; only the two per-user/ephemeral files
   `project/repos.local.json` and `project/.session.json` are ignored.
5. **Seed `.ruler/`.** If `.ruler/` is empty, add a short `.ruler/00-adhd.md` note
   stating that this project is run by the `adhd` conductor and that
   `project/notes.md` is read first at the start of every session.

## Output
Setup produces the canonical layout defined in `SKILL.md`:

- `.ruler/` — agent instructions (with the seed `00-adhd.md` note if it was empty).
- `docs/` — with `DECISIONS.md` (`# Decisions` heading only).
- `project/` — with `config.json` and an empty `notes.md`.
- `project/milestones/` — empty, ready for per-milestone subdirectories.
- `.gitignore` — extended with `.superpowers/`, `project/repos.local.json`, and
  `project/.session.json` (`.impeccable/` stays tracked; `project/` itself stays tracked).

The project's state IS its files: every `.md` artifact under `project/` and `docs/`,
plus `project/config.json`. A stage is done the moment its artifact exists — nothing
records stage status separately. `config.json` holds only the irreducible non-doc
config (mode, repos, prototype topology, preflight); mutate it only through the
`adhd-state.mjs` config subcommands, never by hand.

`setup` always scaffolds in `single` mode with `colocated` prototype topology. For a
multi-repo product, or one whose prototype app is standalone (its own app or a separate
repo from production), run the `workspace` command after `setup` to switch to `multi`
mode, register code repos, and set the prototype topology; for an existing project, run
`adopt` instead of the groundwork stages.

## On completion
1. Write the output file(s) above — the stage is done the moment `project/config.json`
   exists.
2. `node {{scripts_path}}/adhd-state.mjs session-add setup`
3. `node {{scripts_path}}/context-watch.mjs --next vision` — if it advises a fresh
   session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
4. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
5. Tell the user the next runnable stage is `vision`.
