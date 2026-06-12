# Flows as Spine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the adhd skill around a per-milestone sequence-diagram spec layer (`flows`), experience-sized milestones, derived entity contracts, and a compressed stage chain — per `docs/superpowers/specs/2026-06-12-flows-as-spine-design.md`.

**Architecture:** Two project generations coexist, recorded as `generation` in `project/config.json`: `classic` (current chain, existing projects) and `flows` (new chain, new projects). `adhd-state.mjs` gains flow/registry/capability-map parsing, a derived `contract` command, a `closure` command, and generation-aware stage lists, gates, next, status, and validate. Reference docs: new `flows.md`, `realize.md`, `brief.md`; rewrites of `plan.md`, `build.md`, `review.md` and others; classic-only stage docs move to `reference/classic/`. SKILL.md and README.md updated last.

**Tech Stack:** Node.js (no deps), `node:test`, markdown reference docs.

**Repo state warning:** the working tree already has uncommitted changes (a previous session's work). Before Task 1, ask the user whether to commit or stash that work — NEVER commit without their explicit ok (adhd commit gate). Every commit step below also requires the user's ok.

**Run all tests with:** `node --test scripts/` (from the skill root).

---

### Task 1: Generation model in config

**Files:**
- Modify: `scripts/adhd-state.mjs` (defaultConfig, migrate)
- Test: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing tests**

Append to `scripts/adhd-state.test.mjs` (add `generation, GENERATIONS` to the existing import block):

```js
test('generation: new projects are flows-gen, legacy configs are classic', () => {
  const c = tmp();
  assert.equal(generation(c), 'flows'); // pre-setup default
  initConfig(c);
  assert.equal(loadConfig(c).generation, 'flows');
  assert.equal(generation(c), 'flows');
  // simulate a legacy config with no generation field
  const cfg = loadConfig(c);
  delete cfg.generation;
  saveConfig(c, cfg);
  assert.equal(generation(c), 'classic');
});

test('migrate: stamps generation classic on a legacy config', () => {
  const c = tmp();
  initConfig(c);
  const cfg = loadConfig(c);
  delete cfg.generation;
  saveConfig(c, cfg);
  const r = migrate(c);
  assert.equal(loadConfig(c).generation, 'classic');
  assert.equal(r.generationStamped, true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/adhd-state.test.mjs 2>&1 | tail -20`
Expected: FAIL — `generation is not a function` / `GENERATIONS` not exported.

- [ ] **Step 3: Implement**

In `scripts/adhd-state.mjs`, below `PROTOTYPE_TOPOLOGIES`:

```js
export const GENERATIONS = ['classic', 'flows'];

// A project's generation decides its stage chain. New projects are 'flows';
// a config without the field is a pre-redesign project -> 'classic'.
export function generation(cwd = process.cwd()) {
  const c = loadConfig(cwd);
  if (!c) return 'flows';
  return c.generation === 'flows' ? 'flows' : 'classic';
}
```

In `defaultConfig()`, add after `mode: 'single',`:

```js
    generation: 'flows',
```

In `migrate()`, add a third numbered block before the final `result.migrated =` line, and extend the result object literal at the top of the function with `generationStamped: false`:

```js
  // 3. Stamp generation on configs that predate the field (classic chain).
  {
    const config = loadConfig(cwd);
    if (config && !config.generation) {
      config.generation = 'classic';
      saveConfig(cwd, config);
      result.generationStamped = true;
    }
  }
```

And include `result.generationStamped` in the `result.migrated =` disjunction.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/adhd-state.test.mjs 2>&1 | tail -5`
Expected: all pass.

- [ ] **Step 5: Commit (with user ok)**

```bash
git add scripts/adhd-state.mjs scripts/adhd-state.test.mjs
git commit -m "feat(adhd): generation field — classic vs flows project chains"
```

---

### Task 2: Generation-aware stage lists and done signals

**Files:**
- Modify: `scripts/adhd-state.mjs`
- Test: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing tests** (import `GROUNDWORK_STAGES_FLOWS, MILESTONE_STAGES_FLOWS, groundworkStages, milestoneStages`)

```js
test('flows-gen stage lists', () => {
  assert.deepEqual(GROUNDWORK_STAGES_FLOWS, ['setup', 'vision', 'foundation', 'concepts']);
  assert.deepEqual(MILESTONE_STAGES_FLOWS, ['brief', 'flows', 'realize', 'review', 'finalize']);
});

test('milestoneStageDone: flows-gen artifacts', () => {
  const c = tmp();
  initConfig(c);
  w(c, 'project/milestones/m1/brief.md');
  w(c, 'project/milestones/m1/flows.md');
  w(c, 'project/milestones/m1/features.md', FEATURES_MD);
  assert.equal(milestoneStageDone(c, 1, 'brief'), true);
  assert.equal(milestoneStageDone(c, 1, 'flows'), true);
  assert.equal(milestoneStageDone(c, 1, 'realize'), true); // done signal = features.md
  assert.equal(milestoneStageDone(c, 1, 'review'), false);
});
```

- [ ] **Step 2: Run, expect FAIL** (`GROUNDWORK_STAGES_FLOWS` not exported; `brief` unmapped).

- [ ] **Step 3: Implement**

Below the existing stage-list constants:

```js
export const GROUNDWORK_STAGES_FLOWS = ['setup', 'vision', 'foundation', 'concepts'];
export const MILESTONE_STAGES_FLOWS = ['brief', 'flows', 'realize', 'review', 'finalize'];

export function groundworkStages(cwd) {
  return generation(cwd) === 'flows' ? GROUNDWORK_STAGES_FLOWS : GROUNDWORK_STAGES;
}
export function milestoneStages(cwd) {
  return generation(cwd) === 'flows' ? MILESTONE_STAGES_FLOWS : MILESTONE_STAGES;
}
```

In `milestoneStageDone`, extend the artifact map:

```js
  const f = { 'milestone-brief': 'brief.md', 'ux-refine': 'ux-refine.md', tracer: 'tracer.md',
    features: 'features.md', review: 'review.md', finalize: 'summary.md',
    // flows generation
    brief: 'brief.md', flows: 'flows.md', realize: 'features.md' }[stage];
```

(`groundworkDone` needs no change — the flows-gen loop simply never asks about `stories`/`prototype`.)

- [ ] **Step 4: Run tests, expect PASS.**

- [ ] **Step 5: Commit (with user ok)** — `feat(adhd): flows-gen stage lists + artifact done signals`

---

### Task 3: Flow file parsing (diagram, header fields, branches)

**Files:**
- Modify: `scripts/adhd-state.mjs`
- Test: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing tests** (import `parseFlowDiagram, parseFlows`)

```js
const FLOW_MD = `# Flow: invite-redeem

Stories: S1, S2
Depends on: context-switch

## Diagram
\`\`\`mermaid
sequenceDiagram
  actor R as Recipient
  participant RES as invite-resolver [ui]
  participant INV as invitation [api]
  R->>RES: paste code
  RES->>INV: redeem(code)
  INV->>INV: rate-limit check
  alt limit hit
    INV-->>RES: refused
  else valid
    INV-->>RES: member granted
  end
\`\`\`

## Rules
none

## Out of scope
none
`;

test('parseFlowDiagram: participants, arrows, kinds, self-arrows', () => {
  const d = parseFlowDiagram(FLOW_MD);
  assert.deepEqual(d.participants.map((p) => p.id), ['R', 'RES', 'INV']);
  assert.equal(d.participants[1].kind, 'ui');
  assert.equal(d.participants[0].kind, null);
  assert.equal(d.arrows.length, 5);
  assert.deepEqual(d.arrows[1], { from: 'RES', to: 'INV', msg: 'redeem(code)' });
  assert.deepEqual(d.branchIssues, []);
});

test('parseFlowDiagram: dangling alt branch is reported', () => {
  const bad = FLOW_MD.replace('    INV-->>RES: refused\n', '');
  const d = parseFlowDiagram(bad);
  assert.equal(d.branchIssues.length, 1);
  assert.match(d.branchIssues[0], /alt limit hit/);
});

test('parseFlows: header fields + diagram per file', () => {
  const c = tmp();
  w(c, 'project/flows/invite-redeem.md', FLOW_MD);
  const flows = parseFlows(c);
  assert.equal(flows.length, 1);
  assert.equal(flows[0].name, 'invite-redeem');
  assert.deepEqual(flows[0].stories, ['S1', 'S2']);
  assert.deepEqual(flows[0].dependsOn, ['context-switch']);
  assert.equal(flows[0].arrows.length, 5);
});
```

- [ ] **Step 2: Run, expect FAIL** (functions not defined).

- [ ] **Step 3: Implement**

Add below `parseReviewFindings`:

```js
// ---- flow parsing (project/flows/*.md) ----
// A flow file holds one scenario: a `Stories:` line, a `Depends on:` line, and a
// mermaid sequenceDiagram. Arrows are data: the contract command and the
// validate checks are built on this parse.
export function parseFlowDiagram(text) {
  const participants = [];
  const arrows = [];
  const branchIssues = [];
  let inMermaid = false;
  const sections = []; // open alt/opt/loop/par sections: {label, arrows}
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('```')) { inMermaid = !inMermaid && /^```mermaid/.test(line); continue; }
    if (!inMermaid) continue;
    let m;
    if ((m = /^(?:participant|actor)\s+([\w-]+)(?:\s+as\s+(.+))?\s*$/.exec(line))) {
      const label = (m[2] ?? m[1]).trim();
      participants.push({
        id: m[1],
        label: label.replace(/\s*\[\w+\]\s*$/, '').trim(),
        kind: /\[(\w+)\]\s*$/.exec(label)?.[1]?.toLowerCase() ?? null,
      });
    } else if ((m = /^([\w-]+)\s*(-{1,2}(?:>>|>|x|\)))\s*([\w-]+)\s*:\s*(.+)$/.exec(line))) {
      arrows.push({ from: m[1], to: m[3], msg: m[4].replace(/%%.*$/, '').trim() });
      if (sections.length) sections[sections.length - 1].arrows++;
    } else if ((m = /^(alt|opt|loop|par)\b/.exec(line))) {
      sections.push({ label: line, arrows: 0 });
    } else if (/^(else|and)\b/.test(line)) {
      const top = sections[sections.length - 1];
      if (top) {
        if (top.arrows === 0) branchIssues.push(`branch "${top.label}" has no arrows — dangling branch`);
        top.label = line; top.arrows = 0;
      }
    } else if (/^end\b/.test(line)) {
      const top = sections.pop();
      if (top && top.arrows === 0) branchIssues.push(`branch "${top.label}" has no arrows — dangling branch`);
    }
  }
  return { participants, arrows, branchIssues };
}

export function parseFlows(cwd) {
  const dir = path.join(cwd, 'project/flows');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort().map((f) => {
    const text = read(cwd, path.join('project/flows', f));
    const list = (re) => re.exec(text)?.[1].split(',').map((s) => s.trim())
      .filter((s) => s && s !== '—' && s !== '-' && !/^none$/i.test(s)) ?? [];
    return {
      name: f.slice(0, -3),
      stories: list(/^stories:\s*(.+)$/im),
      dependsOn: list(/^depends on:\s*(.+)$/im),
      ...parseFlowDiagram(text),
    };
  });
}
```

- [ ] **Step 4: Run tests, expect PASS.**

- [ ] **Step 5: Commit (with user ok)** — `feat(adhd): parse flow files — participants, arrows, branches`

---

### Task 4: Participant registry parsing (map.md)

**Files:**
- Modify: `scripts/adhd-state.mjs`
- Test: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing tests** (import `parseRegistry, PARTICIPANT_KINDS`)

```js
const MAP_MD = `# Map

## Participant registry

| Participant | Kind | Concept |
|---|---|---|
| Recipient | actor | Account |
| invite-resolver | ui | Invitation code |
| invitation | service | Invitation code |
`;

test('parseRegistry: reads the participant table from map.md', () => {
  const c = tmp();
  assert.equal(parseRegistry(c), null); // no map.md
  w(c, 'project/map.md', MAP_MD);
  const reg = parseRegistry(c);
  assert.equal(reg.length, 3);
  assert.deepEqual(reg[1], { name: 'invite-resolver', kind: 'ui' });
  assert.deepEqual(PARTICIPANT_KINDS, ['actor', 'ui', 'service', 'store', 'external']);
});
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement** (below `parseFlows`)

```js
export const PARTICIPANT_KINDS = ['actor', 'ui', 'service', 'store', 'external'];

// The participant registry lives in project/map.md as the table whose header
// has `participant` + `kind`. Flows may only use registered participants.
export function parseRegistry(cwd) {
  if (!exists(cwd, 'project/map.md')) return null;
  const t = parseTables(read(cwd, 'project/map.md'))
    .find((x) => x.header.includes('participant') && x.header.includes('kind'));
  if (!t) return [];
  const pC = t.header.indexOf('participant'), kC = t.header.indexOf('kind');
  return t.rows.map((r) => ({ name: clean(r[pC]), kind: clean(r[kC]).toLowerCase() }))
    .filter((p) => p.name);
}
```

- [ ] **Step 4: Run tests, expect PASS.**

- [ ] **Step 5: Commit (with user ok)** — `feat(adhd): participant registry parsing in map.md`

---

### Task 5: `contract <participant>` — derived cross-flow view

**Files:**
- Modify: `scripts/adhd-state.mjs`
- Test: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing tests** (import `contract`)

```js
test('contract: receives/sends/guards across all flows, with flow+story refs', () => {
  const c = tmp();
  w(c, 'project/flows/invite-redeem.md', FLOW_MD);
  const r = contract(c, 'invitation');
  assert.equal(r.receives.length, 1);
  assert.match(r.receives[0], /redeem\(code\)/);
  assert.match(r.receives[0], /← invite-resolver/);
  assert.match(r.receives[0], /invite-redeem · S1,S2/);
  assert.equal(r.sends.length, 2); // refused + member granted -> invite-resolver
  assert.equal(r.guards.length, 1); // rate-limit self-arrow
  assert.match(r.guards[0], /rate-limit check/);
});

test('contract: matches by participant id or label', () => {
  const c = tmp();
  w(c, 'project/flows/invite-redeem.md', FLOW_MD);
  assert.deepEqual(contract(c, 'INV'), contract(c, 'invitation'));
});
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement** (below `parseRegistry`)

```js
// Derived entity contract: every message a participant receives (its complete
// interface), sends (its dependencies), and self-arrows (guards/lifecycle) —
// across ALL flows, with flow + story refs. Derived, never stored: flows stay
// the single source of truth, so this view cannot drift.
export function contract(cwd, name) {
  const out = { receives: [], sends: [], guards: [] };
  for (const fl of parseFlows(cwd)) {
    const byId = Object.fromEntries(fl.participants.map((p) => [p.id, p]));
    const mine = new Set(fl.participants
      .filter((p) => p.id === name || p.label === name).map((p) => p.id));
    if (!mine.size) continue;
    const ref = `[${fl.name}${fl.stories.length ? ` · ${fl.stories.join(',')}` : ''}]`;
    const label = (id) => byId[id]?.label ?? id;
    for (const a of fl.arrows) {
      const from = mine.has(a.from), to = mine.has(a.to);
      if (from && to) out.guards.push(`${a.msg}  ${ref}`);
      else if (to) out.receives.push(`${a.msg}  ← ${label(a.from)}  ${ref}`);
      else if (from) out.sends.push(`${a.msg}  → ${label(a.to)}  ${ref}`);
    }
  }
  return out;
}
```

- [ ] **Step 4: Run tests, expect PASS.**

- [ ] **Step 5: Commit (with user ok)** — `feat(adhd): derived entity contract command`

---

### Task 6: `closure` — capability-map transitive prerequisites

**Files:**
- Modify: `scripts/adhd-state.mjs`
- Test: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing tests** (import `parseCapabilityMap, closure`)

```js
const CONCEPTS_MD = `# Concepts

## Capability dependency map

\`\`\`mermaid
flowchart LR
  ID[Identity]
  ORG[Organizations]
  EV[Events]
  RT[Runtime]
  INV[Invitations]
  ID --> ORG
  ORG --> EV
  EV --> RT
  ID --> INV
  EV -.-> INV
\`\`\`
`;

test('parseCapabilityMap: solid and soft edges from CONCEPTS flowchart', () => {
  const c = tmp();
  initConfig(c);
  w(c, 'docs/CONCEPTS.md', CONCEPTS_MD);
  const m = parseCapabilityMap(c);
  assert.deepEqual(m.solid, [['ID', 'ORG'], ['ORG', 'EV'], ['EV', 'RT'], ['ID', 'INV']]);
  assert.deepEqual(m.soft, [['EV', 'INV']]);
});

test('closure: transitive solid prerequisites + soft in-edges surfaced', () => {
  const c = tmp();
  initConfig(c);
  w(c, 'docs/CONCEPTS.md', CONCEPTS_MD);
  const r = closure(c, ['RT']);
  assert.deepEqual(new Set(r.areas), new Set(['RT', 'EV', 'ORG', 'ID']));
  assert.deepEqual(new Set(r.pulled), new Set(['EV', 'ORG', 'ID']));
  assert.deepEqual(r.soft, []); // INV's soft edge points INTO INV, which is out of scope
  const r2 = closure(c, ['INV']);
  assert.deepEqual(r2.soft, ['EV -.-> INV']); // soft in-edge: decide, never blocks
});
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement** (below `contract`)

```js
// ---- capability dependency map (docs/CONCEPTS.md mermaid flowchart) ----
// Solid edge `A --> B` = hard prerequisite A for dependent B; dashed `A -.-> B`
// = soft/enhances. The brief stage's mechanical closure layer.
export function parseCapabilityMap(cwd) {
  const docHome = loadConfig(cwd)?.docHome ?? 'docs';
  if (!exists(cwd, `${docHome}/CONCEPTS.md`)) return null;
  const solid = [], soft = [];
  let inMermaid = false, isFlowchart = false;
  for (const raw of read(cwd, `${docHome}/CONCEPTS.md`).split('\n')) {
    const line = raw.trim();
    if (line.startsWith('```')) { inMermaid = !inMermaid && /^```mermaid/.test(line); isFlowchart = false; continue; }
    if (!inMermaid) continue;
    if (/^(flowchart|graph)\b/.test(line)) { isFlowchart = true; continue; }
    if (!isFlowchart) continue;
    let m;
    if ((m = /^([\w-]+)(?:\[[^\]]*\])?\s*-\.->\s*([\w-]+)/.exec(line))) soft.push([m[1], m[2]]);
    else if ((m = /^([\w-]+)(?:\[[^\]]*\])?\s*-->\s*([\w-]+)/.exec(line))) solid.push([m[1], m[2]]);
  }
  return { solid, soft };
}

