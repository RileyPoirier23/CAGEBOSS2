/**
 * THE THEATRE: a velvet-curtained list of every key scene you have seen, by chapter. Pick one and
 * it plays again exactly as it did (choices already made; nothing in your save changes).
 */
import { Container, Graphics } from 'pixi.js';
import type { Game } from '../app';
import { W, H, text, button, ScrollBox } from '../kit';
import { II } from '../theme';
import { sfx } from '../../audio/sfx';
import { reels, reelSave, type Reel } from '../../sequel/theatre';
import { STORY_CHAPTERS } from '../../sequel/story';
import { beatScene, chapterIntro, chapterOutro, storyEndingScene } from '../scenes/storycuts';
import { playCine } from './cine';
import type { Cutscene } from '../cutscene';

const KIND_LABEL: Record<Reel['kind'], string> = { intro: 'OPENING', outro: 'CLOSING', beat: 'SCENE', ending: 'ENDING' };

/** Rebuild a reel's scene (no choices: it plays the way it went). */
export function reelScene(r: Reel): Cutscene | null {
  const save = reelSave(r);
  const sc = r.kind === 'intro' ? chapterIntro(save) : r.kind === 'outro' ? chapterOutro(save) : r.kind === 'beat' ? beatScene(save, r.ref ?? '') : storyEndingScene(save);
  return sc ? { ...sc, choices: undefined } : null;
}

export function openTheatre(g: Game): void {
  const root = new Container();
  const wrap = g.modal(root, { dim: 0.9, closeOnDim: true });
  const list = reels();
  // the curtains
  const bg = new Graphics();
  bg.rect(20, 10, W - 40, H - 20).fill(0x14060a).stroke({ color: II.edge, width: 1 });
  for (let x = 20; x < 64; x += 6) bg.rect(x, 10, 4, H - 20).fill(x % 12 ? 0x6a0e18 : 0x8a1420);
  for (let x = W - 64; x < W - 20; x += 6) bg.rect(x, 10, 4, H - 20).fill(x % 12 ? 0x6a0e18 : 0x8a1420);
  bg.rect(20, 10, W - 40, 14).fill(0x8a1420).rect(20, 24, W - 40, 2).fill(II.gold);
  root.addChild(bg);
  root.addChild(text('THE THEATRE', 0, 13, { width: W, align: 'center', color: II.gold }));
  root.addChild(text(list.length ? `${list.length} SCENES ON THE REEL. PICK ONE. NOTHING IN YOUR SAVE CHANGES.` : 'Nothing on the reel yet. Every big scene you see in Tales of Legacy lands here.', 70, 30, { width: W - 140, small: true, color: II.ash, align: 'center' }));
  const sb = new ScrollBox(W - 150, H - 84);
  sb.position.set(75, 44);
  let y = 0;
  let lastCh = -1;
  for (const r of list) {
    if (r.chapter !== lastCh) {
      lastCh = r.chapter;
      const ch = STORY_CHAPTERS[r.chapter];
      sb.content.addChild(text(ch ? `CHAPTER ${ch.no}  /  ${ch.title}` : 'AFTER THE STORY', 0, y + 2, { small: true, color: II.sodium }));
      y += 12;
    }
    sb.content.addChild(button(`${KIND_LABEL[r.kind]}   ${r.title}`, 0, y, W - 160, 13, () => {
      const sc = reelScene(r);
      if (!sc) return;
      sfx('click');
      g.closeModal(wrap);
      playCine(g, sc, () => openTheatre(g));
    }, { small: true, align: 'left', fill: r.kind === 'ending' ? II.blood : II.steel, border: r.kind === 'ending' ? II.gold : undefined }));
    y += 16;
  }
  root.addChild(sb);
  sb.refresh();
  root.addChild(button('CLOSE', W / 2 - 30, H - 34, 60, 14, () => g.closeModal(wrap), { small: true, fill: II.steel }));
}
