/**
 * Establishing shots for CINE II. A narrated line that sets the scene ("A barn outside Moncton...
 * a goat called Commissioner Pete", "Main Street in the rain", "The fortieth floor. Glass on three
 * sides.") puts that scene on screen: the goat wanders across, the rain comes down harder, the city
 * shows through the glass. sceneryTags() reads the line; drawScenery() draws it each frame.
 */
import type { Graphics } from 'pixi.js';

export type SceneryTag = 'rain' | 'snow' | 'storm' | 'goat' | 'trailer' | 'skyline' | 'crowd' | 'steam' | 'cameras' | 'sea' | 'bleachers' | 'neon' | 'sirens';

const READ: [RegExp, SceneryTag][] = [
  [/\brain(ing|y)?\b|\bwet\b|\bdownpour\b/i, 'rain'],
  [/\bsnow(ing)?\b|\bwinter\b|\bfrost\b/i, 'snow'],
  [/\bgale\b|\bstorm\b|\bthunder\b|\blightning\b/i, 'storm'],
  [/\bgoat\b|\bcommissioner pete\b/i, 'goat'],
  [/\bhorse trailers?\b/i, 'trailer'],
  [/\bfortieth floor\b|\bglass on\b|\bthe tower\b|\bzenith tower\b|\bthe city\b|\bskyline\b/i, 'skyline'],
  [/\b(thousand|hundred) (people|tickets|fans)\b|\bsold out\b|\bthe crowd\b|\bthe stands\b|\barena chants\b/i, 'crowd'],
  [/\bbleachers?\b|\bbarn\b/i, 'bleachers'],
  [/\bsoup\b|\bstove\b|\bthe pot\b|\bboiling\b|\bsteam\b/i, 'steam'],
  [/\bcameras?\b|\bpress\b|\bphotograph(s|ers)?\b|\bjumbotron\b/i, 'cameras'],
  [/\bwharf\b|\bboat\b|\blobster\b|\bshediac\b|\bthe sea\b|\bmarie-anne\b/i, 'sea'],
  [/\bneon\b|\bmain street\b|\bvegas\b|\bthe sign says\b/i, 'neon'],
  [/\bambulance\b|\bthe police\b|\bsirens?\b/i, 'sirens'],
];

/** What a narrated line puts on screen (at most three things, in the order they're mentioned). */
export function sceneryTags(text: string): SceneryTag[] {
  const hits: { at: number; tag: SceneryTag }[] = [];
  for (const [re, tag] of READ) {
    const m = re.exec(text);
    if (m) hits.push({ at: m.index, tag });
  }
  return hits.sort((a, b) => a.at - b.at).map((h) => h.tag).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);
}

/**
 * Draw the establishing details over the room (world coords, the floor at `floor`). `k` fades it
 * in (0..1); `t` is the scene clock. Background things (skyline, sea, bleachers) go on `back`,
 * everything in the air or the foreground on `front`.
 */
