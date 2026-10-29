/**
 * CAGE BOSS II: STORY MODE  /  the data and rules.
 *
 * The warehouse is the same. The camera is the same. The difference is that
 * this time there's a man in the back row with a notebook, and he can fight.
 *
 * Everything in this file is headless: no Pixi, no DOM, no GameState. The
 * cutscenes live in ui/scenes/storycuts.ts, which imports the words and the
 * fighters from here and dresses them.
 */
import type { Fighter, Look, Skills } from '../core/types';
import { content } from '../core/content';
import { Rng } from '../core/rng';
import { clamp as clampNum } from '../core/format';
import { generateFighter } from '../sim/generate';
import { SPECIAL_MOVES } from '../sim/live';
import { overall, isWomensDivision, SKILL_WEIGHTS } from '../sim/fighters';
import { HAN } from '../sim/cast';
import type { Bg } from '../ui/cutscene';
import {
  STORY_VERSION,
  type StoryDaneTraining,
  type StoryEndingDef,
  type StoryFightRecord,
  type StorySave,
  type StoryTraining,
} from './types';

const clamp = (v: number, lo = 0, hi = 100): number => clampNum(v, lo, hi);

// ---------------------------------------------------------------- chapters

export interface StoryFightDef {
  id: string;
  name: string;
  opponent: string;
  /**
   * Who you corner. Dane Whyte is the promoter; he never fights. 1ton is the trainee.
   * Han Tibular (game one's Road To Champion) walks out on Zenith and fights for the warehouse
   * until he gets hurt in chapter ten; then it's Mateo, all grown up.
   */
  player: 'oneton' | 'han' | 'mateo';
  rounds: 3 | 5;
  venue: string;
  stakes: string;
  /** the one line the fight poster puts under the main event */
  hook: string;
  /** only on the books when this says so (the secret chapter's two roads) */
  when?: (save: StorySave) => boolean;
  /** the week of the chapter it's booked for (default: the chapter's last week) */
  week?: number;
}

export interface StoryChapter {
  id: string;
  no: number;
  title: string;
  kicker: string;
  blurb: string;
  bg: Bg;
  /** how many training / media / talk actions before the chapter can move (old saves; the clock is weeks now) */
  actions: number;
  /** how many weeks the chapter lasts: seven days each, and the story moves when the last one is done */
  weeks?: number;
  fight?: StoryFightDef;
  /** a chapter can make you fight the whole crew, in order, before it lets go */
  fights?: StoryFightDef[];
  /** the optional talk scene for this chapter */
  talk: string;
}

/** Every fight a chapter still owes you, in the order the story tells them. */
export function chapterFights(ch: StoryChapter, save?: StorySave): StoryFightDef[] {
  const all = ch.fights ?? (ch.fight ? [ch.fight] : []);
  return save ? all.filter((f) => !f.when || f.when(save)) : all;
}

/** The next fight in this chapter that has not happened yet, or null. */
export function nextChapterFight(save: StorySave): StoryFightDef | null {
  return chapterFights(storyChapter(save), save).find((f) => !fightDone(save, f)) ?? null;
}

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 'back_row',
    no: 1,
    title: 'THE BEARD IN THE BACK ROW',
    kicker: 'SIX MONTHS AFTER THE SEVEN-MINUTE MEETING',
    blurb: 'The Zenith board voted you out of the CBFC in seven minutes. Trent from strategy has your office. You have a warehouse, a cage, a folding chair and a reporter at the door who wants to know why no Mexican fighter has ever main-evented in this city.',
    bg: 'warehouse',
    actions: 2,
    talk: 'notebook',
  },
  {
    id: 'mexican_math',
    no: 2,
    title: 'THE MEXICAN MATH',
    kicker: 'THE FIRST REAL FIGHT',
    blurb: '1ton has a knee that clicks, a father who was a luchador, and a left hand nobody scouted. El Cuchillo has a knife tattoo and a grudge with the press.',
    bg: 'lucha',
    actions: 2,
    fights: [
      {
        id: 'allstar_debut', name: 'ALLSTAR FC 1: THE BARN', opponent: 'dusty', player: 'oneton', rounds: 3, venue: "XAVIER'S BARN",
        stakes: '1ton signed with Xavier\'s Allstar Fighting Championship for four hundred dollars and a hat. His pro debut, in a barn, against a bull rider.',
        hook: '1TON  vs  DUSTY "THE RODEO" COLE', week: 3,
      },
      {
      id: 'cuchillo',
      name: 'THE MEXICAN MATH',
      opponent: 'cuchillo',
      player: 'oneton',
      rounds: 3,
      venue: 'THE WAREHOUSE',
      stakes: '1ton\'s first fight. If he wins, the phone starts ringing. If he loses, it still rings, and the voice on the other end has a Zenith extension.',
      hook: '1TON  vs  EL CUCHILLO',
    },
    ],
    talk: 'father',
  },
  {
    id: 'allstar',
    no: 3,
    title: 'ALLSTAR FC',
    kicker: 'A BARN, A BELT, A HORSE TRAILER',
    blurb: 'Xavier Cockett\'s Allstar Fighting Championship runs out of a barn outside Moncton with real bleachers and a goat for a commissioner. 1ton is undefeated there. Mateo has his first fight. Ray works both corners and refuses to sit down.',
    bg: 'warehouse',
    actions: 2,
    fights: [
      {
        id: 'allstar_ranch', name: 'ALLSTAR FC 3: THE RANCH HAND', opponent: 'ranch', player: 'oneton', rounds: 3, venue: "XAVIER'S BARN",
        stakes: 'A man who wrestles steers for a living. He has never been knocked down by anything with fewer than four legs.',
        hook: '1TON  vs  WADE "THE RANCH HAND" PRUITT',
      },
      {
        id: 'allstar_title', name: 'ALLSTAR FC 4: THE BELT', opponent: 'buck', player: 'oneton', rounds: 5, venue: "XAVIER'S BARN",
        stakes: 'Xavier has a belt. It\'s a real belt, from a real rodeo. Buck Harlan has held it for two years and both of his hats.',
        hook: '1TON  vs  BUCK "TWO HATS" HARLAN  /  ALLSTAR FC TITLE', week: 3,
      },
    ],
    talk: 'ray',
  },
  {
    id: 'brick_by_brick',
    no: 4,
    title: 'BRICK BY BRICK',
    kicker: 'THE PRIDE OF THE MARITIMES WALKS IN',
    blurb: 'Gordon Vance wants the block and Brick Bastion is the permit. Then Han Tibular walks through the roller door: the CBFC middleweight champion, Uncle Ray\'s nephew, done with Zenith. He wants a fight in the warehouse and Dane wants to sell tickets to it.',
    bg: 'warehouse',
    actions: 2,
    fights: [
      {
        id: 'han_intern', name: 'TALENT RELATIONS', opponent: 'intern', player: 'han', rounds: 3, venue: 'THE WAREHOUSE',
        stakes: 'Zenith sends a man from "talent relations" to bring their champion home. He has a business card, a lanyard and a black belt in something.',
        hook: 'HAN TIBULAR  vs  BROCK "THE INTERN" HALE',
      },
      {
      id: 'brick',
      name: 'BRICK BY BRICK',
      opponent: 'brick',
      player: 'han',
      rounds: 3,
      venue: 'THE WAREHOUSE',
      stakes: 'Your building, Han\'s fight. Brick breaks things for a living. Han broke Spadam Biggs for a living. The lease says the building goes to the winner.',
      hook: 'HAN TIBULAR  vs  BRICK BASTION',
    },
    ],
    talk: 'gordon',
  },
  {
    id: 'sparring_partner',
    no: 5,
    title: 'THE SPARRING PARTNER',
    kicker: 'MATEO COMES HOME',
    blurb: 'Mateo is nineteen now and owns a key to the mop closet. He\'s fast, he\'s annoying, and he\'s the only person in the building who can make 1ton laugh. Ray wants them sparring, and Ray is already taping their gloves.',
    bg: 'gym',
    actions: 2,
    fights: [
      {
        id: 'oneton_rodeo', name: 'ALLSTAR FC 7: THE RODEO RETURNS', opponent: 'dusty', player: 'oneton', rounds: 3, venue: "XAVIER'S BARN",
        stakes: 'Dusty Cole wants the rematch. He has been training. He has been training a lot. He has a new hat.',
        hook: '1TON  vs  DUSTY "THE RODEO" COLE II',
      },
      {
      id: 'mateo_spar',
      name: 'SPARRING PARTNER',
      opponent: 'mateo_spar',
      player: 'oneton',
      rounds: 3,
      venue: 'RAY\'S BOXING & SOUP',
      stakes: 'A sparring session in Ray\'s ring. No judges, no purse, Uncle Ray refereeing. No hard shots, he says. Nobody listens.',
      hook: '1TON  vs  MATEO VARGA',
    },
    ],
    talk: 'mateo',
  },
  {
    id: 'audit',
    no: 6,
    title: 'THE AUDIT',
    kicker: 'ZENITH SENDS A SUIT',
    blurb: 'The Auditor has never lost a fight. He has also never had one. He has settlements, a clipboard, and a signature from somebody you have never met.',
    bg: 'zenith',
    actions: 2,
    fights: [
      {
        id: 'warehouse_main', name: 'WAREHOUSE 1: THE FIRST MAIN EVENT', opponent: 'toro', player: 'oneton', rounds: 3, venue: 'THE WAREHOUSE',
        stakes: '1ton left Xavier\'s with Xavier\'s blessing and signed with Dane. His first warehouse main event. A Mexican fighter, in the main event, finally. He asked for it for twelve years.',
        hook: '1TON  vs  RAFA "EL TORO" MEDINA', week: 3,
      },
      {
      id: 'auditor',
      name: 'THE AUDIT',
      opponent: 'auditor',
      player: 'oneton',
      rounds: 3,
      venue: 'THE WAREHOUSE',
      stakes: 'If 1ton wins, Zenith has to admit the warehouse is a promotion. If he loses, they call it an incident.',
      hook: '1TON  vs  THE AUDITOR',
    },
    ],
    talk: 'contract',
  },
  {
    id: 'the_signing',
    no: 7,
    title: 'THE GOLD PEN',
    kicker: '1TON SIGNS',
    blurb: 'The gold envelope gets opened. 1ton signs with Zenith in a glass room on the fortieth floor with a gold pen, then calls Ray to tell him before anybody else. Ray doesn\'t shout. He puts the phone down, ladles out two bowls and sits with the second one until it goes cold.',
    bg: 'zenith',
    actions: 2,
    fights: [
      {
        id: 'zenith_prospect', name: 'ZENITH FIGHT NIGHT: SYNERGY', opponent: 'synergy', player: 'oneton', rounds: 3, venue: 'THE OLD DOME',
        stakes: 'Zenith puts 1ton on its own card against its own prospect, a man with a podcast and a brand deal. Win and they want you more. Lose and they want you cheaper.',
        hook: '1TON  vs  KYLE "SYNERGY" BRANDT', week: 3,
      },
      {
        id: 'han_dos_caras', name: 'TWO FACES', opponent: 'doscaras', player: 'han', rounds: 5, venue: 'THE WAREHOUSE',
        stakes: 'Han defends the warehouse\'s middleweight belt against a masked man from Monterrey who won\'t say who sent him. Everybody knows who sent him.',
        hook: 'HAN TIBULAR  vs  DIEGO "DOS CARAS" RUIZ', week: 3,
      },
    ],
    talk: 'signing',
  },
  {
    id: 'brother',
    no: 8,
    title: 'THE BROTHER YOU MADE',
    kicker: '1TON vs MATEO',
    blurb: 'Zenith books the kid against the star. They want a message. 1ton wants to be the man who delivers it. You sign the bout sheet in the corridor and your hand isn\'t steady.',
    bg: 'locker',
    actions: 2,
    fights: [
      {
        id: 'han_brick2', name: 'BRICK BY BRICK II', opponent: 'brick', player: 'han', rounds: 3, venue: 'THE WAREHOUSE',
        stakes: 'Brick Bastion is back with a new permit and a grudge. Gordon Vance isn\'t paying for him this time. Somebody else is.',
        hook: 'HAN TIBULAR  vs  BRICK BASTION II',
      },
      {
      id: 'mateo_betrayal',
      name: 'THE BROTHER YOU MADE',
      opponent: 'mateo_betrayal',
      player: 'oneton',
      rounds: 3,
      venue: 'THE OLD DOME',
      stakes: 'Mateo isn\'t a sparring partner anymore. 1ton isn\'t a reporter. You aren\'t in control of either of them.',
      hook: '1TON  vs  MATEO VARGA',
    },
    ],
    talk: 'brother',
  },
  {
    id: 'the_wake',
    no: 9,
    title: 'THE WAKE',
    kicker: 'RAY\'S BOXING & SOUP IS CLOSED UNTIL FURTHER NOTICE',
    blurb: 'Ray is gone. The gym is full of people who don\'t know what to do with their hands. Han finds the recipe. Mateo finds the tape Ray used on everybody. Dane finds out how many people Ray fed for free, and it\'s everyone.',
    bg: 'gym',
    actions: 2,
    talk: 'wake',
  },
  {
    id: 'street_justice',
    no: 10,
    title: 'THE CREW',
    kicker: 'THREE NAMES ON A NAPKIN',
    blurb: 'Uncle Ray is dead on a Tuesday. The men who held him, hit him and left him have names, addresses and a booth at the back of the Old Dome. Han has the same three names. He\'s moving up to light heavyweight to get the last one. 1ton isn\'t on the list. He sends flowers to the funeral with a card signed in gold ink.',
    bg: 'street',
    actions: 2,
    fights: [
      {
        id: 'crew_duke',
        name: 'THE DOOR',
        opponent: 'duke',
        player: 'han',
        rounds: 3,
        venue: 'THE ALLEY BEHIND RAY\'S',
        stakes: 'Duke Kessler held Ray\'s arms while the others worked. He\'s six-foot-five and has never lost a fight he couldn\'t call security for. Han learned to keep his hands up from the man Duke held.',
        hook: 'HAN TIBULAR  vs  DUKE "THE DOOR" KESSLER',
      },
      {
        id: 'crew_rico',
        name: 'THE PAYPHONE',
        opponent: 'rico',
        player: 'han',
        rounds: 3,
        venue: 'THE LOT BEHIND THE OLD DOME',
        stakes: 'Rico Alvarez hit a seventy-year-old man with a payphone. The payphone is in evidence. Rico isn\'t. After this one, Han starts the cut up to light heavyweight for Cesar.',
        hook: 'HAN TIBULAR  vs  RICO "PAYPHONE" ALVAREZ',
      },
      {
        id: 'crew_cesar',
        name: 'THE HAND',
        opponent: 'cesar',
        player: 'mateo',
        rounds: 5,
        venue: 'THE OLD DOME, LOADING BAY',
        stakes: 'Han tore his knee in camp for this fight. Mateo Varga, twenty-one, two hundred and five pounds and inked to the knuckles, takes it at light heavyweight. Cesar Rios caught Ray before he fell, then hit him again.',
        hook: 'MATEO VARGA  vs  CESAR "LA MANO" RIOS',
      },
    ],
    talk: 'crew',
  },
  {
    id: 'homecoming',
    no: 11,
    title: 'HOMECOMING',
    kicker: 'THE SHOW RAY NEVER GOT TO SEE',
    blurb: 'The warehouse goes back to the Moncton Coliseum for the show Ray bought a front-row ticket to and never used. His old fighters fill the first six rows, Tyler Vance wants the exhibition, and Mateo wants to fight twice in one night because Ray would have told him not to.',
    bg: 'cage',
    actions: 2,
    fights: [
      {
        id: 'moncton_undercard', name: 'MONCTON: THE TRIBUTE', opponent: 'lobster', player: 'mateo', rounds: 3, venue: 'MONCTON COLISEUM',
        stakes: 'Luc Arsenault fished with Han\'s father and learned to fight in Ray\'s ring. He asked for the kid, not the champion. The commission calls it an openweight exhibition; nobody weighs anybody.',
        hook: 'MATEO VARGA  vs  LUC "THE LOBSTER" ARSENAULT', week: 10,
      },
      {
        id: 'han_tyler', name: 'SOUP FOR THE SOUL', opponent: 'tyler', player: 'mateo', rounds: 3, venue: 'MONCTON COLISEUM',
        stakes: 'The exhibition Ray was going to watch from the third row. Tyler Vance gives his whole purse to the gym. Mateo gives his to the funeral. Neither of them says so at the presser.',
        hook: 'MATEO VARGA  vs  TYLER "TRUST FUND" VANCE  /  EXHIBITION', week: 10,
      },
    ],
    talk: 'homecoming',
  },
  {
    id: 'the_board',
    no: 12,
    title: 'THE BOARD',
    kicker: 'THE FUNERAL BILL CAME DUE',
    blurb: 'Ray died owing forty-one thousand dollars. 1ton paid the funeral out of his own pocket, then Zenith bought the debt and the gym\'s mortgage and put both on a boardroom table. Mateo fights for the building. 1ton fights for the debt. Win both and Ray\'s name stays on the door.',
    bg: 'zenith',
    actions: 2,
    fights: [
      {
        id: 'han_spadam', name: 'THE DEED', opponent: 'spadam', player: 'mateo', rounds: 5, venue: 'THE OLD DOME',
        stakes: 'Spadam Biggs has spent two years telling every Zenith camera that Han only beat him because of a distraction. He isn\'t fighting Han. He\'s fighting the kid with Ray\'s tape on his hands, for the mortgage on Ray\'s gym.',
        hook: 'MATEO VARGA  vs  SPADAM "THE WHITE BEAST" BIGGS  /  FOR THE GYM', week: 5,
      },
      {
      id: 'chairman',
      name: 'THE BOARD',
      opponent: 'chairman',
      player: 'oneton',
      rounds: 5,
      venue: 'THE OLD DOME, PARKING LEVEL',
      stakes: 'The funeral bill is $41,000 and change. Zenith bought it for a dollar. 1ton asked for the Chairman: five rounds, and if he wins the debt is forgiven and Ray\'s gym keeps its name. He paid the funeral. He still won\'t come inside.',
      hook: '1TON  vs  THE CHAIRMAN  /  FOR THE DEBT',
    },
    ],
    talk: 'board',
  },
  {
    id: 'rematch',
    no: 13,
    title: 'THE REMATCH NOBODY ASKED FOR',
    kicker: 'EL CUCHILLO, NOW AT LIGHT HEAVYWEIGHT',
    blurb: 'Zenith signed the knife and moved him up a weight class for one night. Now he wants the warehouse\'s new draw on Zenith television, and Mateo says yes before Dane can say no. Han is on crutches. 1ton watches from the third row and doesn\'t say anything at all.',
    bg: 'presser',
    actions: 2,
    fights: [
      {
        id: 'oneton_prince', name: 'THE PRINCE', opponent: 'prince', player: 'oneton', rounds: 3, venue: 'THE WAREHOUSE',
        stakes: 'Zenith\'s golden boy comes to the warehouse to "scout the market". He scouts 1ton. 1ton doesn\'t like being scouted.',
        hook: '1TON  vs  NICO "THE PRINCE" SANDOVAL', week: 5,
      },
      {
      id: 'cuchillo_rematch',
      name: 'THE REMATCH NOBODY ASKED FOR',
      opponent: 'cuchillo_rematch',
      player: 'mateo',
      rounds: 5,
      venue: 'THE OLD DOME',
      stakes: 'A Zenith television slot is on the line. El Cuchillo has a new suit, a new weight class and the same knife tattoo. Mateo has Ray\'s tape on his hands and a roof to fix.',
      hook: 'MATEO VARGA  vs  EL CUCHILLO II', week: 10,
    },
    ],
    talk: 'cuchillo',
  },
  {
    id: 'the_camp',
    no: 14,
    title: 'THE CAMP',
    kicker: 'EIGHT WEEKS TO 1TON',
    blurb: 'Han is on crutches and coaching. Zac has a gameplan. Tyler mops and holds pads. Mateo has eight weeks to get ready for the man who taught him to throw a left hook, at a weight he has never fought at, for the company.',
    bg: 'gym',
    actions: 2,
    fights: [
      {
        id: 'camp_tuneup', name: 'TUNE-UP', opponent: 'croc', player: 'mateo', rounds: 3, venue: 'THE WAREHOUSE',
        stakes: 'One fight at light heavyweight before the big one. Jarrah Kane is long, mean and Australian, and Zenith paid for his plane ticket.',
        hook: 'MATEO VARGA  vs  JARRAH "THE CROC" KANE',
      },
    ],
    talk: 'camp',
  },
  {
    id: 'buyback',
    no: 15,
    title: 'THE BUYBACK',
    kicker: 'ONE NIGHT. ONE CAGE. ONE OF YOU.',
    blurb: 'The contract is on the table and Zenith is in the front row. 1ton holds Zenith\'s light heavyweight belt and the buyback rides on it. Han is cageside on crutches. Mateo is in the cage in Ray\'s colours, and Ray\'s bucket is in his corner.',
    bg: 'cage',
    actions: 1,
    fight: {
      id: 'final',
      name: 'THE BUYBACK',
      opponent: 'final',
      player: 'mateo',
      rounds: 5,
      venue: 'THE OLD DOME',
      stakes: 'Light heavyweight championship of the world. Win and the company comes home. Lose and it\'s his. Mateo was twelve when he first mopped Ray\'s floor. Now the lights are on him and Ray\'s bucket is in his corner.',
      hook: 'MATEO VARGA  vs  1TON  /  LIGHT HEAVYWEIGHT TITLE',
    },
    talk: 'bucket',
  },
  {
    id: 'legacy',
    no: 16,
    title: 'THE TORCH',
    kicker: 'A CHAMPION HAS TO DECIDE WHAT KIND',
    blurb: 'Mateo has a belt, a building and a microphone in his face. He can call out the man who taught him to throw a jab, or he can defend what he just won. Han\'s knee is healed, and he\'s in the front row with his belt on his shoulder.',
    bg: 'cage',
    actions: 1,
    fights: [
      {
        id: 'han_legacy',
        name: 'THE TORCH',
        opponent: 'han',
        player: 'mateo',
        rounds: 5,
        venue: 'THE WAREHOUSE',
        stakes: 'Champion against champion, teacher against student, in the warehouse where they both learned to mop. Han is ninety-five overall and has lost once in his life. Mateo asked for this.',
        hook: 'MATEO VARGA  vs  HAN "THE PRIDE OF THE MARITIMES" TIBULAR',
        when: (save) => save.choices.ch_buyback === 'callout_han',
      },
      {
        id: 'defense',
        name: 'FIRST DEFENSE',
        opponent: 'cesar_rematch',
        player: 'mateo',
        rounds: 5,
        venue: 'THE OLD DOME',
        stakes: 'Cesar Rios made bail, made weight and made the number-one ranking. He wants the belt and the last word. Mateo wants to prove the belt wasn\'t a fluke.',
        hook: 'MATEO VARGA  vs  CESAR RIOS II  /  FIRST DEFENSE',
        when: (save) => save.choices.ch_buyback === 'defend_belt',
      },
    ],
    talk: 'bucket',
  },];

