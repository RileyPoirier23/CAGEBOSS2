/**
 * CAGE BOSS II simulation. Everything here is plain data in, plain data out:
 * the UI reads and mutates a SeqRun, and the headless sim can play a whole
 * season without a renderer.
 */
import type { Fighter } from '../core/types';
import { content } from '../core/content';
import { Rng } from '../core/rng';
import { clamp } from '../core/format';
import { overall, presentedGender, isWomensDivision } from '../sim/fighters';
import { generateFighter } from '../sim/generate';
import { createNewGame } from '../sim/newgame';
import { simulateFight } from '../sim/fight';
import { AD_LEVELS, CAMPS, ENDINGS, GIMMICKS, SEASON_PHASES, VENUES, type SeqAdLevel, type SeqCampDef, type SeqGimmick, type SeqPhaseDef, type SeqVenue } from './data';
import { pickEvent } from './events';
import { emptyDesk, ensureDesk } from './desk';
import {
  BUYBACK_BUZZ, BUYBACK_CASH, SEASON_WEEKS, SEQUEL_VERSION,
  type SeqBelt, type SeqBout, type SeqBoutResult, type SeqEnding, type SeqFighter, type SeqRun, type SeqShow, type SeqSkip,
} from './types';

const DIVS = ['light', 'welter', 'middle', 'lightheavy', 'heavy', 'wbantam', 'wfly', 'wstraw'];
const INJURIES = ['Torn meniscus', 'Broken hand', 'Cracked rib', 'Staph infection', 'Bad cut', 'Sprained ankle', 'Separated shoulder'];

function useRng<T>(run: SeqRun, fn: (rng: Rng) => T): T {
  const rng = new Rng(run.rng);
  const out = fn(rng);
  run.rng = rng.state;
  return out;
}

export function overallOf(f: Fighter): number {
  return overall(f.skills);
}

export function seqPurse(f: Fighter): number {
  const ovr = overallOf(f);
  const base = 300 + Math.pow(Math.max(0, ovr - 35), 1.65) * 14;
  return Math.max(300, Math.round(base / 100) * 100);
}

export function opponentStar(f: Fighter): number {
  const followers = Math.log10(Math.max(10, f.social?.followers ?? 1000));
  const streak = Math.max(0, f.streak ?? 0);
  return clamp(Math.round(overallOf(f) * 0.55 + followers * 2.4 + streak * 1.6 - 8), 5, 85);
}

export function fighterStar(f: Fighter): number {
  const followers = Math.log10(Math.max(10, f.social?.followers ?? 1000));
  const marquee = f.marquee ? 12 : 0;
  const streak = Math.max(0, f.streak ?? 0);
  return clamp(Math.round(8 + (overallOf(f) - 35) * 1.25 + followers * 3 + marquee + streak * 1.5), 5, 92);
}

export function signingCost(f: Fighter): number {
  return Math.round((seqPurse(f) * 4 + 1000) / 500) * 500;
}

function activate(f: Fighter): void {
  f.status = 'active';
  f.promotion = 'us';
  f.contract = null;
  f.injuries = [];
  f.medSuspUntil = 0;
  f.legal = 'free';
  f.legalUntil = 0;
  f.hallOfFame = false;
  f.retiredWeek = undefined;
}

function makeSeqFighter(f: Fighter, week: number): SeqFighter {
  activate(f);
  return {
    f,
    morale: clamp(55 + (f.traits.includes('Loyal') ? 10 : 0) - (f.traits.includes('Mercenary') ? 5 : 0), 20, 90),
    star: fighterStar(f),
    purse: seqPurse(f),
    signedWeek: week,
    injuredUntil: 0,
    fights: 0,
  };
}

/** Pick the fighters who followed you out of the old company. */
function buildRoster(worldSeed: number): { roster: SeqFighter[]; freeAgents: Fighter[] } {
  const world = createNewGame({
    seed: worldSeed,
    mode: 'career',
    difficulty: 'normal',
    promotionName: 'The Warehouse',
    presidentName: 'Dane Whyte',
  });
  const all = Object.values(world.fighters);
  const eligible = all.filter((f) => {
    const ovr = overallOf(f);
    return !f.legend && f.age >= 21 && f.age <= 38 && ovr >= 36 && ovr <= 68 && f.status !== 'retired';
  });
  const rng = Rng.fromSeed(worldSeed ^ 0x51ed270b);
  const roster: Fighter[] = [];
  const used = new Set<string>();
  const take = (div: string, n: number) => {
    const pool = eligible.filter((f) => f.division === div && !used.has(f.id));
    pool.sort((a, b) => overallOf(b) - overallOf(a));
    const slice = pool.slice(Math.min(1, Math.max(0, pool.length - 5)), Math.min(pool.length, Math.max(2, 8)));
    rng.shuffle(slice);
    for (const f of slice.slice(0, n)) {
      if (used.has(f.id)) continue;
      used.add(f.id);
      roster.push(f);
    }
  };
  take('light', 2);
  take('welter', 2);
  take('middle', 2);
  take('lightheavy', 1);
  take('heavy', 1);
  take('wbantam', 1);
  take('wfly', 1);
  // One old champion who still answers the phone. He is not in his prime. He is in your corner.
  const legends = all.filter((f) => f.legend && f.age >= 36 && f.age <= 49 && overallOf(f) >= 52 && overallOf(f) <= 78).sort((a, b) => b.starPower - a.starPower);
  if (legends.length) {
    const old = legends[0];
    used.add(old.id);
    roster.push(old);
  }
  while (roster.length < 10) {
    const pool = eligible.filter((f) => !used.has(f.id));
    if (!pool.length) break;
    const f = rng.pick(pool);
    used.add(f.id);
    roster.push(f);
  }
  const free = eligible.filter((f) => !used.has(f.id));
  rng.shuffle(free);
  const freeAgents = free.slice(0, 30);
  for (const f of freeAgents) {
    f.status = 'free-agent';
    f.promotion = null;
    f.contract = null;
    f.injuries = [];
    f.medSuspUntil = 0;
    f.legal = 'free';
  }
  return { roster: roster.map((f) => makeSeqFighter(f, 1)), freeAgents };
}

