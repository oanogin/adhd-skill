# adhd — Prototype

> **Flows generation:** `prototype` is an **on-demand command**, not a stage. It has
> no gate role and nothing depends on it. Run it for a milestone slice when a
> surface's UX is genuinely uncertain (`flows` step 8 points here); the
> `impeccable` flow below (`shape → confirm → craft`) applies to just that slice.
> The whole-product procedure below is the classic-generation stage. On a flows
> project the "## Gate check" below does NOT apply — the command is gateless
> (`project/stories.md` may not even exist yet) — and step 8's `project/prototype.md`
> is NOT written: record the slice sign-off in the milestone's `m<N>/flows.md`
> change log instead.

**Effort:** high
**Gate:** the `stories` stage is done — `project/stories.md` exists.
**Output:** `project/map.md`, `project/surfaces/<name>.md` (per `ui` surface), the wired
clickable whole-product prototype app, and `project/prototype.md` (the sign-off, written
last). Reads `project/stories.md` and `docs/CONCEPTS.md` as input.
**Sub-skill:** `superpowers:brainstorming` + `impeccable`.

`prototype` **realizes the story backlog** as one Hi-Fi, clickable, mock-data app —
built after `stories` so that every story in `project/stories.md` is realized by at
least one surface. It is how the vision is translated into something the user and the
team can see, click, and agree on. It establishes *what* is being built and *how* it
should behave, and it becomes the shared **soft roadmap**: milestones are later carved
out of a product already visible. A story with an empty `Surfaces` cell cannot be
selected at `milestone-brief`; filling those cells is the primary goal of this stage.

This stage **absorbs the old `map` stage** — it produces the sitemap/surface catalog as
its first step, then builds the prototype from it. It is **mock-data only**: no backend,
no real data, no data store. The clickable prototype is the persistent, always-current
UX reference and is never thrown away.

Scope it to the **critical and important** flow and rules — detailed enough to
communicate intent and order of implementation, not every pixel of every edge case.
Per-milestone detail is added later by `ux-refine`.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate prototype`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `stories` is not done, HALT and tell the user to run
`adhd stories` first.

## Procedure

`impeccable` does the UI work via its named commands: `teach`/`document` (set up
`docs/PRODUCT.md` + `docs/DESIGN.md` context), `shape <surface>` (clarify + plan a
surface's UX/UI into a user-confirmed brief), `craft <surface>` (build it). The flow is:
whole-product scenarios first (step 4, brainstorming), then per-surface
`shape → confirm → craft`, one surface at a time (step 5). Never `craft` a surface
without a confirmed `shape` brief.

1. **Start working memory + seed the gate.** This high-effort stage may span sessions.
   Create `project/work/prototype.md` with `## Gate` + `## Story changes` + `## Left to do`
   + `## Log` and append as you work — see SKILL.md, "Working memory". Seed the `## Gate`
   block with `requirements-confirmed` (the whole-product flow, step 4) plus one line per
   `ui` surface you will build (step 5). Each item is confirmed only when the user signs off
   and you record their verbatim ok — gate-checked with
   `adhd-state.mjs work-gate prototype`.

   **`## Story changes` block convention:** any NEW stories or SPLITS of existing stories
   discovered while building the prototype go into `## Story changes` in the work file
   first — one row per story using the same `ID | Story | Value | Depends on | Size`
   format as `project/stories.md` (the `Surfaces` cell is filled as surfaces are built).
   They are drained into `project/stories.md` on stage completion. The stage is NOT done
   while `## Story changes` holds unreconciled rows — the `verify` pass flags this.

   **Scope-creep / split rule:** splitting a story that is already PICKED into an
   in-flight or shipped milestone yields BACKLOG rows in `## Story changes` — they are
   picked up by a future `milestone-brief`. They are NEVER bolted onto the running
   milestone.
