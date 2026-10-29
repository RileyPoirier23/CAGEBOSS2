/**
 * Fighters made in the creator (cageboss2.custom, kept outside any save). Quick Fight lists them
 * under CUSTOM; Promoter Mode puts them at the top of the free agents, ready to sign.
 */
import { loadJSON, storeJSON } from '../core/save';
import type { Fighter } from '../core/types';
import type { SeqRun } from './types';

export const CUSTOM_KEY = 'cageboss2.custom';
export const loadCustomFighters = (): Fighter[] => loadJSON<Fighter[]>(CUSTOM_KEY, []);
export const storeCustomFighters = (list: Fighter[]): void => storeJSON(CUSTOM_KEY, list);

/** Is this one of yours? */
export const isCustom = (run: SeqRun, id: string): boolean => run.flags[`custom_${id}`] === true;

/**
 * Your creations walk in as free agents (once each, and never again after you have signed or
 * released them): newest at the top of the list. Returns how many came in.
 */
export function offerCustomFighters(run: SeqRun, list: Fighter[]): number {
  const here = new Set([...run.roster.map((x) => x.f.id), ...run.freeAgents.map((f) => f.id)]);
  let n = 0;
  for (const f of [...list].reverse()) {
    if (here.has(f.id) || run.flags[`custom_seen_${f.id}`]) continue;
    run.flags[`custom_seen_${f.id}`] = true;
    run.flags[`custom_${f.id}`] = true;
    run.freeAgents.unshift(JSON.parse(JSON.stringify(f)) as Fighter);
    n++;
  }
  return n;
}