/** Who you are in PROMOTER MODE: Dane Whyte, unless you named yourself something else. */
export const bossName = (run: SeqRun): string => String(run.flags.boss || 'Dane Whyte');

/** A sandbox run never runs out of Saturdays (and never makes the trophy case). */
export const seasonLength = (run: SeqRun): number => (run.flags.sandbox ? 9999 : SEASON_WEEKS);

/** A sandbox run: no deadline, a bankroll to play with, no achievements. */
export function makeSandbox(run: SeqRun): SeqRun {
  run.flags.sandbox = true;
  run.cash += 1_000_000;
  return run;
}

export function newSequelRun(seed: number): SeqRun {
  const s = Math.abs(Math.floor(seed)) >>> 0;
  const { roster, freeAgents } = buildRoster(s);
  const run: SeqRun = {
    version: SEQUEL_VERSION,
    seed: s,
    rng: Rng.fromSeed(s ^ 0x9e3779b9).state,
    week: 1,
    cash: 65000,
    buzz: 26,
    heat: 8,
    locker: 62,
    venue: 0,
    ad: 0,
    gimmick: 'normal',
    card: { bouts: [] },
    roster,
    freeAgents,
    belts: [],
    history: [],
    lastShow: null,
    lastSkip: null,
    event: null,
    eventResult: null,
    eventLog: [],
    phaseLog: [],
    desk: emptyDesk(1),
    status: 'plan',
    ending: null,
    flags: {},
    stats: {
      shows: 0, wins: 0, losses: 0, draws: 0, finishes: 0, bestGate: 0, signings: 0,
      skips: 0, camps: 0, titleFights: 0, defenses: 0, raids: 0, peakCash: 65000, peakBuzz: 26, peakHeat: 8,
      profitStreak: 0, bestProfitStreak: 0, sellouts: 0,
      deskDocs: 0, deskCatches: 0, deskMisses: 0, deskCites: 0, deskPerfect: 0, deskBribes: 0, deskDelegated: 0,
    },
  };
  ensureCard(run);
  ensureDesk(run);
  return run;
}

export function availableVenues(run: SeqRun): SeqVenue[] {
  return VENUES.filter((v) => v.unlockBuzz <= run.buzz && v.unlockWeek <= run.week);
}

/** A room needs the buzz and the licence. One without the other is a lawsuit. */
export function venueOpen(run: SeqRun, v: SeqVenue): boolean {
  return v.unlockBuzz <= run.buzz && v.unlockWeek <= run.week;
}

export function venueIndex(run: SeqRun): number {
  const avail = VENUES.map((v, i) => ({ v, i })).filter((x) => venueOpen(run, x.v));
  if (!avail.length) return 0;
  if (avail.some((x) => x.i === run.venue)) return run.venue;
  return avail[avail.length - 1].i;
}

export function currentVenue(run: SeqRun): SeqVenue {
  return VENUES[venueIndex(run)] ?? VENUES[0];
}

export function currentGimmick(run: SeqRun): SeqGimmick {
  return GIMMICKS.find((g) => g.id === run.gimmick) ?? GIMMICKS[0];
}

export function currentAd(run: SeqRun): SeqAdLevel {
  return AD_LEVELS[clamp(run.ad, 0, AD_LEVELS.length - 1)] ?? AD_LEVELS[0];
}

// ---------------------------------------------------------------- the long season

/** Which tenth of the season we are in. Weeks 1-10, 11-20, 21-30, 31-40. */
export function currentPhase(run: SeqRun): SeqPhaseDef {
  return SEASON_PHASES.find((p) => run.week >= p.start && run.week <= p.end) ?? SEASON_PHASES[SEASON_PHASES.length - 1];
}

export function phaseDone(run: SeqRun, p: SeqPhaseDef): 'won' | 'missed' | null {
  const v = run.flags[`phase_${p.no}`];
  return v === 'won' || v === 'missed' ? v : null;
}

/** What the phase is asking for right now, in numbers instead of a sentence. */
export function phaseProgress(run: SeqRun, p: SeqPhaseDef): { label: string; have: number; need: number }[] {
  if (p.no === 1) return [{ label: 'BUZZ', have: Math.round(run.buzz), need: 40 }];
  if (p.no === 2) return [
    { label: 'CASH', have: Math.round(run.cash), need: 180000 },
    { label: 'BUZZ', have: Math.round(run.buzz), need: 55 },
  ];
  if (p.no === 3) return [
    { label: 'SELLOUTS', have: run.stats.sellouts, need: 1 },
    { label: 'BEST GATE', have: run.stats.bestGate, need: 200000 },
  ];
  if (p.no === 4) return [
    { label: 'CASH', have: Math.round(run.cash), need: 5000000 },
    { label: 'BUZZ', have: Math.round(run.buzz), need: 85 },
  ];
  return [];
}

export function phaseMet(run: SeqRun, p: SeqPhaseDef): boolean {
  if (p.no === 1) return run.buzz >= 40 && run.cash >= 0 && run.roster.length > 0;
  if (p.no === 2) return run.cash >= 180000 && run.buzz >= 55;
  if (p.no === 3) return run.stats.sellouts >= 1 || run.stats.bestGate >= 200000;
  return run.cash >= 5000000 && run.buzz >= 85;
}