/** The length a story shows: the secret sixteenth chapter only counts once you are in it. */
export const MAIN_CHAPTERS = 15;

// ---------------------------------------------------------------- the clock

/** A day is an action: seven a week. */
export const DAYS_PER_WEEK = 7;
/** Weeks the story skips between chapters ("THREE MONTHS LATER"): the whole thing runs a few years. */
export const CHAPTER_GAP_WEEKS = 9;

/** How long each chapter lives, in weeks: a couple of months each. */
/** Every chapter is ten weeks: five parts of two weeks each. The first chapter is a short prologue. */
const CHAPTER_WEEKS: Record<string, number> = { back_row: 5 };
export const PARTS_PER_CHAPTER = 5;
/** Fights that are not on the chapter's last week (the crew: one name every few weeks). */
/** The early fight of a chapter is in part three (weeks 5-6); the crew's are a name a part. */
const FIGHT_WEEKS: Record<string, number> = {
  allstar_debut: 5, allstar_ranch: 5, han_intern: 5, oneton_rodeo: 5, oneton_prince: 5, han_brick2: 5, han_tyler: 10, moncton_undercard: 10, han_spadam: 5, zenith_prospect: 5, han_dos_caras: 10,
  warehouse_main: 5, camp_tuneup: 5, crew_duke: 4, crew_rico: 7, crew_cesar: 10,
};
STORY_CHAPTERS.forEach((ch, i) => {
  ch.no = i + 1;
  ch.weeks = CHAPTER_WEEKS[ch.id] ?? 10;
  for (const f of chapterFights(ch)) f.week = FIGHT_WEEKS[f.id] ?? ch.weeks;
});

/** Which part of the chapter this week is in (1..5). */
export function storyPart(save: StorySave): number {
  const w = chapterWeeks(storyChapter(save));
  return Math.min(PARTS_PER_CHAPTER, Math.max(1, Math.ceil((storyWeek(save) / w) * PARTS_PER_CHAPTER)));
}

/** The first week of a part. */
export const partWeek = (ch: StoryChapter, part: number): number => Math.floor(((part - 1) * chapterWeeks(ch)) / PARTS_PER_CHAPTER) + 1;

export const chapterWeeks = (ch: StoryChapter): number => ch.weeks ?? 6;
export const storyWeek = (save: StorySave): number => save.week ?? 1;

/** Is this fight's night here yet? */
export function fightDue(save: StorySave, def: StoryFightDef): boolean {
  return storyWeek(save) >= (def.week ?? chapterWeeks(storyChapter(save)));
}

/** The fight that has to happen before the week can end (it is fight week), or null. */
export function fightThisWeek(save: StorySave): StoryFightDef | null {
  const f = nextChapterFight(save);
  return f && fightDue(save, f) ? f : null;
}

/** "YEAR 2  /  MONTH 5": where the story is on the calendar. */
export function storyDate(save: StorySave): string {
  const w = save.totalWeeks ?? 0;
  return `YEAR ${Math.floor(w / 52) + 1}  /  MONTH ${Math.floor((w % 52) / 4.34) + 1}`;
}

/** End the week: the days left are rest. Fight week can't end until the fight has happened. */
export function endStoryWeek(save: StorySave): { ok: boolean; msg: string } {
  const ch = storyChapter(save);
  const due = fightThisWeek(save);
  if (due) return { ok: false, msg: `It is fight week. ${due.hook} has to happen before the week can end.` };
  if (storyWeek(save) >= chapterWeeks(ch)) return { ok: false, msg: 'This is the last week of the chapter. Finish what\'s left and move the story on.' };
  const rested = save.actionsLeft;
  save.week = storyWeek(save) + 1;
  save.totalWeeks = (save.totalWeeks ?? 0) + 1;
  save.actionsLeft = DAYS_PER_WEEK;
  save.fatigue = clamp(save.fatigue - 10 - rested * 3);
  addLog(save, `Week ${save.week - 1} done.${rested ? ` ${rested} day${rested === 1 ? '' : 's'} of rest.` : ''}`);
  return { ok: true, msg: `WEEK ${save.week} OF ${chapterWeeks(ch)}` };
}

// ---------------------------------------------------------------- training: tiers and grades

export type TrainTier = 'light' | 'full' | 'camp';
export const TRAIN_TIERS: Record<TrainTier, { days: number; xp: number; fatigue: number; label: string; blurb: string }> = {
  light: { days: 1, xp: 4, fatigue: 2, label: 'LIGHT', blurb: '1 day. Technique, shadowboxing, a lot of Ray talking.' },
  full: { days: 2, xp: 10, fatigue: 5, label: 'FULL', blurb: '2 days. Pads, drills, rounds. The real work.' },
  camp: { days: 3, xp: 17, fatigue: 9, label: 'CAMP', blurb: '3 days. Two-a-days. Ray makes extra soup.' },
};

/** The training card after Ray is gone: the gym is still his, the voice in it isn't. */
export function trainTierBlurb(save: StorySave, tier: TrainTier): string {
  if (!save.flags.rayDead) return TRAIN_TIERS[tier].blurb;
  const after: Record<TrainTier, string> = {
    light: '1 day. Technique, shadowboxing, Han talking from a stool with his knee in ice.',
    full: '2 days. Pads, drills, rounds. The real work. Nobody has to tell you to eat after.',
    camp: '3 days. Two-a-days. Somebody puts a pot on at six, and it isn\'t Ray.',
  };
  return after[tier];
}

/** Letter grades, from a drill you played or simmed. A sim scores 65%, a C. */
export type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
export const SIM_SCORE = 65;
export const GRADE_MULT: Record<Grade, number> = { S: 1.7, A: 1.4, B: 1.18, C: 1, D: 0.7, F: 0.4 };
export function gradeFor(pct: number): Grade {
  return pct >= 95 ? 'S' : pct >= 85 ? 'A' : pct >= 75 ? 'B' : pct >= 60 ? 'C' : pct >= 45 ? 'D' : 'F';
}
/**
 * Level 1 costs 30 xp and every level after costs a little more (level 10 is 64 on its own, 637 in
 * all): fifteen chapters is a long time, and the last levels should take most of it.
 */
export const XP_PER_LEVEL = 30;
/** Total xp to reach a level. */
export const xpForLevel = (lv: number): number => Math.round(XP_PER_LEVEL * lv + 3.75 * lv * (lv - 1));
/** The level a total buys (0..10). */
export const levelForXp = (xp: number): number => {
  let lv = 0;
  while (lv < 10 && xp >= xpForLevel(lv + 1)) lv++;
  return lv;
};

const xpKey = (who: 'oneton' | 'corner', track: string): string => `${who}.${track}`;

/** Bank xp on a track and bring the level (what the fighter builders read) up to date. */
function addXp(save: StorySave, who: 'oneton' | 'corner', track: OneTonTrack, xp: number): { before: number; after: number } {
  save.xp ??= {};
  const key = xpKey(who, track);
  const tr = (who === 'oneton' ? save.training : save.daneTraining) as unknown as Record<string, number>;
  const before = tr[track] ?? 0;
  // old saves: their levels count as banked xp
  save.xp[key] = Math.max(save.xp[key] ?? 0, xpForLevel(before)) + xp;
  const after = Math.max(before, levelForXp(save.xp[key]));
  if (track in tr) tr[track] = after;
  return { before, after };
}

/** One training session: a tier (days), a track and the grade the drill came out at. */
export function trainSession(save: StorySave, who: 'oneton' | 'corner', track: OneTonTrack, tier: TrainTier, grade: Grade): string {
  if (who === 'oneton' && onetonTurned(save)) return '1ton is with Zenith now. The only camp you can work is the corner.';
  const t = TRAIN_TIERS[tier];
  if (!canAct(save, t.days)) return `Not enough days left this week: a ${t.label} session takes ${t.days}.`;
  if (who === 'corner' && track === 'media') track = 'cardio';
  const xp = Math.round(t.xp * GRADE_MULT[grade]);
  const { before, after } = addXp(save, who, track, xp);
  save.actionsLeft -= t.days;
  save.fatigue = clamp(save.fatigue + t.fatigue);
  const name = who === 'oneton' ? '1TON' : cornerName(save);
  if (who === 'oneton') {
    save.ego = clamp(save.ego + (track === 'media' ? 3 : 1));
    save.trust = clamp(save.trust + (grade === 'S' || grade === 'A' ? 2 : 1));
  } else save.trust = clamp(save.trust + 1);
  addLog(save, `${name} ${t.label.toLowerCase()} ${track}: grade ${grade}, +${xp} xp.${after > before ? ` Level ${after}.` : ''}`);
  return `${name} ${track.toUpperCase()}  /  GRADE ${grade}  /  +${xp} XP${after > before ? `  /  LV ${before} > ${after}` : ''}`;
}

/** A sparring session (2 days): every physical track gets the work, graded on how the spar went. */
/** The moves this man has earned (the corner's camp shares them: Ray taught both). */
export const movesOf = (save: StorySave, who: 'oneton' | 'corner'): string[] => save.moves?.[who] ?? [];

/** A good spar (B or better) teaches the next special move on the list. Returns its id, or null. */
function learnMove(save: StorySave, who: 'oneton' | 'corner', grade: Grade): string | null {
  if (grade !== 'S' && grade !== 'A' && grade !== 'B') return null;
  const have = movesOf(save, who);
  const next = SPECIAL_MOVES.find((m) => !have.includes(m.id));
  if (!next) return null;
  save.moves ??= {};
  save.moves[who] = [...have, next.id];
  return next.id;
}

export function sparSession(save: StorySave, who: 'oneton' | 'corner', grade: Grade): string {
  if (who === 'oneton' && onetonTurned(save)) return '1ton is with Zenith now. The only camp you can work is the corner.';
  if (!canAct(save, 2)) return 'Sparring takes 2 days. Not enough left this week.';
  const xp = Math.round(7 * GRADE_MULT[grade]);
  const ups: string[] = [];
  for (const track of ['striking', 'grappling', 'cardio'] as const) {
    const { before, after } = addXp(save, who, track, xp);
    if (after > before) ups.push(`${track.toUpperCase()} ${after}`);
  }
  save.actionsLeft -= 2;
  save.fatigue = clamp(save.fatigue + 7);
  save.trust = clamp(save.trust + 2);
  const name = who === 'oneton' ? '1TON' : cornerName(save);
  const learned = learnMove(save, who, grade);
  const move = learned ? SPECIAL_MOVES.find((m) => m.id === learned)! : null;
  const room = save.flags.rayDead ? 'the warehouse' : "Ray's";
  const ref = save.flags.rayDead ? 'Han reffed from a stool and made everyone shake hands after.' : 'Ray reffed and made everyone shake hands after.';
  addLog(save, `${name} sparred at ${room}. Grade ${grade}. ${ref}${move ? ` ${save.flags.rayDead ? 'Han' : 'Ray'} showed him the ${move.name}.` : ''}`);
  return `${name} SPAR  /  GRADE ${grade}  /  +${xp} XP x3${ups.length ? `  /  ${ups.join(', ')}` : ''}${move ? `  /  NEW MOVE: ${move.name.toUpperCase()}` : ''}`;
}

