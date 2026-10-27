/**
 * CAGE BOSS II: THE BUYBACK
 *
 * A short, mean, run-based sequel. You lost the big promotion to Zenith
 * Holdings; now you have a warehouse, a cage and twenty weeks to build
 * something loud enough to buy your old life back.
 *
 * These types are deliberately separate from GameState: a sequel run is its
 * own little save file and never touches a promoter career.
 */
import type { Fighter, TickerLine } from '../core/types';

export const SEQUEL_VERSION = 1;
/** How many shows you get before the buyback window closes. */
export const SEASON_WEEKS = 40;
/** What Zenith wants for the company, and what the crowd has to believe. */
export const BUYBACK_CASH = 7_000_000;
export const BUYBACK_BUZZ = 90;

export interface SeqFighter {
  /** The full fighter record, so portraits, the fight sim and records all work. */
  f: Fighter;
  morale: number; // 0..100, personal
  star: number; // 0..100, draw power
  purse: number; // what they ask per fight
  signedWeek: number;
  injuredUntil: number; // first week they can fight again
  fights: number;
}

export interface SeqBout {
  a: string; // roster fighter id
  b: string; // free-agent opponent id
}

export interface SeqBoutResult {
  slot: number;
  aId: string;
  bId: string;
  aName: string;
  bName: string;
  aNick: string;
  bNick: string;
  winner: 'a' | 'b' | 'draw';
  method: string;
  round: number;
  time: string;
  detail: string;
  finish: boolean;
  aStarBefore: number;
  bStarBefore: number;
  injury: string;
  /**
   * The tape: both fighters as they walked out and the sim's play-by-play, so the show screen
   * can WATCH the bout in the arena. Kept on lastShow only (history drops it to keep saves small).
   */
  replay?: { A: Fighter; B: Fighter; rounds: number; referee: string; ticker: TickerLine[] };
}

export interface SeqShow {
  week: number;
  venue: number;
  gimmick: string;
  ad: number;
  results: SeqBoutResult[];
  gate: number;
  stream: number;
  merch: number;
  sponsor: number;
  purses: number;
  costs: number;
  net: number;
  fill: number;
  buzzBefore: number;
  buzzAfter: number;
  heatBefore: number;
  heatAfter: number;
  lockerBefore: number;
  lockerAfter: number;
  headline: string;
  body: string;
  notes: string[];
  raided: boolean;
  /** Zenith ran a card the same night (rivals.ts): who won it */
  zenith?: { name: string; won: boolean; line: string };
}

export interface SeqEventState {
  id: string;
}

export type SeqStatus = 'plan' | 'results' | 'event' | 'ended';

/** A belt the promotion invented for itself. It is real because the crowd says it is. */
export interface SeqBelt {
  division: string;
  holderId: string;
  defenses: number;
  wonWeek: number;
}

/** What happened while the lights were off. */
export interface SeqSkip {
  weeks: number;
  fromWeek: number;
  toWeek: number;
  cost: number;
  camp: string | null;
  campName: string;
  fighterId: string | null;
  fighterName: string | null;
  notes: string[];
  cashBefore: number;
  cashAfter: number;
  buzzBefore: number;
  buzzAfter: number;
  heatBefore: number;
  heatAfter: number;
  lockerBefore: number;
  lockerAfter: number;
}

// ---------------------------------------------------------------- the desk

/** Every piece of paper the sequel puts under the lamp. */
export type SeqDeskDocType =
  | 'bout' | 'medical' | 'permit' | 'sponsor' | 'cage'
  | 'press' | 'weighin' | 'expense' | 'memo' | 'zenith';

/** The four stamps. Approve and deny mean whatever the paper says they mean. */
export type SeqVerdict = 'approve' | 'deny' | 'escalate' | 'bury';

export interface SeqDeskField {
  key: string;
  label: string;
  value: string;
  kind?: 'text' | 'sig' | 'barcode' | 'photo';
}

/** A value on record: the file card, the licence, or the rulebook. */
export interface SeqDeskTarget {
  key: string;
  label: string;
  value: string;
  where: 'file' | 'rule' | 'card';
}

/**
 * One legitimate comparison: a field on the paper against the record it is
 * supposed to match. `bad` is what the paper says when somebody has been at it
 * with a photocopier and a dream.
 */
export interface SeqDeskLink {
  docKey: string;
  targetKey: string;
  label: string;
  note: string;
  bad: string;
}

export interface SeqDeskVisitor {
  kind: 'fighter' | 'manager' | 'doctor' | 'exec' | 'cop' | 'lawyer' | 'reporter' | 'fan';
  name: string;
  role: string;
  /** seed for a generic portrait when there is no fighter/reporter to draw */
  seed: string;
  fighterId?: string;
  reporterId?: string;
}

export interface SeqDeskDoc {
  id: string;
  type: SeqDeskDocType;
  title: string;
  subject: string;
  subtitle: string;
  week: number;
  seed: number;
  fields: SeqDeskField[];
  targets: SeqDeskTarget[];
  links: SeqDeskLink[];
  visitor: SeqDeskVisitor;
  line: string;
  askClean: string;
  askExcuse: string;
  askFix: string;
  askBribe: string;
  bribe: number;
  fixCost: number;
  /** what the paper is actually asking you to do (memos and Zenith letters have opinions) */
  desired: SeqVerdict;
  status: 'pending' | 'done';
  verdict: SeqVerdict | null;
  correct: boolean | null;
  result: string;
  /** `docKey>targetKey` for every comparison already found */
  flagged: string[];
  asked: number;
  citation: string | null;
  meta: Record<string, string | number | boolean>;
}

