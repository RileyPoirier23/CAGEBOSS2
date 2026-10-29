/**
 * The morning after: the show report, then whoever is waiting in the parking
 * lot. Every week ends here, one way or another.
 */
import { maybeLesson2 } from '../sequel/tutorial2';
import { Container, Graphics } from 'pixi.js';
import { Scene } from '../app';
import { PAL } from '../theme';
import { SW, OX, H, text, button, box, meterBar, ScrollBox, paper, clickable } from '../kit';
import { money, signed } from '../../core/format';
import { sfx } from '../../audio/sfx';
import { seqVenueArt } from '../sequelart';
import { readRun, writeRun } from '../../sequel/session';
import { beginNextWeek, currentGimmick, currentVenue } from '../../sequel/model';
import { eventById, eventSpeaker, eventText, resolveEvent } from '../../sequel/events';
import { VENUES } from '../../sequel/data';
import type { SeqRun, SeqShow } from '../../sequel/types';
import { SEASON_WEEKS } from '../../sequel/types';
import { SequelEndScene } from './sequelend';
import { toastSeqAchievements } from './sequelachievements';
import { watchFight } from '../sequel/watchfight';
import { openBroadcast } from '../sequel/broadcast';
import { broadcastDone } from '../../sequel/rivals';
import { isSequelDemo, DEMO_WEEKS } from '../../sequel/standalone';

type Step = 'results' | 'event' | 'consequence';

export class SequelShowScene extends Scene {
  music = 'office' as const;
  private t = 0;
  private flicker = new Graphics();
  private choices: (() => void)[] = [];

  build(): void {
    maybeLesson2(this.g, 'show');
    const run = readRun();
    if (!run) {
      void import('./sequel').then((m) => this.g.goto(new m.SequelTitleScene(this.g)));
      return;
    }
    if (run.status === 'ended') {
      this.g.goto(new SequelEndScene(this.g));
      return;
    }
    const r = this.root;
    r.x = -OX;
    const show = run.lastShow;
    const venue = show ? VENUES[show.venue] ?? currentVenue(run) : currentVenue(run);
    // refresh() destroys the root's children, including the old flicker
    this.flicker = new Graphics();
    r.addChild(seqVenueArt(venue.art, SW, H, run.seed + run.week * 13));
    r.addChild(new Graphics().rect(0, 0, SW, H).fill({ color: 0x08060c, alpha: 0.8 }));
    r.addChild(this.flicker);

    const step: Step = run.event ? 'event' : run.status === 'event' && run.eventResult ? 'consequence' : 'results';
    this.choices = [];
    this.header(run, venue.name);

    if (step === 'results') this.results(run, show);
    else if (step === 'event') this.event(run);
    else this.consequence(run);
  }

  private header(run: SeqRun, venue: string): void {
    const r = this.root;
    r.addChild(new Graphics().rect(0, 0, SW, 25).fill({ color: 0x0a080e, alpha: 0.94 }).rect(0, 24, SW, 1).fill({ color: PAL.gold, alpha: 0.5 }));
    r.addChild(text('THE MORNING AFTER', 6, 3, { small: true, color: PAL.gold }));
    r.addChild(text(`WEEK ${Math.min(run.week, SEASON_WEEKS)} / ${SEASON_WEEKS}`, 6, 13, { small: true, color: PAL.ash }));
    r.addChild(text(venue.toUpperCase(), 120, 4, { small: true, color: PAL.bone, width: 200, maxLines: 1 }));
    r.addChild(text(currentGimmick(run).name.toUpperCase(), 120, 13, { small: true, color: PAL.ember, width: 200, maxLines: 1 }));
    r.addChild(text(`CASH ${money(run.cash)}`, SW - 86, 4, { small: true, color: run.cash < 0 ? PAL.blood : PAL.bone }));
    r.addChild(text(`BUZZ ${Math.round(run.buzz)}  HEAT ${Math.round(run.heat)}`, SW - 86, 13, { small: true, color: PAL.ash }));
  }

  // ------------------------------------------------------------ results

