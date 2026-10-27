/**
 * CAGE BOSS II: THE DESK.
 *
 * Every week, before the cage opens, the commission wants its paper. This is a
 * sequel-sized take on the first game's inspection desk: the same lamp, the same
 * red string, the same stamps, but the rules arrive one at a time across the
 * forty-week season and the people on the other side of the desk have learned
 * to lie in new ways.
 *
 * The simulation is deliberately plain data. The UI reads a SeqDeskState,
 * registers fields with an Inspector, and calls compareFields()/resolveDoc().
 * No renderer, no DOM, no Pixi.
 */
import { Rng, hashString } from '../core/rng';
import { content } from '../core/content';
import { fmtDate } from '../core/time';
import { clamp, money } from '../core/format';
import { VENUES } from './data';
import type { Fighter } from '../core/types';
import {
  type SeqDeskCitation,
  type SeqDeskDoc,
  type SeqDeskDocType,
  type SeqDeskField,
  type SeqDeskLink,
  type SeqDeskState,
  type SeqDeskTarget,
  type SeqDeskVisitor,
  type SeqFighter,
  type SeqRun,
  type SeqVerdict,
} from './types';

// ---------------------------------------------------------------- the rulebook

export interface SeqDeskRule {
  id: SeqDeskDocType;
  page: string;
  name: string;
  week: number;
  text: string;
}

/**
 * The week a rule becomes real. The desk only generates paper whose rule is in
 * force, so week one is one clean agreement and one very obvious purse. By week
 * nine the whole machine is running.
 */
export const SEQ_DESK_RULES: SeqDeskRule[] = [
  {
    id: 'bout', page: 'BOUTS', name: 'The purse is the purse', week: 1,
    text: 'Every bout agreement must match the purse filed with the commission. A number written twice is still two numbers, and one of them is a lie.',
  },
  {
    id: 'medical', page: 'MEDICALS', name: 'A licensed body', week: 2,
    text: 'A fighter needs a current medical clearance, a licensed physician and the required scans. The commission doesn\'t accept "he looked fine at the gym".',
  },
  {
    id: 'permit', page: 'VENUES', name: 'The room is licensed', week: 3,
    text: 'The venue permit must name the room, the night and the capacity. A room that holds more people than the permit says is a room with a headline and a lawsuit.',
  },
  {
    id: 'sponsor', page: 'MONEY', name: 'Clean money only', week: 4,
    text: 'Sponsor riders must match the signed rate and the approved category. Betting, crypto, adult and CBD money is barred by the broadcast deal, no matter how friendly the rep is.',
  },
  {
    id: 'cage', page: 'THE CAGE', name: 'Ninety days of safety', week: 5,
    text: 'The cage must be inspected within ninety days by a certified inspector. Pads, bolts and the door are part of the cage. The commission counts all of them.',
  },
  {
    id: 'press', page: 'MEDIA', name: 'A lanyard isn\'t a person', week: 6,
    text: 'Press credentials are issued to a named person at an approved outlet. If the name, the outlet or the credential doesn\'t line up, somebody is selling a seat at your show.',
  },
  {
    id: 'weighin', page: 'WEIGH-INS', name: 'The scale is the law', week: 7,
    text: 'The scale must be certified and the fighter must make the division limit with one pound of grace. A missed weight is a catchweight, a fine, or a cancelled bout. It isn\'t a suggestion.',
  },
  {
    id: 'expense', page: 'EXPENSES', name: 'A receipt for everything', week: 8,
    text: 'Every line on an expense claim needs a receipt and a permitted category. A jet ski isn\'t medical equipment no matter which column you write it in.',
  },
  {
    id: 'memo', page: 'MEMOS', name: 'Read the room', week: 9,
    text: 'Internal memos have no fields to compare. They have a directive and a consequence. File the ones that keep the lights on. Ignore the ones that ask you to shred a tax file.',
  },
  {
    id: 'zenith', page: 'ZENITH', name: 'Matching rights', week: 28,
    text: 'Any Zenith correspondence mentioning matching rights must be refused. If the promotion is ever sold, Zenith can match the offer and buy it back for the same price. There\'s no version of this clause that\'s good for you.',
  },
];

export function seqRules(week: number): SeqDeskRule[] {
  return SEQ_DESK_RULES.filter((r) => r.week <= week);
}

export function newSeqRules(week: number): SeqDeskRule[] {
  return SEQ_DESK_RULES.filter((r) => r.week === week);
}

export function ruleForType(type: SeqDeskDocType): SeqDeskRule | undefined {
  return SEQ_DESK_RULES.find((r) => r.id === type);
}

/** Paper that can show up in a given week. */
export function unlockedDocTypes(week: number): SeqDeskDocType[] {
  return SEQ_DESK_RULES.filter((r) => r.week <= week && r.id !== 'zenith').map((r) => r.id);
}

// ---------------------------------------------------------------- state

export function emptyDesk(week: number): SeqDeskState {
  return {
    week,
    docs: [],
    done: false,
    perfect: false,
    delegated: false,
    processed: 0,
    correct: 0,
    catches: 0,
    misses: 0,
    wrong: 0,
    cites: 0,
    fines: 0,
    bribes: 0,
    buried: 0,
    escalated: 0,
    lastCitation: null,
    citations: [],
    log: [],
  };
}

export function pendingDocs(state: SeqDeskState): SeqDeskDoc[] {
  return state.docs.filter((d) => d.status === 'pending');
}

export function pendingCount(run: SeqRun): number {
  return run.desk ? pendingDocs(run.desk).length : 0;
}

export function deskCleared(run: SeqRun): boolean {
  return !run.desk || run.desk.done || pendingDocs(run.desk).length === 0;
}

export function currentDeskDoc(run: SeqRun): SeqDeskDoc | null {
  if (!run.desk) return null;
  return pendingDocs(run.desk)[0] ?? run.desk.docs[run.desk.docs.length - 1] ?? null;
}

export function deskDoc(run: SeqRun, id: string): SeqDeskDoc | undefined {
  return run.desk?.docs.find((d) => d.id === id);
}

/**
 * Build the week's paperwork if it is missing, or if the calendar has moved.
 * Returns true when new paper was printed.
 */
export function ensureDesk(run: SeqRun): boolean {
  if (run.status !== 'plan') return false;
  if (run.desk && run.desk.week === run.week && run.desk.docs.length) return false;
  run.desk = buildDesk(run);
  // Whatever you buried in the wall is somebody's evidence now.
  const risk = Number(run.flags.buried_risk ?? 0);
  if (risk > 0 && rngFor(run, 0x9e3779b9).chance(0.3)) {
    run.flags.buried_risk = risk - 1;
    run.heat = clamp(run.heat + 5, 0, 100);
    const cit: SeqDeskCitation = {
      week: run.week,
      docId: '',
      title: 'DISCOVERY REQUEST',
      reason: 'A document you buried has turned up in a commission discovery request. Nobody remembers who put it in the wall. Everybody remembers who was president.',
      fine: 0,
      warning: true,
    };
    run.desk.citations.push(cit);
    run.desk.lastCitation = cit;
    run.desk.cites++;
    run.desk.log.unshift(cit.reason);
    run.stats.deskCites++;
  }
  return true;
}

function rngFor(run: SeqRun, salt: number): Rng {
  return Rng.fromSeed((run.seed ^ (run.week * 0x45d9f3b) ^ salt) >>> 0);
}

// ---------------------------------------------------------------- generation

interface PairOpts {
  key?: string;
  targetLabel?: string;
  where?: 'file' | 'rule' | 'card';
  note?: string;
  kind?: SeqDeskField['kind'];
}

class Paper {
  fields: SeqDeskField[] = [];
  targets: SeqDeskTarget[] = [];
  links: SeqDeskLink[] = [];
  private used = new Set<string>();

  private key(label: string, key?: string): string {
    const base = key ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    let k = base || 'field';
    let n = 2;
    while (this.used.has(k)) k = base + '_' + n++;
    this.used.add(k);
    return k;
  }

