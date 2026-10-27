/**
 * CAGE BOSS II: QUICK FIGHT. Pick two fighters with the models standing right there under the
 * lights (they bounce in their own stance, wear their own kit), pick a room, press READY: they
 * walk to the middle and square up nose to nose, the flashbulbs go, then the bell.
 */
import { Container, Graphics, type Ticker } from 'pixi.js';
import { Scene } from '../app';
import type { Bout, FightEvent, Fighter, GameState } from '../../core/types';
import { W, H, SW, OX, text, button } from '../kit';
import { alertBox } from '../widgets';
import { fighterPortrait } from '../sprites';
import { createNewGame } from '../../sim/newgame';
import { makeBout, officialsFor } from '../../sim/events';
import { DIVISION_ORDER, divisionName } from '../../sim/divisions';
import { overall, isWomensDivision } from '../../sim/fighters';
import { POSES, drawRig, lerpRig, lookFor, tauntRig, type Look2, type Rig } from '../rig';
import { openLiveFight } from '../livefight';
import { Rng } from '../../core/rng';
import { sfx } from '../../audio/sfx';
import { input } from '../../core/input';
import { isTouchDevice } from '../../core/platform';
import { II } from '../theme';
import { storyVenue, type StoryVenue } from '../sequel/venues';
import { newStorySave, buildHan, buildMateoGrown, buildOneTon, buildOpponent } from '../../sequel/story';
import type { PixelText } from '../text';
import type { KeyboardShare } from '../../core/fightinput';

let world: GameState | null = null;
/** The full roster, built once a session (the booth and the referees read it too). */
function roster(): GameState {
  if (!world) world = createNewGame({ seed: 2606, mode: 'sandbox', difficulty: 'normal', promotionName: 'Cage Boss Fighting Championship', presidentName: 'Dane Whyte' });
  return world;
}

/** The Tales of Legacy cast, as fighters: Han, Mateo, 1ton, the crew and the bosses. */
function legacyCast(): Fighter[] {
  const s = newStorySave(1);
  s.chapter = 9;
  const out = [buildHan(s, true), buildMateoGrown(s), buildOneTon(s, true)];
  for (const k of ['cesar', 'duke', 'rico', 'cuchillo_rematch', 'brick', 'chairman']) out.push(buildOpponent(s, k));
  return out;
}

const VENUES: { name: string; v: () => StoryVenue }[] = [
  { name: 'THE WAREHOUSE', v: () => storyVenue('THE WAREHOUSE') },
  { name: "RAY'S BOXING & SOUP", v: () => storyVenue("RAY'S BOXING & SOUP") },
  { name: 'THE OLD DOME', v: () => storyVenue('THE OLD DOME') },
  { name: 'THE ALLEY (BAREKNUCKLE)', v: () => storyVenue("THE ALLEY BEHIND RAY'S") },
];
const LEGACY = 'legacy';

export class SequelQuickFightScene extends Scene {
  music = 'title' as const;
  private div = LEGACY;
  private pick: [number, number] = [0, 1];
  private venue = 0;
  private rounds: 3 | 5 = 3;
  private versus = false;
  private t = 0;
  private stage = new Graphics();
  private models = new Graphics();
  private rigs: [Rig, Rig] = [{ ...POSES.guard }, { ...POSES.guard }];
  private looks: [Look2 | null, Look2 | null] = [null, null];
  /** READY pressed: seconds into the face-off */
  private faceoff = -1;
  private flash = 0;
  private callT: PixelText | null = null;
  private legacy: Fighter[] | null = null;
  private mid: Container | null = null;

  private list(): Fighter[] {
    if (this.div === LEGACY) return (this.legacy ??= legacyCast());
    const s = roster();
    const ranked = (s.rankings[this.div] ?? []).map((id) => s.fighters[id]).filter(Boolean);
    const rest = Object.values(s.fighters)
      .filter((f) => f.division === this.div && f.status !== 'retired' && !ranked.includes(f))
      .sort((a, b) => overall(b.skills) - overall(a.skills));
    return [...ranked, ...rest].slice(0, 40);
  }

  private divisions(): { id: string; label: string }[] {
    return [{ id: LEGACY, label: 'TALES OF LEGACY' }, ...DIVISION_ORDER.map((d) => ({ id: d, label: divisionName(d).toUpperCase() }))];
  }