/** A day off: the body heals, and Ray feeds you. */
export function restDay(save: StorySave): string {
  if (!canAct(save, 1)) return 'No days left this week.';
  save.actionsLeft--;
  save.fatigue = clamp(save.fatigue - 14);
  addLog(save, save.flags.rayDead
    ? 'A day off. Han made the soup Marie\'s way, burned the first pot, and made everybody eat two bowls anyway.'
    : 'A day off. Ray made the soup Marie\'s way and made everybody eat two bowls.');
  return 'REST  /  FATIGUE -14';
}

/**
 * The story between the fights: scenes that play when their week of the chapter comes round.
 * Each chapter is a couple of months, so things happen in the middle of it.
 */
export const STORY_BEATS: { id: string; chapter: string; week: number }[] = [
  { id: 'first_day', chapter: 'mexican_math', week: 1 },
  { id: 'xavier_league', chapter: 'mexican_math', week: 3 },
  { id: 'soup_lesson', chapter: 'brick_by_brick', week: 5 },
  { id: 'mop_years', chapter: 'sparring_partner', week: 3 },
  { id: 'dane_contract', chapter: 'audit', week: 3 },
  { id: 'tower_photo', chapter: 'audit', week: 7 },
  { id: 'last_dinner', chapter: 'brother', week: 5 },
  { id: 'tuesday_class', chapter: 'street_justice', week: 5 },
  { id: 'true_name', chapter: 'the_camp', week: 7 },
];

/** The beat waiting to play this week, if any. */
export function dueBeat(save: StorySave): string | null {
  const ch = storyChapter(save);
  return STORY_BEATS.find((b) => b.chapter === ch.id && b.week <= storyWeek(save) && !save.flags[`beat_${b.id}`])?.id ?? null;
}

/** Has this chapter's talk happened (the story will not move on without it)? */
export const talkedThisChapter = (save: StorySave): boolean => !!save.flags[`talk_${storyChapter(save).id}`];

export function storyChapter(save: StorySave): StoryChapter {
  return STORY_CHAPTERS[Math.max(0, Math.min(STORY_CHAPTERS.length - 1, save.chapter))];
}

// ---------------------------------------------------------------- save

export function newStorySave(seed: number): StorySave {
  const s = Math.abs(Math.floor(seed)) >>> 0;
  const now = Date.now();
  return {
    version: STORY_VERSION,
    seed: s,
    chapter: 0,
    actionsLeft: DAYS_PER_WEEK,
    week: 1,
    totalWeeks: 0,
    xp: {},
    trust: 44,
    brand: 26,
    heat: 6,
    ego: 8,
    cash: 24000,
    fatigue: 0,
    training: { striking: 0, grappling: 0, cardio: 0, media: 0 },
    daneTraining: { striking: 0, grappling: 0, cardio: 0 },
    fights: [],
    choices: {},
    flags: {},
    log: ['The CBFC is gone. The warehouse has a cage. The reporter in the back row has a notebook.'],
    status: 'hub',
    ending: null,
    startedAt: now,
    updatedAt: now,
    playerName: 'Dane Whyte',
    stats: {
      sideFights: 0, sideWins: 0, sideLosses: 0, kos: 0, subs: 0, decisions: 0,
      catches: 0, missed: 0, wrongFlags: 0, goodDeals: 0, badDeals: 0, walked: 0,
      pressers: 0, earnings: 0,
    },
  };
}

/** Older saves (before side shows and contract reviews) still load. */
export function migrateStorySave(save: StorySave): StorySave {
  save.fatigue ??= 0;
  // saves from before the weekly clock: they start the current chapter's first week
  if (save.week === undefined) {
    save.week = 1;
    save.actionsLeft = DAYS_PER_WEEK;
  }
  save.totalWeeks ??= save.chapter * 14;
  save.xp ??= {};
  save.stats ??= {
    sideFights: 0, sideWins: 0, sideLosses: 0, kos: 0, subs: 0, decisions: 0,
    catches: 0, missed: 0, wrongFlags: 0, goodDeals: 0, badDeals: 0, walked: 0,
    pressers: 0, earnings: 0,
  };
  save.stats.sideFights ??= 0;
  save.stats.sideWins ??= 0;
  save.stats.sideLosses ??= 0;
  save.stats.kos ??= 0;
  save.stats.subs ??= 0;
  save.stats.decisions ??= 0;
  save.stats.catches ??= 0;
  save.stats.missed ??= 0;
  save.stats.wrongFlags ??= 0;
  save.stats.goodDeals ??= 0;
  save.stats.badDeals ??= 0;
  save.stats.walked ??= 0;
  save.stats.pressers ??= 0;
  save.stats.earnings ??= 0;
  return save;
}

function touch(save: StorySave): void {
  save.updatedAt = Date.now();
}

function addLog(save: StorySave, line: string): void {
  save.log.unshift(line);
  if (save.log.length > 60) save.log.length = 60;
  touch(save);
}

// ---------------------------------------------------------------- authored fighters

const hex = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

function baseFighter(id: string, division: string, tier: 'prospect' | 'journeyman' | 'gatekeeper' | 'contender' | 'elite'): Fighter {
  const c = content();
  const rng = Rng.fromSeed(hex(id) ^ 0x51ed270b);
  const f = generateFighter(rng, c.names, { division, tier, id });
  f.id = id;
  f.status = 'active';
  f.promotion = 'us';
  f.contract = null;
  f.injuries = [];
  f.legal = 'free';
  f.wounds = { cuts: 0, blackEye: 0, swelling: 0, bandages: 0, noseBleed: false };
  f.storyHistory = {};
  f.careerLog = [];
  return f;
}

/** A generated body with an authored face, name and set of numbers on top. */
export function authored(
  id: string,
  division: string,
  tier: 'prospect' | 'journeyman' | 'gatekeeper' | 'contender' | 'elite',
  o: {
    first: string;
    last: string;
    nick: string;
    country: string;
    hometown: string;
    age: number;
    height: number;
    reach: number;
    skills: Partial<Skills>;
    styles: string[];
    traits: string[];
    record: { w: number; l: number; d: number; nc: number };
    look?: Partial<Look>;
    gender?: 'M' | 'W';
  },
): Fighter {
  const f = baseFighter(id, division, tier);
  f.first = o.first;
  f.last = o.last;
  f.nick = o.nick;
  f.country = o.country;
  f.hometown = o.hometown;
  f.age = o.age;
  f.height = o.height;
  f.reach = o.reach;
  f.gender = o.gender ?? 'M';
  f.division = division;
  f.skills = { ...f.skills, ...o.skills };
  f.styles = o.styles;
  f.traits = o.traits;
  f.record = o.record;
  f.look = { ...f.look, ...(o.look ?? {}) };
  f.gym = "Ray's Boxing & Soup";
  f.coach = 'Uncle Ray';
  f.manager = 'self';
  f.potential = Math.max(f.potential, overall(f.skills) + 6);
  f.morale = 70;
  f.loyalty = 65;
  f.hype = 30;
  f.starPower = 30;
  f.damage = 8;
  f.streak = Math.max(0, o.record.w - o.record.l);
  return f;
}

const skill = (v: number): number => clamp(Math.round(v), 10, 99);

/** A tired fighter is a slower fighter: fatigue shaves the physical skills, never the weight cut. */
function applyFatigue(f: Fighter, save: StorySave): Fighter {
  const t = Math.round(clamp(save.fatigue ?? 0, 0, 100) * 0.11);
  if (t > 0) {
    f.skills.striking = skill(f.skills.striking - t);
    f.skills.wrestling = skill(f.skills.wrestling - t);
    f.skills.grappling = skill(f.skills.grappling - t);
    f.skills.cardio = skill(f.skills.cardio - t);
    f.skills.durability = skill(f.skills.durability - Math.round(t * 0.5));
    f.skills.fightIQ = skill(f.skills.fightIQ - Math.round(t * 0.4));
  }
  return f;
}

/**
 * The gold pen is chapter seven. From the next chapter on, 1ton is Zenith's fighter: the player
 * corners him when the story asks, but cannot train or spar him any more. His card is written by
 * the story from here, not by what the player did with him before he left.
 */
const ONETON_SIGNING_CHAPTER = Math.max(0, STORY_CHAPTERS.findIndex((c) => c.id === 'the_signing'));
export function onetonTurned(save: StorySave): boolean {
  return save.chapter > ONETON_SIGNING_CHAPTER;
}

/** The man Zenith builds after the signing: 80 when he walks out, 90 by the title fight. */
const ONETON_TURNED_OVR = [80, 81, 82, 84, 86, 88, 89, 90, 90];

/**
 * Put a fighter's overall exactly on a number. The skills keep their shape, then the rounded
 * overall is nudged to the target one point at a time. Used for 1ton after the signing, when the
 * story owns his development instead of the player.
 */
function setOverall(sk: Skills, target: number): void {
  const keys = (Object.keys(SKILL_WEIGHTS) as (keyof Skills)[]).filter((k) => k !== 'weightCut');
  const start = overall(sk);
  if (start === target) return;
  const delta = target - start;
  for (const k of keys) sk[k] = skill(sk[k] + delta);
  let guard = 0;
  while (overall(sk) !== target && guard++ < 500) {
    const step = overall(sk) < target ? 1 : -1;
    let pick: keyof Skills | null = null;
    let weight = 0;
    for (const k of keys) {
      if (step > 0 && sk[k] >= 99) continue;
      if (step < 0 && sk[k] <= 10) continue;
      if (SKILL_WEIGHTS[k] > weight) {
        weight = SKILL_WEIGHTS[k];
        pick = k;
      }
    }
    if (!pick) break;
    sk[pick] = skill(sk[pick] + step);
  }
}

export function buildOneTon(save: StorySave, final = false): Fighter {
  const t = save.training;
  const f = authored('story_oneton', 'middle', 'contender', {
    // the name on his press pass. His real one is Alberto Del Burrito (the truth comes out in chapter fourteen).
    first: 'Gordo',
    last: 'Fuente',
    nick: '1ton',
    country: 'Mexico',
    hometown: 'Guadalajara, Jalisco',
    // a champion of Mexico fifteen years ago, a sportswriter for twelve
    age: 38,
    height: 185,
    reach: 190,
    skills: {
      striking: skill(52 + t.striking * 4.6 + save.chapter * 0.8),
      power: skill(48 + t.striking * 3.8 + t.cardio * 1.1 + save.ego * 0.06),
      wrestling: skill(44 + t.grappling * 4.8),
      grappling: skill(43 + t.grappling * 4.9 + t.cardio * 0.8),
      cardio: skill(50 + t.cardio * 5.8 + save.chapter * 0.7),
      chin: skill(50 + t.cardio * 2.2 + t.striking * 0.9 + save.trust * 0.06),
      fightIQ: skill(47 + t.media * 2.6 + t.grappling * 1.1 + t.striking * 1.1 + save.chapter * 1.2 - save.ego * 0.09),
      durability: skill(48 + t.cardio * 3.1 + t.striking * 0.9),
      heart: skill(54 + save.trust * 0.22 + t.cardio * 1.1),
      weightCut: 36,
    },
    styles: ['Pressure Striker', 'Brawler'],
    traits: ['Showman', 'Trash Talker', 'Loyal', 'Clout Chaser'],
    record: { w: 2 + t.striking + t.grappling, l: Math.min(4, save.fights.filter((x) => x.player === 'oneton' && x.result === 'L').length), d: 0, nc: 0 },
    look: {
      skin: 3,
      hair: 1,
      hairColor: 0,
      beard: 3,
      brows: 1,
      nose: 1,
      ears: 0,
      scar: 1,
      tattoo: 2,
      build: 2,
      glasses: 0,
    },
  });
  if (final || save.chapter >= 5) f.marquee = { archetype: 'Homegrown Star', arc: 'rise' };
  if (final) f.division = 'lightheavy';
  f.starPower = clamp(24 + save.ego + save.chapter * 5, 20, 95);
  f.hype = clamp(f.starPower - 6, 10, 95);
  f.potential = 96;
  if (final) {
    // the man you trained is not the man you met. He is also not a monster yet.
    if (save.trust >= 62) {
      f.skills.striking = skill(f.skills.striking - 4);
      f.skills.fightIQ = skill(f.skills.fightIQ - 3);
    }
    if (save.ego >= 70) {
      f.skills.power = skill(f.skills.power + 4);
      f.skills.fightIQ = skill(f.skills.fightIQ - 2);
    }
    f.record = {
      w: 8 + save.fights.filter((x) => x.player === 'oneton' && x.result === 'W').length,
      l: save.fights.filter((x) => x.player === 'oneton' && x.result === 'L').length,
      d: 0,
      nc: 0,
    };
  }
  const out = applyFatigue(f, save);
  if (onetonTurned(save)) {
    const i = Math.min(ONETON_TURNED_OVR.length - 1, Math.max(0, save.chapter - ONETON_SIGNING_CHAPTER - 1));
    setOverall(out.skills, ONETON_TURNED_OVR[i]);
  }
  return out;
}

/**
 * Han "The Pride Of The Maritimes" Tibular, from game one's Road To Champion: Uncle Ray's nephew,
 * the kid from Moncton who beat Spadam Biggs. Years later he is the CBFC middleweight champion at
 * the very top of his career (95 overall), and he walks out on Zenith to fight for the warehouse.
 * The corner's camp (save.daneTraining, a name kept for old saves) is his until chapter ten.
 * `boss`: the secret chapter's Han, healed, rested and not in a giving mood.
 */
export function buildHan(save: StorySave, boss = false): Fighter {
  const d = save.daneTraining;
  const top = (v: number): number => skill(v + (boss ? 1 : 0));
  const f = authored(boss ? 'story_han_boss' : 'story_han', 'middle', 'elite', {
    first: HAN.first,
    last: HAN.last,
    nick: HAN.nick,
    country: HAN.country,
    hometown: HAN.hometown,
    age: 29,
    height: HAN.height,
    reach: HAN.reach,
    skills: {
      striking: top(95 + d.striking * 0.4),
      power: top(93 + d.striking * 0.3),
      wrestling: top(94 + d.grappling * 0.3),
      grappling: top(94 + d.grappling * 0.4),
      cardio: top(95 + d.cardio * 0.4),
      chin: top(95),
      fightIQ: top(97),
      durability: top(95 + d.cardio * 0.2),
      heart: 99,
      weightCut: 44,
    },
    styles: ['Counter Striker', 'Pressure Striker'],
    traits: ['Hungry', 'Loyal', 'Mentor'],
    record: { w: 30, l: 1, d: 0, nc: 0 },
    // years on: the long waves are a bun now, the sides faded down, the koi and the chain still there
    look: { ...HAN.look, hair: 7, fade: 1, beard: 2, scar: 1 },
  });
  f.coach = 'Uncle Ray';
  f.starPower = 94;
  f.hype = 90;
  f.potential = 97;
  return boss ? f : applyFatigue(f, save);
}

/**
 * Mateo Varga, grown: the twelve-year-old in the hoodie from game one, now twenty-one, a light
 * heavyweight, jacked and inked to the knuckles. He takes over the corner's camp in chapter ten.
 */
export function buildMateoGrown(save: StorySave): Fighter {
  const d = save.daneTraining;
  const f = authored('story_mateo_lhw', 'lightheavy', 'contender', {
    first: 'Mateo',
    last: 'Varga',
    nick: 'The Soup Line',
    country: 'Canada',
    hometown: 'Moncton, New Brunswick',
    age: 21,
    height: 188,
    reach: 196,
    skills: {
      striking: skill(80 + d.striking * 1.2 + save.chapter * 0.4),
      power: skill(84 + d.striking * 0.8),
      wrestling: skill(76 + d.grappling * 1.2),
      grappling: skill(82 + d.grappling * 1.2),
      cardio: skill(82 + d.cardio * 1.3),
      chin: skill(80 + d.cardio * 0.5),
      fightIQ: skill(76 + save.chapter * 0.6),
      durability: skill(80 + d.cardio * 0.6),
      heart: skill(88 + save.trust * 0.08),
      weightCut: 38,
    },
    styles: ['Pressure Striker', 'Sub Hunter'],
    traits: ['Loyal', 'Hungry', 'Gym Rat'],
    record: { w: 12 + save.fights.filter((x) => x.player === 'mateo' && x.result === 'W').length, l: 1, d: 0, nc: 0 },
    // jacked and tatted: the heaviest frame, full sleeves and a chest piece, a scar from the street
    look: { skin: 2, hair: 1, hairColor: 0, beard: 1, brows: 1, nose: 1, ears: 1, scar: 1, tattoo: 3, build: 2, chain: 1, inkArt: 1 },
  });
  f.coach = 'Han Tibular';
  f.starPower = clamp(40 + save.brand * 0.4, 30, 90);
  f.hype = clamp(f.starPower, 20, 90);
  f.potential = 96;
  return applyFatigue(f, save);
}

