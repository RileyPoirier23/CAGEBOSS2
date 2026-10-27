/**
 * The sequel's front door: a warehouse at night, a very bad year, and one
 * more chance to be somebody.
 */
import { Container, Graphics } from 'pixi.js';
import { Scene, type Game } from '../app';
import { PAL } from '../../art/palette';
import { W, H, SW, OX, text, button, box } from '../kit';
import { isTouchDevice } from '../../core/platform';
import { sfx } from '../../audio/sfx';
import { confirm, openWindow } from '../widgets';
import { buybackBuzz, buybackCash, newSequelRun, zenithClauses } from '../../sequel/model';
import { readRun, writeRun } from '../../sequel/session';
import { SEQUEL_STORY, SEQUEL_TAGLINE } from '../../sequel/data';
import { BUYBACK_BUZZ, BUYBACK_CASH, type SeqRun } from '../../sequel/types';
import { money } from '../../core/format';
import { readStory } from '../../sequel/storysession';
import { seqRain, seqTitleBackdrop } from '../sequelart';
import { SequelHubScene } from './sequelhub';
import { SequelShowScene } from './sequelshow';
import { SequelEndScene } from './sequelend';
import { openSequelAchievements } from './sequelachievements';
import { isSequelStandalone, isSequelDemo } from '../../sequel/standalone';
import { desktop } from '../../desktop';
import { openSettings } from './settings';

export function openStoryMode(g: Game): void {
  const save = readStory();
  if (!save) {
    void import('./sequelstory').then((m) => m.startNewStory(g));
    return;
  }
  if (save.status === 'ended') {
    void import('./storyend').then((m) => g.goto(new m.StoryEndScene(g)));
    return;
  }
  void import('./sequelstory').then((m) => g.goto(new m.SequelStoryHubScene(g)));
}

export function routeSequel(g: Game, run: SeqRun): void {
  if (run.status === 'ended') g.goto(new SequelEndScene(g));
  else if (run.status === 'plan') g.goto(new SequelHubScene(g));
  else g.goto(new SequelShowScene(g));
}

export function startNewSequelRun(g: Game): void {
  const seed = Math.floor(Math.random() * 1e9);
  g.loading('Opening the warehouse', () => {
    const run = newSequelRun(seed);
    writeRun(run);
    g.goto(new SequelHubScene(g));
  }, 1.2);
}

export function openSequelHelp(g: Game): void {
  const run = readRun();
  const goalCash = run ? buybackCash(run) : BUYBACK_CASH;
  const goalBuzz = run ? buybackBuzz(run) : BUYBACK_BUZZ;
  const clauses = run ? zenithClauses(run) : 0;
  const win = openWindow(g, 'CAGE BOSS II: HOW TO LOSE YOUR LEAGUE', 424, 246, { paper: 'cream' });
  const b = win.body;
  b.addChild(text('THE JOB', 8, 1, { small: true, color: PAL.blood }));
  b.addChild(text(
    `Forty weeks. At the end of them, ${money(goalCash)} and ${goalBuzz} BUZZ buys your old company back from Zenith. ` +
    'The season is split into four ten-week quarters. Each one has a goal and a bonus. Miss the goal and the bonus stays with Zenith. ' +
    'You can also buy back early from week 34. There are other ways to end this. Not all of them are wins.',
    8, 10, { width: 404, small: true, color: PAL.ink, maxLines: 4 },
  ));
  b.addChild(text('THE FOUR NUMBERS', 8, 43, { small: true, color: PAL.blood }));
  const rows: [string, string][] = [
    ['CASH', 'Pay the room, the fighters and the ads. Below zero and the run is over.'],
    ['BUZZ', 'Draws the crowd and unlocks bigger rooms. It decays. Keep feeding it.'],
    ['HEAT', 'Every show makes noise. At 100 the commission raids you. Pay it down or lay low.'],
    ['LOCKER', 'Happy fighters stay, grow and answer the phone. Unhappy ones get poached.'],
  ];
  rows.forEach(([k, v], i) => {
    b.addChild(text(k, 8, 53 + i * 13, { small: true, color: PAL.gold }));
    b.addChild(text(v, 66, 53 + i * 13, { width: 346, small: true, color: PAL.shadow, maxLines: 1 }));
  });
  b.addChild(text('EACH WEEK', 8, 108, { small: true, color: PAL.blood }));
  b.addChild(text(
    'First the desk: compare the week\'s paper to the file, inspect forgeries, ASK the visitor and stamp it. ' +
    'The show cannot open until the desk is clear. Then pick a room, a gimmick, an ad buy and up to three fights.',
    8, 117, { width: 404, small: true, color: PAL.ink, maxLines: 2 },
  ));
  b.addChild(text('THE PAPERWORK', 8, 138, { small: true, color: PAL.blood }));
  b.addChild(text(
    'Inspect a field on the paper, then the record it must match. A red string means somebody has been at it with a photocopier. ' +
    'Valid paper gets APPROVED; forged paper gets DENIED. Memos and Zenith letters are decisions. A perfect week pays a bonus. ' +
    `Zenith matching-rights letters arrive in weeks 28, 34 and 38. Each clause you sign raises the buyback by ${money(500000)} and 2 BUZZ` +
    (clauses ? ` (you have signed ${clauses}).` : '.'),
    8, 147, { width: 404, small: true, color: PAL.ink, maxLines: 4 },
  ));
  b.addChild(text('THE LONG GAME', 8, 184, { small: true, color: PAL.blood }));
  b.addChild(text(
    'Three straight wins makes a champion. Champions sell tickets and defend belts. CAMPS takes one to four weeks off: ' +
    'the rent keeps running and the crowd forgets, but bodies heal and a fighter can come back permanently better. ' +
    'SEASON shows the quarters, the belts and the buyback number. STORY MODE is ten chapters (and one secret), Han Tibular, Mateo and one trainee with a plan.',
    8, 193, { width: 404, small: true, color: PAL.ink, maxLines: 3 },
  ));
  b.addChild(button('BACK TO THE WAREHOUSE', 134, 226, 156, 15, () => win.close(), { small: true, fill: PAL.moss, border: PAL.ink }));
}

