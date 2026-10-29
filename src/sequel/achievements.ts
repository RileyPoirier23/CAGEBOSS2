/**
 * CAGE BOSS II achievements. All new, none shared with the first game.
 *
 * These are checked against a live SeqRun, then remembered forever in
 * cageboss2.achievements so a new season does not erase a very stupid mistake
 * you were proud of.
 */
import { loadJSON, storeJSON } from '../core/save';
import { BUYBACK_CASH, SEASON_WEEKS, type SeqRun, type StorySave } from './types';
import { MAIN_CHAPTERS, STORY_ENDINGS } from './story';

export type SeqAchCategory = 'season' | 'fighting' | 'business' | 'story';

export interface SeqAchievement {
  id: string;
  name: string;
  desc: string;
  category: SeqAchCategory;
  /** an existing trophy-art key, so the cabinet has more than one shape in it */
  art: string;
  test: (run: SeqRun) => boolean;
}

const KEY = 'cageboss2.achievements';

export function seqUnlocked(): Record<string, number> {
  return loadJSON<Record<string, number>>(KEY, {});
}

export function hasSeqAchievement(id: string): boolean {
  return !!seqUnlocked()[id];
}

const done = (run: SeqRun): boolean => run.status === 'ended';
const ending = (id: string) => (run: SeqRun): boolean => run.ending === id;
const phaseWins = (run: SeqRun): number => [1, 2, 3, 4].filter((n) => run.flags[`phase_${n}`] === 'won').length;

