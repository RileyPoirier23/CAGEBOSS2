/**
 * CAGE BOSS II's menus past the title: GAME MODES (two doors), then each mode's own screen with
 * its own backdrop and its saves: PROMOTER MODE (new save, load save, sandbox save) and TALES OF
 * LEGACY (new save, load save, and a sandbox once you've finished the story).
 */
import { Container, Graphics } from 'pixi.js';
import { Scene, type Game } from '../app';
import { H, SW, OX, text, button, ScrollBox } from '../kit';
import { openWindow, alertBox, confirm, domInput } from '../widgets';
import { sfx } from '../../audio/sfx';
import { II } from '../theme';
import { paintRoom } from '../rooms';
import { lerpColor } from '../../art/palette';
import { seqVenueArt } from '../sequelart';
import { listSlots, newSlot, setActiveSlot, deleteSlot, slotLabel, type SlotKind, type SlotMeta } from '../../sequel/slots';
import { forgetRun, readRun, writeRun } from '../../sequel/session';
import { forgetStory, writeStory, loadStoryTrophy } from '../../sequel/storysession';
import { newSequelRun, makeSandbox } from '../../sequel/model';
import { newStorySave, STORY_CHAPTERS, MAIN_CHAPTERS } from '../../sequel/story';
import { isTouchDevice } from '../../core/platform';

const KIND_NAME: Record<SlotKind, string> = { run: 'PROMOTER MODE', story: 'TALES OF LEGACY' };

/** The shared frame: a backdrop, a dark column of options on the left, a title. */
abstract class MenuScene extends Scene {
  music = 'title' as const;
  protected t = 0;
  protected fx = new Graphics();
  protected abstract backdrop(): Container;
  protected abstract title: string;
  protected abstract kicker: string;
  protected abstract options(): [string, () => void, number?][];
  protected abstract back(): void;

  build(): void {
    const r = this.root;
    r.x = -OX;
    r.addChild(this.backdrop());
    r.addChild(this.fx);
    const panel = new Graphics();
    panel.rect(0, 0, 200, H).fill({ color: II.night, alpha: 0.9 });
    for (let x = 200; x < 224; x++) panel.rect(x, 0, 1, H).fill({ color: II.night, alpha: 0.9 * (1 - (x - 200) / 24) });
    panel.rect(200, 0, 1, H).fill({ color: II.sodium, alpha: 0.5 });
    r.addChild(panel);
    r.addChild(text('CAGE BOSS II', 16, 14, { small: true, color: II.blood }));
    r.addChild(text(this.title, 16, 24, { scale: 2, color: II.gold, shadow: 0x000000, width: 180, maxLines: 2 }));
    r.addChild(text(this.kicker, 16, 58, { small: true, width: 176, color: II.ash, maxLines: 4 }));
    const touch = isTouchDevice();
    const opts = this.options();
    opts.forEach(([label, fn, fill], i) => {
      r.addChild(button(label, 16, 96 + i * (touch ? 24 : 21), 172, touch ? 19 : 17, () => { sfx('click'); fn(); }, { fill: fill ?? II.steel, border: i === 0 ? II.sodium : undefined }));
    });
    r.addChild(button('< BACK', 16, H - 24, 60, 14, () => this.back(), { small: true, fill: II.steel }));
  }

  onKey(e: KeyboardEvent): boolean {
    if (e.type === 'keydown' && (e.key === 'Escape' || e.key === 'Backspace') && !this.g.modals.length) {
      this.back();
      return true;
    }
    return false;
  }

  update(dt: number): void {
    this.t += dt;
    const g = this.fx;
    g.clear();
    let s = 313;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) {
      const x = (rnd() * SW - this.t * 26) % SW;
      const y = (rnd() * H + this.t * (110 + rnd() * 80)) % H;
      g.rect(Math.round(x < 0 ? x + SW : x), Math.round(y), 1, 3).fill({ color: 0x9ab0c8, alpha: 0.25 });
    }
  }
}

// ---------------------------------------------------------------- game modes: two doors

