/**
 * Stage directions for CINE II. A narrated line ("He takes off his blazer and steps into the
 * cage." / "One punch. The heckler does.") becomes something the actors actually do: walk over,
 * throw it, go down, sit, hug, hand something over, leave. A line can say exactly what happens
 * (`Line.act`); otherwise the narration is read for who does what to whom (names first, then
 * he/she for the last man or woman to speak or act). `act: []` turns the reading off for a line.
 * Memories and things that didn't happen ("where Butch hit him", "he does not throw it") are left alone.
 */
import type { Pose } from '../rig';

export type StageAct =
  /** walk to an x, or up to another actor (`to` = their id) */
  | { do: 'walk'; who: string; x?: number; to?: string; gap?: number }
  /** close the distance and throw it; the other one is rocked or goes down */
  | { do: 'strike'; who: string; target: string; pose?: Pose; ko?: boolean }
  | { do: 'pose'; who: string; pose: Pose }
  /** walk off the edge */
  | { do: 'exit'; who: string; side?: 'left' | 'right' }
  /** turn to face someone, or away */
  | { do: 'face'; who: string; to?: string; away?: boolean }
  /** off with the jacket */
  | { do: 'strip'; who: string }
  /** walk up to someone and both take a pose: a hug, a handshake, handing something over */
  | { do: 'meet'; who: string; target: string; pose: Pose; both?: boolean }
  /** the room shakes (a fist on a table, a door slamming) */
  | { do: 'jolt' };

export interface StageActor { id: string; name: string; female?: boolean }
export interface StageCtx {
  /** the last one to speak */
  speaker: string | null;
  /** the last one named or acting (who "he" is) */
  subject: string | null;
  /** the last one acted on (who "him" is) */
  object: string | null;
  /** the last one who actually did something */
  actor?: string | null;
  /** the last sentence was about somebody who isn't in the shot ("Gordon Vance stands up. He claps.") */
  offstage?: boolean;
}

const SKIP = new Set(['A', 'AN', 'THE', 'OF', 'MR', 'MRS', 'DR', 'BIG', 'OLD', 'YOUNG', 'LITTLE', 'MAN', 'GUY', 'KID', 'UNCLE']);