export interface SeqDeskCitation {
  week: number;
  docId: string;
  title: string;
  reason: string;
  fine: number;
  warning: boolean;
}

export interface SeqDeskState {
  week: number;
  docs: SeqDeskDoc[];
  done: boolean;
  perfect: boolean;
  delegated: boolean;
  processed: number;
  correct: number;
  catches: number;
  misses: number;
  wrong: number;
  cites: number;
  fines: number;
  bribes: number;
  buried: number;
  escalated: number;
  lastCitation: SeqDeskCitation | null;
  citations: SeqDeskCitation[];
  log: string[];
}

export interface SeqRun {
  version: number;
  seed: number;
  rng: number;
  week: number; // 1..SEASON_WEEKS
  cash: number;
  buzz: number; // 0..100
  heat: number; // 0..100; 100 = raid
  locker: number; // 0..100; stable morale
  venue: number; // index into VENUES
  ad: number; // index into AD_LEVELS
  gimmick: string;
  card: { bouts: SeqBout[] };
  roster: SeqFighter[];
  freeAgents: Fighter[];
  belts: SeqBelt[];
  history: SeqShow[];
  lastShow: SeqShow | null;
  lastSkip: SeqSkip | null;
  event: SeqEventState | null;
  eventResult: string | null;
  eventLog: string[];
  phaseLog: string[];
  /** the week's paperwork, generated when the week turns over */
  desk: SeqDeskState;
  /** every pairing that has fought (rivals.ts), keyed "rosterId|opponentId" */
  rivalries?: Record<string, Rivalry>;
  status: SeqStatus;
  ending: string | null;
  flags: Record<string, number | string | boolean>;
  stats: {
    shows: number;
    wins: number;
    losses: number;
    draws: number;
    finishes: number;
    bestGate: number;
    signings: number;
    skips: number;
    camps: number;
    titleFights: number;
    defenses: number;
    raids: number;
    peakCash: number;
    peakBuzz: number;
    peakHeat: number;
    profitStreak: number;
    bestProfitStreak: number;
    sellouts: number;
    deskDocs: number;
    deskCatches: number;
    deskMisses: number;
    deskCites: number;
    deskPerfect: number;
    deskBribes: number;
    deskDelegated: number;
  };
}

/** Two fighters who have met before (rivals.ts): the next booking is a grudge match. */
export interface Rivalry { a: string; b: string; meetings: number; lastWinner: 'a' | 'b' | 'draw'; lastWeek: number; finishes: number }

export interface SeqBest {
  score: number;
  ending: string;
  week: number;
  cash: number;
  buzz: number;
  heat: number;
  wins: number;
  losses: number;
  seed: number;
  promotion: string;
}

export interface SeqEnding {
  id: string;
  title: string;
  kicker: string;
  body: string;
  color: number;
  good: boolean;
}

// ---------------------------------------------------------------- story mode

/**
 * STORY MODE is its own save: nine chapters, one trainee, one betrayal and a
 * final fight you can see coming from the back row. It never touches a run.
 */
export const STORY_VERSION = 1;

export type StoryStatus = 'hub' | 'ended';

export interface StoryTraining {
  striking: number;
  grappling: number;
  cardio: number;
  media: number;
}

export interface StoryDaneTraining {
  striking: number;
  grappling: number;
  cardio: number;
}

export interface StoryFightRecord {
  id: string;
  name: string;
  player: string;
  opponent: string;
  result: 'W' | 'L' | 'D';
  method: string;
  round: number;
  time: string;
  detail: string;
}

export interface StorySave {
  version: number;
  seed: number;
  chapter: number;
  actionsLeft: number;
  trust: number; // what 1ton thinks of you, 0..100
  brand: number; // how much the warehouse feels like a promotion, 0..100
  heat: number; // how much Zenith is watching, 0..100
  ego: number; // how much 1ton believes his own hype, 0..100
  cash: number;
  /** How much the last few weeks have taken out of the two of you (0..100). */
  fatigue: number;
  /** The week within the chapter (1..chapter weeks). actionsLeft is the days left in it (7 a week). */
  week?: number;
  /** Every week the story has lived through, chapter gaps included (the timeline: year, month). */
  totalWeeks?: number;
  /** Training experience per track ("oneton.striking", "corner.cardio"); the levels are xp / XP_PER_LEVEL. */
  xp?: Record<string, number>;
  /** Special moves unlocked sparring at Ray's, per man ("oneton", "corner"): ids from SPECIAL_MOVES. */
  moves?: Record<string, string[]>;
  training: StoryTraining;
  daneTraining: StoryDaneTraining;
  fights: StoryFightRecord[];
  choices: Record<string, string>;
  flags: Record<string, number | string | boolean>;
  log: string[];
  status: StoryStatus;
  ending: string | null;
  startedAt: number;
  updatedAt: number;
  playerName: string;
  stats: StoryStats;
}

/** Everything the trophy case and the ending page want to know about a campaign. */
export interface StoryStats {
  sideFights: number;
  sideWins: number;
  sideLosses: number;
  kos: number;
  subs: number;
  decisions: number;
  catches: number; // contract discrepancies caught
  missed: number; // discrepancies missed
  wrongFlags: number; // clauses flagged that were fine
  goodDeals: number;
  badDeals: number;
  walked: number;
  pressers: number;
  earnings: number;
}

export interface StoryEndingDef {
  id: string;
  title: string;
  kicker: string;
  body: string;
  color: number;
  good: boolean;
  rank: string;
}

export interface StoryTrophy {
  endings: string[];
  bestRank: string;
  chapters: number;
  trust: number;
  brand: number;
  catches: number;
  sideWins: number;
  playthroughs: number;
}