export function closure(cwd, targets) {
  const map = parseCapabilityMap(cwd);
  if (!map) return null;
  const need = new Set(targets);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [pre, dep] of map.solid) {
      if (need.has(dep) && !need.has(pre)) { need.add(pre); grew = true; }
    }
  }
  return {
    areas: [...need],
    pulled: [...need].filter((a) => !targets.includes(a)),
    soft: map.soft.filter(([pre, dep]) => need.has(dep) && !need.has(pre))
      .map(([pre, dep]) => `${pre} -.-> ${dep}`),
  };
}
```

- [ ] **Step 4: Run tests, expect PASS.**

- [ ] **Step 5: Commit (with user ok)** — `feat(adhd): capability-map closure command`

---

### Task 7: Flows-generation gates

**Files:**
- Modify: `scripts/adhd-state.mjs` (the `gate` function)
- Test: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
function groundworkFlows(cwd) {
  initConfig(cwd); // generation: flows
  w(cwd, 'docs/PRODUCT.md');
  w(cwd, 'docs/STACK.md');
  w(cwd, 'docs/CONCEPTS.md', CONCEPTS_MD);
}

test('flows-gen gates: brief → flows → realize chain', () => {
  const c = tmp();
  groundworkFlows(c);
  assert.equal(gate(c, 'brief', { milestone: 1 }).pass, true);
  assert.equal(gate(c, 'flows', { milestone: 1 }).pass, false); // no brief.md
  w(c, 'project/milestones/m1/brief.md');
  assert.equal(gate(c, 'flows', { milestone: 1 }).pass, true);
  assert.equal(gate(c, 'realize', { milestone: 1 }).pass, false); // no flows.md sign-off
  w(c, 'project/milestones/m1/flows.md');
  assert.equal(gate(c, 'realize', { milestone: 1 }).pass, true);
});

test('flows-gen gates: plan/build/review/finalize ride the features DAG, no tracks', () => {
  const c = tmp();
  groundworkFlows(c);
  w(c, 'project/milestones/m1/brief.md');
  w(c, 'project/milestones/m1/flows.md');
  w(c, 'project/milestones/m1/features.md', FEATURES_MD);
  assert.equal(gate(c, 'plan', { milestone: 1, feature: 'f-ui' }).pass, true);
  assert.equal(gate(c, 'build', { milestone: 1, feature: 'f-ui' }).pass, false); // unplanned M
  w(c, 'project/milestones/m1/plans/f-ui.md');
  assert.equal(gate(c, 'build', { milestone: 1, feature: 'f-ui' }).pass, true); // f-api built
  assert.equal(gate(c, 'review', { milestone: 1 }).pass, false); // f-ui not built
  assert.equal(gate(c, 'evolve', {}).pass, true); // flows gen: concepts done is enough
});

test('classic gates unchanged: stories still gated on concepts', () => {
  const c = tmp();
  groundwork(c);
  const cfg = loadConfig(c); cfg.generation = 'classic'; saveConfig(c, cfg);
  assert.equal(gate(c, 'stories', {}).pass, true);
  assert.equal(gate(c, 'milestone-brief', { milestone: 1 }).pass, true);
});
```

