# adhd — Foundation

**Effort:** medium
**Gate:** `docs/PRODUCT.md` exists — the Vision stage is done.
**Output:** `docs/DECISIONS.md` (the firm tech baseline).
**Sub-skill:** none.

`foundation` records the **firm, known-from-the-start tech baseline** — the decisions
that will not be discovered later: primary language(s), the frontend framework, the
repo/deployable shape, the prototype topology. It is NOT architecture and NOT a spec:
no schema, no service design, no per-feature mechanism. Those are decided at the latest
responsible moment, by the milestone that first needs them.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate foundation`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `docs/PRODUCT.md` (the Vision stage) is missing, HALT and tell the
user to run `adhd vision` first.

## Procedure
1. **Capture only the firm baseline.** With the user, write down the tech choices that
   are genuinely settled now and would be expensive to leave open: language(s), the
   frontend framework, the repo layout (single vs multi, which repos exist), and the
   prototype topology (`colocated` vs `standalone`). Anything still genuinely open is
   NOT decided here — leave it for the milestone that first needs the capability.
2. **Log it in `docs/DECISIONS.md`.** One logged decision per choice, each with its
   rationale. `setup` already created the file with a `# Decisions` heading.
3. **Configure the workspace if multi-repo.** If the product spans repos, or has a
   standalone prototype app, run the `workspace` command now (see
   [workspace.md](workspace.md)): switch to `multi`, register repos, set the prototype
   topology and home. `workspace` is a management command; `foundation` is the natural
   moment to run it.
4. **Do not over-reach.** No data model, no architecture diagram, no API design, no
   per-domain mechanism. If you are tempted to spec something, stop — it belongs to a
   later stage (`tracer` settles infra mechanisms; `docs/DATA.md` is authored lazily).

## Output
- `docs/DECISIONS.md` — the firm tech baseline, one logged decision per choice.
- In `multi` mode: a configured workspace — mode, registered repos, prototype topology.

## On completion
1. Write the output file(s) above — foundation is done once `docs/DECISIONS.md` carries
   at least one logged decision (a `## ` entry).
2. `node {{scripts_path}}/adhd-state.mjs session-add foundation`
3. `node {{scripts_path}}/context-watch.mjs --next concepts` — if it advises a fresh
   session, run `node {{scripts_path}}/handoff-prompt.mjs` and give the user the prompt.
4. Drain `project/notes.md`: migrate any durable entry to its canonical home; healthy = empty.
5. Tell the user the next runnable stage is `concepts`.
