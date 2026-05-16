# adhd — Setup

**Effort:** low
**Gate:** none — Setup is always runnable; it bootstraps the project.
**Output:** the canonical project layout (see `SKILL.md`) plus `project/state.json`.
**Sub-skill:** none.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate setup`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

Setup has no predecessor, so the gate normally passes. If `project/state.json`
already exists, Setup has already run; report progress with `status` instead of
re-scaffolding.

## Procedure
1. **Required-skill preflight.** Run the preflight from `SKILL.md`. State explicitly,
   in your response, that `brainstorming`, `impeccable`, and `writing-plans` are each
   present and invocable in this agent. If any of the three is missing, name the
   missing skill(s) and HALT — do not give installation instructions; installing them
   is the user's job. Do not mutate any file until all three are confirmed.
2. **Create the canonical directory tree.** Create `.ruler/`, `docs/`, `project/`,
   and `project/milestones/`. Create an empty `project/notes.md`. Create
   `docs/DECISIONS.md` containing only a single `# Decisions` heading.
3. **Initialise state.** Run `node {{scripts_path}}/adhd-state.mjs init` to create
   `project/state.json`.
4. **Configure `.gitignore`.** Append `.superpowers/` and `.impeccable/` to
   `.gitignore` (create the file if it does not exist). Do NOT gitignore `project/` —
   it holds tracked, durable project state and must be committed.
5. **Seed `.ruler/`.** If `.ruler/` is empty, add a short `.ruler/00-adhd.md` note
   stating that this project is run by the `adhd` conductor and that
   `project/notes.md` is read first at the start of every session.

## Output
Setup produces the canonical layout defined in `SKILL.md`:

- `.ruler/` — agent instructions (with the seed `00-adhd.md` note if it was empty).
- `docs/` — with `DECISIONS.md` (`# Decisions` heading only).
- `project/` — with `state.json` and an empty `notes.md`.
- `project/milestones/` — empty, ready for per-milestone subdirectories.
- `.gitignore` — extended with `.superpowers/` and `.impeccable/`.

`project/state.json` is owned exclusively by `adhd-state.mjs`. Never hand-edit it —
all reads and writes go through the script's subcommands.

## On completion
1. Write the output file(s) above.
2. `node {{scripts_path}}/adhd-state.mjs set setup done`
3. `node {{scripts_path}}/adhd-state.mjs session-add setup`
4. `node {{scripts_path}}/context-watch.mjs --next vision` — if it advises a fresh
   session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
5. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
6. Tell the user the next runnable stage is `vision`.
