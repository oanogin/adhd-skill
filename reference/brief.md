# adhd — Brief

**Effort:** medium
**Gate:** groundwork done — `docs/CONCEPTS.md` exists (with its capability dependency map).
**Output:** `project/milestones/m{{N}}/brief.md`.
**Sub-skill:** `superpowers:brainstorming` (scope clarification).

`brief` opens a milestone. A milestone is a **ready-to-use experience** — a complete,
business-usable slice of the product, sized by business value, never by effort. Nothing
inside a milestone needs to be independently usable; the milestone is the usable unit.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate brief --milestone {{N}}`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.

## Procedure
1. **Start working memory + seed the gate.** Create `project/work/m{{N}}-brief.md` with
   `## Gate` + `## Left to do` + `## Log`. Seed `## Gate` with `requirements-confirmed`
   (the experience boundary).
2. **State the experience.** With the user, capture the milestone's goals in business
   terms — what a person can DO when this ships. No capability lists yet.
3. **Run the three-layer dependency analysis:**
   - **Mechanical closure.** Map the stated goals to capability areas, then run
     `node {{scripts_path}}/adhd-state.mjs closure <areaId>...` against the capability
     map in `docs/CONCEPTS.md`. Solid in-edges pull areas in transitively; soft edges
     are surfaced as decide-explicitly items.
   - **Semantic sweep.** Walk `docs/CONCEPTS.md` entity-by-entity for every in-scope
     entity: each relationship, lifecycle rule, and invariant that touches it either
     lands in scope or gets an explicit deferral. This catches what the graph cannot:
     prose-only dependencies, invariant-implied guards, entity attributes implying
     capabilities, roles implying mechanisms.
   - If the sweep finds a capability missing from the map or a new entity, STOP and
     re-run `adhd concepts` to patch `docs/CONCEPTS.md` first.
4. **Confirm the boundary.** Present: stated goals, pulled-in areas (with the reason
   each was pulled), soft-edge decisions, and explicit deferrals with waiver notes.
   This is user touchpoint #1 — record the verbatim ok on `requirements-confirmed`
   and check it with `node {{scripts_path}}/adhd-state.mjs work-gate brief --milestone {{N}}`.
5. **Write `m{{N}}/brief.md`** — exactly three short sections, terse, no flow
   re-narration:
   - `## Vision` — why this milestone exists, in business terms (2-4 sentences). Not a
     flow walkthrough.
   - `## Scope` — in-scope capability areas, one line each with its reason (stated or
     why-pulled); then deferrals + waiver notes.
   - `## Flows` — the flow slugs this milestone owns, one per line (seeded now, refined
     by the `flows` stage). Each flow slug here becomes the stable feature ID downstream.

   Realizability rule: every solid in-edge of every in-scope area is either already built
   or in this milestone.

## Output
`project/milestones/m{{N}}/brief.md` — `## Vision` / `## Scope` / `## Flows` only. No
`Track:` line — the flows generation has no tracks.

## On completion
1. Write the output file — the stage is done the moment `m{{N}}/brief.md` exists.
2. Drain and delete `project/work/m{{N}}-brief.md`.
3. Tell the user the next runnable stage is `flows` for this milestone.
