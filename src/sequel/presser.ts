/**
 * The Thursday press conference before every show: a folding table, two fighters, Dane
 * Whyte at the end of it and 1ton in the back row with his hand already up. One question,
 * three ways to answer it. Headless: the scene is ui/sequel/presser2.ts.
 */
import type { Fighter } from '../core/types';
import { Rng } from '../core/rng';
import { clamp } from '../core/format';
import { beltFor, cardBouts, opponentById, rosterById } from './model';
import type { SeqRun } from './types';
import { mainGrudge } from './rivals';

export interface PresserAnswer {
  id: string;
  label: string;
  /** what Dane (or the fighter) actually says, as the scene's last line */
  says: string;
  buzz: number;
  heat: number;
  locker: number;
  result: string;
}

export interface PresserQuestion {
  id: string;
  /** who asks: 1ton, a Zenith plant, or a local reporter */
  asker: 'oneton' | 'plant' | 'local';
  text: string;
  answers: PresserAnswer[];
}

export interface PresserCard {
  week: number;
  A: Fighter;
  B: Fighter;
  title: boolean;
  question: PresserQuestion;
}

const Q = (id: string, asker: PresserQuestion['asker'], text: string, answers: PresserAnswer[]): PresserQuestion => ({ id, asker, text, answers });
const A = (id: string, label: string, says: string, buzz: number, heat: number, locker: number, result: string): PresserAnswer => ({ id, label, says, buzz, heat, locker, result });

/** {a} = your fighter's last name, {b} = the opponent's, {div} = the division. */
const BANK: PresserQuestion[] = [
  Q('mexico', 'oneton', '1ton, back row, notebook. {a}: Mexico is watching. Mexico has always been watching. Are you ready for the weight of a nation that isn\'t yours?', [
    A('embrace', 'Let {a} take the flag', '{a} takes the flag from 1ton and wears it like a cape. The back row loses its mind.', 6, 2, 2, 'The clip runs everywhere. BUZZ up.'),
    A('deflect', '"Next question."', '"Next question," you say. 1ton writes something down. Underlines it twice.', 0, 0, 1, 'Nothing happens. 1ton remembers.'),
    A('joke', 'Ask 1ton for his record', '"What\'s your record, 1ton?" He stands up. "Undefeated. In journalism." Somebody claps.', 3, 0, 0, 'A small, weird, good moment.'),
  ]),
  Q('zenith', 'plant', 'Hi, Brynn from, um, an independent outlet. Is it true this "promotion" is just a warehouse with debts and a bad attitude? Zenith says hi, by the way.', [
    A('fire', 'Tear into Zenith', '"Tell Zenith the warehouse has a cage, a crowd and a fire exit. That\'s three more things than their fan journey."', 8, 7, 3, 'BUZZ up big. HEAT up. Zenith reads the transcript.'),
    A('calm', 'Stay calm, stay legal', '"We respect every promotion. Some of them more than others." The room laughs at the right time.', 3, 0, 1, 'Classy. The commission notices.'),
    A('walk', 'Walk her out', 'You walk Brynn to the door yourself and hold it open. Cameras love a held door.', 4, 3, 2, 'BUZZ and HEAT both up. Brynn bleets about it.'),
  ]),
  Q('title', 'local', '{div} title on the line, at a warehouse, in a belt you had made at a trophy shop on Route 9. Is it real?', [
    A('real', '"It\'s real if they bleed for it."', '"It\'s real if they bleed for it. And they will." {b} looks at {a}. {a} looks at the belt.', 6, 2, 0, 'BUZZ up. The belt photographs well.'),
    A('honest', '"It\'s plastic. The fight isn\'t."', '"The belt is plastic and gold paint. The fight isn\'t." Somebody in the back says "hell yeah".', 4, 0, 2, 'The locker room likes honesty.'),
    A('bigger', 'Promise a bigger belt', '"Next one\'s solid gold." It won\'t be solid gold.', 5, 1, -2, 'BUZZ up. The fighters know it won\'t be gold.'),
  ]),
  Q('faceoff', 'oneton', '1ton. {b}, {a} says you have a glass jaw and a plastic heart. Response? Please be specific. I have a deadline. I made the deadline up.', [
    A('shove', 'Let them face off. Hard.', 'The face-off turns into a shove. The shove turns into the table. You let it.', 9, 6, -2, 'BUZZ up big. HEAT up. Somebody breaks a microphone.'),
    A('separate', 'Separate them', 'You step in between them. {b} smiles. {a} doesn\'t. That\'s better than a shove.', 3, 0, 2, 'Tension sells. Nobody gets fined.'),
    A('stare', 'Stare-down only', 'Forty seconds of silence. 1ton narrates it under his breath, in Spanish.', 5, 1, 1, 'BUZZ up. The silence clip is oddly famous.'),
  ]),
  Q('pay', 'local', 'Your fighters are making a fraction of what Zenith pays. Why fight for you?', [
    A('truth', '"Because I answer the phone."', '"Because when they call me, I answer. Ask anybody who used to work for Trent."', 3, 0, 4, 'LOCKER up. The fighters heard it.'),
    A('bonus', 'Announce a bonus on the spot', '"Five grand to whoever finishes it." You don\'t have five grand. You\'ll find five grand.', 5, 0, 3, 'BUZZ and LOCKER up. Your accountant groans.'),
    A('dodge', '"Money is a construct."', '"Money is a construct." Everybody writes that down, including your landlord.', 1, 1, -3, 'Bad answer. The locker room heard it too.'),
  ]),
  Q('ray', 'oneton', '1ton. Quieter than usual. Is it true Uncle Ray still comes to the warehouse with the soup? And is it true the soup is in {a}\'s corner tonight?', [
    A('soup', '"The soup goes where the fighters go."', '"The soup goes where the fighters go." 1ton nods. For once he doesn\'t write anything down.', 4, 0, 3, 'A good night for everyone with a bowl.'),
    A('private', '"Leave Ray out of this."', '"Ray isn\'t part of the show." 1ton puts the notebook away. The room goes quiet in a good way.', 1, 0, 2, 'Respect, quietly earned.'),
    A('sell', 'Sell soup at the merch table', '"Soup is eight dollars at the merch table." Ray, from the back: "It\'s FREE." It\'s free.', 3, 0, 0, 'Ray overrules you. Ray is correct.'),
  ]),
  Q('heat', 'plant', 'There are rumours the commission is watching this promotion. Closely. With a van. Comment?', [
    A('bold', '"Let them watch. Buy a ticket."', '"Let them watch. Tickets are forty bucks." Somebody from the commission is, in fact, in the room.', 6, 5, 1, 'BUZZ up. HEAT up. The van is real.'),
    A('clean', '"Our paperwork is spotless."', '"Our paperwork is spotless." It\'s mostly spotless. Most of it\'s paper.', 1, -3, 0, 'HEAT down a little. Do the desk properly.'),
    A('lawyer', '"My lawyer will answer that."', 'You don\'t have a lawyer. Mateo, in a borrowed blazer, says "no comment" very seriously.', 2, -1, 1, 'Mateo is a natural. HEAT down a touch.'),
  ]),
  Q('legacy', 'local', 'You ran the CBFC. You had the arenas, the network, the champ-champ. Now it\'s folding chairs. What happened?', [
    A('board', '"A seven-minute board meeting."', '"Seven minutes. That\'s how long it takes Zenith to forget who built something." The room writes it down.', 5, 2, 2, 'BUZZ up. A good quote with a long shelf life.'),
    A('chairs', '"I like the chairs better."', '"Folding chairs fold. Arenas don\'t. Think about it." Nobody thinks about it. Everybody laughs.', 3, 0, 1, 'Light. Likeable.'),
    A('vow', 'Vow to buy the CBFC back', '"I\'m buying it back. Every belt, every banner, every chair Trent didn\'t sell." Zenith\'s stock dips 0.01%.', 7, 4, 2, 'BUZZ up. HEAT up. Somebody at Zenith screenshots it.'),
  ]),
];