/**
 * Pay the quarterly bonus the first time a quarter closes. A missed quarter is still a
 * quarter: the log remembers, and the ending screen will too.
 */
export function checkPhases(run: SeqRun): string[] {
  const out: string[] = [];
  for (const p of SEASON_PHASES) {
    if (run.week < p.end) continue;
    if (run.flags[`phase_${p.no}`]) continue;
    const won = phaseMet(run, p);
    run.flags[`phase_${p.no}`] = won ? 'won' : 'missed';
    if (won) {
      run.cash += p.rewardCash;
      run.buzz = clamp(run.buzz + p.rewardBuzz, 0, 100);
      run.locker = clamp(run.locker + p.rewardLocker, 0, 100);
      out.push(`QUARTER ${p.no} CLEARED: ${p.name}. ${p.reward}`);
      run.phaseLog.unshift(`Q${p.no} ${p.name}: CLEARED. ${p.reward}`);
    } else {
      out.push(`QUARTER ${p.no} MISSED: ${p.name}. ${p.goal} The bonus stays with Zenith.`);
      run.phaseLog.unshift(`Q${p.no} ${p.name}: MISSED.`);
    }
  }
  return out;
}

/** The cost of keeping the lights on while no show is running. */
export function weeklyBurn(run: SeqRun): number {
  return 1400 + run.roster.length * 180 + run.belts.length * 250;
}

export function beltFor(run: SeqRun, fighterId: string): SeqBelt | undefined {
  return run.belts.find((b) => b.holderId === fighterId);
}

export function championOf(run: SeqRun, division: string): SeqFighter | undefined {
  const b = run.belts.find((x) => x.division === division);
  return b ? run.roster.find((x) => x.f.id === b.holderId) : undefined;
}

export function championBouts(run: SeqRun): number {
  return cardBouts(run).filter((b) => {
    const a = rosterById(run, b.a);
    return !!a && !!beltFor(run, a.f.id);
  }).length;
}

/** A championship bout is worth more than a fight. The belt is the advert. */
export function titleBoost(run: SeqRun): number {
  return championBouts(run) > 0 ? 1.09 + Math.min(0.06, championBouts(run) * 0.02) : 1;
}

/** A fighter whose contract ended somewhere else cannot keep your belt. */
export function pruneBelts(run: SeqRun): void {
  run.belts = run.belts.filter((b) => run.roster.some((x) => x.f.id === b.holderId));
}

export function campById(id: string): SeqCampDef {
  return CAMPS.find((c) => c.id === id) ?? CAMPS[0];
}

/** Only rooms whose buzz gate is already open can be booked. */
export function changeVenue(run: SeqRun, index: number): void {
  const v = VENUES[index];
  if (!v || !venueOpen(run, v)) return;
  run.venue = index;
}

export function changeGimmick(run: SeqRun, id: string): void {
  if (GIMMICKS.some((g) => g.id === id)) run.gimmick = id;
}

export function canPayVenue(run: SeqRun, index: number): boolean {
  const v = VENUES[index];
  return !!v && venueOpen(run, v) && run.cash >= v.rent + v.production;
}

export function availableRoster(run: SeqRun): SeqFighter[] {
  return run.roster.filter((x) => x.injuredUntil <= run.week);
}

export function isInjured(run: SeqRun, x: SeqFighter): boolean {
  return x.injuredUntil > run.week;
}

export function rosterById(run: SeqRun, id: string): SeqFighter | undefined {
  return run.roster.find((x) => x.f.id === id);
}

export function opponentById(run: SeqRun, id: string): Fighter | undefined {
  return run.freeAgents.find((f) => f.id === id);
}

export function cardBouts(run: SeqRun): SeqBout[] {
  return run.card.bouts.filter((b) => !!rosterById(run, b.a) && !!opponentById(run, b.b));
}

/** Men fight men, women fight women: the warehouse has very few rules, and this is one. */
export function fairOpponent(a: Fighter, f: Fighter): boolean {
  return presentedGender(a) === presentedGender(f);
}

function pickOpponent(run: SeqRun, a: SeqFighter, used: Set<string>, rng: Rng): Fighter | null {
  const open = () => run.freeAgents.filter((f) => !used.has(f.id) && fairOpponent(a.f, f));
  let pool = open();
  for (let tries = 0; !pool.length && tries < 3; tries++) {
    spawnFreeAgents(run, 4, rng);
    pool = open();
  }
  if (!pool.length) return null;
  const target = overallOf(a.f);
  const ranked = pool.slice().sort((x, y) => Math.abs(overallOf(x) - target) - Math.abs(overallOf(y) - target));
  const close = ranked.filter((f) => Math.abs(overallOf(f) - target) <= 13);
  return rng.pick(close.length ? close : ranked.slice(0, Math.min(4, ranked.length)));
}