export class GameModesScene extends MenuScene {
  protected title = 'GAME MODES';
  protected kicker = 'Two doors on the same street: a desk behind one, a ring behind the other. And a cage in the back for anyone who just wants to fight.';
  protected backdrop(): Container {
    // the street at night: the warehouse on one side, Ray's on the other
    const c = new Container();
    c.addChild(seqVenueArt('warehouse', SW, H, 77));
    const g = new Graphics();
    g.rect(0, 0, SW, H).fill({ color: 0x000000, alpha: 0.35 });
    // two lit doors
    for (const [x, label, col] of [[250, 'THE WAREHOUSE', II.blood], [370, "RAY'S", II.gold]] as [number, string, number][]) {
      g.rect(x, 100, 70, 96).fill(0x1c1812).rect(x, 100, 70, 96).stroke({ color: col, width: 1 });
      g.rect(x + 4, 104, 62, 88).fill({ color: 0xffc070, alpha: 0.35 });
      for (let k = 0; k < 6; k++) g.poly([x - k * 5, 196 + k * 6, x + 70 + k * 5, 196 + k * 6, x + 74 + k * 6, 202 + k * 6, x - 4 - k * 6, 202 + k * 6]).fill({ color: 0xffb050, alpha: 0.08 - k * 0.01 });
      c.addChild(text(label, x, 88, { small: true, width: 70, align: 'center', color: col }));
    }
    c.addChildAt(g, 1);
    return c;
  }
  protected options(): [string, () => void, number?][] {
    return [
      ['PROMOTER MODE', () => this.g.goto(new PromoterMenuScene(this.g)), II.blood],
      ['TALES OF LEGACY', () => this.g.goto(new LegacyMenuScene(this.g)), II.blood],
      ['QUICK FIGHT', () => void import('./sequelquick').then((m) => this.g.loading('Lighting the room', () => this.g.goto(new m.SequelQuickFightScene(this.g)), 0.9))],
    ];
  }
  protected back(): void {
    void import('./sequel').then((m) => this.g.goto(new m.SequelTitleScene(this.g)));
  }
}

// ---------------------------------------------------------------- promoter mode

export class PromoterMenuScene extends MenuScene {
  protected title = 'PROMOTER MODE';
  protected kicker = 'You are the promoter. Forty Saturdays, one warehouse, the desk, the cards, the buyback. Sandbox: no deadline, a million to play with, no trophies.';
  protected backdrop(): Container {
    const c = new Container();
    c.addChild(seqVenueArt('warehouse', SW, H, 12));
    // the desk under the lamp
    const g = new Graphics();
    g.rect(0, 0, SW, H).fill({ color: 0x000000, alpha: 0.25 });
    g.rect(250, 170, 220, 60).fill(0x3a2a1e).rect(250, 170, 220, 4).fill(0x5a4430);
    g.rect(290, 150, 80, 22).fill(0xe8dfc8).rect(380, 156, 60, 16).fill(0xd8ccb0);
    g.poly([340, 40, 330, 60, 350, 60]).fill(0x2a2a30);
    for (let k = 0; k < 6; k++) g.poly([340, 60, 300 - k * 10, 170, 380 + k * 10, 170]).fill({ color: 0xffd890, alpha: 0.05 });
    c.addChild(g);
    return c;
  }
  protected options(): [string, () => void, number?][] {
    const has = listSlots('run').length > 0;
    return [
      ['NEW SAVE', () => newSaveFlow(this.g, 'run', false), II.blood],
      ['LOAD SAVE', () => (has ? openSaves(this.g, 'run') : alertBox(this.g, 'No saves', 'No promoter saves yet. Start one.'))],
      ['SANDBOX SAVE', () => newSaveFlow(this.g, 'run', true)],
    ];
  }
  protected back(): void {
    this.g.goto(new GameModesScene(this.g));
  }
}

// ---------------------------------------------------------------- tales of legacy

