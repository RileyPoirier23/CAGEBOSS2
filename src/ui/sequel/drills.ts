/**
 * CAGE BOSS II training drills: Ray holds the pads, you hit the beats. Every session can be
 * PLAYED (your own score, so your own grade) or SIMMED (65%: a C). Notes slide down lanes to the
 * line; hit the lane's key as they cross it. Perfect, good, late, miss. The fighter throws the
 * lane's shot into Ray's pads on every hit, the combo builds, Ray yells.
 *
 *   openDrill(g, { kind, tier, fighter, title }, (pct) => ...)   // pct = 0..100, or null if backed out
 */
import { Container, Graphics, type Ticker } from 'pixi.js';
import type { Game } from '../app';
import type { Fighter } from '../../core/types';
import { W, H, SW, OX, text, button } from '../kit';
import { POSES, drawRig, lerpRig, lookFor, type Look2, type Pose, type Rig } from '../rig';
import { CAST } from '../cutscene';
import { input } from '../../core/input';
import { sfx } from '../../audio/sfx';
import { isTouchDevice } from '../../core/platform';
import { II } from '../theme';
import { SIM_SCORE, gradeFor, type TrainTier } from '../../sequel/story';
import type { PixelText } from '../text';

export type DrillKind = 'striking' | 'grappling' | 'cardio' | 'media';

interface Lane { name: string; pose: Pose; key: string; alt: string[]; pad: 'A' | 'B' | 'X' | 'Y' }
const LANES: Record<DrillKind, Lane[]> = {
  striking: [
    { name: 'JAB', pose: 'jab', key: 'J', alt: ['1', 'ArrowLeft'], pad: 'X' },
    { name: 'CROSS', pose: 'cross', key: 'K', alt: ['2', 'ArrowDown'], pad: 'Y' },
    { name: 'HOOK', pose: 'leadHook', key: 'L', alt: ['3', 'ArrowRight'], pad: 'B' },
  ],
  grappling: [
    { name: 'SHOOT', pose: 'shoot', key: 'J', alt: ['1', 'ArrowLeft'], pad: 'X' },
    { name: 'SPRAWL', pose: 'sprawl', key: 'K', alt: ['2', 'ArrowDown'], pad: 'Y' },
    { name: 'KNEE', pose: 'knee', key: 'L', alt: ['3', 'ArrowRight'], pad: 'B' },
  ],
  cardio: [
    { name: 'LEFT', pose: 'jab', key: 'J', alt: ['1', 'ArrowLeft'], pad: 'X' },
    { name: 'RIGHT', pose: 'cross', key: 'K', alt: ['2', 'ArrowRight'], pad: 'B' },
  ],
  media: [
    { name: 'SMILE', pose: 'mic', key: 'J', alt: ['1', 'ArrowLeft'], pad: 'X' },
    { name: 'DEFLECT', pose: 'shrug', key: 'K', alt: ['2', 'ArrowDown'], pad: 'Y' },
    { name: 'ZINGER', pose: 'point', key: 'L', alt: ['3', 'ArrowRight'], pad: 'B' },
  ],
};
const BLURB: Record<DrillKind, string> = {
  striking: 'PAD WORK. Ray calls it, you throw it. Hit the lane as the call crosses the line.',
  grappling: 'WALL AND MAT. Shoot, sprawl, knee. Timing is everything and Ray has a stopwatch.',
  cardio: 'THE STAIRS. Left, right, left, right. It speeds up. It always speeds up.',
  media: 'THE MIRROR. Ray plays a reporter. Smile, deflect, or zing. Badly timed zingers become headlines.',
};
const RAY_HIT = ['THAT\'S IT!', 'HANDS UP!', 'AGAIN!', 'BEAUTIFUL!', 'CHIN DOWN!', 'MARIE WOULD CRY!'];
const RAY_MISS = ['LATE!', 'EAT SOMETHING!', 'WAKE UP!', 'WHERE WAS THAT?', 'MY NAN HITS HARDER!'];
const TIER_NOTES: Record<TrainTier, number> = { light: 14, full: 20, camp: 26 };
const TIER_SPEED: Record<TrainTier, number> = { light: 0.82, full: 1, camp: 1.18 };

export interface DrillOpts {
  kind: DrillKind;
  tier: TrainTier;
  fighter: Fighter;
  title: string;
}

