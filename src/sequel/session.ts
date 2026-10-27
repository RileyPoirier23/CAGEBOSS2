/** The sequel's save file: one run, plus the best one you have ever had. */
import { loadJSON, storeJSON } from '../core/save';
import { endingFor, bestScore } from './model';
import { emptyDesk, ensureDesk } from './desk';
import { SEQUEL_VERSION, type SeqBest, type SeqRun } from './types';

export const RUN_KEY = 'cageboss2.run';
export const BEST_KEY = 'cageboss2.best';

let current: SeqRun | null | undefined;

function valid(run: unknown): run is SeqRun {
  if (!run || typeof run !== 'object') return false;
  const r = run as Partial<SeqRun>;
  return r.version === SEQUEL_VERSION && typeof r.week === 'number' && Array.isArray(r.roster) && Array.isArray(r.freeAgents);
}

/** Runs saved before the forty-week season still load; they just get the new furniture. */
export function migrateRun(run: SeqRun): SeqRun {
  run.belts ??= [];
  run.lastSkip ??= null;
  run.phaseLog ??= [];
  const s = (run.stats ?? {}) as Partial<SeqRun['stats']>;
  run.stats = {
    shows: s.shows ?? 0,
    wins: s.wins ?? 0,
    losses: s.losses ?? 0,
    draws: s.draws ?? 0,
    finishes: s.finishes ?? 0,
    bestGate: s.bestGate ?? 0,
    signings: s.signings ?? 0,
    skips: s.skips ?? 0,
    camps: s.camps ?? 0,
    titleFights: s.titleFights ?? 0,
    defenses: s.defenses ?? 0,
    raids: s.raids ?? 0,
    peakCash: s.peakCash ?? Math.round(run.cash),
    peakBuzz: s.peakBuzz ?? Math.round(run.buzz),
    peakHeat: s.peakHeat ?? Math.round(run.heat),
    profitStreak: s.profitStreak ?? 0,
    bestProfitStreak: s.bestProfitStreak ?? 0,
    sellouts: s.sellouts ?? 0,
    deskDocs: s.deskDocs ?? 0,
    deskCatches: s.deskCatches ?? 0,
    deskMisses: s.deskMisses ?? 0,
    deskCites: s.deskCites ?? 0,
    deskPerfect: s.deskPerfect ?? 0,
    deskBribes: s.deskBribes ?? 0,
    deskDelegated: s.deskDelegated ?? 0,
  };
  run.eventLog ??= [];
  run.flags ??= {};
  run.desk ??= emptyDesk(run.week);
  // Saves made before the desk existed still deserve this week's paperwork.
  if (!run.desk.docs.length) ensureDesk(run);
  return run;
}

export function readRun(): SeqRun | null {
  if (current !== undefined) return current;
  const raw = loadJSON<unknown>(RUN_KEY, null);
  current = valid(raw) ? migrateRun(raw) : null;
  return current;
}

export function hasRun(): boolean {
  return !!readRun();
}

export function writeRun(run: SeqRun): void {
  current = run;
  storeJSON(RUN_KEY, run);
  if (run.status === 'ended') saveBest(run);
}

export function clearRun(): void {
  current = null;
  storeJSON(RUN_KEY, null);
}

export function loadBest(): SeqBest | null {
  return loadJSON<SeqBest | null>(BEST_KEY, null);
}

export function saveBest(run: SeqRun): SeqBest | null {
  const score = bestScore(run);
  const prev = loadBest();
  if (prev && prev.score >= score) return prev;
  const best: SeqBest = {
    score,
    ending: run.ending ?? endingFor(run).id,
    week: run.week,
    cash: Math.round(run.cash),
    buzz: Math.round(run.buzz),
    heat: Math.round(run.heat),
    wins: run.stats.wins,
    losses: run.stats.losses,
    seed: run.seed,
    promotion: 'The Warehouse',
  };
  storeJSON(BEST_KEY, best);
  return best;
}
