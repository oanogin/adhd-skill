# adhd — fix (management command)

**Effort:** low–medium
**Purpose:** correct existing code in place — a bug, handlers in the wrong files, a
convention violation, a small behavior-preserving refactor — without milestone or
`evolve` ceremony.
**Not a stage:** no gate beyond `project/config.json` existing. Run it anytime.

## What qualifies as a fix

A change is a `fix` when the **target state is already specified** somewhere and the
code merely fails to match it:

- a **bug** — behavior contradicts a signed-off flow diagram
  (`project/flows/<scenario>.md`), a feature plan, or `docs/CONCEPTS.md`'s
  governing rules;
- a **structural correction** — code in the wrong file/module/repo location, a naming
  or convention violation, dead code, a behavior-preserving refactor;
- a **breakage** — build, tests, types, or tooling broken.

A change is **NOT** a fix when it alters what the product should do: a new or changed
entity, surface, whole-product flow or rule, or data model. That is a scope
change — route it through `adhd evolve`. If mid-fix you discover the *spec* is what's
wrong (a flow diagram, `CONCEPTS.md`), STOP and switch to `evolve` —
the spec is corrected first, then the code follows it.

## Procedure

1. **Triage.** State in one line which artifact specifies the correct state (a flow
   diagram, a feature plan, repo conventions, "tests green"). If no artifact does, it is
   a scope change — go to `adhd evolve` instead.
2. **Confirm scope with the user.** One short exchange: what will change, what will
   not. No work file, no `## Gate` ceremony — `fix` is deliberately light. For a fix
   big enough to span sessions, it is too big: split it, or it is really a feature
   (file it via `evolve`).
3. **For a bug, run `superpowers:systematic-debugging`** — reproduce, find the root
   cause, then fix the cause, not the symptom. For a structural correction, state the
   target layout and apply it mechanically.
4. **Fix in the owning repo.** In `multi` mode resolve the repo's local path via
   `node {{scripts_path}}/adhd-state.mjs workspace-list`; HALT if unbound. Honor that
   repo's conventions and the **Baseline guard** (SKILL.md) — a fix never introduces a
   library or service not in `docs/STACK.md`.
5. **Verify.** Run the repo's tests, build, and type checks; confirm green from the
   output, not by assertion. A bugfix gets a regression test where the repo's testing
   conventions support one.
6. **Sync the books (only what the fix touched).**
   - If the fix resolves a finding in some `m<N>/review.md`, set that finding's
     `Status` to `fixed`.
   - If the fix invalidated a feature's `Verified: yes` in `m<N>/features.md`
     (it changed that feature's code), re-run that feature's verification before
     leaving the cell as `yes`.
   - No other artifact changes — a fix never edits scope docs.
7. **Respect the commit gate.** Never `git commit` without the user's explicit "ok".

## Output

Corrected, verified code — plus an updated review-finding `Status` when the fix came
from a review. `fix` leaves no artifact of its own.

## On completion

1. Report what was fixed, the root cause (for a bug), and the verification output.
2. If the fix revealed a wrong or missing spec (flow diagram, `CONCEPTS.md`), tell the
   user to run `adhd evolve` — do not patch the spec inline.