2. **Author the sitemap (absorbs `map`).** Write `project/map.md`: a flat surface
   catalog listing every surface the product is expected to have — `ui`
   screens/workspaces, `api` contracts, `lib` modules. Give each surface a one-line
   purpose and its `kind` (`ui` | `api` | `lib`). Keep `ui` surfaces **workspace-sized**
   — a coherent screen or workspace demoed as one unit, not a sub-tab or a single action;
   finer detail is decomposed later into `features`, never into more surfaces (see
   SKILL.md, "Surfaces"). Do NOT group surfaces by milestone — there is no milestone plan
   yet; a milestone selects from this catalog at `milestone-brief` time.

   Record each surface's **production home** — the real repo it ships from. An
   `api`/`lib` surface takes it from its domain's `home`. A `ui` surface's production home
   is a frontend/microfront repo, which **may legitimately be undecided** — write `TBD`
   rather than guessing. A `ui` surface is **not** the prototype app: never write the
   prototype app (its repo, or a `prototype/`-style path) into a surface's production-home
   column — the `verify` pass flags it. Name capabilities, never mechanisms — no stack, framework,
   database, or architecture in `map.md` (those live in `docs/DECISIONS.md`).

   `map.md` groups the `docs/CONCEPTS.md` entities into deployables, DDD bounded contexts,
   and surfaces — placement (WHERE entities live); `concepts` already defines WHAT each
   entity is and HOW it behaves.
3. **Define domains and deployables (`multi` mode).** With the user, decompose the
   product into logical **domains** — each a named slice with a one-line description and
   an optional `home` (`repo` + `subpath`). Write them as a **Domains** table in
   `map.md`. Record the runnable/deployable units (backend services, frontend apps, the
   prototype app) and which domains each carries as a **Deployables** section. In
   `single` mode skip the domains table; still note the prototype and production apps as
   deployables. The prototype app is one deployable, never a surface's home.
4. **Design the whole-product flow FIRST — scenario level.** Invoke
   `superpowers:brainstorming` to design how the `ui` surfaces connect into one coherent
   product: entry points, navigation, the scenarios/journeys that span surfaces, and the
   rules that govern them. Stay at **flow altitude** — this pass decides *which surfaces
   exist and how they connect*, NOT the pixel-level detail of any one surface (that is
   step 5, per surface). Walk the user through the scenarios and **get explicit
   confirmation of the whole-product flow before descending to surfaces.** Record that
   confirmation by checking `requirements-confirmed` in the work file's `## Gate` with the
   user's verbatim ok; `work-gate prototype --item requirements-confirmed` must pass before
   step 5. Write the
   cross-surface flow and, per `ui` surface, a thin spec stub (purpose, where it sits in
   the flow, key states) to `project/surfaces/<name>.md`; each is deepened into a full
   spec in step 5. OVERRIDE the sub-skill output paths to that canonical target. For
   `api`/`lib` surfaces, capture behaviour/contract or responsibility/interface in the
   same `project/surfaces/<name>.md` — `impeccable` is not invoked for those, and they
   have no per-surface build loop.
   The whole-product flow's **navigation and interaction rules** live here; the
   **entity/state rules** they build on live in `docs/CONCEPTS.md` — reference them,
   do not restate them.
