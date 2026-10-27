/**
 * CINE II: CAGE BOSS II's cutscene player. It plays the same Cutscene data as the first
 * game's player (ui/cutscene.ts: shots, cast, lines, choices) and re-shoots it:
 *
 *  - a camera that works: wide on narration, a two-shot on a conversation, a push-in on
 *    whoever is talking, eased, with a little handheld drift; fades between shots
 *  - light: a colour grade per location, a key light that follows the speaker, light shafts
 *    and dust in the big rooms, a vignette
 *  - bodies: a lit rim on every character, a long shadow thrown away from the light, poses
 *    that blend instead of snapping, breathing, weight shifts, hands that talk, a real walk
 *  - a close-up of the speaker in the subtitle bar, drawn live from the same rig
 *  - an animated title card, lower-third captions, film grain and gate weave
 *
 *   playCine(g, scene, (choice) => ...)
 */
import { ColorMatrixFilter, Container, Graphics, type Ticker } from 'pixi.js';
import type { Game } from '../app';
import { W, H, SW, OX, text, button } from '../kit';
import { POSES, drawRig, lerpRig, lookFor, tauntRig, type Look2, type Rig } from '../rig';
import { input } from '../../core/input';
import { sfx } from '../../audio/sfx';
import { drawShow, showLabels, type TvShow } from '../tvshows';
import { isTouchDevice } from '../../core/platform';
import { clearOfProps, drawBg, setDressing, tvScreen, FLOOR, type Actor, type Bg, type Cutscene } from '../cutscene';
import { II } from '../theme';
import type { PixelText } from '../text';
import { lerpColor as lerpRGB, shade as shadeRGB } from '../../art/palette';

/** How each room is lit: the grade (top/bottom multiply), the key light colour and where the light comes from. */
interface Light { top: number; bottom: number; key: number; keyA: number; dir: 1 | -1; shafts: boolean; rim: number }
const LIGHT: Partial<Record<Bg, Light>> = {
  warehouse: { top: 0x8a7a9a, bottom: 0xc89a6a, key: 0xffb050, keyA: 0.16, dir: -1, shafts: true, rim: 0xffc070 },
  gym: { top: 0xc0a080, bottom: 0xe0c098, key: 0xffd8a0, keyA: 0.12, dir: 1, shafts: true, rim: 0xffe0b0 },
  street: { top: 0x5a6a9a, bottom: 0x8a7a8a, key: 0xffa040, keyA: 0.14, dir: -1, shafts: false, rim: 0x9ab8ff },
  lot: { top: 0x5a6a9a, bottom: 0x8a7a8a, key: 0xffa040, keyA: 0.14, dir: 1, shafts: false, rim: 0x9ab8ff },
  roof: { top: 0x4a5a8a, bottom: 0x7a7a9a, key: 0xc0d0ff, keyA: 0.1, dir: 1, shafts: false, rim: 0xb0c8ff },
  zenith: { top: 0x9aa8c8, bottom: 0xd0d8e8, key: 0xe8f0ff, keyA: 0.1, dir: 1, shafts: false, rim: 0xe0f0ff },
  hospital: { top: 0xa8c0b8, bottom: 0xd8e8e0, key: 0xe8fff8, keyA: 0.08, dir: 1, shafts: false, rim: 0xe0fff0 },
  lucha: { top: 0xc07a8a, bottom: 0xe0b080, key: 0xffa0c0, keyA: 0.14, dir: -1, shafts: true, rim: 0xffb0d0 },
  locker: { top: 0x8a9ab0, bottom: 0xb8b0a0, key: 0xfff0c0, keyA: 0.12, dir: 1, shafts: true, rim: 0xfff0d0 },
  presser: { top: 0x8a8aa8, bottom: 0xc8c0b0, key: 0xffffff, keyA: 0.12, dir: 1, shafts: false, rim: 0xffffff },
  cage: { top: 0x7a6a8a, bottom: 0xc0a080, key: 0xfff0d0, keyA: 0.18, dir: 1, shafts: true, rim: 0xfff0d0 },
  office: { top: 0x9a90a0, bottom: 0xd0c0a8, key: 0xffe8c0, keyA: 0.1, dir: 1, shafts: false, rim: 0xffe8c0 },
  landlord: { top: 0x9a90a0, bottom: 0xd0c0a8, key: 0xffe8c0, keyA: 0.1, dir: -1, shafts: false, rim: 0xffe8c0 },
};
const DEFAULT_LIGHT: Light = { top: 0x9a90a8, bottom: 0xd0c0b0, key: 0xffe0b0, keyA: 0.1, dir: 1, shafts: false, rim: 0xffe0c0 };
/** a memory: old film stock */
const FLASHBACK: Light = { top: 0xa08868, bottom: 0xd8c098, key: 0xfff0d0, keyA: 0.14, dir: 1, shafts: true, rim: 0xfff0d0 };