/** The words a narrator might call an actor by: his id, and each word of his name. */
function tokens(a: StageActor): string[] {
  const out = new Set<string>([a.id.toLowerCase()]);
  for (const w of a.name.replace(/[^A-Za-z0-9]/g, ' ').split(/\s+/)) {
    const u = w.toUpperCase();
    if (u.length >= 3 && !SKIP.has(u)) out.add(w.toLowerCase());
  }
  if (a.id === 'oneton') out.add('1ton').add('gordo').add('alberto');
  // the story talks to the promoter
  if (a.id === 'dane') out.add('you');
  return [...out];
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every actor mentioned in a stretch of text, with where ("Mateo's grandmother" is not Mateo). */
function mentions(s: string, cast: StageActor[]): { id: string; at: number }[] {
  const low = s.toLowerCase();
  const out: { id: string; at: number }[] = [];
  for (const a of cast) {
    let best = -1;
    for (const tk of tokens(a)) {
      const re = new RegExp(`(^|[^a-z0-9])${esc(tk)}(?![a-z0-9]|'s|’s)`, 'g');
      let m: RegExpExecArray | null;
      const mine = tokens(a);
      while ((m = re.exec(low))) {
        const at = m.index + m[1].length;
        // "Gordon Vance" is not Tyler Vance: a first name in front that isn't his
        const prev = /([A-Z][a-z]+)\s+$/.exec(s.slice(0, at));
        if (prev && !mine.includes(prev[1].toLowerCase()) && !/^(The|And|Then|But|When|If|So)$/.test(prev[1])) continue;
        if (best < 0 || at < best) best = at;
        break;
      }
    }
    if (best >= 0) out.push({ id: a.id, at: best });
  }
  return out.sort((x, y) => x.at - y.at);
}

/** didn't happen: "does not", "never", "almost", "without" just before the verb */
const NEG = /\b(not|never|n't|almost|nearly|without|wants to|tries to|would|could|might)\s+(\w+\s+){0,2}$/i;
/** not one person: "Nobody is celebrating", "the crowd stands up" */
const CROWD = /\b(nobody|no one|everyone|everybody|somebody|someone|the crowd|people|half the|the whole)\b/i;
/** a memory or a description, not the scene: "where Butch hit him", "the day he fell" */
const BACK = /\b(where|when|who|that|since|after|before|until|like|as if|the day|the night|used to)\s+(\w+\s+){0,3}$/i;
const PAST = /\b(had|has been|used to|years ago|in 19\d\d|last (year|week|time)|once|caught|tore|broke)\b/i;

interface Rule { re: RegExp; kind?: 'strike' | 'fall' | 'pose'; make: (subj: string, obj: string | null, line: string) => StageAct[] | null }

const KO = /\b(one punch|one shot|out cold|goes down|go down|falls|drops\b|crumples|does not get up|doesn't get up|asleep|lights out|hits the (floor|mat|canvas|deck|ground)|is down|was\.)/i;
const pose = (p: Pose) => (s: string): StageAct[] => [{ do: 'pose', who: s, pose: p }];

const RULES: Rule[] = [
  // the shot: close the distance, throw it, the other man reacts
  { kind: 'strike', re: /\b(one punch|one shot|punch(es)? (him|her|it)|punches|hits (him|her)|smacks?|slaps?|clocks?|decks?|knocks? (him|her) (out|down|flat|cold)|lands (one|a|the) (right|left|shot|punch|hook|jab)|headbutts?|throws? (a|one|the) (punch|right|left|hook|jab|haymaker))\b/i,
    make: (s, o, line) => (o ? [{ do: 'strike', who: s, target: o, pose: /hook/i.test(line) ? 'hook' : /uppercut/i.test(line) ? 'uppercut' : /headbutt/i.test(line) ? 'clinch' : 'cross', ko: KO.test(line) }] : null) },
  { kind: 'strike', re: /\b(kicks (him|her)|knees (him|her)|head kick|kicks him in)\b/i,
    make: (s, o, line) => (o ? [{ do: 'strike', who: s, target: o, pose: /knee/i.test(line) ? 'knee' : /leg|calf|low/i.test(line) ? 'legkick' : 'headkick', ko: KO.test(line) }] : null) },
  { re: /\b(takes? off (his|her) (blazer|jacket|shirt|hoodie|coat|cardigan|sweater|suit jacket)|shirt off|jacket off|strips? (down|off))/i, make: (s) => [{ do: 'strip', who: s }] },
  { re: /\b(hugs?|hugged|embraces?|wraps (his|her) arms|holds (him|her) (close|tight)|pulls (him|her) in)\b/i, make: (s, o) => (o ? [{ do: 'meet', who: s, target: o, pose: 'clinch', both: true }] : null) },
  { re: /\b(shakes? (his|her|their)? ?hands?|handshake|offers (his|her) hand|bump fists|fist bump)/i, make: (s, o) => (o ? [{ do: 'meet', who: s, target: o, pose: 'touch', both: true }] : null) },
  // handing something over: walk up, hand out
  { re: /\b(hands (you|him|her|it|over)|gives (you|him|her|it)|holds (it|the \w+|a \w+) out|holds out|passes (you|him|her)|slides (it|the \w+) across|gives her the pieces)\b/i,
    make: (s, o) => (o ? [{ do: 'meet', who: s, target: o, pose: 'touch' }] : [{ do: 'pose', who: s, pose: 'touch' }]) },
  { re: /\b(tapes (his|her|\w+'s) hands|is taping|wraps (his|her) hands|holds both of)\b/i, make: (s, o) => (o ? [{ do: 'meet', who: s, target: o, pose: 'touch' }] : null) },
  { re: /\b(leaves|walks (out|off|away)|storms (out|off)|exits|goes home|drives (off|away|toward|home)|gets in the car|heads for the door|out the door|goes downstairs)\b/i, make: (s) => [{ do: 'exit', who: s }] },
  { re: /\b(steps? (in|into|up|forward|toward|towards|closer|between|through)|walks? (over|up|in|toward|towards|across|to|into)|crosses (the|to)|comes? (over|in|closer|up)|moves? (in|closer)|approaches|gets? in (his|her) face|marches|goes over)\b/i,
    make: (s, o) => [{ do: 'walk', who: s, to: o ?? undefined, x: o ? undefined : 240, gap: 40 }] },
  { kind: 'pose', re: /\b(sits?( down)?|sitting|sat|takes a seat|on (his|her|the) stool|on the bench|on the apron)\b/i, make: pose('stool') },
  { kind: 'pose', re: /\b(kneels?|knelt|on one knee|on (his|her) knees)\b/i, make: pose('kneel') },
  { kind: 'fall', re: /\b(falls|collapses|crumples|goes down|hits the (floor|mat|canvas|deck|ground)|out cold|faceplants|is down)\b/i, make: pose('ko') },
  { kind: 'pose', re: /\b(stands up|gets up|is standing|on (his|her) feet)\b/i, make: pose('stand') },
  { kind: 'pose', re: /\b(points? at|pointing|points)\b/i, make: (s, o) => [...(o ? [{ do: 'face', who: s, to: o } as StageAct] : []), { do: 'pose', who: s, pose: 'point' }] },
  { kind: 'pose', re: /\b(shrugs?|shrugged)\b/i, make: pose('shrug') },
  { kind: 'pose', re: /\b(raises? (his|her|both) (arms|hands|fists?|belt)|arms (go )?up|fist in the air|celebrates?|celebrating|throws (his|her) arms up|holds (up )?the belt|claps|applauds)\b/i, make: pose('celebrate') },
  { kind: 'pose', re: /\b(flex(es|ing)?)\b/i, make: pose('flex') },
  { kind: 'pose', re: /\b(puts (his|her) hands up|raises? (his|her) guard|gets? in (his|her|a) stance|squares? up|hands go up|cracks (his|her) knuckles|hits the bag|hitting the bag|shadowbox(es|ing)?)\b/i, make: pose('guard') },
  { kind: 'pose', re: /\b(beckons?|waves (him|her) (on|in))\b/i, make: pose('beckon') },
  { kind: 'pose', re: /\b(grabs|takes|picks up) the (mic|microphone)\b/i, make: pose('mic') },
  { kind: 'pose', re: /\b(cries|crying|cried|sobs?|tears up|looks? (down|at the floor|at the canvas|at his shoes|at her shoes)|looking at the canvas|hangs? (his|her) head|bows? (his|her) head|head in (his|her) hands|writes|writing|reads|signs (every|the|it)|opens the notebook|stacking chairs)\b/i, make: pose('headDown') },
  { re: /\b(turns? (away|around|(his|her) back)|walks? away from)\b/i, make: (s) => [{ do: 'face', who: s, away: true }] },
  { re: /\b(turns? to|looks? at|faces)\b/i, make: (s, o) => (o ? [{ do: 'face', who: s, to: o }] : null) },
  { re: /\b(slams?|pounds?|bangs?|kicks over|flips) (the|his|her|a) (table|desk|door|fist|chair|locker)/i, make: () => [{ do: 'jolt' }] },
];

/** A capitalised name (not the sentence's first word) that belongs to nobody in the shot. */
function offstageName(s: string, cast: StageActor[]): boolean {
  const words = s.replace(/^[^A-Za-z0-9]*\S+\s*/, '').match(/\b[A-Z][a-z]{2,}\b/g) ?? [];
  const known = new Set(cast.flatMap((a) => tokens(a)));
  const plain = new Set(['The', 'Then', 'And', 'But', 'Moncton', 'Coliseum', 'Zenith', 'Old', 'Dome', 'Main', 'Street', 'Ray', 'Marie', 'Mexican', 'Mexico', 'Golden', 'Gloves', 'Sunday', 'Monday', 'Tuesday', 'Saturday', 'Friday', 'Thursday', 'Wednesday']);
  return words.some((w) => !plain.has(w) && !known.has(w.toLowerCase()));
}

/** "he" or "she": the most recent person of that sort we were following. */
function pronoun(word: string, cast: StageActor[], ctx: StageCtx): string | null {
  if (ctx.offstage) return null;
  const female = /^(she|her)$/i.test(word);
  const order = [ctx.subject, ctx.actor, ctx.speaker, ctx.object].filter((x): x is string => !!x);
  const fits = (id: string) => !!cast.find((a) => a.id === id && !!a.female === female);
  const hit = order.find(fits);
  if (hit) return hit;
  // nobody to follow: only a guess if there's exactly one of them in the shot
  const only = cast.filter((a) => !!a.female === female);
  return only.length === 1 ? only[0].id : null;
}

/**
 * What a narrated line has the actors do. Reads sentence by sentence: the subject is whoever is
 * named before the verb (or he/she), the object whoever is named after it (or, for a punch, the
 * one named anywhere in the line, the last one acted on, the only other person there).
 */
export function readStage(line: string, cast: StageActor[], ctx: StageCtx): StageAct[] {
  const acts: StageAct[] = [];
  const ids = new Set(cast.map((a) => a.id));
  const lineMentions = mentions(line, cast);
  for (const sen of line.split(/(?<=[.!?])\s+/)) {
    const men = mentions(sen, cast);
    const found: { at: number; rule: Rule }[] = [];
    for (const rule of RULES) {
      const m = rule.re.exec(sen);
      if (!m) continue;
      const before = sen.slice(0, m.index);
      if (NEG.test(before) || CROWD.test(before)) continue;
      if ((rule.kind === 'strike' || rule.kind === 'fall') && (BACK.test(before) || PAST.test(sen))) continue;
      found.push({ at: m.index, rule });
    }
    found.sort((x, y) => x.at - y.at);
    let struck = false;
    for (const f of found) {
      const before = sen.slice(0, f.at);
      const named = men.filter((x) => x.at < f.at);
      const pro = /\b(he|she)\b[^.]*$/i.exec(before);
      // "Han and Mateo sit": both of them (poses only)
      let subs: string[] = [];
      if (named.length >= 2 && f.rule.kind === 'pose' && / and /i.test(before)) subs = named.map((x) => x.id);
      else if (named.length && (!pro || pro.index < named[named.length - 1].at)) subs = [named[0].id];
      else if (pro) subs = [pronoun(pro[1], cast, ctx) ?? ''];
      // somebody else is doing it (a name that isn't in the shot)
      else if (offstageName(before, cast)) subs = [];
      // nobody named: a punch is the man who walked up, a fall is the man who got hit
      else if (f.rule.kind === 'strike') subs = [ctx.actor ?? ctx.subject ?? ctx.speaker ?? ''];
      else if (f.rule.kind === 'fall') subs = [ctx.object ?? ''];
      else subs = [];
      if (f.rule.kind === 'fall' && struck) continue;
      for (const s of subs) {
        if (!s || !ids.has(s)) continue;
        const others = (list: { id: string }[]) => list.map((x) => x.id).filter((id) => id !== s);
        let o: string | null = others(men.filter((x) => x.at > f.at))[0] ?? null;
        // "hits him": him is whoever we were just following
        if (!o && /^\S+\s+(him|her)\b/i.test(sen.slice(f.at))) o = [ctx.subject, ctx.object, ctx.actor].find((x) => x && x !== s) ?? null;
        if (!o) o = others(lineMentions)[0] ?? null;
        if (!o && f.rule.kind === 'strike') o = ctx.object && ctx.object !== s ? ctx.object : cast.length === 2 ? cast.map((a) => a.id).find((id) => id !== s) ?? null : null;
        const made = f.rule.make(s, o, line);
        if (!made) continue;
        acts.push(...made);
        if (f.rule.kind === 'strike') struck = true;
        ctx.actor = s;
        ctx.subject = s;
        if (o) ctx.object = o;
      }
    }
    // a sentence that only names someone moves the story's attention, not who's acting
    if (!found.length && men[0] && men[0].at < 4) ctx.subject = men[0].id;
    // he/she next means whoever this sentence was about: one of ours, or somebody off in the stands
    if (men.length) ctx.offstage = false;
    else if (offstageName(sen, cast)) ctx.offstage = true;
  }
  return acts;
}