/** Fill empty or invalid card slots. Always aims for two bouts, never more than three. */
export function ensureCard(run: SeqRun): void {
  const healthy = availableRoster(run);
  if (!healthy.length) {
    run.card.bouts = [];
    return;
  }
  const keep: SeqBout[] = [];
  const usedFighters = new Set<string>();
  const usedOpponents = new Set<string>();
  for (const b of run.card.bouts) {
    const a = rosterById(run, b.a);
    const opp = opponentById(run, b.b);
    if (!a || !opp || isInjured(run, a) || usedFighters.has(a.f.id) || usedOpponents.has(opp.id)) continue;
    usedFighters.add(a.f.id);
    usedOpponents.add(opp.id);
    keep.push(b);
  }
  run.card.bouts = keep;
  const target = Math.min(2, healthy.length);
  if (!run.card.bouts.length) {
    const sorted = healthy.slice().sort((x, y) => y.star - x.star);
    for (const a of sorted.slice(0, target)) {
      useRng(run, (rng) => {
        const opp = pickOpponent(run, a, usedOpponents, rng);
        if (!opp) return;
        usedFighters.add(a.f.id);
        usedOpponents.add(opp.id);
        run.card.bouts.push({ a: a.f.id, b: opp.id });
      });
    }
  } else {
    while (run.card.bouts.length < target) {
      const a = healthy.slice().sort((x, y) => y.star - x.star).find((x) => !usedFighters.has(x.f.id));
      if (!a) break;
      const opp = useRng(run, (rng) => pickOpponent(run, a, usedOpponents, rng));
      if (!opp) break;
      usedFighters.add(a.f.id);
      usedOpponents.add(opp.id);
      run.card.bouts.push({ a: a.f.id, b: opp.id });
    }
  }
}

export function cycleFighter(run: SeqRun, slot: number, dir: number): void {
  if (!run.card.bouts[slot]) return;
  const used = new Set(run.card.bouts.filter((_, i) => i !== slot).map((b) => b.a));
  const opts = availableRoster(run).filter((x) => !used.has(x.f.id));
  if (!opts.length) return;
  const cur = run.card.bouts[slot].a;
  let i = opts.findIndex((x) => x.f.id === cur);
  if (i < 0) i = 0;
  i = (i + dir + opts.length) % opts.length;
  run.card.bouts[slot].a = opts[i].f.id;
  const b = run.card.bouts[slot];
  if (b.b === opts[i].f.id) {
    const next = run.freeAgents.find((f) => f.id !== b.b);
    if (next) b.b = next.id;
  }
}

export function cycleOpponent(run: SeqRun, slot: number, dir: number): void {
  if (!run.card.bouts[slot]) return;
  const used = new Set(run.card.bouts.filter((_, i) => i !== slot).map((b) => b.b));
  const me = rosterById(run, run.card.bouts[slot].a);
  const opts = run.freeAgents.filter((f) => !used.has(f.id) && (!me || fairOpponent(me.f, f)));
  if (!opts.length) return;
  const cur = run.card.bouts[slot].b;
  let i = opts.findIndex((f) => f.id === cur);
  if (i < 0) i = 0;
  i = (i + dir + opts.length) % opts.length;
  run.card.bouts[slot].b = opts[i].id;
}

export function addBout(run: SeqRun): boolean {
  if (run.card.bouts.length >= 3) return false;
  const usedF = new Set(run.card.bouts.map((b) => b.a));
  const usedO = new Set(run.card.bouts.map((b) => b.b));
  const a = availableRoster(run).filter((x) => !usedF.has(x.f.id)).sort((x, y) => y.star - x.star)[0];
  if (!a) return false;
  const opp = useRng(run, (rng) => pickOpponent(run, a, usedO, rng));
  if (!opp) return false;
  run.card.bouts.push({ a: a.f.id, b: opp.id });
  return true;
}

export function removeBout(run: SeqRun, slot: number): void {
  if (run.card.bouts.length <= 1) return;
  run.card.bouts.splice(slot, 1);
}

export interface SeqProjection {
  fill: number;
  cardStar: number;
  gate: number;
  stream: number;
  merch: number;
  sponsor: number;
  purses: number;
  insurance: number;
  costs: number;
  revenue: number;
  net: number;
  title: boolean;
}

export function project(run: SeqRun): SeqProjection {
  const v = currentVenue(run);
  const g = currentGimmick(run);
  const ad = currentAd(run);
  const bouts = cardBouts(run);
  const title = championBouts(run) > 0;
  let cardStar = 0;
  for (const b of bouts) {
    const a = rosterById(run, b.a);
    const opp = opponentById(run, b.b);
    if (a) cardStar += a.star;
    if (opp) cardStar += opponentStar(opp);
  }
  cardStar = cardStar / Math.max(1, bouts.length * 2);
  const fill = clamp(0.28 + run.buzz / 240 + cardStar / 280 + ad.fill + g.fill + (bouts.length - 2) * 0.035 + (title ? 0.035 : 0), 0.12, 1.05);
  const gate = Math.round(fill * v.capacity * v.ticket * g.gate * titleBoost(run));
  const stream = Math.round((run.buzz * 22 + cardStar * 13) * v.streamMult * g.stream * (title ? 1.07 : 1));
  const merch = Math.round(160 + run.buzz * 8 + cardStar * 5 + v.capacity / 25 + (title ? 650 : 0));
  const sponsor = Math.round(300 + run.buzz * 7 + (title ? 1200 : 0));
  let purses = 0;
  for (const b of bouts) {
    const a = rosterById(run, b.a);
    const opp = opponentById(run, b.b);
    if (a) purses += a.purse;
    if (opp) purses += Math.round(seqPurse(opp) * 0.6);
  }
  const insurance = run.flags.insurance ? 1200 : 0;
  const costs = v.rent + v.production + g.cost + ad.cost + purses + insurance;
  const revenue = gate + stream + merch + sponsor;
  return { fill, cardStar, gate, stream, merch, sponsor, purses, insurance, costs, revenue, net: revenue - costs, title };
}

