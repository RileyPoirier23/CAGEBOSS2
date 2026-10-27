/**
 * The last page of the notebook. One ending, one record, one list of the
 * endings that are still out there.
 */
import { Container, Graphics } from 'pixi.js';
import { Scene, fullBg, type Game } from '../app';
import { PAL } from '../../art/palette';
import { W, SW, OX, H, text, button, paper, ScrollBox } from '../kit';
import { money } from '../../core/format';
import { sfx } from '../../audio/sfx';
import { seqTitleBackdrop } from '../sequelart';
import { readStory, loadStoryTrophy, addStoryTrophy, writeStory } from '../../sequel/storysession';
import { STORY_ENDINGS, storyEndingById, storyRecord } from '../../sequel/story';

export class StoryEndScene extends Scene {
  music = 'title' as const;

  build(): void {
    const save = readStory();
    if (!save) {
      void import('./sequel').then((m) => this.g.goto(new m.SequelTitleScene(this.g)));
      return;
    }
    if (!save.flags.trophySaved) {
      addStoryTrophy(save);
      save.flags.trophySaved = true;
      writeStory(save);
    }
    const e = storyEndingById(save.ending);
    const trophy = loadStoryTrophy();

    const r = this.root;
    r.x = -OX;
    r.addChild(fullBg(0x08060c));
    r.addChild(seqTitleBackdrop(SW, H));
    r.addChild(new Graphics().rect(0, 0, SW, H).fill({ color: 0x08060c, alpha: 0.78 }));

    const pw = Math.min(440, SW - 20);
    const px = Math.round((SW - pw) / 2);
    const p = paper(pw, 218, 'news', save.seed % 89 + 11);
    p.position.set(px, 12);
    r.addChild(p);

    p.addChild(text('THE NOTEBOOK', 0, 6, { scale: 2, width: pw, align: 'center', color: PAL.ink }));
    p.addChild(text(`TALES OF LEGACY  /  FINAL PAGE  /  RANK ${e.rank}`, 0, 24, { small: true, width: pw, align: 'center', color: PAL.blood }));
    p.addChild(new Graphics().rect(10, 33, pw - 20, 1).fill(PAL.ink));
    p.addChild(text(e.title, 10, 37, { width: pw - 20, color: e.color === PAL.gold ? PAL.ink : e.color, maxLines: 2 }));
    p.addChild(text(e.kicker, 10, 53, { width: pw - 20, small: true, color: PAL.blood, maxLines: 1 }));
    p.addChild(new Graphics().rect(10, 63, pw - 20, 1).fill(PAL.paperDark));

    const sb = new ScrollBox(pw - 24, 58);
    sb.position.set(10, 68);
    const body = text(e.body, 0, 0, { width: pw - 32, small: true, color: PAL.ink });
    sb.content.addChild(body);
    sb.refresh();
    p.addChild(sb);

    p.addChild(new Graphics().rect(10, 130, pw - 20, 1).fill(PAL.ink));
    const dane = storyRecord(save, 'corner');
    const one = storyRecord(save, 'oneton');
    const stat = (label: string, value: string, x: number, y: number, color: number = PAL.ink) => {
      p.addChild(text(label, x, y, { small: true, color: PAL.slate }));
      p.addChild(text(value, x, y + 9, { color, width: 102, maxLines: 1 }));
    };
    stat('HAN / MATEO', `${dane.w}-${dane.l}${dane.d ? '-' + dane.d : ''}`, 10, 135);
    stat('1TON', `${one.w}-${one.l}${one.d ? '-' + one.d : ''}`, 118, 135);
    stat('TRUST / EGO', `${save.trust} / ${save.ego}`, 226, 135);
    stat('BRAND / HEAT', `${save.brand} / ${save.heat}`, 334, 135);
    stat('CONTRACTS', `${save.stats.catches} CAUGHT / ${save.stats.missed} MISSED`, 10, 154);
    stat('UNDERCARD', `${save.stats.sideWins}-${save.stats.sideLosses}`, 160, 154);
    stat('PRESS DAYS', String(save.stats.pressers), 266, 154);
    stat('EARNINGS', money(save.stats.earnings), 344, 154);
    stat('CHAPTERS', `${Math.min(save.chapter + 1, 9)} / 9`, 10, 173);
    stat('WRONG FLAGS', String(save.stats.wrongFlags), 118, 173);
    stat('GOOD DEALS', String(save.stats.goodDeals), 226, 173);
    stat('WALKED', String(save.stats.walked), 334, 173);

    p.addChild(new Graphics().rect(10, 190, pw - 20, 1).fill(PAL.paperDark));
    p.addChild(text(
      `ENDINGS FOUND ${trophy.endings.length} / ${STORY_ENDINGS.length}  /  BEST RANK ${trophy.bestRank}  /  PLAYTHROUGHS ${trophy.playthroughs}`,
      10, 194, { small: true, width: pw - 20, color: PAL.ink, maxLines: 1 },
    ));
    p.addChild(text('Some cages have a door. Some have a receipt.', 10, 204, { small: true, color: PAL.slate }));

    const bw = 104;
    const gap = 6;
    const x0 = Math.round((SW - (bw * 4 + gap * 3)) / 2);
    r.addChild(button('NEW STORY', x0, 238, bw, 18, () => this.again(), { fill: PAL.blood, border: PAL.gold }));
    r.addChild(button('TROPHY CASE', x0 + bw + gap, 238, bw, 18, () => openStoryTrophies(this.g), { fill: PAL.rust, border: PAL.slate }));
    r.addChild(button('STORY MENU', x0 + (bw + gap) * 2, 238, bw, 18, () => this.storyMenu(), { fill: PAL.shadow, border: PAL.slate }));
    r.addChild(button('MAIN MENU', x0 + (bw + gap) * 3, 238, bw, 18, () => this.mainMenu(), { fill: PAL.shadow, border: PAL.slate }));
  }

