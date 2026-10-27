/**
 * The weekly office: a leaking warehouse, two fights and four numbers.
 */
import { maybeLesson2 } from '../sequel/tutorial2';
import { openPhone } from '../sequel/phoneui';
import { bossName } from '../../sequel/model';
import { ownerForRun } from '../../sequel/phone';
import { maybePromoterCut } from '../sequel/promotercuts';
import { presserDone, presserFor } from '../../sequel/presser';
import { playPresser } from '../sequel/presser2';
import { Container, Graphics } from 'pixi.js';
import { Scene, type Game } from '../app';
import { PAL } from '../../art/palette';
import { W, H, SW, OX, text, button, box, meterBar, ScrollBox, clearChildren } from '../kit';
import { selector, openWindow, confirm, alertBox } from '../widgets';
import { isTouchDevice } from '../../core/platform';
import { money, record, compact, clamp } from '../../core/format';
import { sfx } from '../../audio/sfx';
import { fighterPortrait } from '../sprites';
import { seqVenueArt, seqTitleBackdrop } from '../sequelart';
import { AD_LEVELS, CAMPS, GIMMICKS, SEASON_PHASES, VENUES } from '../../sequel/data';
import {
  addBout, availableRoster, availableVenues, beltFor, buyBackNow, buybackBuzz, buybackCash, canBuyBackNow, canSkip, cardBouts,
  changeGimmick, changeVenue, championBouts, currentAd, currentGimmick, currentPhase, currentVenue,
  cycleFighter, cycleOpponent, opponentById, opponentStar, overallOf, payOffCommission, phaseDone,
  phaseMet, phaseProgress, project, removeBout, rosterById, runShow, signFreeAgent, signingCost, skipWeeks,
  venueIndex, weeklyBurn, zenithClauses,
} from '../../sequel/model';
import { readRun, writeRun } from '../../sequel/session';
import { deskCleared, pendingCount } from '../../sequel/desk';
import {
  SEASON_WEEKS,
  type SeqFighter, type SeqRun, type SeqSkip,
} from '../../sequel/types';
import { toastSeqAchievements } from './sequelachievements';
import { SequelDeskScene } from './sequeldesk';

const statColor = (v: number, invert = false) => {
  const good = invert ? v < 35 : v > 60;
  const bad = invert ? v > 60 : v < 30;
  return good ? PAL.moss : bad ? PAL.blood : PAL.gold;
};

function tinyName(x: SeqFighter): string {
  return `${x.f.first[0]}. ${x.f.last}`;
}

export class SequelHubScene extends Scene {
  music = 'office' as const;
  private t = 0;
  private flicker = new Graphics();

