/**
 * The weekly fallout: the people who come to the warehouse after the show.
 * Every choice is a trade: cash, buzz, heat, the locker room, or a fighter.
 */
import { Rng } from '../core/rng';
import { clamp, money } from '../core/format';
import { BUYBACK_CASH, SEASON_WEEKS, type SeqEventState, type SeqFighter, type SeqRun } from './types';

export interface SeqEventChoice {
  label: string;
  effect: (run: SeqRun, rng: Rng) => string;
}

export interface SeqEventDef {
  id: string;
  title: string;
  speaker: string | ((run: SeqRun) => string);
  text: string | ((run: SeqRun) => string);
  minWeek?: number;
  maxWeek?: number;
  once?: boolean;
  weight?: number;
  when?: (run: SeqRun) => boolean;
  choices: SeqEventChoice[];
}

const clampMeter = (n: number) => clamp(Math.round(n), 0, 100);
const cash = (run: SeqRun, n: number) => (run.cash += n);
const buzz = (run: SeqRun, n: number) => (run.buzz = clampMeter(run.buzz + n));
const heat = (run: SeqRun, n: number) => (run.heat = clampMeter(run.heat + n));
const locker = (run: SeqRun, n: number) => (run.locker = clampMeter(run.locker + n));
const top = (run: SeqRun): SeqFighter | undefined => [...run.roster].sort((a, b) => b.star - a.star)[0];
const weakest = (run: SeqRun): SeqFighter | undefined => [...run.roster].sort((a, b) => a.morale - b.morale)[0];
const nm = (x: SeqFighter | undefined) => (x ? `${x.f.first} ${x.f.last}` : 'your main event');
const last = (x: SeqFighter | undefined) => (x ? x.f.last : 'your main event');

function star(run: SeqRun, id: string, n: number): void {
  const x = run.roster.find((r) => r.f.id === id);
  if (x) x.star = clampMeter(x.star + n);
}
function morale(run: SeqRun, id: string, n: number): void {
  const x = run.roster.find((r) => r.f.id === id);
  if (x) x.morale = clampMeter(x.morale + n);
}
function injure(run: SeqRun, id: string, weeks: number): string {
  const x = run.roster.find((r) => r.f.id === id);
  if (!x) return '';
  x.injuredUntil = Math.max(x.injuredUntil, run.week + weeks);
  x.morale = clampMeter(x.morale - 4);
  return `${x.f.last} is out ${weeks} week${weeks === 1 ? '' : 's'}.`;
}
function removeFighter(run: SeqRun, id: string): SeqFighter | undefined {
  const i = run.roster.findIndex((r) => r.f.id === id);
  if (i < 0) return undefined;
  const [gone] = run.roster.splice(i, 1);
  run.card.bouts = run.card.bouts.filter((b) => b.a !== id);
  run.locker = clampMeter(run.locker - 6);
  return gone;
}

