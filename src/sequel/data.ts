/** Static content for CAGE BOSS II: venues, weekly stunts, ad buys, endings. */
import { PAL } from '../art/palette';
import type { Skills } from '../core/types';
import type { SeqEnding } from './types';

export interface SeqVenue {
  id: string;
  name: string;
  tagline: string;
  capacity: number;
  ticket: number;
  rent: number;
  production: number;
  heat: number;
  streamMult: number;
  unlockBuzz: number;
  /** The city licence only clears from this week. Buzz opens the door; paperwork unlocks it. */
  unlockWeek: number;
  art: 'warehouse' | 'vfw' | 'rink' | 'theater' | 'casino' | 'dome';
}

export const VENUES: SeqVenue[] = [
  {
    id: 'warehouse',
    name: 'The Warehouse',
    tagline: 'A rented loading bay with a cage, a generator and a smell.',
    capacity: 260, ticket: 20, rent: 1200, production: 400, heat: 3, streamMult: 1, unlockBuzz: 0, unlockWeek: 1, art: 'warehouse',
  },
  {
    id: 'vfw',
    name: 'VFW Post 1138',
    tagline: 'Bingo on Tuesday, blood on Saturday. Same chairs.',
    capacity: 620, ticket: 30, rent: 4200, production: 900, heat: 5, streamMult: 1.05, unlockBuzz: 28, unlockWeek: 3, art: 'vfw',
  },
  {
    id: 'rink',
    name: 'The Roller Rink',
    tagline: 'The sticky floor is part of the ground game now.',
    capacity: 1300, ticket: 42, rent: 9500, production: 1900, heat: 7, streamMult: 1.1, unlockBuzz: 45, unlockWeek: 8, art: 'rink',
  },
  {
    id: 'theater',
    name: 'The Orpheum',
    tagline: 'A real stage. The ghost in row F is a season-ticket holder.',
    capacity: 2400, ticket: 58, rent: 23000, production: 4200, heat: 9, streamMult: 1.2, unlockBuzz: 58, unlockWeek: 14, art: 'theater',
  },
  {
    id: 'casino',
    name: 'Casino Ballroom',
    tagline: 'The house takes a cut of the gate, the bar and your soul.',
    capacity: 3800, ticket: 78, rent: 46000, production: 8500, heat: 14, streamMult: 1.35, unlockBuzz: 70, unlockWeek: 21, art: 'casino',
  },
  {
    id: 'dome',
    name: 'The Old Dome',
    tagline: 'The building where you used to be somebody. It still echoes.',
    capacity: 6400, ticket: 96, rent: 92000, production: 19000, heat: 20, streamMult: 1.5, unlockBuzz: 82, unlockWeek: 29, art: 'dome',
  },
];

export interface SeqGimmick {
  id: string;
  name: string;
  blurb: string;
  fill: number;
  gate: number;
  stream: number;
  buzz: number;
  heat: number;
  locker: number;
  cost: number;
  injury: number;
}

export const GIMMICKS: SeqGimmick[] = [
  {
    id: 'normal', name: 'No Gimmick',
    blurb: 'Two fighters. One cage. A concept so old it works.',
    fill: 0, gate: 1, stream: 1, buzz: 1, heat: 0, locker: 0, cost: 0, injury: 0,
  },
  {
    id: 'free', name: 'Free Entry',
    blurb: 'Fill the room. Sell the hot dogs. Lose the gate.',
    fill: 0.18, gate: 0.15, stream: 1.1, buzz: 7, heat: 1, locker: 2, cost: 0, injury: 0,
  },
  {
    id: 'pirate', name: 'Pirate Stream',
    blurb: 'Two phones, one link, no lawyers. Yet.',
    fill: -0.05, gate: 1, stream: 2.4, buzz: 3, heat: 7, locker: 0, cost: 0, injury: 0,
  },
  {
    id: 'barbed', name: 'Barbed Wire Cage',
    blurb: 'The commission said no. The commission is not here.',
    fill: 0.06, gate: 1.15, stream: 1.35, buzz: 13, heat: 9, locker: -5, cost: 1500, injury: 0.16,
  },
  {
    id: 'celebrity', name: 'Celebrity Judge',
    blurb: 'A reality star scores the main event. Nobody explains the criteria.',
    fill: 0.08, gate: 1.05, stream: 1.2, buzz: 10, heat: 3, locker: -2, cost: 5000, injury: 0,
  },
  {
    id: 'charity', name: 'Kids Charity Card',
    blurb: 'Small gloves, big tax write-off, one very confused mascot.',
    fill: 0.03, gate: 0.9, stream: 1.05, buzz: 14, heat: -5, locker: 6, cost: 7000, injury: 0,
  },
  {
    id: 'low', name: 'Low Profile',
    blurb: 'No flyers. No stream. No reason for anyone to notice.',
    fill: -0.12, gate: 0.85, stream: 0.45, buzz: -6, heat: -13, locker: 0, cost: 0, injury: 0,
  },
  {
    id: 'mystery', name: 'Masked Mystery Fighter',
    blurb: 'Nobody knows who he is. Everybody has a theory.',
    fill: 0.1, gate: 1.08, stream: 1.25, buzz: 9, heat: 2, locker: -1, cost: 2500, injury: 0,
  },
  {
    id: 'belt', name: 'Two Belts, One Night',
    blurb: 'Neither belt is officially recognized. Both look great on a poster.',
    fill: 0.05, gate: 1.1, stream: 1.15, buzz: 7, heat: 4, locker: 1, cost: 6000, injury: 0,
  },
  {
    id: 'parking', name: 'Parking Lot Brawl',
    blurb: 'The lease says no fighting in the parking lot. The lease is in the trunk.',
    fill: 0.02, gate: 0.8, stream: 1.5, buzz: 8, heat: 11, locker: 2, cost: 0, injury: 0.08,
  },
];

