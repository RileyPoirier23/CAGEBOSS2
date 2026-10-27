/**
 * The sweep: every fighter either game can put in a cage. Men fight shirtless, women in a sports
 * top, and the division decides which (welterweight is a men's division; it starts with a w).
 */
import { describe, it, expect } from 'vitest';
import { content as loadTestContent, newGame } from './setup';
import { lookFor } from '../src/ui/rig';
import { isWomensDivision, presentedGender } from '../src/sim/fighters';
import { DIVISION_ORDER } from '../src/sim/divisions';
import { newSequelRun } from '../src/sequel/model';
import { STORY_CHAPTERS, buildOneTon, buildHan, buildMateoGrown, buildOpponent, buildRay1987, buildButch1987, chapterFights, newStorySave } from '../src/sequel/story';
import { TAPES, tapeFighter } from '../src/sequel/tapes';
import type { Fighter } from '../src/core/types';

const check = (where: string, f: Fighter) => {
  const women = isWomensDivision(f.division);
  expect(presentedGender(f), `${where}: ${f.first} ${f.last} (${f.division})`).toBe(women ? 'W' : 'M');
  expect(lookFor(f, 0).female, `${where}: ${f.first} ${f.last} (${f.division}) top`).toBe(women);
};

describe('who wears a top', () => {
  it('knows which divisions are the women\'s', () => {
    expect(isWomensDivision('welter')).toBe(false);
    expect(DIVISION_ORDER.filter(isWomensDivision).every((d) => d.startsWith('w') && d !== 'welter')).toBe(true);
    expect(DIVISION_ORDER.filter((d) => !isWomensDivision(d))).toContain('welter');
  });

  it('game one: every fighter in a new career, and their recorded gender agrees', () => {
    const s = newGame(321);
    const all = Object.values(s.fighters);
    expect(all.length).toBeGreaterThan(100);
    for (const f of all) {
      check('career', f);
      // generated fighters are born the right gender for their division (data typos are drawn right by presentedGender)
      if (!f.parody) expect(f.gender, `${f.first} ${f.last} (${f.division}) gender`).toBe(isWomensDivision(f.division) ? 'W' : 'M');
    }
  });

  it('the sequel: the promoter roster, the free agents and every story fighter', () => {
    loadTestContent();
    const run = newSequelRun(77);
    for (const x of run.roster) check('roster', x.f);
    for (const f of run.freeAgents) check('free agent', f);
    const save = newStorySave(5);
    check('story', buildOneTon(save));
    check('story', buildOneTon(save, true));
    check('story', buildHan(save));
    check('story', buildHan(save, true));
    check('story', buildMateoGrown(save));
    for (const def of STORY_CHAPTERS.flatMap((c) => chapterFights(c))) check(`story ${def.id}`, buildOpponent(save, def.opponent));
    check('1987', buildRay1987());
    check('1987', buildButch1987());
    for (const t of TAPES) for (const st of t.steps) if (st.kind === 'fight') for (const k of [st.player, st.opponent]) check(`tape ${t.id}`, tapeFighter(k));
  });
});