- [ ] **Step 2: Run, expect FAIL** (`unknown stage: brief`, evolve gate demands prototype).

- [ ] **Step 3: Implement**

In `gate()`:

1. Extend `needsMilestone` to `['milestone-brief', 'ux-refine', 'tracer', 'features', 'plan', 'build', 'review', 'finalize', 'brief', 'flows', 'realize']`.
2. Add flows-gen cases to the switch (before `default`):

```js
    case 'brief':
      need(gw('concepts'), 'concepts not done — docs/CONCEPTS.md missing');
      break;
    case 'flows':
      need(ms('brief'), `milestone ${milestone}: brief not done — m${milestone}/brief.md missing`);
      break;
    case 'realize':
      need(ms('flows'), `milestone ${milestone}: flows not signed off — m${milestone}/flows.md missing`);
      break;
```

3. Make `plan` generation-aware — replace its `need(ms('features'), ...)` line with:

```js
      if (generation(cwd) === 'flows') need(ms('realize'), `milestone ${milestone}: realize not done — m${milestone}/features.md missing`);
      else need(ms('features'), `milestone ${milestone}: features not done`);
```

4. Make `review` generation-aware — wrap the existing track branch:

```js
    case 'review':
      if (generation(cwd) === 'flows') {
        need(ms('realize'), `milestone ${milestone}: realize not done — m${milestone}/features.md missing`);
        for (const f of parseFeatures(cwd, milestone) ?? []) {
          if (!f.build) missing.push(`feature "${f.id}" not built`);
          else if (!f.verified) missing.push(`feature "${f.id}" built but not verified`);
        }
      } else if (track === 'prototype') {
        // ... existing classic branches unchanged
```

