/**
 * Sparring at Ray's: two days, one hard round in the gym ring with Uncle Ray refereeing and
 * whoever is around to get hit. Play it (the round itself grades you) or sim it (a C).
 * Partners are the regulars: Tyler Vance (game one's rival, who mops here now), Zac Buna
 * (he runs the Tuesday class), Mateo, Han.
 */
import type { Game } from '../app';
import type { Fighter, FightResult } from '../../core/types';
import { openLiveFight } from '../livefight';
import { tylerFighter, bossFighter } from '../../sim/cast';
import { SIM_SCORE, movesOf, buildOneTon, cornerFighter, cornerKey, gradeFor, sparSession, buildMateoGrown, buildHan } from '../../sequel/story';
import type { StorySave } from '../../sequel/types';
import { storyVenue } from './venues';
import { openWindow } from '../widgets';
import { text, button } from '../kit';
import { II } from '../theme';
import { maybeLesson2 } from './tutorial2';
import { storyBout } from '../scenes/sequelstory';

interface Partner { id: string; name: string; line: string; make: () => Fighter | null }

function partners(save: StorySave, who: 'oneton' | 'corner'): Partner[] {
  const list: Partner[] = [
    { id: 'tyler', name: 'TYLER "TRUST FUND" VANCE', line: 'He mops here now. He also still has a left hook his dad paid for.', make: () => tylerFighter() },
    { id: 'zac', name: 'ZAC "THE ATTACKER" BUNA', line: 'Tuesday class. Brings his own mat. Will take you down and apologise.', make: () => bossFighter('zac') },
  ];
  if (who === 'oneton') list.unshift({ id: 'mateo', name: 'MATEO VARGA', line: 'Nineteen and fast. Ray says "no hard shots". Nobody listens to Ray.', make: () => { const f = buildMateoGrown(save); f.division = 'welter'; return f; } });
  else if (cornerKey(save) === 'mateo' && !save.flags.hanInjured) list.unshift({ id: 'han', name: 'HAN TIBULAR', line: 'The champion. He\'ll take it easy on you. He won\'t.', make: () => buildHan(save) });
  else if (cornerKey(save) === 'han') list.unshift({ id: 'oneton', name: '1TON MORALES', line: 'He wants rounds with the champion. He wants them a little too much.', make: () => buildOneTon(save) });
  return list;
}

/** How the round went, as a percentage: the share of the shots, and who was standing better at the end. */
function sparScore(r: FightResult, playerId: string): number {
  const [a, b] = r.stats.strikes;
  const share = a + b > 0 ? a / (a + b) : 0.5;
  const pct = 28 + share * 62 + (r.winner === playerId ? 10 : r.winner ? -8 : 0);
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export function openSpar(g: Game, save: StorySave, who: 'oneton' | 'corner', done: (msg: string | null) => void): void {
  const me = who === 'oneton' ? buildOneTon(save) : cornerFighter(save);
  const ps = partners(save, who);
  const win = openWindow(g, `SPARRING AT RAY'S  /  ${me.first.toUpperCase()}`, 380, 196);
  maybeLesson2(g, 'spar');
  const b = win.body;
  b.addChild(text('Two days. One hard round in the gym ring, Uncle Ray refereeing. Every physical track gets the work, graded on the round.', 6, 2, { width: 366, small: true, color: II.bone, maxLines: 3 }));
  ps.slice(0, 3).forEach((p, i) => {
    const y = 26 + i * 46;
    b.addChild(text(p.name, 6, y, { small: true, color: II.gold }));
    b.addChild(text(p.line, 6, y + 9, { width: 230, small: true, color: II.ash, maxLines: 2 }));
    b.addChild(button('SPAR IT', 244, y + 4, 60, 16, () => {
      win.close();
      play(p);
    }, { small: true, fill: II.blood, border: II.sodium }));
    b.addChild(button(`SIM (${gradeFor(SIM_SCORE)})`, 308, y + 4, 60, 16, () => {
      win.close();
      done(sparSession(save, who, gradeFor(SIM_SCORE)));
    }, { small: true, fill: II.steel }));
  });
  b.addChild(button('NOT TODAY', 150, 166, 80, 13, () => { win.close(); done(null); }, { small: true, fill: II.steel }));

  const play = (p: Partner) => {
    const opp = p.make();
    if (!opp) return done(null);
    const where = storyVenue("RAY'S BOXING & SOUP");
    const seed = (save.seed ^ (save.totalWeeks ?? 0) * 7919 ^ save.actionsLeft * 131) >>> 0;
    openLiveFight(g, {
      bout: storyBout(`spar_${p.id}`, me, opp, 1),
      A: me, B: opp, skills: [me.skills, opp.skills], player: 0,
      plan: 'balanced', oppPlan: 'balanced', cutTier: 3, seed,
      event: "SPARRING  /  RAY'S BOXING & SOUP", judges: ['Uncle Ray', 'Uncle Ray', 'Uncle Ray'], referee: where.referee,
      canvas: where.canvas, refLook: where.refLook,
      rules: { moves: { 0: movesOf(save, who) } },
      done: (r) => done(sparSession(save, who, gradeFor(sparScore(r, me.id)))),
    });
  };
}
