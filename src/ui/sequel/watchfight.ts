/**
 * CAGE BOSS II: WATCH THE FIGHT. The promoter's seat at the cage: a bout the sim already
 * decided, played back in the full arena from its own play-by-play — walkout, every exchange,
 * the blood on the canvas, the finish. A broadcast strip under the cage (portraits, damage,
 * the clock, the last few calls) and a speed dial, because some Saturdays are long.
 */
import { Container, Graphics, type Ticker } from 'pixi.js';
import type { Game } from '../app';
import type { Bout, Fighter, FightEvent, GameState, TickerLine } from '../../core/types';
import { content } from '../../core/content';
import { commentate } from '../../sim/commentary';
import { W, H, SW, OX, text, button } from '../kit';
import { ArenaView, AH, AW } from '../arena';
import { fighterPortrait } from '../sprites';
import { input } from '../../core/input';
import { sfx } from '../../audio/sfx';
import { II } from '../theme';
import { marksFromResult } from '../marks';
import type { PixelText } from '../text';

export interface WatchOpts {
  A: Fighter;
  B: Fighter;
  rounds: number;
  ticker: TickerLine[];
  /** "MAIN EVENT", "OPENER"... */
  slot: string;
  venue: string;
  /** the result line shown when the tape runs out ("ZETA WINS / KO R2 1:11") */
  verdict: string;
  verdictColor: number;
  /** the broadcast's camera package: side on, the broadcast push-in, or the overhead */
  camera?: 'side' | 'tv' | 'top';
  done?: () => void;
}

const SPEEDS = [1, 2, 4];

/**
 * The first game's booth on the tape: the play-by-play plus whoever is calling it (Blow Hogan,
 * Sandwich Cormier, the rest). The booth only needs the two fighters, the bout and a card to sit on.
 */
function withBooth(o: WatchOpts): TickerLine[] {
  try {
    // the booth calls Dane the president (he isn't, any more; the booth didn't get the memo)
    const s = { fighters: { [o.A.id]: o.A, [o.B.id]: o.B }, flags: {}, week: 0, belts: {}, president: { name: 'Dane Whyte' } } as unknown as GameState;
    const ev = { id: `watch_${o.A.id}`, name: o.venue, number: null, venue: 'warehouse', week: 0, bouts: [] } as unknown as FightEvent;
    const bout = { id: `watch_${o.A.id}_${o.B.id}`, a: o.A.id, b: o.B.id, division: o.A.division, title: null, rounds: o.rounds, position: o.slot === 'MAIN EVENT' ? 0 : 2 } as unknown as Bout;
    return commentate(s, ev, bout, o.ticker, o.ticker.length * 7919 + o.A.id.length);
  } catch {
    return o.ticker;
  }
}
const AY = 16;

