# adhd — Codex tool mapping

The `adhd` skill is authored against Claude Code: its markdown uses placeholder
tokens (`{{command_prefix}}`, `{{scripts_path}}`) and refers to Claude Code tool
names (`Read`, `Write`, `Edit`, `Bash`). A Codex agent running `adhd` resolves
those tokens and tool names using the table below. The conceptual mapping —
which capability fills which role — is what matters; nothing in `adhd` depends
on a Claude-Code-specific tool.

## Mapping table

| `adhd` token / Claude Code tool | Codex equivalent |
|---|---|
| `{{command_prefix}}` | Codex has no leading-slash command syntax. Wherever a reference says `{{command_prefix}}adhd <stage>`, the Codex agent instead invokes the `adhd` skill directly (load `SKILL.md` and follow it) with `<stage>` as the argument. Treat `{{command_prefix}}adhd` as "run the adhd skill". |
| `{{scripts_path}}` | The absolute path `~/.claude/skills/adhd/scripts`. The three `.mjs` scripts there run unchanged under `node`, e.g. `node ~/.claude/skills/adhd/scripts/adhd-state.mjs status`. |
| `Read` | Codex's file-read tool — read a file's contents. |
| `Write` | Codex's file-write / create-file capability — create a new file or overwrite an existing one. |
| `Edit` | Codex's file-edit capability — apply a targeted change (patch / search-and-replace) to an existing file. |
| `Bash` | Codex's shell / terminal tool — run a command line. This is what executes the `node {{scripts_path}}/*.mjs` calls. |

## Required-skill preflight

Before mutating any project file, a Codex agent MUST state the preflight line
defined in `SKILL.md`:

```text
ADHD_PREFLIGHT: skills=pass gate=pass|fail:<stage> mutation=open
```

`skills=pass` confirms `brainstorming`, `impeccable`, and `writing-plans` are
all present and invocable; if any is missing, name it and HALT instead of
emitting the line. `gate=pass` or `gate=fail:<stage>` reports the hard-gate
check for the stage being run. `mutation=open` is stated only once the agent is
clear to write files. No file mutation happens before this line appears.

## Closing note

The `node` scripts — `adhd-state.mjs`, `context-watch.mjs`, and
`handoff-prompt.mjs` — run identically on every agent; they are plain Node.js
and depend on nothing agent-specific. Only the tool names and the
skill-invocation form differ between agents. Everything else in `adhd` —
stages, gates, the canonical layout, `state.json` ownership — is the same.