5. Make `evolve` generation-aware:

```js
    case 'evolve':
      if (generation(cwd) === 'flows') need(gw('concepts'), 'concepts not done — docs/CONCEPTS.md missing');
      else need(gw('prototype'), 'groundwork not complete — prototype not done (project/prototype.md / project/map.md)');
      break;
```

- [ ] **Step 4: Run tests, expect PASS (including all existing classic gate tests).**

- [ ] **Step 5: Commit (with user ok)** — `feat(adhd): flows-generation gates`

---

### Task 8: Generation-aware `nextStage` and `statusReport`

**Files:**
- Modify: `scripts/adhd-state.mjs`
- Test: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
test('flows-gen nextStage: walks brief → flows → realize → feature loop → review → finalize', () => {
  const c = tmp();
  groundworkFlows(c);
  assert.deepEqual(nextStage(c), { stage: 'brief', milestone: 1, feature: null });
  w(c, 'project/milestones/m1/brief.md');
  assert.equal(nextStage(c).stage, 'flows');
  w(c, 'project/milestones/m1/flows.md');
  assert.equal(nextStage(c).stage, 'realize');
  w(c, 'project/milestones/m1/features.md', FEATURES_MD);
  assert.deepEqual(nextStage(c), { stage: 'plan', milestone: 1, feature: 'f-ui' });
  w(c, 'project/milestones/m1/plans/f-ui.md');
  assert.deepEqual(nextStage(c), { stage: 'build', milestone: 1, feature: 'f-ui' });
});

test('flows-gen statusReport: shows the flows chain', () => {
  const c = tmp();
  groundworkFlows(c);
  w(c, 'project/milestones/m1/brief.md');
  const s = statusReport(c);
  assert.match(s, /brief ✓\s+flows ·\s+realize ·/);
  assert.doesNotMatch(s, /ux-refine|tracer/);
});
```

- [ ] **Step 2: Run, expect FAIL** (groundwork loop demands stories/prototype; milestoneNext walks classic chain).

- [ ] **Step 3: Implement**

In `nextStage`, replace `for (const s of GROUNDWORK_STAGES)` with `for (const s of groundworkStages(cwd))`. In the no-milestones return, use the gen-correct first stage:

```js
    if (target == null) return { stage: generation(cwd) === 'flows' ? 'brief' : 'milestone-brief', milestone: (dirs.at(-1) ?? 0) + 1, feature: null };
```

Split `milestoneNext` by generation — rename the existing body to `milestoneNextClassic` and add:

```js
function milestoneNext(cwd, m) {
  return generation(cwd) === 'flows' ? milestoneNextFlows(cwd, m) : milestoneNextClassic(cwd, m);
}

function milestoneNextFlows(cwd, m) {
  const at = (stage, feature = null) => ({ stage, milestone: m, feature });
  if (!milestoneStageDone(cwd, m, 'brief')) return at('brief');
  if (!milestoneStageDone(cwd, m, 'flows')) return at('flows');
  if (!milestoneStageDone(cwd, m, 'realize')) return at('realize');
  const feats = parseFeatures(cwd, m) ?? [];
  const needsPlan = (f) => f.size !== 'S' && !planDone(cwd, m, f.id);
  let blocked = null;
  for (const f of feats) {
    if (f.build) continue;
    if (depsBuilt(feats, f)) return at(needsPlan(f) ? 'plan' : 'build', f.id);
    if (!blocked) blocked = f;
  }
  if (blocked) return at(needsPlan(blocked) ? 'plan' : 'build', blocked.id);
  if (!milestoneStageDone(cwd, m, 'review')) return at('review');
  if (!milestoneStageDone(cwd, m, 'finalize')) return at('finalize');
  return at('done');
}
```

In `statusReport`, replace the groundwork line and the per-milestone stage list:

```js
  lines.push('Groundwork:  ' + groundworkStages(cwd).map((s) => `${s} ${ICON(groundworkDone(cwd, s))}`).join('  '));