/** Who the corner's camp is building right now: Han, until his knee goes in chapter ten. */
export function cornerKey(save: StorySave): 'han' | 'mateo' {
  return save.flags.hanInjured ? 'mateo' : 'han';
}

export function cornerFighter(save: StorySave): Fighter {
  return cornerKey(save) === 'han' ? buildHan(save) : buildMateoGrown(save);
}

export function cornerName(save: StorySave): string {
  return cornerKey(save) === 'han' ? 'HAN' : 'MATEO';
}

function buildCuchillo(save: StorySave, rematch = false): Fighter {
  const boost = rematch ? 6 : 0;
  const f = authored(rematch ? 'story_cuchillo_2' : 'story_cuchillo', rematch ? 'lightheavy' : 'middle', rematch ? 'contender' : 'gatekeeper', {
    first: 'El',
    last: 'Cuchillo',
    nick: 'The Knife',
    country: 'Mexico',
    hometown: 'Tijuana, Baja California',
    age: rematch ? 34 : 33,
    height: rematch ? 188 : 178,
    reach: rematch ? 193 : 183,
    skills: {
      striking: skill(63 + boost + save.chapter * 0.4),
      power: skill(69 + boost),
      wrestling: skill(53 + boost * 0.4),
      grappling: skill(56 + boost * 0.4),
      cardio: skill(62 + boost * 0.6),
      chin: skill(57 + boost * 0.5),
      fightIQ: skill(60 + boost + save.chapter * 0.3),
      durability: skill(58 + boost * 0.4),
      heart: skill(62 + boost * 0.5),
      weightCut: 46,
    },
    styles: ['Kickboxer', 'Showboat'],
    traits: ['Showman', 'Hothead', 'Trash Talker'],
    record: rematch ? { w: 24, l: 4, d: 0, nc: 0 } : { w: 19, l: 4, d: 0, nc: 0 },
    look: {
      skin: 3,
      hair: 0,
      hairColor: 0,
      beard: 4,
      brows: 1,
      nose: 1,
      ears: 0,
      scar: 2,
      tattoo: 3,
      build: rematch ? 2 : 1,
      mask: 0xc8202a,
    },
  });
  f.manager = rematch ? 'Lenny Pratt' : 'self';
  f.promotion = rematch ? 'zenith' : 'free-agent';
  f.starPower = rematch ? 62 : 44;
  // the rematch is chapter thirteen: a Zenith camp, a weight class up, and a real step for Mateo
  if (rematch) setOverall(f.skills, 80);
  return f;
}

function buildMateo(save: StorySave, betrayal = false): Fighter {
  const boost = betrayal ? 5 : -4;
  const f = authored(betrayal ? 'story_mateo_2' : 'story_mateo', 'welter', betrayal ? 'contender' : 'journeyman', {
    first: 'Mateo',
    last: 'Varga',
    nick: 'The Soup Line',
    country: 'Canada',
    hometown: 'Moncton, New Brunswick',
    age: 19,
    height: 178,
    reach: 181,
    skills: {
      striking: skill(58 + boost + save.chapter * 0.3),
      power: skill(55 + boost * 0.6),
      wrestling: skill(54 + boost * 0.5),
      grappling: skill(58 + boost * 0.6),
      cardio: skill(68 + boost * 0.5),
      chin: skill(54 + boost * 0.4),
      fightIQ: skill(60 + boost * 0.4),
      durability: skill(56 + boost * 0.4),
      heart: skill(67 + boost * 0.4),
      weightCut: 33,
    },
    styles: ['Pressure Striker', 'Sub Hunter'],
    traits: ['Loyal', 'Wholesome', 'Gym Rat'],
    record: betrayal ? { w: 9, l: 1, d: 0, nc: 0 } : { w: 6, l: 1, d: 0, nc: 0 },
    look: {
      skin: 2,
      hair: 1,
      hairColor: 0,
      beard: 0,
      brows: 0,
      nose: 0,
      ears: 0,
      scar: 0,
      tattoo: 0,
      build: 0,
    },
  });
  if (!betrayal) {
    // a sparring session: pull the power so nobody leaves in an ambulance
    f.skills.power = skill(f.skills.power - 12);
    f.skills.striking = skill(f.skills.striking - 4);
  }
  f.potential = 94;
  f.starPower = betrayal ? 48 : 28;
  return f;
}

function buildBrick(save: StorySave): Fighter {
  const f = authored('story_brick', 'heavy', 'gatekeeper', {
    first: 'Brick',
    last: 'Bastion',
    nick: 'The Wrecking Ball',
    country: 'USA',
    hometown: 'Gary, Indiana',
    age: 36,
    height: 196,
    reach: 201,
    skills: {
      striking: skill(71 + save.chapter * 0.2),
      power: 86,
      wrestling: 64,
      grappling: 54,
      cardio: 42,
      chin: 82,
      fightIQ: 48,
      durability: 84,
      heart: 54,
      weightCut: 72,
    },
    styles: ['Brawler', 'Ground & Pound'],
    traits: ['Hothead', 'Gym Rat', 'Mercenary'],
    record: { w: 21, l: 9, d: 0, nc: 0 },
    look: {
      skin: 1,
      hair: 0,
      hairColor: 0,
      beard: 3,
      brows: 1,
      nose: 2,
      ears: 3,
      scar: 2,
      tattoo: 2,
      build: 2,
    },
  });
  f.manager = 'Gordon Vance';
  f.starPower = 38;
  return f;
}

function buildAuditor(save: StorySave): Fighter {
  const f = authored('story_auditor', 'lightheavy', 'contender', {
    first: 'The',
    last: 'Auditor',
    nick: 'Compliance',
    country: 'USA',
    hometown: 'Wilmington, Delaware',
    age: 38,
    height: 188,
    reach: 191,
    skills: {
      striking: skill(67 + save.chapter * 0.3),
      power: 59,
      wrestling: 73,
      grappling: 71,
      cardio: 75,
      chin: 64,
      fightIQ: 88,
      durability: 66,
      heart: 58,
      weightCut: 44,
    },
    styles: ['Point Fighter', 'Counter Striker'],
    traits: ['Perfectionist', 'Paranoid', 'Mercenary'],
    record: { w: 12, l: 2, d: 0, nc: 0 },
    look: {
      skin: 0,
      hair: 0,
      hairColor: 0,
      beard: 0,
      brows: 0,
      nose: 0,
      ears: 0,
      scar: 0,
      tattoo: 0,
      build: 1,
      glasses: 1,
    },
  });
  f.manager = 'Lenny Pratt';
  f.promotion = 'zenith';
  f.starPower = 36;
  return f;
}

function buildChairman(save: StorySave): Fighter {
  const f = authored('story_chairman', 'heavy', 'elite', {
    first: 'The',
    last: 'Chairman',
    nick: 'The Legacy Asset',
    country: 'USA',
    hometown: 'Greenwich, Connecticut',
    age: 41,
    height: 203,
    reach: 208,
    skills: {
      striking: skill(74 + save.chapter * 0.25),
      power: 90,
      wrestling: 79,
      grappling: 66,
      cardio: 47,
      chin: 88,
      fightIQ: 61,
      durability: 87,
      heart: 59,
      weightCut: 78,
    },
    styles: ['Brawler', 'Wrestler'],
    traits: ['Business Savvy', 'Diva', 'Mercenary'],
    record: { w: 16, l: 3, d: 0, nc: 0 },
    look: {
      skin: 1,
      hair: 0,
      hairColor: 0,
      beard: 2,
      brows: 2,
      nose: 2,
      ears: 2,
      scar: 1,
      tattoo: 3,
      build: 2,
    },
  });
  f.manager = 'Verity Kane';
  f.promotion = 'zenith';
  f.starPower = 66;
  return f;
}

function buildDuke(save: StorySave): Fighter {
  const f = authored('story_duke', 'lightheavy', 'contender', {
    first: 'Duke',
    last: 'Kessler',
    nick: 'The Door',
    country: 'USA',
    hometown: 'Bakersfield, CA',
    age: 34,
    height: 196,
    reach: 198,
    skills: {
      striking: skill(61 + save.chapter * 0.2),
      power: 68,
      wrestling: 72,
      grappling: 63,
      cardio: 55,
      chin: 73,
      fightIQ: 49,
      durability: 75,
      heart: 46,
      weightCut: 48,
    },
    styles: ['Wrestler', 'Brawler'],
    traits: ['Hothead', 'Mercenary', 'Gym Rat'],
    record: { w: 14, l: 6, d: 0, nc: 0 },
    look: {
      skin: 1,
      hair: 0,
      hairColor: 0,
      beard: 2,
      brows: 2,
      nose: 2,
      ears: 3,
      scar: 2,
      tattoo: 1,
      build: 2,
    },
  });
  f.manager = 'Gordo "1ton" Fuente';
  f.promotion = 'zenith';
  f.starPower = 39;
  return f;
}

function buildRico(save: StorySave): Fighter {
  const f = authored('story_rico', 'lightheavy', 'contender', {
    first: 'Rico',
    last: 'Alvarez',
    nick: 'Payphone',
    country: 'USA',
    hometown: 'Paterson, NJ',
    age: 31,
    height: 185,
    reach: 188,
    skills: {
      striking: skill(66 + save.chapter * 0.25),
      power: 61,
      wrestling: 54,
      grappling: 57,
      cardio: 73,
      chin: 56,
      fightIQ: 67,
      durability: 59,
      heart: 61,
      weightCut: 42,
    },
    styles: ['Counter Striker', 'Point Fighter'],
    traits: ['Trash Talker', 'Party Animal', 'Mercenary'],
    record: { w: 16, l: 8, d: 0, nc: 0 },
    look: {
      skin: 3,
      hair: 2,
      hairColor: 1,
      beard: 1,
      brows: 1,
      nose: 1,
      ears: 0,
      scar: 1,
      tattoo: 3,
      build: 1,
      chain: 1,
    },
  });
  f.manager = 'Gordo "1ton" Fuente';
  f.promotion = 'zenith';
  f.starPower = 34;
  return f;
}

function buildCesar(save: StorySave): Fighter {
  const f = authored('story_cesar', 'lightheavy', 'elite', {
    first: 'Cesar',
    last: 'Rios',
    nick: 'La Mano',
    country: 'Mexico',
    hometown: 'Ciudad Juárez, Chihuahua',
    age: 35,
    height: 191,
    reach: 194,
    skills: {
      striking: skill(72 + save.chapter * 0.3),
      power: 79,
      wrestling: 58,
      grappling: 61,
      cardio: 64,
      chin: 69,
      fightIQ: 75,
      durability: 67,
      heart: 55,
      weightCut: 51,
    },
    styles: ['Kickboxer', 'Counter Striker'],
    traits: ['Perfectionist', 'Showman', 'Mercenary'],
    record: { w: 21, l: 3, d: 0, nc: 0 },
    look: {
      skin: 4,
      hair: 0,
      hairColor: 0,
      beard: 1,
      brows: 2,
      nose: 2,
      ears: 1,
      scar: 2,
      tattoo: 2,
      build: 2,
    },
  });
  f.manager = 'Gordo "1ton" Fuente';
  f.promotion = 'zenith';
  f.starPower = 57;
  return f;
}

/** The fighters the chapters book between the big ones: Xavier's barn, Zenith's prospects, a masked man. */
const GUESTS: Record<string, { div: string; tier: 'journeyman' | 'gatekeeper' | 'contender' | 'elite'; first: string; last: string; nick: string; country: string; hometown: string; age: number; height: number; reach: number; styles: string[]; traits: string[]; rec: [number, number]; look: Partial<Look>; boost: number }> = {
  dusty: { div: 'middle', tier: 'journeyman', first: 'Dusty', last: 'Cole', nick: 'The Rodeo', country: 'USA', hometown: 'Amarillo, Texas', age: 33, height: 183, reach: 185, styles: ['Brawler'], traits: ['Showman'], rec: [6, 5], look: { hair: 2, beard: 2, hat: 1, build: 1, tattoo: 1 }, boost: -8 },
  buck: { div: 'middle', tier: 'gatekeeper', first: 'Buck', last: 'Harlan', nick: 'Two Hats', country: 'USA', hometown: 'Tulsa, Oklahoma', age: 35, height: 185, reach: 188, styles: ['Wrestler', 'Grinder'], traits: ['Veteran'], rec: [14, 6], look: { hair: 0, beard: 3, build: 2, scar: 1 }, boost: -2 },
  tyler: { div: 'light', tier: 'contender', first: 'Tyler', last: 'Vance', nick: 'Trust Fund', country: 'Canada', hometown: 'Moncton, New Brunswick (the nice part)', age: 30, height: 178, reach: 182, styles: ['Counter Striker'], traits: ['Showman', 'Loyal'], rec: [24, 4], look: { hair: 3, hairColor: 3, beard: 0, build: 1 }, boost: 8 },
  toro: { div: 'middle', tier: 'gatekeeper', first: 'Rafa', last: 'Medina', nick: 'El Toro', country: 'Mexico', hometown: 'Tijuana, Baja California', age: 31, height: 182, reach: 186, styles: ['Pressure Striker'], traits: ['Hungry'], rec: [15, 4], look: { hair: 11, beard: 1, build: 2, tattoo: 2 }, boost: 0 },
  spadam: { div: 'welter', tier: 'elite', first: 'Spadam', last: 'Biggs', nick: 'The White Beast', country: 'USA', hometown: 'Halifax (he says Boston)', age: 31, height: 201, reach: 208, styles: ['Kickboxer', 'Pressure Striker'], traits: ['Showman', 'Trash Talker'], rec: [27, 1], look: { hair: 12, hairColor: 4, beard: 0, build: 2, tattoo: 1 }, boost: 10 },
  synergy: { div: 'middle', tier: 'contender', first: 'Kyle', last: 'Brandt', nick: 'Synergy', country: 'USA', hometown: 'Scottsdale, Arizona', age: 26, height: 186, reach: 190, styles: ['Point Fighter'], traits: ['Clout Chaser'], rec: [11, 0], look: { hair: 12, hairColor: 4, beard: 0, build: 1 }, boost: 4 },
  intern: { div: 'middle', tier: 'gatekeeper', first: 'Brock', last: 'Hale', nick: 'The Intern', country: 'USA', hometown: 'Greenwich, Connecticut', age: 29, height: 186, reach: 188, styles: ['Wrestler', 'Grinder'], traits: ['Clout Chaser'], rec: [12, 3], look: { hair: 12, hairColor: 2, beard: 0, build: 1 }, boost: 2 },
  prince: { div: 'middle', tier: 'contender', first: 'Nico', last: 'Sandoval', nick: 'The Prince', country: 'Mexico', hometown: 'Polanco, Mexico City', age: 25, height: 184, reach: 189, styles: ['Counter Striker', 'Kickboxer'], traits: ['Showman'], rec: [14, 0], look: { hair: 11, hairColor: 0, beard: 0, build: 1, chain: 1 }, boost: 6 },
  ranch: { div: 'middle', tier: 'journeyman', first: 'Wade', last: 'Pruitt', nick: 'The Ranch Hand', country: 'USA', hometown: 'Cheyenne, Wyoming', age: 30, height: 188, reach: 190, styles: ['Wrestler'], traits: ['Hungry'], rec: [9, 3], look: { hair: 10, beard: 2, build: 2, hat: 1 }, boost: -5 },
  lobster: { div: 'middle', tier: 'gatekeeper', first: 'Luc', last: 'Arsenault', nick: 'The Lobster', country: 'Canada', hometown: 'Shediac, New Brunswick', age: 32, height: 183, reach: 186, styles: ['Brawler'], traits: ['Loyal'], rec: [13, 5], look: { hair: 1, beard: 3, build: 2, tattoo: 1 }, boost: 0 },
  croc: { div: 'lightheavy', tier: 'contender', first: 'Jarrah', last: 'Kane', nick: 'The Croc', country: 'Australia', hometown: 'Darwin, Northern Territory', age: 28, height: 193, reach: 198, styles: ['Kickboxer'], traits: ['Trash Talker'], rec: [16, 2], look: { hair: 14, beard: 0, build: 2, tattoo: 3 }, boost: 6 },
  doscaras: { div: 'middle', tier: 'contender', first: 'Diego', last: 'Ruiz', nick: 'Dos Caras', country: 'Mexico', hometown: 'Monterrey, Nuevo Leon', age: 29, height: 184, reach: 188, styles: ['Counter Striker', 'Sub Hunter'], traits: ['Mysterious'], rec: [19, 2], look: { hair: 0, beard: 0, build: 1, mask: 0x2a4ad8, tattoo: 2 }, boost: 10 },
};

