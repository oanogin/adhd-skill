# adhd — Cursor tool mapping

The `adhd` skill is authored against Claude Code: its markdown uses the placeholder
token `{{scripts_path}}` (defined in `SKILL.md`, "Conventions") and refers to Claude
Code tool names (`Read`, `Write`, `Edit`, `Bash`). A Cursor agent running `adhd`
resolves the tool names using the table below; `{{scripts_path}}` it resolves exactly
as `SKILL.md` says. The conceptual mapping — which capability fills which role — is
what matters; nothing in `adhd` depends on a Claude-Code-specific tool. Cursor has no
slash-command syntax for skills: invoke the `adhd` skill directly (load `SKILL.md` and
follow it) with the stage as the argument.

## Mapping table

| Claude Code tool | Cursor equivalent |
|---|---|
| `Read` | Cursor's file-read tool — read a file's contents. |
| `Write` | Cursor's file-creation / write tool — create a new file or overwrite an existing one. |
| `Edit` | Cursor's file-edit tool — apply a targeted change (search-and-replace / diff) to an existing file. |
| `Bash` | Cursor's terminal / run-command tool — execute a command line. This is what runs the `node {{scripts_path}}/*.mjs` calls. |

## Required-skill preflight

Before mutating any project file, a Cursor agent MUST state the preflight line
defined in `SKILL.md`:

```text
ADHD_PREFLIGHT: skills=pass gate=pass|fail:<stage> mutation=open
```

`skills=pass` confirms the `superpowers` plugin and `impeccable` are
present and invocable; if either is missing, name it and HALT instead of
emitting the line. `gate=pass` or `gate=fail:<stage>` reports the hard-gate
check for the stage being run. `mutation=open` is stated only once the agent is
clear to write files. No file mutation happens before this line appears.

## Closing note

The `node` scripts — `adhd-state.mjs`, `context-watch.mjs`, and
`handoff-prompt.mjs` — run identically on every agent; they are plain Node.js
and depend on nothing agent-specific. Only the tool names and the
skill-invocation form differ between agents. Everything else in `adhd` —
stages, gates, the canonical layout, `config.json` ownership — is the same.