  private results(run: SeqRun, show: SeqShow | null): void {
    const r = this.root;
    const left = new Container();
    left.position.set(6, 29);
    left.addChild(box(290, 202, 0x16121a, PAL.slate, { alpha: 0.96, bevel: true }));
    left.addChild(text('THE SHOW', 6, 5, { small: true, color: PAL.gold }));
    if (show?.raided) left.addChild(text('COMMISSION RAID', 198, 5, { small: true, color: PAL.blood }));

    if (!show) {
      left.addChild(text('No show on the books. That is probably for the best.', 8, 30, { width: 274, small: true, color: PAL.fog }));
    } else {
      left.addChild(text(show.headline, 8, 16, { width: 274, color: show.raided ? PAL.blood : PAL.bone, maxLines: 3 }));
      const body = text(show.body, 8, 54, { width: 274, small: true, color: PAL.fog, maxLines: 6 });
      left.addChild(body);
      const rowY = 100;
      show.results.forEach((res, i) => {
        const y = rowY + i * 31;
        const win = res.winner === 'a';
        const draw = res.winner === 'draw';
        const row = new Container();
        row.position.set(6, y);
        row.addChild(box(278, 29, i % 2 ? 0x1c1820 : 0x211c25, PAL.shadow, { bevel: true }));
        row.addChild(new Graphics().rect(0, 0, 2, 29).fill(draw ? PAL.ash : win ? PAL.moss : PAL.blood));
        row.addChild(text(i === 0 ? 'MAIN' : i === 1 ? 'CO-MAIN' : 'OPENER', 6, 3, { small: true, color: i === 0 ? PAL.gold : PAL.ash }));
        row.addChild(text(`${res.aName}  vs  ${res.bName}`, 6, 12, { small: true, width: res.replay ? 216 : 264, color: PAL.bone, maxLines: 1 }));
        const verdict = draw ? 'DRAW' : win ? `${res.aName.split(' ')[0]} WINS` : `${res.bName.split(' ')[0]} WINS`;
        row.addChild(text(`${verdict}  /  ${res.method} R${res.round} ${res.time}`, 6, 21, { small: true, color: draw ? PAL.ash : win ? PAL.moss : PAL.blood, width: res.replay ? 216 : 264, maxLines: 1 }));
        if (res.injury) row.addChild(text(`INJ: ${res.injury}`, 162, 3, { small: true, color: PAL.ember, width: 112, maxLines: 1 }));
        // the promoter's seat: play the bout back in the cage
        const tape = res.replay;
        if (tape) {
          const slotName = i === 0 ? 'MAIN EVENT' : i === 1 ? 'CO-MAIN' : 'OPENER';
          row.addChild(button('> WATCH', 226, 15, 48, 11, () => watchFight(this.g, {
            A: tape.A, B: tape.B, rounds: tape.rounds, ticker: tape.ticker, slot: slotName, venue: currentVenue(run).name.toUpperCase(),
            verdict: `${verdict}  /  ${res.method} R${res.round}`, verdictColor: draw ? PAL.ash : win ? PAL.moss : PAL.blood,
            result: { winner: res.winner, method: res.method, round: res.round, time: res.time, detail: res.detail, referee: tape.referee },
          }), { small: true, fill: PAL.blood, border: PAL.gold }));
        }
        left.addChild(row);
      });
      if (!show.results.length) left.addChild(text('Nobody fought. The cage was very clean.', 8, 106, { width: 274, small: true, color: PAL.ash }));
      const notes = show.notes.length ? show.notes.join('  /  ') : 'No injuries worth mentioning. That is a first.';
      left.addChild(text(notes, 8, 190, { width: 274, small: true, color: show.raided ? PAL.blood : PAL.ash, maxLines: 2 }));
    }
    r.addChild(left);

    // the money, and what it did to the four numbers
    const right = new Container();
    right.position.set(302, 29);
    right.addChild(box(172, 202, 0x16121a, PAL.slate, { alpha: 0.96, bevel: true }));
    right.addChild(text('THE MONEY', 5, 5, { small: true, color: PAL.gold }));
    if (show) {
      const rows: [string, string, number?][] = [
        ['GATE', money(show.gate)],
        ['STREAM', money(show.stream)],
        ['MERCH', money(show.merch)],
        ['SPONSORS', money(show.sponsor)],
        ['PURSES', '-' + money(show.purses)],
        ['THE BILL', '-' + money(show.costs)],
      ];
      rows.forEach(([k, v, c], i) => {
        right.addChild(text(k, 5, 16 + i * 10, { small: true, color: PAL.ash }));
        right.addChild(text(v, 78, 16 + i * 10, { small: true, color: c ?? PAL.bone, width: 88, align: 'right' }));
      });
      right.addChild(new Graphics().rect(5, 78, 162, 1).fill(PAL.slate));
      right.addChild(text(show.net >= 0 ? 'NET PROFIT' : 'NET LOSS', 5, 82, { small: true, color: show.net >= 0 ? PAL.moss : PAL.blood }));
      right.addChild(text(money(show.net), 78, 82, { small: true, color: show.net >= 0 ? PAL.moss : PAL.blood, width: 88, align: 'right' }));
      right.addChild(text('CASH ON HAND', 5, 95, { small: true, color: PAL.ash }));
      right.addChild(text(money(run.cash), 78, 95, { small: true, color: run.cash < 0 ? PAL.blood : PAL.bone, width: 88, align: 'right' }));
      this.meter(right, 'BUZZ', show.buzzAfter, show.buzzBefore, show.buzzAfter - show.buzzBefore, 112, run.buzz);
      this.meter(right, 'HEAT', show.heatAfter, show.heatBefore, show.heatAfter - show.heatBefore, 139, run.heat, true);
      this.meter(right, 'LOCKER', show.lockerAfter, show.lockerBefore, show.lockerAfter - show.lockerBefore, 166, run.locker);
      if (show.raided) right.addChild(text('FINES PAID. FOOTAGE PENDING.', 5, 190, { small: true, color: PAL.blood }));
    }
    r.addChild(right);

    // the night against Zenith, and the TV package
    if (show?.zenith) r.addChild(text(show.zenith.line, 8, 233, { small: true, width: SW - 16, color: show.zenith.won ? PAL.moss : PAL.blood, maxLines: 1 }));
    if (show?.results.length && !broadcastDone(run)) {
      r.addChild(button('PRODUCE THE BROADCAST', SW - 140, 240, 132, 18, () => openBroadcast(this.g, run, () => writeRun(run), () => this.refresh()), { small: true, fill: PAL.rust, border: PAL.gold }));
    }
    const next = run.event ? 'FACE THE FALLOUT' : run.week >= SEASON_WEEKS ? 'CLOSE THE BOOKS' : 'NEXT WEEK';
    r.addChild(button(next, Math.round((SW - 180) / 2), 240, 180, 18, () => this.continueResults(run), {
      fill: run.event ? PAL.rust : PAL.blood,
      border: PAL.gold,
    }));
    r.addChild(text('PRESS ENTER', 8, 247, { small: true, color: PAL.grey }));
  }