  /** A field on the paper and the record it must match. */
  pair(label: string, truth: string, bad: string, opts: PairOpts = {}): void {
    const k = this.key(label, opts.key);
    const targetKey = (opts.where === 'rule' ? 'rule.' : 'file.') + k;
    this.fields.push({ key: 'doc.' + k, label, value: truth, kind: opts.kind });
    this.targets.push({ key: targetKey, label: opts.targetLabel ?? label, value: truth, where: opts.where ?? 'file' });
    this.links.push({
      docKey: 'doc.' + k,
      targetKey,
      label,
      note: opts.note ?? 'The paper says {doc}. The record says {target}.',
      bad,
    });
  }

  /** Flavour that is not compared to anything. */
  plain(label: string, value: string, kind?: SeqDeskField['kind']): void {
    const k = this.key(label);
    this.fields.push({ key: 'doc.' + k, label, value, kind });
  }

  extraRule(key: string, label: string, value: string): void {
    this.targets.push({ key: 'rule.' + key, label, value, where: 'rule' });
  }
}

function fieldValue(doc: SeqDeskDoc, key: string): string {
  return doc.fields.find((f) => f.key === key)?.value ?? '';
}

function targetValue(doc: SeqDeskDoc, key: string): string {
  return doc.targets.find((t) => t.key === key)?.value ?? '';
}

function setField(doc: SeqDeskDoc, key: string, value: string): void {
  const f = doc.fields.find((x) => x.key === key);
  if (f) f.value = value;
}

function norm(v: string): string {
  return v.trim().replace(/\s+/g, ' ').toUpperCase();
}

function valuesMatch(a: string, b: string): boolean {
  return norm(a) === norm(b);
}

export function flagKey(link: SeqDeskLink): string {
  return link.docKey + '~' + link.targetKey;
}

export function mismatchText(doc: SeqDeskDoc, link: SeqDeskLink): string {
  return link.note
    .replace('{doc}', fieldValue(doc, link.docKey))
    .replace('{target}', targetValue(doc, link.targetKey));
}

/** Every comparison on this paper that does not line up, found or not. */
export function docMismatches(doc: SeqDeskDoc): SeqDeskLink[] {
  return doc.links.filter((l) => {
    const d = fieldValue(doc, l.docKey);
    const t = targetValue(doc, l.targetKey);
    return !!d && !!t && !valuesMatch(d, t);
  });
}

export function docInvalid(doc: SeqDeskDoc): boolean {
  return docMismatches(doc).length > 0;
}

export function desiredVerdict(doc: SeqDeskDoc): SeqVerdict {
  if (doc.type === 'memo' || doc.type === 'zenith') return doc.desired;
  return docInvalid(doc) ? 'deny' : 'approve';
}

function cleanLinks(doc: SeqDeskDoc): void {
  for (const link of doc.links) {
    const truth = targetValue(doc, link.targetKey);
    if (truth) setField(doc, link.docKey, truth);
  }
}

function tamper(doc: SeqDeskDoc, rng: Rng, labelHint?: string): boolean {
  const candidates = doc.links.filter((l) => {
    const truth = targetValue(doc, l.targetKey);
    return !!l.bad && !!truth && !valuesMatch(l.bad, truth);
  });
  if (!candidates.length) return false;
  const preferred = labelHint ? candidates.filter((l) => l.label.toUpperCase().includes(labelHint.toUpperCase())) : [];
  const pool = preferred.length ? preferred : candidates;
  const chosen = rng.pick(pool);
  setField(doc, chosen.docKey, chosen.bad);
  // A second problem, once the season has teeth.
  if (doc.week >= 18 && rng.chance(0.22)) {
    const second = candidates.filter((l) => l.docKey !== chosen.docKey);
    if (second.length) setField(doc, rng.pick(second).docKey, rng.pick(second).bad);
  }
  return true;
}

interface Draft {
  type: SeqDeskDocType;
  title: string;
  subject: string;
  subtitle: string;
  visitor: SeqDeskVisitor;
  line: string;
  askClean: string;
  askExcuse: string;
  askFix: string;
  askBribe: string;
  body?: string;
  desired?: SeqVerdict;
  meta?: Record<string, string | number | boolean>;
  paper: Paper;
}

function finishDraft(run: SeqRun, draft: Draft, rng: Rng, index: number, dirty: boolean, hint?: string): SeqDeskDoc {
  const seed = (run.seed ^ (run.week * 2654435761) ^ (index * 40503)) >>> 0;
  const doc: SeqDeskDoc = {
    id: 'desk_' + run.week + '_' + index + '_' + seed.toString(36),
    type: draft.type,
    title: draft.title,
    subject: draft.subject,
    subtitle: draft.subtitle,
    week: run.week,
    seed,
    fields: draft.paper.fields,
    targets: draft.paper.targets,
    links: draft.paper.links,
    visitor: draft.visitor,
    line: draft.line,
    askClean: draft.askClean,
    askExcuse: draft.askExcuse,
    askFix: draft.askFix,
    askBribe: draft.askBribe,
    bribe: Math.round((rng.int(500, 2600) + run.week * 35) / 50) * 50,
    fixCost: rng.int(100, 500),
    desired: draft.desired ?? 'approve',
    status: 'pending',
    verdict: null,
    correct: null,
    result: '',
    flagged: [],
    asked: 0,
    citation: null,
    meta: { body: draft.body ?? '', ...draft.meta },
  };
  cleanLinks(doc);
  if (dirty) tamper(doc, rng, hint);
  return doc;
}

function fighterName(f: Fighter): string {
  return `${f.first} ${f.last}`;
}

function pickRoster(run: SeqRun, rng: Rng): SeqFighter {
  return rng.pick(run.roster);
}

function pickOpponent(run: SeqRun, rng: Rng, notId?: string): Fighter {
  const pool = run.freeAgents.filter((f) => f.id !== notId);
  return rng.pick(pool.length ? pool : run.freeAgents);
}

function managerFor(run: SeqRun, rng: Rng, f?: Fighter): { id: string; name: string } {
  const managers = content().managers;
  const byId = f ? managers.find((m) => m.id === f.manager) : undefined;
  const m = byId ?? (managers.length ? rng.pick(managers) : { id: 'manager', name: 'A man with a folder' });
  return { id: m.id, name: m.name };
}

function fighterVisitor(f: Fighter): SeqDeskVisitor {
  return { kind: 'fighter', name: fighterName(f), role: 'Fighter', seed: f.id, fighterId: f.id };
}

function managerVisitor(m: { id: string; name: string }): SeqDeskVisitor {
  return { kind: 'manager', name: m.name, role: 'Manager', seed: m.id };
}

function officialName(rng: Rng): string {
  const officials = content().officials;
  if (officials.length) {
    const o = rng.pick(officials);
    return o.name;
  }
  return rng.pick(['T. Vance', 'R. Doyle', 'M. Kwan', 'S. Petty']);
}

function outletName(id: string): string {
  const o = content().outlets.find((x) => x.id === id);
  return o?.name ?? id;
}

function divisionOf(f: Fighter): { id: string; name: string; limit: number } {
  const d = content().divisions.find((x) => x.id === f.division);
  return { id: f.division, name: d?.name ?? f.division, limit: d?.limit ?? 155 };
}

function currentVenueFor(run: SeqRun) {
  return VENUES[run.venue] ?? VENUES[0];
}

// ---------------------------------------------------------------- individual papers