export class SequelTitleScene extends Scene {
  music = 'title' as const;
  private t = 0;
  private rain = new Graphics();

  build(): void {
    const r = this.root;
    r.x = -OX;
    r.addChild(seqTitleBackdrop(SW, H));
    r.addChild(this.rain);
    // dark glass panel
    const panel = new Graphics();
    panel.rect(0, 0, 208, H).fill({ color: 0x0a080e, alpha: 0.92 });
    panel.rect(208, 0, 1, H).fill({ color: PAL.gold, alpha: 0.5 });
    for (let x = 209; x < 232; x++) panel.rect(x, 0, 1, H).fill({ color: 0x0a080e, alpha: 0.45 * (1 - (x - 209) / 23) });
    r.addChild(panel);
    r.addChild(text('CAGE', 14, 12, { scale: 4, color: PAL.blood, shadow: PAL.ink }));
    r.addChild(text('BOSS', 14, 40, { scale: 4, color: PAL.blood, shadow: PAL.ink }));
    r.addChild(text('II', 126, 22, { scale: 4, color: PAL.gold, shadow: PAL.ink }));
    r.addChild(text('THE BUYBACK', 16, 72, { scale: 2, color: PAL.gold, shadow: PAL.ink }));
    if (isSequelDemo()) r.addChild(new Graphics().rect(150, 72, 44, 12).fill(PAL.blood).rect(150, 72, 44, 12).stroke({ color: PAL.gold, width: 1 }), text('DEMO', 150, 75, { small: true, width: 44, align: 'center', color: PAL.bone }));
    r.addChild(text(SEQUEL_TAGLINE, 16, 92, { small: true, color: PAL.ash }));
    r.addChild(text(SEQUEL_STORY, 16, 106, { small: true, width: 178, color: PAL.fog, maxLines: 8, lineGap: 0 }));
    r.addChild(text('FICTIONAL. EVERYONE. EVEN THE TIGER.', 16, H - 10, { small: true, color: PAL.grey }));

    const run = readRun();
    const story = readStory();
    const items: [string, () => void, number?][] = [];
    if (run) items.push(['CONTINUE', () => this.continueRun(run), PAL.moss]);
    items.push(['NEW RUN', () => this.newRun(!!run), PAL.blood]);
    items.push(['STORY MODE', () => this.openStory(), PAL.rust]);
    const y0 = run ? 150 : 164;
    const touch = isTouchDevice();
    items.forEach(([label, fn, fill], i) => {
      r.addChild(button(label, 16, y0 + i * (touch ? 24 : 22), 176, touch ? 19 : 17, fn, {
        fill: fill ?? PAL.night,
        border: i === 0 ? PAL.gold : PAL.slate,
        small: false,
      }));
    });
    // what is behind the story door, in one line
    const storyLine = story
      ? story.status === 'ended'
        ? 'THE NOTEBOOK IS CLOSED. THE ENDINGS ARE STILL OUT THERE.'
        : `CHAPTER ${story.chapter + 1} OF ${Math.max(10, story.chapter + 1)}. THE NOTEBOOK IS OPEN.`
      : 'TEN CHAPTERS. ONE TRAINEE. HAN TIBULAR IS BACK.';
    r.addChild(text(storyLine, 16, y0 + items.length * (touch ? 24 : 22) + 3, { small: true, width: 176, color: PAL.ember, maxLines: 2 }));

    // the utility shelf: trophies, rules, the door out
    const uy = H - 24;
    r.addChild(button('TROPHY CASE', 16, uy, 58, 14, () => openSequelAchievements(this.g), { small: true, fill: PAL.rust, border: PAL.gold }));
    r.addChild(button('HOW TO PLAY', 78, uy, 58, 14, () => openSequelHelp(this.g), { small: true, fill: PAL.night, border: PAL.slate }));
    // standalone (its own exe): SETTINGS and QUIT; inside the first game: the way back to its street
    if (isSequelStandalone()) {
      r.addChild(button('SETTINGS', 140, uy, 52, 14, () => openSettings(this.g), { small: true, fill: PAL.shadow, border: PAL.slate }));
      if (desktop) r.addChild(button('QUIT', 140, uy - 17, 52, 14, () => this.back(), { small: true, fill: PAL.shadow, border: PAL.slate }));
    } else r.addChild(button('BACK', 140, uy, 52, 14, () => this.back(), { small: true, fill: PAL.shadow, border: PAL.slate }));

    // a newspaper on the street: the story so far
    const paper = new Container();
    paper.position.set(268, 56);
    paper.addChild(box(174, 74, PAL.newsprint, 0x2a2622, { shadow: true }));
    paper.addChild(text('THE DAILY CLINCH', 6, 4, { small: true, color: PAL.ink }));
    paper.addChild(new Graphics().rect(6, 13, 162, 1).fill(PAL.ink));
    paper.addChild(text('ZENITH BUYS RIVAL; LOCAL MAN SEEN YELLING AT CLOUDS', 6, 17, { small: true, width: 162, color: PAL.shadow, maxLines: 3 }));
    paper.addChild(text('"HE STILL OWES ME A PARKING SPOT," SAYS FORMER PRESIDENT', 6, 46, { small: true, width: 162, color: PAL.slate, maxLines: 2 }));
    r.addChild(paper);
    // a marker for the best run
    r.addChild(text('FORTY SATURDAYS. ONE WAREHOUSE. NO PLAN B.', 268, 142, { small: true, color: PAL.gold, shadow: 0x000000 }));
    r.addChild(text('THE CAGE IS ALREADY UP.', 268, 156, { small: true, color: PAL.ash }));
  }

