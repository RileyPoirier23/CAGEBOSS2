/**
 * CAGE BOSS II: CREATE A FIGHTER. The model stands on the left, under a light, cycling through its
 * guard and its taunt, and everything on the right changes it live: BODY (build, height, division),
 * HAIR (all fifteen styles, the colour, the fade), FACE (beard, brows, nose, scars, a mask), INK
 * (a design per zone) and KIT (the cut, the pattern, the colours). Saved fighters show up in
 * QUICK FIGHT under CUSTOM (cageboss2.custom).
 */
import { Container, Graphics } from 'pixi.js';
import { Scene } from '../app';
import type { Fighter } from '../../core/types';
import { W, H, OX, SW, text, button } from '../kit';
import { domInput, alertBox } from '../widgets';
import { POSES, drawRig, lerpRig, lookFor, tauntRig, type Rig } from '../rig';
import { generateFighter } from '../../sim/generate';
import { content } from '../../core/content';
import { Rng } from '../../core/rng';
import { loadJSON, storeJSON } from '../../core/save';
import { DIVISION_ORDER, divisionName } from '../../sim/divisions';
import { isWomensDivision } from '../../sim/fighters';
import { sfx } from '../../audio/sfx';
import { II } from '../theme';
import { HAIR_COLORS, SKIN_TONES } from '../../art/palette';

const CUSTOM_KEY = 'cageboss2.custom';
export const loadCustomFighters = (): Fighter[] => loadJSON<Fighter[]>(CUSTOM_KEY, []);

type Tab = 'body' | 'hair' | 'face' | 'ink' | 'kit';
const HAIR_NAMES = ['BALD', 'BUZZ', 'SHORT', 'SWEPT', 'CROP', 'LONG', 'BRAIDS', 'BUN', 'CURLY MOP', 'LONG WAVES', 'MULLET', 'HIGH FADE CURLS', 'SLICK BACK', 'AFRO', 'MOHAWK'];
const SLEEVES = ['BARE', 'KOI AND WAVES', 'TRIBAL', 'ROSES AND SCRIPT', 'THE MENU'];
const CHESTS = ['BARE', 'WINGS', 'EAGLE', 'MEDALLION', 'SCRIPT'];
const BACKS = ['BARE', 'CROSS', 'WINGS'];
const CUTS = ['short', 'thai', 'board'] as const;
const PATTERNS = ['plain', 'chevron', 'flames', 'stripes', 'split', 'stars', 'checker', 'camo', 'tiger'];
const KIT_COLORS = [0x141416, 0x9e2a2a, 0x1f3a6e, 0x1e7a3c, 0xf2c12e, 0xe0559a, 0x7a3fb0, 0xf2f2f2, 0xe8822a, 0x2aa0d8];
const STYLES = ['Pressure Striker', 'Counter Striker', 'Kickboxer', 'Muay Thai', 'Wrestler', 'Sub Hunter', 'Brawler', 'Grinder'];

export class SequelCreateScene extends Scene {
  music = 'title' as const;
  private f: Fighter;
  private tab: Tab = 'body';
  private model = new Graphics();
  private rig: Rig = { ...POSES.guard };
  private t = 0;
  private inputs: { remove: () => void; value: () => string }[] = [];

  constructor(g: ConstructorParameters<typeof Scene>[0], private onDone: () => void) {
    super(g);
    const f = generateFighter(new Rng(Date.now() >>> 0), content().names, { division: 'middle', gender: 'M', tier: 'contender', id: `custom_${Date.now().toString(36)}` });
    f.first = 'New';
    f.last = 'Fighter';
    f.nick = 'The Rookie';
    f.look.ink2 = { sleeveF: 0, sleeveB: 0, chest: 0, back: 0 };
    f.look.kit2 = { cut: 'short', pattern: 'plain', main: 0x141416, trim: 0xc8202a, accent: 0xc8202a };
    this.f = f;
  }

