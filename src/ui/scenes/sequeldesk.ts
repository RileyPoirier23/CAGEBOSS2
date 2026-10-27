/**
 * CAGE BOSS II: THE DESK.
 *
 * The first game's desk, one year later and with a worse landlord. Same lamp,
 * same red string, same stamps; new paper, new lies, and a commission that has
 * started reading the fine print because somebody in this building keeps
 * writing it.
 *
 * The simulation lives in src/sequel/desk.ts. This file is only the room: it
 * registers every field with an Inspector so a player can pull a red string
 * between the paper and the record, then stamp the thing and live with it.
 */
import { maybeLesson2 } from '../sequel/tutorial2';
import { Container, Graphics } from 'pixi.js';
import { Scene, type Game } from '../app';
import { PAL, shade } from '../../art/palette';
import {
  W, H, SW, OX, text, button, box, paper, clickable, ScrollBox, hoverTip, meterBar,
} from '../kit';
import { Inspector, fieldNode } from '../docview';
import { isTouchDevice } from '../../core/platform';
import { money, clamp } from '../../core/format';
import { Rng } from '../../core/rng';
import { sfx } from '../../audio/sfx';
import { openWindow, alertBox, confirm } from '../widgets';
import { fighterPortrait, reporterPortrait, npcPortrait } from '../sprites';
import { content } from '../../core/content';
import { readRun, writeRun } from '../../sequel/session';
import {
  askVisitor, compareFields, delegateDesk, deskCleared, deskTally, docInvalid, flagKey,
  newSeqRules, pendingCount, pendingDocs, refuseBribe, resolveDoc, ruleForType, seqRules,
  takeBribe,
} from '../../sequel/desk';
import type {
  SeqDeskDoc, SeqDeskDocType, SeqDeskTarget, SeqRun, SeqVerdict,
} from '../../sequel/types';
import { SEASON_WEEKS } from '../../sequel/types';
import { currentPhase } from '../../sequel/model';
import { toastSeqAchievements } from './sequelachievements';

const DOC_X = 122;
const DOC_Y = 84;
const DOC_W = 240;
const STRIP_Y = H - 16;

const DOC_LABEL: Record<SeqDeskDocType, string> = {
  bout: 'BOUT',
  medical: 'MEDICAL',
  permit: 'PERMIT',
  sponsor: 'SPONSOR',
  cage: 'CAGE',
  press: 'PRESS',
  weighin: 'WEIGH-IN',
  expense: 'EXPENSE',
  memo: 'MEMO',
  zenith: 'ZENITH',
};

const DOC_INK: Record<SeqDeskDocType, number> = {
  bout: PAL.paper, medical: PAL.sky, permit: PAL.moss, sponsor: PAL.plum, cage: PAL.gold,
  press: PAL.ember, weighin: PAL.bone, expense: PAL.rust, memo: PAL.ash, zenith: PAL.blood,
};

const PAPER_KIND: Record<SeqDeskDocType, 'cream' | 'blue' | 'lab' | 'white' | 'gloss' | 'yellow' | 'pink' | 'green'> = {
  bout: 'cream', medical: 'blue', permit: 'green', sponsor: 'gloss', cage: 'white',
  press: 'pink', weighin: 'white', expense: 'yellow', memo: 'white', zenith: 'cream',
};

const HEADER_INK: Record<SeqDeskDocType, number> = {
  bout: PAL.wood, medical: PAL.steel, permit: PAL.moss, sponsor: PAL.plum, cage: PAL.slate,
  press: PAL.rust, weighin: PAL.ink, expense: PAL.ember, memo: PAL.shadow, zenith: PAL.blood,
};

const VERDICT_LABEL: Record<SeqVerdict, string> = {
  approve: 'APPROVED', deny: 'DENIED', escalate: 'ESCALATED', bury: 'BURIED',
};

const VERDICT_INK: Record<SeqVerdict, number> = {
  approve: PAL.moss, deny: PAL.blood, escalate: PAL.steel, bury: PAL.plum,
};

interface Talk {
  docId: string;
  speaker: string;
  line: string;
  outcome: 'clean' | 'excuse' | 'fix' | 'bribe' | 'refuse';
  amount?: number;
}

interface Slip {
  reason: string;
  fine: number;
  warning: boolean;
  t: number;
  node: Container | null;
}

/**
 * The room. One run's paperwork, one week at a time.
 */
export class SequelDeskScene extends Scene {
  music = 'office' as const;
  private phone = isTouchDevice();
  private get FW(): number {
    return this.phone ? SW : W;
  }
  private get RW(): number {
    return this.FW - 366 - 4;
  }

  private ins = new Inspector();
  private selectedId: string | null = null;
  private message: { text: string; color: number; t: number } | null = null;
  private stringLayer = new Graphics();
  private docNode: Container | null = null;
  private talk: Talk | null = null;
  private slip: Slip | null = null;
  private anim: { t: number; node: Container; ink: Container | null; done: () => void } | null = null;
  private lastFound: [string, string] | null = null;
  private summary = false;
  private summaryDismissed = false;
  private delegationNote = '';
  private queueScroll = 0;
  private lastEvent: { kind: 'compare' | 'stamp' | 'ask' | 'select'; found?: boolean; verdict?: SeqVerdict; correct?: boolean } | null = null;

  build(): void {
    maybeLesson2(this.g, 'desk');
    const run = readRun();
    if (!run) {
      void import('./sequel').then((m) => this.g.goto(new m.SequelTitleScene(this.g)));
      return;
    }
    if (run.status === 'ended') {
      void import('./sequelend').then((m) => this.g.goto(new m.SequelEndScene(this.g)));
      return;
    }
    if (run.status !== 'plan') {
      void import('./sequelhub').then((m) => this.g.goto(new m.SequelHubScene(this.g)));
      return;
    }

    const r = this.root;
    r.x = -OX;
    this.stringLayer = new Graphics();
    this.ins.clear();
    this.ins.onCompare = (a, b) => this.compare(run, a, b);
    this.ins.onChange = () => this.drawStrings(run);

    const docs = run.desk?.docs ?? [];
    const doc = this.currentDoc(run);
    if (!doc) {
      r.addChild(text('NO PAPERWORK. SOMETHING IS WRONG.', 12, 100, { color: PAL.blood }));
      return;
    }

    this.drawWall(run, doc);
    this.drawVisitor(run, doc);

    // The desk surface.
    const desk = new Graphics();
    desk.rect(0, 80, this.FW, H - 80).fill(PAL.wood);
    for (let y = 82; y < H; y += 5) desk.rect(0, y, this.FW, 1).fill(shade(PAL.wood, (y % 15) / 150 - 0.04));
    r.addChild(desk);
    r.addChild(this.drawClutter());

    const fc = this.drawFileCard(run, doc);
    fc.node.position.set(4, 84);
    r.addChild(fc.node);
    const rcY = 84 + fc.h + 4;
    const rc = this.drawRuleCard(run, doc);
    if (rcY + rc.h > 236) {
      const sb = new ScrollBox(114, Math.max(34, 236 - rcY));
      sb.position.set(4, rcY);
      sb.content.addChild(rc.node);
      r.addChild(sb);
      sb.refresh();
    } else {
      rc.node.position.set(4, rcY);
      r.addChild(rc.node);
    }
    r.addChild(this.drawProps(run));

    // The paper.
    const centre = new Container();
    centre.position.set(DOC_X, DOC_Y);
    r.addChild(centre);
    this.docNode = centre;
    const dv = this.renderDocument(run, doc);
    if (dv.height > H - DOC_Y - 2) {
      const sb = new ScrollBox(DOC_W + 4, H - DOC_Y - 2);
      sb.content.addChild(dv);
      centre.addChild(sb);
      sb.refresh();
    } else centre.addChild(dv);

    // Inbox and stamps.
    r.addChild(this.drawQueue(run, docs));
    r.addChild(this.drawStamps(run, doc));

    // The inspection strip.
    const strip = this.drawStrip(run, doc);
    if (strip) r.addChild(strip);

    // A citation printing out of the desk.
    if (this.slip) {
      this.slip.node = null;
      r.addChild(this.drawSlip());
    }

    r.addChild(this.stringLayer);
    this.drawStrings(run);

    if (this.summary || (run.desk.done && !this.summaryDismissed)) r.addChild(this.drawSummary(run));

    if (!run.flags.desk_primer) this.openPrimer(run);
  }

