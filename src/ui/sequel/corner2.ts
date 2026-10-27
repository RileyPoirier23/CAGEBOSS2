/**
 * CAGE BOSS II's corner: a close-up of your fighter's face, swollen and cut exactly where the
 * shots landed (the engine keeps the face zone by zone). You have the minute between rounds:
 *
 *   ENSWELL  stroke it across a swelling, firm but not crushing (the pressure meter)
 *   ICE      hold it on a swelling or the nose: slower, can't go wrong
 *   GAUZE    press it on a cut, in the band, until it stops bleeding
 *   VASELINE once the bleeding stops, stroke it over the cut to seal it (sealed cuts don't reopen)
 *
 * Whatever you leave carries into the next round: a swollen eye takes the next shot harder, a
 * busted nose breathes worse, an open cut brings the doctor. SIM works the face for a C (65%).
 */
import { Container, Graphics, Ticker } from 'pixi.js';
import type { Game } from '../app';
import type { Fighter, Wounds } from '../../core/types';
import type { GamePlan } from '../../sim/fight';
import { PLANS } from '../../sim/fighter';
import { FACE_ZONES, type FaceSpot, type FaceZone, type LiveFight, type Side } from '../../sim/live';
import { gradeFor } from '../../sequel/story';
import { PAL, shade, lerpColor } from '../../art/palette';
import { W, H, SW, OX, text, box, button } from '../kit';
import { lookFor } from '../rig';
import { II } from '../theme';
import { input } from '../../core/input';
import { setPadUiMode } from '../controller';
import { sfx } from '../../audio/sfx';
import { isTouchDevice } from '../../core/platform';

type Tool = 'enswell' | 'ice' | 'gauze' | 'vaseline';
const TOOLS: { id: Tool; name: string; color: number }[] = [
  { id: 'enswell', name: 'ENSWELL', color: 0xb8bcc4 },
  { id: 'ice', name: 'ICE', color: 0x6fb3d9 },
  { id: 'gauze', name: 'GAUZE', color: 0xf2efe8 },
  { id: 'vaseline', name: 'VASELINE', color: 0xe8d090 },
];
const ZONE_NAME: Record<FaceZone, string> = { browL: 'LEFT BROW', browR: 'RIGHT BROW', eyeL: 'LEFT EYE', eyeR: 'RIGHT EYE', nose: 'NOSE', mouth: 'MOUTH' };

/** The face, big: centre, half-width, half-height (design pixels). */
const CX = 168;
const CY = 136;
const RX = 60;
const RY = 76;
/** His left is on your right. */
const ZPOS: Record<FaceZone, [number, number]> = {
  browL: [CX + 24, CY - 26], browR: [CX - 24, CY - 26], eyeL: [CX + 24, CY - 12], eyeR: [CX - 24, CY - 12], nose: [CX, CY + 10], mouth: [CX, CY + 36],
};

export interface Corner2Opts {
  f: Fighter;
  L: LiveFight;
  side: Side;
  tier: number;
  round: number;
  coach: string;
  scoreGuess?: string;
  /** who's working the corner (Ray at Ray's, the cutman everywhere else) */
  cutman?: string;
  done: (aid: number, plan: GamePlan) => void;
}