export interface SeqAdLevel {
  label: string;
  cost: number;
  fill: number;
  buzz: number;
}

export const AD_LEVELS: SeqAdLevel[] = [
  { label: 'No ads', cost: 0, fill: 0, buzz: 0 },
  { label: 'Flyers', cost: 2500, fill: 0.06, buzz: 2 },
  { label: 'Radio spots', cost: 7000, fill: 0.13, buzz: 5 },
  { label: 'Billboard', cost: 14000, fill: 0.22, buzz: 8 },
];

/** The season is long on purpose. Four quarters, four ways to prove this is a promotion. */
export interface SeqPhaseDef {
  no: number;
  name: string;
  start: number;
  end: number;
  goal: string;
  reward: string;
  rewardCash: number;
  rewardBuzz: number;
  rewardLocker: number;
}

export const SEASON_PHASES: SeqPhaseDef[] = [
  {
    no: 1,
    name: 'THE WAREHOUSE YEARS',
    start: 1,
    end: 10,
    goal: 'Reach 40 BUZZ by the end of week 10 with the lights still on.',
    reward: '$15,000 and a locker room that believes you.',
    rewardCash: 15000,
    rewardBuzz: 0,
    rewardLocker: 5,
  },
  {
    no: 2,
    name: 'THE GRIND',
    start: 11,
    end: 20,
    goal: 'Bank $180,000 and reach 55 BUZZ by the end of week 20.',
    reward: '$35,000 from a sponsor who finally returns your calls.',
    rewardCash: 35000,
    rewardBuzz: 3,
    rewardLocker: 0,
  },
  {
    no: 3,
    name: 'THE TELEVISION WARS',
    start: 21,
    end: 30,
    goal: 'Sell out any room, or break a $200,000 gate, by week 30.',
    reward: '$60,000 and a network executive who suddenly knows your name.',
    rewardCash: 60000,
    rewardBuzz: 5,
    rewardLocker: 0,
  },
  {
    no: 4,
    name: 'THE BUYBACK WINDOW',
    start: 31,
    end: 40,
    goal: 'Reach $5,000,000 and 85 BUZZ by week 39. Then finish it.',
    reward: 'A $250,000 closing bonus. The last cheque is always the hardest.',
    rewardCash: 250000,
    rewardBuzz: 0,
    rewardLocker: 0,
  },
];

/** What a fighter does with a week off. The body is a business expense. */
export interface SeqCampDef {
  id: string;
  name: string;
  blurb: string;
  cost: number; // per week
  gains: Partial<Record<keyof Skills, number>>;
  star: number;
  morale: number;
  heal: number; // extra weeks of injury healed per skipped week
  buzz: number;
  heat: number;
}

export const CAMPS: SeqCampDef[] = [
  {
    id: 'rest',
    name: 'REST',
    blurb: 'Sleep, soup, and one phone call from your mother. The cheapest camp there is.',
    cost: 0,
    gains: {},
    star: 0,
    morale: 3,
    heal: 1,
    buzz: 0,
    heat: -1,
  },
  {
    id: 'striking',
    name: 'STRIKING CAMP',
    blurb: 'A rented gym, a heavy bag with a name on it, and a coach who counts in Portuguese.',
    cost: 3200,
    gains: { striking: 1, power: 1 },
    star: 1,
    morale: 2,
    heal: 0,
    buzz: 1,
    heat: 0,
  },
  {
    id: 'grappling',
    name: 'GRAPPLING CAMP',
    blurb: 'Mats, sweat, and a man who insists the floor is a weapon.',
    cost: 3000,
    gains: { wrestling: 1, grappling: 1 },
    star: 1,
    morale: 2,
    heal: 0,
    buzz: 1,
    heat: 0,
  },
  {
    id: 'cardio',
    name: 'CARDIO CAMP',
    blurb: 'Hill sprints. A lot of them. The hill is not insured.',
    cost: 2400,
    gains: { cardio: 1, durability: 1 },
    star: 0,
    morale: 1,
    heal: 0,
    buzz: 0,
    heat: 0,
  },
  {
    id: 'media',
    name: 'MEDIA CAMP',
    blurb: 'A podcast tour, three local news desks, and a lesson in saying nothing beautifully.',
    cost: 3800,
    gains: {},
    star: 5,
    morale: 2,
    heal: 0,
    buzz: 4,
    heat: 1,
  },
  {
    id: 'medical',
    name: 'MEDICAL CAMP',
    blurb: 'A real doctor, a real scan, and a bill that is also a real scan.',
    cost: 6500,
    gains: {},
    star: 0,
    morale: 4,
    heal: 3,
    buzz: 0,
    heat: -2,
  },
];