  build(): void {
    maybeLesson2(this.g, 'promoter');
    const run = readRun();
    if (!run) {
      void import('./sequel').then((m) => this.g.goto(new m.SequelTitleScene(this.g)));
      return;
    }
    // the season's own scenes: the board meeting, the first sellout, Verity's car, the last Saturday
    setTimeout(() => {
      if (this.g.scene === this && !this.g.modals.length) maybePromoterCut(this.g, run, () => writeRun(run), () => this.refresh());
    }, 350);
    if (run.status === 'ended') {
      void import('./sequelend').then((m) => this.g.goto(new m.SequelEndScene(this.g)));
      return;
    }
    toastSeqAchievements(this.g, run);
    const r = this.root;
    r.x = -OX;
    const pending = pendingCount(run);
    const v = currentVenue(run);
    const g = currentGimmick(run);
    const ad = currentAd(run);
    const p = project(run);
    // refresh() destroys the root's children, including the old flicker
    this.flicker = new Graphics();

    r.addChild(seqVenueArt(v.art, SW, H, run.seed + run.week * 13));
    r.addChild(new Graphics().rect(0, 0, SW, H).fill({ color: 0x08060c, alpha: 0.55 }));
    r.addChild(this.flicker);
    this.header(run);

    // ------- left: the room, the stunt, the money
    const left = new Container();
    left.position.set(6, 34);
    left.addChild(box(152, 194, 0x16121a, PAL.slate, { alpha: 0.94, bevel: true }));
    left.addChild(text('THE ROOM', 6, 5, { small: true, color: PAL.gold }));
    const venues = availableVenues(run);
    left.addChild(selector(6, 15, 140, venues.map((x) => ({ value: VENUES.indexOf(x), label: x.name })), venueIndex(run), (i) => {
      changeVenue(run, i);
      this.saveAndRefresh(run);
    }));
    const art = seqVenueArt(v.art, 140, 43, run.seed + run.week);
    art.position.set(6, 31);
    left.addChild(art);
    left.addChild(text(`${v.capacity.toLocaleString('en-US')} SEATS  /  $${v.ticket}`, 6, 77, { small: true, color: PAL.bone }));
    left.addChild(text(`RENT ${money(v.rent)} + ${money(v.production)} SHOW`, 6, 85, { small: true, color: run.cash >= v.rent + v.production ? PAL.ash : PAL.blood }));
    left.addChild(text('THE STUNT', 6, 96, { small: true, color: PAL.gold }));
    left.addChild(selector(6, 106, 140, GIMMICKS.map((x) => ({ value: x.id, label: x.name })), g.id, (id) => {
      changeGimmick(run, String(id));
      this.saveAndRefresh(run);
    }));
    left.addChild(text(g.blurb, 6, 121, { small: true, width: 140, color: PAL.fog, maxLines: 3, lineGap: 0 }));
    left.addChild(text('AD SPEND', 6, 144, { small: true, color: PAL.gold }));
    left.addChild(selector(6, 154, 140, AD_LEVELS.map((x, i) => ({ value: i, label: `${x.label}${x.cost ? '  ' + money(x.cost) : ''}` })), run.ad, (i) => {
      run.ad = Number(i);
      this.saveAndRefresh(run);
    }));
    left.addChild(text('PROJECTION', 6, 170, { small: true, color: PAL.gold }));
    left.addChild(text(`GATE ${money(p.gate)}  /  FILL ${Math.round(p.fill * 100)}%`, 6, 179, { small: true, color: PAL.bone }));
    left.addChild(text(`COSTS ${money(p.costs)}`, 6, 187, { small: true, color: PAL.ash }));
    left.addChild(text(`NET ${money(p.net)}`, 6, 195, { small: true, color: p.net >= 0 ? PAL.moss : PAL.blood }));
    if (p.title) left.addChild(text('TITLE NIGHT', 86, 195, { small: true, color: PAL.gold }));
    r.addChild(left);
    const runBtn = button(pending ? `DESK: ${pending} DOC${pending === 1 ? '' : 'S'}` : 'RUN THE SHOW', 6, 212, 152, 17, () => this.runIt(run), {
      fill: pending ? PAL.steel : p.net >= 0 ? PAL.blood : PAL.rust,
      border: pending ? PAL.gold : PAL.gold,
    });
    runBtn.x = 6;
    runBtn.y = 212;
    r.addChild(runBtn);

    // ------- right: your card
    const right = new Container();
    right.position.set(162, 34);
    right.addChild(box(312, 194, 0x16121a, PAL.slate, { alpha: 0.94, bevel: true }));
    right.addChild(text('YOUR CARD', 6, 5, { small: true, color: PAL.gold }));
    const bouts = cardBouts(run);
    right.addChild(text(`${bouts.length} FIGHT${bouts.length === 1 ? '' : 'S'}  /  ${bouts.length >= 3 ? 'FULL' : 'ADD UP TO 3'}`, 120, 5, { small: true, color: PAL.ash, width: 150, align: 'right', maxLines: 1 }));
    if (bouts.length < 3) {
      right.addChild(button('+ FIGHT', 276, 1, 30, 12, () => {
        if (addBout(run)) this.saveAndRefresh(run);
        else alertBox(this.g, 'No fight', 'Nobody healthy is left. Sign somebody or let a body heal.');
      }, { small: true, fill: PAL.shadow }));
    }
    if (!bouts.length) {
      right.addChild(text('NOBODY CAN FIGHT. THE CAGE IS VERY CLEAN.', 12, 80, { width: 288, color: PAL.blood, small: true }));
    }
    bouts.forEach((bout, i) => {
      const a = rosterById(run, bout.a);
      const opp = opponentById(run, bout.b);
      if (!a || !opp) return;
      const row = new Container();
      row.position.set(6, 18 + i * 58);
      row.addChild(box(300, 54, i === 0 ? 0x241c22 : 0x1c1820, i === 0 ? PAL.gold : PAL.shadow, { bevel: true }));
      const label = i === 0 ? 'MAIN EVENT  /  5 ROUNDS' : i === 1 ? 'CO-MAIN  /  3 ROUNDS' : 'OPENER  /  3 ROUNDS';
      row.addChild(text(label, 4, 3, { small: true, color: i === 0 ? PAL.gold : PAL.ember }));
      if (beltFor(run, a.f.id)) row.addChild(text('CHAMPION', 116, 3, { small: true, color: PAL.gold }));
      const pa = fighterPortrait(a.f, 32);
      pa.position.set(4, 11);
      row.addChild(pa);
      const pb = fighterPortrait(opp, 32);
      pb.position.set(160, 11);
      row.addChild(pb);
      row.addChild(text(tinyName(a), 40, 11, { small: true, color: PAL.bone, width: 112, maxLines: 1 }));
      row.addChild(text(`${record(a.f.record)}  ST★${a.star}`, 40, 21, { small: true, color: PAL.ash }));
      row.addChild(text(`PURSE ${money(a.purse)}`, 40, 30, { small: true, color: PAL.ember }));
      row.addChild(text('VS', 147, 24, { small: true, color: PAL.blood }));
      row.addChild(text(`${opp.first[0]}. ${opp.last}`, 196, 11, { small: true, color: PAL.bone, width: 96, maxLines: 1 }));
      row.addChild(text(`${record(opp.record)}  OVR ${overallOf(opp)}`, 196, 21, { small: true, color: PAL.ash }));
      row.addChild(text(`ST★${opponentStar(opp)}  ${money(Math.round(signingCost(opp) / 4))}`, 196, 30, { small: true, color: PAL.ember }));
      row.addChild(selector(4, 40, 146, availableRoster(run).map((x) => ({ value: x.f.id, label: tinyName(x) })), a.f.id, (id) => {
        cycleToFighter(run, i, String(id));
        this.saveAndRefresh(run);
      }));
      row.addChild(selector(160, 40, 136, run.freeAgents.map((f) => ({ value: f.id, label: `${f.first[0]}. ${f.last}` })), opp.id, (id) => {
        run.card.bouts[i].b = String(id);
        this.saveAndRefresh(run);
      }));
      if (bouts.length > 1) {
        row.addChild(button('X', 289, 2, 9, 9, () => {
          removeBout(run, i);
          this.saveAndRefresh(run);
        }, { small: true, fill: PAL.blood }));
      }
      right.addChild(row);
    });
    r.addChild(right);

    // ------- bottom ticker and utilities
    const last = run.lastShow;
    const ticker = last ? `THE WORD: ${last.headline}` : 'THE WORD: THE CAGE IS UP. THE RENT IS DUE. THE PHONE IS RINGING.';
    r.addChild(text(ticker, 8, 230, { small: true, width: SW - 16, color: last && last.net >= 0 ? PAL.moss : PAL.fog, maxLines: 1 }));
    const touch = isTouchDevice();
    const by = touch ? 243 : 246;
    const bh = touch ? 19 : 16;
    r.addChild(button('ROSTER', 6, by, 52, bh, () => openSequelRoster(this.g), { small: true }));
    r.addChild(button('SIGN', 60, by, 46, bh, () => openSequelSignings(this.g), { small: true, fill: PAL.moss }));
    r.addChild(button(pending ? `DESK ${pending}` : 'DESK', 108, by, 54, bh, () => this.openDesk(run), {
      small: true, fill: pending ? PAL.steel : PAL.shadow, border: pending ? PAL.gold : undefined,
      tooltip: pending ? 'The commission is waiting. Inspect and stamp this week\'s paperwork.' : 'The desk is clear. You can still read the file.',
    }));
    r.addChild(button('CAMPS', 164, by, 50, bh, () => openTimeSkip(this.g), { small: true, fill: PAL.plum }));
    r.addChild(button('SEASON', 216, by, 54, bh, () => openSeason(this.g), { small: true, fill: PAL.rust }));
    r.addChild(button('HELP', 272, by, 44, bh, () => { void import('./sequel').then((m) => m.openSequelHelp(this.g)); }, { small: true, fill: PAL.shadow }));
    r.addChild(button('TITLE', 318, by, 44, bh, () => { void import('./sequel').then((m) => this.g.goto(new m.SequelTitleScene(this.g))); }, { small: true, fill: PAL.shadow }));
    // the phone: this week's call, Bleeter, the plug
    r.addChild(button('PHONE', 440, by, 34, bh, () => openPhone(this.g, ownerForRun(run, bossName(run)), () => writeRun(run), () => this.refresh()), { small: true, fill: PAL.blood, border: PAL.gold }));
    if (run.heat >= 20) {
      r.addChild(button(`PAY ${money(8000)}`, 364, by, 74, bh, () => {
        confirm(this.g, 'Pay the commission $8,000 to lose 25 HEAT?', () => {
          const msg = payOffCommission(run);
          writeRun(run);
          this.g.toast(msg);
          this.refresh();
        }, 'PAY', 'KEEP HEAT');
      }, { small: true, fill: PAL.plum }));
    }
    if (run.heat >= 78) {
      r.addChild(text('THE COMMISSION IS WATCHING.', 330, 232, { small: true, color: PAL.blood }));
    }
    if (!run.belts.length && run.stats.shows >= 1) {
      r.addChild(text('NO BELTS YET. THREE STRAIGHT WINS MAKES ONE.', 8, 236, { small: true, color: PAL.ash }));
    }
  }

