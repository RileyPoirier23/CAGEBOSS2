/**
 * CAGE BOSS II's panel: dark steel with the corners cut, a blood-red rule along the top, a sodium
 * glint on the edge and faint scanlines. The sequel's answer to game 1's newsprint `paper()`.
 */
import { Container, Graphics } from 'pixi.js';
import { II, chamfer } from '../theme';

export function panel2(w: number, h: number, opts: { accent?: number; alpha?: number } = {}): Container {
  const c = new Container();
  const accent = opts.accent ?? II.blood;
  c.addChild(new Graphics().poly(chamfer(w, h, 5).map((v, i) => v + (i % 2 ? 3 : 3))).fill({ color: 0x000000, alpha: 0.45 }));
  const g = new Graphics();
  g.poly(chamfer(w, h, 5)).fill({ color: II.panel, alpha: opts.alpha ?? 0.97 }).stroke({ color: II.edge, width: 1 });
  for (let y = 4; y < h - 2; y += 3) g.rect(2, y, w - 4, 1).fill({ color: 0xffffff, alpha: 0.018 });
  g.rect(5, 0, w - 10, 2).fill(accent).rect(5, 2, Math.round((w - 10) * 0.35), 1).fill(II.sodium);
  g.rect(w - 1, 5, 1, Math.round(h * 0.3)).fill({ color: II.sodium, alpha: 0.5 });
  c.addChild(g);
  return c;
}