export class LegacyMenuScene extends MenuScene {
  protected title = 'TALES OF LEGACY';
  protected kicker = `${MAIN_CHAPTERS} chapters across a few years at Ray's Boxing & Soup. Every fighter has a story. Sandbox opens when you finish one: any chapter, no trophies.`;
  protected backdrop(): Container {
    const c = new Container();
    const g = new Graphics();
    // Ray's: the back wall, the bags, the soup, the ring in front
    g.rect(0, 0, SW, H).fill(0x1a120e);
    const band = new Graphics();
    paintRoom(band, 'rays', lerpColor, 150);
    band.scale.set(SW / 480, 1.6);
    c.addChild(g, band);
    const ring = new Graphics();
    ring.rect(0, 190, SW, H - 190).fill(0x2a1e16);
    for (let k = 0; k < 3; k++) ring.rect(0, 150 + k * 14, SW, 2).fill([0xc8202a, 0xf0ece0, 0x2a4aa8][k]);
    ring.rect(SW - 60, 130, 6, 70).fill(0x16161c);
    ring.rect(0, 0, SW, H).fill({ color: 0x000000, alpha: 0.2 });
    c.addChild(ring);
    return c;
  }
  protected options(): [string, () => void, number?][] {
    const finished = loadStoryTrophy().playthroughs > 0;
    const has = listSlots('story').length > 0;
    return [
      ['NEW SAVE', () => newSaveFlow(this.g, 'story', false), II.blood],
      ['LOAD SAVE', () => (has ? openSaves(this.g, 'story') : alertBox(this.g, 'No saves', 'No Tales of Legacy saves yet. Start one.'))],
      [finished ? 'SANDBOX SAVE' : 'SANDBOX (FINISH THE STORY)', () => (finished ? sandboxStory(this.g) : alertBox(this.g, 'Locked', 'Finish the story once and the sandbox opens: start any chapter, replay any fight.')), finished ? undefined : 0x1a161e],
    ];
  }
  protected back(): void {
    this.g.goto(new GameModesScene(this.g));
  }
}

// ---------------------------------------------------------------- the flows

/** Name the save, make the slot, start it. */
function newSaveFlow(g: Game, kind: SlotKind, sandbox: boolean, after?: (meta: SlotMeta) => void): void {
  const n = listSlots(kind).length + 1;
  const win = openWindow(g, `${sandbox ? 'SANDBOX' : 'NEW'} ${KIND_NAME[kind]} SAVE`, 260, 78);
  win.body.addChild(text('Name the save:', 8, 4, { small: true, color: II.ash }));
  const input = domInput(g, 8, 14, 244, 14, `${sandbox ? 'SANDBOX' : kind === 'run' ? 'THE WAREHOUSE' : 'TALE'} ${n}`, { maxLength: 28, in: win.body });
  win.body.addChild(button('START', 70, 40, 120, 16, () => {
    const name = input.value();
    input.remove();
    win.close();
    const meta = newSlot(kind, name, sandbox);
    if (after) return after(meta);
    startSlot(g, meta, true);
  }, { fill: II.blood, border: II.sodium }));
}

/** Start (fresh) or open (load) the slot that is now active. */
function startSlot(g: Game, meta: SlotMeta, fresh: boolean): void {
  setActiveSlot(meta.kind, meta.id);
  if (meta.kind === 'run') {
    forgetRun();
    if (fresh) {
      g.loading('Opening the warehouse', () => {
        const run = newSequelRun(Math.floor(Math.random() * 1e9));
        if (meta.sandbox) makeSandbox(run);
        writeRun(run);
        void import('./sequelhub').then((m) => g.goto(new m.SequelHubScene(g)));
      }, 1.2);
      return;
    }
    const run = readRun();
    if (!run) return alertBox(g, 'Empty save', 'That save has nothing in it. Start it again from NEW SAVE.');
    void import('./sequel').then((m) => m.routeSequel(g, run));
    return;
  }
  forgetStory();
  if (fresh) {
    const save = newStorySave(Math.floor(Math.random() * 1e9));
    if (meta.sandbox) save.flags.sandbox = true;
    writeStory(save);
  }
  void import('./sequel').then((m) => m.openStoryMode(g));
}