function buildGuest(save: StorySave, key: string): Fighter | null {
  const g = GUESTS[key];
  if (!g) return null;
  const k = g.boost + save.chapter * 0.8;
  const f = authored(`story_guest_${key}`, g.div, g.tier, {
    first: g.first, last: g.last, nick: g.nick, country: g.country, hometown: g.hometown, age: g.age, height: g.height, reach: g.reach,
    skills: {
      striking: skill(68 + k), power: skill(66 + k), wrestling: skill(62 + k), grappling: skill(60 + k), cardio: skill(68 + k),
      chin: skill(66 + k), fightIQ: skill(64 + k), durability: skill(65 + k), heart: skill(70 + k), weightCut: 45,
    },
    styles: g.styles, traits: g.traits, record: { w: g.rec[0], l: g.rec[1], d: 0, nc: 0 }, look: g.look,
  });
  f.gym = key === 'tyler' ? "Ray's Boxing & Soup (now)" : key === 'spadam' ? 'Beast Mode Kickboxing' : f.gym;
  return f;
}

/** RAY, 1987 (the notebook's reward): Ray at thirty-three, an electrician with a right hand. */
export function buildRay1987(): Fighter {
  const f = authored('ray_1987', 'middle', 'contender', {
    first: 'Ray', last: 'Tibodeau', nick: 'The Electrician', country: 'Canada', hometown: 'Moncton, New Brunswick', age: 33, height: 180, reach: 183,
    skills: { striking: 80, power: 86, wrestling: 40, grappling: 38, cardio: 78, chin: 84, fightIQ: 74, durability: 82, heart: 99, weightCut: 50 },
    styles: ['Pressure Striker', 'Brawler'], traits: ['Loyal', 'Hungry'], record: { w: 19, l: 2, d: 0, nc: 0 },
    look: { skin: 1, hair: 3, hairColor: 2, beard: 1, brows: 1, nose: 2, ears: 1, scar: 1, tattoo: 0, build: 1 },
  });
  f.gym = 'Moncton Boys and Girls Club';
  return f;
}

/** Butch, 1987: the left hook and the mullet. */
export function buildButch1987(): Fighter {
  return authored('butch_1987', 'middle', 'contender', {
    first: 'Butch', last: 'Comeau', nick: 'The Mullet', country: 'Canada', hometown: 'Dieppe, New Brunswick', age: 27, height: 182, reach: 186,
    skills: { striking: 84, power: 82, wrestling: 42, grappling: 40, cardio: 82, chin: 80, fightIQ: 78, durability: 80, heart: 85, weightCut: 50 },
    styles: ['Counter Striker'], traits: ['Showman'], record: { w: 22, l: 1, d: 0, nc: 0 },
    look: { skin: 1, hair: 10, hairColor: 3, beard: 2, brows: 1, nose: 0, ears: 0, scar: 0, tattoo: 0, build: 1 },
  });
}

export function buildOpponent(save: StorySave, key: string): Fighter {
  const guest = buildGuest(save, key);
  if (guest) return guest;
  switch (key) {
    case 'duke':
      return buildDuke(save);
    case 'rico':
      return buildRico(save);
    case 'cesar':
      return buildCesar(save);
    case 'cesar_rematch': {
      // out on bail, back in camp, number one in the rankings
      const f = buildCesar(save);
      f.id = 'story_cesar_2';
      for (const k of ['striking', 'power', 'cardio', 'fightIQ'] as const) f.skills[k] = skill(f.skills[k] + 4);
      // the number one contender for Mateo's first defense: under 1ton's 90, well over the street
      setOverall(f.skills, 85);
      return f;
    }
    case 'han':
      return buildHan(save, true);
    case 'cuchillo':
      return buildCuchillo(save, false);
    case 'cuchillo_rematch':
      return buildCuchillo(save, true);
    case 'brick':
      return buildBrick(save);
    case 'mateo_spar':
      return buildMateo(save, false);
    case 'mateo_betrayal':
      return buildMateo(save, true);
    case 'auditor':
      return buildAuditor(save);
    case 'chairman':
      return buildChairman(save);
    case 'final':
      return buildOneTon(save, true);
    default:
      return buildBrick(save);
  }
}

export function storyCorner(save: StorySave, def: StoryFightDef): { player: Fighter; opponent: Fighter } {
  return {
    player: def.player === 'han' ? buildHan(save) : def.player === 'mateo' ? buildMateoGrown(save) : buildOneTon(save),
    opponent: buildOpponent(save, def.opponent),
  };
}

export function storyOverall(save: StorySave, who: 'oneton' | 'corner'): number {
  return overall((who === 'corner' ? cornerFighter(save) : buildOneTon(save)).skills);
}

// ---------------------------------------------------------------- the undercard (random fights)

/**
 * Between the story fights there are shows to run. Nobody is writing a chapter
 * about the ice-cream man, but the rent does not care about narrative.
 */
export interface StorySideOpponent {
  id: string;
  label: string;
  name: string;
  nick: string;
  blurb: string;
  purse: number;
  risk: 'SAFE' | 'LIVE' | 'DANGER';
  rounds: 3 | 5;
  fighter: Fighter;
}

interface SideSeed {
  first: string;
  last: string;
  nick: string;
  division: string;
  blurb: string;
  styles: string[];
  traits: string[];
  look: Partial<Look>;
  female?: boolean;
}

const SIDE_SEEDS: SideSeed[] = [
  { first: 'Kyle', last: 'Mercer', nick: 'Two Scoops', division: 'middle', blurb: 'Drives an ice-cream truck. Fights like the handbrake failed.', styles: ['Brawler'], traits: ['Party Animal', 'Hothead'], look: { skin: 0, hair: 1, beard: 2, build: 1 } },
  { first: 'Brayden', last: 'Cole', nick: 'Clickbait', division: 'welter', blurb: 'Has one million followers and four amateur fights. Two of them were filmed.', styles: ['Showboat'], traits: ['Clout Chaser', 'Streamer'], look: { skin: 1, hair: 3, beard: 0, build: 0 } },
  { first: 'Dale', last: 'Cormier', nick: 'The Pipe', division: 'heavy', blurb: 'Fixes your sink, then suplexes it. Charges by the hour.', styles: ['Wrestler', 'Ground & Pound'], traits: ['Gym Rat', 'Family First'], look: { skin: 2, hair: 0, beard: 3, build: 2 } },
  { first: 'Sienna', last: 'Voss', nick: 'Downward Dog', division: 'wfly', female: true, blurb: 'Yoga instructor. Flexible, patient, and absolutely not here to make friends.', styles: ['Point Fighter', 'Counter Striker'], traits: ['Perfectionist', 'Wholesome'], look: { skin: 0, hair: 5, beard: 0, build: 0 } },
  { first: 'Terry', last: 'Clawson', nick: 'The Tiger', division: 'light', blurb: 'Was the mall mascot for six years. Still has the head. Still wears it.', styles: ['Showboat', 'Brawler'], traits: ['Prankster', 'Showman'], look: { skin: 1, hair: 2, beard: 1, build: 1 } },
  { first: 'Marcus', last: 'Webb', nick: 'Parole Board', division: 'lightheavy', blurb: 'Bouncer, ex-con, current problem. The ankle monitor is duct-taped under the sock.', styles: ['Brawler'], traits: ['Hothead', 'Mercenary'], look: { skin: 4, hair: 0, beard: 3, build: 2 } },
  { first: 'Remy', last: 'Bouchard', nick: 'The Cleaver', division: 'light', blurb: 'Line cook at a place with one fork. His left hook is the special.', styles: ['Kickboxer'], traits: ['Hothead', 'Perfectionist'], look: { skin: 1, hair: 2, beard: 2, build: 1 } },
  { first: 'Jaxx', last: 'Fontaine', nick: 'One Million', division: 'light', blurb: 'Streams his training. The camera gets more reps than he does.', styles: ['Showboat'], traits: ['Streamer', 'Clout Chaser'], look: { skin: 0, hair: 3, beard: 0, build: 0 } },
  { first: 'Olga', last: 'Petrov', nick: 'The Ledger', division: 'wstraw', female: true, blurb: 'Accountant. Forecloses on your ribs. Keeps a receipt.', styles: ['Wrestler', 'Grinder'], traits: ['Business Savvy', 'Perfectionist'], look: { skin: 0, hair: 1, beard: 0, build: 0 } },
  { first: 'Sal', last: 'Marchetti', nick: 'Big Sal', division: 'heavy', blurb: 'Owns a deli. The deli has a cage in the back. It isn\'t a health-code issue.', styles: ['Brawler'], traits: ['Family First', 'Gambler'], look: { skin: 1, hair: 0, beard: 3, build: 2 } },
  { first: 'Dana', last: 'Pike', nick: 'The Citation', division: 'wbantam', female: true, blurb: 'Off-duty cop with a point to prove and a taser she promises not to use.', styles: ['Wrestler'], traits: ['Hothead', 'Political'], look: { skin: 0, hair: 1, beard: 0, build: 1 } },
  { first: 'Elijah', last: 'Boone', nick: 'The Sermon', division: 'middle', blurb: 'Preaches at the weigh-in. Sins at the bell. Tithes in cash.', styles: ['Counter Striker'], traits: ['Devout', 'Showman'], look: { skin: 3, hair: 1, beard: 3, build: 1 } },
];

function sideSeedFor(save: StorySave, index: number): Rng {
  return Rng.fromSeed(save.seed).fork(`undercard-${save.chapter}-${save.stats.sideFights}-${index}`);
}

function makeSideOpponent(save: StorySave, index: number): StorySideOpponent {
  const rng = sideSeedFor(save, index);
  const seed = SIDE_SEEDS[Math.floor(rng.next() * SIDE_SEEDS.length)];
  const id = `side_${save.seed % 100000}_${save.stats.sideFights}_${index}`;
  const tier = save.chapter < 3 ? 'prospect' : save.chapter < 6 ? 'journeyman' : 'gatekeeper';
  const age = rng.int(21, 38);
  const height = seed.division.startsWith('heavy') ? rng.int(190, 205) : seed.division === 'lightheavy' ? rng.int(185, 196) : isWomensDivision(seed.division) ? rng.int(155, 172) : rng.int(170, 188);
  const f = authored(id, seed.division, tier, {
    first: seed.first,
    last: seed.last,
    nick: seed.nick,
    country: rng.chance(0.15) ? 'Canada' : 'USA',
    hometown: rng.pick(['Moncton, New Brunswick', 'Tampa, Florida', 'Gary, Indiana', 'Fresno, California', 'Halifax, Nova Scotia', 'Tijuana, Mexico']),
    age,
    height,
    reach: height + rng.int(0, 8),
    skills: {
      striking: skill(46 + save.chapter * 2.2 + rng.int(-7, 7)),
      power: skill(44 + save.chapter * 2.4 + rng.int(-8, 8)),
      wrestling: skill(42 + save.chapter * 1.9 + rng.int(-8, 8)),
      grappling: skill(41 + save.chapter * 1.8 + rng.int(-8, 8)),
      cardio: skill(48 + save.chapter * 1.7 + rng.int(-6, 8)),
      chin: skill(46 + save.chapter * 1.8 + rng.int(-7, 8)),
      fightIQ: skill(45 + save.chapter * 2.0 + rng.int(-8, 8)),
      durability: skill(47 + save.chapter * 1.7 + rng.int(-7, 8)),
      heart: skill(48 + save.chapter * 1.4 + rng.int(-8, 8)),
      weightCut: rng.int(28, 62),
    },
    styles: seed.styles,
    traits: seed.traits,
    record: { w: rng.int(0, 4 + save.chapter * 2), l: rng.int(0, 3 + save.chapter), d: 0, nc: 0 },
    look: { ...seed.look, hairColor: rng.int(0, 7), brows: rng.int(0, 2), nose: rng.int(0, 2), ears: rng.int(0, 2), scar: rng.int(0, 2), tattoo: rng.int(0, 2), build: seed.look.build ?? 1 },
    gender: seed.female ? 'W' : 'M',
  });
  f.manager = 'self';
  f.promotion = 'free-agent';
  f.starPower = clamp(18 + save.chapter * 3 + rng.int(0, 18), 10, 70);
  const mine = overall(buildOneTon(save).skills);
  const theirs = overall(f.skills);
  const risk: StorySideOpponent['risk'] = theirs >= mine + 5 ? 'DANGER' : theirs >= mine - 5 ? 'LIVE' : 'SAFE';
  const purse = 900 + save.chapter * 850 + (risk === 'DANGER' ? 3200 : risk === 'LIVE' ? 1700 : 700) + rng.int(0, 600);
  const main = save.stats.sideFights % 3 === 2;
  return {
    id,
    label: main ? 'THE WAREHOUSE MAIN EVENT' : 'UNDERCARD',
    name: `${seed.first} ${seed.last}`,
    nick: seed.nick,
    blurb: seed.blurb,
    purse,
    risk,
    rounds: main ? 5 : 3,
    fighter: f,
  };
}

/** Three offers, deterministic for this chapter and this many undercard fights. */
export function sideOffers(save: StorySave): StorySideOpponent[] {
  const out: StorySideOpponent[] = [];
  const seen = new Set<string>();
  for (let i = 0; out.length < 3 && i < 8; i++) {
    const o = makeSideOpponent(save, i);
    if (seen.has(o.id)) continue;
    seen.add(o.id);
    out.push(o);
  }
  return out;
}

export function sideFightReady(save: StorySave): boolean {
  return save.status !== 'ended' && save.fatigue < 82;
}

/** A side fight pays the rent, costs the body, and occasionally teaches a lesson. */
export function recordSideFight(
  save: StorySave,
  opp: StorySideOpponent,
  r: { winner: string | null; method: string; round: number; time: string; detail: string },
  playerId: string,
  opponentId: string,
): StoryFightRecord {
  const result: 'W' | 'L' | 'D' = r.winner === playerId ? 'W' : r.winner === opponentId ? 'L' : 'D';
  const rec: StoryFightRecord = {
    id: `side_${save.stats.sideFights + 1}`,
    name: opp.label,
    player: 'oneton',
    opponent: opp.id,
    result,
    method: r.method,
    round: r.round,
    time: r.time,
    detail: r.detail,
  };
  save.fights.push(rec);
  save.stats.sideFights++;
  save.stats.earnings += result === 'W' ? opp.purse : Math.round(opp.purse * 0.55);
  save.cash += result === 'W' ? opp.purse : Math.round(opp.purse * 0.55);
  if (result === 'W') {
    save.stats.sideWins++;
    save.brand = clamp(save.brand + (opp.risk === 'DANGER' ? 4 : 2));
    save.trust = clamp(save.trust + 2);
    save.ego = clamp(save.ego + 3);
    save.fatigue = clamp(save.fatigue + (opp.rounds === 5 ? 22 : 17));
  } else if (result === 'L') {
    save.stats.sideLosses++;
    save.brand = clamp(save.brand - 2);
    save.trust = clamp(save.trust - 1);
    save.ego = clamp(save.ego - 1);
    save.fatigue = clamp(save.fatigue + (opp.rounds === 5 ? 30 : 24));
  } else {
    save.stats.sideLosses++;
    save.fatigue = clamp(save.fatigue + 21);
  }
  if (/KO|TKO/.test(r.method)) save.stats.kos++;
  else if (/SUB/.test(r.method)) save.stats.subs++;
  else if (/DEC/.test(r.method)) save.stats.decisions++;
  save.heat = clamp(save.heat + 1);
  addLog(save, `UNDERCARD: ${result === 'W' ? 'WON' : result === 'L' ? 'LOST' : 'DREW'} vs ${opp.name}  /  ${r.method} R${r.round} ${r.time}. Purse $${opp.purse.toLocaleString('en-US')}.`);
  touch(save);
  return rec;
}

// ---------------------------------------------------------------- contract review (the discrepancy game)

export interface StoryDocClause {
  id: number;
  text: string;
  bad: boolean;
  why: string;
}

export interface StoryDoc {
  id: string;
  chapter: string;
  title: string;
  kicker: string;
  intro: string;
  clauses: StoryDocClause[];
  /** what catching every discrepancy and demanding changes is worth */
  reward: string;
}