5. **Build the `ui` surfaces Hi-Fi — one surface at a time.** Work the `ui` surfaces in
   flow order, **one at a time**; never batch-design or batch-build them. `impeccable`
   drives every surface — use its **named commands**, do not freelance planning or
   styling:

   - **Context preflight (once, before the first surface).** `impeccable` reads
     `docs/PRODUCT.md` and `docs/DESIGN.md`. `docs/PRODUCT.md` exists from `vision`. If
     `docs/DESIGN.md` is missing, run `impeccable document` when prototype code already
     exists, else `impeccable teach`, before shaping any surface.
   - **Resolve the build location (once).** Read `prototypeTopology` from
     `project/config.json` (see SKILL.md, "Prototype topology"): `colocated` → build at
     `/p/<path>`; `standalone` → build into the project-wide prototype app at
     `config.json`'s `prototype` pointer. Resolve any repo path via
     `node {{scripts_path}}/adhd-state.mjs workspace-list`; HALT if a needed repo is unbound.

   Then for **each** `ui` surface:
   1. **`impeccable shape <surface>`** — `shape` owns this surface's clarification AND
      its plan: purpose, the scenarios it serves (from step 4), key states, the
      interactions it must support, what is explicitly out of scope. Do not run a
      separate clarify pass before it, and do not touch any other surface now. `shape`
      produces a brief. **WAIT for the user's explicit confirmation of that brief
      before writing any code** — `impeccable`'s own gate, the checkpoint that stops
      the build from running in the wrong direction. **That one confirmation is also
      the work-file gate confirmation**: record the same verbatim ok on this surface's
      `## Gate` line — never ask a second time for the same sign-off. Fold the
      confirmed brief into `project/surfaces/<name>.md`.
   2. **Gate-check, then `impeccable craft <surface>`** — run
      `node {{scripts_path}}/adhd-state.mjs work-gate prototype --item <surface>`; if it
      reports `missing`, HALT and re-clarify. Only on `pass` build the surface Hi-Fi on
      mock data at the resolved location, matching the design system.
   3. **Write the surface name into `project/stories.md`.** The moment this surface is
      built (or as soon as you determine which stories it realizes), open
      `project/stories.md` and append the surface name to the `Surfaces` cell of every
      story it realizes — and **remove the `?` suffix** from any provisional entry this
      surface confirms (a name seeded at `stories` before the surface existed). A story
      whose `Surfaces` cell is empty or holds only `?`-names is NOT implementable and
      CANNOT be selected at `milestone-brief`. This write is mandatory — do it now,
      not at the end of the stage.
   4. Do not start the next surface until this one is shaped (confirmed), built, and its
      stories' `Surfaces` cells written. If the user redirects during shape, re-shape and
      re-confirm — never push past unconfirmed direction.
6. **Wire the clickable whole-product prototype.** Assemble every `ui` surface into ONE
   runnable app — navigation, routing, shared mock state — clickable end to end. Use
   `impeccable craft` so the assembly matches the design system. Back `api`/`lib` surfaces
   with mock implementations where the `ui` needs them.
7. **Get sign-off.** Start the dev server, give the user the URL, and state what to click
   through — the whole-product journey and the critical flows/rules. Capture feedback
   verbatim. If they want changes, revise the surface and re-assemble; do not patch
   silently. Repeat until the user signs off.
8. **Write `project/prototype.md`** — what the prototype covers, the whole-product flow
   and rules it establishes, the user's sign-off, and every change request and how it was
   resolved. Write it LAST: its existence is the stage's done signal.
9. **Respect the commit gate.** The prototype app is code — never `git commit` it without
   the user's explicit "ok".

## Output
- `project/map.md` — the flat surface catalog (each surface: name, one-line purpose,
  `kind`, production home); in `multi` mode also a **Domains** section and a
  **Deployables** section. Cross-references `docs/CONCEPTS.md`. Stays capability-level.
- `project/surfaces/<name>.md` — one project-wide spec per surface (UX/UI for `ui`;
  contract for `api`; responsibility + interface for `lib`).
- the whole product's `ui` surfaces built Hi-Fi into one wired, clickable prototype app,
  signed off — the persistent UX reference.
- `project/prototype.md` — validation and sign-off notes; the stage's done artifact.

## Re-running
`prototype` is **re-runnable**, like `stories`. Re-run it to evolve the *whole-product*
flow or rules as understanding deepens. Per-milestone detail upgrades that do NOT change
the whole-product flow are made by `ux-refine`, not here.

## On completion
1. Write the output file(s) above — the stage is done the moment `project/prototype.md`
   exists (with `project/map.md` also present) AND `## Story changes` holds no
   unreconciled rows.
2. **Drain `## Story changes`.** Before deleting the work file, copy every row from
   `## Story changes` in `project/work/prototype.md` into `project/stories.md` (append or
   merge by ID). Leave `## Story changes` empty. The stage is NOT done until this drain
   is complete.
3. If the session is getting long, start a fresh one: run
   `node {{scripts_path}}/handoff-prompt.mjs` and give the user the resume prompt.
4. Drain `project/work/prototype.md`: migrate durable facts to their canonical home,
   then delete the work file.
5. Tell the user the groundwork is complete — the next runnable stage is `milestone-brief`.