function buildBout(run: SeqRun, rng: Rng): Draft {
  const a = pickRoster(run, rng);
  const opp = pickOpponent(run, rng, a.f.id);
  const other = pickOpponent(run, rng, opp.id);
  const v = currentVenueFor(run);
  const otherV = rng.pick(VENUES.filter((x) => x.id !== v.id)) ?? v;
  const licence = 'FIG-' + String(10000 + (hashString(a.f.id) % 89999));
  const paper = new Paper();
  paper.pair('BOUT', `${a.f.last} vs ${opp.last}`, `${a.f.last} vs ${other.last}`, {
    targetLabel: 'Bout on file',
    note: 'The agreement is for {doc}. The commission has {target} on file.',
  });
  paper.pair('PURSE', money(a.purse), money(a.purse * (run.week === 1 ? 10 : 2)), {
    targetLabel: 'Purse on file',
    note: 'The contract asks for {doc}. The commission filed {target}. Somebody added a zero and hoped you wouldn\'t count.',
  });
  paper.pair('DATE', fmtDate(run.week), fmtDate(run.week + 1), {
    targetLabel: 'Fight night',
    note: 'The paper is dated {doc}. The commission licensed {target}.',
  });
  paper.pair('VENUE', v.name, otherV.name, {
    targetLabel: 'Licensed room',
    note: 'The bout is written for {doc}. The permit is for {target}.',
  });
  paper.pair('LICENCE', licence, 'FIG-EXPIRED', {
    where: 'rule',
    targetLabel: 'Licence status',
    note: 'The agreement lists licence {doc}. The registry shows {target}.',
  });
  paper.plain('SIGNATURE', 'sig:' + a.f.id, 'sig');
  const m = managerFor(run, rng, a.f);
  const visitor = rng.chance(0.55) ? fighterVisitor(a.f) : managerVisitor(m);
  return {
    type: 'bout', title: 'BOUT AGREEMENT', subject: fighterName(a.f), subtitle: `${v.name}  /  ${fmtDate(run.week)}`,
    visitor,
    line: rng.pick([
      '"I don\'t read the contracts. I read the cheques."',
      '"That\'s my name and that\'s my money. Mostly the money."',
      '"My manager says this is standard. My manager also sells timeshares."',
      '"Just stamp it. I have a weight cut and a court date."',
    ]),
    askClean: '"It\'s all there. I paid a man to make sure it\'s all there."',
    askExcuse: '"That number? That\'s the number after tax. Or before tax. One of the taxes."',
    askFix: '"Fine. I have the right page in the car. It\'ll cost you a coffee and a filing fee."',
    askBribe: '"You look like a man who understands that paperwork is a mood. There\'s an envelope in this for both of us."',
    meta: { fighterId: a.f.id },
    paper,
  };
}

function buildMedical(run: SeqRun, rng: Rng): Draft {
  const a = pickRoster(run, rng);
  const docs = content().docs.doctors;
  const real = docs.filter((d) => d.real);
  const fake = docs.filter((d) => !d.real);
  const doctor = rng.pick(real.length ? real : docs);
  const badDoc = rng.pick(fake.length ? fake : docs);
  const scans = content().docs.scans;
  const required = rng.sample(scans.length ? scans : ['Blood Panel', 'MRI'], Math.min(2, Math.max(1, scans.length)));
  const expiry = fmtDate(run.week + rng.int(2, 9));
  const expired = fmtDate(run.week - rng.int(1, 5));
  const paper = new Paper();
  paper.pair('STATUS', 'CLEARED FOR COMPETITION', 'NOT CLEARED', {
    targetLabel: 'Commission status',
    note: 'The form says {doc}. The commission has {target}.',
  });
  paper.pair('EXAM EXPIRES', expiry, expired, {
    targetLabel: 'Clearance valid to',
    note: 'The clearance runs to {doc}. The commission calendar says {target}.',
  });
  paper.pair('DOCTOR', doctor?.name ?? 'Dr. Ruth Calloway', badDoc?.name ?? 'Dr. Steve (Online Certificate)', {
    targetLabel: 'Physician of record',
    note: 'The form is signed by {doc}. The physician registry lists {target}.',
  });
  paper.pair('LICENCE', doctor?.license ?? 'MD-48213', badDoc?.license ?? 'WEB-3321', {
    where: 'rule',
    targetLabel: 'Licence on registry',
    note: 'The signature carries licence {doc}. The registry says {target}.',
  });
  paper.pair('SCANS', required.join(' + '), required[0], {
    where: 'rule',
    targetLabel: 'Required scans',
    note: 'The file includes {doc}. The commission requires {target}.',
  });
  paper.plain('NOTES', 'Fighter understands the risk. Fighter has seen the risk. Fighter has fought the risk.', 'text');
  const m = managerFor(run, rng, a.f);
  return {
    type: 'medical', title: 'MEDICAL CLEARANCE', subject: fighterName(a.f), subtitle: `Exam week ${run.week}  /  ${a.f.division.toUpperCase()}`,
    visitor: rng.chance(0.7) ? fighterVisitor(a.f) : managerVisitor(m),
    line: rng.pick([
      '"I can fight. I have fought with worse. I have fought with a broken ankle and a bad divorce."',
      '"The doctor said I\'m fine. He said it while looking at his phone, but he said it."',
      '"This is the paper that says I\'m allowed to get hit. It\'s very important to the state."',
    ]),
    askClean: '"That\'s a real doctor. He has a real licence. It\'s in a frame."',
    askExcuse: '"The date is a rounding error. Bodies don\'t expire on a Tuesday."',
    askFix: '"The right scan is at the clinic. I can get it faxed if the fax machine still exists."',
    askBribe: '"The doctor is flexible. The commission is flexible. Everybody is flexible for a price."',
    meta: { fighterId: a.f.id },
    paper,
  };
}

function buildPermit(run: SeqRun, rng: Rng): Draft {
  const v = currentVenueFor(run);
  const other = rng.pick(VENUES.filter((x) => x.id !== v.id)) ?? v;
  const permitNo = 'MOA-' + String(1000 + (hashString(v.id + run.week) % 8999));
  const paper = new Paper();
  paper.pair('VENUE', v.name, other.name, {
    targetLabel: 'Venue on file',
    note: 'The permit names {doc}. The commission has {target} on file for this week.',
  });
  paper.pair('DATE', fmtDate(run.week), fmtDate(run.week + 1), {
    targetLabel: 'Licensed night',
    note: 'The permit is for {doc}. The show is licensed for {target}.',
  });
  paper.pair('CAPACITY', String(v.capacity), String(Math.round(v.capacity * 1.3)), {
    targetLabel: 'Licensed capacity',
    note: 'The permit allows {doc} people. The fire marshal counted {target} chairs.',
  });
  paper.pair('FIRE CODE', 'PASS', 'FAIL', {
    where: 'rule',
    targetLabel: 'Fire inspection',
    note: 'The sheet says {doc}. The fire inspection result is {target}.',
  });
  paper.pair('PERMIT NO', permitNo, 'MOA-EXPIRED', {
    targetLabel: 'Permit number',
    note: 'The permit number is {doc}. The registry shows {target}.',
  });
  paper.plain('INSPECTOR', officialName(rng), 'text');
  return {
    type: 'permit', title: 'VENUE PERMIT', subject: v.name, subtitle: `Week ${run.week}  /  ${v.capacity} seats`,
    visitor: { kind: 'cop', name: 'Inspector ' + officialName(rng).split(' ').pop(), role: 'City licensing', seed: 'permit_' + run.week },
    line: rng.pick([
      '"I\'m not here to shut you down. I\'m here to make sure the shutting down is legal."',
      '"The room is either licensed or it\'s a very loud crime scene."',
      '"You would be surprised how many promoters think a fire exit is a suggestion."',
    ]),
    askClean: '"Everything is in order. I checked it twice. I\'m as disappointed as you are."',
    askExcuse: '"The capacity is a suggestion. The fire code is a suggestion with lawyers."',
    askFix: '"I can amend the permit. It takes a form, a fee and a signature that isn\'t yours."',
    askBribe: '"There\'s a version of this permit that\'s much easier to read. It\'s also much more expensive."',
    paper,
  };
}

