# adhd — Vision

**Effort:** high
**Gate:** `setup` is done — the canonical layout and `project/config.json` exist.
**Output:** `docs/PRODUCT.md`.
**Sub-skill:** none.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate vision`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `setup` is missing, HALT and tell the user to run
`adhd setup` first.

## Procedure
1. **Start working memory + seed the gate.** This high-effort stage may span sessions.
   Create `project/work/vision.md` with `## Gate` + `## Left to do` + `## Log` and append
   as you work — see reference/working-memory.md. Seed `## Gate` with
   `requirements-confirmed`; clarify scope/direction with the user and check it with their
   verbatim ok, then `node {{scripts_path}}/adhd-state.mjs work-gate vision` must pass
   before you write this stage's output artifact.
2. **Interview the user.** Vision is a conversation, not a guess. Draw out, one topic
   at a time:
   - the product one-liner — what it is, in a single sentence;
   - target users — who they are and the context they operate in;
   - the problem being solved;
   - usage context — where, how, and when the product is used;
   - brand and tone — how it should feel;
   - anti-references — what it must NOT feel like;
   - strategic principles — the durable rules that guide every later decision.
3. **Write `docs/PRODUCT.md`** in the shape `impeccable` expects, with exactly these
   seven sections, in this order: `# Product`, `## Users`, `## Problem`,
   `## Usage context`, `## Brand & tone`, `## Anti-references`,
   `## Strategic principles`.
4. **No invention.** Capture only what the user actually states — do not invent users,
   scope, or principles. Where an answer is still open, leave a clearly marked
   placeholder, then resolve every such placeholder marker before finishing the stage.
   `impeccable` rejects a PRODUCT.md that still contains unresolved placeholder
   markers, so the file must be complete when Vision ends.

## Quality bar

Checked before the artifact is written — structure alone is not done. A failed check
means **interview deeper** (ask a sharper follow-up) — never pad or invent to pass it:

- **Swap test (every section).** If the sentence stays true with a competitor's name
  swapped in, it is too generic to guide anything. "Busy professionals who manage
  tasks" fails; "on-call engineers triaging alerts at 3am on a phone" passes.
- **Rejection power.** A reader holding only PRODUCT.md must be able to reject at
  least one plausible-sounding feature or direction. If nothing could ever be
  rejected, the principles are platitudes — re-interview.
- **Principles trade something away.** Each strategic principle names what it gives
  up: "X over Y". "Keep it simple" decides nothing; "no configuration — opinionated
  defaults over flexibility" decides arguments.
- **Anti-references are concrete.** Name actual products, feels, or patterns to avoid
  — "must not feel like a ticketing queue", not "not bloated".

## Output
`docs/PRODUCT.md` with these seven sections:

1. `# Product` — the one-line definition of the product.
2. `## Users` — who the target users are and their context.
3. `## Problem` — the problem the product solves.
4. `## Usage context` — where, how, and when it is used.
5. `## Brand & tone` — how the product should feel.
6. `## Anti-references` — what the product must NOT feel like.
7. `## Strategic principles` — the durable principles guiding later decisions.

## On completion
1. Write the output file(s) above — the stage is done the moment `docs/PRODUCT.md` exists.
2. If the session is getting long, start a fresh one: run
   `node {{scripts_path}}/handoff-prompt.mjs` and give the user the resume prompt.
3. Drain `project/work/vision.md`: migrate durable facts to their canonical home,
   then delete the work file.
4. Tell the user the next runnable stage is `foundation`.