  private header(run: SeqRun): void {
    const r = this.root;
    r.addChild(new Graphics().rect(0, 0, SW, 28).fill({ color: 0x0a080e, alpha: 0.94 }).rect(0, 27, SW, 1).fill({ color: PAL.gold, alpha: 0.5 }));
    r.addChild(text('CAGE BOSS II', 6, 4, { small: true, color: PAL.gold }));
    r.addChild(text(run.flags.sandbox ? `WEEK ${run.week}  /  SANDBOX` : `WEEK ${run.week} / ${SEASON_WEEKS}`, 76, 4, { small: true, color: run.flags.sandbox ? PAL.gold : PAL.bone }));
    const cash = text(`CASH ${money(run.cash)}`, 168, 4, { small: true, color: run.cash < 10000 ? PAL.blood : PAL.bone });
    r.addChild(cash);
    const stat = (label: string, value: number, x: number, color: number) => {
      r.addChild(text(label, x, 4, { small: true, color: PAL.ash }));
      const bar = meterBar(52, value, color, 4);
      bar.position.set(x, 11);
      r.addChild(bar);
      r.addChild(text(String(Math.round(value)), x + 55, 9, { small: true, color: PAL.bone }));
    };
    stat('BUZZ', run.buzz, 250, statColor(run.buzz));
    stat('HEAT', run.heat, 320, statColor(run.heat, true));
    stat('LOCKER', run.locker, 390, statColor(run.locker));
    const phase = currentPhase(run);
    r.addChild(text(`Q${phase.no}  ${phase.name}`, 6, 14, { small: true, color: PAL.ember, width: 156, maxLines: 1 }));
    const pending = pendingCount(run);
    r.addChild(text(pending ? `PAPERWORK ${pending}` : 'DESK CLEAR', 168, 14, { small: true, color: pending ? PAL.gold : PAL.moss, width: 76, maxLines: 1 }));
    const prog = phaseProgress(run, phase).map((x) => `${x.label} ${x.have.toLocaleString('en-US')}/${x.need.toLocaleString('en-US')}`).join('  ·  ');
    // under the meters, not on them
    r.addChild(text(prog, 248, 20, { small: true, color: phaseMet(run, phase) ? PAL.moss : PAL.ash, width: 226, align: 'right', maxLines: 1 }));
  }