export function drawScenery(back: Graphics, front: Graphics, tags: SceneryTag[], t: number, k: number, w: number, h: number, floor: number): void {
  if (k <= 0) return;
  for (const tag of tags) {
    switch (tag) {
      case 'rain':
        for (let i = 0; i < 140; i++) front.rect(((i * 97 + t * 260) % (w + 60)) - 30, (i * 53 + t * 420) % h, 1, 6).fill({ color: 0xa8c0d8, alpha: 0.38 * k });
        break;
      case 'snow':
        for (let i = 0; i < 70; i++) front.rect(((i * 97 + Math.sin(t + i) * 10) % w), (i * 53 + t * 26) % h, 2, 2).fill({ color: 0xffffff, alpha: 0.6 * k });
        break;
      case 'storm': {
        for (let i = 0; i < 160; i++) front.rect(((i * 89 + t * 520) % (w + 120)) - 60, (i * 61 + t * 480) % h, 2, 5).fill({ color: 0xc0d0e0, alpha: 0.35 * k });
        if (Math.sin(t * 1.7) > 0.985) front.rect(0, 0, w, h).fill({ color: 0xffffff, alpha: 0.35 * k });
        break;
      }
      case 'goat': {
        // Commissioner Pete ambles across the front of the shot, stops to chew, carries on
        const x = ((t * 18) % (w + 80)) - 40;
        const y = floor + 2;
        const bob = Math.round(Math.abs(Math.sin(t * 6)) * 1);
        front.rect(x, y - 14 - bob, 18, 8).fill({ color: 0xe8e0d0, alpha: k }).rect(x + 15, y - 19 - bob, 7, 6).fill({ color: 0xe8e0d0, alpha: k });
        front.rect(x + 20, y - 21 - bob, 1, 3).fill({ color: 0x5a4a3a, alpha: k }).rect(x + 17, y - 21 - bob, 1, 3).fill({ color: 0x5a4a3a, alpha: k });
        front.rect(x + 21, y - 14 - bob, 1, 3).fill({ color: 0xd8d0c0, alpha: k }); // the beard
        for (const lx of [1, 5, 12, 16]) front.rect(x + lx, y - 6, 2, 6).fill({ color: 0xc8c0b0, alpha: k });
        front.rect(x - 2, y - 14 - bob, 3, 2).fill({ color: 0xe8e0d0, alpha: k });
        front.circle(x + 20, y - 17 - bob, 0.8).fill({ color: 0x141010, alpha: k });
        break;
      }
      case 'trailer': {
        const x = w - ((t * 30) % (w + 180));
        back.rect(x, floor - 44, 120, 34).fill({ color: 0x8a8a90, alpha: 0.8 * k }).rect(x + 4, floor - 40, 20, 8).fill({ color: 0x2a2a30, alpha: 0.8 * k });
        back.rect(x + 120, floor - 30, 40, 20).fill({ color: 0x6a2020, alpha: 0.8 * k });
        for (const wx of [20, 96, 140]) back.circle(x + wx, floor - 8, 6).fill({ color: 0x141414, alpha: 0.9 * k });
        break;
      }
      case 'skyline':
        for (let i = 0; i < 26; i++) {
          const bx = i * 20 - 10;
          const bh = 30 + ((i * 37) % 60);
          back.rect(bx, floor - 70 - bh, 16, bh).fill({ color: 0x1a2030, alpha: 0.55 * k });
          for (let j = 0; j < 6; j++) if ((i * 7 + j * 3) % 4 === 0) back.rect(bx + 3 + (j % 2) * 7, floor - 66 - bh + Math.floor(j / 2) * 10, 3, 3).fill({ color: 0xf0d080, alpha: (0.5 + 0.3 * Math.sin(t + i + j)) * k });
        }
        break;
      case 'crowd':
        // heads and shoulders in the foreground, the backs of the front row
        for (let i = 0; i < 26; i++) {
          const cx = i * 19 + ((i * 7) % 9);
          const cy = h - 6 + Math.round(Math.sin(t * 4 + i) * (i % 3 === 0 ? 2 : 0.5));
          front.ellipse(cx, cy, 10, 8).fill({ color: 0x0c0a10, alpha: 0.92 * k }).circle(cx, cy - 10, 6).fill({ color: 0x14101a, alpha: 0.95 * k });
          if (i % 5 === 0 && Math.sin(t * 3 + i) > 0.5) front.rect(cx + 4, cy - 26, 2, 12).fill({ color: 0x14101a, alpha: 0.95 * k }); // a fist up
        }
        break;
      case 'bleachers':
        for (let r = 0; r < 4; r++) back.rect(0, floor - 60 + r * 10, w, 3).fill({ color: 0x6a5032, alpha: 0.5 * k });
        break;
      case 'steam':
        for (let i = 0; i < 7; i++) {
          const p = (t * 0.35 + i / 7) % 1;
          front.circle(80 + (i % 3) * 140 + Math.sin(t + i) * 8, floor - 60 - p * 70, 4 + p * 7).fill({ color: 0xffffff, alpha: 0.12 * (1 - p) * k });
        }
        break;
      case 'cameras':
        if (Math.sin(t * 7.3) > 0.82 || Math.sin(t * 5.1 + 2) > 0.9) {
          const px = (Math.floor(t * 3) * 131) % w;
          front.circle(px, h - 40, 3).fill({ color: 0xffffff, alpha: k }).circle(px, h - 40, 16).fill({ color: 0xffffff, alpha: 0.12 * k });
        }
        break;
      case 'sea':
        for (let r = 0; r < 5; r++) back.rect(0, floor - 26 + r * 5, w, 5).fill({ color: [0x1e3a5a, 0x22466a, 0x1a3450, 0x284e72, 0x1e3a5a][r], alpha: 0.65 * k });
        for (let i = 0; i < 18; i++) back.rect((i * 31 + t * 12) % w, floor - 25 + (i % 5) * 5, 6, 1).fill({ color: 0xc0d8e8, alpha: 0.4 * k });
        {
          const bx = 300 + Math.sin(t * 0.6) * 10;
          const by = floor - 30 + Math.sin(t * 1.3) * 2;
          back.poly([bx, by, bx + 50, by, bx + 42, by + 9, bx + 6, by + 9]).fill({ color: 0xd8d0c0, alpha: 0.8 * k }).rect(bx + 18, by - 12, 14, 12).fill({ color: 0xb8b0a0, alpha: 0.8 * k });
        }
        break;
      case 'neon':
        for (let i = 0; i < 5; i++) back.rect(30 + i * 90, 20 + (i % 2) * 12, 50, 4).fill({ color: [0xff4ad0, 0x4ad0e0, 0xf0a03a][i % 3], alpha: (0.35 + 0.25 * Math.sin(t * 3 + i)) * k });
        break;
      case 'sirens': {
        const red = Math.sin(t * 8) > 0;
        front.rect(0, 0, w, h).fill({ color: red ? 0xff2030 : 0x2050ff, alpha: 0.07 * k });
        break;
      }
    }
  }
}