  build(): void {
    this.inputs.forEach((i) => i.remove());
    this.inputs = [];
    const r = this.root;
    r.x = -OX;
    // a refresh destroys the old root's children: the model gets a fresh canvas each build
    this.model = new Graphics();
    const f = this.f;
    const bg = new Graphics();
    for (let y = 0; y < H; y += 2) bg.rect(0, y, SW, 2).fill(y < 196 ? 0x0c0a10 : 0x08070b);
    for (let j = 6; j >= 1; j--) bg.ellipse(OX + 110, 200, 16 * j, 3 + j).fill({ color: 0xffd8a0, alpha: 0.03 });
    bg.poly([OX + 96, 0, OX + 124, 0, OX + 168, 200, OX + 52, 200]).fill({ color: 0xfff0d0, alpha: 0.05 });
    r.addChild(bg, this.model);
    r.addChild(new Graphics().rect(0, 0, SW, 18).fill(0x000000).rect(0, 17, SW, 1).fill(II.blood));
    r.addChild(text('CREATE A FIGHTER', OX + 6, 5, { color: II.gold }));
    r.addChild(button('< BACK', OX + W - 56, 3, 50, 12, () => this.leave(), { small: true, fill: II.steel }));

    // name, nickname, country
    const px = OX + 6;
    r.addChild(text('NAME', px, 206, { small: true, color: II.ash }));
    this.inputs.push(domInput(this.g, px, 214, 100, 12, `${f.first} ${f.last}`, { maxLength: 26, onChange: (v) => { const parts = v.trim().split(/\s+/); f.first = parts[0] || 'New'; f.last = parts.slice(1).join(' ') || 'Fighter'; } }));
    r.addChild(text('NICKNAME', px + 108, 206, { small: true, color: II.ash }));
    this.inputs.push(domInput(this.g, px + 108, 214, 100, 12, f.nick, { maxLength: 24, onChange: (v) => { f.nick = v; } }));
    r.addChild(text('COUNTRY', px, 230, { small: true, color: II.ash }));
    this.inputs.push(domInput(this.g, px, 238, 100, 12, f.country, { maxLength: 24, onChange: (v) => { f.country = v; } }));

    // the tabs
    const tabs: Tab[] = ['body', 'hair', 'face', 'ink', 'kit'];
    tabs.forEach((tb, i) => r.addChild(button(tb.toUpperCase(), OX + 228 + i * 49, 24, 46, 14, () => { this.tab = tb; sfx('click'); this.refresh(); }, { small: true, fill: this.tab === tb ? II.blood : II.steel, border: this.tab === tb ? II.sodium : undefined })));
    const panel = new Container();
    panel.position.set(OX + 228, 44);
    r.addChild(new Graphics().rect(OX + 224, 40, 250, 186).fill({ color: II.panel, alpha: 0.9 }).rect(OX + 224, 40, 250, 186).stroke({ color: II.edge, width: 1 }));
    r.addChild(panel);
    let y = 4;
    const row = (label: string, value: string, dec: () => void, inc: () => void) => {
      panel.addChild(text(label, 0, y + 3, { small: true, color: II.ash }));
      panel.addChild(button('<', 90, y, 12, 13, () => { dec(); this.refresh(); }, { small: true, fill: II.steel }));
      panel.addChild(text(value, 104, y + 3, { small: true, width: 120, align: 'center', color: II.bone, maxLines: 1 }));
      panel.addChild(button('>', 226, y, 12, 13, () => { inc(); this.refresh(); }, { small: true, fill: II.steel }));
      y += 17;
    };
    const cyc = (v: number, n: number, d: number) => (v + d + n) % n;
    const L = f.look;
    if (this.tab === 'body') {
      row('BUILD', ['LEAN', 'ATHLETIC', 'JACKED', 'HEAVY'][L.build] ?? 'ATHLETIC', () => (L.build = cyc(L.build, 4, -1)), () => (L.build = cyc(L.build, 4, 1)));
      row('SKIN', `TONE ${L.skin + 1}`, () => (L.skin = cyc(L.skin, SKIN_TONES.length, -1)), () => (L.skin = cyc(L.skin, SKIN_TONES.length, 1)));
      const men = DIVISION_ORDER.filter((d) => !isWomensDivision(d));
      const di = Math.max(0, men.indexOf(f.division));
      row('DIVISION', divisionName(f.division).toUpperCase(), () => (f.division = men[cyc(di, men.length, -1)]), () => (f.division = men[cyc(di, men.length, 1)]));
      row('HEIGHT', `${f.height} CM`, () => (f.height = Math.max(160, f.height - 2)), () => (f.height = Math.min(206, f.height + 2)));
      const si = Math.max(0, STYLES.indexOf(f.styles[0]));
      row('STYLE', STYLES[si].toUpperCase(), () => (f.styles = [STYLES[cyc(si, STYLES.length, -1)]]), () => (f.styles = [STYLES[cyc(si, STYLES.length, 1)]]));
    } else if (this.tab === 'hair') {
      row('STYLE', HAIR_NAMES[L.hair] ?? 'SHORT', () => (L.hair = cyc(L.hair, HAIR_NAMES.length, -1)), () => (L.hair = cyc(L.hair, HAIR_NAMES.length, 1)));
      row('COLOUR', `SHADE ${L.hairColor + 1}`, () => (L.hairColor = cyc(L.hairColor, HAIR_COLORS.length, -1)), () => (L.hairColor = cyc(L.hairColor, HAIR_COLORS.length, 1)));
      row('FADE', L.fade ? 'FADED SIDES' : 'NO FADE', () => (L.fade = L.fade ? 0 : 1), () => (L.fade = L.fade ? 0 : 1));
      row('BEARD', ['CLEAN', 'STUBBLE', 'SHORT', 'FULL', 'GOATEE', 'MOUSTACHE', 'BIG'][L.beard] ?? 'CLEAN', () => (L.beard = cyc(L.beard, 7, -1)), () => (L.beard = cyc(L.beard, 7, 1)));
    } else if (this.tab === 'face') {
      row('BROWS', ['LIGHT', 'MEDIUM', 'HEAVY'][L.brows] ?? 'MEDIUM', () => (L.brows = cyc(L.brows, 3, -1)), () => (L.brows = cyc(L.brows, 3, 1)));
      row('NOSE', ['STRAIGHT', 'WIDE', 'BROKEN'][L.nose] ?? 'STRAIGHT', () => (L.nose = cyc(L.nose, 3, -1)), () => (L.nose = cyc(L.nose, 3, 1)));
      row('EARS', ['CLEAN', 'A BIT', 'CAULIFLOWER', 'FULL CAULI'][L.ears] ?? 'CLEAN', () => (L.ears = cyc(L.ears, 4, -1)), () => (L.ears = cyc(L.ears, 4, 1)));
      row('SCAR', ['NONE', 'BROW', 'CHEEK', 'BOTH'][L.scar] ?? 'NONE', () => (L.scar = cyc(L.scar, 4, -1)), () => (L.scar = cyc(L.scar, 4, 1)));
      const masks = [0, 0xc8202a, 0x2a4ad8, 0x1e7a3c, 0xf2c12e];
      const mi = Math.max(0, masks.indexOf(L.mask ?? 0));
      row('MASK', mi ? `LUCHADOR ${mi}` : 'NONE', () => (L.mask = masks[cyc(mi, masks.length, -1)]), () => (L.mask = masks[cyc(mi, masks.length, 1)]));
      row('CHAIN', L.chain ? 'GOLD CHAIN' : 'NONE', () => (L.chain = L.chain ? 0 : 1), () => (L.chain = L.chain ? 0 : 1));
    } else if (this.tab === 'ink') {
      const ink = (L.ink2 ??= { sleeveF: 0, sleeveB: 0, chest: 0, back: 0 });
      row('NEAR SLEEVE', SLEEVES[ink.sleeveF], () => (ink.sleeveF = cyc(ink.sleeveF, SLEEVES.length, -1)), () => (ink.sleeveF = cyc(ink.sleeveF, SLEEVES.length, 1)));
      row('FAR SLEEVE', SLEEVES[ink.sleeveB], () => (ink.sleeveB = cyc(ink.sleeveB, SLEEVES.length, -1)), () => (ink.sleeveB = cyc(ink.sleeveB, SLEEVES.length, 1)));
      row('CHEST', CHESTS[ink.chest], () => (ink.chest = cyc(ink.chest, CHESTS.length, -1)), () => (ink.chest = cyc(ink.chest, CHESTS.length, 1)));
      row('BACK', BACKS[ink.back], () => (ink.back = cyc(ink.back, BACKS.length, -1)), () => (ink.back = cyc(ink.back, BACKS.length, 1)));
      L.tattoo = ink.sleeveF || ink.sleeveB || ink.chest || ink.back ? 3 : 0;
    } else {
      const kit = (L.kit2 ??= { cut: 'short', pattern: 'plain', main: 0x141416, trim: 0xc8202a, accent: 0xc8202a });
      const ci = CUTS.indexOf(kit.cut);
      row('CUT', ['FIGHT SHORTS', 'MUAY THAI', 'BOARD SHORTS'][ci], () => (kit.cut = CUTS[cyc(ci, 3, -1)]), () => (kit.cut = CUTS[cyc(ci, 3, 1)]));
      const pi = Math.max(0, PATTERNS.indexOf(kit.pattern));
      row('PATTERN', PATTERNS[pi].toUpperCase(), () => (kit.pattern = PATTERNS[cyc(pi, PATTERNS.length, -1)]), () => (kit.pattern = PATTERNS[cyc(pi, PATTERNS.length, 1)]));
      for (const [label, key] of [['COLOUR', 'main'], ['TRIM', 'trim'], ['ACCENT', 'accent']] as const) {
        const k = Math.max(0, KIT_COLORS.indexOf(kit[key]));
        row(label, `SWATCH ${k + 1}`, () => (kit[key] = KIT_COLORS[cyc(k, KIT_COLORS.length, -1)]), () => (kit[key] = KIT_COLORS[cyc(k, KIT_COLORS.length, 1)]));
        panel.addChild(new Graphics().rect(160, y - 14, 10, 9).fill(kit[key]).stroke({ color: 0x000000, width: 1 }));
      }
    }
    r.addChild(button('RANDOM', OX + 228, 232, 70, 16, () => this.randomize(), { small: true, fill: II.steel }));
    r.addChild(button('SAVE FIGHTER', OX + 304, 232, 166, 16, () => this.save(), { fill: II.blood, border: II.sodium }));
  }