function buildSponsor(run: SeqRun, rng: Rng): Draft {
  const banned = new Set(['betting', 'crypto', 'adult', 'cbd']);
  const sponsors = content().sponsors;
  const clean = sponsors.filter((s) => !banned.has(s.category));
  const dirty = sponsors.filter((s) => banned.has(s.category));
  const sp = rng.pick(clean.length ? clean : sponsors);
  const badSp = rng.pick(dirty.length ? dirty : sponsors);
  const other = rng.pick(sponsors.filter((s) => s.id !== sp.id)) ?? sp;
  const payout = sp.weekly;
  const paper = new Paper();
  paper.pair('SPONSOR', sp.name, other.name, {
    targetLabel: 'Signed sponsor',
    note: 'The rider is from {doc}. The signed sheet is with {target}.',
  });
  paper.pair('CATEGORY', sp.category.toUpperCase(), (badSp.category === sp.category ? 'ADULT' : badSp.category).toUpperCase(), {
    targetLabel: 'Approved category',
    note: 'The rider is filed under {doc}. The broadcast deal permits {target}.',
  });
  paper.pair('PAYOUT', money(payout), money(payout * 3), {
    targetLabel: 'Rate on file',
    note: 'The rider promises {doc} a week. The signed rate is {target}.',
  });
  paper.pair('TERM', '4 WEEKS', '52 WEEKS', {
    targetLabel: 'Term on file',
    note: 'The rider runs for {doc}. The signed term is {target}.',
  });
  paper.extraRule('banned', 'Barred categories', 'BETTING / CRYPTO / ADULT / CBD');
  const m = managerFor(run, rng);
  return {
    type: 'sponsor', title: 'SPONSORSHIP RIDER', subject: sp.name, subtitle: `${sp.category.toUpperCase()}  /  ${fmtDate(run.week)}`,
    visitor: { kind: 'exec', name: 'A rep from ' + sp.name, role: 'Sponsorship', seed: sp.id },
    line: rng.pick([
      '"We love what you\'re doing with the warehouse. It\'s very authentic. Authentic sells."',
      '"This isn\'t a bribe. It\'s a partnership with a very flexible moral column."',
      '"Your crowd is exactly the demographic we can\'t legally advertise to."',
    ]),
    askClean: '"It\'s all standard. Four weeks, approved category, money in the account before the cage goes up."',
    askExcuse: '"The category is a courtesy label. Money doesn\'t have a category."',
    askFix: '"I can rewrite the rider. The number gets smaller, but the category gets cleaner."',
    askBribe: '"There\'s a version of this deal where the paperwork is clean and the money is even cleaner."',
    meta: { payout, sponsor: sp.id, manager: m.id },
    paper,
  };
}

function buildCage(run: SeqRun, rng: Rng): Draft {
  const cage = 'CAGE-' + String(10 + (hashString('cage' + run.seed) % 89));
  const inspected = fmtDate(run.week - rng.int(1, 75));
  const expired = fmtDate(run.week - rng.int(110, 200));
  const inspector = officialName(rng);
  const paper = new Paper();
  paper.pair('CAGE', cage, 'CAGE-' + String(90 + (hashString('other' + run.seed) % 9)), {
    targetLabel: 'Cage on record',
    note: 'The certificate is for {doc}. The commission has {target} on file.',
  });
  paper.pair('LAST INSPECTED', inspected, expired, {
    targetLabel: 'Inspection window',
    note: 'The cage was inspected on {doc}. The ninety-day window closed on {target}.',
  });
  paper.pair('INSPECTOR', inspector, 'SELF-INSPECTED', {
    where: 'rule',
    targetLabel: 'Certified inspector',
    note: 'The certificate is signed by {doc}. The registry lists {target}.',
  });
  paper.pair('PADS', 'INTACT', 'WORN THROUGH', {
    targetLabel: 'Pad condition',
    note: 'The certificate says {doc}. The inspector noted {target}.',
  });
  paper.pair('BOLTS', '8 / 8', '6 / 8', {
    targetLabel: 'Bolts checked',
    note: 'The sheet records {doc} bolts. The actual count is {target}.',
  });
  return {
    type: 'cage', title: 'CAGE INSPECTION', subject: cage, subtitle: `${currentVenueFor(run).name}  /  ${fmtDate(run.week)}`,
    visitor: { kind: 'cop', name: inspector, role: 'Cage inspector', seed: 'cage_' + run.seed },
    line: rng.pick([
      '"I have inspected a lot of cages. This one has a personality."',
      '"The bolts are the important part. The fighters are the replaceable part."',
      '"I can pass it today. I can\'t pass it if somebody dies in it tomorrow."',
    ]),
    askClean: '"Cage is tight. Pads are new. Bolts are bolts. Don\'t make me regret this."',
    askExcuse: '"Ninety days is a guideline. The cage doesn\'t know what month it is."',
    askFix: '"I can reinspect it. It\'ll cost you the emergency fee and a coffee that isn\'t from a machine."',
    askBribe: '"There\'s an inspection certificate in my bag with today\'s date on it. It\'s very light."',
    paper,
  };
}

function buildPress(run: SeqRun, rng: Rng): Draft {
  const reporters = content().reporters;
  const rep = rng.pick(reporters);
  const other = rng.pick(reporters.filter((r) => r.id !== rep.id));
  const outlet = outletName(rep.outlet);
  const otherOutlet = outletName(other.outlet);
  const paper = new Paper();
  paper.pair('NAME', rep.name, other.name, {
    targetLabel: 'Name on application',
    note: 'The credential is for {doc}. The application came from {target}.',
  });
  paper.pair('OUTLET', outlet, otherOutlet, {
    targetLabel: 'Approved outlet',
    note: 'The lanyard says {doc}. The approved outlet list says {target}.',
  });
  paper.pair('CREDENTIAL', 'SEASON', 'ONE DAY', {
    targetLabel: 'Credential issued',
    note: 'The application asks for {doc}. The commission issued {target}.',
  });
  paper.pair('ROLE', 'REPORTER', 'PHOTOGRAPHER', {
    targetLabel: 'Role approved',
    note: 'The form says {doc}. The outlet approved {target}.',
  });
  paper.plain('NOTE', 'Applicant has agreed to not ask about the tiger.', 'text');
  return {
    type: 'press', title: 'PRESS CREDENTIAL', subject: rep.name, subtitle: `${outlet}  /  ${fmtDate(run.week)}`,
    visitor: { kind: 'reporter', name: rep.name, role: outlet, seed: rep.id, reporterId: rep.id },
    line: rep.catchphrase ? `"${rep.catchphrase}"` : '"I\'m here for the access. The story is whatever happens to the access."',
    askClean: '"The name, the outlet and the lanyard all agree. It\'s a miracle of modern administration."',
    askExcuse: '"The outlet changed its name. Or I changed my name. One of us changed something."',
    askFix: '"I can get the right letter from the outlet. They owe me a favour and a parking ticket."',
    askBribe: '"You could use a friendly face in the room. I could use a lanyard that doesn\'t say ONE DAY."',
    paper,
  };
}

function buildWeighin(run: SeqRun, rng: Rng): Draft {
  const a = pickRoster(run, rng);
  const div = divisionOf(a.f);
  const otherDiv = rng.pick(content().divisions.filter((d) => d.id !== div.id)) ?? content().divisions[0];
  const official = officialName(rng);
  const over = div.limit + rng.int(2, 7);
  const paper = new Paper();
  paper.pair('NAME', fighterName(a.f), fighterName(rng.pick(run.roster.filter((x) => x.f.id !== a.f.id))?.f ?? a.f), {
    targetLabel: 'Fighter on scale',
    note: 'The slip is for {doc}. The scale was booked for {target}.',
  });
  paper.pair('WEIGHT', `${div.limit}.0 lb`, `${over}.5 lb`, {
    where: 'rule',
    targetLabel: 'Division limit',
    note: 'The fighter weighed {doc}. The division limit is {target}.',
  });
  paper.pair('DIVISION', div.name, otherDiv?.name ?? div.name, {
    targetLabel: 'Contracted division',
    note: 'The slip is filed at {doc}. The bout is contracted at {target}.',
  });
  paper.pair('SCALE', 'CERTIFIED', 'UNCERTIFIED', {
    where: 'rule',
    targetLabel: 'Scale certification',
    note: 'The scale is marked {doc}. The state registry says {target}.',
  });
  paper.pair('OFFICIAL', official, 'SOME GUY WITH A CLIPBOARD', {
    targetLabel: 'Commission official',
    note: 'The slip is signed by {doc}. The commission official is {target}.',
  });
  return {
    type: 'weighin', title: 'WEIGH-IN SLIP', subject: fighterName(a.f), subtitle: `${div.name}  /  ${fmtDate(run.week)}`,
    visitor: fighterVisitor(a.f),
    line: rng.pick([
      '"I made the weight. I made it this morning. I haven\'t eaten since."',
      '"The scale is wrong. The scale has always been wrong. The scale is a Zenith plant."',
      '"I can fight at this weight. I can\'t promise I\'ll be conscious."',
    ]),
    askClean: '"I made the weight. My body hates me, but I made the weight."',
    askExcuse: '"A pound is a rounding error. A pizza is a rounding error. We\'re all rounding errors."',
    askFix: '"Give me an hour and a sauna. I can lose it. I can\'t promise I\'ll enjoy it."',
    askBribe: '"The official is a friend. The scale is a machine. Machines can be friends."',
    meta: { fighterId: a.f.id },
    paper,
  };
}