/** A sandbox story: pick any chapter to start from (after one full playthrough). */
function sandboxStory(g: Game): void {
  const win = openWindow(g, 'TALES OF LEGACY: SANDBOX', 300, 196);
  win.body.addChild(text('Start from any chapter. Nothing you do here touches the trophy case.', 6, 2, { width: 288, small: true, color: II.ash, maxLines: 2 }));
  STORY_CHAPTERS.forEach((ch, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    win.body.addChild(button(`${ch.no}. ${ch.title}`, 6 + col * 146, 20 + row * 25, 140, 20, () => {
      win.close();
      newSaveFlow(g, 'story', true, (meta) => {
        setActiveSlot('story', meta.id);
        forgetStory();
        const save = newStorySave(Math.floor(Math.random() * 1e9));
        save.flags.sandbox = true;
        save.chapter = i;
        // the chapters before are history: their intros are skipped and Han's knee is where the story left it
        for (const c of STORY_CHAPTERS.slice(0, i)) save.flags[`intro_${c.id}`] = save.flags[`outro_${c.id}`] = save.flags[`talk_${c.id}`] = true;
        if (i >= 8) save.flags.rayDead = true;
        if (i >= 9) save.flags.hanInjured = true;
        if (i >= 10) { save.flags.finalWinner = 'player'; save.choices.ch_buyback = 'callout_han'; }
        writeStory(save);
        void import('./sequel').then((m) => m.openStoryMode(g));
      });
    }, { small: true, fill: II.steel }));
  });
}

/** The save list: load, or delete. */
export function openSaves(g: Game, kind: SlotKind): void {
  const slots = listSlots(kind);
  const win = openWindow(g, `LOAD  /  ${KIND_NAME[kind]}`, 360, 210);
  const sb = new ScrollBox(348, 186);
  sb.position.set(6, 2);
  slots.forEach((s, i) => {
    const y = i * 30;
    const row = new Container();
    row.position.set(0, y);
    row.addChild(new Graphics().rect(0, 0, 334, 27).fill(i % 2 ? II.panel : II.panelHi).rect(0, 0, 2, 27).fill(s.sandbox ? II.neon : II.sodium));
    if (s.sandbox) row.addChild(new Graphics().rect(6, 4, 40, 9).fill(II.neon), text('SANDBOX', 6, 6, { small: true, width: 40, align: 'center', color: II.night }));
    row.addChild(text(s.name, s.sandbox ? 50 : 6, 5, { small: true, color: II.bone, width: 200, maxLines: 1 }));
    row.addChild(text(s.summary || 'NOT STARTED', 6, 16, { small: true, color: II.ash, width: 200, maxLines: 1 }));
    row.addChild(text(new Date(s.updatedAt).toLocaleDateString(), 160, 5, { small: true, color: II.ash, width: 60, align: 'right' }));
    row.addChild(button('LOAD', 226, 6, 50, 15, () => { win.close(); startSlot(g, s, false); }, { small: true, fill: II.blood, border: II.sodium }));
    row.addChild(button('DELETE', 280, 6, 50, 15, () => confirm(g, `Delete "${slotLabel(s)}"? This can't be undone.`, () => { deleteSlot(kind, s.id); win.close(); openSaves(g, kind); }, 'DELETE', 'KEEP'), { small: true, fill: II.steel }));
    sb.content.addChild(row);
  });
  if (!slots.length) sb.content.addChild(text('No saves yet.', 0, 0, { color: II.ash }));
  sb.refresh();
  win.body.addChild(sb);
}

/** CONTINUE on the title: whichever save, of either mode, you played last. */
export function continueLatest(g: Game): boolean {
  const all = [...listSlots('run'), ...listSlots('story')].sort((a, b) => b.updatedAt - a.updatedAt);
  const last = all[0];
  if (!last) return false;
  startSlot(g, last, false);
  return true;
}

export const hasAnySave = (): boolean => listSlots('run').length + listSlots('story').length > 0;

/** Used by the title: a line about the newest save. */
export function latestSaveLine(): string {
  const all = [...listSlots('run'), ...listSlots('story')].sort((a, b) => b.updatedAt - a.updatedAt);
  const s = all[0];
  return s ? `${KIND_NAME[s.kind]}: ${slotLabel(s)}  /  ${s.summary}` : '';
}