  private randomize(): void {
    const r = new Rng(Date.now() >>> 0);
    const L = this.f.look;
    L.build = r.int(0, 3); L.skin = r.int(0, SKIN_TONES.length - 1); L.hair = r.int(0, HAIR_NAMES.length - 1); L.hairColor = r.int(0, HAIR_COLORS.length - 1);
    L.fade = r.int(0, 1); L.beard = r.int(0, 6); L.scar = r.int(0, 3); L.nose = r.int(0, 2);
    L.ink2 = { sleeveF: r.int(0, 4), sleeveB: r.int(0, 4), chest: r.int(0, 4), back: r.int(0, 2) };
    L.kit2 = { cut: CUTS[r.int(0, 2)], pattern: PATTERNS[r.int(0, PATTERNS.length - 1)], main: KIT_COLORS[r.int(0, KIT_COLORS.length - 1)], trim: KIT_COLORS[r.int(0, KIT_COLORS.length - 1)], accent: KIT_COLORS[r.int(0, KIT_COLORS.length - 1)] };
    sfx('click');
    this.refresh();
  }

  private save(): void {
    const list = loadCustomFighters().filter((x) => x.id !== this.f.id);
    if (list.length >= 40) return alertBox(this.g, 'Full', 'Forty custom fighters is the limit. Delete one in Quick Fight first.');
    storeJSON(CUSTOM_KEY, [...list, this.f]);
    sfx('cash');
    this.g.toast(`${this.f.first} ${this.f.last} IS READY. FIND THEM IN QUICK FIGHT UNDER CUSTOM.`, II.gold);
    this.leave();
  }

  private leave(): void {
    this.inputs.forEach((i) => i.remove());
    this.onDone();
  }

  update(dt: number): void {
    this.t += dt;
    const L = lookFor(this.f, 0);
    // guard, then the taunt, then guard: the model shows off what you made
    const taunting = Math.floor(this.t / 3) % 3 === 2;
    this.rig = lerpRig(this.rig, taunting ? tauntRig(L, this.t) : POSES.guard, Math.min(1, dt * 10));
    const g = this.model;
    g.clear();
    g.ellipse(OX + 110, 197, 22, 3).fill({ color: 0x000000, alpha: 0.5 });
    drawRig(g, this.rig, OX + 110, 196 + Math.round(Math.sin(this.t * 5) * 1), 1, L, 1.75 * (this.f.height / 183));
  }
}