  private meter(c: Container, label: string, after: number, before: number, delta: number, y: number, value: number, invert = false): void {
    const color = invert ? (value > 60 ? PAL.blood : value < 30 ? PAL.moss : PAL.gold) : value > 60 ? PAL.moss : value < 30 ? PAL.blood : PAL.gold;
    c.addChild(text(label, 5, y, { small: true, color: PAL.ash }));
    const bar = meterBar(90, value, color, 4);
    bar.position.set(5, y + 8);
    c.addChild(bar);
    c.addChild(text(String(Math.round(value)), 99, y + 5, { small: true, color: PAL.bone }));
    c.addChild(text(`${before} > ${after}  (${signed(delta)})`, 112, y, { small: true, color: delta === 0 ? PAL.ash : invert ? (delta > 0 ? PAL.blood : PAL.moss) : delta > 0 ? PAL.moss : PAL.blood, width: 58, align: 'right' }));
  }

  private continueResults(run: SeqRun): void {
    sfx('click');
    toastSeqAchievements(this.g, run);
    if (run.event) {
      run.status = 'event';
      writeRun(run);
      this.refresh();
      return;
    }
    this.advance(run);
  }

  // ------------------------------------------------------------ event

  private event(run: SeqRun): void {
    const def = run.event ? eventById(run.event.id) : undefined;
    if (!def) {
      this.advance(run);
      return;
    }
    const r = this.root;
    const pw = Math.min(440, SW - 20);
    const px = Math.round((SW - pw) / 2);
    const p = paper(pw, 220, 'cream', run.week * 31 + 7);
    p.position.set(px, 20);
    r.addChild(p);
    p.addChild(text('AFTER THE SHOW', 10, 7, { small: true, color: PAL.blood }));
    p.addChild(text(def.title, 10, 17, { width: pw - 20, color: PAL.ink, maxLines: 2 }));
    p.addChild(text(eventSpeaker(def, run), 10, 36, { width: pw - 20, small: true, color: PAL.slate }));
    p.addChild(new Graphics().rect(10, 45, pw - 20, 1).fill(PAL.paperDark));

    const sb = new ScrollBox(pw - 24, 72);
    sb.position.set(10, 49);
    const body = text(eventText(def, run), 0, 0, { width: pw - 30, small: true, color: PAL.ink });
    sb.content.addChild(body);
    sb.refresh();
    p.addChild(sb);

    let y = 126;
    def.choices.slice(0, 3).forEach((choice, i) => {
      const t = text(choice.label, 10, 5, { width: pw - 40, small: true, color: PAL.bone, maxLines: 2 });
      const h = Math.max(22, t.textHeight + 10);
      const c = new Container();
      c.position.set(10, y);
      c.addChild(box(pw - 20, h, PAL.shadow, PAL.gold, { bevel: true }));
      c.addChild(text(String(i + 1), 4, 5, { small: true, color: PAL.gold }));
      c.addChild(t);
      t.x = 12;
      clickable(c, () => this.pick(run, i));
      p.addChild(c);
      this.choices.push(() => this.pick(run, i));
      y += h + 4;
    });
    p.addChild(text('EVERY CHOICE COSTS SOMETHING. THAT IS THE BUSINESS.', 10, 208, { small: true, color: PAL.slate }));
  }