export function spawnFreeAgents(run: SeqRun, n: number, rng?: Rng): void {
  const r = rng ?? new Rng(run.rng);
  const c = content();
  for (let i = 0; i < n; i++) {
    const division = r.pick(DIVS);
    const gender = isWomensDivision(division) ? 'W' : 'M';
    // The longer the season runs, the better the names on the free-agent list.
    const roll = r.next();
    const tier: 'prospect' | 'journeyman' | 'gatekeeper' | 'contender' | 'elite' =
      run.week >= 30 ? (roll > 0.88 ? 'elite' : roll > 0.5 ? 'contender' : 'gatekeeper')
        : run.week >= 20 ? (roll > 0.78 ? 'contender' : roll > 0.3 ? 'gatekeeper' : 'journeyman')
          : run.week >= 10 ? (roll > 0.7 ? 'gatekeeper' : roll > 0.25 ? 'journeyman' : 'prospect')
            : (roll > 0.25 ? 'journeyman' : 'prospect');
    const f = generateFighter(r, c.names, {
      division,
      gender,
      tier,
      id: 's2_' + run.week + '_' + i + '_' + r.int(0, 999999).toString(36),
      managers: c.managers.map((m) => m.id),
    });
    f.status = 'free-agent';
    f.promotion = null;
    f.contract = null;
    f.injuries = [];
    f.medSuspUntil = 0;
    f.legal = 'free';
    run.freeAgents.push(f);
  }
  if (!rng) run.rng = r.state;
}

function resultInjury(run: SeqRun, a: SeqFighter, res: ReturnType<typeof simulateFight>, gimmick: SeqGimmick, rng: Rng): string {
  const fromFight = res.injuries.find((x) => x.fighter === a.f.id);
  const finish = res.method === 'KO' || res.method === 'TKO' || res.method === 'SUB';
  const chance = 0.07 + gimmick.injury + (finish ? 0.08 : 0);
  const hurt = fromFight || rng.chance(chance);
  if (!hurt) return '';
  const weeks = fromFight ? Math.max(1, fromFight.weeks) : rng.int(1, 3);
  const name = fromFight?.name ?? rng.pick(INJURIES);
  a.injuredUntil = Math.max(a.injuredUntil, run.week + weeks);
  a.morale = clamp(a.morale - 4, 0, 100);
  return `${a.f.last}: ${name} (${weeks}w)`;
}