export const EVENTS: SeqEventDef[] = [
  {
    id: 'zenith_suit',
    title: 'THE MAN IN THE CLEAN CAR',
    speaker: 'A Zenith Holdings representative',
    text:
      'He is standing in your parking lot holding a folder marked CONFIDENTIAL. The car behind him has never been in a fight. ' +
      '"We loved what you did with the old place," he says. "We would hate to see you do it again without a partner."',
    minWeek: 1,
    weight: 1.2,
    choices: [
      {
        label: 'Take $40,000 for 10% of the league.',
        effect: (run) => {
          cash(run, 40000);
          buzz(run, -4);
          run.flags.zenith_stake = 1;
          return 'He leaves the folder and a pen. You keep the pen. It is a very good pen.';
        },
      },
      {
        label: 'Ask if the car comes with the deal.',
        effect: (run) => {
          buzz(run, 5);
          heat(run, 3);
          return 'He writes something down. It is probably your name. The clip gets 90,000 views by midnight.';
        },
      },
      {
        label: 'Tear the offer up in the parking lot.',
        effect: (run, rng) => {
          buzz(run, 7);
          heat(run, 2);
          locker(run, 3);
          if (rng.chance(0.4)) {
            cash(run, -1000);
            return 'The shreds blow into a storm drain. A fighter films it. It does numbers. You are also fined $1,000 for littering.';
          }
          return 'The shreds blow into a storm drain. A fighter films it. It does numbers.';
        },
      },
    ],
  },
  {
    id: 'fire_marshal',
    title: 'THE INSPECTOR',
    speaker: 'Gus, Fire Marshal, District 4',
    text:
      'Gus has a clipboard, a flashlight and the energy of a man who has been ignored by every promoter in this city. ' +
      'He says the exits are "more of a suggestion" and the generator is "a countdown".',
    minWeek: 1,
    weight: 1,
    choices: [
      {
        label: 'Slide him $7,000 for "inspection fees".',
        effect: (run) => {
          cash(run, -7000);
          heat(run, -10);
          return 'He stamps the form. The stamp is shaped like a fire extinguisher. You respect the commitment.';
        },
      },
      {
        label: 'Tell him the wiring is "part of the aesthetic".',
        effect: (run) => {
          heat(run, 12);
          buzz(run, 4);
          return 'He writes for a long time. The ticket is printed on paper that smells like a courthouse.';
        },
      },
      {
        label: 'Put him on the undercard against your cutman.',
        effect: (run) => {
          cash(run, -2000);
          heat(run, 5);
          buzz(run, 9);
          locker(run, 4);
          return 'He accepts. He is 58. He has a whistle. The cutman wins by split decision and immediately regrets it.';
        },
      },
    ],
  },
  {
    id: 'viral_clip',
    title: 'THE CLIP',
    speaker: 'Your social media guy, who is also your cousin',
    text: (run) => {
      const x = top(run);
      return `${nm(x)} knocked somebody out in the parking lot at 2am and the video is everywhere. ` +
        `${last(x)} is trending in a city he has never visited. Your cousin wants to know what the plan is.`;
    },
    minWeek: 1,
    weight: 1,
    when: (run) => run.roster.length > 0,
    choices: [
      {
        label: 'Make him the main event.',
        effect: (run) => {
          const x = top(run);
          if (x) {
            star(run, x.f.id, 10);
            morale(run, x.f.id, 8);
          }
          buzz(run, 5);
          return 'The clip plays on the jumbotron before the walkout. The room loses its mind. He cries in the parking lot after. Good tears.';
        },
      },
      {
        label: 'Sell the clip to a highlight farm.',
        effect: (run) => {
          const x = top(run);
          if (x) {
            star(run, x.f.id, -4);
            morale(run, x.f.id, -6);
          }
          cash(run, 12000);
          return 'They pay in a cryptocurrency called CLIP. It is worth $12,000 for about eleven minutes. You cash out at nine.';
        },
      },
      {
        label: 'Repost it yourself with a bad caption.',
        effect: (run) => {
          buzz(run, 7);
          heat(run, 2);
          return '"MY GUY DOES NOT MISS. ALSO HE OWES ME $600." The caption is screenshotted. The $600 is never mentioned again.';
        },
      },
    ],
  },
  {
    id: 'poach',
    title: 'THE PHONE CALL',
    speaker: 'A fighter you cannot afford to lose',
    text: (run) => {
      const x = top(run);
      return `${nm(x)} is on the phone. Zenith offered him four times his purse and a parking space. ` +
        `He says he is "just keeping you in the loop". He says it the way people say goodbye.`;
    },
    minWeek: 4,
    weight: 1.1,
    when: (run) => run.roster.length > 1 && (top(run)?.star ?? 0) >= 42,
    choices: [
      {
        label: 'Match the offer. Somehow.',
        effect: (run) => {
          const x = top(run);
          cash(run, -12000);
          if (x) {
            morale(run, x.f.id, 18);
            star(run, x.f.id, 3);
          }
          locker(run, 5);
          return 'You match it with money you were saving for rent. He stays. The landlord will understand. The landlord will not understand.';
        },
      },
      {
        label: 'Let him go. Take the transfer fee.',
        effect: (run) => {
          const x = top(run);
          cash(run, 18000);
          if (x) removeFighter(run, x.f.id);
          locker(run, -10);
          return `${nm(x)} leaves with a gym bag and a signed Zenith shirt. The locker room goes quiet. Somebody puts on a podcast.`;
        },
      },
      {
        label: 'Leak his new contract to the press.',
        effect: (run) => {
          buzz(run, 8);
          heat(run, 5);
          locker(run, -4);
          return 'The story runs under the headline ZENITH PAYS STAR "MORE THAN THE PRESIDENT". Nobody in the locker room thinks it is funny.';
        },
      },
    ],
  },
  {
    id: 'energy_sponsor',
    title: 'PISSWATER ZERO',
    speaker: 'A man with a can and a lanyard',
    text:
      'The energy drink wants naming rights. The can is called PISSWATER ZERO. The slogan is "TASTE THE NOTHING". ' +
      'They want the cage to say it. They want your jacket to say it. They want you to say it.',
    minWeek: 2,
    weight: 1,
    choices: [
      {
        label: 'Take the naming rights.',
        effect: (run) => {
          cash(run, 25000);
          buzz(run, -6);
          heat(run, 2);
          return 'The cage now says PISSWATER ZERO in letters big enough to read from space. A fighter refuses to lean on it. You understand.';
        },
      },
      {
        label: "Counter with 'PISSWATER ZERO SUGAR'.",
        effect: (run) => {
          cash(run, 15000);
          buzz(run, 3);
          return 'They accept immediately. You suspect you could have asked for more. You suspect this is how business works.';
        },
      },
      {
        label: 'Refuse. You have a brand to protect.',
        effect: (run) => {
          buzz(run, 5);
          locker(run, 4);
          return 'You say no to $25,000. Your accountant says a word you have never heard before. It is probably Latin.';
        },
      },
    ],
  },
  {
    id: 'landlord',
    title: 'THE RENT',
    speaker: 'Mateo, your landlord',
    text:
      'Mateo is standing in the cage holding a letter. The letter says the rent is going up. Mateo says the letter is "not personal". ' +
      'Mateo also says the letter is "very personal".',
    minWeek: 3,
    weight: 1,
    choices: [
      {
        label: 'Pay the increase.',
        effect: (run) => {
          cash(run, -9000);
          heat(run, -2);
          return 'Mateo takes the check and leaves the cage door open. You pay a guy $200 to close it.';
        },
      },
      {
        label: 'Explain who you used to be.',
        effect: (run) => {
          heat(run, 9);
          buzz(run, 3);
          return 'You mention the old company eleven times. Mateo films the twelfth. The video is captioned "HE USED TO OWN THIS?"';
        },
      },
      {
        label: 'Move the show to the parking lot.',
        effect: (run) => {
          cash(run, 4000);
          buzz(run, -6);
          heat(run, -4);
          return 'The new venue has no roof, no toilets and excellent sightlines. Mateo charges you $4,000 to use the lot. Somehow you still owe him rent.';
        },
      },
    ],
  },
  {
    id: 'knee',
    title: 'THE KNEE',
    speaker: 'Your cutman, holding an ice pack',
    text: (run) => {
      const x = top(run);
      return `${nm(x)}'s knee made a sound during sparring that your cutman describes as "a door". ` +
        'The doctor says he can fight if he tapes it. The doctor says a lot of things. The doctor is also your cousin.';
    },
    minWeek: 3,
    weight: 1,
    when: (run) => run.roster.length > 0,
    choices: [
      {
        label: 'He fights. Tape it.',
        effect: (run) => {
          const x = top(run);
          if (x) {
            star(run, x.f.id, 4);
            morale(run, x.f.id, -8);
          }
          buzz(run, 7);
          locker(run, -3);
          const note = x ? injure(run, x.f.id, 2) : '';
          return `He tapes it and fights. The knee holds for six minutes. ${note}`;
        },
      },
      {
        label: 'Pull him. The show can survive.',
        effect: (run) => {
          const x = top(run);
          if (x) {
            morale(run, x.f.id, 8);
            star(run, x.f.id, -2);
          }
          buzz(run, -6);
          return 'He watches the main event from the back with his leg up. The crowd chants his name anyway. That is worse for him, somehow.';
        },
      },
      {
        label: 'Find a replacement. Any replacement.',
        effect: (run) => {
          cash(run, -4500);
          buzz(run, -2);
          return 'A guy from the gym next door agrees to fight for $1,500 and a ride home. He has never heard of weight classes.';
        },
      },
    ],
  },
  {
    id: 'streamer',
    title: 'THE STREAMER',
    speaker: 'Brayden "Sigma" Vance, 22, 4.1M followers',
    text:
      'He walks in wearing sunglasses indoors and asks if the cage is "content". He has never trained. He has a sponsorship deal with a mattress company. ' +
      'He wants to fight your toughest guy for the clout.',
    minWeek: 2,
    weight: 1,
    choices: [
      {
        label: 'Book him.',
        effect: (run) => {
          cash(run, 18000);
          buzz(run, 12);
          heat(run, 5);
          locker(run, -6);
          return 'The fight lasts 38 seconds. The clip lasts forever. Your toughest guy is furious. Your accountant is not.';
        },
      },
      {
        label: 'Make him the ring announcer.',
        effect: (run) => {
          cash(run, 3000);
          buzz(run, 5);
          return 'He mispronounces every name, including yours. The crowd loves it. You die a little on the inside.';
        },
      },
      {
        label: 'Say no.',
        effect: (run) => {
          buzz(run, -3);
          locker(run, 3);
          return 'He posts a video about you. The video is called "THE CAGE BOSS IS SCARED". It gets 600,000 views. You are not scared. You are tired.';
        },
      },
    ],
  },
  {
    id: 'union',
    title: 'THE LOCKER ROOM',
    speaker: 'The fighters, collectively',
    text: (run) => {
      const x = weakest(run);
      return `${nm(x)} stands in front of the others with a piece of paper. They want health insurance. ` +
        'They have a list of injuries, dates and receipts. They have done their homework. You hate that.';
    },
    minWeek: 4,
    weight: 1,
    when: (run) => run.roster.length >= 3,
    choices: [
      {
        label: 'Offer health insurance.',
        effect: (run) => {
          cash(run, -12000);
          locker(run, 15);
          buzz(run, 4);
          run.flags.insurance = 1;
          return 'The paper goes on the wall. The list of injuries stays up too. Every week it gets longer. You stop looking at it directly.';
        },
      },
      {
        label: 'Explain that CTE is "a mindset".',
        effect: (run) => {
          locker(run, -12);
          heat(run, 4);
          buzz(run, 2);
          return 'Nobody says anything. That is worse than shouting. One fighter starts looking at flights to a rival league on his phone.';
        },
      },
      {
        label: 'Blame the last president. You.',
        effect: (run) => {
          buzz(run, 4);
          locker(run, -5);
          heat(run, 2);
          return '"That guy ran it into the ground," you say, about yourself, in the third person. Two fighters nod. One of them is recording.';
        },
      },
    ],
  },
  {
    id: 'reporter',
    title: 'THE QUESTION',
    speaker: 'Sandwich Cormier, fight media',
    text:
      'Sandwich has a microphone and a follow-up. He asks about the old company, the buyout, the severance, and "the incident at the awards dinner". ' +
      'He says he is just giving you a chance to tell your side.',
    minWeek: 3,
    weight: 1,
    choices: [
      {
        label: 'Own it. All of it.',
        effect: (run) => {
          buzz(run, 6);
          heat(run, 1);
          return 'You talk for four minutes without a single "no comment". The clip is shared by people who hate you with tears in their eyes.';
        },
      },
      {
        label: 'Call him a blogger.',
        effect: (run) => {
          heat(run, 5);
          buzz(run, 4);
          return 'He thanks you for the quote and posts it before the press conference ends. The headline is not about the fight.';
        },
      },
      {
        label: 'Cry. Just a little.',
        effect: (run) => {
          buzz(run, 5);
          locker(run, 2);
          heat(run, -1);
          return 'It is one tear. It is a very good tear. The internet decides you are "going through something". You are. It is called rent.';
        },
      },
    ],
  },
  {
    id: 'family',
    title: 'THE SCIENCE FAIR',
    speaker: 'Your kid, on speakerphone',
    text:
      'The science fair is Saturday. Same time as the show. Your kid has built a volcano and says it is "the best one in the gymnasium". ' +
      'He says it like he has already accepted you will not be there.',
    minWeek: 5,
    weight: 0.9,
    choices: [
      {
        label: 'Go to the science fair.',
        effect: (run) => {
          buzz(run, -5);
          locker(run, 4);
          heat(run, -2);
          cash(run, -1000);
          return 'The volcano wins second place. He looks for you in the crowd before they announce it. You are already there. That is the whole story.';
        },
      },
      {
        label: 'Send a video message.',
        effect: (run) => {
          buzz(run, 2);
          heat(run, 1);
          return 'You record it in the cage between fights. The lighting is terrible. He watches it eleven times anyway.';
        },
      },
      {
        label: 'Bring the kid to the show.',
        effect: (run) => {
          cash(run, -2000);
          buzz(run, 7);
          locker(run, 3);
          heat(run, 1);
          return 'He holds the ring card for the main event. The crowd gives him a bigger pop than the co-main. He asks if he can do it every week.';
        },
      },
    ],
  },
  {
    id: 'rival_show',
    title: 'THE SAME NIGHT',
    speaker: 'Your cousin, looking at his phone',
    text:
      'Zenith just announced a free show on Saturday with three of the fighters you could not afford. Same city. Same start time. ' +
      'They are calling it "THE PEOPLE\'S CARD". The people, annoyingly, love it.',
    minWeek: 4,
    weight: 1,
    choices: [
      {
        label: 'Run against them. Go bigger.',
        effect: (run) => {
          cash(run, -5000);
          buzz(run, 11);
          heat(run, 3);
          return 'You rent a second generator and put two more fights on the card. Half their crowd walks over at intermission. The other half watches both shows.';
        },
      },
      {
        label: 'Move your show to Thursday.',
        effect: (run) => {
          cash(run, -2500);
          heat(run, -5);
          buzz(run, -3);
          return 'Thursday is a terrible night for fighting. It is a great night for not being raided. The room is small and loud and yours.';
        },
      },
      {
        label: 'Ignore it. They are not your competition.',
        effect: (run) => {
          buzz(run, -5);
          heat(run, -2);
          return 'You say this out loud in an empty office. It sounds true for about four seconds. Then your phone buzzes with their attendance number.';
        },
      },
    ],
  },
  {
    id: 'staph',
    title: 'THE LOCKER ROOM SMELL',
    speaker: 'Your cutman, wearing two pairs of gloves',
    text:
      'Three fighters have the same rash in the same place. The mat has a stain shaped like a state. The doctor says it is "probably nothing". ' +
      'The doctor is also the guy who said the knee was "a door".',
    minWeek: 4,
    weight: 1,
    when: (run) => run.roster.length >= 2,
    choices: [
      {
        label: 'Call a real doctor.',
        effect: (run) => {
          cash(run, -6000);
          locker(run, 9);
          heat(run, -3);
          return 'The real doctor uses words like "contagious" and "immediately". The mat is burned. The fighters are treated. Nobody thanks you, but nobody dies.';
        },
      },
      {
        label: 'It is a bruise.',
        effect: (run) => {
          locker(run, -11);
          heat(run, 6);
          buzz(run, 2);
          return 'It is not a bruise. Two fights get cancelled. The commission finds out from a fighter\'s girlfriend on social media.';
        },
      },
      {
        label: 'Quarantine the locker room.',
        effect: (run) => {
          cash(run, -2000);
          locker(run, 2);
          buzz(run, -2);
          return 'The healthy fighters get changed in the parking lot. The sick ones get the office. Everybody gets a lecture about hygiene and nobody listens.';
        },
      },
    ],
  },
  {
    id: 'mascot',
    title: 'THE MASCOT',
    speaker: 'A lawyer for "Cagey the Cage Monster"',
    text:
      'Cagey is a man in a foam cage costume who has been standing outside your shows for three months. He says a fighter "assaulted" him. ' +
      'The fighter says Cagey "started it". There is video. The video is inconclusive. The costume is not.',
    minWeek: 5,
    weight: 0.9,
    choices: [
      {
        label: 'Settle.',
        effect: (run) => {
          cash(run, -4500);
          heat(run, -3);
          return 'The settlement includes a lifetime ban from the parking lot. Cagey attends the next show in a different costume. Nobody stops him.';
        },
      },
      {
        label: 'Fight him on the undercard.',
        effect: (run) => {
          cash(run, 2000);
          buzz(run, 6);
          heat(run, 3);
          locker(run, 1);
          return 'Cagey is 0-0 and weighs 310 pounds in the costume. He loses by decision and signs a three-fight deal in the parking lot.';
        },
      },
      {
        label: 'Counter-sue for "brand confusion".',
        effect: (run) => {
          cash(run, -1500);
          heat(run, 8);
          buzz(run, 4);
          return 'Your lawyer calls it "a bold strategy". The judge calls it "a waste of the court\'s time". The press calls it "the funniest thing on the internet".';
        },
      },
    ],
  },
  {
    id: 'documentary',
    title: 'THE DOCUMENTARY',
    speaker: 'A streaming service, via a very calm producer',
    text:
      'They want to make a documentary about "the comeback". They want access to the locker room, the arguments, the injuries and the money. ' +
      'They want to call it "CAGE BOSS: THE FALL AND RISE". They want to know if you are comfortable being the villain.',
    minWeek: 6,
    weight: 0.9,
    choices: [
      {
        label: 'Give them full access.',
        effect: (run) => {
          cash(run, 28000);
          heat(run, 9);
          buzz(run, 9);
          return 'The cameras catch everything. The best scene is you crying in a storage unit. The second best is the argument about the generator. Both go viral.';
        },
      },
      {
        label: 'Decline. Keep the mystery.',
        effect: (run) => {
          buzz(run, -2);
          heat(run, -2);
          return 'They make the documentary anyway, using old footage and a narrator who says "some say" a lot. It is fine. It is not about you.';
        },
      },
      {
        label: 'Give them access to a fake locker room.',
        effect: (run) => {
          cash(run, 15000);
          buzz(run, 4);
          heat(run, 2);
          return 'The actors are better-looking than your fighters and the arguments are scripted. Two episodes in, the internet figures it out. That is the plot twist.';
        },
      },
    ],
  },
  {
    id: 'old_champ',
    title: 'ONE MORE FIGHT',
    speaker: 'A 44-year-old former champion',
    text:
      'He is in the doorway with a gym bag and a look you recognize because you used to see it in the mirror. He says he has one more fight in him. ' +
      'He says he does not need the money. He says it twice, which is how you know he needs the money.',
    minWeek: 6,
    weight: 0.9,
    choices: [
      {
        label: 'Book the fight.',
        effect: (run) => {
          cash(run, 6000);
          buzz(run, 9);
          heat(run, 2);
          locker(run, 2);
          return 'He walks out to a song nobody under 35 knows. The crowd stands anyway. He wins by decision and takes eleven minutes to leave the cage.';
        },
      },
      {
        label: 'Hire him as a coach.',
        effect: (run) => {
          cash(run, -3000);
          locker(run, 9);
          buzz(run, 2);
          return 'He tapes ankles, tells stories and refuses to be impressed by anybody. The locker room gets quieter and better.';
        },
      },
      {
        label: 'Say no. For his own good.',
        effect: (run) => {
          locker(run, -3);
          buzz(run, -2);
          return 'He nods, picks up the bag and leaves. Six months later you see him on a card in a different state, fighting for a promotion with a worse cage than yours.';
        },
      },
    ],
  },
  {
    id: 'rat',
    title: 'THE MOLE',
    speaker: 'Your cousin, whispering',
    text:
      'Somebody is leaking your card, your payouts and your generator schedule to Zenith. It is probably the intern. It is probably not the intern. ' +
      'Everyone in the office has a motive and nobody has a lock on their phone.',
    minWeek: 7,
    weight: 0.9,
    choices: [
      {
        label: 'Investigate properly.',
        effect: (run) => {
          cash(run, -3000);
          buzz(run, 2);
          heat(run, -2);
          run.flags.mole = 1;
          return 'It was the guy who does the website. He was paying for a car with a salary that could not pay for a car. He is gone by Friday.';
        },
      },
      {
        label: 'Fire the intern.',
        effect: (run) => {
          locker(run, -6);
          heat(run, -2);
          return 'The intern cries in the parking lot. The leaks continue. You have made an enemy and solved nothing, which is a kind of efficiency.';
        },
      },
      {
        label: 'Feed the mole false information.',
        effect: (run) => {
          buzz(run, 5);
          heat(run, 4);
          run.flags.mole = 2;
          return 'Zenith announces a card based on your fake schedule. It is a disaster. You attend in disguise and enjoy it more than any show you have ever run.';
        },
      },
    ],
  },
  {
    id: 'tiger',
    title: 'THE TIGER',
    speaker: 'The fighter who owns a tiger',
    text:
      'The tiger is out. It is in the parking lot. It is not attacking anyone, which somehow makes it worse. A crowd has formed. Two people are filming. ' +
      'One person is selling tickets.',
    minWeek: 8,
    weight: 0.8,
    choices: [
      {
        label: 'Pay the zoo to take it.',
        effect: (run) => {
          cash(run, -7000);
          heat(run, -5);
          locker(run, 2);
          return 'The zoo takes the tiger, the cage and the fighter\'s dignity. The fighter stays. The tiger becomes a mascot for a rival promotion.';
        },
      },
      {
        label: 'Film it. This is content.',
        effect: (run) => {
          buzz(run, 10);
          heat(run, 6);
          return 'The video gets 8 million views. The commission opens a file. The tiger gets a sponsorship offer before you do.';
        },
      },
      {
        label: 'Blame Zenith.',
        effect: (run) => {
          buzz(run, 5);
          heat(run, 4);
          return 'You tell a reporter the tiger "followed us home from their show". The story is absurd. The story is also on the front page of three websites.';
        },
      },
    ],
  },
  {
    id: 'buyback_window',
    title: 'THE BUYBACK WINDOW',
    speaker: 'A Zenith Holdings executive, on a video call',
    text: (run) =>
      `He says the old company is "available" for the right number. He says the number is ${money(BUYBACK_CASH)} and a public apology. ` +
      `He says it like a dare. You have ${money(run.cash)} in the account and ${run.week - 1} weeks of shows behind you.`,
    minWeek: 30,
    maxWeek: 36,
    once: true,
    weight: 4,
    choices: [
      {
        label: 'Write the check.',
        effect: (run) => {
          if (run.cash >= BUYBACK_CASH) {
            run.flags.buyback_ready = 1;
            cash(run, -0);
            buzz(run, 10);
            return 'You put the phone down before he can say anything else. The money is real. The apology is not. The paperwork is already on your desk.';
          }
          heat(run, 4);
          buzz(run, 2);
          return `You cannot. He can tell. He says "call me when you grow up" and the screen goes black. ${money(BUYBACK_CASH - run.cash)} short.`;
        },
      },
      {
        label: 'Offer a partnership instead.',
        effect: (run) => {
          run.flags.partner_ready = 1;
          buzz(run, -3);
          heat(run, -3);
          return 'He is interested. He is always interested in owning half of something. He sends a term sheet with forty pages and a smile.';
        },
      },
      {
        label: 'Tell him the building is haunted.',
        effect: (run) => {
          buzz(run, 6);
          heat(run, 3);
          return 'He laughs for the first time in the entire run. You cannot tell if it is a real laugh. He says he will "take it under advisement".';
        },
      },
    ],
  },
  {
    id: 'power_cut',
    title: 'THE GENERATOR',
    speaker: 'The building, failing',
    text:
      'The generator died during the co-main. The cage is lit by phone flashlights and one very determined emergency exit sign. ' +
      'The crowd is chanting. Your main event is standing in the dark, ready.',
    minWeek: 8,
    weight: 0.9,
    choices: [
      {
        label: 'Pay for the backup generator.',
        effect: (run) => {
          cash(run, -4000);
          buzz(run, 2);
          return 'The lights come back. The main event happens. The crowd is disappointed and also relieved. Nobody gets hurt. That is the whole review.';
        },
      },
      {
        label: 'Fight in the dark.',
        effect: (run) => {
          buzz(run, 9);
          heat(run, 5);
          locker(run, -2);
          return 'The phones go up like a thousand tiny spotlights. The fight is impossible to score and impossible to forget. The commission calls it "a safety issue".';
        },
      },
      {
        label: 'Cancel the main event.',
        effect: (run) => {
          buzz(run, -8);
          heat(run, -2);
          cash(run, -1000);
          locker(run, 2);
          return 'You refund the tickets in cash from a shoebox. It takes two hours. The crowd leaves in a bad mood but not a dangerous one.';
        },
      },
    ],
  },
  {
    id: 'network_deal',
    title: 'THE NETWORK CALL',
    speaker: 'A streaming executive with excellent teeth',
    text:
      'They want eight shows, a documentary crew and the rights to the phrase "the buyback". They are offering real money and a contract ' +
      'written by a committee that has never been to a warehouse.',
    minWeek: 21,
    once: true,
    weight: 4,
    choices: [
      {
        label: 'Sign the exclusive deal.',
        effect: (run) => {
          cash(run, 42000);
          buzz(run, 9);
          heat(run, 5);
          run.flags.tv_deal = 1;
          return 'The money lands before the ink is dry. The crew arrives on Thursday and asks whether the cage can be "more aspirational".';
        },
      },
      {
        label: 'Sign, but keep the phone.',
        effect: (run) => {
          cash(run, 18000);
          buzz(run, 5);
          heat(run, 1);
          run.flags.tv_deal = 1;
          return 'You keep the right to stream wherever you like. The lawyer calls it "a bold negotiating posture". The executive calls it "a mistake".';
        },
      },
      {
        label: 'Tell them the warehouse is the brand.',
        effect: (run) => {
          buzz(run, 3);
          locker(run, 4);
          return 'They leave without a deal. The fighters hear what you said. That is worth more than eight shows and a documentary crew. Probably.';
        },
      },
    ],
  },
  {
    id: 'counter_programming',
    title: 'THE SAME SATURDAY',
    speaker: 'A rival promoter, on speakerphone',
    text:
      'Zenith has booked the old arena for the same night as your show. Same city. Same start time. Three of the fighters are people ' +
      'you used to call family. He wants to know if you are moving the date.',
    minWeek: 25,
    once: true,
    weight: 3,
    choices: [
      {
        label: 'Move the show. Avoid the war.',
        effect: (run) => {
          cash(run, -6000);
          heat(run, -4);
          buzz(run, -2);
          return 'You move to Friday. The crowd is smaller. The night is quieter. Nobody gets hurt, which is not the same as winning.';
        },
      },
      {
        label: 'Run the same night. Make them choose.',
        effect: (run) => {
          buzz(run, 10);
          heat(run, 5);
          locker(run, 2);
          return 'The city has one Saturday and two cages. Your line wraps around the block. Theirs wraps around a parking lot. The papers call it "a war".';
        },
      },
      {
        label: 'Leak their card to the dirt sheets.',
        effect: (run) => {
          buzz(run, 5);
          heat(run, 7);
          locker(run, -2);
          return 'Their main event falls apart by Wednesday. The leak is traced to a phone that is registered to a gym bag. Nobody can prove anything.';
        },
      },
    ],
  },
  {
    id: 'naming_rights',
    title: 'THE ENERGY DRINK',
    speaker: 'A brand manager in a rented suit',
    text:
      'They want to rename the promotion after a sugar-free energy drink. The logo would go on the cage, the canvas and the back of your jacket. ' +
      'The money is real. The name is not yours to lose anymore.',
    minWeek: 28,
    once: true,
    weight: 3,
    choices: [
      {
        label: 'Take the money.',
        effect: (run) => {
          cash(run, 30000);
          buzz(run, 6);
          heat(run, 2);
          locker(run, -4);
          run.flags.named_by_sponsor = 1;
          return 'The cage is now a colour called "Arctic Blast". The fighters hate it. The crowd buys the cans. The cans are terrible.';
        },
      },
      {
        label: 'Counter-offer: a corner logo, not the name.',
        effect: (run) => {
          cash(run, 12000);
          buzz(run, 3);
          return 'They take the corner. The name stays yours. The brand manager calls it "a partnership" and does not mean it.';
        },
      },
      {
        label: 'Refuse. The name stays on the building.',
        effect: (run) => {
          locker(run, 4);
          buzz(run, 1);
          return 'You say no in front of the locker room. Somebody claps. Somebody else asks whether the energy drink was any good. It was not.';
        },
      },
    ],
  },
  {
    id: 'old_coach',
    title: 'THE OLD CHAMPION',
    speaker: 'A retired champion with a walking stick',
    text:
      'He won the belt before your promotion had a name. He wants to teach one more camp, for free, and he wants the kids to know ' +
      'what the sport was like before everyone had a podcast.',
    minWeek: 30,
    once: true,
    weight: 2,
    choices: [
      {
        label: 'Give him the gym for a week.',
        effect: (run) => {
          const x = weakest(run);
          if (x) {
            x.f.skills.fightIQ = clamp(x.f.skills.fightIQ + 3, 10, 99);
            x.f.skills.heart = clamp(x.f.skills.heart + 2, 10, 99);
            x.morale = clamp(x.morale + 8, 0, 100);
          }
          locker(run, 5);
          cash(run, -2500);
          return `He works with ${x ? `${x.f.first} ${x.f.last}` : 'the whole room'} for six days. Nobody complains about the smell again.`;
        },
      },
      {
        label: 'Pay him for a full camp.',
        effect: (run) => {
          cash(run, -9000);
          for (const x of run.roster) {
            x.f.skills.fightIQ = clamp(x.f.skills.fightIQ + 1, 10, 99);
            x.morale = clamp(x.morale + 3, 0, 100);
          }
          locker(run, 7);
          return 'The whole roster gets a week of old-school. The old man charges by the hour and refuses to explain what the hours are.';
        },
      },
      {
        label: 'Tell him the sport has moved on.',
        effect: (run) => {
          locker(run, -5);
          buzz(run, 1);
          return 'He nods, puts on his coat and leaves. The room is quieter after he goes. That is usually the sign you were wrong.';
        },
      },
    ],
  },
  {
    id: 'medical_scare',
    title: 'THE SCAN',
    speaker: 'The commission doctor, reading the wrong file',
    text:
      'One of your main-event fighters has a scan that no licensed doctor wants to sign. The show is in three days. The doctor is ' +
      'holding the pen and waiting for you to make it his problem.',
    minWeek: 32,
    once: true,
    weight: 3,
    choices: [
      {
        label: 'Pull the fight. Eat the refunds.',
        effect: (run) => {
          buzz(run, -6);
          cash(run, -7000);
          locker(run, 5);
          heat(run, -3);
          return 'You pull the fight and refund the tickets. The doctor signs the rest of the card. One fighter says thank you. That is enough.';
        },
      },
      {
        label: 'Find a doctor who signs it.',
        effect: (run) => {
          cash(run, -12000);
          heat(run, 9);
          buzz(run, 4);
          locker(run, -3);
          return 'A doctor in a strip mall signs the form in ninety seconds. The commission opens a file. The file has your name on it.';
        },
      },
      {
        label: 'Move the fight to the parking lot.',
        effect: (run) => {
          heat(run, 12);
          buzz(run, 10);
          locker(run, 2);
          return 'The commission cannot regulate a parking lot. The county can. The county finds out on Monday. The footage is already everywhere.';
        },
      },
    ],
  },
  {
    id: 'insurance_drive',
    title: 'THE LOCKER ROOM ASKS',
    speaker: 'Your entire roster, in one room',
    text:
      'They want health insurance. Not a bucket. Not a voucher. Actual coverage that exists after the lights go out. The number on the ' +
      'whiteboard is $24,000 for the year. Somebody has drawn a small cage around it.',
    minWeek: 34,
    once: true,
    weight: 3,
    choices: [
      {
        label: 'Pay for the coverage.',
        effect: (run) => {
          cash(run, -24000);
          run.flags.insurance = 1;
          locker(run, 12);
          buzz(run, 4);
          return 'The cards arrive in the mail. Nobody cries, but one fighter takes a photo of his card and sends it to his mother.';
        },
      },
      {
        label: 'Negotiate a smaller plan.',
        effect: (run) => {
          cash(run, -9000);
          run.flags.insurance = 1;
          locker(run, 4);
          buzz(run, 1);
          return 'A stripped-down plan: catastrophic only. It covers the ambulance and the funeral. The room accepts it with the enthusiasm of a weigh-in.';
        },
      },
      {
        label: 'Tell them the promotion is a family.',
        effect: (run) => {
          locker(run, -10);
          heat(run, 2);
          return 'You say family. Somebody says "families have insurance". The room empties. The whiteboard stays.';
        },
      },
    ],
  },
  {
    id: 'zenith_auction',
    title: 'THE AUCTION',
    speaker: 'A Zenith lawyer, reading from a tablet',
    text:
      'Zenith is selling the old company for parts. The name, the archive, the contracts. They are taking bids this week. They would ' +
      'very much like to sell it to somebody who is not you.',
    minWeek: 36,
    once: true,
    weight: 4,
    choices: [
      {
        label: 'Bid everything you have.',
        effect: (run) => {
          const bid = Math.min(150000, Math.round(run.cash * 0.35));
          cash(run, -bid);
          buzz(run, 12);
          heat(run, 4);
          run.flags.auction_bid = bid;
          return `You bid ${money(bid)}. The lawyer writes it down without looking up. For the first time, the old company has a price that sounds like a threat.`;
        },
      },
      {
        label: 'Let the auction run.',
        effect: (run) => {
          heat(run, -2);
          buzz(run, 1);
          return 'You do not bid. The auction closes quietly. The name goes to a holding company with a P.O. box and no phone number.';
        },
      },
      {
        label: 'Bid one dollar and a parking spot.',
        effect: (run) => {
          buzz(run, 8);
          heat(run, 5);
          return 'The lawyer reads the offer twice. Nobody laughs. It is the only bid that gets a story written about it.';
        },
      },
    ],
  },
];

