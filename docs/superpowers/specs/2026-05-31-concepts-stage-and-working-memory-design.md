# adhd — `concepts` stage + automatic working memory

**Date:** 2026-05-31
**Status:** approved design, pre-plan

Two additions to the `adhd` conductor, designed together because they share files
(`SKILL.md`, `scripts/`, the reference set) and ship as one change:

1. A new groundwork stage, **`concepts`**, that pins down *what exists and how the
   system works* (the ubiquitous language) before any UX is drawn.
2. An **automatic, per-task working-memory file** on high-effort stages so a session
   that compacts or ends mid-stage resumes cleanly.

No new dependency: `superpowers` + `impeccable` stay the only hard deps. The
planning-with-files pattern is absorbed natively (Claude Code, Codex, Cursor, Gemini
all work the same — no hooks, no fixed foreign paths).

---

## Part 1 — the `concepts` stage

### Purpose

Today the domain glossary is a buried step-3 inside `prototype` (`reference/prototype.md`):
plain-prose vocabulary, no explicit relationships or cardinality, no diagram, no gate,
authored *concurrently* with building the prototype. That is too late and too weak: the
user wants a **deterministic, single-meaning** reference for *what exists in the product
and how it works* agreed **before** the UX prototype, so the user and the model share
one vocabulary.

`concepts` is that reference. It is the product's **ubiquitous language**: the named
entities, how they relate, and a helicopter view of how the system behaves — and nothing
deeper. It is **not** a data model (no fields/schema — that is `DATA.md`) and **not** a
placement map (no surfaces/deployables — that is `map.md`).

### Placement in the flow

```
setup → vision → foundation → concepts → prototype → stories → …
```

- **Loop:** groundwork, **living / re-runnable** (like `prototype` and `stories`).
- **Effort:** high.
- **Gate:** `foundation` done (firm tech baseline logged in `docs/DECISIONS.md`).
- **Artifact (exists ⇔ done):** `docs/CONCEPTS.md`. The old `docs/GLOSSARY.md` folds into
  it — `GLOSSARY.md` is retired everywhere.
