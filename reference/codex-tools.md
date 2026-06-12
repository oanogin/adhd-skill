# adhd — Codex tool mapping

The `adhd` skill is authored against Claude Code: its markdown uses the placeholder
token `{{scripts_path}}` (defined in `SKILL.md`, "Conventions"), and its dependency
skills (`superpowers`, `impeccable`) reference Claude Code tool names (`Read`,
`Write`, `Edit`, `Bash`). A Codex agent resolves those tool names using the table
below; `{{scripts_path}}` it resolves exactly as `SKILL.md` says. The conceptual
mapping — which capability fills which role — is what matters; nothing in `adhd`
itself depends on a Claude-Code-specific tool. Codex has no slash-command syntax:
invoke the `adhd` skill directly (load `SKILL.md` and follow it) with the stage as
the argument.

## Mapping table

| Claude Code tool | Codex equivalent |
|---|---|
| `Read` | Codex's file-read tool — read a file's contents. |
| `Write` | Codex's file-write / create-file capability — create a new file or overwrite an existing one. |
| `Edit` | Codex's file-edit capability — apply a targeted change (patch / search-and-replace) to an existing file. |
| `Bash` | Codex's shell / terminal tool — run a command line. This is what executes the `node {{scripts_path}}/*.mjs` calls. |

## Required-skill preflight

Before mutating any project file, a Codex agent states the `ADHD_PREFLIGHT` line
**exactly as defined in `SKILL.md`, "Required-skill preflight"** — that section is
the single source of the line's format and field semantics. If a required skill is
missing, name it and HALT instead of emitting the line; no file mutation happens
before the line appears.

## Closing note

The `node` scripts — `adhd-state.mjs` and `handoff-prompt.mjs` — run
identically on every agent; they are plain Node.js
and depend on nothing agent-specific. Only the tool names and the
skill-invocation form differ between agents. Everything else in `adhd` —
stages, gates, the canonical layout, `config.json` ownership — is the same.