export function pickEvent(run: SeqRun, rng: Rng): SeqEventState | null {
  if (run.week >= SEASON_WEEKS && !run.flags.sandbox) return null;
  const guaranteed = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 39].includes(run.week);
  if (!guaranteed && !rng.chance(0.42)) return null;
  const recent = new Set(run.eventLog.slice(-4));
  const options = EVENTS.filter((e) => {
    if (e.once && run.flags['evt_' + e.id]) return false;
    if (e.minWeek !== undefined && run.week < e.minWeek) return false;
    if (e.maxWeek !== undefined && run.week > e.maxWeek) return false;
    if (e.when && !e.when(run)) return false;
    return !recent.has(e.id);
  });
  if (!options.length) return null;
  const picked = rng.weighted(options, (e) => e.weight ?? 1);
  if (!picked) return null;
  run.eventLog.push(picked.id);
  run.flags['evt_' + picked.id] = (Number(run.flags['evt_' + picked.id]) || 0) + 1;
  return { id: picked.id };
}

export function eventById(id: string): SeqEventDef | undefined {
  return EVENTS.find((e) => e.id === id);
}

export function eventSpeaker(def: SeqEventDef, run: SeqRun): string {
  return typeof def.speaker === 'function' ? def.speaker(run) : def.speaker;
}

export function eventText(def: SeqEventDef, run: SeqRun): string {
  return typeof def.text === 'function' ? def.text(run) : def.text;
}

/** Apply one of an event's choices. Returns the consequence line. */
export function resolveEvent(run: SeqRun, choiceIndex: number): string {
  if (!run.event) return '';
  const def = eventById(run.event.id);
  const choice = def?.choices[choiceIndex];
  if (!def || !choice) return 'Nobody remembers what was decided.';
  const rng = new Rng(run.rng);
  const line = choice.effect(run, rng);
  run.rng = rng.state;
  run.event = null;
  run.eventResult = line;
  return line;
}