  build(): void {
    const r = this.root;
    r.x = -OX;
    const l = this.list();
    this.pick = [Math.min(this.pick[0], l.length - 1), Math.min(this.pick[1], l.length - 1)];
    if (this.pick[0] === this.pick[1] && l.length > 1) this.pick[1] = (this.pick[0] + 1) % l.length;
    const A = l[this.pick[0]];
    const B = l[this.pick[1]];
    this.looks = [A ? lookFor(A, 0) : null, B ? lookFor(B, 1) : null];

    // the room: dark, two spotlit marks on the floor, the cage behind in the haze
    const bg = new Graphics();
    for (let y = 0; y < H; y += 2) bg.rect(0, y, SW, 2).fill(lerp(0x07060a, 0x1a1420, y / H));
    for (let x = 0; x < SW; x += 6) for (let y = 40; y < 150; y += 6) bg.rect(x + ((y / 6) % 2 ? 3 : 0), y, 1, 1).fill({ color: 0xffffff, alpha: 0.03 });
    bg.rect(0, 186, SW, H - 186).fill(0x0c0a10);
    r.addChild(bg, this.stage, this.models);

    // the top bar
    r.addChild(new Graphics().rect(0, 0, SW, 18).fill(0x000000).rect(0, 17, SW, 1).fill(II.blood));
    r.addChild(text('QUICK FIGHT', OX + 6, 5, { color: II.gold }));
    r.addChild(button('< BACK', OX + W - 56, 3, 50, 12, () => this.back(), { small: true, fill: II.steel }));

    // the two name plates
    const plate = (f: Fighter | undefined, side: 0 | 1) => {
      if (!f) return;
      const x = side === 0 ? OX + 6 : OX + W - 156;
      const c = new Container();
      c.position.set(x, 24);
      c.addChild(new Graphics().rect(0, 0, 150, 40).fill({ color: II.night, alpha: 0.85 }).rect(side === 0 ? 0 : 148, 0, 2, 40).fill(side === 0 ? II.blood : II.neon));
      c.addChild(text(`${f.first} ${f.last}`.toUpperCase(), 6, 4, { color: II.bone, width: 140, maxLines: 1, align: side === 0 ? 'left' : 'right' }));
      c.addChild(text(f.nick ? `"${f.nick.toUpperCase()}"` : f.country.toUpperCase(), 6, 14, { small: true, color: II.gold, width: 140, maxLines: 1, align: side === 0 ? 'left' : 'right' }));
      c.addChild(text(`${f.record.w}-${f.record.l}-${f.record.d}  /  OVR ${overall(f.skills)}  /  ${divisionName(f.division).toUpperCase()}`, 6, 24, { small: true, color: II.ash, width: 140, maxLines: 1, align: side === 0 ? 'left' : 'right' }));
      c.addChild(text(f.styles.slice(0, 2).join(' / ').toUpperCase(), 6, 32, { small: true, color: II.ash, width: 140, maxLines: 1, align: side === 0 ? 'left' : 'right' }));
      r.addChild(c);
    };
    plate(A, 0);
    plate(B, 1);

    // the pickers: a strip of portraits under each fighter
    const strip = (side: 0 | 1) => {
      const cx = side === 0 ? OX + 110 : OX + W - 110;
      const y = 196;
      for (let k = -2; k <= 2; k++) {
        const i = (this.pick[side] + k + l.length * 4) % l.length;
        const f = l[i];
        if (!f) continue;
        const p = fighterPortrait(f, 24);
        const sel = k === 0;
        p.position.set(cx - 12 + k * 28, y + (sel ? 0 : 4));
        p.alpha = sel ? 1 : 0.55;
        p.eventMode = 'static';
        p.cursor = 'pointer';
        p.on('pointertap', () => this.move(side, k));
        r.addChild(p);
        if (sel) r.addChild(new Graphics().rect(cx - 13, y - 1, 26, 26).stroke({ color: side === 0 ? II.blood : II.neon, width: 1 }));
      }
      r.addChild(button('<', cx - 84, y + 6, 12, 14, () => this.move(side, -1), { small: true, fill: II.steel }));
      r.addChild(button('>', cx + 72, y + 6, 12, 14, () => this.move(side, 1), { small: true, fill: II.steel }));
      r.addChild(button('RANDOM', cx - 24, y + 28, 48, 11, () => this.random(side), { small: true, fill: II.steel }));
    };
    strip(0);
    strip(1);

    // the middle: division, room, rounds, versus, READY (hidden while they square up)
    const mid = new Container();
    this.mid = mid;
    const mx = OX + W / 2 - 54;
    const divs = this.divisions();
    const di = Math.max(0, divs.findIndex((d) => d.id === this.div));
    mid.addChild(text('DIVISION', mx, 70, { small: true, width: 108, align: 'center', color: II.ash }));
    mid.addChild(button('<', mx, 78, 12, 14, () => this.setDiv(divs[(di + divs.length - 1) % divs.length].id), { small: true, fill: II.steel }));
    mid.addChild(text(divs[di].label, mx + 12, 82, { small: true, width: 84, align: 'center', color: II.bone, maxLines: 1 }));
    mid.addChild(button('>', mx + 96, 78, 12, 14, () => this.setDiv(divs[(di + 1) % divs.length].id), { small: true, fill: II.steel }));
    mid.addChild(text('ROOM', mx, 98, { small: true, width: 108, align: 'center', color: II.ash }));
    mid.addChild(button(VENUES[this.venue].name, mx, 106, 108, 14, () => { this.venue = (this.venue + 1) % VENUES.length; this.refresh(); }, { small: true, fill: II.steel }));
    mid.addChild(button(`${this.rounds} ROUNDS`, mx, 124, 52, 14, () => { this.rounds = this.rounds === 3 ? 5 : 3; this.refresh(); }, { small: true, fill: II.steel }));
    mid.addChild(button(this.versus ? '2 PLAYERS' : 'VS CPU', mx + 56, 124, 52, 14, () => { this.versus = !this.versus; this.refresh(); }, { small: true, fill: II.steel }));
    mid.addChild(button('READY', mx, 146, 108, 22, () => this.ready(), { fill: II.blood, border: II.sodium }));
    r.addChild(mid);
    if (!isTouchDevice()) r.addChild(text('A/D AND LEFT/RIGHT PICK  /  ENTER = READY', OX, H - 9, { small: true, width: W, align: 'center', color: II.ash }));
    this.callT = text('', OX, 160, { width: W, align: 'center', scale: 3, color: II.gold, shadow: 0x000000 }) as PixelText;
    this.callT.visible = false;
    r.addChild(this.callT);
  }