- **Sub-skill:** `superpowers:brainstorming` (to interrogate the user's mental model).

`prototype`'s gate gains a new predecessor: `docs/CONCEPTS.md` must exist.

### `docs/CONCEPTS.md` — content (exactly three zones, nothing deeper)

1. **Ubiquitous language** — every core entity, one plain-language line of what it
   represents. (This subsumes the old glossary.)
2. **Relationships** — a Mermaid `erDiagram` showing the entities and their cardinality,
   e.g. `TEAM ||--o{ PROJECT : owns`. Conceptual cardinality only — no field types, no
   keys-as-schema.
3. **Helicopter view** — the bird's-eye "how it works": the actors/roles, the core
   entities' key states/lifecycles, and the handful of **governing entity/state rules**
   (invariants). **Stops at helicopter altitude** — no step-by-step process flows, no
   implementation/realization detail.

**Determinism bar (explicit in the reference):** every term defined once, every
relationship stated once, no `TBD`, no synonyms. The file is the single, unambiguous
home for the product's vocabulary and behavior model.

### Boundaries (the anti-duplication rules)

- **vs `vision` (`docs/PRODUCT.md`):** vision = value + scope (why/what-value). concepts
  = structure + behavior model. The helicopter view stays *structural*; it never
  restates value propositions.
- **vs `prototype`:** `concepts` owns **entity/state rules** (invariants, lifecycles).
  `prototype` owns **navigation/interaction rules** and *references* the concepts rules
  rather than re-stating them.
- **vs `map.md`:** `concepts` = entities only (**what & how**). `map.md` = placement
  (**where**): it groups entities into deployables, DDD **bounded contexts**, and
  surfaces (UI/API/lib). The word "domain" belongs to `map.md` (DDD context) — which is
  why this stage is named `concepts`, not `domain`.
- **vs `DATA.md`:** `concepts` = conceptual, stable (*what exists & how it works*).
  `DATA.md` = current **field-level** entity state (*what fields, right now*).

### Living-stage back-pressure

`concepts` is re-runnable, but staleness must be actively prevented:

- When `tracer` or `build` surfaces a **new entity** not in `CONCEPTS.md`, the rule is
  **update `concepts` first**, then continue. (A soft-warn, in the same spirit as the
  existing milestone-discipline soft-warn — not a hard block on the build gate.)
- `audit` gains a staleness check (see Cross-cutting changes).

### Procedure (for `reference/concepts.md`)

1. **Gate check** — `adhd-state.mjs gate concepts`. If missing, HALT and name the
   predecessor (`foundation`).
2. **Auto working-memory** — this is a high-effort stage, so create
   `project/work/concepts.md` at the start (see Part 2) and write to it as you go.
3. **Elicit the entities** — with `superpowers:brainstorming`, draw out the core
   entities and their plain-language meaning. One concept at a time.
4. **Draw the relationships** — author the Mermaid `erDiagram` with cardinality; confirm
   each edge with the user.
5. **Capture the helicopter view** — actors/roles, core lifecycles/states, governing
   entity/state rules. Stop at helicopter altitude.
6. **Determinism pass** — every term once, every relationship once, no TBD/synonyms.
7. **Write `docs/CONCEPTS.md` last** — its existence is the done signal.
8. **On completion** — `session-add concepts`; `context-watch --next prototype`; drain
   `project/work/concepts.md` to canonical homes and delete it; drain `notes.md`; tell
   the user the next stage is `prototype`.

### Ripples on existing references

- **`reference/prototype.md`:** gate gains `docs/CONCEPTS.md`; **delete step 3** (the
  glossary sketch); prototype now *reads* `CONCEPTS.md` as input; remove `GLOSSARY.md`
  from the Output list; in the `map.md` step, state that `map.md` groups the
  `CONCEPTS.md` entities into deployables / bounded contexts / surfaces (placement),
  cross-referencing `CONCEPTS.md` instead of `GLOSSARY.md`; add the rules-boundary note
  (prototype owns navigation/interaction rules, references concepts' entity/state rules).
- **`reference/finalize.md`:** production-track finalize gains a step — update `DATA.md`
  for the entities/fields this milestone changed, keeping it current.
- **`reference/build.md` / `reference/tracer.md` / `reference/features.md`:** add the
  back-pressure rule (new entity → update `concepts` first). `build` explicitly does
  **not** create a working-memory file; `tracer` (high effort) does.
- **`reference/adopt.md`:** the adopt path must produce `docs/CONCEPTS.md` (it
  substitutes for the groundwork loop, so without it the `prototype` gate breaks for
  adopted projects).
- **`reference/setup.md`:** do **not** create `CONCEPTS.md` (existence = done; the
  `concepts` stage creates it). Gitignore `project/work/`. Add the `autoCompact` note.

---

## Part 2 — automatic per-task working memory

### Purpose

A session that compacts or ends mid-stage loses the volatile "what I just tried / what
failed / where I am" state. `adhd`'s artifacts are deliverables, not working memory, and
the current `handoff-prompt.mjs` carries only position + status. This adds a thin
working-memory layer that makes mid-stage resume seamless and survives unexpected
compaction.

### Shape

- **File:** `project/work/<stage>[-m<N>].md` — e.g. `work/concepts.md`,
  `work/prototype.md`, `work/m2-ux-refine.md`, `work/m2-tracer.md`. Gitignored.
- **Two light zones** (a structured `notes.md` for one in-flight task):

  ```markdown
  # Working memory: <stage> [— milestone N]
  Ephemeral scratch — NOT a source of truth. Drain to canonical homes and delete on completion.

  ## Left to do
  - [ ] next thing  ← unchecked items are the resume pointer
  - [x] done thing

  ## Log
  <free-form, newest last: what I did / what failed / decisions in flight>
  ```

- The model writes to it **as work proceeds**, so an unexpected compaction can't corrupt
  context — the file is already current.

### When it is created — automatic, high-effort stages only

Keyed purely to the stage's existing effort rating in the SKILL.md stages table, no
asking:

- **Auto-create** at the start of every stage rated **high** effort: `vision`,
  `concepts`, `prototype`, `ux-refine`, `tracer`, `features`, `review`.
- **No file** on every stage rated `medium`/`low`: `setup`, `foundation`, `stories`,
  `milestone-brief`, `plan`, `build`, `finalize`. For `build` specifically (medium), the
  feature plan already *is* the memory and the feature is sized to one window — this is
  the explicit reason `build` is excluded.

The rule is exactly "high-effort stage → work file," nothing hand-maintained. This
removes the per-task decision (good for the ADHD use-case) while avoiding ceremony where
it would be pure overhead. If a stage's effort rating changes in the table, its
work-file behavior follows automatically.

### Lifecycle (= `notes.md`)

- Transient; **never** a source of truth.
- On stage completion: drain durable facts to their canonical homes (`DECISIONS.md`,
  `CONCEPTS.md`, `DATA.md`, a surface spec, `.ruler/`), then **delete** the work file.
- `project/notes.md` stays as-is: the global, always-on transient scratchpad for
  non-task scratch. The work file is "a `notes.md` scoped to one task."

### Handoff integration (`scripts/handoff-prompt.mjs`)

- Glob `project/work/*.md`.
- If a work file exists for the in-flight task, pick the one matching the next stage and
  **lead** the resume prompt with "read `project/work/<task>.md` FIRST" (ahead of
  `notes.md`), inlining the open `## Left to do` items + the last 2-3 `## Log` lines.
- If none exists, fall back to today's behavior (notes.md + position + status).

### `context-watch` integration

`context-watch` logic is unchanged (the effort-score heuristic). Because the work file is
already auto-created on high-effort stages, when `context-watch` advises a fresh session
mid-stage the handoff is automatically seamless — no separate "create a work file now"
step. For a high-effort stage, a clean handoff is not produced without the work file
present.

### `audit` integration

`adhd-state.mjs audit` flags **orphan/stale work files** — a `project/work/*.md` whose
stage is already complete (its artifact exists) is stale and should have been drained +
deleted.

### Recommended setting (doc-only)

README + `reference/setup.md` recommend `"autoCompact": false` in Claude Code settings so
the user controls when to `/clear` and the work file + canonical artifacts carry state
across it. The skill only recommends it; it enforces nothing and works without it.

---

## Canonical layout changes

```
docs/
  PRODUCT.md
  DESIGN.md
  CONCEPTS.md                ← was GLOSSARY.md; now the concepts stage's artifact
  DATA.md                    current field-level entity state; kept current per milestone
  DECISIONS.md
project/
  config.json
  repos.local.json
  .session.json
  notes.md                   global transient scratchpad (healthy = empty)
  work/                       ← NEW, gitignored — per-task working memory
    <stage>[-m<N>].md         auto on high-effort stages; deleted on completion
  prototype.md
  map.md                     placement: deployables / bounded contexts / surfaces
  …
```

---

## Script changes

### `scripts/adhd-state.mjs` (+ `adhd-state.test.mjs`)

- Register `concepts`: predecessor `foundation`; artifact `docs/CONCEPTS.md`; effort
  `high`; ordered before `prototype` in `next`.
- `prototype` gate: add `docs/CONCEPTS.md` to its required predecessors.
- Rename every `GLOSSARY.md` reference to `CONCEPTS.md`.
- `audit`: (a) every `DATA.md` entity exists in `CONCEPTS.md`; (b) orphan/stale work
  files (`project/work/*.md` for a completed stage).

### `scripts/handoff-prompt.mjs` (+ `handoff-prompt.test.mjs`)

- Glob `project/work/*.md`, select the file matching the next stage, lead the prompt with
  it, inline open checklist + last log lines. Fall back to current behavior when absent.

### `scripts/context-watch.mjs`

- Logic unchanged. (Threshold may be revisited once `concepts` adds to session scores,
  but no code change is required by this design.)

---

## SKILL.md changes

- Stages table: add the `concepts` row (groundwork, living, high, `docs/CONCEPTS.md`,
  brainstorming, `reference/concepts.md`).
- Flow text: insert `concepts` between `foundation` and `prototype`; note it is living.
- Canonical layout block: `GLOSSARY.md` → `CONCEPTS.md`; add `project/work/`.
- "Capability, not mechanism" rule list: `GLOSSARY.md` → `CONCEPTS.md`.
- New cross-cutting **Working memory** section: auto on high-effort stages, two zones,
  lifecycle, relationship to `notes.md`, drain-and-delete, never a source of truth.
- Update the `context-watch` cross-cutting bullet to mention the auto work file.
- `notes.md` discipline bullet: clarify global `notes.md` vs per-task `work/<task>.md`.
- Common mistakes table: add "left a stale work file" and "put fields/surfaces in
  CONCEPTS.md" rows.

## README.md changes

- Document the `concepts` stage and the updated flow diagram.
- Document the automatic working-memory feature and the `autoCompact: false`
  recommendation.

---

## Out of scope

- Hooks of any kind (rejected: keeps the skill cross-agent).
- Invoking the `planning-with-files` skill (rejected: Claude-Code-centric; pattern
  absorbed instead).
- Tracking work files in git for team handoff (rejected: work files are single-owner,
  per-session scratch).
- Changing `context-watch`'s scoring model.