export function watchFight(g: Game, o: WatchOpts): void {
  const root = new Container();
  const wrap = g.modal(root, { dim: 1, fit: false });
  const bg = new Graphics().rect(-OX, 0, SW, H).fill(II.night);
  root.addChild(bg);
  const arena = new ArenaView(o.A, o.B, o.rounds, { event: o.venue, eventKey: `watch:${o.A.id}:${o.B.id}`, canvas: { style: 'local', logo: 'CAGE BOSS II', accent: II.blood } });
  arena.position.set(Math.round((W - AW) / 2), AY);
  root.addChild(arena);
  arena.startFight();
  if (o.camera) arena.setMode(o.camera);

  // header: the slot, the venue, the clock
  const head = new Graphics().rect(-OX, 0, SW, AY - 1).fill(0x000000).rect(-OX, AY - 2, SW, 1).fill(II.blood);
  root.addChild(head);
  root.addChild(text(`${o.slot}  /  ${o.venue}`, 6, 4, { small: true, color: II.gold }));
  const clock = text('', 0, 4, { small: true, width: W - 6, align: 'right', color: II.bone });
  root.addChild(clock);

  // the broadcast strip
  const SY = AY + AH + 2;
  const strip = new Graphics();
  strip.rect(-OX, SY, SW, H - SY).fill(0x0e0c12);
  strip.rect(-OX, SY, SW, 1).fill(II.edge);
  root.addChild(strip);
  const pA = fighterPortrait(o.A, 32);
  const pB = fighterPortrait(o.B, 32);
  pA.position.set(6, SY + 6);
  pB.position.set(W - 38, SY + 6);
  root.addChild(pA, pB);
  root.addChild(text(o.A.last.toUpperCase(), 42, SY + 6, { color: II.bone, width: 150, maxLines: 1 }));
  root.addChild(text(o.B.last.toUpperCase(), W - 192, SY + 6, { color: II.bone, width: 150, align: 'right', maxLines: 1 }));
  root.addChild(text(`${o.A.record.w}-${o.A.record.l}-${o.A.record.d}`, 42, SY + 16, { small: true, color: II.ash }));
  root.addChild(text(`${o.B.record.w}-${o.B.record.l}-${o.B.record.d}`, W - 192, SY + 16, { small: true, color: II.ash, width: 150, align: 'right' }));
  const bars = new Graphics();
  root.addChild(bars);
  const log = new Container();
  root.addChild(log);
  const banner = new Container();
  root.addChild(banner);

  // the tape, with the booth talking over it
  const tape = withBooth(o);
  const speakers = content().commentary?.speakers ?? {};
  const boothBox = new Container();
  root.addChild(boothBox);
  let boothT = 0;
  const say = (l: TickerLine) => {
    boothBox.removeChildren().forEach((c) => c.destroy());
    const who = speakers[l.speaker!];
    const name = (who?.short ?? l.speaker ?? '').toUpperCase();
    const t = text(l.text, 0, 0, { width: 300, small: true, color: II.bone, maxLines: 3 });
    const h = t.textHeight + 14;
    boothBox.addChild(new Graphics().rect(0, 0, 312, h).fill({ color: 0x000000, alpha: 0.78 }).rect(0, 0, 2, h).fill(who?.color ? parseInt(String(who.color), 16) : II.sodium));
    boothBox.addChild(text(name, 6, 3, { small: true, color: who?.color ? parseInt(String(who.color), 16) : II.gold }));
    t.position.set(6, 11);
    boothBox.addChild(t);
    boothBox.position.set(Math.round((W - 312) / 2), AY + AH - h - 4);
    boothT = 1.4 + l.text.length * 0.035;
  };
  let idx = 0;
  let wait = 1.2;
  let speed = 0;
  let finished = false;
  let hp: [number, number] = [100, 100];
  let st: [number, number] = [100, 100];
  let round = 1;
  let roundT = 0;
  const recent: { s: string; c: number }[] = [];

  const makeSpeed = (): Container => {
    const b = button(`SPEED ${SPEEDS[speed]}X`, 6, H - 16, 58, 12, () => {
      speed = (speed + 1) % SPEEDS.length;
      b.destroy();
      root.addChild(makeSpeed());
    }, { small: true, fill: II.steel });
    return b;
  };
  const speedBtn = makeSpeed();
  root.addChild(speedBtn);
  root.addChild(button('SKIP TO THE END', 68, H - 16, 80, 12, () => skip(), { small: true, fill: II.blood }));
  root.addChild(button('LEAVE', W - 50, H - 16, 44, 12, () => close(), { small: true, fill: II.steel }));

  const pushLog = (l: TickerLine) => {
    if (!l.text) return;
    recent.push({ s: l.text, c: l.side === 0 ? II.sodium : l.side === 1 ? II.neon : II.ash });
    while (recent.length > 3) recent.shift();
    log.removeChildren().forEach((c) => c.destroy());
    recent.forEach((r, i) => log.addChild(text(r.s, 150, SY + 26 + i * 9, { small: true, width: 180, color: i === recent.length - 1 ? r.c : II.ash, maxLines: 1 })));
  };
  const apply = (l: TickerLine) => {
    hp = l.hp;
    if (l.st) st = l.st;
    if (l.round !== round) {
      round = l.round;
      sfx('bell');
    }
    roundT = l.t;
    // the promoter's tape has no per-zone feed: rebuild the damage from the scorecards
    arena.marks = [
      marksFromResult(100 - hp[0], arena.vitals[0].cut, l.round),
      marksFromResult(100 - hp[1], arena.vitals[1].cut, l.round),
    ];
    if (l.act === 'ko' || l.act === 'kd') sfx('thud');
  };
  const endBanner = () => {
    finished = true;
    banner.addChild(new Graphics().rect(-OX, AY + 50, SW, 36).fill({ color: 0x000000, alpha: 0.75 }).rect(-OX, AY + 50, SW, 1).fill(o.verdictColor).rect(-OX, AY + 85, SW, 1).fill(o.verdictColor));
    banner.addChild(text(o.verdict, 0, AY + 58, { width: W, align: 'center', scale: 2, color: o.verdictColor, shadow: 0x000000, maxLines: 1 }));
    banner.addChild(text('PRESS ENTER OR TAP TO LEAVE', 0, AY + 76, { width: W, align: 'center', small: true, color: II.ash }));
    sfx('crowd');
  };
  const skip = () => {
    if (finished) return close();
    while (idx < tape.length) {
      const l = tape[idx++];
      if (l.speaker) continue;
      arena.cue(l, true);
      apply(l);
      pushLog(l);
    }
    boothBox.removeChildren().forEach((c) => c.destroy());
    arena.settle();
    endBanner();
  };
  const hit = new Graphics().rect(-OX, AY, SW, AH).fill({ color: 0, alpha: 0.001 });
  hit.eventMode = 'static';
  hit.on('pointertap', () => finished && close());
  root.addChild(hit);
  const popKeys = g.pushKeyHandler((e) => {
    if (e.type !== 'keydown') return true;
    if (e.key === 'Escape') close();
    else if (e.key === 'Enter' || e.key === ' ') (finished ? close() : skip());
    return true;
  });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    g.app.ticker.remove(tick);
    popKeys();
    g.closeModal(wrap);
    o.done?.();
  };

  const drawBars = () => {
    bars.clear();
    const bar = (x: number, y: number, w: number, v: number, c: number, right: boolean) => {
      bars.rect(x, y, w, 4).fill(0x221e28);
      const n = Math.round((w * Math.max(0, Math.min(100, v))) / 100);
      bars.rect(right ? x + w - n : x, y, n, 4).fill(c);
      for (let k = 1; k < 10; k++) bars.rect(x + Math.round((w * k) / 10), y, 1, 4).fill({ color: 0x000000, alpha: 0.35 });
    };
    bar(42, SY + 26, 100, hp[0], hp[0] > 40 ? II.sodium : II.blood, false);
    bar(42, SY + 33, 100, st[0], II.neon, false);
    bar(W - 142, SY + 26, 100, hp[1], hp[1] > 40 ? II.sodium : II.blood, true);
    bar(W - 142, SY + 33, 100, st[1], II.neon, true);
  };

  const tick = (tk: Ticker) => {
    const dt = Math.min(0.05, tk.deltaMS / 1000) * SPEEDS[speed];
    if (input.buttonPressed('A')) (finished ? close() : skip());
    if (input.buttonPressed('B')) close();
    arena.update(dt);
    if (!finished) {
      wait -= dt;
      if (wait <= 0 && !arena.busy()) {
        if (idx >= tape.length) endBanner();
        else if (tape[idx].speaker) {
          // the booth gets its moment, then the fight carries on
          say(tape[idx++]);
          wait = Math.min(2.2, boothT * 0.6);
        } else {
          const l = tape[idx++];
          arena.cue(l);
          apply(l);
          pushLog(l);
          const nx = tape[idx];
          // the tape's own rhythm, squeezed: a gap of ten sim-seconds plays in about one
          const gap = nx && nx.round === l.round ? Math.max(0, nx.t - l.t) : 3;
          wait = Math.max(0.35, Math.min(1.6, 0.3 + gap * 0.09));
        }
      }
    }
    boothT -= dt;
    boothBox.alpha = Math.max(0, Math.min(1, boothT * 2));
    const m = Math.floor(roundT / 60);
    const s = Math.floor(roundT % 60);
    (clock as PixelText).setText(`ROUND ${round}/${o.rounds}   ${m}:${String(s).padStart(2, '0')}`);
    drawBars();
  };
  g.app.ticker.add(tick);
  wrap.once('destroyed', () => {
    g.app.ticker.remove(tick);
    popKeys();
  });
}
