/**
 * JUICED BUTLER'S WEEK IN REVIEW: the radio segment that opens every new week in both modes.
 * Juiced Butler and Sandwich Cormier talk about what you actually did: the gate, the main event,
 * the heat, Zenith's night across town, the presser, the training, the soup. Pure text: the
 * booth scene is in src/ui/sequel/radioui.ts.
 */
import type { SeqRun, StorySave } from './types';

export interface RadioLine { who: 'butler' | 'sandwich'; text: string }

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const pick = <T>(arr: T[], seed: number): T => arr[Math.abs(seed) % arr.length];

/** Promoter Mode: the week that just finished (the last show), in the booth's words. */
export function radioPromoter(run: SeqRun, boss: string): RadioLine[] {
  const s = run.lastShow;
  const seed = run.seed + run.week * 31;
  const out: RadioLine[] = [{ who: 'butler', text: pick([
    `Good evening, Moncton. This is Juiced Butler, week ${run.week}, and the warehouse is still standing.`,
    `Week ${run.week}. Juiced Butler, Sandwich Cormier, one microphone and a lot of opinions.`,
  ], seed) }];
  if (!s) {
    out.push({ who: 'sandwich', text: `No show last week. ${boss} says it was "strategic". I say the roof leaked.` });
    return out;
  }
  const main = s.results[0];
  if (main) {
    const w = main.winner === 'a' ? main.aName : main.winner === 'b' ? main.bName : null;
    out.push({ who: 'sandwich', text: w
      ? main.finish ? `Main event: ${w}, ${main.method}, round ${main.round}. I spilled my wings. Both of them.` : `Main event went the distance. ${w} on the cards. I agreed with two of the judges and the third one owes me money.`
      : `Main event was a draw. Nobody won, which is also how my marriage works.` });
  }
  out.push({ who: 'butler', text: s.fill >= 0.98 ? `Sold out. ${money(s.gate)} at the gate. The fire marshal stood in the back and pretended not to count.` : s.fill < 0.5 ? `${Math.round(Math.min(1, s.fill) * 100)} percent full. You could hear every punch. You could hear every cough.` : `${money(s.gate)} at the gate, ${Math.round(Math.min(1, s.fill) * 100)} percent full. Respectable. Like a nice cardigan.` });
  if (s.zenith) out.push({ who: 'sandwich', text: s.zenith.won ? `Zenith ran a card across town the same night. They won the ratings. They did not win my heart.` : `Zenith ran a card across town the same night. Nobody went. Somebody saw Trent from strategy eating alone.` });
  if (s.heatAfter >= 60) out.push({ who: 'butler', text: `The commission is circling, Sandwich. Heat like that, you start getting letters. Then you start getting visitors.` });
  else if (s.buzzAfter > s.buzzBefore + 4) out.push({ who: 'butler', text: `The buzz is up. People are talking about ${boss}. Some of it is even nice.` });
  if (s.raided) out.push({ who: 'sandwich', text: `And of course the raid. I have never seen a man hide that many folding chairs that fast.` });
  out.push({ who: 'butler', text: pick(['That is the week. Hands up, chin down, eat something.', 'That is the show. Commissioner Pete says goodnight. Baaa.', 'Back next week. Same warehouse. Same bucket.'], seed + 3) });
  return out;
}

/** Tales of Legacy: the week that just ended, from the story's log. */
export function radioStory(save: StorySave, weekLines: string[]): RadioLine[] {
  const seed = save.seed + (save.totalWeeks ?? 0) * 17;
  const has = (re: RegExp) => weekLines.some((l) => re.test(l));
  const out: RadioLine[] = [{ who: 'butler', text: pick([
    'Juiced Butler, Moncton radio, and a week in the life of Ray\'s Boxing & Soup.',
    'Good evening. This is the week in review, and Sandwich has already eaten the review.',
  ], seed) }];
  const trained = weekLines.filter((l) => /\b(light|full|camp)\b.*grade/i.test(l));
  if (trained.length) {
    const best = trained.find((l) => /grade (S|A)/.test(l));
    out.push({ who: 'sandwich', text: best ? `Word from the gym: an A in training this week. Ray made a second pot. That is how you know.` : `${trained.length} training session${trained.length > 1 ? 's' : ''} at Ray's. Nobody got an A. Ray says that builds character. Ray says everything builds character.` });
  }
  if (has(/PRESS DAY/i)) out.push({ who: 'butler', text: `Press day at the warehouse. Somebody said something they will regret. Bradie clipped it. It is everywhere.` });
  if (has(/dinner|tacos/i)) out.push({ who: 'sandwich', text: `Dinner with the fighters. I was not invited. I want that on the record.` });
  if (has(/media|interview|podcast/i)) out.push({ who: 'butler', text: `A media day, too. The beard did most of the talking. The beard is very quotable.` });
  if (has(/spar/i)) out.push({ who: 'sandwich', text: `They sparred at Ray's. Ray said no hard shots. Sources say there were hard shots.` });
  if (out.length < 3) out.push({ who: 'sandwich', text: `Quiet week. Ray made soup. That is the news. That is always the news.` });
  out.push({ who: 'butler', text: pick(['Hands up, chin down, eat something. Goodnight, Moncton.', 'That is the week. Somebody check on the goat.', 'Back next week. Ray says six a.m. Ray always says six a.m.'], seed + 5) });
  return out;
}
