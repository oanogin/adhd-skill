# adhd — Concepts

**Effort:** high
**Gate:** the `foundation` stage is done — `docs/STACK.md` exists (or, legacy, the
baseline is logged in `docs/DECISIONS.md`).
**Output:** `docs/CONCEPTS.md` (the product's ubiquitous language: entities,
relationships, and a helicopter view of how the system works).
**Sub-skill:** `superpowers:brainstorming`.

`concepts` pins down **what exists in the product and how it works** — in one
deterministic, single-meaning reference — **before** any UX is drawn. It is the shared
vocabulary the user and the model speak: named entities, how they relate, and a
bird's-eye view of behavior. It is **not** a data model (no fields/schema — that is
`docs/DATA.md`) and **not** a placement map (no surfaces/deployables — that is
`project/map.md`).

`concepts` is a **living stage**, like `prototype` and `stories`: re-run it as
understanding deepens. When `tracer` or `build` surfaces a new entity not in
`CONCEPTS.md`, update `concepts` **first**, then continue.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate concepts`.
If it reports missing items, HALT. Tell the user exactly which predecessor stage to run.
No skip, no override — this is the skill's central discipline.

If the gate reports `foundation` is not done, HALT and tell the user to run
`adhd foundation` first.

## Procedure
1. **Start working memory + seed the gate.** This high-effort stage may span sessions.
   Create `project/work/concepts.md` with a `## Gate` block, a `## Left to do` checklist,
   and a `## Log` section, and append to it as you work. It is transient scratch — never a
   source of truth (see SKILL.md, "Working memory"). Seed `## Gate` with
   `requirements-confirmed`; clarify scope/direction with the user and check it with their
   verbatim ok, then `node {{scripts_path}}/adhd-state.mjs work-gate concepts` must pass
   before you write this stage's output artifact.
2. **Elicit the entities.** With `superpowers:brainstorming`, draw out the core product
   entities and what each represents — one concept at a time, plain product language.
3. **Draw the relationships.** Author a Mermaid `erDiagram` showing the entities and
   their **conceptual cardinality** (e.g. `TEAM ||--o{ PROJECT : owns`). Confirm each
   edge with the user. Cardinality only — no field types, no keys-as-schema.
4. **Capture the helicopter view.** Record the actors/roles, the core entities' key
   states/lifecycles, and the handful of **governing entity/state rules** (invariants).
   **Stop at helicopter altitude** — no step-by-step process flows, no implementation or
   realization detail. Navigation/interaction rules belong to `prototype`; physical
   schema belongs to `docs/DATA.md`.
5. **Determinism pass.** Every term defined once, every relationship stated once, no
   `TBD`, no synonyms. This file is the single, unambiguous home for the product's
   vocabulary and behavior model.
6. **Author the capability dependency map.** As a required section of `docs/CONCEPTS.md`,
   write a Mermaid flowchart of the product's capability areas. Each node is a named
   capability area. A solid edge (`-->`) means hard prerequisite (prerequisite → dependent);
   a dashed edge (`-.->`) means soft/enhances. Mark areas that are already built (e.g.
   with a label or comment). An area is **pickable next** when every solid in-edge comes
   from a built area — this is the pickable-next rule. This map is the soft roadmap from
   which milestones are selected: the `brief` stage runs
   `node {{scripts_path}}/adhd-state.mjs closure <areaId>...` over it to compute
   transitive prerequisites for a candidate area.
7. **Write `docs/CONCEPTS.md` last** — its existence is the stage's done signal.

## Output
- `docs/CONCEPTS.md`, with three zones plus the capability map:
  - **Ubiquitous language** — each entity, one plain line of what it represents.
  - **Relationships** — a Mermaid `erDiagram` with conceptual cardinality.
  - **Helicopter view** — actors, core lifecycles/states, governing entity/state rules.
  - **Capability dependency map** — a Mermaid flowchart of capability areas; solid
    edges = hard prerequisites, dashed = soft/enhances; built areas marked. This is the
    soft roadmap milestones are picked off.

## Re-running
`concepts` is **re-runnable**. Re-run it whenever the entity set or its behavior model
evolves — and always before continuing work that introduced a new entity.

## On completion
1. Write `docs/CONCEPTS.md` — the stage is done the moment it exists.
2. If the session is getting long, start a fresh one: run
   `node {{scripts_path}}/handoff-prompt.mjs` and give the user the resume prompt.
3. Drain `project/work/concepts.md`: migrate durable facts to their canonical home,
   then delete the work file.
4. Tell the user the next runnable stage is `stories`.