/** Everything turned to flat white (saturated), then a second pass paints it the rim colour. */
function rimFilters(color: number): ColorMatrixFilter[] {
  const white = new ColorMatrixFilter();
  white.matrix = [6, 6, 6, 0, 0, 6, 6, 6, 0, 0, 6, 6, 6, 0, 0, 0, 0, 0, 1, 0];
  const paint = new ColorMatrixFilter();
  const r = ((color >> 16) & 255) / 255, g = ((color >> 8) & 255) / 255, b = (color & 255) / 255;
  paint.matrix = [r, 0, 0, 0, 0, 0, g, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, 0.85, 0];
  return [white, paint];
}
function shadowFilter(): ColorMatrixFilter {
  const f = new ColorMatrixFilter();
  f.matrix = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.32, 0];
  return f;
}

type Live = Actor & { cx: number; look2: Look2; rig: Rig; phase: number; walkPh: number };

/** People are drawn at 1.3 for a 180 cm man; a fighter stands at his own height (Mateo is not a kid any more). */
const actorScale = (a: Actor): number => (a.fighter ? 1.3 * Math.max(0.86, Math.min(1.16, a.fighter.height / 180)) : a.scale ?? 1.3);

const ease = (cur: number, to: number, dt: number, rate: number): number => cur + (to - cur) * (1 - Math.exp(-dt * rate));

/** A rig with a breath in it, the weight on one foot and (talking) the hands working. */
function alive(r: Rig, t: number, ph: number, talking: boolean, standing: boolean): Rig {
  const o: Rig = { ...r };
  const b = Math.sin(t * 2.1 + ph) * 0.7;
  for (const j of ['head', 'neck', 'shF', 'shB', 'elF', 'elB', 'haF', 'haB'] as const) o[j] = [r[j][0], r[j][1] + b];
  if (standing) {
    const sway = Math.sin(t * 0.6 + ph) * 0.8;
    for (const j of ['hip', 'neck', 'head', 'shF', 'shB'] as const) o[j] = [o[j][0] + sway, o[j][1]];
  }
  if (talking) {
    o.head = [o.head[0] + Math.sin(t * 4.3 + ph) * 0.6, o.head[1] + Math.sin(t * 9) * 0.5];
    if (standing) {
      const k = Math.max(0, Math.sin(t * 3.1 + ph));
      o.elF = [o.elF[0] + 4 * k, o.elF[1] - 6 * k];
      o.haF = [o.haF[0] + 9 * k + Math.sin(t * 7) * 1.2, o.haF[1] - 14 * k];
    }
  }
  return o;
}