function buildExpense(run: SeqRun, rng: Rng): Draft {
  const bank = content().docs.expenseItems;
  const picks = rng.sample(bank, Math.min(3, bank.length));
  const items = picks.map((x) => ({ item: x.item, amount: Math.round(rng.float(x.low, x.high) / 10) * 10, absurd: x.absurd }));
  const total = items.reduce((n, x) => n + x.amount, 0);
  const category = rng.pick(['MEDICAL', 'TRAVEL', 'EQUIPMENT']);
  const line = (it: { item: string; amount: number } | undefined) => (it ? `${it.item} - ${money(it.amount)}` : 'No item');
  const other = bank.find((x) => x.item !== (items[1]?.item ?? '')) ?? bank[0];
  const badLine = other ? `${other.item} - ${money(items[1]?.amount ?? 0)}` : line(items[1]);
  const paper = new Paper();
  paper.plain('ITEM 1', line(items[0]));
  paper.pair('ITEM 2', line(items[1]), badLine, {
    targetLabel: 'Receipt for line 2',
    note: 'Line two says {doc}. The receipt stapled to it says {target}.',
  });
  if (items[2]) paper.plain('ITEM 3', line(items[2]));
  paper.pair('TOTAL', money(total), money(total + rng.int(300, 2400)), {
    targetLabel: 'Receipt total',
    note: 'The claim totals {doc}. The receipts total {target}.',
  });
  paper.pair('CATEGORY', category, 'LUXURY', {
    where: 'rule',
    targetLabel: 'Allowed category',
    note: 'The claim is filed as {doc}. The expense policy allows {target}.',
  });
  const m = managerFor(run, rng, run.roster.length ? rng.pick(run.roster).f : undefined);
  return {
    type: 'expense', title: 'EXPENSE CLAIM', subject: m.name, subtitle: `Week ${run.week} - ${items.length} lines`,
    visitor: managerVisitor(m),
    line: rng.pick([
      '"It\'s all team-building. The jet ski is for cardio. The python is for morale."',
      '"I have receipts. Some of them are from this year."',
      '"You said spend what it takes. I wrote that down. I wrote it on a napkin."',
    ]),
    askClean: '"Every line has a receipt. The python has a receipt. The python is very organized."',
    askExcuse: '"The total includes tax, tip and a small fee for the guy who adds the tax and tip."',
    askFix: '"I can lose the jet ski. I can\'t lose the python. The python knows where I live."',
    askBribe: '"There\'s cash in the envelope. It\'s cleaner than the receipts."',
    meta: { total, manager: m.id, receipts: items.map((x) => `${x.item}: ${money(x.amount)}`).join('\n') },
    paper,
  };
}

interface MemoScenario {
  from: string;
  subject: string;
  directive: string;
  body: string;
  desired: SeqVerdict;
  approveCash?: number;
  approveHeat?: number;
  approveBuzz?: number;
  approveLocker?: number;
  denyCash?: number;
  denyHeat?: number;
  denyBuzz?: number;
  denyLocker?: number;
  approveText: string;
  denyText: string;
  line: string;
  ask: string;
}

const MEMO_SCENARIOS: MemoScenario[] = [
  {
    from: 'THE CITY OF [REDACTED]', subject: 'SANITATION INVOICE', directive: 'PAY THE INVOICE BEFORE FRIDAY.',
    body: 'The city found something in the loading-bay drain. It was alive. It has been removed. The invoice covers the removal, the containment and a press conference where nobody used the word "sewage".',
    desired: 'approve', approveCash: -1800, approveHeat: -1, approveText: 'PAID. The drain is legal again. The thing in the drain is somebody else\'s problem.',
    denyText: 'IGNORED. The city sends a second invoice with a photograph attached. The photograph is worse than the invoice.',
    denyHeat: 4, line: '"The city is very understanding. The city is also very expensive."',
    ask: 'The invoice is real. Paying it keeps the health inspector out of the building for a month.',
  },
  {
    from: 'HAROLD VOSS, LANDLORD', subject: 'LEASE RENEWAL', directive: 'SIGN THE RENEWAL. THE LANDLORD IS WAITING.',
    body: 'The warehouse is yours for another year at a number that has gone up because the neighbourhood has gone up because you\'re in it. Harold has drawn a small smiling face next to the late-fee clause.',
    desired: 'approve', approveCash: -2400, approveHeat: -1, approveText: 'SIGNED. The warehouse is yours for another year. Harold keeps the smiling face.',
    denyText: 'IGNORED. Harold puts a lock on the loading bay and a sign that says "AVAILABLE". The sign has a smiling face too.',
    denyHeat: 6, denyBuzz: -1, line: '"Harold is a reasonable man. Harold is also a man who owns the roof."',
    ask: 'The lease is real. Signing it costs money; ignoring it costs the building.',
  },
  {
    from: 'B. KRANE, BUSINESS AFFAIRS', subject: 'THE 2029 TAX FILE', directive: 'SHRED THIS FILE. NOBODY NEEDS TO SEE IT.',
    body: 'The file contains a schedule of payments that were made before you owned the company. Some of them were made to people who don\'t exist. The directive is typed in a font that suggests urgency and a lack of witnesses.',
    desired: 'deny', approveHeat: 7, approveCash: 0, approveText: 'SHREDDED. The file is gone. The feeling that somebody is going to ask about it isn\'t.',
    denyText: 'FILED. The tax file goes in the safe with the other things nobody needs to see. Somewhere, an accountant feels a chill.',
    denyHeat: -2, denyBuzz: 1, line: '"It\'s a housekeeping matter. The kind of housekeeping that keeps people out of prison."',
    ask: 'This isn\'t housekeeping. This is evidence. Denying the directive means filing it, not destroying it.',
  },
  {
    from: 'TALENT OPERATIONS', subject: 'THE RIVAL CASTOFF', directive: 'SIGN THE RIVAL CASTOFF. HE SELLS TICKETS.',
    body: 'Zenith released a former contender with a name people recognize and a knee people don\'t. He\'ll fight for cheap, sell shirts for a month and probably need a doctor by Christmas.',
    desired: 'approve', approveCash: -1200, approveBuzz: 3, approveText: 'SIGNED. The castoff gets a locker and a chance. The crowd gets a name they remember.',
    denyText: 'IGNORED. The castoff signs with a rival and calls you a coward on a podcast that same afternoon.',
    denyHeat: 1, line: '"He\'s damaged goods. Damaged goods with a following is still a following."',
    ask: 'The castoff is a real draw. He\'s also a real medical bill. The memo wants the draw.',
  },
  {
    from: 'THE COMMISSION', subject: 'INSURANCE AUDIT', directive: 'COOPERATE WITH THE AUDIT. OPEN THE BOOKS.',
    body: 'Two auditors want the ledgers, the medical files and an explanation of the phrase "miscellaneous violence" that appears eleven times in the expense column. The audit is voluntary. The audit is also happening.',
    desired: 'approve', approveCash: -800, approveHeat: -4, approveText: 'OPENED. The auditors find three problems, two of which are real. Heat drops. The books breathe.',
    denyText: 'REFUSED. The auditors leave. The commission opens a formal inquiry and asks for the same books with a lawyer attached.',
    denyHeat: 7, line: '"The commission isn\'t asking. The commission is being polite about not asking."',
    ask: 'Cooperate and it\'s a fee and a headache. Refuse and it\'s a headline and a lawyer.',
  },
];

