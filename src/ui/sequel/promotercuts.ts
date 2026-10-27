/**
 * PROMOTER MODE's story: you are the promoter (Dane Whyte, unless you named yourself something
 * else), and the season has its own scenes. The seven-minute board meeting that cost you the CBFC,
 * the first sellout, the first belt, Zenith's letters, the raid, the end of each quarter and the
 * last Saturday. Played by CINE II when their moment comes; each one once.
 */
import type { Game } from '../app';
import { CAST, type Actor, type Cutscene } from '../cutscene';
import { playCine } from './cine';
import { bossName } from '../../sequel/model';
import type { SeqRun } from '../../sequel/types';

const npc = (id: keyof typeof CAST, name: string, x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor => ({ id, look: CAST[id], name, x, facing, ...o });

/** The scenes, in the order they can come up, and when. */
const CUTS: { id: string; when: (r: SeqRun) => boolean }[] = [
  { id: 'open', when: (r) => r.week <= 1 },
  { id: 'first_sellout', when: (r) => r.stats.sellouts >= 1 },
  { id: 'first_belt', when: (r) => r.belts.length >= 1 },
  { id: 'q1', when: (r) => r.week >= 11 },
  { id: 'raid', when: (r) => r.stats.raids >= 1 },
  { id: 'q2', when: (r) => r.week >= 21 },
  { id: 'letter', when: (r) => r.week >= 28 && !r.flags.sandbox },
  { id: 'q3', when: (r) => r.week >= 31 },
  { id: 'last', when: (r) => r.week >= 40 && !r.flags.sandbox },
];

function scene(run: SeqRun, id: string): Cutscene | null {
  const name = bossName(run);
  const first = name.split(' ')[0];
  const last = name.split(' ').slice(-1)[0];
  const you = npc('dane', name.toUpperCase(), 0, 1);
  const at = (x: number, facing: 1 | -1, o: Partial<Actor> = {}): Actor => ({ ...you, x, facing, ...o });
  switch (id) {
    case 'open':
      return {
        title: 'PROMOTER MODE',
        film: true,
        shots: [
          { bg: 'zenith', flashback: true, caption: 'SIX MONTHS AGO  /  THE ZENITH TOWER', cast: [at(130, 1), npc('zenith', 'VERITY KANE', 260, -1), npc('auditor', 'TRENT FROM STRATEGY', 360, -1)], lines: [
            { who: null, text: `The board of Zenith Holdings meets without you. It takes seven minutes. You spend six of them in the lift.` },
            { who: 'zenith', text: `${first}. The board has decided to take the CBFC in a new direction.` },
            { who: 'dane', text: 'Which direction?' },
            { who: 'auditor', text: 'An immersive fan journey. The cage is being replaced with a lounge experience. I\'m Trent. I\'m in strategy. I have your office.' },
            { who: 'zenith', text: 'You\'ll be compensated. Golden parachute. You may keep the stapler.' },
          ] },
          { bg: 'warehouse', caption: 'NOW  /  THE WAREHOUSE', cast: [at(130, 1), npc('ray', 'UNCLE RAY', 250, -1), npc('bradie', 'BRADIE', 360, -1)], lines: [
            { who: null, text: 'You have a warehouse with a roof that leaks onto the canvas, a cage you bought from a man in a parking lot, and the stapler.' },
            { who: 'ray', text: `I brought soup. Somebody has to feed the promoter. ${first}, isn't it?` },
            { who: 'bradie', text: 'I made us a website. It has a countdown. I don\'t know what it\'s counting down to.' },
            { who: 'dane', text: 'Forty Saturdays. Then I buy it all back.' },
            { who: 'ray', text: 'Then you better start on this one. Eat something.' },
          ] },
        ],
      };
    case 'first_sellout':
      return {
        film: true,
        shots: [{ bg: 'warehouse', caption: 'SOLD OUT', cast: [at(170, 1), npc('bradie', 'BRADIE', 290, -1), npc('ray', 'UNCLE RAY', 390, -1)], lines: [
          { who: null, text: 'Every folding chair in the warehouse has somebody on it. Some of them have two people on them.' },
          { who: 'bradie', text: 'We\'re sold out. We\'re actually sold out. The fire marshal is here. He bought a ticket.' },
          { who: 'dane', text: `This is how it started the first time. One room, full.` },
          { who: 'ray', text: `Do not get sentimental, ${first}. Count the money. Then get sentimental.` },
        ] }],
      };
    case 'first_belt':
      return {
        film: true,
        shots: [{ bg: 'cage', caption: 'THE FIRST CHAMPION', cast: [at(170, 1), npc('ray', 'UNCLE RAY', 290, -1)], lines: [
          { who: null, text: 'The warehouse has its first champion. The belt came from a trophy shop on Route 9 and the gold paint is still a little wet.' },
          { who: 'ray', text: 'It\'s real if they bleed for it.' },
          { who: 'dane', text: `You stole that from me.` },
          { who: 'ray', text: `I stole it from Marie. She stole it from a priest.` },
        ] }],
      };
    case 'q1':
    case 'q2':
    case 'q3': {
      const n = id === 'q1' ? 'first' : id === 'q2' ? 'second' : 'third';
      return {
        film: true,
        shots: [{ bg: 'zenith', caption: `THE ${n.toUpperCase()} QUARTER`, cast: [npc('zenith', 'VERITY KANE', 170, 1), at(300, -1)], lines: [
          { who: null, text: `A Zenith car is outside the warehouse. Verity Kane does not get out of it. ${name} has to get in.` },
          { who: 'zenith', text: `The ${n} quarter, Mr. ${last}. The board is watching. The board is always watching. The board finds you... charming.` },
          { who: 'dane', text: 'The board can buy a ticket.' },
          { who: 'zenith', text: id === 'q3' ? 'The board would like to buy the building.' : 'The board bought the parking.' },
        ] }],
      };
    }
    case 'raid':
      return {
        film: true,
        shots: [{ bg: 'street', caption: 'THE VAN', cast: [at(170, 1), npc('auditor', 'THE COMMISSION', 300, -1)], lines: [
          { who: null, text: 'The commission brings a van. The van has a logo. Somebody has tipped them off, and the somebody had a gold pen.' },
          { who: 'auditor', text: `${name}? Paperwork, licences, medicals, the lot. Tonight.` },
          { who: 'dane', text: 'You could have called.' },
          { who: 'auditor', text: 'We did. Zenith answered.' },
        ] }],
      };
    case 'letter':
      return {
        film: true,
        shots: [{ bg: 'office', caption: 'WEEK 28', cast: [at(170, 1), npc('lenny', 'LENNY PRATT', 300, -1)], lines: [
          { who: null, text: 'A letter on the desk, gold envelope, the Zenith tower embossed on the back. Matching rights. Sign it, and the buyback gets more expensive.' },
          { who: 'lenny', text: 'It\'s standard. Everything is standard. I\'m standard.' },
          { who: 'dane', text: `Nothing about you is standard, Lenny.` },
        ] }],
      };
    case 'last':
      return {
        film: true,
        shots: [{ bg: 'warehouse', caption: 'THE LAST SATURDAY', cast: [at(150, 1), npc('ray', 'UNCLE RAY', 260, -1), npc('bradie', 'BRADIE', 360, -1)], lines: [
          { who: null, text: 'Forty Saturdays. This is the last one on the calendar. Win it, and the buyback is on the table. Lose it, and the table goes back to Zenith.' },
          { who: 'ray', text: `Whatever happens, ${first}, this building had a good year.` },
          { who: 'bradie', text: 'The countdown on the website finally makes sense.' },
          { who: 'dane', text: 'Open the doors.' },
        ] }],
      };
    default:
      return null;
  }
}

/** Play the next promoter scene that is due (if any), then `after`. */
export function maybePromoterCut(g: Game, run: SeqRun, save: () => void, after?: () => void): boolean {
  const due = CUTS.find((c) => !run.flags[`pcut_${c.id}`] && c.when(run));
  if (!due) return false;
  run.flags[`pcut_${due.id}`] = true;
  save();
  const sc = scene(run, due.id);
  if (!sc) return false;
  playCine(g, sc, () => after?.());
  return true;
}