export function openCorner2(g: Game, o: Corner2Opts): void {
  const frame = new Container();
  const wrap = g.modal(frame, { dim: 0.92 });
  setPadUiMode('game');
  const face = o.L.face[o.side];
  const start: Record<FaceZone, FaceSpot> = Object.fromEntries(FACE_ZONES.map((z) => [z, { ...face[z] }])) as Record<FaceZone, FaceSpot>;
  const work = FACE_ZONES.filter((z) => start[z].swell > 0.06 || start[z].cut > 0.05);
  const look = lookFor(o.f, 0);
  const skin = look.skin;
  const hair = look.hairColor;
  const who = o.cutman ?? 'CUTMAN';
  let answered = false;
  let ended = false;

  // how much there was to do, and how much got done (swelling down, bleeding stopped, cuts sealed)
  const todo = (z: FaceZone) => start[z].swell + start[z].cut + (start[z].cut > 0.05 ? 1 - start[z].seal : 0);
  const doneOf = (z: FaceZone) => (start[z].swell - face[z].swell) + (start[z].cut - face[z].cut) + (start[z].cut > 0.05 ? face[z].seal - start[z].seal : 0);
  const pct = () => {
    const t = work.reduce((a, z) => a + todo(z), 0);
    return t <= 0 ? 90 : Math.round(Math.max(0, Math.min(1, work.reduce((a, z) => a + doneOf(z), 0) / t)) * 100);
  };

  const finish = (simmed: boolean) => {
    if (ended) return;
    ended = true;
    Ticker.shared.remove(tick);
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    setPadUiMode('cursor');
    const p = simmed ? 65 : pct();
    const aid = Math.max(0.15, Math.min(1, p / 100));
    // the fight keeps what you did: the face, the doctor's view of the cuts, the portrait
    o.L.faceWorked[o.side] = true;
    const left = FACE_ZONES.reduce((a, z) => a + face[z].cut, 0);
    o.L.F[o.side].cut = Math.min(o.L.F[o.side].cut, Math.round(left * 2.2));
    o.f.wounds = woundsOf();
    plan(p, aid, simmed);
  };

  const sim = () => {
    for (const z of work) {
      const s = face[z];
      s.swell = start[z].swell * 0.35;
      s.cut = start[z].cut * 0.35;
      if (start[z].cut > 0.05) s.seal = start[z].seal + (1 - start[z].seal) * 0.65;
    }
    finish(true);
  };

  const woundsOf = (): Wounds => {
    const sw = FACE_ZONES.filter((z) => z !== 'mouth' && face[z].swell > 0.25);
    const cuts = FACE_ZONES.filter((z) => face[z].cut > 0.08).length;
    return {
      swelling: Math.min(3, Math.ceil(FACE_ZONES.reduce((a, z) => a + face[z].swell, 0) * 1.5)),
      blackEye: Math.min(2, sw.filter((z) => z.startsWith('eye')).length),
      cuts: Math.min(2, cuts),
      bandages: FACE_ZONES.some((z) => start[z].cut > 0.05 && face[z].seal > 0.5) ? 1 : 0,
      noseBleed: face.nose.cut > 0.1 || face.nose.swell > 0.55,
    };
  };

  // ---------------------------------------------------------------- the plan for next round
  const plan = (p: number, aid: number, simmed: boolean) => {
    frame.removeChildren().forEach((c) => c.destroy({ children: true }));
    const bw = 430;
    const bh = 240;
    const bx = Math.round((W - bw) / 2);
    const by = Math.round((H - bh) / 2);
    frame.addChild(box(bw, bh, 0x120c10, II.edge, { bevel: true })).position.set(bx, by);
    const grade = gradeFor(p);
    frame.addChild(text(grade, bx + bw - 34, by + 8, { scale: 3, color: grade === 'S' || grade === 'A' ? PAL.moss : grade === 'F' || grade === 'D' ? PAL.blood : II.gold }));
    frame.addChild(text(`ROUND ${o.round + 1}: WHAT'S THE PLAN?`, bx + 8, by + 6, { color: II.gold }));
    frame.addChild(text(`${simmed ? 'Simmed corner' : 'Corner work'}: ${p}%. ${p >= 85 ? 'He feels brand new.' : p >= 60 ? 'Patched up, mostly.' : "He's going out there leaking."}`, bx + 8, by + 18, { small: true, color: p >= 60 ? PAL.moss : PAL.ember }));
    // what goes out there with him
    const notes = work.map((z) => {
      const s = face[z];
      const bits = [s.swell > 0.5 ? 'still swollen' : s.swell > 0.2 ? 'puffy' : '', s.cut > 0.1 ? 'still bleeding' : start[z].cut > 0.05 ? (s.seal > 0.6 ? 'sealed' : 'closed, not greased') : ''].filter(Boolean);
      return `${ZONE_NAME[z]}: ${bits.join(', ') || 'good'}`;
    });
    frame.addChild(text(notes.join('   ') || 'Clean face. Somebody tell him to keep it that way.', bx + 8, by + 30, { small: true, width: bw - 50, color: PAL.ash, maxLines: 2 }));
    frame.addChild(text(`${who}: "${o.coach}"`, bx + 8, by + 50, { small: true, width: bw - 16, color: PAL.bone, maxLines: 2 }));
    if (o.scoreGuess) frame.addChild(text(`Cards: ${o.scoreGuess}`, bx + 8, by + 70, { small: true, color: PAL.ash }));
    PLANS.forEach((pl, i) => {
      const x = bx + 8 + (i % 2) * 210;
      const y = by + 84 + Math.floor(i / 2) * 38;
      frame.addChild(button(pl.name, x, y, 202, 16, () => {
        answered = true;
        g.closeModal(wrap);
        sfx('click');
        o.done(aid, pl.id);
      }, { small: true, fill: pl.id === 'survive' ? PAL.shadow : II.blood, border: II.sodium }));
      frame.addChild(text(pl.text, x + 2, y + 19, { small: true, width: 198, color: PAL.ash, maxLines: 2 }));
    });
  };

  if (!work.length) {
    ended = true;
    setPadUiMode('cursor');
    o.L.faceWorked[o.side] = true;
    plan(90 + o.tier * 3, 0.9 + o.tier * 0.03, false);
    wrap.once('destroyed', () => {
      if (!answered) {
        answered = true;
        o.done(0.6, 'balanced');
      }
    });
    return;
  }

  // ---------------------------------------------------------------- the corner
  const bg = new Graphics();
  bg.rect(-OX, 0, SW, H).fill(0x0c080c);
  // the corner post and its pad, the ropes behind his head, the lights
  bg.rect(CX - 120, 0, 18, H).fill(0x2a2228).rect(CX - 124, 40, 26, 60).fill(II.blood).rect(CX - 124, 40, 26, 3).fill(shade(II.blood, 0.3));
  for (const [y, c] of [[70, 0x8a1a1a], [118, 0xb8b0a0], [166, 0x1a2a6a]] as const) bg.rect(-OX, y, SW, 3).fill(c).rect(-OX, y + 3, SW, 1).fill({ color: 0x000000, alpha: 0.5 });
  for (let i = 0; i < 90; i++) bg.rect((i * 53) % W, (i * 37) % 60, 2, 2).fill({ color: [0xffffff, 0xd8c070][i % 2], alpha: 0.2 });
  frame.addChild(bg);
  const head = new Graphics();
  const fx = new Graphics();
  const hand = new Graphics();
  const hud = new Container();
  for (const c of [head, fx, hand, hud]) c.eventMode = 'none';
  frame.addChild(head, fx, hud, hand);

  let tool: Tool = start[work[0]].cut > 0.05 ? 'gauze' : 'enswell';
  const band = 0.22 + o.tier * 0.06;
  const bandLo = 0.55 - band / 2;
  const bandHi = 0.55 + band / 2;
  let time = 12 + o.tier * 3;
  let pressure = 0;
  let holdMouse = false;
  let holdKey = false;
  let tx = CX + 90;
  let ty = CY;
  let px = tx;
  let py = ty;
  let msg = `${who}: "Sit. Breathe. Let me look at you."`;
  let t = 0;
  let blink = 2;
  /** blood running down from each cut (how far it's got), and drips off the chin */
  const run: Record<FaceZone, number> = Object.fromEntries(FACE_ZONES.map((z) => [z, start[z].cut > 0.05 ? 20 + start[z].cut * 30 : 0])) as Record<FaceZone, number>;
  const drips: { x: number; y: number; vy: number; life: number }[] = [];

  const hit = new Graphics().rect(-OX, 0, SW, H).fill({ color: 0xffffff, alpha: 0.001 });
  hit.eventMode = 'static';
  hit.cursor = 'none';
  const at = (e: { global: { x: number; y: number } }) => {
    const p = frame.toLocal(e.global);
    tx = p.x;
    ty = p.y;
  };
  hit.on('pointermove', at);
  hit.on('pointerdown', (e) => {
    at(e);
    px = tx;
    py = ty;
    holdMouse = true;
  });
  hit.on('pointerup', () => (holdMouse = false));
  hit.on('pointerupoutside', () => (holdMouse = false));
  frame.addChildAt(hit, 1);

  const setTool = (id: Tool) => {
    if (tool !== id) sfx('click');
    tool = id;
  };
  const cycle = (d: number) => setTool(TOOLS[(TOOLS.findIndex((x) => x.id === tool) + d + TOOLS.length) % TOOLS.length].id);
  const keyDown = (e: KeyboardEvent) => {
    if (e.defaultPrevented || g.modals[g.modals.length - 1] !== wrap) return;
    const i = ['1', '2', '3', '4'].indexOf(e.key);
    if (i >= 0) setTool(TOOLS[i].id);
    if (e.key === 'q' || e.key === 'Q') cycle(-1);
    if (e.key === 'e' || e.key === 'E') cycle(1);
    if (e.code === 'Space' || e.key === 'f') holdKey = true;
    if (e.key === 'Escape') sim();
  };
  const keyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.key === 'f') holdKey = false;
  };
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);

  // tool buttons (tap or click) and SIM, made once
  TOOLS.forEach((tl, i) => {
    const b = button(`${i + 1} ${tl.name}`, 330 + (i % 2) * 72, 150 + Math.floor(i / 2) * 18, 68, 15, () => setTool(tl.id), { small: true, fill: 0x1c1418, border: II.edge });
    frame.addChild(b);
  });
  frame.addChild(button('SIM IT (C)', 330, 192, 140, 15, () => sim(), { small: true, fill: II.steel }));

  const nearest = (): FaceZone | null => {
    let best: FaceZone | null = null;
    let bd = 17;
    for (const z of work) {
      const s = face[z];
      if (s.swell <= 0.04 && s.cut <= 0.04 && (start[z].cut <= 0.05 || s.seal >= 0.98)) continue;
      const d = Math.hypot(ZPOS[z][0] - tx, ZPOS[z][1] - ty);
      if (d < bd) {
        bd = d;
        best = z;
      }
    }
    return best;
  };

  // ---------------------------------------------------------------- drawing the face
  const drawHead = () => {
    const h = head;
    h.clear();
    const bob = Math.round(Math.sin(t * 2.2) * 1.2); // he's breathing hard
    const y = CY + bob;
    const dark = shade(skin, -0.22);
    // neck and traps, shoulders
    h.rect(CX - 34, y + 54, 68, 40).fill(dark).poly([CX - 34, y + 70, CX - 110, y + 98, CX - 110, H, CX + 110, H, CX + 110, y + 98, CX + 34, y + 70]).fill(shade(skin, -0.1));
    // ears
    h.ellipse(CX - RX + 2, y - 4, 9, 15).fill(dark).ellipse(CX + RX - 2, y - 4, 9, 15).fill(dark);
    // the head, the jaw, the cheekbones' shadow
    h.ellipse(CX, y, RX, RY).fill(skin);
    h.ellipse(CX, y + 22, RX - 5, RY - 20).fill(skin);
    h.ellipse(CX - 36, y + 18, 14, 22).fill({ color: dark, alpha: 0.35 }).ellipse(CX + 36, y + 18, 14, 22).fill({ color: dark, alpha: 0.35 });
    // hair: short on top (a fade leaves the sides bare), a beard if he has one
    if (look.hairStyle !== 0) {
      h.ellipse(CX, y - RY + 26, RX - 2, 30).fill(hair);
      h.rect(CX - RX + 2, y - RY + 26, RX * 2 - 4, 14).fill(hair);
      h.ellipse(CX, y - 30, RX - 6, 10).fill(skin);
      if (look.fade) h.rect(CX - RX + 1, y - 34, 6, 22).fill({ color: hair, alpha: 0.35 }).rect(CX + RX - 7, y - 34, 6, 22).fill({ color: hair, alpha: 0.35 });
    }
    if (look.beard > 0) {
      // along the jaw: the lower half of the jaw's curve, up to the cheekbones
      const pts: number[] = [];
      for (let k = 0; k <= 12; k++) {
        const a = (k / 12) * Math.PI;
        pts.push(CX + Math.cos(a) * (RX - 5), y + 22 + Math.sin(a) * (RY - 20));
      }
      pts.push(CX - 24, y + 22, CX - 14, y + 30, CX + 14, y + 30, CX + 24, y + 22);
      h.poly(pts).fill({ color: hair, alpha: 0.85 });
    }
    // sweat
    for (let i = 0; i < 6; i++) h.rect(CX - 40 + i * 15, y - 40 + ((i * 13) % 20), 2, 3).fill({ color: 0xffffff, alpha: 0.35 });
    // brows (a swollen brow pushes down over the eye)
    for (const zz of ['browL', 'browR'] as FaceZone[]) {
      const [bx] = ZPOS[zz];
      const sw = face[zz].swell;
      h.rect(bx - 12, y - 28 + sw * 4, 24, 4).fill(look.brows ?? hair);
    }
    // eyes: they close as they swell
    for (const ez of ['eyeL', 'eyeR'] as FaceZone[]) {
      const [ex] = ZPOS[ez];
      const brow = face[ez === 'eyeL' ? 'browL' : 'browR'].swell;
      const open = Math.max(0, 1 - face[ez].swell * 1.15 - brow * 0.4) * (blink < 0.12 ? 0 : 1);
      const eh = 6;
      h.ellipse(ex, y - 12, 10, eh).fill(0xe8e0d8);
      h.circle(ex + (ez === 'eyeL' ? -2 : 2), y - 12, 3.4).fill(0x2a1a14).circle(ex + (ez === 'eyeL' ? -1 : 3), y - 13, 1).fill(0xffffff);
      // the lid comes down
      const lid = Math.round(eh * 2 * (1 - open));
      if (lid > 0) h.rect(ex - 11, y - 12 - eh, 22, lid).fill(lerpColor(skin, 0x6a2448, Math.min(0.6, face[ez].swell * 0.6)));
      h.rect(ex - 10, y - 12 - eh + lid, 20, 1).fill(shade(skin, -0.4));
    }
    // nose (a busted one spreads)
    const nw = 9 + face.nose.swell * 7;
    h.poly([CX - 3, y - 10, CX + 3, y - 10, CX + nw, y + 14, CX - nw, y + 14]).fill(shade(skin, -0.08));
    h.ellipse(CX - 5, y + 14, 3, 2).fill(0x2a1210).ellipse(CX + 5, y + 14, 3, 2).fill(0x2a1210);
    // mouth: a split lip puffs out
    const lip = face.mouth.swell;
    h.ellipse(CX, y + 36, 16 + lip * 4, 3 + lip * 4).fill(lerpColor(shade(skin, -0.25), 0x8a2a3a, lip * 0.6));
    h.rect(CX - 14, y + 35, 28, 2).fill(0x3a1a1a);
    return y;
  };

  const drawDamage = (y: number, dt: number) => {
    fx.clear();
    const dy = y - CY;
    for (const z of FACE_ZONES) {
      const s = face[z];
      const [zx, zy0] = ZPOS[z];
      const zy = zy0 + dy;
      // swelling: a tight, shiny bulge that grows with it (the mouth's is drawn on the lip)
      if (s.swell > 0.04 && z !== 'mouth') {
        const r = 5 + s.swell * 15 + Math.sin(t * 3 + zx) * 0.4;
        const up = z.startsWith('brow') ? -2 : 3;
        fx.ellipse(zx, zy + up, r * 1.15, r * 0.75).fill({ color: lerpColor(skin, 0x6a2448, 0.35 + s.swell * 0.4), alpha: 0.55 + s.swell * 0.35 });
        fx.ellipse(zx - r * 0.3, zy + up - r * 0.25, r * 0.45, r * 0.22).fill({ color: 0xffffff, alpha: 0.12 + s.swell * 0.18 });
      }
      // a cut: the gash, the blood running down from it, the drips off the chin
      if (start[z].cut > 0.05 || s.cut > 0.05) {
        const len = 6 + Math.max(s.cut, start[z].cut * 0.5) * 12;
        const cy = z.startsWith('brow') ? zy - 4 : zy;
        fx.moveTo(zx - len / 2, cy + 1).lineTo(zx - len / 6, cy - 1).lineTo(zx + len / 6, cy + 1).lineTo(zx + len / 2, cy - 1).stroke({ color: 0x7a0c0c, width: 3 });
        if (s.cut > 0.05) fx.moveTo(zx - len / 2, cy).lineTo(zx + len / 2, cy - 1).stroke({ color: 0xe03a3a, width: 1 });
        if (s.seal > 0.1) fx.moveTo(zx - len / 2 - 2, cy - 2).lineTo(zx + len / 2 + 2, cy - 3).stroke({ color: 0xfff2c0, width: 2, alpha: Math.min(0.7, s.seal * 0.7) });
        // the stream: grows while it bleeds, dries (and gets wiped) when it doesn't
        run[z] = s.cut > 0.08 ? Math.min(CY + RY + 10 - cy, run[z] + s.cut * 26 * dt) : Math.max(0, run[z] - 14 * dt);
        if (run[z] > 1) {
          const sx = zx + (z.endsWith('L') ? 3 : -3);
          const wob = (k: number) => Math.sin(k * 0.21 + zx) * 2;
          let lx = sx;
          let ly = cy + 1;
          for (let k = 2; k <= run[z]; k += 2) {
            const nx = sx + wob(k);
            const ny = cy + 1 + k;
            fx.moveTo(lx, ly).lineTo(nx, ny).stroke({ color: 0x9a1010, width: 2, alpha: 0.85 });
            lx = nx;
            ly = ny;
          }
          if (s.cut > 0.08 && run[z] >= CY + RY + 10 - cy - 1 && Math.random() < s.cut * dt * 6) drips.push({ x: lx, y: ly, vy: 10, life: 1.6 });
        }
      }
    }
    // a bleeding nose: both nostrils
    if (face.nose.cut > 0.08 || face.nose.swell > 0.55) {
      const k = Math.max(face.nose.cut, (face.nose.swell - 0.55) * 1.5);
      fx.rect(CX - 6, y + 15, 2, 6 + k * 12).fill(0x9a1010).rect(CX + 4, y + 15, 2, 4 + k * 10).fill(0x9a1010);
    }
    for (const d of drips) {
      d.y += d.vy * dt;
      d.vy += 60 * dt;
      d.life -= dt;
      fx.rect(Math.round(d.x), Math.round(d.y), 2, 3).fill({ color: 0xa01818, alpha: Math.min(1, d.life) });
    }
    for (let i = drips.length - 1; i >= 0; i--) if (drips[i].life <= 0) drips.splice(i, 1);
  };

  const drawHand = (pressing: boolean) => {
    hand.clear();
    const x = Math.round(tx);
    const y = Math.round(ty) + (pressing ? 2 : 0);
    const tc = TOOLS.find((tl) => tl.id === tool)!.color;
    const GL = 0x2a2a30; // black nitrile gloves
    hand.poly([x + 16, y + 16, x + 48, y + 52, x + 62, y + 42, x + 28, y + 6]).fill(0x3a2a24).stroke({ color: 0x0a0a0a, width: 1 });
    hand.roundRect(x + 4, y - 2, 20, 18, 6).fill(GL).stroke({ color: 0x000000, width: 1 });
    if (tool === 'enswell') hand.roundRect(x - 10, y - 4, 20, 8, 2).fill(tc).rect(x - 10, y - 4, 20, 2).fill(0xe8ecf2);
    else if (tool === 'ice') hand.roundRect(x - 9, y - 7, 18, 13, 4).fill(tc).rect(x - 6, y - 5, 6, 3).fill(0xcfeaf8);
    else if (tool === 'gauze') hand.rect(x - 8, y - 6, 15, 12).fill(tc).rect(x - 8, y - 1, 15, 1).fill(0xd8d2c8);
    else hand.circle(x - 2, y, 5).fill(tc).rect(x + 1, y - 1, 10, 2).fill(0xc8b0a0);
    for (let i = 0; i < 3; i++) hand.roundRect(x + 2 + i * 6, y - 8 + i, 6, 9, 3).fill(GL).stroke({ color: 0x000000, width: 1 });
    if (pressing) hand.circle(x, y, 10).stroke({ color: 0xffffff, width: 1, alpha: 0.4 });
  };

  const drawHud = (target: FaceZone | null) => {
    hud.removeChildren().forEach((c) => c.destroy({ children: true }));
    const px0 = 326;
    hud.addChild(new Graphics().rect(px0, 6, 150, 140).fill({ color: 0x0a0608, alpha: 0.88 }).stroke({ color: II.edge, width: 1 }));
    hud.addChild(text(`THE CORNER  /  ROUND ${o.round}`, px0 + 4, 10, { small: true, color: II.gold }));
    hud.addChild(text(`TIME ${Math.max(0, time).toFixed(1)}`, px0 + 104, 10, { small: true, color: time < 4 ? PAL.blood : PAL.bone }));
    // every zone that needs work: swelling bar, bleeding bar, the seal
    work.forEach((z, i) => {
      const y = 22 + i * 15;
      const s = face[z];
      hud.addChild(text(ZONE_NAME[z], px0 + 4, y, { small: true, color: z === target ? II.gold : PAL.ash }));
      const b = new Graphics();
      b.rect(px0 + 66, y + 1, 36, 3).fill(0x1c1418).rect(px0 + 66, y + 1, 36 * s.swell, 3).fill(0x9a3ac8);
      b.rect(px0 + 66, y + 6, 36, 3).fill(0x1c1418).rect(px0 + 66, y + 6, 36 * s.cut, 3).fill(PAL.blood);
      if (start[z].cut > 0.05) b.rect(px0 + 106, y + 1, 38, 8).fill(0x1c1418).rect(px0 + 106, y + 1, 38 * s.seal, 8).fill(0xd8c070);
      hud.addChild(b);
    });
    hud.addChild(text('SWELL/CUT', px0 + 66, 22 + work.length * 15, { small: true, color: PAL.grey }));
    if (work.some((z) => start[z].cut > 0.05)) hud.addChild(text('SEAL', px0 + 112, 22 + work.length * 15, { small: true, color: PAL.grey }));
    // pressure (gauze and enswell need it in the band)
    const pm = new Graphics();
    pm.rect(px0 + 4, 128, 142, 8).fill(0x1d2a5a).rect(px0 + 4 + 142 * bandLo, 128, 142 * (bandHi - bandLo), 8).fill(0x2aa84a).rect(px0 + 4 + 142 * pressure - 1, 126, 3, 12).fill(0xffffff);
    hud.addChild(pm);
    hud.addChild(text('PRESSURE', px0 + 4, 118, { small: true, color: PAL.ash }));
    // which tool is in your hand
    TOOLS.forEach((tl, i) => {
      if (tl.id === tool) hud.addChild(new Graphics().rect(329 + (i % 2) * 72, 149 + Math.floor(i / 2) * 18, 70, 17).stroke({ color: II.gold, width: 1 }));
    });
    // what the cutman says, and how to work
    hud.addChild(new Graphics().rect(8, 6, 300, 22).fill({ color: 0x000000, alpha: 0.7 }));
    hud.addChild(text(msg, 12, 10, { small: true, width: 292, color: PAL.bone, maxLines: 2 }));
    const how = isTouchDevice() ? 'HOLD ON THE FACE TO WORK. STROKE THE ENSWELL AND VASELINE.' : 'HOLD MOUSE / SPACE TO WORK. STROKE ENSWELL + VASELINE. ESC: SIM';
    hud.addChild(text(how, 8, H - 12, { small: true, color: PAL.grey, width: 310, maxLines: 1 }));
  };

  const wrong = (z: FaceZone): string => {
    const s = face[z];
    if (s.cut > 0.05) return 'GAUZE on the cut first. Press it.';
    if (start[z].cut > 0.05 && s.seal < 0.98) return 'VASELINE. Grease it shut.';
    return z === 'nose' || z === 'mouth' ? 'ICE on that.' : 'ENSWELL. Push it out of the eye.';
  };

  const tick = (tk: Ticker) => {
    if (ended || g.modals[g.modals.length - 1] !== wrap) return;
    const dt = Math.min(0.05, tk.deltaMS / 1000);
    t += dt;
    blink -= dt;
    if (blink < 0) blink = 2.5 + Math.random() * 2;
    input.update();
    const st = input.stick('left');
    tx = Math.max(0, Math.min(W, tx + st.x * 170 * dt));
    ty = Math.max(0, Math.min(H, ty + st.y * 170 * dt));
    if (input.buttonPressed('LB')) cycle(-1);
    if (input.buttonPressed('RB')) cycle(1);
    if (input.buttonPressed('B')) return sim();
    const pressing = holdMouse || holdKey || input.button('Y') || input.button('A');
    const moved = Math.hypot(tx - px, ty - py);
    px = tx;
    py = ty;
    time -= dt;
    pressure = Math.max(0, Math.min(1, pressure + (pressing ? 0.6 : -0.9) * dt));
    const z = nearest();
    const speed = 1 + o.tier * 0.15;
    if (pressing && z) {
      const s = face[z];
      const inBand = pressure >= bandLo && pressure <= bandHi;
      const tooHard = pressure > bandHi;
      if (tool === 'gauze') {
        if (s.cut <= 0.05) msg = wrong(z);
        else if (tooHard) {
          s.swell = Math.min(1, s.swell + dt * 0.08);
          msg = 'Easy! You are opening it up.';
        }
        else if (inBand) {
          s.cut = Math.max(0, s.cut - dt * 0.34 * speed);
          msg = s.cut <= 0.05 ? 'Bleeding stopped. Now grease it.' : 'That is it. Hold it there.';
        }
        else msg = 'More pressure on the gauze.';
      }
      else if (tool === 'vaseline') {
        if (start[z].cut <= 0.05) msg = wrong(z);
        else if (s.cut > 0.05) msg = 'Stop the bleeding first. GAUZE.';
        else {
          s.seal = Math.min(1, s.seal + moved * 0.012 * speed);
          msg = moved > 0.5 ? 'Work it in. Across the cut.' : 'Stroke it across. Don\'t just sit there.';
        }
      }
      else if (tool === 'enswell') {
        if (s.swell <= 0.04) msg = wrong(z);
        else if (tooHard) {
          s.swell = Math.min(1, s.swell + dt * 0.06);
          msg = 'Too hard! Not on the bone.';
        }
        else if (inBand) {
          s.swell = Math.max(0, s.swell - moved * 0.0055 * speed);
          msg = moved > 0.5 ? 'Push it out. Out, away from the eye.' : 'Stroke it. Push the swelling out.';
        }
        else msg = 'Firmer with the enswell.';
      }
      else {
        // ice: slow and safe, on any swelling (best on the nose and the lip)
        if (s.swell <= 0.04) msg = wrong(z);
        else {
          s.swell = Math.max(0, s.swell - dt * (z === 'nose' || z === 'mouth' ? 0.16 : 0.07) * speed);
          msg = 'Cold. Keep it on.';
        }
      }
      if (tooHard && Math.random() < dt * 4) input.rumble(0.3, 0.1, 80);
    }
    else if (pressing) msg = 'Put it on the damage.';
    const y = drawHead();
    drawDamage(y, dt);
    drawHud(z);
    drawHand(pressing);
    const clean = work.every((zz) => face[zz].swell <= 0.04 && face[zz].cut <= 0.04 && (start[zz].cut <= 0.05 || face[zz].seal >= 0.98));
    if (time <= 0 || clean) finish(false);
  };

  // automation hook (tests / tours): the face, the tool, where each zone is
  (window as unknown as { __corner2?: unknown }).__corner2 = {
    face, work, setTool, sim, aim: (x: number, y: number) => { tx = x; ty = y; }, zone: (z: FaceZone) => ZPOS[z], setHold: (v: boolean) => (holdKey = v), get pressure() { return pressure; },
  };
  Ticker.shared.add(tick);
  wrap.once('destroyed', () => {
    Ticker.shared.remove(tick);
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    setPadUiMode('cursor');
    if (!answered) {
      answered = true;
      o.done(0.4, 'balanced');
    }
  });
}