function buildMemo(run: SeqRun, rng: Rng): Draft {
  const s = rng.pick(MEMO_SCENARIOS);
  const paper = new Paper();
  paper.plain('FROM', s.from);
  paper.plain('SUBJECT', s.subject);
  paper.plain('DIRECTIVE', s.directive);
  paper.plain('DEADLINE', fmtDate(run.week + 1));
  const m = managerFor(run, rng);
  return {
    type: 'memo', title: 'INTERNAL MEMO', subject: s.subject, subtitle: 'For the president\'s eyes only',
    visitor: managerVisitor(m),
    line: s.line,
    askClean: s.ask,
    askExcuse: '"The memo is asking, not telling. That\'s how you know it\'s serious."',
    askFix: '"I can make it go away. Some memos are easier to lose than others."',
    askBribe: '"There\'s a version of this memo that never existed. It\'s cheaper than the version that did."',
    body: s.body,
    desired: s.desired,
    meta: {
      body: s.body,
      approveCash: s.approveCash ?? 0, approveHeat: s.approveHeat ?? 0, approveBuzz: s.approveBuzz ?? 0, approveLocker: s.approveLocker ?? 0,
      approveText: s.approveText,
      denyCash: s.denyCash ?? 0, denyHeat: s.denyHeat ?? 0, denyBuzz: s.denyBuzz ?? 0, denyLocker: s.denyLocker ?? 0,
      denyText: s.denyText,
    },
    paper,
  };
}

function buildZenith(run: SeqRun, rng: Rng): Draft {
  const n = Number(run.flags.zenith_clauses ?? 0);
  const round = run.week >= 38 ? 3 : run.week >= 34 ? 2 : 1;
  const title = round === 3 ? 'FINAL OFFER  /  MATCHING RIGHTS' : round === 2 ? 'AMENDMENT TO THE PURCHASE AGREEMENT' : 'LETTER OF INTENT';
  const paper = new Paper();
  paper.plain('PARTY', 'ZENITH HOLDINGS');
  paper.pair('CLAUSE', '14(b) MATCHING RIGHTS  /  GRANTED', '14(b) MARKETING RIGHTS', {
    targetLabel: 'Clause on file',
    note: 'The letter says {doc}. The filed clause says {target}.',
  });
  paper.pair('TERM', '5 YEARS', '99 YEARS', {
    targetLabel: 'Term on file',
    note: 'The matching right runs for {doc}. The filed term is {target}.',
  });
  paper.pair('SIGNATORY', 'MARCUS VANE, ZENITH HOLDINGS', 'UNNAMED INTERN', {
    targetLabel: 'Authorised signatory',
    note: 'The letter is signed by {doc}. The commission file lists {target}.',
  });
  paper.pair('DEADLINE', fmtDate(run.week + 2), fmtDate(run.week - 1), {
    targetLabel: 'Deadline on file',
    note: 'The letter gives you until {doc}. The filed deadline was {target}.',
  });
  paper.extraRule('matching', 'Matching rights', 'REFUSE EVERY VERSION');
  const variant = round === 1
    ? 'A standard courtesy: if the promotion is ever sold, Zenith gets thirty days to match the offer. It isn\'t a purchase. It\'s an option to make every future purchase impossible.'
    : round === 2
      ? 'The amendment extends the matching right to "any transaction, including a sale of control, a merger, or a sale of substantially all assets." It also adds a small administrative fee. The fee isn\'t small.'
      : 'The final offer: sign the matching right, take a seat on the board and a cheque for $250,000. The cheque is real. So is the clause. The clause outlives the cheque.';
  const visitor: SeqDeskVisitor = {
    kind: round === 3 ? 'exec' : 'lawyer',
    name: round === 3 ? 'Marcus Vane' : 'A Zenith lawyer',
    role: 'Zenith Holdings',
    seed: 'zenith_' + round,
  };
  return {
    type: 'zenith', title, subject: 'ZENITH HOLDINGS', subtitle: `Received week ${run.week}  /  clause ${n + 1}`,
    visitor,
    line: round === 1
      ? '"Mister Vane wanted you to have this personally. He wanted you to know there\'s no hard feelings."'
      : round === 2
        ? '"The first letter was a courtesy. This one is the one the lawyers read."'
        : '"The offer expires when the ink dries. Mister Vane is very fond of deadlines."',
    askClean: '"It\'s a standard clause. Every company has one. Most companies don\'t have one pointed at them."',
    askExcuse: '"Matching rights are a formality. You\'ll never sell. You\'ll die in this warehouse, and the clause will die with you."',
    askFix: '"I can remove the word MATCHING. It becomes a marketing clause. Marketing clauses are harmless."',
    askBribe: '"There\'s a signing bonus for the president personally. It isn\'t in the letter. It\'s in the envelope."',
    body: variant,
    desired: 'deny',
    meta: { round },
    paper,
  };
}

function buildOne(run: SeqRun, type: SeqDeskDocType, rng: Rng, index: number): Draft {
  switch (type) {
    case 'bout': return buildBout(run, rng);
    case 'medical': return buildMedical(run, rng);
    case 'permit': return buildPermit(run, rng);
    case 'sponsor': return buildSponsor(run, rng);
    case 'cage': return buildCage(run, rng);
    case 'press': return buildPress(run, rng);
    case 'weighin': return buildWeighin(run, rng);
    case 'expense': return buildExpense(run, rng);
    case 'memo': return buildMemo(run, rng);
    case 'zenith': return buildZenith(run, rng);
  }
}

function buildDesk(run: SeqRun): SeqDeskState {
  const state = emptyDesk(run.week);
  const rng = new Rng((run.rng ^ (run.week * 0x9e3779b1) ^ 0x51ed270b) >>> 0);
  const count = run.week >= 28 ? 4 : run.week >= 10 ? 3 : 2;
  const unlocked = unlockedDocTypes(run.week);
  let types: SeqDeskDocType[] = [];
  if (run.week === 1) {
    types = ['bout', 'bout'];
  } else {
    const fresh = unlocked[unlocked.length - 1] ?? 'bout';
    types = [fresh];
    const rest = unlocked.filter((t) => t !== fresh);
    rng.shuffle(rest);
    for (const t of rest) {
      if (types.length >= count) break;
      if (!types.includes(t)) types.push(t);
    }
    while (types.length < count) types.push(rng.pick(unlocked));
    rng.shuffle(types);
  }
  // Zenith does not share the week with anything. It gets the top of the pile.
  const zenithWeek = run.week === 28 || run.week === 34 || run.week === 38;
  const zenith = zenithWeek && !run.flags['zenith_' + run.week];
  if (zenith) types[0] = 'zenith';
  const dirtyAt = run.week === 1 ? -1 : rng.int(0, Math.max(0, types.length - 1));
  types.forEach((type, i) => {
    const dirty = run.week === 1
      ? false
      : type === 'memo' ? false : type === 'zenith' ? rng.chance(0.35) : i === dirtyAt || rng.chance(run.week >= 20 ? 0.35 : 0.18);
    const draft = buildOne(run, type, rng, i);
    const hint = run.week === 1 && i === 1 ? 'PURSE' : undefined;
    const doc = finishDraft(run, draft, rng, i, dirty, hint);
    // A memo is a decision, not a test. It never carries a forged field.
    if (doc.type === 'memo') doc.links = [];
    state.docs.push(doc);
  });
  // Week one is the tutorial: the first agreement is clean, the second has a
  // purse with an extra zero. Nothing else is wrong on either of them.
  if (run.week === 1) {
    const target = state.docs[1] ?? state.docs[0];
    const purse = target.links.find((l) => l.label === 'PURSE');
    if (purse) setField(target, purse.docKey, purse.bad);
  }
  rng.shuffle(state.docs);
  if (run.week === 1) {
    // Keep the clean one first, the trap second.
    state.docs.sort((a, b) => (docInvalid(a) ? 1 : 0) - (docInvalid(b) ? 1 : 0));
  }
  run.rng = rng.state;
  return state;
}

// ---------------------------------------------------------------- inspection

export interface SeqCompareResult {
  relevant: boolean;
  mismatch: boolean;
  found: boolean;
  text: string;
}

/**
 * Compare a field on the paper with a value on record. This is the whole game:
 * the red string is drawn by the UI, the truth is decided here.
 */
export function compareFields(run: SeqRun, docId: string, docKey: string, targetKey: string): SeqCompareResult {
  const doc = deskDoc(run, docId);
  if (!doc) return { relevant: false, mismatch: false, found: false, text: 'There\'s no paper on the desk.' };
  const link = doc.links.find((l) =>
    (l.docKey === docKey && l.targetKey === targetKey) || (l.docKey === targetKey && l.targetKey === docKey),
  );
  if (!link) {
    return { relevant: false, mismatch: false, found: false, text: 'Those two things aren\'t supposed to match.' };
  }
  const a = fieldValue(doc, link.docKey);
  const b = targetValue(doc, link.targetKey);
  if (valuesMatch(a, b)) {
    return { relevant: true, mismatch: false, found: false, text: `No discrepancy. ${link.label} matches the record.` };
  }
  const key = flagKey(link);
  const found = !doc.flagged.includes(key);
  if (found) doc.flagged.push(key);
  return { relevant: true, mismatch: true, found, text: mismatchText(doc, link) };
}