/** The menu first: PLAY for your own grade, SIM for a C. */
export function openDrill(g: Game, o: DrillOpts, done: (pct: number | null) => void): void {
  const root = new Container();
  const wrap = g.modal(root, { dim: 0.85, fit: false });
  const close = (pct: number | null) => {
    g.closeModal(wrap);
    done(pct);
  };
  root.addChild(new Graphics().rect(80, 60, 320, 150).fill({ color: II.panel, alpha: 0.97 }).rect(80, 60, 320, 150).stroke({ color: II.sodium, width: 1 }).rect(80, 60, 320, 12).fill(II.night).rect(80, 71, 320, 1).fill(II.blood));
  root.addChild(text(o.title, 86, 63, { small: true, color: II.gold }));
  root.addChild(text(BLURB[o.kind], 90, 80, { width: 300, color: II.bone, maxLines: 3 }));
  root.addChild(text('PLAY IT and your score sets the grade (S A B C D F). SIM IT and it goes down as 65%: a C.', 90, 112, { width: 300, small: true, color: II.ash, maxLines: 3 }));
  root.addChild(button('PLAY IT', 96, 150, 136, 20, () => { root.visible = false; playDrill(g, o, (pct) => close(pct)); }, { fill: II.blood, border: II.sodium }));
  root.addChild(button(`SIM IT  (${gradeFor(SIM_SCORE)})`, 248, 150, 136, 20, () => close(SIM_SCORE), { fill: II.steel }));
  root.addChild(button('BACK', 220, 184, 40, 12, () => close(null), { small: true, fill: II.steel }));
}

interface Note { lane: number; t: number; hit: boolean; judged: boolean }