export const ENDINGS: Record<string, SeqEnding> = {
  buyback: {
    id: 'buyback',
    title: 'THE BUYBACK',
    kicker: 'You got the name back.',
    color: PAL.gold,
    good: true,
    body:
      'The wire clears. The lawyers stop calling. At 9am Monday you walk back through the doors of the building they took from you, ' +
      'past the same security guard, into the same office. The desk is smaller than you remember. The chair still smells like you. ' +
      'Zenith keeps the parking spot. You keep the company. Somewhere downstairs, a new kid is stamping paperwork and dreaming about your job. ' +
      'You should probably warn him. You will not.',
  },
  cult: {
    id: 'cult',
    title: 'CULT HEROES',
    kicker: 'You never bought the company. You built something stranger.',
    color: 0x6fd8a0,
    good: true,
    body:
      'The numbers never get big enough for a boardroom, but the room is always full. They sell bootleg shirts outside. They know the ring walks. ' +
      'A kid in the front row holds a sign that says CAGE BOSS SAVED MY LIFE. Zenith buys the old company for parts. You do not care. ' +
      'Your promotion fits in a warehouse and lives in a thousand phone screens. That is not a loss. That is a different kind of belt.',
  },
  partner: {
    id: 'partner',
    title: "THE DEVIL'S SHARE",
    kicker: 'You got a seat at the table. Somebody else owns the table.',
    color: PAL.ember,
    good: false,
    body:
      'The contract runs forty pages. You read three. Zenith keeps the logo, the archives and the right to fire you, but your name goes back on the building ' +
      'in tasteful grey letters. The first show under the new banner sells out in eleven minutes. The second one is booked by a committee. ' +
      'At the press conference, a man in a clean car smiles and calls you a partner. You smile back. The smile is the only thing in the building that is still yours.',
  },
  raid: {
    id: 'raid',
    title: 'SHUT DOWN',
    kicker: 'The commission finally found the warehouse.',
    color: PAL.blood,
    good: false,
    body:
      'They come in through both doors at 8:40pm, before the main event, carrying clipboards and a search warrant. The cage is unlicensed. The doctor is a vet. ' +
      'The bar is cash only. A fighter is handcuffed in his walkout robe while the crowd films it. The footage does numbers. You watch it from the back of a police car ' +
      'and think, honestly, that the lighting is better than anything you ever paid for.',
  },
  broke: {
    id: 'broke',
    title: 'THE LIGHTS GO OUT',
    kicker: 'The generator ran out before the dream did.',
    color: PAL.grey,
    good: false,
    body:
      'The landlord changes the locks on a Tuesday. The cage goes to a storage unit. Your fighters text asking if the show is still on, then stop texting. ' +
      'You keep the flyers in the trunk of your car, because throwing them away would feel like a decision. Six months later a guy at a bar says he saw one ' +
      'on a wall and asks if the league is coming back. You say yes. You are not lying. You are just very, very broke.',
  },
  empty: {
    id: 'empty',
    title: 'NOBODY LEFT',
    kicker: 'You built a locker room. Then you ran out of fighters.',
    color: PAL.slate,
    good: false,
    body:
      'The last one leaves a note on the cage door: "I have a family and you have a dream. Good luck with the dream." You read it four times. ' +
      'The warehouse is quiet enough to hear the generator. You could recruit again. You could also sit in the dark for a while. ' +
      'The promotion does not die with a bang. It dies with a group chat where nobody responds.',
  },
  survivor: {
    id: 'survivor',
    title: 'STILL STANDING',
    kicker: 'The season ends. The lights stay on.',
    color: PAL.bone,
    good: true,
    body:
      'No buyback. No parade. But the rent is paid, the cage is up and there are people outside waiting for the doors to open. ' +
      'You owe the commission a favor, the sponsor a phone call and the landlord an apology. You have a show next Saturday. ' +
      'In this business, that counts as a win. In every other business, it would be a cry for help.',
  },
};

/** The cover story shown on the back of the box. */
export const SEQUEL_TAGLINE = 'MMA. MONEY. MAYHEM. FORECLOSURE.';
export const SEQUEL_STORY =
  'Eighteen months ago Zenith Holdings bought your company, your desk and your name. You kept the debts. ' +
  'Now you have a warehouse, a cage, nine fighters who still take your calls, and forty weeks to make the papers forget ' +
  'the part where you lost. Run the shows. Build a champion. Skip a week when the body says so. Feed the beast. ' +
  'Buy your name back before Zenith changes the locks.';
