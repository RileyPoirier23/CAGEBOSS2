/**
 * Tales of Legacy balance check: the corner (Han, then Mateo) against 1ton's fixed curve after
 * the signing, and the late story fights simulated AI against AI at three camp levels.
 *
 *   npx tsx tools/story-balance.ts
 *   npx tsx tools/story-balance.ts --fights 400
 *
 * The real fights are played by hand, so these win rates are a floor, not the answer.
 */
import { loadContent } from './loadContent';
import { Rng } from '../src/core/rng';
import { content } from '../src/core/content';
import { overall } from '../src/sim/fighters';
import { simulateFight } from '../src/sim/fight';
import { STORY_CHAPTERS, buildHan, buildMateoGrown, buildOneTon, chapterFights, newStorySave, storyCorner } from '../src/sequel/story';

const argv = process.argv.slice(2);
const n = Number(argv[argv.indexOf('--fights') + 1]) || 200;
loadContent();

const officials = content().officials;
const judges = officials.filter((o) => o.role === 'judge').slice(0, 3);
const referee = officials.find((o) => o.role === 'referee') ?? officials[0];

const CAMPS = { low: 2, mid: 5, full: 10 };
const signing = STORY_CHAPTERS.findIndex((c) => c.id === 'the_signing');

console.log('chapter            1ton  han(low/mid/full)  mateo(low/mid/full)');
for (let ch = signing + 1; ch < STORY_CHAPTERS.length; ch++) {
  const row = (build: typeof buildHan) =>
    Object.values(CAMPS).map((lv) => {
      const s = newStorySave(1);
      s.chapter = ch;
      s.daneTraining = { striking: lv, grappling: lv, cardio: lv };
      s.trust = 60;
      return overall(build(s).skills);
    }).join('/');
  const s = newStorySave(1);
  s.chapter = ch;
  console.log(`${STORY_CHAPTERS[ch].id.padEnd(18)} ${String(overall(buildOneTon(s).skills)).padStart(4)}  ${row(buildHan).padEnd(17)}  ${row(buildMateoGrown)}`);
}

console.log(`\nstory fights after the signing, ${n} sims each (player side's win %, low / mid / full camp)`);
for (let ch = signing + 1; ch < STORY_CHAPTERS.length; ch++) {
  for (const def of chapterFights(STORY_CHAPTERS[ch])) {
    if (def.player === 'oneton') continue;
    const pct = Object.values(CAMPS).map((lv) => {
      const s = newStorySave(7);
      s.chapter = ch;
      s.daneTraining = { striking: lv, grappling: lv, cardio: lv };
      s.trust = 60;
      if (ch > STORY_CHAPTERS.findIndex((c) => c.id === 'street_justice')) s.flags.hanInjured = true;
      const { player, opponent } = storyCorner(s, def);
      const rng = new Rng(ch * 1000 + lv);
      let w = 0;
      for (let i = 0; i < n; i++) {
        const r = simulateFight(structuredClone(player), structuredClone(opponent), { rounds: def.rounds, judges, referee }, rng);
        if (r.winner === player.id) w++;
      }
      return `${String(Math.round((w / n) * 100)).padStart(3)}% (${overall(player.skills)} v ${overall(opponent.skills)})`;
    });
    console.log(`${def.id.padEnd(18)} ${def.player.padEnd(6)} ${pct.join('  ')}`);
  }
}