```

```js
    const stages = generation(cwd) === 'flows'
      ? MILESTONE_STAGES_FLOWS
      : (track === 'prototype' ? ['milestone-brief', 'ux-refine', 'review', 'finalize'] : MILESTONE_STAGES);
```

and only print the `[${track}]` suffix when `generation(cwd) !== 'flows'`.

- [ ] **Step 4: Run tests, expect PASS.**

- [ ] **Step 5: Commit (with user ok)** — `feat(adhd): flows-gen next/status`

---

### Task 9: Validate — flow checks; scope classic-only checks

**Files:**
- Modify: `scripts/adhd-state.mjs` (the `validate` function)
- Test: `scripts/adhd-state.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
test('validate: flow checks — undeclared participant, unknown dep, registry miss, dangling branch, dep cycle', () => {
  const c = tmp();
  groundworkFlows(c);
  w(c, 'project/map.md', MAP_MD);
  w(c, 'project/stories.md', '| ID | Story |\n|---|---|\n| S1 | a |\n| S2 | b |');
  w(c, 'project/flows/invite-redeem.md', FLOW_MD.replace('Depends on: context-switch', 'Depends on: nope'));
  let r = validate(c);
  assert.ok(r.blockers.some((b) => /depends on unknown flow "nope"/.test(b)));
  // arrow to an undeclared participant id
  w(c, 'project/flows/bad.md', FLOW_MD.replace('RES->>INV: redeem(code)', 'RES->>GHOST: boo').replace('Depends on: context-switch', 'Depends on:'));
  r = validate(c);
  assert.ok(r.blockers.some((b) => /flow "bad": arrow references undeclared participant "GHOST"/.test(b)));
});

test('validate: flows-gen skips the classic Surfaces selection gate', () => {
  const c = tmp();
  groundworkFlows(c);
  w(c, 'project/stories.md', '| ID | Story |\n|---|---|\n| S1 | a |'); // no Surfaces column at all
  w(c, 'project/milestones/m1/brief.md', 'covers S1');
  const r = validate(c);
  assert.ok(!r.blockers.some((b) => /Surfaces/.test(b)));
});
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement**

In `validate`, wrap the existing empty-Surfaces block in `if (generation(cwd) !== 'flows') { ... }`.

Then add, before the final `return` (runs for ANY generation the moment `project/flows/` has files — classic projects adopting flows via `evolve` get the checks too):

```js
  // flow-spec checks — active whenever project/flows/ holds flow files
  const flows = parseFlows(cwd);
  if (flows.length) {
    const flowNames = new Set(flows.map((f) => f.name));
    const regNames = new Set((parseRegistry(cwd) ?? []).flatMap((p) => [p.name]));
    const storyIds = new Set((parseStories(cwd) ?? []).map((s) => s.id));
    for (const fl of flows) {
      if (!fl.arrows.length) blockers.push(`flow "${fl.name}": no sequence-diagram arrows found`);
      for (const issue of fl.branchIssues) blockers.push(`flow "${fl.name}": ${issue}`);
      const declared = new Set(fl.participants.map((p) => p.id));
      for (const a of fl.arrows) {
        for (const end of [a.from, a.to]) {
          if (!declared.has(end)) blockers.push(`flow "${fl.name}": arrow references undeclared participant "${end}"`);
        }
      }
      if (regNames.size) {
        for (const p of fl.participants) {
          if (!regNames.has(p.label) && !regNames.has(p.id)) {
            blockers.push(`flow "${fl.name}": participant "${p.label}" is not in the project/map.md registry`);
          }
        }
      }
      if (storyIds.size) {
        for (const s of fl.stories) {
          if (!storyIds.has(s)) warnings.push(`flow "${fl.name}": story "${s}" not found in project/stories.md`);
        }
      }
      for (const d of fl.dependsOn) {
        if (!flowNames.has(d)) blockers.push(`flow "${fl.name}": depends on unknown flow "${d}"`);
      }
    }
    const cyc = findCycle(flows.map((f) => ({ id: f.name, dependsOn: f.dependsOn })));
    if (cyc) blockers.push(`flow dependency cycle: ${cyc.join(' → ')}`);
  }
```

- [ ] **Step 4: Run tests, expect PASS.**

- [ ] **Step 5: Commit (with user ok)** — `feat(adhd): validate flow specs; scope Surfaces gate to classic`

---

### Task 10: CLI wiring — `contract`, `closure`

**Files:**
- Modify: `scripts/adhd-state.mjs` (`main`)
- Test: manual CLI smoke

- [ ] **Step 1: Add CLI cases** (before `default:`)

```js
    case 'contract': {
      const [name] = rest;
      if (!name) { console.error('Usage: adhd-state.mjs contract <participant>'); process.exitCode = 1; break; }
      const r = contract(cwd, name);
      if (!r.receives.length && !r.sends.length && !r.guards.length) {
        console.log(`participant "${name}": no arrows in any flow under project/flows/`);
        break;
      }
      console.log(`# Contract: ${name}\n`);
      if (r.receives.length) console.log('receives:\n' + r.receives.map((l) => `  ${l}`).join('\n'));
      if (r.sends.length) console.log('sends:\n' + r.sends.map((l) => `  ${l}`).join('\n'));
      if (r.guards.length) console.log('guards / self:\n' + r.guards.map((l) => `  ${l}`).join('\n'));
      break;
    }
    case 'closure': {
      if (!rest.length) { console.error('Usage: adhd-state.mjs closure <areaId> [...areaId]'); process.exitCode = 1; break; }
      const r = closure(cwd, rest);
      if (!r) { console.error('No capability map found in CONCEPTS.md'); process.exitCode = 1; break; }
      console.log(JSON.stringify(r, null, 2));
      break;
    }
```

Update the `default:` usage string to include `contract|closure`.

- [ ] **Step 2: Smoke test**

Run in a tmp dir with the Task 3/6 fixtures written: `node <skill>/scripts/adhd-state.mjs contract invitation` → prints receives/sends/guards. `node --test scripts/` → all green.

- [ ] **Step 3: Commit (with user ok)** — `feat(adhd): contract + closure CLI commands`

---

### Task 11: New reference doc — `reference/brief.md`

**Files:**
- Create: `reference/brief.md`

- [ ] **Step 1: Write the file** — full content:

````markdown
# adhd — Brief (flows generation)

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
5. **Write `m{{N}}/brief.md`:** the experience statement; the in-scope area list
   (stated + pulled, each with its reason); deferrals + waivers; and a `## Flows`
   section listing the flow names this milestone will own (seeded now, refined by the
   `flows` stage). Realizability rule: every solid in-edge of every in-scope area is
   either already built or in this milestone.

## Output
`project/milestones/m{{N}}/brief.md` — experience statement, scope (stated/pulled/
deferred), `## Flows` list. No `Track:` line — the flows generation has no tracks.

## On completion
1. Write the output file — the stage is done the moment `m{{N}}/brief.md` exists.
2. Drain and delete `project/work/m{{N}}-brief.md`.
3. Tell the user the next runnable stage is `flows` for this milestone.
````