export function runShow(run: SeqRun): SeqShow {
  ensureCard(run);
  pruneBelts(run);
  const v = currentVenue(run);
  const g = currentGimmick(run);
  const ad = currentAd(run);
  const proj = project(run);
  const buzzBefore = run.buzz;
  const heatBefore = run.heat;
  const lockerBefore = run.locker;
  const rng = new Rng(run.rng);
  const bouts = cardBouts(run).slice();
  const results: SeqBoutResult[] = [];
  const notes: string[] = [];
  const titleNotes: string[] = [];
  let titleBuzz = 0;
  let titleHeat = 0;

  // The undercard goes first; the main event is slot 0.
  for (let slot = bouts.length - 1; slot >= 0; slot--) {
    const b = bouts[slot];
    const a = rosterById(run, b.a);
    const opp = opponentById(run, b.b);
    if (!a || !opp) continue;
    const judges = rng.sample(content().officials.filter((o) => o.role === 'judge'), 3);
    const referee = rng.pick(content().officials.filter((o) => o.role === 'referee'));
    const res = simulateFight(a.f, opp, {
      rounds: slot === 0 ? 5 : 3,
      judges,
      referee,
      realism: 0.95,
      ticker: content().templates.ticker,
      keepTicker: true,
    }, rng);
    const winner: 'a' | 'b' | 'draw' = res.winner === a.f.id ? 'a' : res.winner === opp.id ? 'b' : 'draw';
    const finish = res.method === 'KO' || res.method === 'TKO' || res.method === 'SUB' || res.method === 'DOC';
    const aStarBefore = a.star;
    const bStarBefore = opponentStar(opp);
    const injury = resultInjury(run, a, res, g, rng);
    const belt = beltFor(run, a.f.id);
    if (belt) run.stats.titleFights++;

    // Your fighter's career moves.
    a.fights++;
    if (winner === 'a') {
      a.f.record.w++;
      a.f.streak = Math.max(0, a.f.streak ?? 0) + 1;
      a.star = clamp(a.star + rng.int(4, 9) + (finish ? 3 : 0), 0, 100);
      a.morale = clamp(a.morale + 5, 0, 100);
      if (finish) a.f.hype = clamp(a.f.hype + 3, 0, 100);
      run.stats.wins++;
      if (finish) run.stats.finishes++;
      if (belt) {
        belt.defenses++;
        run.stats.defenses++;
        a.star = clamp(a.star + 3, 0, 100);
        a.morale = clamp(a.morale + 3, 0, 100);
        titleBuzz += 3;
        titleNotes.push(`TITLE DEFENSE: ${a.f.first} ${a.f.last} retains the ${a.f.division.toUpperCase()} belt (defense ${belt.defenses}).`);
      }
    } else if (winner === 'b') {
      a.f.record.l++;
      a.f.streak = Math.min(0, a.f.streak ?? 0) - 1;
      a.star = clamp(a.star - rng.int(2, 5), 0, 100);
      a.morale = clamp(a.morale - 6, 0, 100);
      if (res.method === 'KO' || res.method === 'TKO') a.f.koLosses++;
      run.stats.losses++;
      if (belt) {
        run.belts = run.belts.filter((x) => x !== belt);
        titleBuzz -= 5;
        titleHeat += 2;
        titleNotes.push(`TITLE CHANGE: ${opp.first} ${opp.last} leaves the building with the ${a.f.division.toUpperCase()} belt. The belt does not have a return address.`);
      }
    } else {
      a.f.record.d++;
      a.star = clamp(a.star + (rng.chance(0.5) ? 1 : -1), 0, 100);
      run.stats.draws++;
      if (belt) titleNotes.push(`TITLE FIGHT: ${a.f.first} ${a.f.last} keeps the ${a.f.division.toUpperCase()} belt on a draw. Nobody is happy, least of all the belt.`);
    }
    // The opponent's record is real too. They will be back next week.
    if (winner === 'b') {
      opp.record.w++;
      opp.streak = Math.max(0, opp.streak ?? 0) + 1;
    } else if (winner === 'a') {
      opp.record.l++;
      opp.streak = Math.min(0, opp.streak ?? 0) - 1;
    } else {
      opp.record.d++;
    }

    results.push({
      slot,
      aId: a.f.id,
      bId: opp.id,
      aName: `${a.f.first} ${a.f.last}`,
      bName: `${opp.first} ${opp.last}`,
      aNick: a.f.nick,
      bNick: opp.nick,
      winner,
      method: res.method,
      round: res.round,
      time: res.time,
      detail: res.detail,
      finish,
      aStarBefore,
      bStarBefore,
      injury,
      replay: res.ticker?.length
        ? { A: structuredClone(a.f), B: structuredClone(opp), rounds: slot === 0 ? 5 : 3, referee: referee.name, ticker: res.ticker }
        : undefined,
    });
    if (injury) notes.push(injury);
  }
  results.sort((x, y) => x.slot - y.slot);

  // A promotion with no belts is a promotion with no history. Crown the fighters who
  // have earned one the only way this business understands: three in a row.
  let crowned = 0;
  for (const x of run.roster.slice().sort((a, b) => b.star - a.star)) {
    if (crowned >= 2) break;
    if (x.f.streak < 3) continue;
    if (run.belts.some((b) => b.division === x.f.division)) continue;
    run.belts.push({ division: x.f.division, holderId: x.f.id, defenses: 0, wonWeek: run.week });
    x.star = clamp(x.star + 5, 0, 100);
    x.morale = clamp(x.morale + 5, 0, 100);
    titleBuzz += 4;
    crowned++;
    titleNotes.push(`NEW BELT: ${x.f.first} ${x.f.last} is the ${x.f.division.toUpperCase()} champion. The belt was purchased online and validated by the crowd.`);
  }

  const wins = results.filter((r) => r.winner === 'a').length;
  const losses = results.filter((r) => r.winner === 'b').length;
  const finishes = results.filter((r) => r.winner === 'a' && r.finish).length;

  let gain = 1 + wins * 3 + finishes + Math.round(g.buzz * 0.6) + ad.buzz - losses + titleBuzz;
  run.buzz = clamp(Math.round(run.buzz * 0.97 + gain), 0, 100);
  run.heat = clamp(run.heat + v.heat + g.heat - 3 + (run.buzz > 60 ? 1 : 0) + titleHeat, 0, 100);
  run.locker = clamp(run.locker + wins * 3 - losses * 2 + g.locker + (crowned ? 2 : 0), 0, 100);

  let raided = false;
  let raidFine = 0;
  if (run.heat >= 100) {
    raided = true;
    raidFine = 15000 + Math.round(Math.max(0, run.cash) * 0.05);
    run.heat = 35;
    run.buzz = clamp(run.buzz + 8, 0, 100);
    run.locker = clamp(run.locker - 7, 0, 100);
    notes.push(`RAID: $${raidFine.toLocaleString('en-US')} in fines and "processing fees".`);
  }

  const nightNet = proj.net - raidFine;
  run.cash += nightNet;
  run.stats.shows++;
  run.stats.bestGate = Math.max(run.stats.bestGate, proj.gate);
  if (proj.fill >= 0.995) run.stats.sellouts++;
  if (raided) run.stats.raids++;
  if (nightNet > 0) {
    run.stats.profitStreak++;
    run.stats.bestProfitStreak = Math.max(run.stats.bestProfitStreak, run.stats.profitStreak);
  } else {
    run.stats.profitStreak = 0;
  }
  run.stats.peakCash = Math.max(run.stats.peakCash, Math.round(run.cash));
  run.stats.peakBuzz = Math.max(run.stats.peakBuzz, Math.round(run.buzz));
  run.stats.peakHeat = Math.max(run.stats.peakHeat, Math.round(run.heat));
  notes.push(...titleNotes);
  const phaseNotes = checkPhases(run);
  if (phaseNotes.length) notes.push(...phaseNotes);
  if (run.cash > run.stats.peakCash) run.stats.peakCash = Math.round(run.cash);

  const main = results.find((r) => r.slot === 0) ?? results[0];
  let headline: string;
  let body: string;
  if (raided) {
    headline = 'COMMISSION SHUTS DOWN WAREHOUSE SHOW';
    body = `${v.name.toUpperCase()} - Week ${run.week}. Inspectors entered during the main event and found several things they describe as "not to code". ` +
      `The promotion paid $${raidFine.toLocaleString('en-US')} and promises to do better. The footage is already worth more than the fine.`;
  } else if (!main) {
    headline = 'A SHOW WITH NO FIGHTS';
    body = 'The cage was up. The lights were on. Nobody fought. The crowd still bought shirts.';
  } else {
    const winnerName = main.winner === 'a' ? main.aName : main.winner === 'b' ? main.bName : null;
    const loserName = main.winner === 'a' ? main.bName : main.winner === 'b' ? main.aName : null;
    if (winnerName && loserName) {
      headline = main.finish
        ? `${winnerName.toUpperCase()} FINISHES ${loserName.toUpperCase()} IN ROUND ${main.round}`
        : `${winnerName.toUpperCase()} OUTPOINTS ${loserName.toUpperCase()} IN A WAR`;
      if (main.winner === 'a') headline += '; WAREHOUSE ERUPTS';
    } else {
      headline = `${main.aName.toUpperCase()} AND ${main.bName.toUpperCase()} FIGHT TO A DRAW; NOBODY IS HAPPY`;
    }
    body = `${v.name.toUpperCase()} - Week ${run.week}. ${g.name}. ` +
      `A crowd of ${Math.round(proj.fill * v.capacity).toLocaleString('en-US')} saw ${results.length} fight${results.length === 1 ? '' : 's'}, ` +
      `${finishes} finish${finishes === 1 ? '' : 'es'} and at least one thing they will describe to a lawyer. ` +
      (main.detail ? `${main.detail} ` : '') +
      `The promotion clears ${proj.net >= 0 ? '$' : '-$'}${Math.abs(Math.round(proj.net)).toLocaleString('en-US')} on the night.`;
  }

  const show: SeqShow = {
    week: run.week,
    venue: venueIndex(run),
    gimmick: g.id,
    ad: run.ad,
    results,
    gate: proj.gate,
    stream: proj.stream,
    merch: proj.merch,
    sponsor: proj.sponsor,
    purses: proj.purses,
    costs: proj.costs,
    net: proj.net - raidFine,
    fill: proj.fill,
    buzzBefore,
    buzzAfter: run.buzz,
    heatBefore,
    heatAfter: run.heat,
    lockerBefore,
    lockerAfter: run.locker,
    headline,
    body,
    notes,
    raided,
  };
  run.lastShow = show;
  // the tapes stay with this week's show; the archive keeps the results
  run.history.push({ ...show, results: show.results.map(({ replay: _tape, ...r }) => r) });
  if (run.history.length > SEASON_WEEKS) run.history.shift();
  run.eventResult = null;
  run.status = 'results';

  if (run.cash < 0) finishRun(run, 'broke');
  else if (!run.roster.length) finishRun(run, 'empty');
  else if (run.week >= seasonLength(run)) finishRun(run);

  // finishRun() always leaves an ending behind; a live run has none yet.
  if (run.ending) run.event = null;
  else run.event = pickEvent(run, rng);
  run.rng = rng.state;
  return show;
}