  private move(side: 0 | 1, d: number): void {
    if (this.faceoff >= 0) return;
    const n = this.list().length;
    this.pick[side] = (this.pick[side] + d + n) % n;
    if (this.pick[0] === this.pick[1]) this.pick[side] = (this.pick[side] + (d >= 0 ? 1 : -1) + n) % n;
    sfx('click');
    this.refresh();
  }

  private random(side: 0 | 1): void {
    const n = this.list().length;
    this.pick[side] = Math.floor(Math.random() * n);
    this.move(side, 0);
  }

  private setDiv(id: string): void {
    // men's and women's divisions don't mix: switching keeps both pickers in the same division
    this.div = id;
    this.pick = [0, 1];
    this.refresh();
  }

  private ready(): void {
    const l = this.list();
    const A = l[this.pick[0]];
    const B = l[this.pick[1]];
    if (!A || !B || A === B) return alertBox(this.g, 'Pick two fighters', 'Pick two different fighters.');
    if (isWomensDivision(A.division) !== isWomensDivision(B.division)) return alertBox(this.g, 'Not this fight', 'Men fight men and women fight women, even in the alley.');
    this.faceoff = 0;
    if (this.mid) this.mid.visible = false;
    sfx('bell');
    if (this.callT) {
      this.callT.setText('READY');
      this.callT.visible = true;
    }
  }

  private fight(): void {
    const s = roster();
    const l = this.list();
    const A = l[this.pick[0]];
    const B = l[this.pick[1]];
    for (const f of [A, B]) s.fighters[f.id] ??= f;
    const v = VENUES[this.venue].v();
    const ev: FightEvent = { id: 'qf2_' + Date.now(), name: VENUES[this.venue].name, number: null, week: s.week, venue: 'ape_x', region: 'na', card: [], status: 'scheduled', ppv: false, notes: ['started'] };
    const bout: Bout = makeBout(s, ev, A, B, 0, null);
    bout.rounds = this.rounds;
    ev.card.push(bout);
    const rng = new Rng(Date.now() & 0xffffff);
    const off = officialsFor(s, ev, rng);
    const prev = this.g.state;
    this.g.state = s;
    openLiveFight(this.g, {
      bout, A, B, skills: [A.skills, B.skills], player: 0, plan: 'balanced', oppPlan: 'balanced', cutTier: 2, seed: rng.int(1, 1e9),
      event: ev.name, judges: off.judges.map((j) => j.name), referee: v.referee, refLook: v.refLook,
      canvas: v.canvas, bare: v.bare, state: s, ev,
      versus: this.versus ? this.assign() : undefined,
      done: (res) => {
        this.g.state = prev;
        const w = res.winner ? s.fighters[res.winner] : null;
        this.faceoff = -1;
        alertBox(this.g, 'RESULT', w ? `${w.first} ${w.last} wins by ${res.method} (${res.detail}), round ${res.round} at ${res.time}.` : `${res.method === 'NC' ? 'No contest' : 'A draw'} (${res.detail}).`, () => this.refresh());
      },
    });
  }

