/**
 * After Tales of Legacy: the people from the story walk into Promoter Mode as free agents (once
 * each), and they remember. Han, Mateo, Tyler, Spadam, and Gordo "1ton" Fuente, who knows
 * exactly what he did. Signing one plays a short scene in the office.
 */
import type { Fighter } from '../core/types';
import { buildHan, buildMateoGrown, buildOneTon, buildOpponent, newStorySave } from './story';
import type { SeqRun } from './types';

export interface LegacyFA { key: string; build: () => Fighter; who: string; says: string[]; reply: string }

const fresh = () => newStorySave(2026);

export const LEGACY_FAS: LegacyFA[] = [
  { key: 'han', build: () => buildHan(fresh()), who: 'HAN TIBULAR', reply: 'Bottom of page three. Mind the soup stain.',
    says: ['Uncle Ray said find a promoter who answers the phone.', 'You answered. Twice. At four in the morning.', 'Where do I sign?'] },
  { key: 'mateo', build: () => buildMateoGrown(fresh()), who: 'MATEO VARGA', reply: 'You can mop your own locker.',
    says: ['I\'m not here for the money.', 'I\'m here because somebody has to keep the bucket in a corner where it belongs.', 'Also the money.'] },
  { key: 'tyler', build: () => buildOpponent(fresh(), 'tyler'), who: 'TYLER VANCE', reply: 'Tell your father it isn\'t a tax thing.',
    says: ['My father wanted me to tell you this is a tax thing.', 'It isn\'t a tax thing. I just want to fight for someone who feeds people.'] },
  { key: 'spadam', build: () => buildOpponent(fresh(), 'spadam'), who: 'SPADAM BIGGS', reply: 'No referees on the payroll. That\'s the only rule.',
    says: ['The bag doesn\'t care who you were. Ray told me that.', 'I\'d like to find out who I am now. No Daniel this time.'] },
  { key: 'oneton', build: () => buildOneTon(fresh(), true), who: 'GORDO "1TON" FUENTE', reply: 'Second chances are in the back row. Sit.',
    says: ['I know what I did.', 'I am not asking you to forget it. I am asking for the question one more time.', 'When are you going to put a Mexican fighter in the main event?'] },
];

const idOf = (fa: LegacyFA) => `legacy_${fa.key}`;

/** Is this one from the story? */
export const legacyFAOf = (run: SeqRun, id: string): LegacyFA | undefined => LEGACY_FAS.find((fa) => run.flags[`legacy_fa_${id}`] === fa.key);

/** After a finished story, they walk in (once each, never again once signed or gone). Returns how many came. */
export function offerLegacyFighters(run: SeqRun, finished: boolean): number {
  if (!finished) return 0;
  let n = 0;
  for (const fa of LEGACY_FAS) {
    const f = { ...fa.build(), id: idOf(fa) };
    if (run.flags[`legacy_seen_${fa.key}`] || run.roster.some((x) => x.f.id === f.id) || run.freeAgents.some((x) => x.id === f.id)) continue;
    run.flags[`legacy_seen_${fa.key}`] = true;
    run.flags[`legacy_fa_${f.id}`] = fa.key;
    run.freeAgents.unshift(f);
    n++;
  }
  return n;
}