/** How many matching-rights clauses you have signed away. Each one moves the number. */
export function zenithClauses(run: SeqRun): number {
  return Math.max(0, Number(run.flags.zenith_clauses ?? 0) || 0);
}

/** What Zenith actually wants now. The folder in the drawer says $7,000,000. */
export function buybackCash(run: SeqRun): number {
  return BUYBACK_CASH + zenithClauses(run) * 500_000;
}

/** And how much noise they need to hear before they take the call. */
export function buybackBuzz(run: SeqRun): number {
  return Math.min(100, BUYBACK_BUZZ + zenithClauses(run) * 2);
}

export function endingFor(run: SeqRun): SeqEnding {
  if (run.cash < 0) return ENDINGS.broke;
  if (!run.roster.length) return ENDINGS.empty;
  if (run.heat >= 92) return ENDINGS.raid;
  if (run.cash >= buybackCash(run) && run.buzz >= buybackBuzz(run)) return ENDINGS.buyback;
  if (run.buzz >= 85) return ENDINGS.cult;
  if (run.cash >= 2500000) return ENDINGS.partner;
  return ENDINGS.survivor;
}

/** Can the player stop early and take the company back? The lawyers are in on Fridays. */
export function canBuyBackNow(run: SeqRun): boolean {
  return run.status === 'plan' && run.week >= 34 && run.cash >= buybackCash(run) && run.buzz >= buybackBuzz(run);
}

export function buyBackNow(run: SeqRun): void {
  if (!canBuyBackNow(run)) return;
  finishRun(run, 'buyback');
}

export function finishRun(run: SeqRun, id?: string): void {
  if (run.status !== 'ended') checkPhases(run);
  run.status = 'ended';
  run.ending = id ?? endingFor(run).id;
  run.event = null;
}

export function nextWeek(run: SeqRun): void {
  if (run.status === 'ended') return;
  run.event = null;
  run.eventResult = null;
  run.week++;
  if (run.cash < 0) {
    finishRun(run, 'broke');
    return;
  }
  if (!run.roster.length) {
    finishRun(run, 'empty');
    return;
  }
  if (run.week > seasonLength(run)) {
    finishRun(run);
    return;
  }
  run.heat = Math.max(0, run.heat - 1);
  run.status = 'plan';
  pruneBelts(run);
  if (run.week % 2 === 0 && run.freeAgents.length < 18) spawnFreeAgents(run, run.week >= 20 ? 3 : 2);
  if (run.freeAgents.length > 34) run.freeAgents = run.freeAgents.slice(0, 34);
  ensureCard(run);
  ensureDesk(run);
}

export function beginNextWeek(run: SeqRun): void {
  if (run.event) return;
  nextWeek(run);
}

// ---------------------------------------------------------------- time skips & camps

export interface SeqSkipResult {
  ok: boolean;
  error?: string;
  skip: SeqSkip | null;
  notes: string[];
}

export function canSkip(run: SeqRun): boolean {
  return run.status === 'plan' && run.week < seasonLength(run);
}

/**
 * Take one to four weeks off. The calendar moves, the rent does not stop, and the
 * crowd forgets you a little. In exchange: bodies heal, injuries close, and a fighter
 * can spend the time in a camp that makes him permanently better.
 */