// ---------------------------------------------------------------- asking

export interface SeqAskResult {
  speaker: string;
  line: string;
  outcome: 'clean' | 'excuse' | 'fix' | 'bribe' | 'refuse';
  amount?: number;
}

export function askVisitor(run: SeqRun, docId: string, rng: Rng): SeqAskResult | null {
  const doc = deskDoc(run, docId);
  if (!doc || doc.status === 'done' || doc.asked >= 2) return null;
  if (doc.flagged.length === 0) {
    doc.asked++;
    return { speaker: doc.visitor.name, line: doc.askClean, outcome: 'clean' };
  }
  doc.asked++;
  if (rng.chance(0.42) && run.cash >= doc.fixCost) {
    run.cash -= doc.fixCost;
    for (const key of doc.flagged) {
      const link = doc.links.find((l) => flagKey(l) === key);
      if (link) setField(doc, link.docKey, targetValue(doc, link.targetKey));
    }
    doc.flagged = [];
    doc.meta.fixed = 1;
    return { speaker: doc.visitor.name, line: `${doc.askFix} (The corrected page costs ${money(doc.fixCost)}.)`, outcome: 'fix' };
  }
  if (rng.chance(0.32)) {
    doc.meta.bribeAmount = doc.bribe;
    return { speaker: doc.visitor.name, line: doc.askBribe, outcome: 'bribe', amount: doc.bribe };
  }
  return { speaker: doc.visitor.name, line: doc.askExcuse, outcome: 'excuse' };
}

export function refuseBribe(doc: SeqDeskDoc): string {
  doc.asked++;
  return '"Your loss, boss." He puts the envelope away like a man who has done this before.';
}

export interface SeqBribeResult {
  ok: boolean;
  text: string;
}

/** Take the envelope. The paper goes through. Nobody writes it down except us. */
export function takeBribe(run: SeqRun, docId: string): SeqBribeResult {
  const doc = deskDoc(run, docId);
  if (!doc || doc.status === 'done') return { ok: false, text: 'There\'s no paper to approve.' };
  const amount = Number(doc.meta.bribeAmount ?? doc.bribe);
  run.cash += amount;
  run.heat = clamp(run.heat + 6, 0, 100);
  doc.meta.bribed = 1;
  doc.status = 'done';
  doc.verdict = 'approve';
  doc.correct = false;
  doc.result = `The envelope is ${money(amount)}. The paper goes through. The commission does not know why you are smiling.`;
  run.desk.processed++;
  run.desk.bribes++;
  run.stats.deskDocs++;
  run.stats.deskBribes++;
  if (doc.meta.fighterId) {
    const f = run.roster.find((x) => x.f.id === String(doc.meta.fighterId));
    if (f) f.morale = clamp(f.morale + 2, 0, 100);
  }
  run.desk.log.unshift(`BRIBE: ${doc.title} (${doc.subject})  /  ${money(amount)}.`);
  maybeFinishDesk(run);
  return { ok: true, text: doc.result };
}

// ---------------------------------------------------------------- stamping

export interface SeqResolution {
  doc: SeqDeskDoc;
  verdict: SeqVerdict;
  correct: boolean;
  text: string;
  citation: SeqDeskCitation | null;
  finished: boolean;
  perfect: boolean;
}

interface ApplyOpts {
  /** Delegation decides the verdict but the results still read like yours. */
  delegated?: boolean;
}

function applyEffects(run: SeqRun, doc: SeqDeskDoc, verdict: 'approve' | 'deny'): void {
  const p = verdict;
  const cash = Number(doc.meta[p + 'Cash'] ?? 0);
  const heat = Number(doc.meta[p + 'Heat'] ?? 0);
  const buzz = Number(doc.meta[p + 'Buzz'] ?? 0);
  const locker = Number(doc.meta[p + 'Locker'] ?? 0);
  run.cash += cash;
  run.heat = clamp(run.heat + heat, 0, 100);
  run.buzz = clamp(run.buzz + buzz, 0, 100);
  run.locker = clamp(run.locker + locker, 0, 100);
}

function issueCitation(run: SeqRun, doc: SeqDeskDoc, reason: string, fine: number, warning: boolean): SeqDeskCitation {
  const cit: SeqDeskCitation = { week: run.week, docId: doc.id, title: doc.title, reason, fine, warning };
  run.desk.citations.push(cit);
  run.desk.lastCitation = cit;
  run.desk.cites++;
  run.desk.fines += fine;
  run.stats.deskCites++;
  if (fine > 0) run.cash -= fine;
  run.heat = clamp(run.heat + (warning ? 2 : 5), 0, 100);
  doc.citation = reason;
  run.desk.log.unshift(`${warning ? 'WARNING' : 'CITATION'}: ${reason}`);
  return cit;
}

function fighterOf(run: SeqRun, doc: SeqDeskDoc): SeqFighter | undefined {
  const id = doc.meta.fighterId ? String(doc.meta.fighterId) : '';
  return id ? run.roster.find((x) => x.f.id === id) : undefined;
}

function approveText(doc: SeqDeskDoc): string {
  switch (doc.type) {
    case 'bout': return 'APPROVED. The bout is official. The purse is the purse.';
    case 'medical': return 'CLEARED. The fighter is insured, licensed and allowed to be hit.';
    case 'permit': return 'ISSUED. The room is legal for the night. The fire marshal will remember your name.';
    case 'sponsor': return `SIGNED. The sponsor pays ${money(Number(doc.meta.payout ?? 0))} and the category is clean.`;
    case 'cage': return 'PASSED. The cage is tight. The bolts are bolts.';
    case 'press': return 'CREDENTIALED. Somebody with a lanyard will write something you can\'t control.';
    case 'weighin': return 'FIGHT AS IS. The scale was certified and the fighter made the weight.';
    case 'expense': return `PAID. ${money(Number(doc.meta.total ?? 0))} leaves the account and the receipts go in the drawer.`;
    case 'memo': return String(doc.meta.approveText ?? 'FILED.');
    case 'zenith': return 'SIGNED. The clause is in the company now.';
  }
}

function denyText(doc: SeqDeskDoc): string {
  switch (doc.type) {
    case 'bout': return 'DENIED. The bout is off until the paperwork matches the file.';
    case 'medical': return 'REJECTED. The fighter isn\'t cleared. The commission is relieved.';
    case 'permit': return 'REJECTED. The room isn\'t licensed for this show.';
    case 'sponsor': return 'REJECTED. The money goes back in the briefcase.';
    case 'cage': return 'FAILED. The cage is closed until it\'s inspected again.';
    case 'press': return 'REFUSED. The lanyard stays at the desk.';
    case 'weighin': return 'CANCELLED. The bout is pulled from the card.';
    case 'expense': return 'REJECTED. The claim goes back to the manager with a red circle on it.';
    case 'memo': return String(doc.meta.denyText ?? 'IGNORED.');
    case 'zenith': return 'REFUSED. The matching right dies in the envelope. Vane will send another.';
  }
}

/**
 * Put a stamp on a document. Correct stamps cost nothing. Wrong stamps cost
 * money, heat, morale, or some combination of the three.
 */
