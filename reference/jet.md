# adhd — jet (management command)

**Effort:** low–medium (the whole-session sweep is the value — skim it and facts leak).
**Purpose:** hand off the current session losslessly. Sweep the session so every material
fact — progress, decisions, invariants, ideas — is saved to its canonical home, then emit
a copy/paste resume prompt a fresh session pastes to continue exactly where this stopped.
**Not a stage:** no gate. Run it anytime, in any project state.

## What this command is

`jet` is the deliberate, user-invoked version of the "Fresh sessions" rule, built to
make switching sessions cheap and lossless. The `handoff-prompt.mjs` script already
builds a resume prompt from **disk** — the next runnable stage, the active work file's
open checklist, the last few log lines, parking lot, and a state summary. But a live
session holds context that is not yet on disk: steps just completed, a decision made
three messages ago, the exact next action, a gotcha discovered mid-work. A fresh session
reads only files — so anything living only in this conversation is **lost on the switch**.

**`jet`'s contract:** after it runs, no important fact lives only in the conversation.
It sweeps the whole session, checks that every material fact already has a home on disk,
**writes the ones that don't** to their canonical home, and only then generates the
resume prompt. Files stay the single source of truth — `jet` writes nothing the resume
prompt will not read back from a file; it just guarantees the files are complete first.

`jet` **captures and hands off only**. It never implements, never advances a stage,
never commits, and never fabricates a `## Gate` confirmation. For a fact whose home is a
stage `jet` may not run (an actionable spec change → `evolve`), it does not freelance the
change — it records the pending item in the resume prompt so the fresh session handles it.

## Procedure

1. **Locate the resume point.** Run `node {{scripts_path}}/adhd-state.mjs status` and
   `node {{scripts_path}}/adhd-state.mjs next`. Note the next runnable stage and its
   milestone/feature. This is the stage the resume prompt will point at, and the work
   file `jet` drains into.

2. **Sweep the session for every material fact — this is the command.** Walk the whole
   conversation since the last save and, for each fact that would matter to a fresh
   session, decide its home and check whether it is already on disk. Work the table
   top-to-bottom; a fact is "important" if losing it would make the next session redo
   work, re-decide, or proceed wrong. Skip only genuinely ephemeral chatter.

   | Fact surfaced this session | Home (write here if absent) |
   |---|---|
   | Steps completed; the concrete next action; open thread/blocker | active work file (`## Left to do` + `## Log`) |
   | Settled mechanism / stack element | `docs/STACK.md` (+ `docs/DECISIONS.md` why-log) |
   | Any decision or tradeoff with a rationale | `docs/DECISIONS.md` |
   | New rule / invariant / concept / ubiquitous term | `docs/CONCEPTS.md` |
   | Persisted-data shape | `docs/DATA.md` (create lazily) |
   | Milestone scope change / waiver agreed | `m<N>/brief.md` |
   | Not-yet-actionable idea or deferred detail | resume prompt as a pending item (see step 3) — never write `parking.md` inline |
   | Actionable spec/behavior change discussed but not yet applied | **needs `evolve`** — do not apply; record as a pending item (see step 4) |
   | Gotcha / constraint discovered mid-work | work file `## Log`, or its canonical doc if durable |

3. **Save every gap.** For each fact not yet on disk, write it to the home the table
   names — now, before generating the prompt. This is where `jet` earns its keep: nothing
   important is left in the conversation.
   - **Work-file facts.** Find the active work file (`project/work/<stage>.md`, milestone
     form `project/work/m<N>-<stage>.md`). If it exists, append decisions/gotchas to
     `## Log` (newest last) and update `## Left to do` — check off finished items, add the
     concrete next action as an unchecked `- [ ]` item. `handoff-prompt.mjs` surfaces open
     items + the last log lines, so the next action MUST be an unchecked item and the key
     decisions MUST be among the most recent log lines. If the resume stage keeps no work
     file (e.g. `build`, a low-effort stage) but there is material context, create
     `project/work/<stage>.md` seeded with `## Gate` / `## Left to do` / `## Log` purely
     to carry the handoff — leave `## Gate` with only an unchecked `requirements-confirmed`
     line; never invent a confirmation.
   - **Canonical facts** (mechanism, decision, invariant, concept, data, scope/waiver)
     go to their doc from the table, not the work file — the work file is scratch and gets
     deleted. Honor the baseline guard: adding a stack element still needs the user's ok
     and a `DECISIONS.md` entry — if unconfirmed, record it as a pending item instead.
   - **Ideas are NOT parked inline.** `adhd park` runs a full clarifying interview — the
     opposite of a fast handoff — and `parking.md` is user-curated, so `jet` never writes
     it. Instead capture the idea's substance as a pending item (below); the fresh session
     runs `adhd park` to store it properly. The substance rides in the pasted prompt, so
     nothing is lost across the switch.
   - **Pending-stage items** — anything whose home is a stage `jet` may not run: an idea to
     park, an actionable spec change owed to `evolve`, an unconfirmed baseline addition.
     `jet` does NOT apply these. Record each as a substantive one-liner (enough to act on
     cold, not just "there was an idea") for step 4, so it rides in the resume prompt as an
     explicit next action with the command that resolves it.

4. **Generate the prompt.** Run `node {{scripts_path}}/handoff-prompt.mjs` from the
   project root. If step 3 produced any **pending-stage items** the script cannot know
   about (it only reads files), append a short `Pending on resume:` list to the prompt —
   each item a substantive one-liner plus the command that resolves it (e.g. "idea: bulk
   CSV import for existing inventory → `adhd park`"; "change: orders can be partially
   refunded → `adhd evolve`"). Everything else is already in the files the script reads,
   so it needs no patching.

5. **Present it as one copy/paste block.** Show the prompt verbatim inside a single
   fenced code block so the user can copy it whole into a new session. Above the block,
   state in one line what `jet` saved and what is pending (e.g. "Drained 2 decisions +
   next action to the work file; 1 idea rides as pending → `adhd park` next session") so
   the user knows the switch is lossless. Nothing else — no summary, no next step from you.

## Output

Every material session fact confirmed present on disk — gaps written to their canonical
home (work file, `DECISIONS.md`/`STACK.md`/`CONCEPTS.md`/`DATA.md`, brief) — then the
`handoff-prompt.mjs` resume prompt, plus any `Pending on resume:` items (ideas to park,
spec changes owed to `evolve`, unconfirmed baseline additions), presented as a single
copy/paste block. No stage advances; nothing is applied that needs `park`/`evolve` or a
user ok — those ride the prompt as pending. The guarantee: paste the block into a fresh
session and lose nothing.

## On completion

1. The resume prompt is on screen in a copy/paste block — the command is done.
2. Tell the user to paste it into a fresh session to continue. Recommend
   `autoCompact: false` so the handoff is deliberate, not triggered by compaction.
3. Do not commit, advance, or keep working unless the user asks.