  // ---------------------------------------------------------------- the room

  private drawWall(run: SeqRun, doc: SeqDeskDoc): void {
    const r = this.root;
    const FW = this.FW;
    const wall = new Graphics();
    wall.rect(0, 0, FW, 80).fill(0x3a3036);
    for (let x = 0; x < FW; x += 16) wall.rect(x, 0, 1, 80).fill(0x342b31);
    wall.rect(0, 76, FW, 4).fill(0x241d22);
    r.addChild(wall);

    const win = new Graphics();
    win.rect(6, 4, 190, 70).fill(0x1d2430);
    win.rect(6, 4, 190, 70).stroke({ color: 0x6b5a4a, width: 2, alignment: 1 });
    for (let i = 0; i < 30; i++) win.rect(8 + ((i * 37) % 186), 40 + ((i * 13) % 30), 2, 2).fill(i % 3 ? 0x4a5a6a : 0x8a7a4a);
    r.addChild(win);

    // The clock counts the season, not the shift.
    const clock = new Graphics();
    clock.circle(214, 22, 15).fill(PAL.bone).stroke({ color: PAL.ink, width: 2 });
    const start = -Math.PI / 2;
    const frac = clamp(run.week / SEASON_WEEKS, 0, 1);
    if (frac > 0) clock.moveTo(214, 22).arc(214, 22, 13, start, start + frac * Math.PI * 2).lineTo(214, 22).fill({ color: PAL.ember, alpha: 0.25 });
    const ha = start + frac * Math.PI * 2;
    clock.moveTo(214, 22).lineTo(214 + Math.cos(ha) * 11, 22 + Math.sin(ha) * 11).stroke({ color: PAL.blood, width: 2 });
    clock.circle(214, 22, 1).fill(PAL.ink);
    r.addChild(clock);
    r.addChild(text(`WEEK ${run.week}`, 190, 41, { small: true, color: PAL.bone, width: 48, align: 'center' }));
    const phase = currentPhase(run);
    r.addChild(text(`Q${phase.no}`, 190, 51, { small: true, color: PAL.ember, width: 48, align: 'center' }));

    const cal = paper(62, 34, 'white', 2);
    cal.position.set(244, 6);
    r.addChild(cal);
    r.addChild(text(`WEEK ${run.week} / ${SEASON_WEEKS}`, 248, 9, { small: true, color: PAL.blood, width: 56, maxLines: 1 }));
    r.addChild(text(`Q${phase.no} ${phase.name}`, 248, 19, { small: true, color: PAL.ink, width: 56, maxLines: 2, lineGap: 0 }));
    r.addChild(text(doc.type === 'memo' ? 'A NOTE' : `${pendingDocs(run.desk).length} LEFT`, 248, 31, { small: true, color: PAL.slate, width: 56 }));

    const cash = new Container();
    cash.addChild(box(64, 34, PAL.ink, PAL.gold));
    cash.addChild(text('CASH', 4, 3, { small: true, color: PAL.gold }));
    cash.addChild(text(money(run.cash), 4, 11, { small: true, color: run.cash < 0 ? PAL.blood : PAL.bone, width: 58, maxLines: 1 }));
    cash.addChild(text(`DESK ${docsDone(run)}/${run.desk.docs.length}`, 4, 22, { small: true, color: PAL.ash }));
    cash.position.set(308, 6);
    r.addChild(cash);

    const ms = new Container();
    ms.position.set(308, 44);
    const stats: [string, number, number, boolean][] = [
      ['BUZ', run.buzz, run.buzz > 60 ? PAL.moss : run.buzz < 30 ? PAL.blood : PAL.gold, false],
      ['HEA', run.heat, run.heat > 60 ? PAL.blood : run.heat < 30 ? PAL.moss : PAL.gold, true],
      ['LOC', run.locker, run.locker > 60 ? PAL.moss : run.locker < 30 ? PAL.blood : PAL.gold, false],
    ];
    stats.forEach(([label, v, colour], i) => {
      const m = new Container();
      m.addChild(text(label, 0, 0, { small: true, color: PAL.ash }));
      m.addChild(box(26, 4, PAL.ink)).position.set(0, 7);
      m.addChild(box(Math.max(1, Math.round((24 * v) / 100)), 2, colour)).position.set(1, 8);
      m.position.set(i * 30, 0);
      hoverTip(m, `${label}: ${Math.round(v)}/100`);
      ms.addChild(m);
    });
    r.addChild(ms);

    // Top-right: the way out, the rules, and what the fixer would cost.
    const navX = FW - 106;
    r.addChild(button('BACK', navX, 4, 50, 14, () => this.toHub(), { small: true, fill: PAL.shadow, border: PAL.slate }));
    r.addChild(button('RULES', navX + 52, 4, 50, 14, () => this.openRulebook(run, doc), { small: true, fill: PAL.steel, border: PAL.slate }));
    r.addChild(button('HELP', navX + 52, 20, 50, 14, () => { void import('./sequel').then((m) => m.openSequelHelp(this.g)); }, { small: true, fill: PAL.shadow, border: PAL.slate }));
    const pending = pendingDocs(run.desk).length;
    r.addChild(text(pending ? `${pending} DOC${pending === 1 ? '' : 'S'} DUE` : 'DESK CLEAR', navX, 37, { small: true, color: pending ? PAL.blood : PAL.moss, width: 48, maxLines: 1 }));
    r.addChild(text(newSeqRules(run.week).length ? 'NEW RULE' : `WEEK ${run.week}`, navX + 52, 37, { small: true, color: newSeqRules(run.week).length ? PAL.gold : PAL.ash, width: 50, maxLines: 1 }));
  }