export function resolveDoc(run: SeqRun, docId: string, verdict: SeqVerdict, opts: ApplyOpts = {}): SeqResolution | null {
  const doc = deskDoc(run, docId);
  if (!doc || doc.status === 'done') return null;
  const invalid = docInvalid(doc);
  const desired = desiredVerdict(doc);
  const correct = verdict === desired;
  let text = '';
  let citation: SeqDeskCitation | null = null;

  if (verdict === 'approve') {
    if (doc.type === 'memo') {
      applyEffects(run, doc, 'approve');
      text = approveText(doc);
    } else if (doc.type === 'zenith') {
      const n = Number(run.flags.zenith_clauses ?? 0) + 1;
      run.flags.zenith_clauses = n;
      run.heat = clamp(run.heat + 3, 0, 100);
      text = n === 1
        ? 'SIGNED. Zenith can match any future offer. The buyback just got $500,000 more expensive.'
        : `SIGNED. Clause ${n}. The buyback is now $${(7_000_000 + n * 500_000).toLocaleString('en-US')} and the door is closing.`;
      if (invalid) {
        citation = issueCitation(run, doc, `APPROVED A FORGED ZENITH LETTER: ${doc.subject}. The commission has questions.`, 1_500 + run.week * 60, false);
      }
    } else {
      if (doc.meta.payout) run.cash += Number(doc.meta.payout);
      if (doc.meta.total) run.cash -= Number(doc.meta.total);
      if (invalid) {
        const fine = 900 + run.week * 45 + (hashString(doc.id) % 400);
        citation = issueCitation(run, doc, `APPROVED AN INVALID ${doc.title}: ${mismatchText(doc, docMismatches(doc)[0]!)}`, fine, false);
        text = doc.type === 'expense' ? 'PAID. The money is gone and the receipt is a drawing of a jet ski.' : 'APPROVED. The commission notices on Monday.';
        run.desk.misses++;
        run.stats.deskMisses++;
        run.locker = clamp(run.locker - 2, 0, 100);
      } else {
        text = approveText(doc);
        run.buzz = clamp(run.buzz + 1, 0, 100);
        if (doc.type === 'bout') {
          const f = fighterOf(run, doc);
          if (f) f.morale = clamp(f.morale + 2, 0, 100);
        }
      }
    }
  } else if (verdict === 'deny') {
    if (doc.type === 'memo') {
      applyEffects(run, doc, 'deny');
      text = denyText(doc);
    } else if (doc.type === 'zenith') {
      run.buzz = clamp(run.buzz + 1, 0, 100);
      text = denyText(doc);
      if (invalid) {
        run.desk.catches++;
        run.stats.deskCatches++;
        run.cash += 300;
        text = 'REFUSED. The forged clause is on the record. The commission pays a small compliance credit. Vane will send another letter.';
      }
    } else if (invalid) {
      run.desk.catches++;
      run.stats.deskCatches++;
      run.cash += 300;
      run.buzz = clamp(run.buzz + 1, 0, 100);
      text = `DENIED: ${mismatchText(doc, docMismatches(doc)[0]!)} The commission credits you $300 for reading.`;
      const f = fighterOf(run, doc);
      if (f) f.morale = clamp(f.morale + 1, 0, 100);
    } else {
      const fine = 250 + run.week * 10;
      citation = issueCitation(run, doc, `DENIED A VALID ${doc.title}. ${doc.subject} did not deserve this.`, fine, true);
      text = "DENIED. It was valid. The commission sends a warning and somebody's day gets worse.";
      run.desk.wrong++;
      run.stats.deskMisses++;
      run.locker = clamp(run.locker - 3, 0, 100);
      const f = fighterOf(run, doc);
      if (f) f.morale = clamp(f.morale - 5, 0, 100);
    }
  } else if (verdict === 'escalate') {
    const fee = Math.min(850, 450 + run.week * 10);
    run.cash -= fee;
    run.desk.escalated++;
    text = `ESCALATED to legal. The paper is somebody else's problem. The fee is ${money(fee)}.`;
    if (invalid) run.desk.misses++;
  } else {
    const fee = 600;
    run.cash -= fee;
    run.heat = clamp(run.heat + 2, 0, 100);
    run.desk.buried++;
    run.flags.buried_risk = Number(run.flags.buried_risk ?? 0) + 1;
    text = `BURIED. The page goes into the wall. The fee is ${money(fee)}. No citation today.`;
  }

  doc.status = 'done';
  doc.verdict = verdict;
  doc.correct = correct;
  doc.result = text;
  if (doc.type === 'zenith') run.flags['zenith_' + doc.week] = verdict;
  run.desk.processed++;
  if (correct) run.desk.correct++;
  run.stats.deskDocs++;
  run.desk.log.unshift(`${verdict.toUpperCase()}  /  ${doc.title} (${doc.subject}): ${text}${opts.delegated ? ' [DELEGATED]' : ''}`);
  const finished = maybeFinishDesk(run);
  return { doc, verdict, correct, text, citation, finished, perfect: run.desk.perfect };
}

function maybeFinishDesk(run: SeqRun): boolean {
  const d = run.desk;
  if (!d || d.done) return false;
  if (d.docs.some((x) => x.status === 'pending')) return false;
  d.done = true;
  d.perfect = !d.delegated && d.cites === 0 && d.correct === d.docs.length && d.docs.length > 0 && d.bribes === 0;
  if (d.perfect) {
    const bonus = 1000 + run.week * 50;
    run.cash += bonus;
    run.buzz = clamp(run.buzz + 2, 0, 100);
    run.stats.deskPerfect++;
    d.log.unshift(`PERFECT WEEK: every paper correct. The commission adds a ${money(bonus)} commendation to the account.`);
  }
  return true;
}

// ---------------------------------------------------------------- delegation

export interface SeqDelegationResult {
  ok: boolean;
  error?: string;
  fee: number;
  caught: number;
  missed: number;
  summary: string;
}

/**
 * The safety valve: pay a fixer to sit at your desk. He is not as good as you
 * and he is not as careful, but he is a warm body and the cage can open.
 */
export function delegateDesk(run: SeqRun): SeqDelegationResult {
  if (!run.desk) return { ok: false, error: 'There\'s no desk.', fee: 0, caught: 0, missed: 0, summary: '' };
  const pending = pendingDocs(run.desk);
  if (!pending.length) return { ok: false, error: 'The desk is already clear.', fee: 0, caught: 0, missed: 0, summary: '' };
  const fee = 900 + pending.length * 300;
  if (run.cash < fee) {
    return { ok: false, error: `The fixer wants ${money(fee)}. You have ${money(Math.max(0, run.cash))}.`, fee, caught: 0, missed: 0, summary: '' };
  }
  run.cash -= fee;
  run.heat = clamp(run.heat + 3, 0, 100);
  run.desk.delegated = true;
  run.stats.deskDelegated++;
  let caught = 0;
  let missed = 0;
  const rng = new Rng((run.rng ^ 0x7f4a7c15) >>> 0);
  for (const doc of pending) {
    if (doc.status !== 'pending') continue;
    const invalid = docInvalid(doc);
    let verdict: SeqVerdict;
    if (doc.type === 'memo') {
      verdict = rng.chance(0.72) ? doc.desired : (doc.desired === 'approve' ? 'deny' : 'approve');
    } else if (doc.type === 'zenith') {
      verdict = rng.chance(0.85) ? 'deny' : 'approve';
    } else if (invalid) {
      verdict = rng.chance(0.7) ? 'deny' : 'approve';
    } else {
      verdict = rng.chance(0.9) ? 'approve' : 'deny';
    }
    if (invalid && verdict === 'deny') caught++;
    if (invalid && verdict === 'approve') missed++;
    if (!invalid && verdict === 'deny') missed++;
    resolveDoc(run, doc.id, verdict, { delegated: true });
  }
  run.rng = rng.state;
  maybeFinishDesk(run);
  const summary = `The fixer processed ${pending.length} document${pending.length === 1 ? '' : 's'} for ${money(fee)}: ${caught} caught, ${missed} missed. He left a coffee ring on the ledger.`;
  run.desk.log.unshift(summary);
  return { ok: true, fee, caught, missed, summary };
}

// ---------------------------------------------------------------- tests & UI helpers

/** A compact tally for the hub and the end of the desk day. */
export function deskTally(run: SeqRun): { docs: number; correct: number; catches: number; misses: number; cites: number; fines: number; perfect: boolean } {
  const d = run.desk;
  return {
    docs: d?.docs.length ?? 0,
    correct: d?.correct ?? 0,
    catches: d?.catches ?? 0,
    misses: d?.misses ?? 0,
    cites: d?.cites ?? 0,
    fines: d?.fines ?? 0,
    perfect: !!d?.perfect,
  };
}

/** The fingerprint of a week's paper for tests: same seed, same stack. */
export function deskFingerprint(run: SeqRun): string {
  return (run.desk?.docs ?? []).map((d) => `${d.type}:${d.title}:${d.fields.map((f) => f.value).join('|')}`).join('//');
}