  private saveAndRefresh(run: SeqRun): void {
    writeRun(run);
    this.refresh();
  }

  private runIt(run: SeqRun): void {
    if (!deskCleared(run)) {
      const n = pendingCount(run);
      alertBox(
        this.g,
        'The desk first',
        `${n} document${n === 1 ? '' : 's'} still on the desk. The commission will not licence a show with the paperwork outstanding. Read it, stamp it, then come back.`,
        () => this.openDesk(run),
      );
      return;
    }
    if (!cardBouts(run).length) {
      alertBox(this.g, 'No fights', 'You cannot run a show with no fights. Sign somebody, heal somebody, or book a fight.');
      return;
    }
    const v = currentVenue(run);
    if (run.cash < v.rent + v.production) {
      confirm(this.g, `You cannot cover the room (${money(v.rent + v.production)}). Run it anyway and hope the gate saves you?`, () => this.doRun(run), 'RUN IT', 'NOT YET');
      return;
    }
    this.doRun(run);
  }

  private openDesk(run: SeqRun): void {
    sfx('paper');
    writeRun(run);
    this.g.goto(new SequelDeskScene(this.g));
  }

  private doRun(run: SeqRun): void {
    // Thursday: the press conference, once a week, before the doors open
    const card = presserDone(run) ? null : presserFor(run);
    if (card) {
      playPresser(this.g, run, card, () => {
        writeRun(run);
        this.doRun(run);
      });
      return;
    }
    sfx('bell');
    runShow(run);
    writeRun(run);
    void import('./sequelshow').then((m) => this.g.goto(new m.SequelShowScene(this.g)));
  }

  update(dt: number): void {
    this.t += dt;
    const g = this.flicker;
    g.clear();
    // one string light swings a little; one is always about to die
    const a = Math.sin(this.t * 2.1) * 0.5 + 0.5;
    g.circle(42, 9, 2).fill({ color: 0xffd890, alpha: 0.4 + a * 0.6 });
    g.circle(42, 9, 7).fill({ color: 0xffd890, alpha: 0.03 + a * 0.06 });
    if (Math.sin(this.t * 13) > 0.96) g.rect(0, 0, SW, H).fill({ color: 0x000000, alpha: 0.06 });
  }
}

/** Cycle the fighter in a slot to a specific id (the selector gives us the id directly). */
function cycleToFighter(run: SeqRun, slot: number, id: string): void {
  const b = run.card.bouts[slot];
  if (!b || b.a === id) return;
  b.a = id;
  const opp = opponentById(run, b.b);
  if (!opp || opp.id === id) {
    const used = new Set(run.card.bouts.filter((_, i) => i !== slot).map((x) => x.b));
    const next = run.freeAgents.find((f) => !used.has(f.id) && f.id !== id);
    if (next) b.b = next.id;
  }
}

export function openSequelRoster(g: Game): void {
  const run = readRun();
  if (!run) return;
  const win = openWindow(g, 'THE LOCKER ROOM', 424, 238, { paper: 'cream' });
  const sb = new ScrollBox(404, 190);
  sb.position.set(6, 2);
  const sorted = run.roster.slice().sort((a, b) => b.star - a.star);
  sorted.forEach((x, i) => {
    const row = new Container();
    row.position.set(0, i * 32);
    row.addChild(box(396, 30, i % 2 ? 0xd0c4a4 : 0xdad0b2, 0xb3a685));
    const po = fighterPortrait(x.f, 24);
    po.position.set(2, 3);
    row.addChild(po);
    row.addChild(text(`${x.f.first} ${x.f.last}`, 30, 2, { small: true, color: PAL.ink, width: 170, maxLines: 1 }));
    row.addChild(text(`${record(x.f.record)}  OVR ${overallOf(x.f)}  ST★${x.star}`, 30, 11, { small: true, color: PAL.shadow }));
    row.addChild(text(`MORALE ${x.morale}  /  PURSE ${money(x.purse)}`, 30, 20, { small: true, color: x.morale < 35 ? PAL.blood : PAL.slate }));
    row.addChild(text(`${x.f.division.toUpperCase()}  /  ${x.f.styles.slice(0, 2).join(', ')}`, 210, 2, { small: true, color: PAL.slate, width: 150, maxLines: 1 }));
    row.addChild(text(x.injuredUntil > run.week ? `INJURED: OUT UNTIL W${x.injuredUntil}` : 'READY TO FIGHT', 210, 11, { small: true, color: x.injuredUntil > run.week ? PAL.blood : PAL.moss }));
    row.addChild(text(`${x.fights} FIGHTS  /  ${compact(x.f.social?.followers ?? 0)} FOLLOWERS`, 210, 20, { small: true, color: PAL.grey }));
    sb.content.addChild(row);
  });
  win.body.addChild(sb);
  sb.refresh();
  win.body.addChild(text('The locker room remembers everything. The camera remembers more.', 6, 198, { small: true, color: PAL.slate }));
}

