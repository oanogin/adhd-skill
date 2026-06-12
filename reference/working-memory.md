# adhd — Working memory, the parking lot, and the `## Gate` zone

Loaded by every stage that keeps working memory. `adhd` has two non-canonical stores:
transient per-stage scratch (`project/work/`) and the durable parking lot
(`project/parking.md`). Canonical truth always lives in the artifacts, never here.

## Transient working memory (`project/work/`)

High-effort stages get a `project/work/<stage>.md` (milestone form
`project/work/m<N>-<stage>.md`); any ad-hoc, session-scoped task may get a freely-named
`project/work/<task>.md`. All of `project/work/` is gitignored; each file is drained to
its canonical home and deleted when the work is done.

The high-effort stages — `vision`, `concepts`, `flows`, `realize`, `review` — plus
the high-effort `evolve` and `prototype` commands
create their work file as their first procedure step (a
discipline the stage follows, not a script-enforced step). Medium/low stages (including
`build` — its plan already is the memory) create none, with one exception: `brief`
(medium) does — it carries user touchpoint #1.

The file has three light zones:

```
## Gate            ← required user confirmations; machine-checked before implementation
## Left to do      ← checklist; unchecked items are the resume pointer
## Log             ← free-form, newest last: what was done / what failed / decisions
```

(`evolve` names its checklist zone `## Impact plan` instead of `## Left to do` —
same role, same resume semantics; the scripts are heading-agnostic.)

Write to it as the work proceeds, so a session that ends mid-stage resumes cleanly. It
is **transient scratch — never a source of truth**. On stage completion, drain durable
facts to their canonical home (`DECISIONS.md`, `STACK.md`, `CONCEPTS.md`, `DATA.md`, a
flow file, a surface stub, `.ruler/`) and **delete** the file. The `verify` pass flags
any work file whose stage is already done. `handoff-prompt.mjs` reads the active work
file and leads the resume prompt with it.

## The parking lot — durable, not-yet-actionable info

`project/parking.md` is the durable, committed buffer for ideas and details that are
clarified but **not yet ready to implement** — arch sketches, deferred decisions, things
to discuss later. Unlike the transient store, it is never drained to empty and survives
across sessions: an item lives there precisely because it is still pending, and the user
removes it once it is implemented. It is free-form (prose, mermaid, code) and
**user-owned**: the agent never writes to it on a standing rule — the only agent write
path is the user-invoked `adhd park` command. Before starting any stage or feature, read
`project/parking.md` if it is non-empty and fold anything relevant into the current
work; `adhd-state.mjs gate` prints a non-blocking `note:` when it has content.

## The `## Gate` zone — confirm before you implement (hard rule)

Every work file carries a `## Gate` block: the requirements/direction the user must
**confirm before the stage produces its output artifact or writes any implementation.**
This is the discipline that stops an agent from charging into the wrong work and forces
the clarification step that is otherwise skipped (especially on Codex / Cursor).

Each gate item is one line, satisfied **only** when it is checked AND records the user's
verbatim ok in parentheses:

```
## Gate
- [ ] requirements-confirmed — user confirmed scope/direction before implementation
- [ ] <item> — <what this item confirms>
```

→ once the user confirms:

```
- [x] requirements-confirmed — scope/direction confirmed (yes, that's right — go)
- [x] <item> — confirmed (<user's verbatim words>)
```

**Rule, every stage that keeps a work file:**

1. **Seed** the `## Gate` block when you create the work file. It MUST contain at least
   `requirements-confirmed`. A stage with a per-item loop (e.g. `flows` per capability
   area) adds one gate line per item.
2. **Clarify, then confirm.** Gather the requirements with the user. Mark an item `[x]`
   with their verbatim ok ONLY after they actually confirm — never pre-check, never
   invent the words.
3. **Check the gate before implementing.** Before the implementation/output-producing
   steps, run:
   ```bash
   node {{scripts_path}}/adhd-state.mjs work-gate <stage> [--milestone N] [--item <id>]
   ```
   It returns `pass` only when the targeted gate items are checked **and** carry the
   verbatim confirmation. If it reports `missing`, **HALT** — go back and clarify. No
   skip. Fail-closed: a missing work file, an absent `## Gate` block, or a bare `[x]`
   without the parenthetical all fail.

The gate lives in the transient work file (gitignored, deleted on completion), so it
never pollutes the stable docs. The durable record of *what was decided* still migrates
to its canonical home on completion. Honest limit: the agent writes the checkbox, so
this cannot make confirmation physically impossible to fake — it makes a skip an
**explicit, auditable** line instead of a silent freelance, and on a compliant harness
it reliably forces the real clarification.