  private drawClutter(): Container {
    const c = new Container();
    c.eventMode = 'none';
    const g = new Graphics();
    for (const [x, y, r] of [[300, 236, 7], [312, 241, 6], [168, 226, 7]]) {
      g.circle(x, y, r).stroke({ color: shade(PAL.wood, -0.25), width: 1, alpha: 0.6 });
    }
    g.rect(326, 216, 14, 16).fill(0xe8e2d4).rect(326, 216, 14, 3).fill(0x3a2418).rect(340, 220, 4, 8).stroke({ color: 0xe8e2d4, width: 2 });
    g.rect(328, 222, 10, 5).fill(PAL.blood);
    g.rect(132, 222, 22, 2).fill(0x2a3a8a).rect(152, 222, 3, 2).fill(0xc4a04a);
    g.roundRect(128, 232, 26, 7, 2).fill(0x3a3a40).roundRect(128, 230, 24, 4, 2).fill(0x8a2a2a);
    g.rect(16, 168, 40, 32).fill(0x8a6a3a).rect(19, 171, 34, 26).fill(0x1a1a24);
    g.ellipse(36, 190, 13, 4).fill(0xcfc8b9).rect(24, 178, 24, 10).stroke({ color: 0x5a5a62, width: 1 });
    g.circle(33, 183, 2).fill(0xe0b48c).circle(40, 183, 2).fill(0x8a5a3a);
    g.circle(86, 196, 6).fill(PAL.blood).circle(84, 194, 2).fill({ color: 0xffffff, alpha: 0.3 });
    c.addChild(g);
    const plate = new Graphics().rect(0, 0, 124, 13).fill(0x2a1a10).rect(0, 0, 124, 2).fill(0x4a3420).rect(4, 13, 116, 2).fill(shade(PAL.wood, -0.3));
    plate.position.set(180, 248);
    c.addChild(plate);
    c.addChild(text('PRESIDENT  /  THE WAREHOUSE', 180, 252, { small: true, color: PAL.gold, width: 124, align: 'center', maxLines: 1 }));
    return c;
  }

  private drawVisitor(run: SeqRun, doc: SeqDeskDoc): Container {
    const r = this.root;
    const por = this.visitorPortrait(run, doc);
    if (!por) {
      r.addChild(text('(the doorway is mercifully empty)', 14, 34, { small: true, color: PAL.grey }));
      return new Container();
    }
    const face = new Container();
    face.addChild(new Graphics().rect(0, 0, 64, 64).fill({ color: 0xffffff, alpha: 0.001 }));
    face.addChild(por);
    face.position.set(12, 7);
    r.addChild(face);

    const talk = this.talk && this.talk.docId === doc.id ? this.talk : null;
    if (talk) {
      r.addChild(this.drawBubble(talk));
      return face;
    }
    r.addChild(text(doc.visitor.name, 82, 8, { small: true, color: PAL.bone, width: 110, maxLines: 2 }));
    r.addChild(text(doc.visitor.role, 82, 24, { small: true, color: PAL.ash, width: 110, maxLines: 1 }));
    r.addChild(text(doc.line, 82, 33, { small: true, color: PAL.fog, width: 110, maxLines: 4, lineGap: 0 }));
    return face;
  }

  private visitorPortrait(run: SeqRun, doc: SeqDeskDoc): Container | null {
    const v = doc.visitor;
    const fighter = (v.fighterId ? run.roster.find((x) => x.f.id === v.fighterId)?.f : undefined)
      ?? (v.fighterId ? run.freeAgents.find((x) => x.id === v.fighterId) : undefined);
    if (fighter) return fighterPortrait(fighter, 64);
    const rep = v.reporterId ? content().reporters.find((x) => x.id === v.reporterId) : undefined;
    if (rep) return reporterPortrait(rep, 64);
    const kinds = { cop: 'cop', exec: 'exec', manager: 'manager', lawyer: 'lawyer', fan: 'fan', doctor: 'doctor' } as const;
    const kind = kinds[v.kind as keyof typeof kinds] ?? 'manager';
    return npcPortrait(v.seed, kind, 64);
  }

  private drawBubble(talk: Talk): Container {
    const c = new Container();
    c.position.set(80, 6);
    const bw = 114;
    const bribe = talk.outcome === 'bribe';
    const name = text(talk.speaker.toUpperCase(), 4, 3, { small: true, color: PAL.blood, width: bw - 8, maxLines: 1 });
    const line = text(talk.line, 4, 11, { small: true, color: PAL.ink, width: bw - 8, maxLines: bribe ? 5 : 7 });
    const bh = Math.min(66, 15 + line.textHeight + (bribe ? 15 : 0));
    const g = new Graphics();
    g.roundRect(0, 0, bw, bh, 3).fill(PAL.bone).stroke({ color: PAL.ink, width: 1 });
    g.moveTo(0, 14).lineTo(-6, 20).lineTo(0, 22).fill(PAL.bone);
    c.addChild(g, name, line);
    if (bribe && talk.amount) {
      c.addChild(button(`TAKE ${money(talk.amount)}`, 4, bh - 14, 58, 11, () => this.bribe(true), {
        small: true, fill: PAL.moss, tooltip: 'Pocket it. The paper goes through. Heat goes up. Somebody always remembers.',
      }));
      c.addChild(button('REFUSE', 66, bh - 14, 44, 11, () => this.bribe(false), { small: true, fill: PAL.blood }));
    }
    return c;
  }

  private drawProps(run: SeqRun): Container {
    const props = new Container();
    props.position.set(4, 240);
    const on = this.ins.active;
    const lamp = clickable(new Container(), () => this.toggleInspect(), 'Inspect mode (I / SPACE): click a field, then the field it should match.');
    lamp.addChild(box(46, 26, on ? PAL.gold : PAL.shadow, PAL.ink, { bevel: true }));
    lamp.addChild(new Graphics().circle(8, 13, 5).fill(on ? 0xfff2a0 : 0x5a5246).stroke({ color: PAL.ink, width: 1 }));
    lamp.addChild(text(on ? 'INSPECT\nON' : this.phone ? 'INSPECT\nOFF' : 'INSPECT\n(I)', 16, 6, { small: true, color: on ? PAL.ink : PAL.bone }));
    props.addChild(lamp);
    const rb = clickable(new Container(), () => this.openRulebook(run, this.currentDoc(run)), 'Rulebook (R): every rule that has arrived so far.');
    rb.addChild(box(36, 26, 0x2d3a52, PAL.ink, { bevel: true }));
    rb.addChild(new Graphics().rect(3, 2, 2, 22).fill(PAL.gold));
    rb.addChild(text('RULE\nBOOK', 8, 5, { small: true, color: PAL.gold }));
    if (newSeqRules(run.week).length) rb.addChild(text('NEW', 22, 19, { small: true, color: PAL.blood }));
    rb.position.set(50, 0);
    props.addChild(rb);
    const ask = clickable(new Container(), () => this.ask(run), 'Ask the visitor about the paper (Q).');
    ask.addChild(box(26, 26, 0x3a3a40, PAL.ink, { bevel: true }));
    ask.addChild(text('ASK', 5, 5, { small: true, color: PAL.bone }));
    ask.addChild(text('?', 10, 14, { small: true, color: PAL.gold }));
    ask.position.set(90, 0);
    props.addChild(ask);
    return props;
  }