export function playCine(g: Game, scene0: Cutscene, done: (choice: string | null) => void): void {
  // a working copy: a choice with a reply appends its own shot
  const scene: Cutscene = { ...scene0, shots: [...scene0.shots] };
  let replied: string | null = null;
  const touch = isTouchDevice();
  const root = new Container();
  const wrap = g.modal(root, { dim: 1, fit: false });
  const cam = new Container();
  const world = new Container();
  cam.addChild(world);
  root.addChild(new Graphics().rect(-OX, 0, SW, H).fill(0x000000), cam);
  const bgG = new Graphics();
  const dress = new Container();
  const tvG = new Graphics();
  const tvWords = new Container();
  const shadowG = new Graphics();
  const shadowC = new Container();
  shadowC.addChild(shadowG);
  shadowC.filters = [shadowFilter()];
  const rimG = new Graphics();
  const rimC = new Container();
  rimC.addChild(rimG);
  const actorsG = new Graphics();
  const lightG = new Graphics();
  lightG.blendMode = 'add';
  const fgG = new Graphics();
  const fx = new Graphics();
  world.addChild(bgG, dress, tvG, tvWords, shadowC, rimC, actorsG, fgG, lightG, fx);
  // screen space: the grade, the vignette, the film, the bars, the words
  const gradeG = new Graphics();
  gradeG.blendMode = 'multiply';
  gradeG.alpha = 0.72;
  const vignette = new Graphics();
  for (let k = 0; k < 14; k++) vignette.rect(-OX + k * 2, k * 2, SW - k * 4, H - k * 4).stroke({ color: 0x000000, width: 2, alpha: 0.11 - k * 0.007 });
  const filmG = new Graphics();
  const fadeG = new Graphics();
  const bars = new Graphics();
  root.addChild(gradeG, vignette, filmG, bars, fadeG);
  gradeG.eventMode = vignette.eventMode = filmG.eventMode = bars.eventMode = fadeG.eventMode = 'none';
  const ui = new Container();
  root.addChild(ui);

  let shotIdx = -1;
  let lineIdx = -1;
  let shown = 0;
  let t = 0;
  let shake = 0;
  /** an impact: the camera punches in and tilts, then settles (0..1) */
  let punch = 0;
  let flash = 0;
  let fade = 1; // 1 = black, eases to 0 after a cut
  let barsK = 0; // letterbox in
  let finished = false;
  let titleT = scene.title ? 2.8 : 0;
  let light: Light = DEFAULT_LIGHT;
  let memory = false;
  let cast: Live[] = [];
  let screen: ReturnType<typeof tvScreen> = null;
  let show: TvShow | null = null;
  let showWords: ReturnType<typeof showLabels> | null = null;
  const camS = { x: W / 2, y: 140, z: 1.04 };

  const lookOf = (a: Actor): Look2 => {
    if (a.look) return { ...a.look };
    const L = lookFor(a.fighter!, a.x < W / 2 ? 0 : 1);
    return a.clothes ? { ...L, outfit: { top: a.clothes.top, bottom: a.clothes.bottom, bulk: 1, hands: L.skin } } : L;
  };

  const setupShot = (i: number, instant = false) => {
    shotIdx = i;
    lineIdx = -1;
    const s = scene.shots[i];
    light = s.flashback ? FLASHBACK : LIGHT[s.bg] ?? DEFAULT_LIGHT;
    memory = !!s.flashback;
    rimC.filters = rimFilters(light.rim);
    drawBg(bgG, fgG, s.bg, s.tv);
    dress.removeChildren().forEach((c) => c.destroy());
    setDressing(dress, s.bg);
    screen = tvScreen(s.bg, s.tv);
    const hash = [...(s.lines[0]?.text ?? s.bg)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
    show = !screen ? null : s.bg === 'tv' ? (s.tv as TvShow) : s.onTv === 'off' ? null : s.onTv ?? (hash % 2 ? 'feud' : 'judge');
    tvG.clear();
    tvWords.removeChildren().forEach((c) => c.destroy({ children: true }));
    showWords = null;
    if (screen && show && s.bg === 'tv') {
      showWords = showLabels(show, screen.x, screen.y, screen.w, screen.h);
      tvWords.addChild(showWords.c);
    }
    cast = s.cast.map((a, k) => {
      const x = clearOfProps(s.bg, a.x, a.scale ?? 1.3);
      const p = POSES[a.pose ?? 'stand'];
      return { ...a, scale: actorScale(a), x, cx: instant ? x : a.enter === 'left' ? -40 : a.enter === 'right' ? W + 40 : x, look2: lookOf(a), rig: { ...p }, phase: k * 1.7, walkPh: 0 };
    });
    drawGrade();
    drawCaption(s.caption);
    if (!instant) fade = 1;
  };

  const drawGrade = () => {
    gradeG.clear();
    const bands = 18;
    for (let k = 0; k < bands; k++) {
      const c = lerpRGB(light.top, light.bottom, k / (bands - 1));
      gradeG.rect(-OX, Math.floor((H * k) / bands), SW, Math.ceil(H / bands) + 1).fill(c);
    }
  };

  // ------------------------------------------------------------ captions: a lower third, typed in
  const capLayer = new Container();
  ui.addChild(capLayer);
  let capT = 0;
  let capText = '';
  let capNode: PixelText | null = null;
  const capBar = new Graphics();
  capLayer.addChild(capBar);
  const drawCaption = (c?: string) => {
    capText = c ?? '';
    capT = 0;
    capNode?.destroy();
    capNode = null;
    capBar.clear();
    if (!capText) return;
    capNode = text('', 18, 24, { small: true, color: II.gold });
    capLayer.addChild(capNode);
  };
  const updateCaption = (dt: number) => {
    if (!capNode || !capText) return;
    capT += dt;
    const n = Math.min(capText.length, Math.floor(capT * 40));
    capNode.setText(capText.slice(0, n));
    const w = Math.min(1, capT * 3) * (capNode.textWidth + 14);
    capBar.clear();
    capBar.rect(10, 20, w, 13).fill({ color: 0x000000, alpha: 0.7 }).rect(10, 20, 2, 13).fill(II.sodium).rect(10, 32, w, 1).fill({ color: II.blood, alpha: 0.8 });
    capLayer.alpha = capT > 5 ? Math.max(0, 1 - (capT - 5) * 1.5) : 1;
  };

  // ------------------------------------------------------------ the subtitle bar and its close-up
  const BAR_Y = H - 62;
  const dialog = new Container();
  ui.addChild(dialog);
  const barBg = new Graphics();
  for (let k = 0; k < 20; k++) barBg.rect(-OX, BAR_Y - 20 + k, SW, 1).fill({ color: 0x000000, alpha: (k / 20) * 0.75 });
  barBg.rect(-OX, BAR_Y, SW, H - BAR_Y).fill({ color: 0x000000, alpha: 0.78 });
  barBg.rect(-OX, BAR_Y, SW, 1).fill({ color: II.edge, alpha: 0.8 });
  dialog.addChild(barBg);
  const face = new Container();
  face.position.set(10, BAR_Y + 6);
  const faceBg = new Graphics();
  const faceG = new Graphics();
  const faceMask = new Graphics().rect(0, 0, 46, 46).fill(0xffffff);
  face.addChild(faceBg, faceG, faceMask);
  faceG.mask = faceMask;
  const faceFrame = new Graphics().rect(0, 0, 46, 46).stroke({ color: II.sodium, width: 1, alignment: 1 }).rect(0, 45, 46, 1).fill(II.blood);
  face.addChild(faceFrame);
  dialog.addChild(face);
  const words = new Container();
  dialog.addChild(words);
  let wordsKey = '';
  let wordsNode: PixelText | null = null;
  let nameNode: PixelText | null = null;
  const more = new Graphics();
  dialog.addChild(more);

  const speaker = (): Live | null => {
    const ln = scene.shots[shotIdx]?.lines[lineIdx];
    return ln?.who ? cast.find((c) => c.id === ln.who) ?? null : null;
  };
  const drawWords = () => {
    const ln = scene.shots[shotIdx]?.lines[lineIdx];
    const sp = speaker();
    dialog.visible = !!ln && !finished && titleT <= 0;
    if (!dialog.visible || !ln) return;
    face.visible = !!sp;
    const tx = sp ? 64 : 18;
    const tw = W - tx - 16;
    const key = `${shotIdx}:${lineIdx}`;
    if (key !== wordsKey) {
      wordsKey = key;
      words.removeChildren().forEach((c) => c.destroy());
      const who = ln.who ? sp?.name ?? ln.who : null;
      nameNode = who ? text(who.toUpperCase(), tx, BAR_Y + 6, { small: true, color: II.gold }) : null;
      if (nameNode) words.addChild(nameNode);
      // long lines drop to the small face so they always fit the bar
      const big = text(ln.text, 0, 0, { width: tw, maxLines: 99 });
      const small = big.textHeight > 36;
      big.destroy();
      wordsNode = text('', tx, BAR_Y + (who ? 15 : 10), { width: tw, small, color: ln.who ? II.bone : 0xc8c0d0, maxLines: small ? 6 : 4 });
      words.addChild(wordsNode);
    }
    wordsNode?.setText(ln.text.slice(0, Math.floor(shown)));
    more.clear();
    if (shown >= ln.text.length && Math.floor(t * 2.5) % 2 === 0) more.poly([W - 22, H - 12, W - 14, H - 12, W - 18, H - 8]).fill(II.sodium);
  };
  const drawFace = () => {
    const sp = speaker();
    if (!sp) return;
    faceBg.clear();
    for (let k = 0; k < 46; k += 2) faceBg.rect(0, k, 46, 2).fill(lerpRGB(shadeRGB(light.top, -0.55), shadeRGB(light.bottom, -0.6), k / 46));
    faceG.clear();
    const s = 2.5 * ((sp.scale ?? 1.3) / 1.3);
    const ln = scene.shots[shotIdx]?.lines[lineIdx];
    const talking = !!ln && shown < ln.text.length;
    const r = alive(sp.rig, t, sp.phase, talking, false);
    const f = sp.facing;
    const hx = r.head[0] * f * s;
    const hy = r.head[1] * s;
    // the head sits a little left of centre, looking into the frame
    drawRig(faceG, r, Math.round(23 - hx), Math.round(22 - hy), f, sp.look2, s);
    faceG.rect(0, 0, 46, 46).fill({ color: light.key, alpha: 0.05 });
  };

  // ------------------------------------------------------------ the title card
  const titleC = new Container();
  titleC.eventMode = 'none';
  root.addChild(titleC);
  const titleG = new Graphics();
  titleC.addChild(titleG);
  let titleWords: PixelText | null = null;
  if (scene.title) {
    titleWords = text(scene.title, 0, H / 2 - 10, { width: W, align: 'center', color: II.bone, scale: 2, shadow: 0x000000 });
    titleC.addChild(titleWords);
    titleC.addChild(text('CAGE BOSS II', 0, H / 2 - 26, { width: W, align: 'center', color: II.blood, small: true }));
  }
  const drawTitle = () => {
    const k = 2.8 - titleT; // seconds in
    titleG.clear();
    titleG.rect(-OX, 0, SW, H).fill(0x050407);
    const slash = Math.min(1, k * 2.2);
    titleG.poly([-OX, H / 2 + 6, -OX + (SW + 40) * slash, H / 2 + 6, -OX + (SW + 40) * slash - 20, H / 2 + 14, -OX, H / 2 + 14]).fill(II.blood);
    titleG.rect(-OX, H / 2 + 15, SW * slash, 1).fill(II.sodium);
    if (titleWords) {
      titleWords.alpha = Math.min(1, Math.max(0, (k - 0.25) * 3));
      titleWords.x = Math.round((1 - Math.min(1, k * 2.5)) * -30);
    }
    titleC.alpha = titleT < 0.4 ? titleT / 0.4 : 1;
  };

  // ------------------------------------------------------------ flow
  const nextLine = () => {
    const s = scene.shots[shotIdx];
    lineIdx++;
    shown = 0;
    if (lineIdx >= s.lines.length) {
      if (shotIdx + 1 < scene.shots.length) {
        setupShot(shotIdx + 1);
        return nextLine();
      }
      return end();
    }
    const ln = s.lines[lineIdx];
    for (const [id, p] of Object.entries(ln.poses ?? {})) {
      const a = cast.find((c) => c.id === id);
      if (a) a.pose = p;
    }
    if (ln.shake) {
      shake = 0.45;
      punch = 1; // the camera jolts in on the hit
    }
    if (ln.flash) flash = 0.4;
    if (ln.sfx) sfx(ln.sfx);
  };
  const reapplyPoses = () => {
    const s = scene.shots[shotIdx];
    for (const a of cast) a.pose = s.cast.find((x) => x.id === a.id)?.pose;
    for (let k = 0; k <= lineIdx && k < s.lines.length; k++) for (const [id, p] of Object.entries(s.lines[k].poses ?? {})) {
      const a = cast.find((c) => c.id === id);
      if (a) a.pose = p;
    }
  };
  const back = () => {
    if (titleT > 0) return;
    if (finished) {
      if (!scene.choices?.length) return;
      finished = false;
      choicesBox.removeChildren().forEach((c) => c.destroy({ children: true }));
      lineIdx = scene.shots[shotIdx].lines.length - 1;
    } else if (lineIdx > 0) lineIdx--;
    else if (shotIdx > 0) {
      setupShot(shotIdx - 1, true);
      lineIdx = scene.shots[shotIdx].lines.length - 1;
    } else return;
    wordsKey = '';
    shown = 1e9;
    reapplyPoses();
    sfx('click');
  };
  const advance = () => {
    if (titleT > 0) {
      titleT = Math.min(titleT, 0.35);
      return;
    }
    if (finished) return;
    const ln = scene.shots[shotIdx]?.lines[lineIdx];
    if (ln && shown < ln.text.length) shown = ln.text.length;
    else nextLine();
  };
  const choicesBox = new Container();
  ui.addChild(choicesBox);
  let choiceSel = 0;
  const drawChoices = () => {
    choicesBox.removeChildren().forEach((c) => c.destroy({ children: true }));
    const ch = scene.choices ?? [];
    const rowH = touch ? 19 : 16;
    const y0 = H - 18 - ch.length * (rowH + 3);
    choicesBox.addChild(new Graphics().rect(-OX, y0 - 10, SW, H - y0 + 10).fill({ color: 0x000000, alpha: 0.7 }).rect(-OX, y0 - 10, SW, 1).fill(II.edge));
    ch.forEach((c, i) => {
      const sel = i === choiceSel;
      choicesBox.addChild(button(`${i + 1}   ${c.label}`, 40, y0 + i * (rowH + 3), W - 80, rowH, () => pick(i), {
        small: !touch, align: 'left', fill: sel ? II.blood : II.steel, border: sel ? II.sodium : undefined,
      }));
    });
  };
  const pick = (i: number) => {
    const c = scene.choices?.[i];
    if (!c) return;
    sfx('click');
    if (c.reply?.length) {
      // the answer plays out: same room, same people, where they stand now
      const cur = scene.shots[shotIdx];
      replied = c.id;
      scene.choices = undefined;
      scene.shots.push({ bg: cur.bg, cast: cast.map((a) => ({ ...a, x: a.x, enter: undefined })), lines: c.reply, caption: c.label });
      choicesBox.removeChildren().forEach((ch) => ch.destroy({ children: true }));
      finished = false;
      setupShot(scene.shots.length - 1, true);
      fade = 0.5;
      nextLine();
      return;
    }
    close(c.id);
  };
  const end = () => {
    if (finished) return;
    finished = true;
    dialog.visible = false;
    if (replied) return close(replied);
    if (!scene.choices?.length) return close(null);
    choiceSel = 0;
    drawChoices();
  };
  let closed = false;
  const close = (choice: string | null) => {
    if (closed) return;
    closed = true;
    g.app.ticker.remove(tick);
    popKeys();
    g.closeModal(wrap);
    done(choice);
  };
  const skipAll = () => {
    titleT = 0;
    setupShot(scene.shots.length - 1, true);
    lineIdx = scene.shots[shotIdx].lines.length - 1;
    reapplyPoses();
    end();
  };

  const hit = new Graphics().rect(-OX, 0, SW, H).fill({ color: 0, alpha: 0.001 });
  hit.eventMode = 'static';
  hit.on('pointertap', advance);
  root.addChildAt(hit, 2);
  const nav = new Container();
  ui.addChild(nav);
  nav.addChild(button('SKIP', W - 44, 3, 40, touch ? 16 : 11, () => skipAll(), { small: true, fill: II.steel }));
  nav.addChild(button('<', W - 60, 3, 14, touch ? 16 : 11, () => back(), { small: true, fill: II.steel }));
  const popKeys = g.pushKeyHandler((e) => {
    if (e.type !== 'keydown') return true;
    if (finished) {
      const n = scene.choices?.length ?? 0;
      if (/^[1-9]$/.test(e.key) && Number(e.key) <= n) pick(Number(e.key) - 1);
      else if (e.key === 'ArrowUp') { choiceSel = (choiceSel + n - 1) % n; drawChoices(); }
      else if (e.key === 'ArrowDown') { choiceSel = (choiceSel + 1) % n; drawChoices(); }
      else if (e.key === 'Enter' || e.key === ' ') pick(choiceSel);
      else if (e.key === 'ArrowLeft' || e.key === 'Backspace') back();
      return true;
    }
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') advance();
    if (e.key === 'ArrowLeft' || e.key === 'Backspace') back();
    if (e.key === 'Escape') skipAll();
    return true;
  });

  setupShot(0);
  nextLine();

  const tick = (tk: Ticker) => {
    const dt = Math.min(0.05, tk.deltaMS / 1000);
    t += dt;
    if (finished) {
      const n = scene.choices?.length ?? 0;
      if (input.buttonPressed('A')) pick(choiceSel);
      if (n && input.buttonPressed('Down')) { choiceSel = (choiceSel + 1) % n; drawChoices(); }
      if (n && input.buttonPressed('Up')) { choiceSel = (choiceSel + n - 1) % n; drawChoices(); }
    } else {
      if (input.buttonPressed('A') || input.buttonPressed('RB')) advance();
      if (input.buttonPressed('LB') || input.buttonPressed('X')) back();
    }
    titleC.visible = titleT > 0;
    if (titleT > 0) {
      titleT -= dt;
      drawTitle();
    }
    barsK = ease(barsK, titleT > 0 ? 0 : 1, dt, 4);
    bars.clear();
    const bh = Math.round(16 * barsK);
    bars.rect(-OX, 0, SW, bh).fill(0x000000).rect(-OX, H - Math.round(6 * barsK), SW, Math.round(6 * barsK)).fill(0x000000);

    const ln = scene.shots[shotIdx]?.lines[lineIdx];
    if (ln && !finished && titleT <= 0) shown = Math.min(ln.text.length, shown + dt * 52);
    if (screen && show) {
      tvG.clear();
      drawShow(tvG, show, screen.x, screen.y, screen.w, screen.h, t);
      showWords?.update(t);
    }

    // bodies
    actorsG.clear();
    rimG.clear();
    shadowG.clear();
    for (const a of cast) {
      a.cx = ease(a.cx, a.x, dt, 2.4);
      const walking = Math.abs(a.x - a.cx) > 1.5;
      const talking = ln?.who === a.id && shown < (ln?.text.length ?? 0);
      let target: Rig;
      if (walking) {
        a.walkPh += dt * 7.5;
        target = lerpRig(POSES.walk1, POSES.walk2, (Math.sin(a.walkPh) + 1) / 2);
      } else target = a.pose === 'taunt' ? tauntRig(a.look2, t) : POSES[a.pose ?? 'stand'];
      a.rig = lerpRig(a.rig, target, 1 - Math.exp(-dt * (walking ? 30 : 11)));
      a.look2.bird = !walking && a.pose === 'taunt' && a.look2.taunt === 'flipoff';
      const standing = !walking && (!a.pose || a.pose === 'stand');
      const r = alive(a.rig, t, a.phase, talking, standing);
      const sc = a.scale ?? 1.3;
      const face = walking ? (a.x > a.cx ? 1 : -1) : a.facing;
      const x = Math.round(a.cx);
      const bob = walking ? Math.round(Math.abs(Math.sin(a.walkPh)) * -1.5) : 0;
      actorsG.ellipse(x, FLOOR + 1, 15 * sc, 2.6).fill({ color: 0x000000, alpha: 0.45 });
      drawRig(shadowG, r, x, 0, face, a.look2, sc);
      drawRig(rimG, r, x - light.dir, FLOOR + bob, face, a.look2, sc);
      drawRig(actorsG, r, x, FLOOR + bob, face, a.look2, sc);
    }
    // the long shadow, thrown away from the light
    shadowG.position.set(0, FLOOR + 1);
    shadowG.scale.set(1, -0.26);
    shadowG.skew.set(light.dir * 0.95, 0);

    // light: a key pool on whoever talks, shafts and dust in the big rooms
    lightG.clear();
    const sp = speaker();
    const kx = sp ? sp.cx : W / 2;
    for (let k = 6; k >= 1; k--) lightG.ellipse(kx, FLOOR - 50, 18 * k, 26 * k).fill({ color: light.key, alpha: light.keyA / 6 });
    if (light.shafts) {
      for (let k = 0; k < 3; k++) {
        const sx = 90 + k * 150 + Math.sin(t * 0.3 + k) * 6;
        const a = 0.05 + Math.sin(t * 0.8 + k * 2) * 0.015;
        lightG.poly([sx, 0, sx + 26, 0, sx + 26 - light.dir * 60, FLOOR + 4, sx - light.dir * 60 - 30, FLOOR + 4]).fill({ color: light.key, alpha: a });
      }
      for (let k = 0; k < 26; k++) {
        const mx = (k * 73 + t * (4 + (k % 5))) % W;
        const my = 20 + ((k * 41 + t * (3 + (k % 3))) % (FLOOR - 30));
        lightG.rect(Math.round(mx), Math.round(my), 1, 1).fill({ color: 0xffffff, alpha: 0.22 });
      }
    }

    // ambient: rain, flashes, steam
    fx.clear();
    const bg = scene.shots[shotIdx]?.bg;
    if (bg === 'street' || bg === 'lot' || bg === 'roof') {
      for (let k = 0; k < 90; k++) fx.rect(((k * 97 + t * 220) % (W + 40)) - 20, ((k * 53 + t * 330) % H), 1, 4).fill({ color: 0x9ab0c8, alpha: 0.42 });
      for (let k = 0; k < 8; k++) {
        const p = (t * 1.4 + k * 0.29) % 1;
        fx.ellipse((k * 61) % W, FLOOR + 4 + (k % 3) * 3, 1 + p * 4, 0.5 + p).stroke({ color: 0x9ab0c8, width: 1, alpha: 0.4 * (1 - p) });
      }
    }
    if ((bg === 'presser' || bg === 'stage' || bg === 'cage') && Math.random() < dt * 2.5) {
      const px = Math.random() * W;
      fx.circle(px, H - 50 + Math.random() * 20, 3).fill(0xffffff);
      fx.circle(px, H - 50, 14).fill({ color: 0xffffff, alpha: 0.12 });
    }
    if (bg === 'gym' || bg === 'tv') for (let k = 0; k < 5; k++) fx.circle(400 + Math.sin(t * 1.5 + k) * 6, 110 - ((t * 14 + k * 9) % 36), 3).fill({ color: 0xffffff, alpha: 0.12 });
    if (bg === 'lucha') for (let k = 0; k < 24; k++) fx.rect((k * 59 + t * 9) % W, 6 + (k * 17) % 40, 2, 1).fill({ color: [0xe0559a, 0xf2c12e, 0x2a8a6a][k % 3], alpha: 0.4 });
    if (flash > 0) {
      fx.rect(-OX, 0, SW, H).fill({ color: 0xffffff, alpha: Math.min(0.6, flash) });
      flash -= dt;
    }

    // camera: wide on narration, a two-shot on a conversation, in tight on a lone speaker
    let tx = W / 2;
    let tz = 1.03;
    let ty = 138;
    if (sp && !finished) {
      const other = cast.filter((c) => c !== sp).sort((p, q) => Math.abs(p.cx - sp.cx) - Math.abs(q.cx - sp.cx))[0];
      if (other && Math.abs(other.cx - sp.cx) < 190) {
        tx = sp.cx * 0.62 + other.cx * 0.38;
        tz = 1.16;
      } else {
        tx = sp.cx;
        tz = 1.26;
      }
      ty = FLOOR - 62 * ((sp.scale ?? 1.3) / 1.3);
    }
    // each shot opens on a different angle: wide and high, then low for the two-shot
    const angle = shotIdx % 3;
    if (angle === 1) ty -= 8;
    if (angle === 2) tz += 0.04;
    tz += punch * 0.14;
    camS.x = ease(camS.x, tx, dt, 1.8);
    camS.y = ease(camS.y, ty, dt, 1.8);
    camS.z = ease(camS.z, tz, dt, 1.4);
    const z = camS.z;
    let wx = W / 2 - camS.x * z + Math.sin(t * 0.7) * 0.8;
    let wy = H * 0.46 - camS.y * z + Math.cos(t * 0.9) * 0.5;
    wx = Math.min(0, Math.max(W - W * z, wx));
    wy = Math.min(0, Math.max(H - H * z, wy));
    if (shake > 0) {
      wx += (Math.random() - 0.5) * 7 * shake;
      wy += (Math.random() - 0.5) * 4 * shake;
      shake = Math.max(0, shake - dt);
    }
    cam.scale.set(z);
    cam.position.set(Math.round(wx), Math.round(wy));
    cam.rotation = punch * 0.025 * (shotIdx % 2 ? -1 : 1);
    punch = Math.max(0, punch - dt * 2.2);

    // film: grain, the odd scratch, the gate weaving; the cut fades up from black
    filmG.clear();
    if (scene.film !== false) {
      for (let i = 0; i < 70; i++) filmG.rect(Math.random() * SW - OX, Math.random() * H, 1, 1).fill({ color: Math.random() < 0.5 ? 0xffffff : 0x000000, alpha: 0.05 });
      if (Math.random() < dt * (memory ? 5 : 0.8)) filmG.rect(Math.random() * W, 0, 1, H).fill({ color: 0xffffff, alpha: memory ? 0.12 : 0.06 });
      // a memory: washed out, burned at the edges
      if (memory) {
        filmG.rect(-OX, 0, SW, H).fill({ color: 0xc8a878, alpha: 0.12 });
        for (let k = 0; k < 10; k++) filmG.rect(-OX + k * 4, 0, 4, H).fill({ color: 0x2a1a0a, alpha: 0.12 - k * 0.011 }).rect(SW - OX - (k + 1) * 4, 0, 4, H).fill({ color: 0x2a1a0a, alpha: 0.12 - k * 0.011 });
      }
      cam.y += Math.round(Math.sin(t * 23) * 0.4);
    }
    fade = Math.max(0, fade - dt * 2.6);
    fadeG.clear();
    if (fade > 0) fadeG.rect(-OX, 0, SW, H).fill({ color: 0x000000, alpha: fade });

    updateCaption(dt);
    drawWords();
    drawFace();
    nav.visible = !finished && titleT <= 0;
  };
  g.app.ticker.add(tick);
  wrap.once('destroyed', () => {
    g.app.ticker.remove(tick);
    popKeys();
  });
}