  private pick(run: SeqRun, index: number): void {
    sfx('click');
    resolveEvent(run, index);
    writeRun(run);
    toastSeqAchievements(this.g, run);
    this.refresh();
  }

  // ------------------------------------------------------------ consequence

  private consequence(run: SeqRun): void {
    const r = this.root;
    const pw = Math.min(440, SW - 20);
    const px = Math.round((SW - pw) / 2);
    const p = paper(pw, 220, 'cream', run.week * 53 + 11);
    p.position.set(px, 20);
    r.addChild(p);
    const def = run.eventLog.length ? eventById(run.eventLog[run.eventLog.length - 1]) : undefined;
    p.addChild(text('WHAT HAPPENED', 10, 7, { small: true, color: PAL.blood }));
    if (def) p.addChild(text(def.title, 10, 17, { width: pw - 20, color: PAL.ink, maxLines: 2 }));
    p.addChild(new Graphics().rect(10, 38, pw - 20, 1).fill(PAL.paperDark));
    const result = text(run.eventResult ?? 'The parking lot is empty. For now.', 10, 44, { width: pw - 20, color: PAL.ink, maxLines: 7 });
    p.addChild(result);

    const statsY = Math.min(150, 50 + result.textHeight + 12);
    p.addChild(new Graphics().rect(10, statsY, pw - 20, 1).fill(PAL.paperDark));
    const stat = (label: string, value: string, x: number, y: number, color: number = PAL.ink) => {
      p.addChild(text(label, x, y, { small: true, color: PAL.slate }));
      p.addChild(text(value, x, y + 9, { color }));
    };
    stat('CASH', money(run.cash), 10, statsY + 8, run.cash < 0 ? PAL.blood : PAL.ink);
    stat('BUZZ', String(Math.round(run.buzz)), 90, statsY + 8);
    stat('HEAT', String(Math.round(run.heat)), 150, statsY + 8, run.heat >= 70 ? PAL.blood : PAL.ink);
    stat('LOCKER', String(Math.round(run.locker)), 210, statsY + 8, run.locker < 35 ? PAL.blood : PAL.ink);
    stat('WEEK', `${Math.min(run.week, SEASON_WEEKS)} / ${SEASON_WEEKS}`, 280, statsY + 8);

    const label = run.week >= SEASON_WEEKS ? 'CLOSE THE BOOKS' : 'NEXT WEEK';
    p.addChild(button(label, Math.round((pw - 170) / 2), 190, 170, 18, () => this.advance(run), {
      fill: PAL.blood,
      border: PAL.gold,
      textColor: PAL.bone,
    }));
  }

  // ------------------------------------------------------------ week advance

  private advance(run: SeqRun): void {
    sfx('click');
    if (isSequelDemo() && run.week >= DEMO_WEEKS) {
      void import('../sequel/demo').then((m) => m.demoOver(this.g));
      return;
    }
    beginNextWeek(run);
    writeRun(run);
    toastSeqAchievements(this.g, run);
    if (run.status === 'ended') {
      this.g.goto(new SequelEndScene(this.g));
      return;
    }
    void import('./sequelhub').then((m) => this.g.goto(new m.SequelHubScene(this.g)));
  }

  onKey(e: KeyboardEvent): boolean {
    if (e.type !== 'keydown' || this.g.modals.length) return false;
    const run = readRun();
    if (!run) return false;
    if (e.key >= '1' && e.key <= '3' && this.choices.length) {
      const i = Number(e.key) - 1;
      if (this.choices[i]) {
        this.choices[i]();
        return true;
      }
    }
    if (run.event) return false;
    if (e.key === 'Enter' || e.key === ' ') {
      if (this.choices.length) return false;
      this.advance(run);
      return true;
    }
    return false;
  }

  update(dt: number): void {
    this.t += dt;
    const g = this.flicker;
    g.clear();
    if (Math.sin(this.t * 11) > 0.97) g.rect(0, 0, SW, H).fill({ color: 0x000000, alpha: 0.05 });
  }
}