  // ---------------------------------------------------------------- the paper on the left

  private drawFileCard(run: SeqRun, doc: SeqDeskDoc): { node: Container; h: number } {
    const rows: Container[] = [];
    let y = 14;
    const targets = doc.targets.filter((t) => t.where !== 'rule');
    for (const t of targets) {
      const { node, h } = fieldNode(t.key, t.label, t.value, 108, this.ins, { labelW: 38, small: true });
      node.position.set(3, y);
      rows.push(node);
      y += h + 1;
    }
    if (!targets.length) {
      const none = text(doc.type === 'memo' ? 'No file. It is a note, not a form.' : 'No record on file.\nThat is either a problem or a Tuesday.', 4, y, { small: true, color: PAL.slate, width: 106 });
      rows.push(none);
      y += none.textHeight + 2;
    }
    const h = Math.max(42, y + 4);
    const c = new Container();
    c.addChild(paper(114, h, 'manila', 7));
    c.addChild(box(114, 11, PAL.woodDark));
    c.addChild(text(doc.subject.toUpperCase(), 3, 3, { small: true, color: PAL.bone, width: 108, maxLines: 1 }));
    rows.forEach((row) => c.addChild(row));
    void run;
    return { node: c, h };
  }

  private drawRuleCard(run: SeqRun, doc: SeqDeskDoc): { node: Container; h: number } {
    const rule = ruleForType(doc.type);
    const rows: Container[] = [];
    let y = 16;
    if (rule) {
      const title = text(rule.name.toUpperCase(), 4, y, { small: true, color: PAL.blood, width: 106, maxLines: 2 });
      rows.push(title);
      y += title.textHeight + 2;
      const body = text(rule.text, 4, y, { small: true, color: PAL.ink, width: 106, maxLines: 5, lineGap: 0 });
      rows.push(body);
      y += body.textHeight + 4;
    }
    for (const t of doc.targets.filter((x) => x.where === 'rule')) {
      const { node, h } = fieldNode(t.key, t.label, t.value, 108, this.ins, { labelW: 38, small: true });
      node.position.set(3, y);
      rows.push(node);
      y += h + 1;
    }
    if (!rule && !doc.targets.some((t) => t.where === 'rule')) {
      const none = text('No rule for this paper yet. The commission is making it up as it goes.', 4, y, { small: true, color: PAL.slate, width: 106 });
      rows.push(none);
      y += none.textHeight + 2;
    }
    const h = Math.max(42, y + 5);
    const c = new Container();
    c.addChild(paper(114, h, 'white', 9));
    c.addChild(box(114, 12, PAL.slate));
    c.addChild(text('RULEBOOK', 3, 3, { small: true, color: PAL.bone }));
    c.addChild(text(`W${Math.min(rule?.week ?? run.week, run.week)}`, 92, 3, { small: true, color: PAL.gold, width: 18, align: 'right' }));
    rows.forEach((row) => c.addChild(row));
    return { node: c, h };
  }

  // ---------------------------------------------------------------- centre

  private renderDocument(run: SeqRun, doc: SeqDeskDoc): Container {
    const c = new Container();
    const fields: Container[] = [];
    const kind = PAPER_KIND[doc.type];
    const header = HEADER_INK[doc.type];
    const sub = text(`${doc.subject}  /  ${doc.subtitle}`, 6, 16, { small: true, color: PAL.slate, width: DOC_W - 12, maxLines: 2 });
    let y = 16 + sub.textHeight + 3;
    const labelW = doc.type === 'memo' || doc.type === 'zenith' ? 36 : doc.type === 'expense' ? 44 : 52;
    for (const f of doc.fields) {
      const { node, h } = fieldNode(f.key, f.label, f.value, DOC_W - 10, this.ins, {
        kind: f.kind, labelW, small: f.value.length > 44 || f.value.includes('\n') || doc.type === 'memo' || doc.type === 'zenith',
      });
      node.position.set(5, y);
      fields.push(node);
      y += h + 2;
    }
    const body = String(doc.meta.body ?? '');
    let bodyNode: ReturnType<typeof text> | null = null;
    if (body) {
      y += 2;
      bodyNode = text(body, 6, y, { small: true, color: PAL.ink, width: DOC_W - 12, lineGap: 0 });
      y += bodyNode.textHeight + 4;
    }
    const foot = text(
      doc.status === 'done' ? `FILED / ${VERDICT_LABEL[doc.verdict ?? 'approve']}` : `PAPER OF RECORD  /  WEEK ${doc.week}`,
      6, y + 2, { small: true, color: doc.status === 'done' ? VERDICT_INK[doc.verdict ?? 'approve'] : PAL.grey, width: DOC_W - 12 },
    );
    y += foot.textHeight + 5;
    const h = Math.max(doc.type === 'memo' ? 110 : 130, y + 8);
    c.addChild(paper(DOC_W, h, kind, doc.seed % 97 + 1));
    c.addChild(box(DOC_W, 12, header));
    c.addChild(text(doc.title, 4, 3, { small: true, color: PAL.bone, width: DOC_W - 8, maxLines: 1 }));
    c.addChild(sub);
    fields.forEach((f) => c.addChild(f));
    if (bodyNode) c.addChild(bodyNode);
    c.addChild(foot);
    if (doc.status === 'done' && doc.verdict) {
      const label = VERDICT_LABEL[doc.verdict];
      const ink = new Container();
      const col = VERDICT_INK[doc.verdict];
      const t = text(label, 6, 5, { scale: 2, color: col });
      ink.addChild(new Graphics().rect(0, 0, t.textWidth + 12, 24).stroke({ color: col, width: 2 }));
      ink.addChild(t);
      ink.pivot.set((t.textWidth + 12) / 2, 12);
      ink.position.set(DOC_W / 2, 54);
      ink.rotation = -0.2;
      ink.alpha = 0.55;
      c.addChild(ink);
    }
    void run;
    return c;
  }

  // ---------------------------------------------------------------- right column