  private continueRun(run: SeqRun): void {
    sfx('click');
    if (run.status === 'ended') this.g.goto(new SequelEndScene(this.g));
    else routeSequel(this.g, run);
  }

  private openStory(): void {
    sfx('click');
    openStoryMode(this.g);
  }

  private newRun(existing: boolean): void {
    sfx('click');
    if (existing) {
      confirm(this.g, 'Start a new run? The current run and its best-show numbers stay in the trophy case, but the warehouse gets a new seed.', () => startNewSequelRun(this.g), 'START OVER', 'KEEP RUNNING');
      return;
    }
    startNewSequelRun(this.g);
  }

  private back(): void {
    sfx('click');
    if (isSequelStandalone()) {
      if (desktop) confirm(this.g, 'Close CAGE BOSS II? The run and the story are saved.', () => desktop?.quit(), 'QUIT', 'STAY');
      return;
    }
    // the demo inside the first game: back to its street, in its own clothes
    void import('../sequel/demo').then((m) => m.exitSequelDemo(this.g));
  }

  onKey(e: KeyboardEvent): boolean {
    if (e.type === 'keydown' && (e.key === 'Escape' || e.key === 'Backspace') && !this.g.modals.length) {
      this.back();
      return true;
    }
    return false;
  }

  update(dt: number): void {
    this.t += dt;
    const r = this.rain;
    r.clear();
    const w = SW;
    const h = H;
    let s = 991;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 100; i++) {
      const x = (rnd() * w - this.t * 34) % w;
      const y = (rnd() * h + this.t * (120 + rnd() * 90)) % h;
      r.rect(Math.round(x < 0 ? x + w : x), Math.round(y), 1, 3).fill({ color: 0x8aa2b8, alpha: 0.32 });
    }
    if (Math.random() < 0.0015) sfx('thud');
  }
}
