/**
 * PROMOTER MODE's grudges and rivals:
 *
 *  - RIVALRIES: every bout is remembered. Book the same two again and it's a GRUDGE MATCH: more
 *    people come, both corners want more money, the buzz after is bigger, and the Thursday presser
 *    and the weigh-in get personal.
 *  - ZENITH COUNTER-PROGRAMMING: some Saturdays Zenith books a card against yours. Whoever wins the
 *    night on buzz and seats takes fans off the other.
 *  - BROADCAST: after the show, produce the TV package (the booth, the camera, the replay, how long)
 *    and the ratings pay out in cash and buzz.
 *
 * Headless; the screens are ui/sequel/broadcast.ts and the hub / show scenes.
 */
import { Rng } from '../core/rng';
import { clamp } from '../core/format';
import type { Rivalry, SeqRun, SeqBoutResult } from './types';

export type { Rivalry };

// ---------------------------------------------------------------- rivalries

const key = (a: string, b: string) => `${a}|${b}`;
const rivalries = (run: SeqRun): Record<string, Rivalry> => (run.rivalries ??= {});

export function rivalryOf(run: SeqRun, a: string, b: string): Rivalry | null {
  return rivalries(run)[key(a, b)] ?? null;
}

/** They've met before: this one's a grudge match. */
export const isGrudge = (run: SeqRun, a: string, b: string): boolean => !!rivalryOf(run, a, b);

/** After the show: every bout goes in the book. */
export function recordRivalries(run: SeqRun, results: SeqBoutResult[]): string[] {
  const book = rivalries(run);
  const notes: string[] = [];
  for (const r of results) {
    const k = key(r.aId, r.bId);
    const prev = book[k];
    book[k] = { a: r.aId, b: r.bId, meetings: (prev?.meetings ?? 0) + 1, lastWinner: r.winner, lastWeek: run.week, finishes: (prev?.finishes ?? 0) + (r.finish ? 1 : 0) };
    if (prev) notes.push(`GRUDGE MATCH: ${r.aName} and ${r.bName}, meeting number ${book[k].meetings}. ${r.winner === prev.lastWinner ? 'Same result. One of them has a problem.' : 'The result flipped. Book the decider.'}`);
  }
  return notes;
}

/** What a grudge on the card adds to the night (fill, purses, buzz after). */
export function grudgeBoost(run: SeqRun, bouts: { a: string; b: string }[]): { fill: number; purse: number; buzz: number; count: number } {
  const count = bouts.filter((b) => isGrudge(run, b.a, b.b)).length;
  return { fill: Math.min(0.12, count * 0.06), purse: 1 + count * 0.15, buzz: count * 3, count };
}

/** The grudge on the main event, if any (the presser and the weigh-in use it). */
export function mainGrudge(run: SeqRun): Rivalry | null {
  const b = run.card.bouts[0];
  return b ? rivalryOf(run, b.a, b.b) : null;
}

// ---------------------------------------------------------------- Zenith counter-programming

export interface ZenithCard { name: string; headliner: string; star: number }

const ZENITH_NIGHTS = ['ZENITH FIGHT NIGHT', 'ZENITH PRIME', 'ZENITH SATURDAY LIGHTS', 'ZENITH: IMMERSIVE FAN JOURNEY'];
const ZENITH_HEADLINERS = ['Kyle "Synergy" Brandt', 'Nico "The Prince" Sandoval', 'Brock "The Intern" Hale', 'Spadam "The White Beast" Biggs', 'Trent\'s cousin'];

/** Some Saturdays (from week six, more of them as you get louder) Zenith runs a card against yours. */
export function zenithCounter(run: SeqRun): ZenithCard | null {
  if (run.week < 6) return null;
  const r = new Rng((run.seed ^ (run.week * 2246822519)) >>> 0);
  const chance = 0.18 + run.buzz / 260;
  if (!r.chance(chance)) return null;
  return { name: r.pick(ZENITH_NIGHTS), headliner: r.pick(ZENITH_HEADLINERS), star: Math.round(40 + run.week * 0.9 + r.int(0, 15)) };
}

/** The night against Zenith: a fill penalty going in, and a buzz swing coming out (won = you outdrew them). */
export function zenithNight(run: SeqRun, z: ZenithCard, fill: number, cardStar: number): { fillHit: number; won: boolean; buzz: number; line: string } {
  const pull = z.star / 100;
  const fillHit = Math.min(0.18, pull * 0.16);
  const ours = (fill - fillHit) * 60 + cardStar * 0.4 + run.buzz * 0.3;
  const theirs = z.star * 0.9 + 18;
  const won = ours >= theirs;
  return {
    fillHit,
    won,
    buzz: won ? 6 : -4,
    line: won
      ? `YOU WON THE NIGHT: ${z.name} (headlined by ${z.headliner}) drew less than the warehouse. Bleeter is calling it an upset.`
      : `ZENITH WON THE NIGHT: ${z.name} (headlined by ${z.headliner}) took the casuals. The die-hards stayed with you.`,
  };
}