  private drawQueue(run: SeqRun, docs: SeqDeskDoc[]): Container {
    const c = new Container();
    c.position.set(366, 84);
    const qw = this.phone ? this.RW : 110;
    const rh = 14;
    c.addChild(box(qw, 100, 0x2a1f18, PAL.woodDark));
    c.addChild(text(`INBOX (${docs.filter((d) => d.status === 'pending').length})`, 4, 3, { small: true, color: PAL.gold }));
    const sb = new ScrollBox(qw - 4, 84);
    sb.position.set(2, 12);
    docs.forEach((d, i) => {
      const sel = d.id === this.selectedId;
      const row = clickable(new Container(), () => this.selectDoc(d.id), 'Open this paper.');
      row.addChild(box(qw - 10, rh, sel ? PAL.slate : shade(0x2a1f18, 0.08)));
      row.addChild(box(3, rh, DOC_INK[d.type]));
      const flag = d.flagged.length ? '!' : d.status === 'done' ? (d.correct ? 'OK' : 'X') : '';
      const label = `${DOC_LABEL[d.type]} ${d.subject}`;
      row.addChild(text(label, 6, 3, { small: true, color: d.status === 'done' ? PAL.grey : PAL.bone, width: qw - 28, maxLines: 1 }));
      if (flag) row.addChild(text(flag, qw - 19, 3, { small: true, color: flag === 'OK' ? PAL.moss : PAL.blood }));
      row.position.set(0, i * (rh + 1));
      sb.content.addChild(row);
    });
    c.addChild(sb);
    sb.scrollTo(this.queueScroll);
    sb.on('wheel', () => {
      this.queueScroll = sb.scrollY;
    });
    void run;
    return c;
  }

  private stampLabels(doc: SeqDeskDoc): Record<SeqVerdict, string> {
    if (doc.type === 'memo') return { approve: 'FILE IT', deny: 'REFUSE', escalate: 'LEGAL', bury: 'SHRED' };
    if (doc.type === 'zenith') return { approve: 'SIGN', deny: 'REFUSE', escalate: 'LEGAL', bury: 'LOSE IT' };
    if (doc.type === 'weighin') return { approve: 'FIGHT', deny: 'CANCEL', escalate: 'CATCHWT', bury: 'BURY' };
    return { approve: 'APPROVE', deny: 'DENY', escalate: 'ESCALATE', bury: 'BURY' };
  }

  private drawStamps(run: SeqRun, doc: SeqDeskDoc): Container {
    const c = new Container();
    c.position.set(366, 190);
    const P = this.phone;
    const cw = P ? this.RW : 110;
    const half = P ? Math.floor((cw - 9) / 2) : 52;
    const x2 = P ? 6 + half : 56;
    c.addChild(box(cw, 88, 0x2a1f18, PAL.woodDark));
    c.addChild(text('STAMPS', 4, 3, { small: true, color: PAL.gold }));
    if (doc.status === 'done') {
      const tally = deskTally(run);
      c.addChild(text(`FILED: ${VERDICT_LABEL[doc.verdict ?? 'approve']}`, 4, 16, { small: true, color: VERDICT_INK[doc.verdict ?? 'approve'] }));
      c.addChild(text(`${tally.correct}/${tally.docs} correct  /  ${tally.cites} citations`, 4, 27, { small: true, color: PAL.ash, width: cw - 8, maxLines: 2 }));
      const next = pendingDocs(run.desk)[0];
      if (next) c.addChild(button('NEXT PAPER', 4, 50, cw - 8, 14, () => this.selectDoc(next.id), { small: true, fill: PAL.steel }));
      else c.addChild(button('SUMMING UP', 4, 50, cw - 8, 14, () => { this.summary = true; this.refresh(); }, { small: true, fill: PAL.moss }));
      c.addChild(text('The paper stays in the file.', 4, 71, { small: true, color: PAL.grey, width: cw - 8, maxLines: 1 }));
      return c;
    }
    const labels = this.stampLabels(doc);
    const block = (v: SeqVerdict, x: number) => {
      const b = clickable(new Container(), () => this.stamp(v), `${labels[v]} (${keyFor(v)})`);
      const col = VERDICT_INK[v];
      b.addChild(new Graphics().rect(half / 2 - 11, 0, 22, 9).fill(shade(PAL.wood, 0.25)).stroke({ color: PAL.ink, width: 1 }));
      b.addChild(new Graphics().rect(half / 2 - 8, -3, 16, 4).fill(shade(PAL.wood, 0.4)));
      b.addChild(box(half, 20, col, PAL.ink, { bevel: true })).position.set(0, 9);
      b.addChild(text(labels[v], 0, 14, { small: true, color: PAL.bone, width: half, align: 'center', maxLines: 1 }));
      b.position.set(x, 13);
      return b;
    };
    c.addChild(block('approve', 3));
    c.addChild(block('deny', x2));
    c.addChild(button(labels.escalate, 3, 45, half, 12, () => this.stamp('escalate'), {
      small: true, fill: VERDICT_INK.escalate, tooltip: 'Send it to legal: safe but expensive, and the commission notices overuse.',
    }));
    c.addChild(button(labels.bury, x2, 45, half, 12, () => this.stamp('bury'), {
      small: true, fill: VERDICT_INK.bury, tooltip: 'Make it disappear. Deliberate. Tracked. It may turn up in a wall.',
    }));
    const pending = pendingDocs(run.desk).length;
    const fee = 900 + pending * 300;
    c.addChild(button(`FIXER ${money(fee)}`, 3, 59, cw - 6, 12, () => this.delegate(run), {
      small: true, fill: PAL.ember, tooltip: 'Pay somebody else to read it. He is cheaper than a lawyer and worse at his job.',
    }));
    c.addChild(text(this.ins.active ? 'Inspecting...' : 'I = inspect  Q = ask', 4, 75, { small: true, color: PAL.grey, width: cw - 8, maxLines: 1 }));
    return c;
  }

  // ---------------------------------------------------------------- strip + inspection

  private drawStrip(run: SeqRun, doc: SeqDeskDoc): Container | null {
    let msg = this.message?.text ?? '';
    let color = this.message?.color ?? PAL.bone;
    let ask = false;
    if (!msg && doc) {
      const flagged = this.flagged(doc);
      if (doc.status === 'done') {
        msg = doc.result || `FILED. ${VERDICT_LABEL[doc.verdict ?? 'approve']}.`;
        color = doc.correct ? PAL.bone : PAL.ember;
      } else if (flagged.length) {
        msg = 'DISCREPANCY: ' + flagged.map((x) => x[2]).join(' / ');
        color = PAL.blood;
        ask = doc.asked < 2;
      } else if (this.ins.active) {
        msg = this.ins.selected
          ? 'Now click the field it should match: file card, rulebook or licence.'
          : 'INSPECT: click a field on the paper, then the field it should match.';
        color = PAL.gold;
      }
    }
    if (!msg) return null;
    const c = new Container();
    const tw = ask ? 196 : 236;
    const t = text(msg, 4, 3, { small: true, width: tw, color, maxLines: 4 });
    const h = t.textHeight + 7;
    c.addChild(box(244, h, PAL.ink, color));
    c.addChild(t);
    if (ask) {
      c.addChild(button('ASK', 204, Math.max(1, Math.floor((h - 11) / 2)), 36, 11, () => this.ask(run), {
        small: true, fill: PAL.blood, tooltip: 'Ask the visitor about it. Excuses, fixes, envelopes.',
      }));
    }
    c.position.set(DOC_X - 2, Math.min(STRIP_Y, H - h - 1));
    return c;
  }