  /** Two players: two pads, one pad and the keyboard, or the keyboard split down the middle. */
  private assign(): { p1: { pad?: number; kb: KeyboardShare }; p2: { pad?: number; kb: KeyboardShare } } {
    const pads = input.padList().map((p) => p.index);
    if (pads.length >= 2) return { p1: { pad: pads[0], kb: 'full' }, p2: { pad: pads[1], kb: 'none' } };
    if (pads.length === 1) return { p1: { pad: -1, kb: 'full' }, p2: { pad: pads[0], kb: 'none' } };
    return { p1: { pad: -1, kb: 'left' }, p2: { pad: -1, kb: 'right' } };
  }

  private back(): void {
    sfx('click');
    void import('./sequelmenus').then((m) => this.g.goto(new m.GameModesScene(this.g)));
  }

  onKey(e: KeyboardEvent): boolean {
    if (e.type !== 'keydown' || this.g.modals.length || this.faceoff >= 0) return false;
    if (e.key === 'Escape' || e.key === 'Backspace') this.back();
    else if (e.key === 'a' || e.key === 'A') this.move(0, -1);
    else if (e.key === 'd' || e.key === 'D') this.move(0, 1);
    else if (e.key === 'ArrowLeft') this.move(1, -1);
    else if (e.key === 'ArrowRight') this.move(1, 1);
    else if (e.key === 'Enter') this.ready();
    else return false;
    return true;
  }

  update(dt: number): void {
    this.t += dt;
    if (!this.g.modals.length && this.faceoff < 0 && input.buttonPressed('A')) this.ready();
    // the stage: two spotlights on two marks, haze drifting through them
    const st = this.stage;
    st.clear();
    const fo = this.faceoff;
    const k = fo < 0 ? 0 : Math.min(1, fo / 0.9); // walking to the middle
    // they stop a forehead apart: close enough to stare, never inside each other
    const xs: [number, number] = [OX + 110 + (W / 2 - 162) * ease(k), OX + W - 110 - (W / 2 - 162) * ease(k)];
    for (let i = 0; i < 2; i++) {
      const x = xs[i];
      for (let j = 6; j >= 1; j--) st.ellipse(x, 186, 14 * j, 3 + j * 0.8).fill({ color: i === 0 ? 0xff8a6a : 0x8ad0ff, alpha: 0.025 });
      st.poly([x - 14, 0, x + 14, 0, x + 46, 186, x - 46, 186]).fill({ color: 0xfff0d0, alpha: 0.045 });
    }
    for (let j = 0; j < 30; j++) st.rect(((j * 67 + this.t * 6) % SW), 30 + ((j * 41 + this.t * 3) % 150), 1, 1).fill({ color: 0xffffff, alpha: 0.18 });
    // the models: their own stance and bounce; at READY they walk in and square up, then taunt
    const g = this.models;
    g.clear();
    for (let i = 0 as 0 | 1; i < 2; i = (i + 1) as 0 | 1) {
      const L = this.looks[i];
      if (!L) continue;
      const walking = fo >= 0 && fo < 0.9;
      const target: Rig = walking ? lerpRig(POSES.walk1, POSES.walk2, (Math.sin(this.t * 12) + 1) / 2) : fo > 1.4 && fo < 2.3 ? tauntRig(L, this.t) : POSES.guard;
      this.rigs[i] = lerpRig(this.rigs[i], target, Math.min(1, dt * 14));
      const bounce = walking ? 0 : Math.round(Math.sin(this.t * 6 * (L.tempo ?? 1) + i) * 1.2);
      g.ellipse(xs[i], 187, 22, 3).fill({ color: 0x000000, alpha: 0.5 });
      drawRig(g, this.rigs[i], Math.round(xs[i]), 186 + bounce, i === 0 ? 1 : -1, L, 1.45);
    }
    if (fo >= 0) {
      this.faceoff += dt;
      if (this.callT) {
        this.callT.setText(fo < 0.9 ? 'READY' : fo < 2.3 ? 'FACE OFF' : 'FIGHT!');
        this.callT.alpha = 0.6 + Math.sin(this.t * 10) * 0.4;
      }
      // flashbulbs while they're nose to nose
      if (fo > 0.9 && fo < 2.3 && Math.random() < dt * 6) this.flash = 0.25;
      if (fo > 2.6) {
        this.faceoff = -2; // launching
        this.fight();
      }
    }
    if (this.flash > 0) {
      g.rect(0, 0, SW, H).fill({ color: 0xffffff, alpha: this.flash });
      this.flash -= dt * 1.5;
    }
  }
}

const ease = (k: number): number => k * k * (3 - 2 * k);
function lerp(a: number, b: number, t: number): number {
  const r = Math.round(((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * t));
  const g = Math.round(((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * t));
  const bl = Math.round((a & 255) + (((b & 255) - (a & 255)) * t));
  return (r << 16) | (g << 8) | bl;
}