export const STORY_DOCS: Record<string, StoryDoc> = {
  back_row: {
    id: 'lease',
    chapter: 'back_row',
    title: 'WAREHOUSE LEASE  /  AMENDMENT 9',
    kicker: 'GORDON VANCE / VANCE HOLDINGS',
    intro: 'The lease for the only building you can afford. Paragraph nine is new.',
    clauses: [
      { id: 0, text: 'Rent is due every Friday by 6:00 p.m.', bad: false, why: 'Annoying, but legal.' },
      { id: 1, text: 'Landlord may terminate with 24 hours notice if the tenant is "loud, late, or visible."', bad: true, why: 'The whole promotion is loud, late and visible.' },
      { id: 2, text: 'Tenant waives all rights to the cage, the lights and the word "cage."', bad: true, why: 'You can\'t run a fight club without the word cage.' },
      { id: 3, text: 'Landlord retains one (1) parking spot and the moral high ground.', bad: false, why: 'Gordon needs somewhere to park his moral high ground.' },
      { id: 4, text: 'Tenant accepts responsibility for roof repairs, whether or not the roof exists.', bad: true, why: 'It doesn\'t exist.' },
      { id: 5, text: 'No animals on the premises except the tiger.', bad: false, why: 'There\'s no tiger. Probably.' },
    ],
    reward: 'A 24-hour notice period becomes 30 days and the word "cage" stays yours.',
  },
  mexican_math: {
    id: 'first_bout',
    chapter: 'mexican_math',
    title: 'BOUT AGREEMENT  /  GORDO "1TON" FUENTE vs EL CUCHILLO',
    kicker: 'THE WAREHOUSE / 3 ROUNDS',
    intro: 'El Cuchillo\'s manager sent the bout agreement on a napkin. The napkin has a lawyer.',
    clauses: [
      { id: 0, text: 'Three (3) rounds of five (5) minutes, unified rules.', bad: false, why: 'Standard.' },
      { id: 1, text: 'Purse: $2,000 to the winner, $0 to the loser, $0 to the referee.', bad: true, why: 'The referee has a family. So does the loser.' },
      { id: 2, text: 'Opponent may bring one (1) knife to the cage. It\'s a metaphor.', bad: true, why: 'It has never been a metaphor.' },
      { id: 3, text: 'Winner receives one (1) sandwich from the deli on the corner.', bad: false, why: 'A sandwich is a sandwich.' },
      { id: 4, text: 'Medical clearance: expired 2019. Both parties waive the expiration.', bad: true, why: 'The 2019 medical is a souvenir.' },
      { id: 5, text: 'Promotion owns exclusive rights to beard trimmings for merchandising.', bad: false, why: 'The beard is the brand.' },
    ],
    reward: 'The purse is guaranteed and the knife stays outside the cage.',
  },
  brick_by_brick: {
    id: 'zenith_offer',
    chapter: 'brick_by_brick',
    title: 'ZENITH HOLDINGS  /  LETTER OF INTENT',
    kicker: 'ACQUISITION DESK / CONFIDENTIAL',
    intro: 'Twenty-five thousand dollars. The paper is warm from the printer.',
    clauses: [
      { id: 0, text: 'Zenith will pay $25,000 for the warehouse lease and all associated goodwill.', bad: false, why: 'The goodwill is mostly unpaid rent.' },
      { id: 1, text: 'The name "CAGE BOSS" transfers to Zenith, including the word "Boss."', bad: true, why: 'You\'re the Boss.' },
      { id: 2, text: 'Dane Whyte will remain as an unpaid cultural consultant for a period of forever.', bad: true, why: '"Forever" isn\'t a period. It\'s a sentence.' },
      { id: 3, text: 'Zenith will own the rights to any future firstborn child of the tenant.', bad: true, why: 'Ray says that isn\'t standard.' },
      { id: 4, text: 'All disputes will be arbitrated in Delaware, where it\'s always Tuesday.', bad: false, why: 'You have never been to Delaware.' },
      { id: 5, text: 'The tenant may keep the parking spot until the first home show.', bad: false, why: 'You don\'t have a car.' },
    ],
    reward: 'The name stays yours and the consultant fee becomes a real number.',
  },
  sparring_partner: {
    id: 'spar_waiver',
    chapter: 'sparring_partner',
    title: 'SPARRING WAIVER  /  RAY\'S BOXING & SOUP',
    kicker: 'NO HARD SHOTS / NO INSURANCE',
    intro: 'Mateo signs it without reading. That\'s what the waiver is for.',
    clauses: [
      { id: 0, text: 'Both parties agree to "no hard shots" and "no hard feelings."', bad: false, why: 'One of those is enforceable.' },
      { id: 1, text: 'Participant waives all medical coverage, including the ambulance he may need.', bad: true, why: 'Ray sold the ambulance in 2019. But still.' },
      { id: 2, text: 'Promotion isn\'t liable for any injury caused by "the math."', bad: true, why: '"The math" isn\'t a legal doctrine.' },
      { id: 3, text: 'Mateo Varga will be compensated in soup.', bad: false, why: 'It\'s good soup.' },
      { id: 4, text: 'Any dispute will be settled by Uncle Ray, who\'s also the cook and the corner.', bad: false, why: 'Ray is fair. Ray is also the cook.' },
      { id: 5, text: 'Participant agrees to fight a professional bout within 30 days without a new medical.', bad: true, why: 'He\'s nineteen. His brain isn\'t a rental car.' },
    ],
    reward: 'The kid gets medical coverage and a real purse. Ray cries into the soup.',
  },
  audit: {
    id: 'audit_form',
    chapter: 'audit',
    title: 'ZENITH SAFETY & COMPLIANCE AUDIT  /  FORM 12-B',
    kicker: 'THE AUDITOR / DO NOT LICK THE FORM',
    intro: 'Six pages of safety compliance. One page has a fingerprint on it already.',
    clauses: [
      { id: 0, text: 'Cage inspected and certified by a licensed structural engineer.', bad: false, why: 'The engineer was licensed. The cage wasn\'t.' },
      { id: 1, text: 'Emergency exits must remain unobstructed at all times.', bad: false, why: 'Good.' },
      { id: 2, text: 'All payroll is reported as "volunteer work" for tax purposes.', bad: true, why: 'Volunteers can\'t be fined for missing weight.' },
      { id: 3, text: 'The fire exits have been painted shut for aesthetic reasons.', bad: true, why: 'Aesthetics aren\'t worth a fire.' },
      { id: 4, text: 'The inspector may inspect "the future" without a warrant.', bad: true, why: 'The future has rights.' },
      { id: 5, text: 'One (1) bucket is an acceptable substitute for a second toilet.', bad: false, why: 'It has been acceptable for six months.' },
    ],
    reward: 'The audit is clean, the bucket is grandfathered in, and Zenith has to admit the cage exists.',
  },
  the_board: {
    id: 'board_exhibition',
    chapter: 'the_board',
    title: 'CORPORATE EXHIBITION AGREEMENT',
    kicker: 'ZENITH BOARD / 5 ROUNDS / NO PURSE',
    intro: 'The board wants a fight. The contract wants everything else.',
    clauses: [
      { id: 0, text: 'Five (5) rounds. The Chairman may not use a chair.', bad: false, why: 'He\'ll use the chair.' },
      { id: 1, text: 'Winner forgives the debt. Loser transfers the building.', bad: true, why: 'You\'re the loser in this sentence twice.' },
      { id: 2, text: 'Both parties waive medical suspension for the duration of the exhibition.', bad: true, why: 'The doctor will love this.' },
      { id: 3, text: 'Zenith may edit the footage to "protect the brand."', bad: true, why: 'The brand is a cage with a logo.' },
      { id: 4, text: 'The Chairman may bring his own referee, who\'s also his lawyer.', bad: false, why: 'He\'s a legacy asset.' },
      { id: 5, text: 'Community outreach will be measured in tickets sold.', bad: false, why: 'That\'s the most honest clause here.' },
    ],
    reward: 'The debt is forgiven on a win and the building isn\'t collateral on a loss.',
  },
  rematch: {
    id: 'tv_deal',
    chapter: 'rematch',
    title: 'ZENITH NETWORK  /  TELEVISION SERVICES AGREEMENT',
    kicker: '12 EVENTS / EXCLUSIVITY / EXPOSURE',
    intro: 'A television deal. It\'s printed on paper that costs more than your car.',
    clauses: [
      { id: 0, text: 'Zenith will broadcast twelve (12) events over twenty-four months.', bad: false, why: 'You have never had twelve of anything.' },
      { id: 1, text: 'The promotion may not appear on any other network, streaming service, or phone.', bad: true, why: 'The phone is how you reach people.' },
      { id: 2, text: 'Dane Whyte\'s face will appear on all promotional materials, whether he\'s on them or not.', bad: true, why: 'That\'s a poster of a man who isn\'t there.' },
      { id: 3, text: 'Gordo "1ton" Fuente receives approval over opponents, purses, and the color of the cage.', bad: true, why: 'The color of the cage isn\'t a fighter\'s right.' },
      { id: 4, text: 'Compensation for the first year will be paid in "exposure."', bad: true, why: 'Exposure doesn\'t cover rent.' },
      { id: 5, text: 'Network may cancel after any loss, any controversy, or any Tuesday.', bad: false, why: 'It\'s always Tuesday somewhere.' },
    ],
    reward: 'The deal pays cash, keeps your phone, and the cage stays red.',
  },
  brother: {
    id: 'mateo_booking',
    chapter: 'brother',
    title: 'BOUT AGREEMENT  /  GORDO "1TON" FUENTE vs MATEO VARGA',
    kicker: 'ZENITH PRESENTS / FAMILY DISCOUNT',
    intro: 'The kid\'s name is on the contract. The kid isn\'t on the phone.',
    clauses: [
      { id: 0, text: 'Three (3) rounds. Winner receives a title shot. Loser is released.', bad: true, why: 'One of these men is nineteen. The other is your family.' },
      { id: 1, text: 'Mateo Varga will fight without a corner, a cutman, or a stool.', bad: true, why: 'Nobody should fight alone.' },
      { id: 2, text: 'Promotion will pay for Mateo\'s medical coverage, win or lose.', bad: false, why: 'The bare minimum.' },
      { id: 3, text: 'Gordo "1ton" Fuente receives "creative control" over the finish.', bad: true, why: 'A finish isn\'t a script.' },
      { id: 4, text: 'Family discount: Mateo\'s purse is 20% off.', bad: false, why: 'It\'s a discount for being family, taken off the top before the kid sees a purse.' },
      { id: 5, text: 'The bout may be stopped at any time by the referee, the doctor, or the promoter\'s conscience.', bad: false, why: 'One of those has never shown up.' },
    ],
    reward: 'Mateo gets a corner, a cutman and a fair purse. The family discount is torn up.',
  },
  buyback: {
    id: 'buyback_contract',
    chapter: 'buyback',
    title: 'THE BUYBACK  /  FINAL AGREEMENT',
    kicker: 'ZENITH HOLDINGS / ONE NIGHT / ONE CAGE',
    intro: 'The paper that gives you your company back. It has a few teeth.',
    clauses: [
      { id: 0, text: 'Upon payment of $600,000, Zenith transfers all promotion assets to Dane Whyte.', bad: false, why: 'The whole paper exists to reach this line.' },
      { id: 1, text: 'Zenith retains a 10% equity stake and one (1) seat on the board forever.', bad: true, why: 'Forever has a board meeting every quarter.' },
      { id: 2, text: 'The name "CAGE BOSS" remains the property of Zenith Holdings in perpetuity.', bad: true, why: 'You would be running a company with no name.' },
      { id: 3, text: 'Verity Kane will serve as "President of Strategic Synergy," a role with no duties.', bad: true, why: 'The role has a salary, though.' },
      { id: 4, text: 'Zenith retains the parking spot.', bad: false, why: 'It\'s the only thing they have ever really wanted.' },
      { id: 5, text: 'The winner of the main event is determined by the judges, not the contract.', bad: false, why: 'That\'s how fights work. Allegedly.' },
    ],
    reward: 'Zenith keeps the parking spot. You keep everything else.',
  },
};

export function storyDoc(save: StorySave): StoryDoc | null {
  const ch = storyChapter(save);
  if (save.flags[`doc_${ch.id}`]) return null;
  return STORY_DOCS[ch.id] ?? null;
}

export type StoryDocMode = 'sign' | 'renegotiate' | 'walk';

export interface StoryDocResult {
  grade: 'A' | 'B' | 'C' | 'F';
  caught: number;
  bad: number;
  missed: number;
  wrong: number;
  text: string;
  cash: number;
  trust: number;
  brand: number;
  heat: number;
}

/** Flag the bad clauses, sign the paper, live with the paper. */
export function resolveStoryDoc(save: StorySave, doc: StoryDoc, flagged: number[], mode: StoryDocMode): StoryDocResult {
  const bad = doc.clauses.filter((c) => c.bad);
  const caught = bad.filter((c) => flagged.includes(c.id)).length;
  const wrong = doc.clauses.filter((c) => !c.bad && flagged.includes(c.id)).length;
  const missed = bad.length - caught;
  const canFix = caught === bad.length && wrong === 0;
  const ch = storyChapter(save);
  let grade: StoryDocResult['grade'] = missed === 0 ? (wrong === 0 ? 'A' : 'B') : caught > 0 ? 'C' : 'F';
  let text = '';
  let cash = 0;
  let trust = 0;
  let brand = 0;
  let heat = 0;
  if (mode === 'walk') {
    grade = 'B';
    cash = 0;
    trust = 1;
    brand = -1;
    heat = -2;
    save.stats.walked++;
    text = 'You walked away from the paper. Gordon called it "a negotiating position." Ray called it "Tuesday."';
  } else if (mode === 'renegotiate' && canFix) {
    cash = 3500 + save.chapter * 1400;
    trust = 4;
    brand = 4;
    heat = 2;
    save.stats.goodDeals++;
    save.flags[`doc_good_${ch.id}`] = true;
    text = `You caught every bad clause and made them rewrite it. ${doc.reward}`;
  } else if (missed === 0) {
    cash = 1800 + save.chapter * 600;
    trust = 2;
    brand = 2;
    heat = 1;
    save.stats.goodDeals++;
    text = 'You caught every bad clause. You signed anyway, because the good clauses were worth it. Mostly.';
  } else if (mode === 'renegotiate') {
    cash = 0;
    trust = -1;
    brand = 1;
    heat = 3;
    save.stats.badDeals++;
    text = 'You demanded changes without finding all the problems. Their lawyer found the rest. The paper stayed the same, and the fee went up.';
  } else {
    cash = -1200 - save.chapter * 400;
    trust = -3;
    brand = -2;
    heat = 5 + missed * 2;
    save.stats.badDeals++;
    text = missed === bad.length
      ? 'You signed without reading. Somewhere, a Zenith lawyer just bought a boat.'
      : 'You signed with your eyes half open. The bad clauses are still in there, doing their little jobs.';
  }
  save.stats.catches += caught;
  save.stats.missed += missed;
  save.stats.wrongFlags += wrong;
  save.cash += cash;
  save.trust = clamp(save.trust + trust);
  save.brand = clamp(save.brand + brand);
  save.heat = clamp(save.heat + heat);
  save.flags[`doc_${ch.id}`] = grade;
  save.flags[`docCaught_${ch.id}`] = caught;
  addLog(save, `CONTRACT: ${doc.title}  /  graded ${grade} (${caught}/${bad.length} caught, ${wrong} wrong flags).`);
  touch(save);
  return { grade, caught, bad: bad.length, missed, wrong, text, cash, trust, brand, heat };
}

// ---------------------------------------------------------------- press day

export interface StoryPressOption {
  id: string;
  label: string;
  trust: number;
  ego: number;
  brand: number;
  heat: number;
  reply: string;
}

export interface StoryPressQuestion {
  q: string;
  options: StoryPressOption[];
}