  private drawSlip(): Container {
    const sl = this.slip!;
    const c = new Container();
    const w = 150;
    const body = text(sl.reason, 6, 22, { small: true, width: w - 12, color: PAL.ink, maxLines: 4 });
    const more = text('CLICK TO READ IT ALL', 6, 0, { small: true, color: PAL.slate });
    const foot = text(sl.warning ? 'WARNING. Next time it comes out of your pay.' : `PENALTY: -${money(sl.fine, false)} from your pay`, 6, 0, { small: true, color: sl.warning ? PAL.slate : PAL.blood, width: w - 12 });
    const h = 40 + body.textHeight + foot.textHeight;
    foot.y = h - foot.textHeight - 14;
    more.y = h - 11;
    c.addChild(paper(w, h, 'pink', 77));
    c.addChild(box(w, 10, PAL.blood));
    c.addChild(text('M.O.A. CITATION', 4, 2, { small: true, color: PAL.bone }));
    c.addChild(text('PROTOCOL VIOLATION', 6, 13, { small: true, color: PAL.blood }));
    c.addChild(body, foot, more);
    clickable(c, () => {
      const full = this.slip;
      this.slip = null;
      this.refresh();
      if (full) {
        alertBox(this.g, 'M.O.A. CITATION', `PROTOCOL VIOLATION\n\n${full.reason}\n\n${full.warning ? 'WARNING. Next time it comes out of your pay.' : `PENALTY: -${money(full.fine, false)} from your pay.`}\n\nAll citations are on the record.`);
      }
    }, 'Read the whole citation.');
    c.position.set(DOC_X + (DOC_W - w) / 2, H - h - 20);
    c.rotation = 0.015;
    return c;
  }

  /** Recorded discrepancies on a doc: [a, b, text]. */
  private flagged(doc: SeqDeskDoc): [string, string, string][] {
    return doc.flagged
      .filter((p) => p.includes('~'))
      .map((p) => {
        const [a, b] = p.split('~');
        const link = doc.links.find((l) => flagKey(l) === p);
        return [a, b, link ? link.note : ''] as [string, string, string];
      })
      .filter((x) => x[2]);
  }

  private compare(run: SeqRun, a: string, b: string): void {
    const doc = this.currentDoc(run);
    if (!doc) return;
    const res = compareFields(run, doc.id, a, b);
    this.lastEvent = { kind: 'compare', found: res.found };
    if (res.found) {
      sfx('bad');
      sfx('stamp');
      this.lastFound = [a, b];
      this.message = null;
      this.g.shake(1, 0.15);
    } else {
      sfx('click');
      this.lastFound = null;
      this.flash('No discrepancy.', PAL.ash, 1.6);
    }
    writeRun(run);
    this.refresh();
  }