export function skipWeeks(run: SeqRun, weeks: number, campId = 'rest', fighterId?: string): SeqSkipResult {
  if (!canSkip(run)) return { ok: false, error: 'There is no week left to skip. The next bell is the last one.', skip: null, notes: [] };
  const span = Math.max(1, Math.min(4, Math.floor(weeks), seasonLength(run) - run.week));
  if (span <= 0) return { ok: false, error: 'The calendar is full. Run the show.', skip: null, notes: [] };
  const camp = campById(campId);
  const target = camp.id === 'rest' ? undefined : run.roster.find((x) => x.f.id === fighterId);
  if (camp.id !== 'rest' && !target) return { ok: false, error: 'Pick a fighter for the camp.', skip: null, notes: [] };
  const cost = weeklyBurn(run) * span + camp.cost * span;
  if (run.cash < cost) {
    return { ok: false, error: `The off weeks cost $${cost.toLocaleString('en-US')}. You have $${Math.max(0, Math.round(run.cash)).toLocaleString('en-US')}.`, skip: null, notes: [] };
  }

  const cashBefore = run.cash;
  const buzzBefore = run.buzz;
  const heatBefore = run.heat;
  const lockerBefore = run.locker;
  const fromWeek = run.week;
  const notes: string[] = [];
  run.cash -= cost;
  run.stats.skips += span;
  if (camp.id !== 'rest') run.stats.camps++;

  for (let i = 0; i < span; i++) {
    run.week++;
    run.buzz = clamp(run.buzz - 4, 0, 100);
    run.heat = clamp(run.heat - 3, 0, 100);
    run.locker = clamp(run.locker - 1, 0, 100);
    if (run.week % 2 === 0 && run.freeAgents.length < 18) spawnFreeAgents(run, run.week >= 20 ? 3 : 2);
    if (run.freeAgents.length > 34) run.freeAgents = run.freeAgents.slice(0, 34);
  }
  run.buzz = clamp(run.buzz + camp.buzz * span, 0, 100);
  run.heat = clamp(run.heat + camp.heat * span, 0, 100);

  if (camp.id === 'rest') {
    run.locker = clamp(run.locker + Math.round(camp.morale * 0.6 * span), 0, 100);
    for (const x of run.roster) {
      x.morale = clamp(x.morale + camp.morale * span, 0, 100);
      if (x.injuredUntil > run.week) x.injuredUntil = Math.max(run.week + 0, x.injuredUntil - camp.heal * span);
    }
    notes.push(`The whole locker room spent ${span} week${span === 1 ? '' : 's'} resting. Morale and bruises improved.`);
  } else if (target) {
    for (const [k, v] of Object.entries(camp.gains) as [keyof SeqFighter['f']['skills'], number][]) {
      target.f.skills[k] = clamp(target.f.skills[k] + Math.max(1, Math.round(v * span)), 10, 99);
    }
    target.star = clamp(target.star + Math.round(camp.star * span), 0, 100);
    target.morale = clamp(target.morale + camp.morale * span, 0, 100);
    if (camp.heal && target.injuredUntil > run.week) {
      target.injuredUntil = Math.max(run.week + 1, target.injuredUntil - camp.heal * span);
    }
    notes.push(`${target.f.first} ${target.f.last} spent ${span} week${span === 1 ? '' : 's'} at ${camp.name.toLowerCase()}. He came back different, or at least tired in a new way.`);
  }
  if (run.week >= seasonLength(run)) notes.push('This is the last week on the calendar. There is one show left, and it is the one that matters.');

  const phaseNotes = checkPhases(run);
  notes.push(...phaseNotes);
  pruneBelts(run);
  run.status = 'plan';
  run.event = null;
  run.eventResult = null;
  run.lastSkip = {
    weeks: span,
    fromWeek,
    toWeek: run.week,
    cost,
    camp: camp.id,
    campName: camp.name,
    fighterId: target?.f.id ?? null,
    fighterName: target ? `${target.f.first} ${target.f.last}` : null,
    notes,
    cashBefore,
    cashAfter: run.cash,
    buzzBefore,
    buzzAfter: run.buzz,
    heatBefore,
    heatAfter: run.heat,
    lockerBefore,
    lockerAfter: run.locker,
  };
  run.stats.peakCash = Math.max(run.stats.peakCash, Math.round(run.cash));
  run.stats.peakBuzz = Math.max(run.stats.peakBuzz, Math.round(run.buzz));
  run.stats.peakHeat = Math.max(run.stats.peakHeat, Math.round(run.heat));
  ensureCard(run);
  ensureDesk(run);
  const out = run.lastSkip;
  if (run.cash < 0) finishRun(run, 'broke');
  return { ok: true, skip: out, notes };
}

export function signFreeAgent(run: SeqRun, id: string): string {
  const f = run.freeAgents.find((x) => x.id === id);
  if (!f) return 'He is gone. Somebody else got him.';
  if (run.roster.length >= 14) return 'The locker room is full. Somebody has to go first.';
  const cost = signingCost(f);
  if (run.cash < cost) return `You need $${cost.toLocaleString('en-US')}. You have $${Math.max(0, Math.round(run.cash)).toLocaleString('en-US')}.`;
  run.cash -= cost;
  run.freeAgents = run.freeAgents.filter((x) => x.id !== id);
  run.roster.push(makeSeqFighter(f, run.week));
  run.stats.signings++;
  run.card.bouts = run.card.bouts.filter((b) => b.b !== id);
  ensureCard(run);
  return `${f.first} ${f.last} signs for a $${cost.toLocaleString('en-US')} bonus and a locker with his name on it.`;
}

export function payOffCommission(run: SeqRun): string {
  const cost = 8000;
  if (run.cash < cost) return 'You do not have $8,000. The commission is not interested in promises.';
  if (run.heat <= 12) return 'There is nothing to pay off. Enjoy it while it lasts.';
  run.cash -= cost;
  run.heat = clamp(run.heat - 25, 0, 100);
  return 'The envelope changes hands in a parking garage. The fire exits are suddenly up to code.';
}

export function bestScore(run: SeqRun): number {
  return Math.round(run.cash / 100) + Math.round(run.buzz) * 120 + run.stats.wins * 60 +
    run.stats.defenses * 400 + run.belts.length * 250 - Math.round(run.heat) * 20;
}