export function openSequelSignings(g: Game): void {
  const run = readRun();
  if (!run) return;
  const win = openWindow(g, 'FREE AGENTS', 424, 238, { paper: 'cream' });
  const sb = new ScrollBox(404, 190);
  sb.position.set(6, 2);
  const list = run.freeAgents.slice(0, 8);
  if (!list.length) {
    sb.content.addChild(text('Nobody is answering the phone. Give it a week.', 4, 4, { small: true, color: PAL.ink }));
  }
  list.forEach((f, i) => {
    const row = new Container();
    row.position.set(0, i * 43);
    row.addChild(box(396, 41, i % 2 ? 0xd0c4a4 : 0xdad0b2, 0xb3a685));
    const po = fighterPortrait(f, 32);
    po.position.set(2, 4);
    row.addChild(po);
    row.addChild(text(`${f.first} ${f.last}${f.nick ? ` "${f.nick}"` : ''}`, 40, 3, { small: true, color: PAL.ink, width: 240, maxLines: 1 }));
    row.addChild(text(`${record(f.record)}  OVR ${overallOf(f)}  ST★${opponentStar(f)}  ${f.division.toUpperCase()}`, 40, 13, { small: true, color: PAL.shadow }));
    row.addChild(text(f.traits.slice(0, 3).join(', ') || f.styles.slice(0, 2).join(', '), 40, 23, { small: true, color: PAL.slate, width: 250, maxLines: 1 }));
    row.addChild(text(`ASKING ${money(signingCost(f))}`, 40, 32, { small: true, color: PAL.blood }));
    row.addChild(button('SIGN', 326, 12, 64, 16, () => {
      const msg = signFreeAgent(run, f.id);
      writeRun(run);
      win.close();
      g.toast(msg, msg.startsWith('You need') || msg.startsWith('The locker') ? PAL.blood : PAL.moss);
      g.scene?.refresh();
    }, { small: true, fill: PAL.moss, border: PAL.ink }));
    sb.content.addChild(row);
  });
  win.body.addChild(sb);
  sb.refresh();
  win.body.addChild(text(`LOCKER ${run.roster.length}/14  /  CASH ${money(run.cash)}  /  A signing bonus is not a purse.`, 6, 198, { small: true, color: PAL.slate }));
}

// ---------------------------------------------------------------- the season, the off weeks