  private drawStrings(run: SeqRun): void {
    const g = this.stringLayer;
    if (!g || g.destroyed) return;
    g.clear();
    const doc = this.currentDoc(run);
    if (this.ins.active) {
      for (const sp of this.ins.spots.values()) {
        if (sp.node.destroyed) continue;
        const bb = sp.node.getBounds();
        g.rect(bb.x, bb.y, bb.width, bb.height).stroke({ color: PAL.gold, width: 1, alpha: 0.25 });
      }
      if (this.ins.selected) {
        const sp = this.ins.spots.get(this.ins.selected);
        if (sp && !sp.node.destroyed) {
          const bb = sp.node.getBounds();
          g.rect(bb.x - 1, bb.y - 1, bb.width + 2, bb.height + 2).fill({ color: 0xf0e060, alpha: 0.2 }).stroke({ color: PAL.gold, width: 1 });
        }
      }
    }
    const pairs: [string, string][] = doc ? this.flagged(doc).map((x) => [x[0], x[1]]) : [];
    if (this.lastFound && !pairs.some((p) => p[0] === this.lastFound![0] && p[1] === this.lastFound![1])) {
      pairs.push(this.lastFound);
    }
    for (const [ka, kb] of pairs) {
      const a = this.ins.center(ka);
      const b = this.ins.center(kb);
      if (a && b) g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: PAL.blood, width: 2, alpha: 0.85 });
      for (const k of [ka, kb]) {
        const sp = this.ins.spots.get(k);
        if (!sp || sp.node.destroyed) continue;
        const bb = sp.node.getBounds();
        g.rect(bb.x - 1, bb.y - 1, bb.width + 2, bb.height + 2).fill({ color: 0xff3030, alpha: 0.16 }).stroke({ color: PAL.blood, width: 1 });
      }
    }
  }

  // ---------------------------------------------------------------- actions

  private currentDoc(run: SeqRun): SeqDeskDoc | null {
    const docs = run.desk?.docs ?? [];
    const pending = docs.filter((d) => d.status === 'pending');
    const chosen = pending.find((d) => d.id === this.selectedId) ?? pending[0] ?? docs.find((d) => d.id === this.selectedId) ?? docs[docs.length - 1] ?? null;
    if (chosen) this.selectedId = chosen.id;
    return chosen;
  }

  private selectDoc(id: string): void {
    if (this.anim) return;
    this.selectedId = id;
    this.ins.selected = null;
    this.lastFound = null;
    this.message = null;
    this.talk = null;
    this.summary = false;
    this.summaryDismissed = true;
    this.lastEvent = { kind: 'select' };
    sfx('paper');
    this.refresh();
  }

  private toggleInspect(): void {
    this.ins.active = !this.ins.active;
    this.ins.selected = null;
    sfx('click');
    this.refresh();
  }

  private ask(run: SeqRun): void {
    const doc = this.currentDoc(run);
    if (!doc || doc.status === 'done' || this.anim) return;
    const rng = new Rng(run.rng);
    const rep = askVisitor(run, doc.id, rng);
    run.rng = rng.state;
    if (!rep) return;
    this.lastEvent = { kind: 'ask' };
    this.talk = { ...rep, docId: doc.id };
    sfx(rep.outcome === 'bribe' ? 'cash' : 'type');
    if (rep.outcome === 'fix') {
      this.lastFound = null;
      this.flash('FIXED: the document has been corrected. Check it again.', PAL.moss);
    }
    writeRun(run);
    this.refresh();
  }

  private bribe(take: boolean): void {
    const run = readRun();
    if (!run) return;
    const doc = this.currentDoc(run);
    if (!doc) return;
    if (take) {
      const res = takeBribe(run, doc.id);
      sfx('cash');
      this.talk = null;
      this.selectedId = null;
      this.lastFound = null;
      this.message = null;
      if (res.ok) {
        this.flash(res.text, PAL.gold, 5);
        if (run.desk.done) this.summary = true;
      } else this.flash(res.text, PAL.blood, 4);
      writeRun(run);
      toastSeqAchievements(this.g, run);
      this.refresh();
    } else {
      this.flash(refuseBribe(doc), PAL.bone, 4);
      if (this.talk) this.talk = { ...this.talk, outcome: 'refuse', line: '"Your loss, boss." (pockets the envelope)' };
      writeRun(run);
      this.refresh();
    }
  }

  private stamp(verdict: SeqVerdict): void {
    const run = readRun();
    if (!run) return;
    const doc = this.currentDoc(run);
    if (!doc || doc.status === 'done' || this.anim) return;
    const res = resolveDoc(run, doc.id, verdict);
    if (!res) return;
    writeRun(run);
    this.lastEvent = { kind: 'stamp', verdict, correct: res.correct };
    sfx('stamp');
    sfx('thud');
    this.g.shake(2, 0.12);
    const node = this.docNode;
    if (node && !node.destroyed) {
      const col = VERDICT_INK[verdict];
      const label = doc.type === 'memo' ? 'FILED' : VERDICT_LABEL[verdict];
      const ink = new Container();
      const t = text(label, 6, 5, { scale: 2, color: col });
      ink.addChild(new Graphics().rect(0, 0, t.textWidth + 12, 24).stroke({ color: col, width: 2 }));
      ink.addChild(t);
      ink.pivot.set((t.textWidth + 12) / 2, 12);
      const jitter = Math.round(Math.sin(run.seed + doc.seed) * 18);
      ink.position.set(DOC_W / 2 + jitter, 42 + Math.abs(jitter) / 2);
      ink.rotation = -0.25 + (jitter / 180);
      ink.alpha = 0.9;
      ink.scale.set(1.35);
      node.addChild(ink);
      this.anim = { t: 0, node, ink, done: () => this.afterStamp(run, res) };
    } else this.afterStamp(run, res);
  }

  private afterStamp(run: SeqRun, res: NonNullable<ReturnType<typeof resolveDoc>>): void {
    this.anim = null;
    this.talk = null;
    this.selectedId = null;
    this.lastFound = null;
    this.ins.selected = null;
    if (res.citation) {
      sfx('citation');
      this.slip = { reason: res.citation.reason, fine: res.citation.fine, warning: res.citation.warning, t: 0, node: null };
      this.message = null;
    } else if (res.doc.type !== 'memo') {
      this.flash(res.text || VERDICT_LABEL[res.verdict], res.correct ? PAL.bone : PAL.ember, 3);
    }
    if (res.finished) {
      this.summary = true;
      toastSeqAchievements(this.g, run);
    }
    writeRun(run);
    this.refresh();
  }

  private delegate(run: SeqRun): void {
    const pending = pendingDocs(run.desk);
    if (!pending.length) {
      alertBox(this.g, 'Desk clear', 'There is nothing left to delegate. The fixer is disappointed.');
      return;
    }
    const fee = 900 + pending.length * 300;
    confirm(
      this.g,
      `Hire the fixer for ${money(fee)}? He will process ${pending.length} document${pending.length === 1 ? '' : 's'}. He is fast, tired and not always right.`,
      () => {
        const res = delegateDesk(run);
        if (!res.ok) {
          alertBox(this.g, 'No deal', res.error ?? 'The fixer wants more money.');
          return;
        }
        this.delegationNote = res.summary;
        this.summary = true;
        this.summaryDismissed = false;
        this.selectedId = null;
        writeRun(run);
        toastSeqAchievements(this.g, run);
        this.refresh();
      },
      'HIRE HIM',
      'KEEP READING',
    );
  }

  // ---------------------------------------------------------------- modals

  private openPrimer(run: SeqRun): void {
    run.flags.desk_primer = 1;
    writeRun(run);
    const win = openWindow(this.g, 'THE DESK', 372, 224, { paper: 'cream' });
    const b = win.body;
    b.addChild(text('EVERY WEEK, BEFORE THE CAGE OPENS.', 6, 2, { small: true, color: PAL.blood }));
    b.addChild(text('The commission wants the paper. You have a lamp, a rulebook and a stamp. This is the job.', 6, 12, { small: true, width: 356, color: PAL.ink, maxLines: 2 }));
    const steps: [string, string][] = [
      ['1. READ THE PAPER', 'The page in the middle is what somebody wants you to approve. The file card on the left is what is actually on record. The rulebook card says what the commission requires.'],
      ['2. INSPECT', 'Press I or click the INSPECT lamp. Click a field on the paper, then click the field it should match. A red string means somebody changed a number.'],
      ['3. ASK', 'A discrepancy gets you an ASK button. The visitor will offer an excuse, a fix, or an envelope. A fix costs money. An envelope costs heat and your name.'],
      ['4. STAMP', 'Valid paper gets APPROVED. Forged or invalid paper gets DENIED. Memos and Zenith letters are decisions, not comparisons: read what they want and decide.'],
      ['5. THE WEEK', 'Every correct stamp earns a little. A perfect week pays a bonus. Citations cost money and heat. When the desk is clear, go back and run the show.'],
    ];
    let y = 34;
    for (const [head, bodyText] of steps) {
      b.addChild(text(head, 6, y, { small: true, color: PAL.shadow }));
      const t = text(bodyText, 6, y + 8, { small: true, width: 356, color: PAL.slate, maxLines: 3, lineGap: 0 });
      b.addChild(t);
      y += t.textHeight + 13;
    }
    b.addChild(button('OPEN THE INBOX', 118, 200, 140, 16, () => win.close(), { small: true, fill: PAL.moss, border: PAL.ink }));
  }

  private openRulebook(run: SeqRun, doc: SeqDeskDoc | null): void {
    const win = openWindow(this.g, 'THE RULEBOOK', 424, 238, { paper: 'cream' });
    const b = win.body;
    const active = seqRules(run.week);
    const fresh = new Set(newSeqRules(run.week).map((r) => r.id));
    b.addChild(text(`${active.length} OF 10 RULES IN FORCE  /  WEEK ${run.week}`, 6, 2, { small: true, color: PAL.blood }));
    const sb = new ScrollBox(408, 188);
    sb.position.set(6, 13);
    let y = 0;
    for (const rule of active) {
      const on = doc?.type === rule.id;
      const isNew = fresh.has(rule.id);
      const head = text(`${rule.page}  /  ${rule.name}${isNew ? '  (NEW)' : ''}`, 0, y, {
        small: true, color: on ? PAL.blood : isNew ? PAL.rust : PAL.shadow, width: 400, maxLines: 1,
      });
      sb.content.addChild(head);
      y += 8;
      const body = text(rule.text, 0, y, { small: true, width: 400, color: PAL.ink, maxLines: 3, lineGap: 0 });
      sb.content.addChild(body);
      y += body.textHeight + 5;
      if (on) {
        const you = text('THIS IS THE PAPER ON YOUR DESK.', 0, y, { small: true, color: PAL.moss });
        sb.content.addChild(you);
        y += 9;
      }
    }
    sb.content.addChild(text('Rules arrive one at a time. The desk only prints paper the commission has taught you to read. Zenith correspondence begins on week 28.', 0, y + 2, { small: true, width: 400, color: PAL.slate, maxLines: 2 }));
    b.addChild(sb);
    sb.refresh();
    b.addChild(button('CLOSE', 346, 204, 72, 15, () => win.close(), { small: true, fill: PAL.shadow }));
  }

  // ---------------------------------------------------------------- summary

  private drawSummary(run: SeqRun): Container {
    const fw = this.FW;
    const c = new Container();
    const dim = new Graphics().rect(0, 0, fw, H).fill({ color: 0x08060c, alpha: 0.78 });
    dim.eventMode = 'static';
    dim.hitArea = { contains: () => true };
    dim.on('pointertap', (e) => e.stopPropagation());
    c.addChild(dim);
    const pw = Math.min(340, fw - 20);
    const ph = 198;
    const px = Math.round((fw - pw) / 2);
    const p = paper(pw, ph, 'cream', run.week * 31 + 5);
    p.position.set(px, 30);
    c.addChild(p);
    const tally = deskTally(run);
    const d = run.desk;
    p.addChild(text(tally.perfect ? 'A PERFECT WEEK' : 'THE DESK IS CLEAR', 10, 7, { color: tally.perfect ? PAL.moss : PAL.ink, maxLines: 1 }));
    p.addChild(text(`WEEK ${run.week}  /  ${tally.docs} DOCUMENT${tally.docs === 1 ? '' : 'S'}  /  ${tally.correct} CORRECT`, 10, 19, { small: true, color: PAL.blood, width: pw - 20 }));
    p.addChild(new Graphics().rect(10, 30, pw - 20, 1).fill(PAL.paperDark));
    const rows: [string, string, number][] = [
      ['CATCHES', String(d.catches), d.catches ? PAL.moss : PAL.ink],
      ['MISSES', String(d.misses), d.misses ? PAL.blood : PAL.ink],
      ['WRONG STAMPS', String(d.wrong), d.wrong ? PAL.blood : PAL.ink],
      ['CITATIONS', `${d.cites}  /  ${money(d.fines)}`, d.cites ? PAL.blood : PAL.ink],
      ['BRIBES', String(d.bribes), d.bribes ? PAL.rust : PAL.ink],
      ['BURIED', String(d.buried), d.buried ? PAL.plum : PAL.ink],
      ['ESCALATED', String(d.escalated), d.escalated ? PAL.steel : PAL.ink],
    ];
    rows.forEach(([k, v, col], i) => {
      const y = 38 + i * 10;
      p.addChild(text(k, 12, y, { small: true, color: PAL.slate }));
      p.addChild(text(v, 120, y, { small: true, color: col, width: pw - 132, align: 'right', maxLines: 1 }));
    });
    const noteY = 112;
    const note = this.delegationNote
      ? this.delegationNote
      : tally.perfect
        ? `Every paper correct. The commission adds a ${money(1000 + run.week * 50)} commendation and two points of buzz.`
        : d.cites
          ? `The commission has ${d.cites} citation${d.cites === 1 ? '' : 's'} with your name on ${d.cites === 1 ? 'it' : 'them'}. The file grows.`
          : 'The cage can open. Nobody is happy about it, but the paper is clear.';
    p.addChild(text(note, 10, noteY, { small: true, width: pw - 20, color: tally.perfect ? PAL.moss : d.cites ? PAL.blood : PAL.slate, maxLines: 3, lineGap: 0 }));
    p.addChild(new Graphics().rect(10, 148, pw - 20, 1).fill(PAL.paperDark));
    p.addChild(text(`SEASON  /  WEEK ${Math.min(run.week, SEASON_WEEKS)} OF ${SEASON_WEEKS}  /  CASH ${money(run.cash)}`, 10, 153, { small: true, color: PAL.slate, width: pw - 20, maxLines: 1 }));
    p.addChild(button('BACK TO THE OFFICE', 10, 172, Math.min(154, pw - 24), 17, () => this.toHub(), { small: true, fill: PAL.moss, border: PAL.ink }));
    p.addChild(button('REVIEW THE DESK', Math.min(172, pw - 118), 172, Math.min(154, pw - 24), 17, () => {
      this.summary = false;
      this.summaryDismissed = true;
      this.refresh();
    }, { small: true, fill: PAL.steel, border: PAL.ink }));
    return c;
  }

  // ---------------------------------------------------------------- end

  private toHub(): void {
    sfx('click');
    const run = readRun();
    if (run) {
      writeRun(run);
      toastSeqAchievements(this.g, run);
    }
    void import('./sequelhub').then((m) => this.g.goto(new m.SequelHubScene(this.g)));
  }

  private flash(msg: string, color: number, t = 4): void {
    this.message = { text: msg, color, t };
  }

  update(dt: number): void {
    const run = readRun();
    if (!run) return;
    if (this.anim) {
      const a = this.anim;
      a.t += dt;
      const ink = a.ink;
      if (ink && !ink.destroyed) ink.scale.set(Math.max(1, 1.35 - a.t * 4));
      if (a.t > 0.3 && !a.node.destroyed) {
        const k = Math.min(1, (a.t - 0.3) / 0.3);
        a.node.y = DOC_Y - k * k * 110;
        a.node.alpha = 1 - k * 0.8;
      }
      if (a.t >= 0.6) a.done();
    }
    if (this.message) {
      this.message.t -= dt;
      if (this.message.t <= 0) {
        this.message = null;
        if (!this.anim && !this.summary) this.refresh();
      }
    }
    if (this.slip) {
      this.slip.t += dt;
      const n = this.slip.node;
      if (n && !n.destroyed && this.slip.t < 0.3) {
        const h = n.height;
        n.y = H - h - 20 + Math.round(Math.max(0, 1 - this.slip.t * 4) * (h + 24));
      }
      if (this.slip.t > 7) {
        this.slip = null;
        if (!this.anim) this.refresh();
      }
    }
  }

  onKey(e: KeyboardEvent): boolean {
    if (e.type !== 'keydown' || this.g.modals.length) return false;
    const k = e.key.toLowerCase();
    const run = readRun();
    if (!run) return false;
    if (k === 'escape' || k === 'backspace') {
      if (this.summary) {
        this.summary = false;
        this.summaryDismissed = true;
        this.refresh();
      } else this.toHub();
      return true;
    }
    if (this.summary) {
      if (k === 'enter' || k === ' ') this.toHub();
      return true;
    }
    if (k === 'i' || k === ' ') this.toggleInspect();
    else if (k === 'r') this.openRulebook(run, this.currentDoc(run));
    else if (k === 'q') this.ask(run);
    else if (k === 'a') this.stamp('approve');
    else if (k === 'd') this.stamp('deny');
    else if (k === 'e') this.stamp('escalate');
    else if (k === 'b') this.stamp('bury');
    else if (k === 'arrowdown' || k === 'j' || k === 'arrowup' || k === 'k') {
      const docs = run.desk?.docs ?? [];
      const idx = docs.findIndex((x) => x.id === this.selectedId);
      const n = docs[(idx + (k === 'arrowup' || k === 'k' ? -1 : 1) + docs.length) % docs.length];
      if (n) this.selectDoc(n.id);
    } else return false;
    return true;
  }
}

function docsDone(run: SeqRun): number {
  return run.desk?.docs.filter((d) => d.status === 'done').length ?? 0;
}

function keyFor(v: SeqVerdict): string {
  return v === 'approve' ? 'A' : v === 'deny' ? 'D' : v === 'escalate' ? 'E' : 'B';
}
