# Drop the story layer

**Date:** 2026-06-12
**Status:** decided — amends [2026-06-12-flows-as-spine-design.md](2026-06-12-flows-as-spine-design.md)

## Decision

Stories are removed from the model entirely. They survived the flows redesign as a
derived index (`project/stories.md`) but the layer is vestigial:

- flows carry the behavior;
- the CONCEPTS sweep carries completeness (every declared behavior gets an arrow or
  an explicit waiver);
- the capability map carries area-level "what's left";
- `parking.md` carries pending ideas;
- nothing consumes the story rows, the `Value`/`Size` story columns, the `Story`
  column in `features.md`, or the story↔flow cross-links.

## Changes

**Flow file format.** The `Stories:` header line is removed from the convention. An
OPTIONAL one-line `Purpose:` header is added (human-readable why; not
machine-consumed). `Depends on:` stays.

**`scripts/adhd-state.mjs`.**

- `parseFlows` drops the `stories` field (keeps `dependsOn`, `participants`,
  `arrows`, `branchIssues`, `unparsed`).
- `contract` refs become `[<flow>]` only (no `· S1` suffix).
- `validate` drops the flow→story link checks.
- `parseStories` is deleted.
- `parseFeatures` drops the `story` field; the canonical features table becomes
  `| ID | Feature | Domain | Repo | Size | Depends on | Build | Verified |`.
  The parser reads by header name, so an old table with a `Story` column still
  parses (tolerated, ignored).

**Docs.** The flows stage's "derive the story set" step becomes "run the CONCEPTS
sweep" — the sweep stays as the completeness mechanism; its output is the flows plus
explicit waivers, no `stories.md` append. A new idea mid-project routes to
`adhd park` (not yet actionable) or an evolve-sequenced flow (actionable now).
`parking.md` is also the idea backlog. SKILL.md loses the story fact-home rows and
the "story backlog" trigger; the common-mistakes row becomes "hand-picking the flow
set — derive from the CONCEPTS sweep".

**Existing projects.** An existing `project/stories.md` is inert readable history —
nothing reads it, nothing blocks on it.
