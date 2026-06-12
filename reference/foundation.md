# adhd — Foundation

**Effort:** medium
**Gate:** `docs/PRODUCT.md` exists — the Vision stage is done.
**Output:** `docs/STACK.md` (the current tech stack + approved libraries) + the
baseline decision logged in `docs/DECISIONS.md`.
**Sub-skill:** none.

`foundation` records the **firm, known-from-the-start tech baseline** — the decisions
that will not be discovered later: primary language(s), the frontend framework, the
repo/deployable shape, the prototype topology, and the libraries the user wants used.
It is NOT architecture and NOT a spec: no schema, no service design, no per-feature
mechanism. Those are decided at the latest responsible moment, by the milestone that
first needs them.

The baseline splits across two files with two jobs:

- **`docs/STACK.md`** — the **always-current state**: what the product is built with,
  right now. Edited in place whenever the stack evolves; it carries no history. This is
  the file the agent checks before reaching for any technology (see the **Baseline
  guard** rule in SKILL.md).
- **`docs/DECISIONS.md`** — the **append-only log**: one entry per decision, with its
  rationale and date. It only grows; it is never the place to look up the current
  stack. Every `STACK.md` change gets an entry here.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate foundation`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `docs/PRODUCT.md` (the Vision stage) is missing, HALT and tell the
user to run `adhd vision` first.

## Procedure
1. **Capture only the firm baseline.** With the user, write down the tech choices that
   are genuinely settled now and would be expensive to leave open: language(s), the
   frontend framework, the repo layout (single vs multi, which repos exist), the
   prototype topology (`colocated` vs `standalone`), and the **approved libraries** —
   the libraries the user wants used (and any they explicitly do not). Anything still
   genuinely open is NOT decided here — leave it for the milestone that first needs
   the capability.
2. **Write `docs/STACK.md`** — the current-state baseline, with these sections:
   - `## Baseline` — languages, frontend framework, repo topology, prototype topology.
   - `## Libraries` — the approved list, one line each: `name — what it is used for`.
     Include explicit exclusions if the user named any (`no <lib> — <why>`).
   - `## Services` — left out now; `realize` (classic: `tracer`) adds it when the
     first real mechanism (data store, queue, auth provider, ...) is settled.
3. **Log the baseline decision in `docs/DECISIONS.md`.** One `## ` entry summarizing
   the baseline and its rationale. `setup` already created the file with a
   `# Decisions` heading. From here on the pattern is fixed: **STACK.md changes in
   place, DECISIONS.md appends the why.**
4. **Configure the workspace if multi-repo.** If the product spans repos, or has a
   standalone prototype app, run the `workspace` command now (see
   [workspace.md](workspace.md)): switch to `multi`, register repos, set the prototype
   topology and home. `workspace` is a management command; `foundation` is the natural
   moment to run it.
5. **Do not over-reach.** No data model, no architecture diagram, no API design, no
   per-domain mechanism. If you are tempted to spec something, stop — it belongs to a
   later stage (`realize` — classic: `tracer` — settles infra mechanisms;
   `docs/DATA.md` is authored lazily).

## Output
- `docs/STACK.md` — `## Baseline` + `## Libraries` (current state, no history).
- `docs/DECISIONS.md` — the baseline decision logged with rationale.
- In `multi` mode: a configured workspace — mode, registered repos, prototype topology.

## On completion
1. Write the output file(s) above — foundation is done once `docs/STACK.md` exists.
   (A legacy project with no `STACK.md` but a logged decision in `DECISIONS.md` also
   counts as done; author `STACK.md` from the logged baseline at the next opportunity.)
2. If the session is getting long, start a fresh one: run
   `node {{scripts_path}}/handoff-prompt.mjs` and give the user the resume prompt.
3. Tell the user the next runnable stage is `concepts`.
