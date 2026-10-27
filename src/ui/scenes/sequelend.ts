/**
 * The last edition: what the forty weeks bought you, and what they cost.
 */
import { Graphics } from 'pixi.js';
import { Scene, fullBg } from '../app';
import { PAL } from '../../art/palette';
import { II } from '../theme';
import { panel2 } from '../sequel/panel2';
import { SW, OX, H, text, button, ScrollBox } from '../kit';
import { money } from '../../core/format';
import { sfx } from '../../audio/sfx';
import { seqTitleBackdrop } from '../sequelart';
import { readRun, loadBest, saveBest } from '../../sequel/session';
import { endingFor } from '../../sequel/model';
import { ENDINGS, SEASON_PHASES } from '../../sequel/data';
import { SEASON_WEEKS, type SeqBest } from '../../sequel/types';
import { toastSeqAchievements } from './sequelachievements';

export class SequelEndScene extends Scene {
  music = 'title' as const;

  build(): void {
    const run = readRun();
    if (!run) {
      void import('./sequel').then((m) => this.g.goto(new m.SequelTitleScene(this.g)));
      return;
    }
    toastSeqAchievements(this.g, run);
    const e = ENDINGS[run.ending ?? endingFor(run).id] ?? ENDINGS.survivor;
    const prev = loadBest();
    saveBest(run);
    const best: SeqBest | null = loadBest();
    const isBest = !prev || (!!best && best.score > prev.score);
    const quarters = SEASON_PHASES.filter((p) => run.flags[`phase_${p.no}`] === 'won').length;

    const r = this.root;
    r.x = -OX;
    r.addChild(fullBg(0x08060c));
    r.addChild(seqTitleBackdrop(SW, H));
    r.addChild(new Graphics().rect(0, 0, SW, H).fill({ color: 0x08060c, alpha: 0.74 }));

    const pw = Math.min(440, SW - 20);
    const px = Math.round((SW - pw) / 2);
    const p = panel2(pw, 218);
    p.position.set(px, 12);
    r.addChild(p);

    p.addChild(text('THE DAILY CLINCH', 0, 6, { scale: 2, width: pw, align: 'center', color: II.bone }));
    p.addChild(text(`FINAL EDITION  /  WEEK ${Math.min(run.week, SEASON_WEEKS)} OF ${SEASON_WEEKS}`, 0, 24, { small: true, width: pw, align: 'center', color: II.blood }));
    p.addChild(new Graphics().rect(10, 33, pw - 20, 1).fill(II.bone));
    p.addChild(text(e.title, 10, 37, { width: pw - 20, color: e.color === II.gold ? II.bone : e.color, maxLines: 2 }));
    p.addChild(text(e.kicker, 10, 53, { width: pw - 20, small: true, color: II.blood, maxLines: 2 }));
    p.addChild(new Graphics().rect(10, 65, pw - 20, 1).fill(II.edge));

    const sb = new ScrollBox(pw - 24, 62);
    sb.position.set(10, 69);
    const body = text(e.body, 0, 0, { width: pw - 32, small: true, color: II.bone });
    sb.content.addChild(body);
    sb.refresh();
    p.addChild(sb);

    // the run in numbers
    p.addChild(new Graphics().rect(10, 135, pw - 20, 1).fill(II.bone));
    const stat = (label: string, value: string, x: number, y: number, color: number = II.bone) => {
      p.addChild(text(label, x, y, { small: true, color: II.ash }));
      p.addChild(text(value, x, y + 9, { color, width: 82, maxLines: 1 }));
    };
    const wins = run.stats.wins;
    const losses = run.stats.losses;
    const draws = run.stats.draws;
    stat('CASH', money(run.cash), 10, 140, run.cash < 0 ? II.blood : II.bone);
    stat('BUZZ / HEAT', `${Math.round(run.buzz)} / ${Math.round(run.heat)}`, 96, 140, run.heat >= 70 ? II.blood : II.bone);
    stat('RECORD', `${wins}-${losses}${draws ? '-' + draws : ''}`, 190, 140);
    stat('FINISHES', String(run.stats.finishes), 270, 140);
    if (pw > 360) stat('BEST GATE', money(run.stats.bestGate), 338, 140);
    stat('SHOWS', String(run.stats.shows), 10, 159);
    stat('SKIPS / CAMPS', `${run.stats.skips} / ${run.stats.camps}`, 96, 159);
    stat('BELTS / DEF', `${run.belts.length} / ${run.stats.defenses}`, 190, 159, run.belts.length ? II.sodium : II.bone);
    stat('SELLOUTS', String(run.stats.sellouts), 270, 159);
    if (pw > 360) stat('QUARTERS', `${quarters} / 4`, 338, 159, quarters === 4 ? PAL.moss : II.bone);
    stat('ROSTER', String(run.roster.length), 10, 178);
    stat('SIGNINGS', String(run.stats.signings), 96, 178);
    stat('TITLE FIGHTS', String(run.stats.titleFights), 190, 178);
    stat('SEED', String(run.seed % 1000000), 270, 178);

    p.addChild(new Graphics().rect(10, 196, pw - 20, 1).fill(II.edge));
    const score = best?.score ?? 0;
    p.addChild(text(
      `${isBest ? 'NEW BEST RUN' : 'BEST RUN'}: ${score.toLocaleString('en-US')} pts` +
      (best ? `  /  ${(ENDINGS[best.ending]?.title ?? best.ending).toUpperCase()}  /  W${best.week}` : ''),
      10, 200, { small: true, width: pw - 20, color: II.bone, maxLines: 1 },
    ));

    // three doors out
    const bw = 138;
    const gap = 6;
    const x0 = Math.round((SW - (bw * 3 + gap * 2)) / 2);
    r.addChild(button('RUN IT BACK', x0, 238, bw, 18, () => this.again(), { fill: II.blood, border: II.gold }));
    r.addChild(button('TROPHY CASE', x0 + bw + gap, 238, bw, 18, () => {
      void import('./sequelachievements').then((m) => m.openSequelAchievements(this.g));
    }, { fill: II.sodium, border: II.ash }));
    r.addChild(button('SEQUEL MENU', x0 + (bw + gap) * 2, 238, bw, 18, () => this.sequelMenu(), { fill: II.steel, border: II.ash }));
    r.addChild(text('Zenith Holdings keeps the parking spot. You keep the story.', 10, 258, { small: true, color: PAL.ash }));
  }

  private again(): void {
    sfx('click');
    // a new seed, the same debts
    void import('./sequel').then((m) => m.startNewSequelRun(this.g));
  }

  private sequelMenu(): void {
    sfx('click');
    void import('./sequel').then((m) => this.g.goto(new m.SequelTitleScene(this.g)));
  }

  /** CAGE BOSS II is its own game now: the main menu is the sequel's title. */
  private mainMenu(): void {
    sfx('click');
    void import('./sequel').then((m) => this.g.goto(new m.SequelTitleScene(this.g)));
  }

  onKey(e: KeyboardEvent): boolean {
    if (e.type === 'keydown' && (e.key === 'Escape' || e.key === 'Backspace') && !this.g.modals.length) {
      this.mainMenu();
      return true;
    }
    return false;
  }
}
