/**
 * CAGE BOSS II's trophy case. Same shelf, new objects: every sequel achievement
 * lives here, lit if you have it, a silhouette if you have not.
 */
import { Container, Graphics } from 'pixi.js';
import type { Game } from '../app';
import { PAL } from '../../art/palette';
import { II } from '../theme';
import { W, H, SW, OX, text, button, box, clearChildren } from '../kit';
import { drawTrophy } from '../trophyart';
import {
  SEQ_ACHIEVEMENTS, claimSeqAchievements, hasSeqAchievement, seqAchievementProgress,
  type SeqAchCategory, type SeqAchievement,
} from '../../sequel/achievements';
import type { SeqRun } from '../../sequel/types';

/** Check the run, remember what it earned, and let the player know with a toast. */
export function toastSeqAchievements(g: Game, run: SeqRun): void {
  const fresh = claimSeqAchievements(run);
  fresh.forEach((a, i) => {
    setTimeout(() => g.toast(`TROPHY: ${a.name}`, II.gold), 650 + i * 950);
  });
}

const TABS: { id: SeqAchCategory; label: string }[] = [
  { id: 'season', label: 'THE SEASON' },
  { id: 'fighting', label: 'THE FIGHTS' },
  { id: 'business', label: 'THE BUSINESS' },
  { id: 'story', label: 'THE ENDINGS' },
];

const CAT_COLOR: Record<SeqAchCategory, number> = {
  season: II.gold,
  fighting: II.blood,
  business: PAL.moss,
  story: PAL.ember,
};

export function openSequelAchievements(g: Game): void {
  const root = new Container();
  const wrap = g.modal(root, { dim: 0.98 });
  let tab: SeqAchCategory = 'season';
  let pick = 0;

  const draw = (): void => {
    clearChildren(root);
    const have = seqAchievementProgress();
    // the room
    // the warehouse office: steel, scanlines, a blood-red strip along the floor
    const room = new Graphics().rect(-OX, 0, SW, H).fill(II.night);
    for (let y = 0; y < H; y += 3) room.rect(-OX, y, SW, 1).fill({ color: 0xffffff, alpha: 0.015 });
    for (let x = -OX; x < SW - OX; x += 26) room.rect(x, 0, 1, H).fill(II.panel);
    room.rect(-OX, H - 10, SW, 10).fill(0x2a0c10).rect(-OX, H - 10, SW, 1).fill(II.blood);
    root.addChild(room);

    root.addChild(text('THE BUYBACK TROPHY CASE', 12, 6, { scale: 2, color: II.gold, shadow: 0x000000 }));
    root.addChild(text(`CAGE BOSS II  /  ${have.have} OF ${have.total} WON`, 12, 22, { small: true, color: PAL.ash }));
    root.addChild(button('CLOSE', W - 54, 8, 44, 14, () => g.closeModal(wrap), { small: true, fill: II.steel, border: II.gold }));

    TABS.forEach((t, i) => {
      const on = t.id === tab;
      root.addChild(button(t.label, 10 + i * 90, 31, 84, 13, () => {
        tab = t.id;
        pick = 0;
        draw();
      }, { small: true, fill: on ? CAT_COLOR[t.id] : II.steel, border: on ? II.gold : II.ash }));
    });

    const items = SEQ_ACHIEVEMENTS.filter((a) => a.category === tab);
    const cols = 7;
    const cellW = Math.floor((W - 24) / cols);
    const rowH = 41;
    const x0 = 12;
    const y0 = 49;
    const rows = Math.ceil(items.length / cols);
    // cabinet
    const cabH = rows * rowH + 12;
    root.addChild(box(W - 24, cabH, II.panel, II.edge, { alpha: 0.98 })).position.set(12, y0 - 4);
    const art = new Graphics();
    root.addChild(art);
    const hitLayer = new Container();
    root.addChild(hitLayer);

    items.forEach((a, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const cx = x0 + c * cellW + cellW / 2;
      const shelfY = y0 + (r + 1) * rowH - 8;
      const lit = hasSeqAchievement(a.id);
      if (lit) art.ellipse(cx, shelfY - 13, 15, 12).fill({ color: 0xffe0a0, alpha: 0.07 });
      drawTrophy(art, a.id, cx, shelfY, !lit, 1.15);
      root.addChild(text(a.name, x0 + c * cellW + 1, shelfY + 1, {
        small: true, width: cellW - 2, align: 'center', color: lit ? PAL.bone : II.ash, maxLines: 1,
      }));
      if (i === pick) art.rect(x0 + c * cellW + 2, y0 + r * rowH + 1, cellW - 4, rowH - 2).fill({ color: CAT_COLOR[tab], alpha: 0.1 });
      const hit = new Graphics().rect(x0 + c * cellW, y0 + r * rowH, cellW, rowH).fill({ color: 0, alpha: 0.001 });
      hit.eventMode = 'static';
      hit.cursor = 'pointer';
      hit.on('pointertap', () => {
        pick = i;
        draw();
      });
      hitLayer.addChild(hit);
    });

    const sel: SeqAchievement | undefined = items[pick];
    const py = Math.max(y0 + rows * rowH + 8, 208);
    root.addChild(box(W - 24, 50, II.panelHi, II.edge)).position.set(12, py);
    if (sel) {
      const lit = hasSeqAchievement(sel.id);
      root.addChild(text(lit ? 'WON' : 'NOT YET', 18, py + 5, { small: true, color: lit ? PAL.moss : II.blood }));
      root.addChild(text(sel.name, 18, py + 14, { color: lit ? II.gold : PAL.bone, scale: 1 }));
      root.addChild(text(sel.desc, 18, py + 27, { small: true, width: W - 48, color: PAL.ash, maxLines: 2, lineGap: 0 }));
    } else {
      root.addChild(text('NOTHING IN THIS DRAWER YET.', 18, py + 12, { small: true, color: PAL.ash }));
    }
    root.addChild(text('THE FIRST GAME KEEPS ITS OWN CABINET. THIS ONE IS FOR THE BUYBACK.', 12, H - 9, { small: true, color: II.ash }));
  };

  draw();
}