/** A rematch on the main event gets its own question. */
const GRUDGE_Q = Q('grudge', 'oneton', '1ton. {a}, {b}. You have done this before. One of you remembers it better than the other. Which one of you lied at the last press conference?', [
  A('heat', 'Let them settle it at the table', 'The table goes over. Then the water jugs. {b} throws a chair at a chair. Security arrives late and in the wrong order.', 10, 8, -1, 'BUZZ up big. HEAT up. The clip does a million views by Friday.'),
  A('respect', '"They respect each other. Next question."', '{a} and {b} nod at each other, which is somehow worse. 1ton writes "they respect each other" and then "(they don\'t)".', 4, 0, 3, 'Classy. The locker room likes it.'),
  A('money', 'Announce a bonus for a finish', '"Ten grand to whoever ends it." Both of them stand up. The presser is over. The fight has started early.', 6, 3, 2, 'BUZZ up. The fighters are motivated. Your accountant isn\'t.'),
]);

const fill = (s: string, a: Fighter, b: Fighter, div: string): string =>
  s.replace(/\{a\}/g, a.last).replace(/\{b\}/g, b.last).replace(/\{div\}/g, div.toUpperCase());

/** This week's presser: the main event at the table and one question (null = no main event, no presser). */
export function presserFor(run: SeqRun): PresserCard | null {
  const main = cardBouts(run)[0];
  if (!main) return null;
  const a = rosterById(run, main.a);
  const b = opponentById(run, main.b);
  if (!a || !b) return null;
  const title = !!beltFor(run, a.f.id);
  const rng = new Rng((run.seed ^ (run.week * 2654435761)) >>> 0);
  // the room picks the question: title fights get asked about the belt, hot weeks about the van
  const weighted = BANK.filter((q) => (q.id === 'title' ? title : true)).filter((q) => (q.id === 'heat' ? run.heat >= 40 : true));
  // a grudge on the main event: the room only wants to talk about that
  const q = mainGrudge(run) ? GRUDGE_Q : title && rng.chance(0.5) ? BANK.find((x) => x.id === 'title')! : rng.pick(weighted);
  const div = a.f.division;
  return {
    week: run.week,
    A: a.f,
    B: b,
    title,
    question: {
      ...q,
      text: fill(q.text, a.f, b, div),
      answers: q.answers.map((x) => ({ ...x, label: fill(x.label, a.f, b, div), says: fill(x.says, a.f, b, div) })),
    },
  };
}

export const presserDone = (run: SeqRun): boolean => !!run.flags[`presser_${run.week}`];

/** Apply an answer (or skip it with null). Returns the line for the notes. */
export function applyPresser(run: SeqRun, card: PresserCard, answerId: string | null): string {
  run.flags[`presser_${run.week}`] = answerId ?? 'skipped';
  const ans = card.question.answers.find((x) => x.id === answerId);
  if (!ans) return 'You skipped the presser. The room was booked anyway.';
  run.buzz = clamp(run.buzz + ans.buzz, 0, 100);
  run.heat = clamp(run.heat + ans.heat, 0, 100);
  run.locker = clamp(run.locker + ans.locker, 0, 100);
  run.phaseLog.push(`PRESSER (week ${run.week}): ${ans.result}`);
  return ans.result;
}