/** The long view: four quarters, every belt, and the number on the buyback. */
export function openSeason(g: Game): void {
  const run = readRun();
  if (!run) return;
  const win = openWindow(g, 'THE SEASON', 424, 238, { paper: 'cream' });
  const b = win.body;
  b.addChild(text('FOUR QUARTERS', 6, 1, { small: true, color: PAL.blood }));
  SEASON_PHASES.forEach((p, i) => {
    const y = 11 + i * 34;
    const done = phaseDone(run, p);
    const now = currentPhase(run).no === p.no;
    const fill = done === 'won' ? 0xd6dfc0 : done === 'missed' ? 0xe1c8c0 : now ? 0xe2d6ae : 0xd4c9aa;
    b.addChild(box(202, 31, fill, 0xb3a685));
    b.addChild(text(`Q${p.no}  ${p.name}`, 10, y + 3, { small: true, color: PAL.ink }));
    b.addChild(text(p.goal, 10, y + 12, { small: true, width: 182, color: PAL.slate, maxLines: 2, lineGap: 0 }));
    const tag = done === 'won' ? 'CLEARED' : done === 'missed' ? 'MISSED' : now ? 'NOW' : 'LATER';
    b.addChild(text(tag, 150, y + 3, { small: true, color: done === 'won' ? PAL.moss : done === 'missed' ? PAL.blood : now ? PAL.rust : PAL.grey, width: 44, align: 'right' }));
  });

  const cur = currentPhase(run);
  b.addChild(text('CURRENT GOAL', 6, 148, { small: true, color: PAL.blood }));
  const prog = phaseProgress(run, cur);
  prog.forEach((x, i) => {
    b.addChild(text(`${x.label}  ${x.have.toLocaleString('en-US')} / ${x.need.toLocaleString('en-US')}`, 6, 157 + i * 9, { small: true, color: x.have >= x.need ? PAL.moss : PAL.ink }));
  });
  const goalCash = buybackCash(run);
  const goalBuzz = buybackBuzz(run);
  const clauses = zenithClauses(run);
  b.addChild(text(`BUYBACK  ${money(goalCash)} + ${goalBuzz} BUZZ  /  WEEK ${Math.min(run.week, SEASON_WEEKS)} OF ${SEASON_WEEKS}`, 6, 180, { small: true, color: run.cash >= goalCash && run.buzz >= goalBuzz ? PAL.moss : PAL.slate, width: 202, maxLines: 1 }));
  b.addChild(text(`ZENITH CLAUSES ${clauses}  /  +${money(clauses * 500000)} AND +${clauses * 2} BUZZ`, 6, 190, { small: true, color: clauses ? PAL.blood : PAL.slate, width: 202, maxLines: 1 }));

  b.addChild(text('THE BELTS', 214, 1, { small: true, color: PAL.blood }));
  if (!run.belts.length) {
    b.addChild(text('Nobody has a belt yet. Three straight wins makes one. The belt is purchased online and validated by the crowd.', 214, 11, { small: true, width: 200, color: PAL.slate, maxLines: 3, lineGap: 0 }));
  } else {
    run.belts.slice(0, 8).forEach((belt, i) => {
      const holder = rosterById(run, belt.holderId);
      const y = 11 + i * 16;
      b.addChild(text(belt.division.toUpperCase(), 214, y, { small: true, color: PAL.shadow, width: 54 }));
      b.addChild(text(holder ? `${holder.f.first} ${holder.f.last}` : 'VACANT', 270, y, { small: true, color: PAL.ink, width: 100, maxLines: 1 }));
      b.addChild(text(`${belt.defenses} DEF`, 376, y, { small: true, color: belt.defenses ? PAL.rust : PAL.grey, width: 38, align: 'right' }));
    });
  }
  const sy = 11 + Math.max(run.belts.length, 1) * 16 + 4;
  const stats: [string, string][] = [
    ['SHOWS', `${run.stats.shows}  /  SKIPS ${run.stats.skips}`],
    ['CAMPS', `${run.stats.camps}  /  SIGNINGS ${run.stats.signings}`],
    ['TITLE FIGHTS', `${run.stats.titleFights}  /  DEFENSES ${run.stats.defenses}`],
    ['SELLOUTS', `${run.stats.sellouts}  /  RAIDS ${run.stats.raids}`],
    ['BEST GATE', money(run.stats.bestGate)],
    ['RECORD', `${run.stats.wins}-${run.stats.losses}${run.stats.draws ? '-' + run.stats.draws : ''}`],
    ['OFF-WEEK BURN', `${money(weeklyBurn(run))} / WEEK`],
  ];
  stats.forEach(([k, v], i) => {
    b.addChild(text(k, 214, sy + i * 9, { small: true, color: PAL.slate }));
    b.addChild(text(v, 292, sy + i * 9, { small: true, color: PAL.ink, width: 122, align: 'right' }));
  });

  b.addChild(button('TIME SKIP', 6, 204, 90, 16, () => { win.close(); openTimeSkip(g); }, { small: true, fill: PAL.plum, border: PAL.ink }));
  if (run.heat >= 20) {
    b.addChild(button(`PAY ${money(8000)}`, 100, 204, 90, 16, () => {
      const msg = payOffCommission(run);
      writeRun(run);
      win.close();
      g.toast(msg, msg.startsWith('You do not') ? PAL.blood : PAL.moss);
      g.scene?.refresh();
    }, { small: true, fill: PAL.rust, border: PAL.ink }));
  }
  if (canBuyBackNow(run)) {
    b.addChild(button('BUY IT BACK', 194, 204, 108, 16, () => {
      confirm(g, `Call Zenith now? ${money(buybackCash(run))} and ${buybackBuzz(run)} BUZZ. The season ends early.`, () => {
        buyBackNow(run);
        writeRun(run);
        win.close();
        void import('./sequelend').then((m) => g.goto(new m.SequelEndScene(g)));
      }, 'CALL THEM', 'NOT YET');
    }, { small: true, fill: PAL.moss, border: PAL.gold }));
  }
  b.addChild(button('CLOSE', 330, 204, 80, 16, () => win.close(), { small: true, fill: PAL.shadow }));
}

/**
 * The calendar's other button: no show this week. Bodies heal, the crowd forgets,
 * and a fighter can disappear into a camp and come back with a new number.
 */
