/**
 * Headless CAGE BOSS II simulator: play complete 40-week runs with a few
 * simple policies and print what happened. Useful for balancing the buyback
 * target without clicking through forty Saturdays.
 *
 *   npm run sequel-sim
 *   npm run sequel-sim -- --seeds 20 --seed 100 --policy balanced
 *   npm run sequel-sim -- --policy all --quiet
 */
import { loadContent } from './loadContent';
import {
  beginNextWeek, cardBouts, changeGimmick, changeVenue, currentVenue,
  ensureCard, newSequelRun, project, removeBout, runShow,
} from '../src/sequel/model';
import { resolveEvent } from '../src/sequel/events';
import { AD_LEVELS, GIMMICKS, VENUES } from '../src/sequel/data';
import { SEASON_WEEKS, type SeqRun } from '../src/sequel/types';

const argv = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const flagOn = (k: string) => argv.includes('--' + k);

const seed0 = Number(arg('seed', '1'));
const seeds = Number(arg('seeds', '8'));
const policyArg = arg('policy', 'balanced');
const quiet = flagOn('quiet');

loadContent();

type Policy = 'cheap' | 'balanced' | 'greedy';

/** Book the week: income policy, then pick a room the bank account can survive. */
function planWeek(run: SeqRun, policy: Policy): void {
  // one fight is cheap, three sells; the policies disagree about the math
  const wanted = policy === 'cheap' ? 1 : policy === 'greedy' ? 3 : 2;
  while (cardBouts(run).length > wanted) removeBout(run, cardBouts(run).length - 1);
  ensureCard(run);

  const gimmick = policy === 'greedy' ? 'barbed' : policy === 'balanced' ? 'normal' : 'normal';
  changeGimmick(run, GIMMICKS.some((g) => g.id === gimmick) ? gimmick : 'normal');

  const ad = policy === 'greedy' ? 3 : policy === 'balanced' ? 1 : 0;
  run.ad = Math.min(ad, AD_LEVELS.length - 1);

  // A room is a calculation, not a personality test. BALANCED looks for the
  // best projected night; CHEAP takes the smallest door; GREEDY takes the biggest.
  const open = VENUES.map((v, i) => ({ v, i }))
    .filter((x) => x.v.unlockBuzz <= run.buzz && x.v.unlockWeek <= run.week && run.cash >= x.v.rent + x.v.production);
  if (open.length) {
    if (policy === 'cheap') {
      changeVenue(run, open[0].i);
    } else if (policy === 'greedy') {
      changeVenue(run, open[open.length - 1].i);
    } else {
      let best = open[0].i;
      let bestNet = -Infinity;
      for (const x of open) {
        changeVenue(run, x.i);
        const net = project(run).net;
        if (net > bestNet) {
          bestNet = net;
          best = x.i;
        }
      }
      changeVenue(run, best);
    }
  }

  // do not walk into the show with a projection that empties the account
  const p = project(run);
  if (run.cash + p.net < 0 && currentVenue(run).id !== 'warehouse') changeVenue(run, 0);
}

function play(run: SeqRun, policy: Policy): SeqRun {
  let guard = 0;
  while (run.status !== 'ended' && guard++ < 160) {
    if (run.status === 'plan') {
      planWeek(run, policy);
      runShow(run);
    } else if (run.status === 'results') {
      if (run.event) run.status = 'event';
      else beginNextWeek(run);
    } else if (run.status === 'event') {
      if (run.event) resolveEvent(run, 0);
      else beginNextWeek(run);
    } else {
      break;
    }
  }
  return run;
}

const policies: Policy[] = policyArg === 'all' ? ['cheap', 'balanced', 'greedy'] : [policyArg as Policy];
for (const p of policies) if (!['cheap', 'balanced', 'greedy'].includes(p)) throw new Error(`Unknown policy "${p}" (cheap, balanced, greedy, all)`);

const money = (n: number) => {
  const a = Math.abs(n);
  const s = a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a >= 1e3 ? (a / 1e3).toFixed(0) + 'K' : a.toFixed(0);
  return (n < 0 ? '-$' : '$') + s;
};
const pad = (s: string | number, n: number) => String(s).padStart(n);

const rows: { policy: Policy; seed: number; run: SeqRun }[] = [];
for (const policy of policies) {
  for (let s = 0; s < seeds; s++) {
    const seed = seed0 + s;
    rows.push({ policy, seed, run: play(newSequelRun(seed), policy) });
  }
}

if (!quiet) {
  console.log('\n  POLICY    SEED  ENDING        WEEK      CASH   BUZZ  HEAT  RECORD   GATE');
  for (const { policy, seed, run } of rows) {
    const w = run.stats.wins, l = run.stats.losses;
    console.log(
      `  ${policy.padEnd(9)} ${pad(seed, 4)}  ${(run.ending ?? 'running').padEnd(12)} ${pad(Math.min(run.week, SEASON_WEEKS), 4)}  ${pad(money(run.cash), 9)}  ${pad(Math.round(run.buzz), 4)}  ${pad(Math.round(run.heat), 4)}  ${pad(`${w}-${l}`, 7)}  ${pad(money(run.stats.bestGate), 6)}`,
    );
  }
}

for (const policy of policies) {
  const set = rows.filter((x) => x.policy === policy);
  const endings: Record<string, number> = {};
  for (const x of set) endings[x.run.ending ?? 'running'] = (endings[x.run.ending ?? 'running'] ?? 0) + 1;
  const avgCash = set.reduce((a, x) => a + x.run.cash, 0) / set.length;
  const avgBuzz = set.reduce((a, x) => a + x.run.buzz, 0) / set.length;
  const avgWins = set.reduce((a, x) => a + x.run.stats.wins, 0) / set.length;
  console.log(`\n  ${policy.toUpperCase()}: avg cash ${money(avgCash)}, avg buzz ${avgBuzz.toFixed(1)}, avg wins ${avgWins.toFixed(1)}`);
  console.log('  ' + Object.entries(endings).map(([k, v]) => `${k} x${v}`).join(', '));
}