// ---------------------------------------------------------------- broadcast

export type Booth = 'hype' | 'chaos' | 'credible';
export type Camera = 'side' | 'tv' | 'top';
export type Cut = 'highlights' | 'full';

export const BOOTHS: Record<Booth, { name: string; blurb: string }> = {
  hype: { name: 'JUICED BUTLER & BLOW HOGAN', blurb: 'Loud. Everything is the greatest thing they have ever seen. Casuals love it.' },
  chaos: { name: 'SANDWICH CORMIER & BISCUIT', blurb: 'Nobody knows what is happening, including them. It goes viral, sometimes for the right reasons.' },
  credible: { name: 'LON & BRAILLE SONNEN', blurb: 'Serious. Accurate. The hardcore fans and the commission both like it.' },
};
export const CAMERAS: Record<Camera, string> = { side: 'SIDE ON (THE CLASSIC)', tv: 'BROADCAST (CLOSE, PUSHING IN)', top: 'OVERHEAD (THE CHESS VIEW)' };

export interface BroadcastPlan { booth: Booth; camera: Camera; replay: number; cut: Cut }

export interface Ratings { viewers: number; share: number; cash: number; buzz: number; heat: number; lines: string[] }

/** The ratings for a broadcast of the last show, given how it was produced. */
export function rateBroadcast(run: SeqRun, plan: BroadcastPlan): Ratings {
  const show = run.lastShow;
  if (!show) return { viewers: 0, share: 0, cash: 0, buzz: 0, heat: 0, lines: ['No show to broadcast.'] };
  const finishes = show.results.filter((r) => r.finish).length;
  const replay = show.results[plan.replay];
  const grudges = show.results.filter((r) => isGrudge(run, r.aId, r.bId)).length;
  let score = 30 + run.buzz * 0.5 + show.fill * 20 + finishes * 6 + grudges * 5;
  const lines: string[] = [];
  // the replay: a finish is gold, a decision is a nap
  if (replay?.finish) {
    score += 12;
    lines.push(`The replay of ${replay.aName} vs ${replay.bName} (${replay.method}) does numbers.`);
  } else if (replay) {
    score -= 3;
    lines.push(`Replaying a decision. People are making sandwiches.`);
  }
  // the booth has to fit the night
  const heatFx = plan.booth === 'chaos' ? 4 : plan.booth === 'credible' ? -3 : 1;
  if (plan.booth === 'hype') score += finishes ? 8 : 2;
  if (plan.booth === 'chaos') score += run.buzz > 50 ? 10 : 4;
  if (plan.booth === 'credible') score += grudges ? 4 : 6;
  lines.push(`${BOOTHS[plan.booth].name}: ${plan.booth === 'chaos' ? 'one clip, eleven million views, nobody can explain it.' : plan.booth === 'hype' ? 'the greatest broadcast in the history of broadcasts, according to them.' : 'calm, clear, quietly excellent.'}`);
  // the camera: the broadcast package suits the stream, the overhead suits the grapplers
  if (plan.camera === 'tv') score += 5;
  if (plan.camera === 'top') score += show.results.some((r) => r.method === 'SUB') ? 7 : -2;
  // the cut: highlights travel, the full card earns
  const full = plan.cut === 'full';
  score *= full ? 0.92 : 1.05;
  const viewers = Math.round(Math.max(1, score) * 1450 * (full ? 1 : 1.4));
  const cash = Math.round(viewers * (full ? 0.42 : 0.18));
  const buzz = Math.round(clamp((score - 50) / 8, -3, 9));
  lines.push(`${viewers.toLocaleString('en-US')} viewers. ${buzz >= 5 ? 'Bradie is crying.' : buzz >= 1 ? 'Solid.' : 'Bradie says the algorithm is "going through something".'}`);
  return { viewers, share: Math.round(clamp(score, 0, 100)), cash, buzz, heat: heatFx, lines };
}

export const broadcastDone = (run: SeqRun): boolean => run.flags[`broadcast_${run.week}`] === true;

export function airBroadcast(run: SeqRun, plan: BroadcastPlan): Ratings {
  const r = rateBroadcast(run, plan);
  run.flags[`broadcast_${run.week}`] = true;
  run.cash += r.cash;
  run.buzz = clamp(run.buzz + r.buzz, 0, 100);
  run.heat = clamp(run.heat + r.heat, 0, 100);
  return r;
}
