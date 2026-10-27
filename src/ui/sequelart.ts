/**
 * Art for CAGE BOSS II. Everything is drawn from rectangles and lines so it
 * stays in the same 24-colour, hard-edged world as the first game.
 */
import { Container, Graphics } from 'pixi.js';
import { PAL, shade } from '../art/palette';
import { box, text, button } from './kit';
import type { SeqVenue } from '../sequel/data';

function rnd(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function crowd(g: Graphics, w: number, h: number, seed: number, color: number, rows = 3): void {
  const r = rnd(seed);
  for (let row = 0; row < rows; row++) {
    const base = h - 4 - row * 9;
    for (let x = -4 + row * 3; x < w + 6; x += 5 + row) {
      const hh = 7 + Math.floor(r() * 8);
      g.rect(x, base - hh, 4, hh).fill(color);
      g.circle(x + 2, base - hh - 2, 2).fill(color);
    }
  }
}

function cage(g: Graphics, w: number, h: number): void {
  const top = Math.round(h * 0.54);
  // posts
  for (const x of [4, Math.round(w / 2) - 1, w - 6]) g.rect(x, top - 2, 2, h - top + 2).fill({ color: 0x777078, alpha: 0.5 });
  // mesh
  for (let x = 0; x < w; x += 11) g.rect(x, top, 1, h - top).fill({ color: 0x8a8a92, alpha: 0.13 });
  for (let y = top; y < h; y += 11) g.rect(0, y, w, 1).fill({ color: 0x8a8a92, alpha: 0.13 });
  // top rail
  g.rect(0, top - 3, w, 2).fill({ color: 0xa8a8b0, alpha: 0.35 });
  // canvas
  g.rect(0, h - 7, w, 7).fill({ color: PAL.paper, alpha: 0.35 });
}

function stringLights(g: Graphics, w: number, h: number, seed: number, color: number): void {
  const r = rnd(seed);
  for (let x = 16; x < w; x += 26) {
    const sag = 6 + r() * 7;
    g.rect(x, 8, 1, 18 + sag).fill({ color: 0x3a343c, alpha: 0.9 });
    g.circle(x, 27 + sag, 2).fill({ color, alpha: 0.95 });
    g.circle(x, 27 + sag, 5).fill({ color, alpha: 0.08 });
  }
}

export function seqVenueArt(kind: SeqVenue['art'], w: number, h: number, seed = 1): Graphics {
  const g = new Graphics();
  const r = rnd(seed + kind.length * 7);
  // base
  g.rect(0, 0, w, h).fill(0x15121a);
  switch (kind) {
    case 'warehouse': {
      g.rect(0, 0, w, h).fill(0x1a171d);
      for (let y = 0; y < h - 26; y += 7) {
        for (let x = (y / 7) % 2 ? -6 : 0; x < w; x += 14) {
          g.rect(x + 1, y + 1, 12, 5).fill(shade(0x3a2a2a, (r() - 0.5) * 0.16));
        }
      }
      // roller door and faded sign
      g.rect(w * 0.62, 26, w * 0.22, h * 0.4).fill(0x2a2430).rect(w * 0.62, 28, w * 0.22, 2).fill(0x3a3440);
      g.rect(w * 0.15, 20, 72, 17).fill({ color: 0x0f0d12, alpha: 0.7 }).rect(w * 0.15, 20, 72, 1).fill(0x4a3a2a);
      stringLights(g, w, h, seed, 0xffd890);
      break;
    }
    case 'vfw': {
      g.rect(0, 0, w, h).fill(0x2e2720);
      // wood panels
      for (let y = 0; y < h - 30; y += 9) g.rect(0, y, w, 1).fill({ color: 0x3c3228, alpha: 0.8 });
      for (let x = 0; x < w; x += 48) g.rect(x, 0, 1, h - 30).fill({ color: 0x241e19, alpha: 0.6 });
      // flags and a bingo board
      g.poly([10, 8, 34, 8, 34, 30, 22, 34, 10, 30]).fill(0x6a1e1e);
      g.rect(12, 12, 20, 3).fill(0xc4c0c8).rect(12, 18, 20, 3).fill(0xc4c0c8);
      g.rect(w - 54, 8, 38, 28).fill(0x1a1a20).stroke({ color: 0x8a7a5a, width: 1 });
      for (let i = 0; i < 6; i++) g.rect(w - 50 + (i % 3) * 11, 12 + Math.floor(i / 3) * 10, 8, 7).fill(0x3a3a42);
      g.rect(0, h - 32, w, 32).fill(0x14121a);
      break;
    }
    case 'rink': {
      g.rect(0, 0, w, h).fill(0x1e2630);
      for (let y = 0; y < h - 28; y += 16) g.rect(0, y, w, 1).fill({ color: 0x2a3644, alpha: 0.8 });
      // wall stripes and a skate-wheel mural
      g.rect(0, 18, w, 4).fill(0x8e3a52).rect(0, 24, w, 1).fill(0xe0c060);
      for (let i = 0; i < 3; i++) {
        const x = 30 + i * 52;
        g.circle(x, 54, 12).stroke({ color: 0x4c7470, width: 2 });
        g.circle(x, 54, 4).fill(0x4c7470);
      }
      // disco ball
      g.rect(w / 2 - 1, 0, 2, 18).fill(0x6a6a72);
      g.circle(w / 2, 24, 9).fill(0x9a9aa8);
      for (let i = 0; i < 6; i++) g.rect(w / 2 - 6 + (i % 3) * 4, 19 + Math.floor(i / 3) * 5, 2, 2).fill(0xe8e8f0);
      g.rect(0, h - 30, w, 30).fill(0x20283a);
      for (let x = 0; x < w; x += 18) g.rect(x, h - 30, 1, 30).fill({ color: 0x3a4a62, alpha: 0.5 });
      break;
    }
    case 'theater': {
      g.rect(0, 0, w, h).fill(0x1c1214);
      // curtains
      for (let x = 0; x < w; x += 13) {
        g.poly([x, 0, x + 13, 0, x + 9, h - 34, x + 4, h - 34]).fill(shade(0x5e1a22, (r() - 0.5) * 0.2));
      }
      g.rect(0, h - 36, w, 36).fill(0x2a1a1c);
      g.rect(0, h - 38, w, 3).fill(0xc4a04a);
      for (let x = 10; x < w; x += 22) g.circle(x, h - 33, 2).fill({ color: 0xffe8b0, alpha: 0.7 });
      // stage signs
      g.rect(w / 2 - 30, 10, 60, 10).fill(0x0e0a0c).rect(w / 2 - 30, 10, 60, 1).fill(0xc4a04a);
      break;
    }
    case 'casino': {
      g.rect(0, 0, w, h).fill(0x241a1a);
      // carpet pattern
      for (let y = 40; y < h - 26; y += 10) {
        for (let x = (y / 10) % 2 ? 0 : 8; x < w; x += 16) {
          g.rect(x, y, 5, 2).fill({ color: 0x8e2f2f, alpha: 0.5 });
          g.rect(x + 2, y - 2, 1, 6).fill({ color: 0xc4a04a, alpha: 0.4 });
        }
      }
      // gold columns
      for (const x of [12, w - 20]) g.rect(x, 0, 8, h - 26).fill(0x4a3a22).rect(x + 2, 0, 1, h - 26).fill(0xc4a04a);
      // chandelier
      g.rect(w / 2 - 1, 0, 2, 12).fill(0x6a5a3a);
      for (let i = 0; i < 5; i++) g.rect(w / 2 - 14 + i * 6, 12, 2, 5).fill(0xffe8b0);
      g.circle(w / 2, 16, 9).fill({ color: 0xffe8b0, alpha: 0.1 });
      g.rect(0, h - 28, w, 28).fill(0x181014);
      break;
    }
    case 'dome':
    default: {
      g.rect(0, 0, w, h).fill(0x101018);
      // spotlight beams
      for (const x of [w * 0.18, w * 0.5, w * 0.82]) {
        g.poly([x - 4, 0, x + 4, 0, x + 50, h * 0.62, x - 50, h * 0.62]).fill({ color: 0xfff2c8, alpha: 0.05 });
      }
      // big screen
      g.rect(w / 2 - 46, 16, 92, 30).fill(0x0a0a10).stroke({ color: 0x3a3a44, width: 1 });
      g.rect(w / 2 - 40, 22, 80, 18).fill({ color: 0x1e2a3a, alpha: 0.8 });
      stringLights(g, w, h, seed, 0xffe8b0);
      break;
    }
  }
  crowd(g, w, h, seed + 17, kind === 'dome' ? 0x0c0c12 : 0x0e0c12, kind === 'dome' ? 4 : 3);
  cage(g, w, h);
  return g;
}

/** A billboard on the title street. Caller positions it. */
export function sequelBillboard(onPlay: () => void, label = 'PLAY NOW'): Container {
  const c = new Container();
  const w = 168;
  const h = 96;
  c.addChild(box(w, h, 0x120e16, PAL.gold, { shadow: true, bevel: true }));
  // chain-link texture
  for (let x = 4; x < w - 4; x += 8) c.addChild(new Graphics().rect(x, 4, 1, h - 8).fill({ color: 0xffffff, alpha: 0.03 }));
  const glow = new Graphics().rect(4, 4, w - 8, 2).fill({ color: 0xffe8b0, alpha: 0.5 });
  c.addChild(glow);
  c.addChild(text('A CAGE BOSS STORY', 6, 6, { small: true, color: PAL.ash }));
  c.addChild(text('CAGE', 6, 14, { scale: 3, color: PAL.blood, shadow: PAL.ink }));
  c.addChild(text('BOSS', 6, 42, { scale: 3, color: PAL.blood, shadow: PAL.ink }));
  c.addChild(text('II', 120, 26, { scale: 3, color: PAL.gold, shadow: PAL.ink }));
  c.addChild(text('THE BUYBACK', 6, 68, { small: true, color: PAL.gold }));
  c.addChild(button(label, 6, 78, w - 12, 14, onPlay, { small: true, fill: PAL.blood, border: PAL.gold }));
  return c;
}

/** The warehouse exterior, at night, after the buyout. */
export function seqTitleBackdrop(w: number, h: number): Graphics {
  const g = new Graphics();
  const r = rnd(7717);
  // sky
  for (let y = 0; y < h; y += 3) g.rect(0, y, w, 3).fill(shade(0x0a0810, (y / h) * 0.1));
  // moon
  g.circle(w - 52, 34, 13).fill(0xe8e4d0).circle(w - 47, 31, 12).fill(0x100c18);
  // far skyline
  for (let x = 0; x < w; x += 14) {
    const bh = 34 + Math.floor(r() * 52);
    g.rect(x, h * 0.55 - bh, 13, bh).fill(0x141018);
    for (let wy = h * 0.55 - bh + 4; wy < h * 0.55 - 4; wy += 7) {
      if (r() > 0.55) g.rect(x + 3, wy, 2, 2).fill({ color: 0xffd890, alpha: 0.4 });
    }
  }
  // the warehouse
  const bx = Math.round(w * 0.42);
  const by = Math.round(h * 0.42);
  const bw = Math.round(w * 0.5);
  g.rect(bx, by, bw, h - by - 8).fill(0x241e26);
  g.poly([bx - 8, by, bx + bw + 8, by, bx + bw, by - 14, bx, by - 14]).fill(0x2c2530);
  for (let x = bx + 4; x < bx + bw; x += 9) g.rect(x, by + 4, 1, h - by - 12).fill({ color: 0x1a151c, alpha: 0.6 });
  // door with a single yellow bulb
  const dx = bx + Math.round(bw * 0.12);
  g.rect(dx, by + 38, 40, h - by - 46).fill(0x121016).rect(dx + 2, by + 40, 36, 1).fill(0x3a303c);
  g.circle(dx + 20, by + 34, 3).fill(0xffd890);
  g.circle(dx + 20, by + 34, 9).fill({ color: 0xffd890, alpha: 0.08 });
  // faded sign
  g.rect(dx - 2, by + 14, 120, 17).fill(0x0e0c12).rect(dx - 2, by + 14, 120, 1).fill(0x5a3a2a);
  // graffiti
  g.rect(bx + bw - 54, by + 62, 34, 3).fill({ color: 0x8e2f2f, alpha: 0.7 });
  g.rect(bx + bw - 50, by + 68, 26, 3).fill({ color: 0x8e2f2f, alpha: 0.7 });
  g.rect(bx + bw - 46, by + 74, 18, 3).fill({ color: 0x8e2f2f, alpha: 0.7 });
  // puddles
  for (let i = 0; i < 5; i++) {
    const px = 18 + r() * (w - 36);
    const py = h - 12 - r() * 18;
    g.ellipse(px, py, 12 + r() * 20, 2 + r() * 2).fill({ color: 0x2a2a3a, alpha: 0.5 });
    g.rect(px - 4, py - 1, 8, 1).fill({ color: 0xffd890, alpha: 0.15 });
  }
  // foreground fence
  for (let x = -2; x < w; x += 7) g.rect(x, h - 34, 1, 34).fill({ color: 0x3a3a44, alpha: 0.55 });
  for (let y = h - 34; y < h; y += 7) g.rect(0, y, w, 1).fill({ color: 0x3a3a44, alpha: 0.55 });
  g.rect(0, h - 36, w, 2).fill({ color: 0x4a4a54, alpha: 0.8 });
  // street
  g.rect(0, h - 8, w, 8).fill(0x0c0a10);
  return g;
}

/** Rain streaks for the title. */
export function seqRain(w: number, h: number, t: number): Graphics {
  const g = new Graphics();
  let s = 991;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 90; i++) {
    const x = (r() * w + t * 40) % w;
    const y = (r() * h + t * (130 + r() * 90)) % h;
    g.rect(Math.round(x), Math.round(y), 1, 3).fill({ color: 0x8aa2b8, alpha: 0.35 });
  }
  return g;
}

/** The story mode's office: the warehouse, a lamp, and a vignette that knows what is coming. */
export function storyBackdrop(w: number, h: number, seed: number): Container {
  const c = new Container();
  c.addChild(seqVenueArt('warehouse', w, h, seed));
  const g = new Graphics();
  // a warm cone over the desk, dust in it
  g.poly([96, 0, 126, 0, 210, h, 12, h]).fill({ color: 0xffd890, alpha: 0.035 });
  for (let k = 0; k < 26; k++) g.rect((k * 71) % w, (k * 43) % h, 1, 1).fill({ color: 0xffe0a0, alpha: 0.2 });
  // vignette
  for (let k = 0; k < 10; k++) {
    g.rect(k * 2, 0, 2, h).fill({ color: 0x000000, alpha: 0.035 });
    g.rect(w - k * 2 - 2, 0, 2, h).fill({ color: 0x000000, alpha: 0.035 });
    g.rect(0, k * 2, w, 2).fill({ color: 0x000000, alpha: 0.035 });
    g.rect(0, h - k * 2 - 2, w, 2).fill({ color: 0x000000, alpha: 0.035 });
  }
  c.addChild(g);
  return c;
}