export const SEQ_ACHIEVEMENTS: SeqAchievement[] = [
  // ---------------------------------------------------------------- the season
  {
    id: 'seq_open',
    name: 'OPEN FOR BUSINESS',
    desc: 'Run your first show in the warehouse. The cage is up. Nobody is insured.',
    category: 'season',
    art: 'c_first_event',
    test: (run) => run.stats.shows >= 1,
  },
  {
    id: 'seq_ten_shows',
    name: 'TEN SATURDAYS',
    desc: 'Run ten shows. The neighbours have started asking questions.',
    category: 'season',
    art: 'c_ten_events',
    test: (run) => run.stats.shows >= 10,
  },
  {
    id: 'seq_thirty_shows',
    name: 'THE LONG SEASON',
    desc: 'Run thirty shows in one season. The word "interim" appears on your business cards.',
    category: 'season',
    art: 'c_presented',
    test: (run) => run.stats.shows >= 30,
  },
  {
    id: 'seq_full_forty',
    name: 'THE FULL FORTY',
    desc: 'Reach the end of the forty-week season with the promotion still alive.',
    category: 'season',
    art: 'c_ending',
    test: (run) => done(run) && run.week >= SEASON_WEEKS,
  },
  {
    id: 'seq_quarter_sweep',
    name: 'FOUR FOR FOUR',
    desc: 'Clear all four quarterly goals in one season.',
    category: 'season',
    art: 'fm_champ',
    test: (run) => phaseWins(run) >= 4,
  },

  // ---------------------------------------------------------------- the endings
  {
    id: 'seq_end_buyback',
    name: 'THE BUYBACK',
    desc: 'Buy the company back from Zenith. Keep the parking spot in your heart.',
    category: 'story',
    art: 'c_ending',
    test: ending('buyback'),
  },
  {
    id: 'seq_end_early',
    name: 'EARLY WINDOW',
    desc: 'Buy the company back before week 40. The lawyers hate deadlines that are met.',
    category: 'story',
    art: 'fm_first_belt',
    test: (run) => run.ending === 'buyback' && run.week < SEASON_WEEKS,
  },
  {
    id: 'seq_end_cult',
    name: 'CULT HEROES',
    desc: 'Reach the CULT HEROES ending. The warehouse is full and the merch is bootleg.',
    category: 'story',
    art: 'fm_show',
    test: ending('cult'),
  },
  {
    id: 'seq_end_partner',
    name: "THE DEVIL'S SHARE",
    desc: "Reach THE DEVIL'S SHARE ending. You have a seat at the table. Somebody else owns the table.",
    category: 'story',
    art: 'c_rich',
    test: ending('partner'),
  },
  {
    id: 'seq_end_survivor',
    name: 'STILL STANDING',
    desc: 'Reach the STILL STANDING ending. Rent paid, lights on, no parade.',
    category: 'story',
    art: 'fm_first_w',
    test: ending('survivor'),
  },
  {
    id: 'seq_end_raid',
    name: 'SHUT DOWN',
    desc: 'Get raided by the commission. Somebody got the whole thing on camera.',
    category: 'story',
    art: 'fm_bk',
    test: ending('raid'),
  },
  {
    id: 'seq_end_broke',
    name: 'THE LIGHTS GO OUT',
    desc: 'Run out of money. The generator was the first to know.',
    category: 'story',
    art: 'fm_rich',
    test: ending('broke'),
  },
  {
    id: 'seq_end_empty',
    name: 'NOBODY LEFT',
    desc: 'Run out of fighters. The group chat goes quiet.',
    category: 'story',
    art: 'fm_lounge',
    test: ending('empty'),
  },

  // ---------------------------------------------------------------- the fights
  {
    id: 'seq_ten_wins',
    name: 'TEN WINS',
    desc: 'Win ten fights in a single season.',
    category: 'fighting',
    art: 'fm_10w',
    test: (run) => run.stats.wins >= 10,
  },
  {
    id: 'seq_25_wins',
    name: 'TWENTY-FIVE WINS',
    desc: 'Win twenty-five fights in a single season. The cage has a favourite corner.',
    category: 'fighting',
    art: 'fm_streak5',
    test: (run) => run.stats.wins >= 25,
  },
  {
    id: 'seq_five_finishes',
    name: 'FIVE FINISHES',
    desc: 'Finish five fights in one season. Somebody has to explain the insurance.',
    category: 'fighting',
    art: 'fm_ko',
    test: (run) => run.stats.finishes >= 5,
  },
  {
    id: 'seq_dozen_finishes',
    name: 'A DOZEN FINISHES',
    desc: 'Finish twelve fights in one season. The commission has a folder with your name on it.',
    category: 'fighting',
    art: 'fm_sub',
    test: (run) => run.stats.finishes >= 12,
  },
  {
    id: 'seq_first_belt',
    name: 'A BELT IS A BELT',
    desc: 'Crown your first champion. The belt is purchased online and validated by the crowd.',
    category: 'fighting',
    art: 'fm_first_belt',
    test: (run) => run.belts.length >= 1,
  },
  {
    id: 'seq_four_belts',
    name: 'GOLD STANDARD',
    desc: 'Have four champions at once. The posters are starting to look expensive.',
    category: 'fighting',
    art: 'fm_champ',
    test: (run) => run.belts.length >= 4,
  },
  {
    id: 'seq_eight_belts',
    name: 'THE WHOLE CABINET',
    desc: 'Have a champion in all eight divisions at once. None of the belts are recognised.',
    category: 'fighting',
    art: 'c_sellout',
    test: (run) => run.belts.length >= 8,
  },
  {
    id: 'seq_first_defense',
    name: 'DEFEND IT',
    desc: 'Win a title defense. The champion keeps the belt and the receipt.',
    category: 'fighting',
    art: 'fm_streak5',
    test: (run) => run.stats.defenses >= 1,
  },
  {
    id: 'seq_five_defenses',
    name: 'FIVE DEFENSES',
    desc: 'Win five title defenses in one season. The champion is now a tax bracket.',
    category: 'fighting',
    art: 'fm_champ',
    test: (run) => run.stats.defenses >= 5,
  },

  // ---------------------------------------------------------------- the business
  {
    id: 'seq_sellout',
    name: 'SELLOUT',
    desc: 'Sell out any room. The fire marshal has notes.',
    category: 'business',
    art: 'c_sellout',
    test: (run) => run.stats.sellouts >= 1,
  },
  {
    id: 'seq_big_gate',
    name: 'THE BIG GATE',
    desc: 'Break a $300,000 gate in one night.',
    category: 'business',
    art: 'c_rich',
    test: (run) => run.stats.bestGate >= 300000,
  },
  {
    id: 'seq_millionaire',
    name: 'MILLIONAIRE',
    desc: 'Have $1,000,000 in the account at any point. Do not tell the landlord.',
    category: 'business',
    art: 'c_rich',
    test: (run) => run.stats.peakCash >= 1000000,
  },
  {
    id: 'seq_full_locker',
    name: 'THE FULL LOCKER',
    desc: 'Fill the locker room to fourteen fighters. Nobody has a locker.',
    category: 'business',
    art: 'fm_lounge',
    test: (run) => run.roster.length >= 14,
  },
  {
    id: 'seq_profit_habit',
    name: 'A PROFITABLE HABIT',
    desc: 'Run five profitable shows in a row. The bank calls it a pattern.',
    category: 'business',
    art: 'c_rich',
    test: (run) => run.stats.bestProfitStreak >= 5,
  },
  {
    id: 'seq_first_camp',
    name: 'CAMP LIFE',
    desc: 'Send a fighter to a training camp. He came back different, or at least tired in a new way.',
    category: 'business',
    art: 'fm_pro',
    test: (run) => run.stats.camps >= 1,
  },
  {
    id: 'seq_five_camps',
    name: 'THE ACADEMY',
    desc: 'Send fighters to five camps in one season. The gym has a laminated schedule.',
    category: 'business',
    art: 'fm_pro',
    test: (run) => run.stats.camps >= 5,
  },
  {
    id: 'seq_first_skip',
    name: 'THE RENT IS DUE',
    desc: 'Take an off week on purpose. The calendar still moves.',
    category: 'business',
    art: 'fm_reader',
    test: (run) => run.stats.skips >= 1,
  },
  {
    id: 'seq_long_winter',
    name: 'THE LONG WINTER',
    desc: 'Skip eight weeks in one season. The crowd has a short memory.',
    category: 'business',
    art: 'fm_reader',
    test: (run) => run.stats.skips >= 8,
  },
  {
    id: 'seq_insurance',
    name: 'THE INSURANCE PLAN',
    desc: 'Get the roster actual medical coverage. Not a bucket. Not a voucher.',
    category: 'business',
    art: 'fm_bk',
    test: (run) => !!run.flags.insurance,
  },
  {
    id: 'seq_network',
    name: 'THE NETWORK',
    desc: 'Sign a television or streaming deal. The crew asks if the cage can be more aspirational.',
    category: 'business',
    art: 'c_presented',
    test: (run) => !!run.flags.tv_deal,
  },
  {
    id: 'seq_auction',
    name: 'THE AUCTION',
    desc: 'Bid on your own old company at the Zenith auction. The lawyer writes it down without looking up.',
    category: 'business',
    art: 'c_act2',
    test: (run) => !!run.flags.auction_bid,
  },
  {
    id: 'seq_ninety_heat',
    name: 'NINETY HEAT',
    desc: 'Reach 90 HEAT. The commission is not watching you. The commission is waiting.',
    category: 'business',
    art: 'fm_bk',
    test: (run) => run.stats.peakHeat >= 90,
  },
  {
    id: 'seq_raid_survivor',
    name: 'THE COMMISSION CAME',
    desc: 'Get raided and keep the promotion alive to the end of the season.',
    category: 'business',
    art: 'c_clean',
    test: (run) => run.stats.raids >= 1 && done(run) && run.week >= SEASON_WEEKS && run.ending !== 'raid',
  },
  {
    id: 'seq_buyback_ready',
    name: 'THE NUMBER',
    desc: `Reach ${'$' + BUYBACK_CASH.toLocaleString('en-US')} at any point. The number stops being a dare.`,
    category: 'business',
    art: 'c_rich',
    test: (run) => run.stats.peakCash >= BUYBACK_CASH,
  },

  // ---------------------------------------------------------------- the desk
  {
    id: 'seq_desk_first',
    name: 'PAPER TRAIL',
    desc: 'Process your first document at the commission desk. The lamp is warm. The coffee is not.',
    category: 'business',
    art: 'c_clean',
    test: (run) => run.stats.deskDocs >= 1,
  },
  {
    id: 'seq_desk_perfect',
    name: 'A PERFECT WEEK',
    desc: 'Clear a whole week of paperwork with every stamp correct, no citations, no bribes and no fixer.',
    category: 'business',
    art: 'c_presented',
    test: (run) => run.stats.deskPerfect >= 1,
  },
  {
    id: 'seq_desk_catcher',
    name: 'RED STRING',
    desc: 'Catch five forged or invalid documents in one season. Somebody in the back office is getting nervous.',
    category: 'business',
    art: 'fm_reader',
    test: (run) => run.stats.deskCatches >= 5,
  },
  {
    id: 'seq_desk_veteran',
    name: 'THE FILING CABINET',
    desc: 'Process twenty-five documents in one season. Your signature no longer looks like your name.',
    category: 'business',
    art: 'fm_bk',
    test: (run) => run.stats.deskDocs >= 25,
  },
  {
    id: 'seq_desk_bribe',
    name: 'THE ENVELOPE',
    desc: 'Take a bribe at the desk. The paper goes through. The heat stays.',
    category: 'business',
    art: 'c_rich',
    test: (run) => run.stats.deskBribes >= 1,
  },
  {
    id: 'seq_desk_delegate',
    name: 'THE FIXER',
    desc: 'Pay somebody else to read the paperwork. He left a coffee ring on the ledger.',
    category: 'business',
    art: 'c_clean',
    test: (run) => run.stats.deskDelegated >= 1,
  },
  {
    id: 'seq_desk_zenith',
    name: 'MATCHING RIGHTS',
    desc: 'Refuse a Zenith matching-rights clause. Marcus Vane will send another letter. He is very patient.',
    category: 'business',
    art: 'c_act2',
    test: (run) => [28, 34, 38].some((w) => run.flags['zenith_' + w] === 'deny'),
  },
  {
    id: 'seq_desk_no_cites',
    name: 'CLEAN HANDS',
    desc: 'Process at least twenty documents in a season without a single citation. The commission checks twice.',
    category: 'business',
    art: 'c_clean',
    test: (run) => run.stats.deskDocs >= 20 && run.stats.deskCites === 0,
  },
];