- [ ] **Step 2: Commit (with user ok)** — `docs(adhd): brief reference (flows generation)`

---

### Task 12: New reference doc — `reference/flows.md`

**Files:**
- Create: `reference/flows.md`

- [ ] **Step 1: Write the file** — full content:

````markdown
# adhd — Flows (flows generation)

**Effort:** high — for an experience-sized milestone this is days of deliberate spec
work. That is the point: conflicts are resolved here, where they cost a pencil stroke.
**Gate:** `m{{N}}/brief.md` exists.
**Output:** `project/flows/<scenario>.md` (one per scenario), the participant registry
in `project/map.md`, derived story rows appended to `project/stories.md`, and
`m{{N}}/flows.md` (the sign-off doc, written LAST — its existence is the done signal).
**Sub-skill:** `superpowers:brainstorming`.

`flows` declares ALL of the milestone's interactions as mermaid sequence diagrams
before any code — order, branches, guards (rate-limit, auth, validation), error
paths. The signed-off flow set is the behavior contract every downstream stage reads;
`realize`/`plan`/`build` then run gate-light.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate flows --milestone {{N}}`.
If missing, HALT and name the predecessor.

## Procedure
1. **Start working memory + seed the gate.** Create `project/work/m{{N}}-flows.md`
   with `## Gate` + `## Left to do` + `## Log`. Seed one gate line per capability
   area in the brief (per-area batch sign-off), plus `requirements-confirmed`.
2. **Derive the story set — never hand-pick.** For every in-scope entity, walk its
   CONCEPTS lifecycle + invariants + relationships: every declared behavior either
   gets a flow arrow in this milestone or an explicit waiver. Append the derived
   stories to `project/stories.md` (`ID | Story | Value | Depends on | Size` — no
   Surfaces column). Keep IDs stable.
3. **Maintain the participant registry.** Every participant in any diagram must
   exist in `project/map.md`'s registry table:
   `| Participant | Kind | Concept |` with Kind ∈ actor/ui/service/store/external.
   Add participants as flows need them — never invent an undeclared name inline.