const PRESS_QUESTIONS: StoryPressQuestion[] = [
  {
    q: '"Dane, is it true the warehouse has one toilet and no fire exits?"',
    options: [
      { id: 'honest', label: 'IT HAS TWO TOILETS. ONE IS A BUCKET.', trust: 1, ego: 1, brand: 2, heat: 0, reply: 'The room laughs. The fire marshal doesn\'t.' },
      { id: 'spin', label: 'THE FIRE EXITS ARE A METAPHOR.', trust: 0, ego: 2, brand: 3, heat: 3, reply: 'Bradie clips it. It does numbers. The wrong numbers.' },
      { id: 'attack', label: 'ASK ZENITH. THEY OWN THE FIRE.', trust: 2, ego: 0, brand: 2, heat: 4, reply: 'Verity Kane\'s people call before the presser ends.' },
    ],
  },
  {
    q: '"1ton, how does it feel to be the first Mexican main-event fighter in this building?"',
    options: [
      { id: 'credit', label: 'HE EARNED IT. I JUST OPENED THE DOOR.', trust: 5, ego: 2, brand: 3, heat: 0, reply: '1ton looks at you like he\'s doing math.' },
      { id: 'me', label: 'I DISCOVERED HIM. YOU\'RE WELCOME.', trust: -4, ego: 5, brand: 2, heat: 1, reply: 'The room laughs. 1ton doesn\'t.' },
      { id: 'joke', label: 'HE\'S THE FIRST. I\'M THE WORST. TOGETHER, WE\'RE HISTORY.', trust: 1, ego: 3, brand: 4, heat: 1, reply: 'It becomes a shirt by Friday.' },
    ],
  },
  {
    q: '"There are photographs of you and Verity Kane in a parking garage. Care to explain?"',
    options: [
      { id: 'truth', label: 'SHE OFFERED ME A JOB. I SAID NO.', trust: 4, ego: -1, brand: 2, heat: 2, reply: 'Nobody believes you. That\'s fine. You barely believe you.' },
      { id: 'lie', label: 'THAT WAS MY DENTIST.', trust: -2, ego: 1, brand: 1, heat: 5, reply: 'Your dentist is now a headline.' },
      { id: 'nothing', label: 'NO COMMENT.', trust: -1, ego: 0, brand: -2, heat: -1, reply: 'The silence gets more coverage than the answer.' },
    ],
  },
  {
    q: '"Is Gordo "1ton" Fuente the future of this promotion, or the end of it?"',
    options: [
      { id: 'future', label: 'HE IS THE FUTURE. I AM THE LEASE.', trust: 4, ego: 2, brand: 3, heat: 0, reply: '1ton laughs. It sounds almost real.' },
      { id: 'end', label: 'HE IS THE END OF SOMETHING. I HAVEN\'T DECIDED WHAT.', trust: -3, ego: 1, brand: 3, heat: 2, reply: 'The quote gets four million views. Two of them are Verity.' },
      { id: 'deflect', label: 'NEXT QUESTION.', trust: 0, ego: -1, brand: 0, heat: 0, reply: 'The next question is about the parking spot.' },
    ],
  },
  {
    q: '"Mateo Varga says you\'re not family. He says you\'re a landlord with a cage."',
    options: [
      { id: 'family', label: 'HE\'S FAMILY. THAT\'S WHY IT HURTS.', trust: 3, ego: 1, brand: 3, heat: 1, reply: 'Mateo sends a text. It\'s a single soup emoji.' },
      { id: 'business', label: 'THIS IS A BUSINESS. FAMILY IS A TAX STATUS.', trust: -5, ego: 2, brand: 2, heat: 2, reply: 'Ray turns off the interview in the gym. Quietly.' },
      { id: 'joke', label: 'HE\'S FAMILY. THAT\'S WHY HE GETS THE DISCOUNT.', trust: 1, ego: 3, brand: 2, heat: 0, reply: 'It\'s funny. It\'s also true, and Mateo doesn\'t laugh.' },
    ],
  },
];

/** Three questions from the bank, deterministic per chapter. */
export function pressQuestions(save: StorySave): StoryPressQuestion[] {
  const rng = Rng.fromSeed(save.seed).fork(`press-${save.chapter}-${save.stats.pressers}`);
  const pool = PRESS_QUESTIONS.map((q) => ({ ...q, options: q.options.map((o) => ({ ...o })) }));
  rng.shuffle(pool);
  const out = pool.slice(0, 3);
  if (save.flags.rayDead) {
    for (const q of out) for (const o of q.options) {
      if (o.reply === 'Ray turns off the interview in the gym. Quietly.') {
        o.reply = 'Nobody turns off the interview. The gym is quiet on its own now.';
      }
    }
  }
  return out;
}

export function applyPressAnswer(save: StorySave, o: StoryPressOption): void {
  save.trust = clamp(save.trust + o.trust);
  save.ego = clamp(save.ego + o.ego);
  save.brand = clamp(save.brand + o.brand);
  save.heat = clamp(save.heat + o.heat);
}

export function finishPressDay(save: StorySave): void {
  save.stats.pressers++;
  save.actionsLeft = Math.max(0, save.actionsLeft - 1);
  save.cash += 1200 + save.brand * 12;
  save.stats.earnings += 1200 + save.brand * 12;
  addLog(save, `PRESS DAY: three questions, one answer that will follow you. Brand ${save.brand}, heat ${save.heat}.`);
  touch(save);
}

// ---------------------------------------------------------------- actions

export type OneTonTrack = keyof StoryTraining;
export type DaneTrack = keyof StoryDaneTraining;

export function canAct(save: StorySave, days = 1): boolean {
  return save.status === 'hub' && save.actionsLeft >= days;
}

export function trainOneTon(save: StorySave, track: OneTonTrack): string {
  return trainSession(save, 'oneton', track, 'light', 'C');
}

export function trainDane(save: StorySave, track: DaneTrack): string {
  return trainSession(save, 'corner', track, 'light', 'C');
}

export function mediaDay(save: StorySave): string {
  if (!canAct(save)) return 'No sessions left. The cameras have gone home. Some of them were never here.';
  const before = save.brand;
  save.brand = clamp(save.brand + 8 + Math.round(save.ego * 0.03));
  save.ego = clamp(save.ego + 5);
  save.heat = clamp(save.heat + 4);
  save.cash += 3000;
  save.actionsLeft--;
  save.fatigue = clamp(save.fatigue - 3);
  addLog(save, 'Media day. 1ton did forty minutes on the Mexican fight circuit and eleven minutes on your parking situation.');
  return `BRAND ${before} → ${save.brand}  /  +$3,000`;
}

export function dinnerWithOneTon(save: StorySave): string {
  if (!canAct(save)) return 'No sessions left. The tacos are cold and the conversation is colder.';
  if (save.cash < 1500) return 'You can\'t afford dinner. You can afford a folding chair and a serious talk.';
  save.cash -= 1500;
  save.trust = clamp(save.trust + 9);
  save.ego = clamp(save.ego - 5);
  save.actionsLeft--;
  save.fatigue = clamp(save.fatigue - 7);
  addLog(save, 'Dinner with 1ton. He ordered in Spanish, corrected the waiter\'s Spanish, then apologized in Spanish.');
  return `TRUST ${save.trust}  /  EGO ${save.ego}  /  -$1,500`;
}

export function talkTo(save: StorySave): string {
  if (!canAct(save)) return 'No sessions left. He\'s already in the cage, or already gone.';
  save.trust = clamp(save.trust + 4);
  save.actionsLeft--;
  save.fatigue = clamp(save.fatigue - 2);
  save.flags[`talk_${storyChapter(save).id}`] = true;
  addLog(save, `You talked. ${storyChapter(save).talk === 'notebook' ? 'He showed you the notebook.' : 'He nodded twice and went back to the bags.'}`);
  return 'TRUST +4';
}

export function applyTalkChoice(save: StorySave, id: string): string {
  save.choices[`talk_${storyChapter(save).id}`] = id;
  switch (id) {
    case 'honest':
      save.trust = clamp(save.trust + 8);
      save.ego = clamp(save.ego - 4);
      addLog(save, 'You told him the truth. He wrote it down and underlined it twice.');
      return 'TRUST +8  /  EGO -4';
    case 'coach':
      save.trust = clamp(save.trust + 5);
      save.ego = clamp(save.ego + 3);
      addLog(save, 'You told him what he wanted to hear, then made him run stairs. He respected the stairs.');
      return 'TRUST +5  /  EGO +3';
    case 'cold':
      save.trust = clamp(save.trust - 6);
      save.ego = clamp(save.ego + 6);
      addLog(save, 'You told him the truth like a promoter. He wrote that down too.');
      return 'TRUST -6  /  EGO +6';
    default:
      return '';
  }
}

export function applyChapterChoice(save: StorySave, id: string): string {
  save.choices[`ch_${storyChapter(save).id}`] = id;
  switch (id) {
    case 'spotlight':
      save.brand = clamp(save.brand + 7);
      save.ego = clamp(save.ego + 7);
      save.trust = clamp(save.trust + 3);
      addLog(save, 'You put 1ton on the poster. He put himself on the poster too, in marker.');
      return 'BRAND +7  /  EGO +7';
    case 'protect':
      save.brand = clamp(save.brand - 3);
      save.ego = clamp(save.ego - 5);
      save.trust = clamp(save.trust + 5);
      addLog(save, 'You kept him off the poster. He counted the names twice and didn\'t say anything.');
      return 'TRUST +5  /  EGO -5';
    case 'zenith_money':
      save.cash += 25000;
      save.brand = clamp(save.brand - 8);
      save.heat = clamp(save.heat + 12);
      save.trust = clamp(save.trust - 5);
      addLog(save, 'You took Zenith\'s money. It spends the same. It also has a return address.');
      return '+$25,000  /  BRAND -8  /  HEAT +12';
    case 'tear_check':
      save.brand = clamp(save.brand + 8);
      save.heat = clamp(save.heat + 6);
      save.trust = clamp(save.trust + 5);
      addLog(save, 'You tore up Zenith\'s check in front of Gordon. Gordon took photos of the pieces.');
      return 'BRAND +8  /  HEAT +6';
    case 'apologize':
      save.trust = clamp(save.trust + 7);
      save.ego = clamp(save.ego - 6);
      save.brand = clamp(save.brand + 2);
      addLog(save, 'You made 1ton apologize to Mateo. Mateo accepted it and didn\'t look at him for the rest of the week.');
      return 'TRUST +7  /  EGO -6';
    case 'toughen':
      save.trust = clamp(save.trust - 5);
      save.ego = clamp(save.ego + 8);
      save.brand = clamp(save.brand + 4);
      addLog(save, 'You told Mateo to toughen up. 1ton heard you say it. He wrote it down.');
      return 'EGO +8  /  TRUST -5';
    case 'confront':
      save.trust = clamp(save.trust + 5);
      save.heat = clamp(save.heat + 5);
      addLog(save, 'You thanked him for tearing up Zenith\'s card. He went red behind the beard and said "it was a bad card".');
      return 'TRUST +5  /  HEAT +5';
    case 'ignore':
      save.trust = clamp(save.trust - 7);
      save.ego = clamp(save.ego + 7);
      addLog(save, 'You told him tearing up Zenith\'s card was bad business. He laughed. Later, alone, he didn\'t.');
      return 'EGO +7  /  TRUST -7';
    case 'main_event':
      save.ego = clamp(save.ego + 8);
      save.brand = clamp(save.brand + 5);
      save.trust = clamp(save.trust + 2);
      addLog(save, 'You gave him the main event. He called it "the beginning of the rest of the buyback."');
      return 'EGO +8  /  BRAND +5';
    case 'co_main':
      save.ego = clamp(save.ego - 6);
      save.trust = clamp(save.trust - 4);
      save.brand = clamp(save.brand + 1);
      addLog(save, 'You kept him as co-main. He called it "a scheduling decision" and started training on his own at five.');
      return 'EGO -6  /  TRUST -4';
    case 'call_him':
      save.trust = clamp(save.trust + 5);
      save.ego = clamp(save.ego - 2);
      addLog(save, 'You called 1ton. It went to voicemail. You left the door open anyway.');
      return 'TRUST +5  /  EGO -2';
    case 'let_go':
      save.trust = clamp(save.trust + 3);
      save.brand = clamp(save.brand + 2);
      addLog(save, 'You let him go. Ray said you can\'t hold a man. You can only leave the door open.');
      return 'TRUST +3  /  BRAND +2';
    case 'ask_why':
      save.trust = clamp(save.trust + 4);
      addLog(save, 'You asked 1ton why he didn\'t help. He said he was watching the door.');
      return 'TRUST +4';
    case 'thank':
      save.trust = clamp(save.trust - 3);
      save.ego = clamp(save.ego + 3);
      addLog(save, 'You thanked him for watching. He said "anytime" like it was a threat.');
      return 'EGO +3  /  TRUST -3';
    case 'hold':
      save.trust = clamp(save.trust + 7);
      save.brand = clamp(save.brand + 3);
      save.heat = clamp(save.heat + 2);
      addLog(save, 'You stayed with Ray until the ambulance came. The paramedic said he was gone before the second siren.');
      return 'TRUST +7  /  BRAND +3';
    case 'hunt':
      save.trust = clamp(save.trust - 3);
      save.brand = clamp(save.brand + 8);
      save.heat = clamp(save.heat + 12);
      addLog(save, 'You put three names on a napkin and went looking. The first address had a light on.');
      return 'BRAND +8  /  HEAT +12  /  TRUST -3';
    case 'carry':
      save.trust = clamp(save.trust + 6);
      save.brand = clamp(save.brand + 4);
      addLog(save, 'You carried Mateo out yourself. 1ton watched from the cage, still in his gloves.');
      return 'TRUST +6  /  BRAND +4';
    case 'let_him':
      save.trust = clamp(save.trust - 6);
      save.ego = clamp(save.ego + 7);
      addLog(save, 'You let 1ton carry Mateo out. The photograph ran on the front page of three websites.');
      return 'EGO +7  /  TRUST -6';
    case 'give_credit':
      save.trust = clamp(save.trust + 7);
      save.ego = clamp(save.ego - 2);
      save.brand = clamp(save.brand + 3);
      addLog(save, 'You gave him the credit in the post-fight interview. He looked like he didn\'t know where to put it.');
      return 'TRUST +7  /  BRAND +3';
    case 'take_credit':
      save.trust = clamp(save.trust - 7);
      save.ego = clamp(save.ego + 5);
      save.brand = clamp(save.brand + 2);
      addLog(save, 'You took the credit. He stood behind you and smiled at the camera. The smile had a timer on it.');
      return 'EGO +5  /  TRUST -7';
    case 'offer':
      save.trust = clamp(save.trust + 6);
      save.ego = clamp(save.ego + 3);
      addLog(save, 'You offered him a tryout. He said he had one condition: he keeps the notebook.');
      return 'TRUST +6  /  EGO +3';
    case 'ask':
      save.trust = clamp(save.trust + 3);
      save.brand = clamp(save.brand + 3);
      addLog(save, 'You asked what he wanted. He said "a fair question and a fair fight." You gave him one of those.');
      return 'TRUST +3  /  BRAND +3';
    case 'write':
      save.trust = clamp(save.trust - 4);
      save.ego = clamp(save.ego + 2);
      addLog(save, 'You told him to stick to writing. He wrote that down too.');
      return 'TRUST -4  /  EGO +2';
    case 'callout_han':
      save.brand = clamp(save.brand + 8);
      save.trust = clamp(save.trust + 3);
      addLog(save, 'Mateo called out Han on the microphone, belt on his shoulder. Han stood up on his good knee and nodded once.');
      return 'BRAND +8  /  THE TORCH';
    case 'defend_belt':
      save.brand = clamp(save.brand + 4);
      save.heat = clamp(save.heat + 4);
      addLog(save, 'Mateo said the belt stays in the warehouse. Cesar Rios, out on bail, said that sounded like an invitation.');
      return 'BRAND +4  /  FIRST DEFENSE';
    case 'apologize_final':
      save.trust = clamp(save.trust + 9);
      save.ego = clamp(save.ego - 6);
      addLog(save, 'You apologized. He didn\'t say he forgave you. He did say he heard you.');
      return 'TRUST +9  /  EGO -6';
    case 'thank_final':
      save.trust = clamp(save.trust + 4);
      save.brand = clamp(save.brand + 3);
      addLog(save, 'You thanked him for the years. He said "don\'t." Then he said "you\'re welcome."');
      return 'TRUST +4  /  BRAND +3';
    case 'threaten_final':
      save.trust = clamp(save.trust - 8);
      save.ego = clamp(save.ego + 5);
      addLog(save, 'You told him you made him. He said "that\'s what I\'m counting on."');
      return 'TRUST -8  /  EGO +5';
    default:
      return '';
  }
}

// ---------------------------------------------------------------- fights

export function fightDone(save: StorySave, def: StoryFightDef): boolean {
  return !!save.flags[`fight_${def.id}`];
}

export function fightWon(save: StorySave, def: StoryFightDef): boolean {
  return !!save.flags[`won_${def.id}`];
}

export function chapterReady(save: StorySave): boolean {
  const ch = storyChapter(save);
  if (storyWeek(save) < chapterWeeks(ch)) return false;
  // nobody misses the story: the chapter's talk has to happen
  if (!talkedThisChapter(save)) return false;
  // the new champion has to say what he wants before the story can move
  if (ch.id === 'buyback' && save.flags.finalWinner === 'player' && !save.choices.ch_buyback) return false;
  const fights = chapterFights(ch, save);
  if (ch.id === 'legacy' && !fights.length) return false;
  return fights.every((f) => fightDone(save, f));
}