/** Unlock everything this run has earned. Returns only the new ones. */
export function claimSeqAchievements(run: SeqRun): SeqAchievement[] {
  // sandbox runs are for fun, not for trophies
  if (run.flags.sandbox || run.flags.demo) return [];
  const have = seqUnlocked();
  const fresh = SEQ_ACHIEVEMENTS.filter((a) => !have[a.id] && a.test(run));
  if (!fresh.length) return [];
  for (const a of fresh) have[a.id] = Date.now();
  storeJSON(KEY, have);
  return fresh;
}

export function seqAchievementProgress(): { have: number; total: number } {
  const have = seqUnlocked();
  const all = [...SEQ_ACHIEVEMENTS, ...TALE_ACHIEVEMENTS];
  return { have: all.filter((a) => !!have[a.id]).length, total: all.length };
}

// ---------------------------------------------------------------- tales of legacy
/** A story trophy: checked against a Tales of Legacy save instead of a promoter season. */
export interface TaleAchievement {
  id: string;
  name: string;
  desc: string;
  art: string;
  test: (save: StorySave) => boolean;
}

const won = (save: StorySave, fight: string): boolean => save.flags[`won_${fight}`] === true;
const finished = (save: StorySave): boolean => save.status === 'ended';

export const TALE_ACHIEVEMENTS: TaleAchievement[] = [
  {
    id: 'tale_first', name: 'THE BACK ROW', art: 'rtc_soup',
    desc: 'Finish chapter one. You have a gym, a kid who mops it and a pot of Ray\'s soup.',
    test: (s) => s.chapter >= 1,
  },
  {
    id: 'tale_allstar', name: 'RODEO GOLD', art: 'fm_first_belt',
    desc: 'Win Xavier\'s AllStar FC belt with 1ton. It came off a real rodeo and it still smells like one.',
    test: (s) => won(s, 'allstar_title'),
  },
  {
    id: 'tale_moncton', name: 'THE TRIBUTE', art: 'fm_show',
    desc: 'Win the Moncton undercard with Mateo. Luc asked for the kid, and he got him.',
    test: (s) => won(s, 'moncton_undercard'),
  },
  {
    id: 'tale_crew', name: 'STREET JUSTICE', art: 'fm_bk',
    desc: 'Beat Duke, Rico and Cesar in chapter ten. It doesn\'t fix Han\'s knee.',
    test: (s) => won(s, 'crew_duke') && won(s, 'crew_rico') && won(s, 'crew_cesar'),
  },
  {
    id: 'tale_alberto', name: 'ALBERTO', art: 'fm_reader',
    desc: 'Learn 1ton\'s real name. He\'d like it if you kept calling him 1ton.',
    test: (s) => !!s.flags.beat_true_name,
  },
  {
    id: 'tale_champion', name: 'THE BUYBACK', art: 'fm_champ',
    desc: 'Beat 1ton for the light heavyweight title with Mateo. Ray\'s bucket was in the corner.',
    test: (s) => s.flags.finalWinner === 'player',
  },
  {
    id: 'tale_secret', name: 'ONE MORE CHAPTER', art: 'leg_start',
    desc: 'Open the hidden sixteenth chapter. It only shows up after the buyback.',
    test: (s) => s.chapter >= MAIN_CHAPTERS,
  },
  {
    id: 'tale_s_rank', name: 'S RANK', art: 'c_ending',
    desc: 'Finish the story on an S-rank ending.',
    test: (s) => finished(s) && STORY_ENDINGS.find((e) => e.id === s.ending)?.rank === 'S',
  },
  {
    id: 'tale_red_pen', name: 'RED PEN', art: 'c_clean',
    desc: 'Catch ten bad clauses in one story. Dane\'s lawyers switch to a smaller font.',
    test: (s) => s.stats.catches >= 10,
  },
  {
    id: 'tale_clean', name: 'NOTHING GOT PAST YOU', art: 'c_presented',
    desc: 'Finish a story without missing a single bad clause (and catch at least three).',
    test: (s) => finished(s) && s.stats.missed === 0 && s.stats.catches >= 3,
  },
  {
    id: 'tale_walked', name: 'KEEP THE PEN', art: 'c_rich',
    desc: 'Walk out of a contract meeting without signing.',
    test: (s) => s.stats.walked >= 1,
  },
  {
    id: 'tale_undercard', name: 'THE UNDERCARD', art: 'fm_first_w',
    desc: 'Win ten undercard fights in one story.',
    test: (s) => s.stats.sideWins >= 10,
  },
  {
    id: 'tale_finishes', name: 'NO JUDGES', art: 'fm_ko',
    desc: 'Finish six fights inside the distance in one story. The judges get paid either way.',
    test: (s) => s.stats.kos + s.stats.subs >= 6,
  },
  {
    id: 'tale_trust', name: 'HE PICKS UP', art: 'fm_lounge',
    desc: 'Get 1ton\'s trust to 90. He answers on the first ring now.',
    test: (s) => s.trust >= 90,
  },
  {
    id: 'tale_press', name: 'PRESS ROW', art: 'fm_rich',
    desc: 'Sit through eight press conferences in one story.',
    test: (s) => s.stats.pressers >= 8,
  },
];

/** Unlock the story trophies this save has earned (into the same cabinet). Returns only the new ones. */
export function claimTaleAchievements(save: StorySave): TaleAchievement[] {
  if (save.flags.sandbox || save.flags.demo) return [];
  const have = seqUnlocked();
  const fresh = TALE_ACHIEVEMENTS.filter((a) => !have[a.id] && a.test(save));
  if (!fresh.length) return [];
  for (const a of fresh) have[a.id] = Date.now();
  storeJSON(KEY, have);
  return fresh;
}