4. **Draw the flows, area by area.** For each capability area in the brief:
   - One scenario per file, `project/flows/<scenario>.md`, format below.
   - **Logical altitude only.** Participants are concepts (a service, a store, a
     surface) — never a framework, database, or deployment decision. A guard
     ("check rate limit") is behavior, not tech.
   - **Reference rules, never restate them.** A CONCEPTS invariant appears as a
     placed arrow/guard with a comment pointing home.
   - **Concern checklist before a flow is sign-off-eligible:** authn, authz,
     validation, rate-limit, error paths, empty/zero states, concurrency/idempotency,
     audit. Each concern either has its arrow or is explicitly waived in
     `## Out of scope`. Drawn or waived — a silent gap is not an option.
   - Consistency-check each area batch against every previously drawn flow (this
     milestone's and all built ones) before starting the next area:
     `node {{scripts_path}}/adhd-state.mjs validate`.
5. **Adversarial verify before sign-off.** Dispatch a read-only subagent over the
   full flow set (see reference/verify.md, flow checks): same trigger →
   contradictory outcomes; participant pairs with conflicting contracts; state
   transitions violating CONCEPTS lifecycles; flows consuming what no flow produces.
   Resolve findings with the user in batch.
6. **Per-area sign-off (user touchpoint #2).** Walk the user through each area's
   diagrams. Record the verbatim ok on that area's gate line;
   `node {{scripts_path}}/adhd-state.mjs work-gate flows --milestone {{N}} --item <area>`
   must pass per area. Sign-off means the user actually read the diagrams.
7. **Write `m{{N}}/flows.md` LAST** — the flow list (final), per-area sign-offs,
   waivers, and every change request and its resolution. Its existence = stage done.
8. **UI uncertainty?** If a surface's UX is genuinely uncertain, note it in
   `m{{N}}/flows.md` and run the on-demand `adhd prototype` command for that slice —
   it is never a gate.

## Flow file format

```markdown
# Flow: <scenario>

Stories: <ID, ID>
Depends on: <other flow names, or none>

## Diagram
​```mermaid
sequenceDiagram
  actor U as User
  participant S as some-surface [ui]
  participant SVC as some-service [service]
  U->>S: does thing
  S->>SVC: command(args)
  SVC->>SVC: guard check        %% CONCEPTS invariant, placed
  alt guard fails
    SVC-->>S: refused
  else ok
    SVC-->>S: done
  end
​```

## Rules
Behavior that does not fit an arrow. Reference concepts, never restate.

## Out of scope
<concern> — <waiver reason>
```

## Re-running
Flow files are living, global product truth — accumulated across milestones, owned by
none. Post-sign-off changes route through `adhd evolve` (the single front door): the
diagram is corrected first, consistency-checked, then code follows via `fix` or a
feature row.

## On completion
1. `m{{N}}/flows.md` exists; every flow in the brief's `## Flows` list has its file;
   `validate` is clean.
2. Drain and delete `project/work/m{{N}}-flows.md`.
3. Tell the user the next runnable stage is `realize`.
````

- [ ] **Step 2: Commit (with user ok)** — `docs(adhd): flows reference — the spec spine`

---

### Task 13: New reference doc — `reference/realize.md`

**Files:**
- Create: `reference/realize.md`

- [ ] **Step 1: Write the file** — full content:

````markdown
# adhd — Realize (flows generation)

**Effort:** high
**Gate:** `m{{N}}/flows.md` exists (flows signed off).
**Output:** `m{{N}}/realize.md` (mechanism notes) + `m{{N}}/features.md` (the DAG —
its existence is the done signal).
**Sub-skill:** none.

`realize` turns the signed-off flow set into buildable work: mechanisms + the feature
DAG. It replaces the classic `tracer` and `features` stages.

## Gate check
Run `node {{scripts_path}}/adhd-state.mjs gate realize --milestone {{N}}`.
If missing, HALT and name the predecessor.

## Procedure
1. **Start working memory.** Create `project/work/m{{N}}-realize.md` with `## Gate` +
   `## Left to do` + `## Log`; seed `requirements-confirmed` for the mechanism set.
2. **Pick mechanisms.** For each capability the milestone's flows need, choose the
   concrete mechanism. **Baseline guard:** anything not in `docs/STACK.md` stops for
   the user's ok first; update `STACK.md` and log the decision in `docs/DECISIONS.md`.
   Run a tracer-style end-to-end spike ONLY when genuinely new infrastructure appears
   — prove the path, then continue. Record mechanism notes in `m{{N}}/realize.md`.
3. **Carve the feature DAG from diagram segments — entity-aware.** For every entity
   (service/store participant) the milestone's flows touch:
   - Run `node {{scripts_path}}/adhd-state.mjs contract <participant>` — its full
     cross-flow interface.
   - The FIRST feature for that entity is its skeleton: schema + interface shaped
     from the full contract, sized for all flows. Per-story features then fill
     behavior. Skeleton built once, extended N times, reworked zero.
   - A frontend feature wires a `ui` participant to its backend features and depends
     on them.
4. **Write `m{{N}}/features.md`** as the standard table — exactly these columns:
   `| ID | Feature | Story | Domain | Repo | Size | Depends on | Build | Verified |`
   Name the flow(s) a feature implements in its `Feature` cell (e.g.
   `redeem endpoint (invite-redeem)`) — `plan`/`build` read it to find the diagrams.
   Size `S` skips `plan`; when unsure write `M`. Leave Build/Verified empty.
5. **Check it.** `node {{scripts_path}}/adhd-state.mjs validate` (cycles, unknown
   deps), then the `verify` pass for content drift.

## On completion
1. `m{{N}}/features.md` exists — stage done. `m{{N}}/realize.md` records mechanisms.
2. Drain and delete `project/work/m{{N}}-realize.md`.
3. `node {{scripts_path}}/adhd-state.mjs next --milestone {{N}}` names the first
   feature's `plan` (or `build` for Size S).
````

- [ ] **Step 2: Commit (with user ok)** — `docs(adhd): realize reference — mechanisms + entity-aware DAG`

---

### Task 14: Rewrite `reference/plan.md` and `reference/build.md` — the hard read contract

**Files:**
- Modify: `reference/plan.md`
- Modify: `reference/build.md`

- [ ] **Step 1: `plan.md`** — replace the **Gate** line and Procedure step 1; the rest stays:

Gate line becomes:
```markdown
**Gate:** the feature exists in the milestone's DAG (`m{{N}}/features.md` — the
`realize` stage in the flows generation, `features` in classic).
```

Procedure step 1 becomes:
```markdown
1. **Write the implementation plan — scoped reads only.** Run
   `superpowers:writing-plans` for the feature. The feature's context is EXACTLY:
   its row in `m{{N}}/features.md`; the flow diagram(s) named in its `Feature` cell
   (`project/flows/<scenario>.md`); `node {{scripts_path}}/adhd-state.mjs contract <P>`
   for every participant the feature implements; the surface stub
   (`project/surfaces/<name>.md`) if it serves a `ui` participant; and the target
   repo's code. **Whole-product reads are forbidden** — do not open `docs/CONCEPTS.md`,
   `project/stories.md`, or `project/map.md` wholesale; the flow slice IS the context.
   (Classic-generation projects without flows keep the old inputs: feature row +
   surface specs.)
   **Design against the contract:** plan only the current flow's arrows, but shape
   signatures and schema for the participant's full contract.
```

- [ ] **Step 2: `build.md`** — replace Procedure step 1's first paragraph with:

```markdown
1. **Execute the plan task-by-task — scoped reads only.** Work through
   `plans/{{feature}}.md` with `superpowers:executing-plans`. The read contract is
   the same as `plan`'s: feature row + its flow diagram(s) +
   `adhd-state.mjs contract <P>` per implemented participant + surface stub + repo
   code. Whole-product reads are forbidden. Implement ONLY the current flow's arrows;
   keep signatures shaped for the full contract. For UI craft use `impeccable craft`.
   **Code contradicts a diagram → STOP.** Never silently patch either side: a wrong
   diagram is a spec change — route it through `adhd evolve`; wrong code with a right
   diagram is `adhd fix`. This and the commit gate are the only user interrupts
   `build` is allowed.
```

Also update the “New entity → update `concepts` first” bullet to add: “In the flows generation a new entity also means a missing registry row and likely a missing flow — escalate to `adhd evolve`, never freelance the participant.”

- [ ] **Step 3: Commit (with user ok)** — `docs(adhd): plan/build hard read contract + contract-shaped signatures`

---

### Task 15: Rewrite `reference/review.md` (arrow coverage) and update `reference/finalize.md`

**Files:**
- Modify: `reference/review.md`
- Modify: `reference/finalize.md`

- [ ] **Step 1: `review.md`** — add to the procedure (flows generation):

```markdown
- **Arrow coverage (flows generation).** For every flow the milestone owns
  (the `## Flows` list in `brief.md`): every arrow has an implementation, and every
  implementation traces to an arrow. Run it per entity too — compare
  `adhd-state.mjs contract <participant>` against what the code exposes; partial
  implementations must be explicit (deferred arrows listed with their waiver), never
  silent. Unimplemented arrows or untraceable code are findings.
```

- [ ] **Step 2: `finalize.md`** — update its "next" pointer text: the next milestone starts with `brief` (flows generation) / `milestone-brief` (classic).

- [ ] **Step 3: Commit (with user ok)** — `docs(adhd): review arrow-coverage + finalize pointers`

---

### Task 16: Update `concepts.md`, `prototype.md`, `evolve.md`, `verify.md`, `setup.md`, `stories` index note

**Files:**
- Modify: `reference/concepts.md` — add a procedure step: author/maintain the **capability dependency map** (mermaid flowchart, solid = hard prerequisite, dashed = soft, built areas marked) as a required section of `docs/CONCEPTS.md`; it is the soft roadmap milestones are picked off.
- Modify: `reference/prototype.md` — reframe header: in the flows generation `prototype` is an **on-demand command** (no gate role, run for a milestone slice when UX is genuinely uncertain; `impeccable shape → confirm → craft` unchanged; never required by any stage). Classic generation keeps the old behavior via `reference/classic/prototype.md` (Task 17).
- Modify: `reference/evolve.md` — the living set it sequences becomes `concepts → flows (+ registry + stories index)` in the flows generation (classic keeps `concepts → stories → prototype`). A post-sign-off flow change: correct the diagram first, run `validate` + the flow verify checks, then route affected code to `fix` or a new feature row.
- Modify: `reference/verify.md` — add the flow checks to the audit list: contradictory outcomes for the same trigger, conflicting participant-pair contracts, lifecycle violations vs CONCEPTS, consumed-but-never-produced messages, registry orphans (registered participants no flow uses), flows owned by no milestone brief.
- Modify: `reference/setup.md` — scaffold note: new projects are `generation: flows`; the canonical tree gains `project/flows/`; `stories.md` has no Surfaces column; brief/flows/realize replace the classic per-milestone chain.

- [ ] **Step 1: Apply the edits above** (each is a small targeted section; keep each file's existing structure and the gate-check boilerplate).
- [ ] **Step 2: Commit (with user ok)** — `docs(adhd): concepts map, on-demand prototype, evolve/verify/setup for flows gen`

---

### Task 17: Move classic-only stage docs to `reference/classic/`

**Files:**
- Move: `reference/stories.md`, `reference/ux-refine.md`, `reference/tracer.md`, `reference/features.md`, `reference/milestone-brief.md` → `reference/classic/`
- Copy: current `reference/prototype.md` → `reference/classic/prototype.md` (before Task 16's reframe, or restore from git)

- [ ] **Step 1: `git mv` the five files into `reference/classic/`; add a `reference/classic/README.md`:**

```markdown
# Classic-generation stage references

Stage docs for projects with `generation: classic` (or no generation field) in
`project/config.json` — the pre-flows chain
(`stories → prototype` groundwork; `milestone-brief → ux-refine → tracer → features`
per milestone). New projects use the flows chain; see `../flows.md`, `../realize.md`,
`../brief.md`. To finish an in-flight classic milestone, follow these docs unchanged.
New work on a classic project adopts flows incrementally via `adhd evolve`.
```

- [ ] **Step 2: Commit (with user ok)** — `docs(adhd): classic stage docs to reference/classic/`

---

### Task 18: SKILL.md rewrite

**Files:**
- Modify: `SKILL.md`

The big one. Keep: invocation, conventions, preflight, "the project IS its files", modes, working memory + Gate zone, parking lot, hard gates + red flags + rationalization table, working in parallel, management commands, commit gate, baseline guard. Change:

- [ ] **Step 1: Stage table + flow line.** Replace the stage table and flow paragraph with the flows-generation chain (and a pointer to `reference/classic/` for classic projects):

```markdown
| Stage | Loop | Effort | Artifact (exists ⇔ done) | Sub-skill | Reference |
|---|---|---|---|---|---|
| `setup` | groundwork | low | `project/config.json` | none | [reference/setup.md](reference/setup.md) |
| `vision` | groundwork | high | `docs/PRODUCT.md` | none | [reference/vision.md](reference/vision.md) |
| `foundation` | groundwork | medium | `docs/STACK.md` | none | [reference/foundation.md](reference/foundation.md) |
| `concepts` | groundwork (living) | high | `docs/CONCEPTS.md` (incl. capability dependency map) | brainstorming | [reference/concepts.md](reference/concepts.md) |
| `brief` | per-milestone | medium | `m<N>/brief.md` | brainstorming | [reference/brief.md](reference/brief.md) |
| `flows` | per-milestone | high | `m<N>/flows.md` + `project/flows/*` | brainstorming | [reference/flows.md](reference/flows.md) |
| `realize` | per-milestone | high | `m<N>/features.md` (+ `m<N>/realize.md`) | none | [reference/realize.md](reference/realize.md) |
| `plan` | per-feature | medium | `m<N>/plans/<feature>.md` (skipped for `Size: S`) | writing-plans | [reference/plan.md](reference/plan.md) |
| `build` | per-feature | medium | code + `Build`/`Verified` in `features.md` | executing-plans / impeccable craft | [reference/build.md](reference/build.md) |
| `review` | per-milestone | high | `m<N>/review.md` | none | [reference/review.md](reference/review.md) |
| `finalize` | per-milestone | low | `m<N>/summary.md` | none | [reference/finalize.md](reference/finalize.md) |

Flow: groundwork runs `setup → vision → foundation → concepts`. Then per milestone:
`brief → flows → realize`, then the feature DAG one feature at a time (`plan` then
`build`), then `review → finalize`. A milestone is a ready-to-use experience — sized
by business value, never by effort. `prototype` is an on-demand command, not a stage.
Projects created before the flows generation (`generation: classic` in
`project/config.json`) keep the classic chain — see `reference/classic/`.
```

- [ ] **Step 2: Replace the "Surfaces" section** with a **"Flows, participants, and contracts"** section: flow files as global product truth; the participant registry in `map.md` (`actor/ui/service/store/external`); logical altitude; the derived `contract <participant>` view; the hard read contract for `plan`/`build`; surface stubs (`project/surfaces/<name>.md` = purpose + UX intent only — behavior is derivable). State the duplication rule table from the spec (each fact's single home).

- [ ] **Step 3: Update the canonical layout tree:** add `project/flows/<scenario>.md`; milestone folder shows `brief.md`, `flows.md`, `realize.md`, `features.md`, `plans/`, `review.md`, `summary.md`; remove `ux-refine.md`/`tracer.md`/`prototype.md`-as-groundwork rows; `stories.md` described as the accumulated backlog index (no Surfaces column).

- [ ] **Step 4: Update routing + confirmation model:** two user touchpoints per milestone (brief boundary, flow sign-off); build interrupts only on code-contradicts-diagram (→ `evolve`/`fix`) and the commit gate; routing examples — "behavior is wrong/missing in spec" → `evolve` (fix the diagram first); "code contradicts a signed-off diagram" → `fix`.

- [ ] **Step 5: Common-mistakes table:** drop classic-only rows (Surfaces `?`-gate, ux-refine slice rule, prototype-app homes); add: "Drawing a flow with an unregistered participant" → register it in `map.md` first; "Restating a CONCEPTS rule in a flow" → reference + place, never restate; "Reading CONCEPTS/stories/map wholesale at plan/build" → the flow slice + contract IS the context; "Implementing arrows beyond the current flow" → shape signatures for the contract, implement only this flow's arrows; "Hand-picking stories at flows" → derive from the CONCEPTS sweep.

- [ ] **Step 6: Scripts section:** add `contract <participant>` and `closure <areaId>...` to the command list.

- [ ] **Step 7: Commit (with user ok)** — `docs(adhd): SKILL.md — flows-as-spine chain`

---

### Task 19: README.md + final verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Mirror the SKILL.md changes in README.md** — new chain diagram, stage table (same table as Task 18 Step 1), flows/contract/closure description, classic-generation note.

- [ ] **Step 2: Full verification**

Run: `node --test scripts/` → all pass.
Run: `grep -rn "ux-refine\|tracer\|milestone-brief" SKILL.md README.md reference/*.md | grep -v classic` → only intentional classic-pointer mentions remain.
Smoke: in a tmp dir, `init` → `status` shows the 4-stage groundwork; write `brief.md`/`flows.md`/a flow file/`features.md` and watch `next` walk `brief → flows → realize → plan/build → review`.

- [ ] **Step 3: Commit (with user ok)** — `docs(adhd): README — flows generation`

---

## Self-review (done at plan-writing time)

- **Spec coverage:** generation model (T1), compressed chains (T2, T7, T8), flow format + parsing (T3, T12), registry (T4), contracts (T5, T13, T14), closure + three-layer analysis (T6, T11), validate guarantees (T9), CLI (T10), arrow-coverage review (T15), concepts map / on-demand prototype / evolve rerouting / verify flow checks / setup (T16), classic coexistence + migration (T1, T17), SKILL/README (T18, T19). Spec's "no Surfaces column" — covered in T9 (validate scoping), T12 (stories append format), T16/T18 (docs).
- **Placeholder scan:** doc-edit tasks (T15, T16, T18) specify exact sections and full replacement text where text changes; remaining steps are mechanical deletions/moves with explicit targets.
- **Type consistency:** `generation(cwd)` returns `'classic'|'flows'`; `parseFlows` items `{name, stories, dependsOn, participants, arrows, branchIssues}` used identically in T5/T9; `contract` returns `{receives, sends, guards}` (T5, T10); `closure` returns `{areas, pulled, soft}` (T6, T10); milestone artifacts `brief.md`/`flows.md`/`features.md` consistent across T2/T7/T8/T11–T13.
