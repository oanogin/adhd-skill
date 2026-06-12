# adhd — prototype (on-demand command)

**Effort:** high
**Purpose:** build a Hi-Fi, clickable, mock-data prototype for a milestone slice when
a surface's UX is genuinely uncertain and diagram sign-off alone is too weak.
**Not a stage:** no gate, nothing depends on it. Callable any time after `concepts`.
**Sub-skill:** `impeccable` (+ `superpowers:brainstorming` for slice clarification).

## What this command is

`prototype` is called on-demand from `flows` step 8 — or any time after `concepts` —
when a surface's intended UX cannot be resolved through diagram review alone. It
**illustrates a milestone slice** at Hi-Fi fidelity on mock data. It is not a
gate, not a deliverable other stages wait on, and it does not change scope: if it
reveals a contradiction with the signed-off flow diagrams, that is an `adhd evolve`
change, not a prototype decision.

## Procedure

1. **Working memory.** Create `project/work/prototype.md` with:
   - `## Gate` — seed with `requirements-confirmed` plus one line per surface in the
     slice. Each surface line is checked only when the user signs off that surface;
     record the verbatim ok on that line and run
     `node {{scripts_path}}/adhd-state.mjs work-gate prototype --item <surface>`.
   - `## Left to do` — checklist of surfaces remaining.
   - `## Log` — running notes.
   Append to this file throughout; never let it become a source of truth.

2. **Context preflight (once, before the first surface).** `impeccable` reads
   `docs/PRODUCT.md` and `docs/DESIGN.md`. If `docs/DESIGN.md` is missing, run
   `impeccable document` when prototype code already exists, or `impeccable teach`
   otherwise, before shaping any surface.

3. **Resolve the build location (once).** Read `prototypeTopology` from
   `project/config.json`: `colocated` → build at `/p/<path>`; `standalone` → build
   into the project-wide prototype app at `config.json`'s `prototype` pointer. Resolve
   any repo path via `node {{scripts_path}}/adhd-state.mjs workspace-list`; HALT if a
   needed repo is unbound.

4. **Per surface in the slice — shape then craft:**
   1. **`impeccable shape <surface>`** — clarify and plan the surface's UX intent,
      key states, and interactions within the slice's scenarios. Do not touch any other
      surface yet. **WAIT for the user's explicit confirmation of the brief** before
      writing any code; record the verbatim ok on that surface's `## Gate` line —
      `work-gate prototype --item <surface>` must pass before crafting.
   2. **`impeccable craft <surface>`** — build the surface Hi-Fi on mock data at the
      resolved build location, matching the design system.
   3. Do not start the next surface until this one is shaped (confirmed) and built.

   The slice's behavior truth lives in the flow diagrams — the prototype illustrates,
   never overrides. A contradiction discovered here is not resolved by editing the
   prototype; it is a spec change: route it to `adhd evolve`.

5. **Record the outcome.** Write what was prototyped, what the user signed off, and
   any flow-change requests into the owning milestone's `m<N>/flows.md` change log.
   Do NOT write a `project/prototype.md` file.

6. **Respect the commit gate.** The prototype app is code — never `git commit` it
   without the user's explicit "ok".

## Completion

1. The command is done when every surface in the slice is shaped, confirmed, and built,
   and the outcome is recorded in `m<N>/flows.md`.
2. Drain `project/work/prototype.md`: migrate any durable notes to their canonical
   home, then delete the work file.
3. If flow-change requests surfaced, tell the user to run `adhd evolve` to fold them
   in — the prototype does not drive spec changes directly.
