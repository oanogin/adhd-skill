// scripts/context-watch.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadState, STAGE_EFFORT, EFFORT_WEIGHT } from './adhd-state.mjs';

// Heuristic tuned by feel, not a measured constant — roughly three high-effort
// stages in one session. Adjust if sessions consistently feel too short or long.
export const THRESHOLD = 8;

function weight(stage) {
  return EFFORT_WEIGHT[STAGE_EFFORT[stage]] ?? 2;
}

export function pressure(cwd = process.cwd(), { next } = {}) {
  const state = loadState(cwd);
  const run = state?.session?.stagesRun ?? [];
  const score = run.reduce((sum, s) => sum + weight(s), 0);
  const projected = next ? score + weight(next) : score;
  const advise = projected >= THRESHOLD;
  let reason;
  if (!advise) {
    reason = `Context score ${score}/${THRESHOLD} after ${run.length} stage(s). OK to continue.`;
  } else if (score >= THRESHOLD) {
    reason = `Context score ${score} >= ${THRESHOLD} after ${run.length} stage(s). ` +
      'Start a fresh session: run handoff-prompt.mjs and hand the prompt to the user.';
  } else {
    reason = `Running "${next}" next would push the context score to ${projected} >= ${THRESHOLD}. ` +
      'Start a fresh session before that stage.';
  }
  return { score, projected, threshold: THRESHOLD, stagesThisSession: run.length, advise, reason };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--next');
  const next = idx >= 0 ? args[idx + 1] : undefined;
  const result = pressure(process.cwd(), { next });
  console.log(JSON.stringify(result, null, 2));
}