export function recordStoryFight(save: StorySave, def: StoryFightDef, r: { winner: string | null; method: string; round: number; time: string; detail: string }, playerId: string, opponentId: string): StoryFightRecord {
  const result: 'W' | 'L' | 'D' = r.winner === playerId ? 'W' : r.winner === opponentId ? 'L' : 'D';
  const rec: StoryFightRecord = {
    id: def.id,
    name: def.name,
    player: def.player,
    opponent: def.opponent,
    result,
    method: r.method,
    round: r.round,
    time: r.time,
    detail: r.detail,
  };
  save.fights.push(rec);
  save.flags[`fight_${def.id}`] = true;
  save.flags[`won_${def.id}`] = result === 'W';
  save.flags[`result_${def.id}`] = result;
  const won = result === 'W';
  if (def.id === 'final') {
    save.flags.finalWinner = result === 'W' ? 'player' : result === 'L' ? 'oneton' : 'draw';
    // a win opens the secret chapter; the ending waits for it
    if (result !== 'W') save.ending = storyEnding(save).id;
    else save.flags.mateoChamp = true;
  } else if (def.id === 'han_legacy') {
    save.flags.legacyWinner = result === 'W' ? 'mateo' : result === 'L' ? 'han' : 'draw';
    save.ending = storyEnding(save).id;
  } else if (def.id === 'defense') {
    save.flags.defenseWinner = result === 'W' ? 'mateo' : result === 'L' ? 'cesar' : 'draw';
    save.ending = storyEnding(save).id;
  } else if (def.id === 'mateo_betrayal') {
    if (won && (r.method === 'KO' || r.method === 'TKO' || r.method === 'SUB')) {
      save.flags.mateoHurt = true;
      save.trust = clamp(save.trust - 6);
      save.brand = clamp(save.brand + 4);
      save.ego = clamp(save.ego + 9);
      addLog(save, '1ton finished Mateo. The referee was late. The photograph was early.');
    } else {
      save.trust = clamp(save.trust + 2);
      save.ego = clamp(save.ego + 3);
    }
  } else if (def.id === 'cuchillo' || def.id === 'auditor' || def.id === 'chairman') {
    if (won) {
      save.trust = clamp(save.trust + 4);
      save.ego = clamp(save.ego + (def.id === 'chairman' ? 10 : 6));
      save.brand = clamp(save.brand + 5);
      save.cash += def.id === 'chairman' ? 15000 : 4000;
    } else {
      save.trust = clamp(save.trust + 2);
      save.ego = clamp(save.ego - 3);
      save.brand = clamp(save.brand + 1);
      save.cash += 1500;
    }
    if (def.id === 'chairman') {
      save.flags.funeralDebt = won ? 'forgiven' : 'owed';
      addLog(save, won
        ? '1ton beat the Chairman. The funeral debt is forgiven. Ray\'s name stays on the door.'
        : '1ton lost to the Chairman. The funeral debt stays with Zenith, and so does the gym.');
    }
  } else if (def.id === 'moncton_undercard' || def.id === 'han_tyler') {
    if (won) {
      save.brand = clamp(save.brand + (def.id === 'han_tyler' ? 5 : 3));
      save.trust = clamp(save.trust + 2);
      save.cash += def.id === 'han_tyler' ? 2500 : 1500;
      addLog(save, def.id === 'han_tyler'
        ? 'Mateo beat Tyler Vance in the exhibition. Tyler gave his whole purse to the gym. Mateo gave his to the funeral.'
        : 'Mateo beat Luc Arsenault on the tribute card. The Coliseum chanted Ray\'s name for a full minute.');
    } else {
      save.brand = clamp(save.brand + 1);
      save.heat = clamp(save.heat + 2);
      addLog(save, def.id === 'han_tyler'
        ? 'Tyler won the exhibition and still gave his purse to the gym. Mateo apologised to the bucket.'
        : 'Mateo lost the tribute fight. The Coliseum gave him a standing ovation and he couldn\'t look at the first row.');
    }
  } else if (def.id === 'han_spadam') {
    if (won) {
      save.brand = clamp(save.brand + 8);
      save.trust = clamp(save.trust + 4);
      save.cash += 6000;
      save.flags.gymMortgage = 'saved';
      addLog(save, 'Mateo beat Spadam Biggs and the mortgage on Ray\'s gym came back to the family. Han cried in the parking lot and blamed the rain.');
    } else {
      save.brand = clamp(save.brand - 3);
      save.heat = clamp(save.heat + 5);
      save.flags.gymMortgage = 'lost';
      addLog(save, 'Spadam beat Mateo. The mortgage stays with Zenith, and the paperwork goes back in the drawer.');
    }
  } else if (def.id === 'brick') {
    if (won) {
      save.brand = clamp(save.brand + 7);
      save.trust = clamp(save.trust + 3);
      save.cash += 5000;
    } else {
      save.brand = clamp(save.brand - 2);
      save.heat = clamp(save.heat + 4);
    }
  } else if (def.id === 'mateo_spar') {
    save.trust = clamp(save.trust + 3);
    save.ego = clamp(save.ego + 2);
  } else if (def.id === 'cuchillo_rematch') {
    if (won) {
      save.brand = clamp(save.brand + 9);
      save.heat = clamp(save.heat + 6);
      save.cash += 8000;
    } else {
      save.brand = clamp(save.brand - 5);
      save.heat = clamp(save.heat + 8);
    }
  } else if (def.id === 'crew_duke' || def.id === 'crew_rico' || def.id === 'crew_cesar') {
    const value = def.id === 'crew_cesar' ? 3 : def.id === 'crew_rico' ? 2 : 1;
    if (won) {
      save.brand = clamp(save.brand + 3 + value * 2);
      save.heat = clamp(save.heat + 2 + value * 2);
      save.trust = clamp(save.trust + value);
      save.cash += value * 1500;
      addLog(save, `${def.name}: one more name off the napkin.`);
    } else {
      save.brand = clamp(save.brand + 1);
      save.heat = clamp(save.heat + 3);
      addLog(save, `${def.name}: you lost the street fight. The name stays on the napkin.`);
    }
    // chapter ten, halfway: Han starts the cut up to light heavyweight for Cesar, and his knee goes
    if (def.id === 'crew_rico' && !save.flags.hanInjured) {
      save.flags.hanInjured = true;
      addLog(save, 'Han tore his knee in camp, three weeks into the move up to light heavyweight. Mateo has the Cesar fight now. He didn\'t ask for it. He didn\'t say no.');
    }
  }
  addLog(save, `${def.name}: ${result === 'W' ? 'WON' : result === 'L' ? 'LOST' : 'DRAW'}  /  ${r.method} R${r.round} ${r.time}.`);
  touch(save);
  return rec;
}

export function advanceStoryChapter(save: StorySave): boolean {
  if (!chapterReady(save)) return false;
  const leaving = storyChapter(save);
  if (leaving.id === 'brother') {
    save.flags.rayDead = true;
    save.heat = clamp(save.heat + 10);
    save.brand = clamp(save.brand + 6);
    save.log.push('Uncle Ray died in the street outside the Old Dome. The police have three names. Han has the same three names.');
  }
  // the title fight: a loss (or a draw) ends the story; a win opens the secret chapter
  if ((leaving.id === 'buyback' && save.flags.finalWinner !== 'player') || leaving.id === 'legacy') {
    save.status = 'ended';
    if (!save.ending) save.ending = storyEnding(save).id;
    touch(save);
    return true;
  }
  save.chapter++;
  if (save.chapter >= STORY_CHAPTERS.length) {
    save.chapter = STORY_CHAPTERS.length - 1;
    save.status = 'ended';
    if (!save.ending) save.ending = storyEnding(save).id;
    return true;
  }
  save.actionsLeft = DAYS_PER_WEEK;
  save.week = 1;
  save.totalWeeks = (save.totalWeeks ?? 0) + CHAPTER_GAP_WEEKS;
  // Between chapters the body gets a week it did not ask for. The plot does not.
  save.fatigue = clamp(save.fatigue - (save.chapter < 4 ? 26 : 18));
  addLog(save, `CHAPTER ${storyChapter(save).no}: ${storyChapter(save).title}`);
  touch(save);
  return true;
}

// ---------------------------------------------------------------- endings

export const STORY_ENDINGS: StoryEndingDef[] = [
  {
    id: 'torch',
    title: 'THE TORCH',
    kicker: 'THE PRIDE OF THE MARITIMES HANDS IT DOWN',
    body: 'Mateo beats Han in the warehouse where they both learned to mop. Han gets up, takes the middleweight belt off the canvas and buckles it around Mateo himself. "Ray said one day a kid would walk in the door and be better than me. He said I\'d hate it. I don\'t." Han takes over the Tuesday class. Mateo fights on the poster. The soup is made Marie\'s way, and nobody has to ask whose recipe it is.',
    color: 0xe8c060,
    good: true,
    rank: 'S',
  },
  {
    id: 'student',
    title: 'NOT YET, KID',
    kicker: 'THE TEACHER KEEPS THE BELT. THE STUDENT KEEPS THE LESSON.',
    body: 'Han wins. Barely. He spends the whole post-fight interview talking about Mateo. "Monday. Six a.m.," he tells him in the cage, which is what Ray used to say. Mateo is there at 5:40. The company is home. The rematch is already on the whiteboard, in Han\'s handwriting, with a smiley face.',
    color: 0xc0a070,
    good: true,
    rank: 'A',
  },
  {
    id: 'champion',
    title: 'THE CHAMPION',
    kicker: 'THE BELT STAYS IN THE WAREHOUSE',
    body: 'Mateo defends the belt and leaves Cesar on the canvas where Ray fell. He dedicates it to the soup. The company is home, the belt is real, and Han is in the corner every night, on his good knee, yelling about the jab. Han has already started a file on him, and he thinks nobody knows.',
    color: 0x7aa86a,
    good: true,
    rank: 'A',
  },
  {
    id: 'onenight',
    title: 'ONE GOOD NIGHT',
    kicker: 'THE BELT LEAVES WITH LA MANO',
    body: 'Cesar takes the belt back. Mateo had one good night, and he\'ll always have it. The company is still home; the belt just isn\'t. Han drives him home in Ray\'s van with no heat. Halfway there he says "Monday. Six a.m." Mateo nods. Neither of them mentions the belt in the back.',
    color: 0x8a7a5a,
    good: false,
    rank: 'C',
  },
  {
    id: 'buyback',
    title: 'THE BUYBACK',
    kicker: 'THE COMPANY COMES HOME',
    body: 'Mateo beats him. Zenith signs the paper with the same pen they used to take the company. 1ton signs the back of the poster, then asks if the warehouse has a women\'s division. It does now. Dane puts the CBFC sign back over the door. It\'s crooked. Nobody fixes it. Ray\'s bucket stays in the corner, and every year the sign hangs a little lower.',
    color: 0xd9a441,
    good: true,
    rank: 'S',
  },
  {
    id: 'house',
    title: 'THE HOUSE THAT 1TON BUILT',
    kicker: 'HE WINS. HE STAYS.',
    body: 'He beats Mateo, then refuses the Zenith contract on live television. He says the warehouse isn\'t for sale and neither is the man who taught him to hold his hands up. You aren\'t sure whether you won or lost. You\'re sure the rent is paid. Mateo says that\'s the family business. He\'s wearing Ray\'s cardigan and it\'s three sizes too big.',
    color: 0x7aa86a,
    good: true,
    rank: 'S',
  },
  {
    id: 'family',
    title: 'THE FAMILY BUSINESS',
    kicker: 'THE COMPANY SPLITS IN TWO',
    body: 'Mateo wins the fight, and you split the company down the middle with 1ton anyway. He runs the lucha division. You run the paperwork. Every show ends with both of you in the cage, arguing about the main event while Bradie films it for the website.',
    color: 0x8aa2b8,
    good: true,
    rank: 'A',
  },
  {
    id: 'longcon',
    title: 'THE LONG CON',
    kicker: 'YOU WIN THE COMPANY. YOU LOSE THE ROOM.',
    body: 'Mateo beats him. The paperwork is yours. The footage of how you got there isn\'t. 1ton does one interview, says "he trained me to be a weapon, then got upset when I worked," and walks. The buyback makes the news. The warehouse never sells out again.',
    color: 0x9a7ab8,
    good: false,
    rank: 'C',
  },
  {
    id: 'role',
    title: 'ROLE REVERSAL',
    kicker: 'HE WINS. YOU ASK THE QUESTIONS.',
    body: 'He beats Mateo and takes the company. Six months later you\'re in the back row with a notebook, asking the new president about Mexican fighters. 1ton answers every question. He answers them well, in full sentences, with his hands still.',
    color: 0xb85a5a,
    good: false,
    rank: 'D',
  },
  {
    id: 'zenith',
    title: 'ZENITH\'S NEW FACE',
    kicker: 'HE WINS. THEY OWN HIM.',
    body: 'He beats Mateo. Zenith makes him the face of the buyback, then the face of the network, then a logo. You see him once, on a billboard, with his beard airbrushed into a smile. He doesn\'t ask about Mexican fighters anymore. The network has a list of approved questions, and that one isn\'t on it.',
    color: 0x8e2f2f,
    good: false,
    rank: 'F',
  },
  {
    id: 'empty',
    title: 'AN EMPTY CAGE',
    kicker: 'YOU WIN. NOBODY STAYS.',
    body: 'Mateo beats him. The company is yours. Ray\'s chair is empty. Mateo signs with Xavier anyway. Bradie takes a job with a streaming service. The cage is clean, the lights work, and the building is so quiet you can hear the rent. You bought the company back. Mateo\'s key is in an envelope on your desk.',
    color: 0x6a6a72,
    good: false,
    rank: 'D',
  },
  {
    id: 'draw',
    title: 'EVERYBODY LOSES',
    kicker: 'THE CARDS ARE IN. NOBODY IS HAPPY.',
    body: 'A draw. Zenith\'s lawyers call it a tie, which in their language means they keep everything. 1ton leaves with the belt. You leave with the warehouse. The rematch is announced for a date that doesn\'t exist.',
    color: 0x8a7a5a,
    good: false,
    rank: 'C',
  },
];

export function storyEndingById(id: string | null): StoryEndingDef {
  return STORY_ENDINGS.find((e) => e.id === id) ?? STORY_ENDINGS[0];
}

export function storyEnding(save: StorySave): StoryEndingDef {
  // the secret chapter decides first
  const legacy = String(save.flags.legacyWinner ?? '');
  if (legacy) return storyEndingById(legacy === 'mateo' ? 'torch' : 'student');
  const defense = String(save.flags.defenseWinner ?? '');
  if (defense) return storyEndingById(defense === 'mateo' ? 'champion' : 'onenight');
  const winner = String(save.flags.finalWinner ?? '');
  const highTrust = save.trust >= 68;
  const midTrust = save.trust >= 42;
  const highBrand = save.brand >= 62;
  const honest = save.choices.talk_buyback === 'honest' || save.choices.talk_notebook === 'honest' || save.choices.talk_brother === 'honest';
  if (winner === 'player') {
    if (highTrust && highBrand) return storyEndingById('buyback');
    if (highTrust) return storyEndingById('family');
    if (highBrand || honest) return storyEndingById('longcon');
    return storyEndingById('empty');
  }
  if (winner === 'oneton') {
    if (highTrust && save.ego < 82) return storyEndingById('house');
    if (midTrust) return storyEndingById('role');
    return storyEndingById('zenith');
  }
  return storyEndingById('draw');
}

// ---------------------------------------------------------------- summaries

export function storyRecord(save: StorySave, who: 'oneton' | 'han' | 'mateo' | 'corner'): { w: number; l: number; d: number } {
  const list = save.fights.filter((f) => (who === 'corner' ? f.player === 'han' || f.player === 'mateo' : f.player === who));
  return {
    w: list.filter((f) => f.result === 'W').length,
    l: list.filter((f) => f.result === 'L').length,
    d: list.filter((f) => f.result === 'D').length,
  };
}

export function storyProgress(save: StorySave): string {
  const ch = storyChapter(save);
  return `${Math.min(ch.no, Math.max(MAIN_CHAPTERS, ch.no))} / ${Math.max(MAIN_CHAPTERS, ch.no)}`;
}

export function storyNextLabel(save: StorySave): string {
  const ch0 = storyChapter(save);
  if (storyWeek(save) < chapterWeeks(ch0) && !fightThisWeek(save)) return `WEEK ${storyWeek(save)}/${chapterWeeks(ch0)}  /  ${save.actionsLeft} DAY${save.actionsLeft === 1 ? '' : 'S'} LEFT`;
  if (!talkedThisChapter(save) && !fightThisWeek(save)) return 'TALK BEFORE YOU MOVE ON';
  const fights = chapterFights(storyChapter(save), save);
  const next = fights.find((f) => !fightDone(save, f));
  if (next) return fights.length > 1 ? `FIGHT ${fights.indexOf(next) + 1}/${fights.length}: ${next.name}` : `FIGHT: ${next.hook}`;
  return 'CONTINUE THE STORY';
}

export function storyStatLine(save: StorySave): string {
  const ch = storyChapter(save);
  return `CH.${ch.no} "${ch.title}"  /  TRUST ${save.trust}  /  EGO ${save.ego}  /  BRAND ${save.brand}  /  HEAT ${save.heat}`;
}