export function openTimeSkip(g: Game): void {
  const run = readRun();
  if (!run) return;
  if (!canSkip(run)) {
    alertBox(g, 'No off weeks', 'The calendar is full. The next bell is the last one. Run the show.');
    return;
  }
  const win = openWindow(g, 'THE OFF WEEKS', 424, 238, { paper: 'cream' });
  const b = win.body;
  const maxWeeks = Math.max(1, Math.min(4, SEASON_WEEKS - run.week));
  let weeks = 1;
  let campId = 'rest';
  let fighterId = run.roster[0]?.f.id ?? '';

  b.addChild(text('CANCEL A SHOW. KEEP THE LEASE.', 6, 1, { small: true, color: PAL.blood }));
  b.addChild(text('No card this week. The calendar moves anyway, the crowd forgets a little, and the rent does not care. In exchange: bodies heal, and one fighter can spend the time getting permanently better.', 6, 10, { small: true, width: 192, color: PAL.ink, maxLines: 4, lineGap: 0 }));

  b.addChild(text('WEEKS OFF', 6, 40, { small: true, color: PAL.blood }));
  b.addChild(selector(6, 49, 120, Array.from({ length: maxWeeks }, (_, i) => ({ value: i + 1, label: `${i + 1} WEEK${i ? 'S' : ''}` })), 1, (v) => { weeks = Number(v); redraw(); }));

  b.addChild(text('CAMP', 6, 68, { small: true, color: PAL.blood }));
  b.addChild(selector(6, 77, 192, CAMPS.map((c) => ({ value: c.id, label: c.name })), 'rest', (v) => { campId = String(v); redraw(); }));

  b.addChild(text('FIGHTER', 6, 96, { small: true, color: PAL.blood }));
  b.addChild(selector(6, 105, 192, run.roster.map((x) => ({ value: x.f.id, label: `${x.f.first} ${x.f.last}` })), fighterId, (v) => { fighterId = String(v); redraw(); }));

  const blurb = text('', 6, 124, { small: true, width: 192, color: PAL.slate, maxLines: 2, lineGap: 0 });
  b.addChild(blurb);
  const costLine = text('', 6, 144, { small: true, color: PAL.ink });
  b.addChild(costLine);
  const deltaLine = text('', 6, 154, { small: true, color: PAL.slate });
  b.addChild(deltaLine);
  const afterLine = text('', 6, 164, { small: true, color: PAL.slate });
  b.addChild(afterLine);
  const warnLine = text('', 6, 176, { small: true, width: 200, color: PAL.blood, maxLines: 2, lineGap: 0 });
  b.addChild(warnLine);

  const side = new Container();
  side.position.set(212, 0);
  b.addChild(side);

  const redraw = (): void => {
    const camp = CAMPS.find((c) => c.id === campId) ?? CAMPS[0];
    const target = run.roster.find((x) => x.f.id === fighterId);
    const burn = weeklyBurn(run);
    const cost = burn * weeks + camp.cost * weeks;
    const buzzDelta = -4 * weeks + camp.buzz * weeks;
    const heatDelta = -3 * weeks + camp.heat * weeks;
    const lockerDelta = -weeks + (camp.id === 'rest' ? Math.round(camp.morale * 0.6 * weeks) : 0);
    blurb.setText(camp.blurb);
    costLine.setText(`COST  ${money(cost)}  (${money(burn + camp.cost)} / week)`);
    deltaLine.setText(`BUZZ ${signed(buzzDelta)}   HEAT ${signed(heatDelta)}   LOCKER ${signed(lockerDelta)}`);
    afterLine.setText(`AFTER  CASH ${money(run.cash - cost)}   BUZZ ${Math.max(0, Math.min(100, Math.round(run.buzz + buzzDelta)))}`);
    const warnings: string[] = [];
    if (run.cash - cost < 0) warnings.push('THE LIGHTS GO OUT.');
    if (weeks === maxWeeks && weeks === 4) warnings.push('FOUR WEEKS IS A LONG TIME. THE CROWD HAS A SHORT MEMORY.');
    if (camp.id === 'medical' && target && target.injuredUntil <= run.week) warnings.push('HE IS NOT INJURED. THE DOCTOR WILL STILL BILL YOU.');
    warnLine.setText(warnings.join(' '));

    clearChildren(side);
    side.addChild(box(204, 194, 0xdad0b2, 0xb3a685));
    side.addChild(text('THE FIGHTER', 6, 4, { small: true, color: PAL.blood }));
    if (target) {
      const po = fighterPortrait(target.f, 32);
      po.position.set(6, 13);
      side.addChild(po);
      side.addChild(text(`${target.f.first} ${target.f.last}`, 50, 13, { small: true, color: PAL.ink, width: 148, maxLines: 1 }));
      side.addChild(text(target.f.nick ? `"${target.f.nick}"` : target.f.styles[0] ?? '', 50, 22, { small: true, color: PAL.slate, width: 148, maxLines: 1 }));
      side.addChild(text(`${target.f.division.toUpperCase()}  /  ${record(target.f.record)}`, 50, 31, { small: true, color: PAL.slate, width: 148, maxLines: 1 }));
      side.addChild(text(`OVR ${overallOf(target.f)}  /  ST★${target.star}  /  MORALE ${target.morale}`, 50, 40, { small: true, color: PAL.slate, width: 148, maxLines: 1 }));
      side.addChild(text(target.injuredUntil > run.week ? `INJURED: OUT UNTIL W${target.injuredUntil}` : 'READY TO FIGHT', 6, 56, { small: true, color: target.injuredUntil > run.week ? PAL.blood : PAL.moss }));
      side.addChild(new Graphics().rect(6, 66, 192, 1).fill(0xb3a685));

      side.addChild(text('AFTER THE CAMP', 6, 71, { small: true, color: PAL.blood }));
      let ry = 81;
      if (camp.id === 'rest') {
        side.addChild(text('The whole locker room rests. Every fighter gets morale and time.', 6, ry, { small: true, width: 192, color: PAL.slate, maxLines: 2, lineGap: 0 }));
        ry += 18;
      } else {
        const gains = Object.entries(camp.gains) as [keyof typeof target.f.skills, number][];
        if (!gains.length) {
          side.addChild(text('No physical gains. The work is done in front of a camera.', 6, ry, { small: true, width: 192, color: PAL.slate, maxLines: 2, lineGap: 0 }));
          ry += 18;
        }
        for (const [k, v] of gains) {
          const add = Math.max(1, Math.round(v * weeks));
          side.addChild(text(`${k.toUpperCase()}  ${target.f.skills[k]} → ${Math.min(99, target.f.skills[k] + add)}`, 6, ry, { small: true, color: PAL.ink }));
          ry += 9;
        }
        if (camp.star) {
          side.addChild(text(`STAR  ${target.star} → ${Math.min(100, target.star + Math.round(camp.star * weeks))}`, 6, ry, { small: true, color: PAL.ink }));
          ry += 9;
        }
        if (camp.heal && target.injuredUntil > run.week) {
          side.addChild(text(`RETURN  W${target.injuredUntil} → W${Math.max(run.week + weeks + 1, target.injuredUntil - camp.heal * weeks)}`, 6, ry, { small: true, color: PAL.moss }));
          ry += 9;
        }
      }
      side.addChild(text(`MORALE  ${target.morale} → ${Math.min(100, target.morale + camp.morale * weeks)}`, 6, ry, { small: true, color: PAL.ink }));
      ry += 12;
      side.addChild(text('WHAT IT DOES TO THE ROOM', 6, ry, { small: true, color: PAL.blood }));
      ry += 10;
      side.addChild(text(`CASH  ${money(run.cash)} → ${money(run.cash - cost)}`, 6, ry, { small: true, color: run.cash - cost < 0 ? PAL.blood : PAL.ink }));
      ry += 9;
      side.addChild(text(`BUZZ  ${Math.round(run.buzz)} → ${Math.max(0, Math.min(100, Math.round(run.buzz + buzzDelta)))}`, 6, ry, { small: true, color: PAL.ink }));
      ry += 9;
      side.addChild(text(`HEAT  ${Math.round(run.heat)} → ${Math.max(0, Math.min(100, Math.round(run.heat + heatDelta)))}`, 6, ry, { small: true, color: heatDelta > 0 ? PAL.blood : PAL.moss }));
    } else {
      side.addChild(text('Nobody on the roster. There is nothing left to rest.', 6, 30, { small: true, width: 190, color: PAL.blood }));
    }
  };
  redraw();

  b.addChild(button('TAKE THE WEEKS', 6, 204, 130, 16, () => {
    const res = skipWeeks(run, weeks, campId, fighterId);
    if (!res.ok) {
      alertBox(g, 'No deal', res.error ?? 'The week will not cooperate.');
      return;
    }
    writeRun(run);
    win.close();
    g.scene?.refresh();
    toastSeqAchievements(g, run);
    if (res.skip) showSkipReport(g, run, res.skip);
  }, { small: true, fill: PAL.moss, border: PAL.ink }));
  b.addChild(button('BACK', 144, 204, 80, 16, () => win.close(), { small: true, fill: PAL.shadow }));
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

/** The morning after nothing happened. */
function showSkipReport(g: Game, run: SeqRun, skip: SeqSkip): void {
  const win = openWindow(g, 'THE OFF WEEKS', 372, 196, { paper: 'news' });
  const b = win.body;
  b.addChild(text(`WEEK ${skip.fromWeek} → ${skip.toWeek}`, 8, 3, { small: true, color: PAL.blood }));
  b.addChild(text(`${skip.campName}${skip.fighterName ? '  /  ' + skip.fighterName : '  /  THE WHOLE LOCKER'}`, 8, 13, { small: true, color: PAL.ink }));
  const notes = skip.notes.length ? skip.notes.join(' ') : 'The week passed. Nothing happened. That is not the same as nothing changing.';
  b.addChild(text(notes, 8, 24, { small: true, width: 350, color: PAL.slate, maxLines: 4, lineGap: 0 }));
  b.addChild(new Graphics().rect(8, 66, 356, 1).fill(PAL.paperDark));
  const rows: [string, string, number][] = [
    ['CASH', `${money(skip.cashBefore)} → ${money(skip.cashAfter)}`, skip.cashAfter < skip.cashBefore ? PAL.blood : PAL.ink],
    ['BUZZ', `${Math.round(skip.buzzBefore)} → ${Math.round(skip.buzzAfter)}`, skip.buzzAfter < skip.buzzBefore ? PAL.blood : PAL.ink],
    ['HEAT', `${Math.round(skip.heatBefore)} → ${Math.round(skip.heatAfter)}`, skip.heatAfter > skip.heatBefore ? PAL.blood : PAL.moss],
    ['LOCKER', `${Math.round(skip.lockerBefore)} → ${Math.round(skip.lockerAfter)}`, skip.lockerAfter < skip.lockerBefore ? PAL.blood : PAL.moss],
  ];
  rows.forEach(([k, v, c], i) => {
    const y = 74 + i * 11;
    b.addChild(text(k, 8, y, { small: true, color: PAL.slate }));
    b.addChild(text(v, 70, y, { small: true, color: c }));
  });
  b.addChild(text('The crowd has a short memory. The rent does not.', 8, 126, { small: true, width: 356, color: PAL.slate, maxLines: 1 }));
  b.addChild(button(run.status === 'ended' ? 'READ THE FINAL EDITION' : 'BACK TO WORK', 118, 148, 136, 16, () => {
    win.close();
    g.scene?.refresh();
  }, { small: true, fill: run.status === 'ended' ? PAL.blood : PAL.moss, border: PAL.ink }));
  b.addChild(text(`THE SEASON  /  WEEK ${Math.min(run.week, SEASON_WEEKS)} OF ${SEASON_WEEKS}`, 8, 170, { small: true, color: PAL.slate }));
}