function playDrill(g: Game, o: DrillOpts, done: (pct: number) => void): void {
  const touch = isTouchDevice();
  const lanes = LANES[o.kind];
  const root = new Container();
  const wrap = g.modal(root, { dim: 1, fit: false });
  root.addChild(new Graphics().rect(-OX, 0, SW, H).fill(II.night));
  // the gym: brick, a ring post, the soup pot steaming in the corner
  const gym = new Graphics();
  for (let y = 18; y < 196; y += 6) for (let x = (y / 6) % 2 ? 0 : 7; x < 250; x += 14) gym.rect(x, y, 13, 5).fill(y < 120 ? 0x4a2420 : 0x3e1e1a);
  gym.rect(0, 196, 250, H - 196).fill(0x2a1e16);
  for (let x = 0; x < 250; x += 18) gym.rect(x, 196, 1, H - 196).fill(0x22180f);
  gym.rect(16, 120, 4, 76).fill(0x1a1a20);
  for (let k = 0; k < 3; k++) gym.rect(20, 132 + k * 14, 230, 2).fill([0xc8202a, 0xf0ece0, 0x2a4aa8][k]);
  gym.rect(186, 60, 50, 30).fill(0x111114).rect(188, 62, 46, 22).fill(0x30485a);
  root.addChild(gym);
  const bodies = new Graphics();
  const fx = new Graphics();
  root.addChild(bodies, fx);
  const L: Look2 = lookFor(o.fighter, 0);
  const RAY: Look2 = { ...CAST.ray };
  let rig: Rig = { ...POSES.guard };
  let rayRig: Rig = { ...POSES.refHold };
  let pose: Pose = 'guard';
  let poseT = 0;
  let rayRecoil = 0;

  // the highway
  const LX = 262;
  const LW = Math.floor(200 / lanes.length);
  const HIT_Y = 214;
  const TOP = 24;
  const hw = new Graphics();
  const notesG = new Graphics();
  root.addChild(hw, notesG);
  const drawHighway = (flash: number[]) => {
    hw.clear();
    hw.rect(LX - 4, TOP - 4, LW * lanes.length + 8, HIT_Y - TOP + 26).fill({ color: 0x000000, alpha: 0.55 });
    lanes.forEach((_, i) => {
      const x = LX + i * LW;
      hw.rect(x, TOP, LW - 2, HIT_Y - TOP + 14).fill({ color: i % 2 ? 0x16131c : 0x1b1722 });
      hw.rect(x, HIT_Y - 2, LW - 2, 5).fill(flash[i] > 0 ? II.gold : II.edge);
      if (flash[i] > 0) hw.rect(x, TOP, LW - 2, HIT_Y - TOP).fill({ color: II.sodium, alpha: flash[i] * 0.18 });
    });
  };
  lanes.forEach((ln, i) => {
    root.addChild(text(ln.name, LX + i * LW, HIT_Y + 8, { small: true, width: LW - 2, align: 'center', color: II.bone }));
    if (!touch) root.addChild(text(ln.key, LX + i * LW, HIT_Y + 16, { small: true, width: LW - 2, align: 'center', color: II.ash }));
  });
  root.addChild(new Graphics().rect(-OX, 0, SW, 16).fill(0x000000).rect(-OX, 15, SW, 1).fill(II.blood));
  root.addChild(text(o.title, 6, 4, { small: true, color: II.gold }));
  const scoreT = text('', 0, 4, { small: true, width: W - 6, align: 'right', color: II.bone });
  root.addChild(scoreT);
  const callT = text('', 0, 26, { width: 250, align: 'center', scale: 2, color: II.gold, shadow: 0x000000 }) as PixelText;
  const judgeT = text('', 0, 52, { width: 250, align: 'center', color: II.bone, shadow: 0x000000 }) as PixelText;
  const comboT = text('', 0, 64, { width: 250, align: 'center', small: true, color: II.sodium }) as PixelText;
  root.addChild(callT, judgeT, comboT);

  // the chart: notes on a beat, a little syncopation, a rest every bar; camp is denser and faster
  const n = TIER_NOTES[o.tier];
  const speed = TIER_SPEED[o.tier] * (o.kind === 'cardio' ? 1.15 : 1);
  const beat = 0.56 / speed;
  const notes: Note[] = [];
  let seed = [...o.title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) ^ n;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  let tt = 1.6;
  for (let i = 0; i < n; i++) {
    const lane = o.kind === 'cardio' ? i % 2 : Math.floor(rnd() * lanes.length);
    notes.push({ lane, t: tt, hit: false, judged: false });
    tt += beat * (i % 4 === 3 ? 2 : rnd() < 0.2 ? 0.5 : 1) * (o.kind === 'cardio' ? Math.max(0.55, 1 - i / (n * 1.6)) : 1);
  }
  const travel = 1.25 / speed; // seconds from the top to the line
  let t = 0;
  let total = 0;
  let combo = 0;
  let best = 0;
  let judged = 0;
  let judgeTime = 0;
  const flash = lanes.map(() => 0);
  let finished = false;

  const judge = (label: string, color: number, pts: number) => {
    total += pts;
    judged++;
    judgeT.setText(label);
    judgeT.setColor(color);
    judgeTime = 0.6;
  };
  const press = (lane: number) => {
    if (finished) return;
    flash[lane] = 1;
    // the nearest unjudged note in this lane
    let bestN: Note | null = null;
    for (const nt of notes) if (!nt.judged && nt.lane === lane && Math.abs(nt.t - t) < 0.3 && (!bestN || Math.abs(nt.t - t) < Math.abs(bestN.t - t))) bestN = nt;
    if (!bestN) {
      combo = 0; // a whiff
      comboT.setText('WHIFF');
      return;
    }
    const d = Math.abs(bestN.t - t);
    bestN.judged = true;
    bestN.hit = d < 0.2;
    if (d < 0.065) judge('PERFECT', II.gold, 100);
    else if (d < 0.13) judge('GOOD', II.bone, 75);
    else if (d < 0.2) judge(bestN.t > t ? 'EARLY' : 'LATE', II.ash, 45);
    else judge('MISS', II.blood, 0);
    if (bestN.hit) {
      combo++;
      best = Math.max(best, combo);
      pose = lanes[lane].pose;
      poseT = 0.22;
      rayRecoil = 1;
      sfx(o.kind === 'media' ? 'click' : 'punch');
      if (combo % 6 === 0) {
        callT.setText(RAY_HIT[Math.floor(rnd() * RAY_HIT.length)]);
        callT.alpha = 1;
      }
    } else {
      combo = 0;
      callT.setText(RAY_MISS[Math.floor(rnd() * RAY_MISS.length)]);
      callT.alpha = 1;
    }
    comboT.setText(combo > 1 ? `COMBO ${combo}` : '');
  };

  const pct = () => Math.round(total / Math.max(1, n));
  const endScreen = () => {
    finished = true;
    const p = pct();
    const grade = gradeFor(p);
    const box2 = new Graphics().rect(40, 70, 400, 120).fill({ color: II.panel, alpha: 0.97 }).rect(40, 70, 400, 120).stroke({ color: II.sodium, width: 1 });
    root.addChild(box2);
    root.addChild(text(grade, 60, 86, { scale: 6, color: grade === 'S' || grade === 'A' ? II.gold : grade === 'F' || grade === 'D' ? II.blood : II.bone, shadow: 0x000000 }));
    root.addChild(text(`${p}%`, 140, 92, { scale: 2, color: II.bone }));
    root.addChild(text(`BEST COMBO ${best}   /   ${notes.filter((x) => x.hit).length} OF ${n} CLEAN`, 140, 116, { small: true, color: II.ash }));
    root.addChild(text(p >= 85 ? 'Ray: "Now THAT is the family business."' : p >= 60 ? 'Ray: "Good. Again tomorrow."' : 'Ray: "Hands up. Chin down. Eat something. Then again."', 140, 130, { width: 290, small: true, color: II.bone, maxLines: 2 }));
    root.addChild(button('DONE', 190, 164, 100, 16, () => close(), { fill: II.blood, border: II.sodium }));
    sfx(p >= 75 ? 'roar' : 'bell');
  };
  const close = () => {
    g.app.ticker.remove(tick);
    popKeys();
    g.closeModal(wrap);
    done(pct());
  };
  const popKeys = g.pushKeyHandler((e) => {
    if (e.type !== 'keydown' || e.repeat) return true;
    if (finished) {
      if (e.key === 'Enter' || e.key === ' ') close();
      return true;
    }
    const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    lanes.forEach((ln, i) => {
      if (k === ln.key || ln.alt.includes(e.key)) press(i);
    });
    if (e.key === 'Escape') {
      // walk out: the rest of the notes are misses
      for (const nt of notes) if (!nt.judged) nt.judged = true;
      endScreen();
    }
    return true;
  });
  // touch / mouse: tap a lane
  lanes.forEach((_, i) => {
    const hit = new Graphics().rect(LX + i * LW, TOP, LW - 2, HIT_Y - TOP + 30).fill({ color: 0, alpha: 0.001 });
    hit.eventMode = 'static';
    hit.on('pointerdown', () => press(i));
    root.addChild(hit);
  });

  const tick = (tk: Ticker) => {
    const dt = Math.min(0.05, tk.deltaMS / 1000);
    if (!finished) {
      t += dt;
      lanes.forEach((ln, i) => {
        if (input.buttonPressed(ln.pad)) press(i);
      });
      for (const nt of notes) if (!nt.judged && t - nt.t > 0.2) {
        nt.judged = true;
        judge('MISS', II.blood, 0);
        combo = 0;
        comboT.setText('');
      }
      if (judged >= n && t > notes[n - 1].t + 0.6) endScreen();
    }
    for (let i = 0; i < flash.length; i++) flash[i] = Math.max(0, flash[i] - dt * 5);
    drawHighway(flash);
    notesG.clear();
    for (const nt of notes) {
      if (nt.judged && !nt.hit) continue;
      const k = 1 - (nt.t - t) / travel;
      if (k < 0 || k > 1.1 || nt.hit) continue;
      const y = TOP + (HIT_Y - TOP) * k;
      const x = LX + nt.lane * LW;
      notesG.roundRect(x + 3, y - 4, LW - 8, 8, 2).fill([II.blood, II.sodium, II.neon][nt.lane % 3]).stroke({ color: 0x000000, width: 1 });
      notesG.rect(x + 5, y - 3, LW - 12, 1).fill({ color: 0xffffff, alpha: 0.35 });
    }
    // the fighter and Ray
    poseT -= dt;
    if (poseT <= 0) pose = 'guard';
    rig = lerpRig(rig, POSES[pose], Math.min(1, dt * 22));
    rayRecoil = Math.max(0, rayRecoil - dt * 6);
    rayRig = lerpRig(rayRig, POSES.refHold, Math.min(1, dt * 10));
    bodies.clear();
    bodies.ellipse(96, 197, 20, 3).fill({ color: 0, alpha: 0.4 }).ellipse(166 + rayRecoil * 3, 197, 20, 3).fill({ color: 0, alpha: 0.4 });
    drawRig(bodies, rig, 96 + Math.round(Math.sin(t * 5) * (pose === 'guard' ? 1.5 : 0)), 196, 1, L, 1.25);
    drawRig(bodies, rayRig, 166 + Math.round(rayRecoil * 3), 196, -1, RAY, 1.25);
    fx.clear();
    if (rayRecoil > 0.6) for (let k = 0; k < 5; k++) fx.rect(150 + Math.random() * 14, 120 + Math.random() * 20, 1, 1).fill({ color: 0xffffff, alpha: 0.7 });
    judgeTime -= dt;
    judgeT.alpha = Math.max(0, Math.min(1, judgeTime * 3));
    callT.alpha = Math.max(0.15, callT.alpha - dt * 0.7);
    scoreT.setText(`${pct()}%  /  ${gradeFor(judged ? Math.round(total / judged) : 0)}`);
  };
  g.app.ticker.add(tick);
  wrap.once('destroyed', () => {
    g.app.ticker.remove(tick);
    popKeys();
  });
}