  private again(): void {
    sfx('click');
    void import('./sequelstory').then((m) => m.startNewStory(this.g));
  }

  private storyMenu(): void {
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

export function openStoryTrophies(g: Game): void {
  const trophy = loadStoryTrophy();
  const root = new Container();
  const wrap = g.modal(root, { dim: 0.96 });
  const room = new Graphics().rect(-OX, 0, SW, H).fill(0x1a1210);
  for (let x = -OX; x < SW - OX; x += 26) room.rect(x, 0, 1, H).fill(0x130c08);
  room.rect(-OX, H - 10, SW, 10).fill(0x2e1414);
  root.addChild(room);
  root.addChild(text('THE STORY TROPHY CASE', 12, 6, { scale: 2, color: PAL.gold, shadow: 0x000000 }));
  root.addChild(text(`ENDINGS ${trophy.endings.length} OF ${STORY_ENDINGS.length}  /  BEST RANK ${trophy.bestRank}  /  CONTRACTS ${trophy.catches} CAUGHT`, 12, 22, { small: true, color: PAL.ash }));
  root.addChild(text('NINE CHAPTERS. EIGHT WAYS OUT. ONE NOTEBOOK.', 12, 32, { small: true, color: PAL.ember }));
  STORY_ENDINGS.forEach((e, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 12 + col * 230;
    const y = 45 + row * 43;
    const got = trophy.endings.includes(e.id);
    root.addChild(new Graphics().rect(x, y, 220, 38).fill(got ? 0x2a2118 : 0x140e0c).stroke({ color: got ? e.color : 0x3a2a20, width: 1 }));
    root.addChild(text(e.title, x + 6, y + 4, { small: true, color: got ? PAL.gold : PAL.grey, width: 208, maxLines: 1 }));
    root.addChild(text(e.kicker, x + 6, y + 14, { small: true, color: got ? PAL.ash : PAL.grey, width: 208, maxLines: 1 }));
    root.addChild(text(got ? `WON  /  RANK ${e.rank}` : 'NOT FOUND YET', x + 6, y + 26, { small: true, color: got ? PAL.moss : PAL.slate }));
  });
  root.addChild(text('THE PROMOTER SEASON KEEPS ITS OWN CABINET. THIS ONE IS FOR THE STORY.', 12, H - 28, { small: true, color: PAL.grey }));
  root.addChild(button('CLOSE', W - 54, 8, 44, 14, () => g.closeModal(wrap), { small: true, fill: PAL.shadow, border: PAL.gold }));
}
