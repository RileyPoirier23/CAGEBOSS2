/**
 * LEGACY TAPES: side stories on VHS, unlocked by Ray's notebook. Each tape is a few scenes and a
 * couple of fights, played as somebody else: Tyler's redemption, Xavier's barn years, Spadam's
 * fall, and (after the story) ALBERTO DEL BURRITO, 1ton's comeback in Guadalajara under his real
 * name, with Mateo and Han in his corner. Progress lives in cageboss2.tapes, outside any save.
 */
import type { Fighter } from '../core/types';
import { loadJSON, storeJSON } from '../core/save';
import { authored, buildHan, buildMateoGrown, buildOneTon, buildOpponent, newStorySave } from './story';
import { notebookPages } from './notebook';
import { loadStoryTrophy } from './storysession';
import type { Bg, Line } from '../ui/cutscene';

/** Who can stand in a tape's scenes: the regular cast (by CAST id) or a tape fighter (by key). */
export interface TapeActor { who: string; name: string; x: number; facing: 1 | -1; fighter?: string; pose?: string }
export type TapeStep =
  | { kind: 'scene'; title: string; bg: Bg; flashback?: boolean; cast: TapeActor[]; lines: Line[] }
  | { kind: 'fight'; title: string; player: string; opponent: string; venue: string; rounds: 3 | 5; stakes: string; referee?: string };

export interface Tape { id: string; title: string; label: string; blurb: string; unlock: string; needs: (pages: string[], finished: boolean) => boolean; steps: TapeStep[] }

// ---------------------------------------------------------------- the tapes' own fighters

const mk = (id: string, o: Parameters<typeof authored>[3], div = 'middle', tier: 'journeyman' | 'gatekeeper' | 'contender' | 'elite' = 'contender'): Fighter => authored(`tape_${id}`, div, tier, o);
const sk = (v: number) => ({ striking: v, power: v - 2, wrestling: v - 6, grappling: v - 6, cardio: v, chin: v - 2, fightIQ: v - 3, durability: v - 2, heart: v + 4, weightCut: 45 });

export function tapeFighter(key: string): Fighter {
  const s = newStorySave(7);
  s.chapter = 12;
  switch (key) {
    case 'tyler': return buildOpponent(s, 'tyler');
    case 'chad': return mk('chad', { first: 'Chad', last: 'Pemberton', nick: 'Equity', country: 'Canada', hometown: 'Rothesay, New Brunswick', age: 24, height: 180, reach: 183, skills: sk(76), styles: ['Point Fighter'], traits: ['Clout Chaser'], record: { w: 9, l: 0, d: 0, nc: 0 }, look: { hair: 12, hairColor: 4, beard: 0, build: 1 } }, 'light');
    case 'gordon_champ': return mk('gordon_champ', { first: 'Rocco', last: 'Delisle', nick: 'The Landlord\'s Pick', country: 'Canada', hometown: 'Saint John, New Brunswick', age: 29, height: 179, reach: 182, skills: sk(82), styles: ['Wrestler'], traits: ['Grinder'], record: { w: 16, l: 1, d: 0, nc: 0 }, look: { hair: 1, beard: 2, build: 2 } }, 'light');
    case 'xavier': return mk('xavier_young', { first: 'Xavier', last: 'Cockett', nick: 'Allstar', country: 'Canada', hometown: 'Sussex, New Brunswick', age: 26, height: 186, reach: 189, skills: sk(72), styles: ['Brawler'], traits: ['Showman'], record: { w: 7, l: 3, d: 0, nc: 0 }, look: { hair: 10, hairColor: 1, beard: 3, build: 2, hat: 1 } });
    case 'bull': return mk('bull_rider', { first: 'Hank', last: 'Doiron', nick: 'Eight Seconds', country: 'Canada', hometown: 'Petitcodiac, New Brunswick', age: 31, height: 183, reach: 185, skills: sk(68), styles: ['Wrestler'], traits: ['Veteran'], record: { w: 5, l: 5, d: 0, nc: 0 }, look: { hair: 2, beard: 3, build: 2 } }, 'middle', 'journeyman');
    case 'sheriff': return mk('sheriff', { first: 'Lyle', last: 'Gautreau', nick: 'The Sheriff', country: 'Canada', hometown: 'Shediac, New Brunswick', age: 38, height: 188, reach: 190, skills: sk(74), styles: ['Grinder'], traits: ['Veteran'], record: { w: 21, l: 9, d: 0, nc: 0 }, look: { hair: 0, beard: 4, build: 3 } }, 'middle', 'gatekeeper');
    case 'spadam': return buildOpponent(s, 'spadam');
    case 'kicker': return mk('kicker', { first: 'Ivo', last: 'Brandao', nick: 'Clean Sheet', country: 'Brazil', hometown: 'Curitiba', age: 27, height: 190, reach: 196, skills: sk(84), styles: ['Kickboxer'], traits: ['Hungry'], record: { w: 18, l: 2, d: 0, nc: 0 }, look: { hair: 11, beard: 1, build: 1, tattoo: 2 } }, 'welter');
    case 'daniel': return mk('daniel_ex', { first: 'Daniel', last: 'Stinkovich', nick: 'Dirty', country: 'Canada', hometown: 'Halifax, Nova Scotia', age: 44, height: 175, reach: 175, skills: sk(40), styles: ['Brawler'], traits: ['Mercenary'], record: { w: 0, l: 3, d: 0, nc: 0 }, look: { hair: 8, beard: 0, build: 3, glasses: 2 } }, 'welter', 'journeyman');
    case 'alberto': { const f = buildOneTon(s, true); f.first = 'Alberto'; f.last = 'Del Burrito'; f.nick = 'El Campeon'; f.division = 'middle'; return f; }
    case 'prince': return buildOpponent(s, 'prince');
    case 'nieto': return mk('nieto', { first: 'Kevin', last: 'Ramos', nick: 'El Nieto', country: 'Mexico', hometown: 'Guadalajara, Jalisco', age: 23, height: 183, reach: 187, skills: sk(86), styles: ['Pressure Striker'], traits: ['Hungry', 'Loyal'], record: { w: 15, l: 0, d: 0, nc: 0 }, look: { hair: 11, beard: 0, build: 2, tattoo: 2 } });
    case 'han': return buildHan(s);
    case 'bigmateo': return buildMateoGrown(s);
    // NEW GAME+: the kid at the door, a little better after every fight
    case 'kid1': case 'kid2': case 'kid3': case 'kid4': {
      const n = Number(key.slice(3));
      return mk(`kid_${n}`, { first: 'Theo', last: 'Arsenault', nick: n >= 3 ? 'The Hoodie' : 'Kid', country: 'Canada', hometown: 'Shediac, New Brunswick', age: 15 + n, height: 172 + n * 2, reach: 176 + n * 2, skills: sk(54 + n * 8), styles: ['Pressure Striker'], traits: n >= 4 ? ['Loyal', 'Heart'] : ['Loyal'], record: { w: (n - 1) * 3, l: 0, d: 0, nc: 0 }, look: { hair: 11, hairColor: 2, beard: 0, build: n >= 3 ? 1 : 0 } }, 'light', n >= 4 ? 'contender' : 'gatekeeper');
    }
    case 'synergy3': return mk('synergy3', { first: 'Brayden', last: 'Hale', nick: 'Synergy III', country: 'USA', hometown: 'Scottsdale, Arizona', age: 22, height: 180, reach: 185, skills: sk(84), styles: ['Point Fighter', 'Kickboxer'], traits: ['Clout Chaser'], record: { w: 14, l: 0, d: 0, nc: 0 }, look: { hair: 12, hairColor: 4, beard: 0, build: 1 } }, 'light', 'contender');
    default: return buildOpponent(s, 'brick');
  }
}

// ---------------------------------------------------------------- the tapes

const sc = (title: string, bg: Bg, cast: TapeActor[], lines: Line[], flashback = false): TapeStep => ({ kind: 'scene', title, bg, cast, lines, flashback });
const fight = (title: string, player: string, opponent: string, venue: string, rounds: 3 | 5, stakes: string, referee?: string): TapeStep => ({ kind: 'fight', title, player, opponent, venue, rounds, stakes, referee });

export const TAPES: Tape[] = [
  {
    id: 'tyler', title: 'TRUST FUND', label: 'TAPE 1', unlock: 'Notebook page: THE VANCE BOY',
    blurb: 'Tyler Vance leaves his father\'s gym for a mop at Ray\'s, and finds out what he actually is.',
    needs: (p) => p.includes('tyler'),
    steps: [
      sc('THE CAR PARK', 'lot', [{ who: 'gordon', name: 'GORDON VANCE', x: 160, facing: 1 }, { who: 'tyler', fighter: 'tyler', name: 'TYLER', x: 290, facing: -1 }], [
        { who: null, text: 'Years ago. The night Tyler lost the rematch to Han. His father is waiting by the car with the engine running.' },
        { who: 'gordon', text: 'Get in. We are going home.' },
        { who: 'tyler', text: 'I am going to Ray\'s.' },
        { who: 'gordon', text: 'Ray\'s is a soup kitchen with a ring in it.' },
        { who: 'tyler', text: 'Yeah. That\'s why.' },
      ], true),
      sc('MONDAY, SIX A.M.', 'gym', [{ who: 'ray', name: 'UNCLE RAY', x: 170, facing: 1 }, { who: 'tyler', fighter: 'tyler', name: 'TYLER', x: 290, facing: -1 }], [
        { who: 'ray', text: 'You are early.' },
        { who: 'tyler', text: 'Can I mop?' },
        { who: null, text: 'Ray hands him the mop and does not say anything about it, which is the nicest thing Ray has ever not said.' },
      ]),
      fight('THE PRODIGY', 'tyler', 'chad', 'THE WAREHOUSE', 3, 'Gordon\'s gym has a new golden boy. He calls Tyler "the mop" at the weigh-in. Tyler says thank you.'),
      sc('THE LETTER', 'office', [{ who: 'gordon', name: 'GORDON VANCE', x: 200, facing: 1 }], [
        { who: null, text: 'A letter from Gordon, in Gordon\'s handwriting, which nobody has seen in twenty years.' },
        { who: 'gordon', text: '"Rocco is the best I have. Fight him. If you win, I will come to Ray\'s. I will eat the soup. I will not like it."' },
      ]),
      fight('THE LANDLORD\'S PICK', 'tyler', 'gordon_champ', 'MONCTON COLISEUM', 5, 'Five rounds against his father\'s champion, in front of his father, for a bowl of soup.'),
      sc('THE SOUP', 'gym', [{ who: 'gordon', name: 'GORDON VANCE', x: 150, facing: 1 }, { who: 'tyler', fighter: 'tyler', name: 'TYLER', x: 260, facing: -1 }, { who: 'ray', name: 'UNCLE RAY', x: 370, facing: -1 }], [
        { who: null, text: 'Gordon Vance sits at the soup counter in a three-piece suit. Ray puts a bowl in front of him.' },
        { who: 'gordon', text: '...It is good.' },
        { who: 'ray', text: 'I know.' },
        { who: 'tyler', text: 'Dad. You have to wash the bowl.' },
        { who: null, text: 'He washes the bowl. It takes him four minutes. Nobody has ever been prouder of a clean bowl.' },
      ]),
    ],
  },
  {
    id: 'xavier', title: 'THE BARN YEARS', label: 'TAPE 2', unlock: 'Notebook page: THE COWBOY',
    blurb: 'Before the horse trailer and the four hundred dollars: a young Xavier Cockett builds a league out of a barn, a goat and nerve.',
    needs: (p) => p.includes('xavier'),
    steps: [
      sc('SUSSEX, NEW BRUNSWICK', 'warehouse', [{ who: 'xavier', fighter: 'xavier', name: 'XAVIER, 26', x: 180, facing: 1 }], [
        { who: null, text: 'Twenty years ago. A barn, a borrowed cage and a hand-painted sign: ALLSTAR FIGHTING CHAMPIONSHIP. The A is backwards.' },
        { who: 'xavier', text: 'I am the promoter, the main event and the man who sells the popcorn. I am also the man who cleans the goat.' },
      ], true),
      fight('ALLSTAR FC 1 (THE ORIGINAL)', 'xavier', 'bull', 'XAVIER\'S BARN', 3, 'The first Allstar card. Xavier books himself against a bull rider because nobody else would come.'),
      sc('THE BINGO HALL', 'bingo', [{ who: 'xavier', fighter: 'xavier', name: 'XAVIER', x: 160, facing: 1 }, { who: 'ray', name: 'RAY (YOUNGER)', x: 280, facing: -1 }], [
        { who: null, text: 'A bingo hall in Moncton. A man in a cardigan is taping a kid\'s hands in the corner.' },
        { who: 'ray', text: 'You are the cowboy with the barn.' },
        { who: 'xavier', text: 'I am going to run my own league one day. A real one.' },
        { who: 'ray', text: 'Then feed your fighters. That is the whole secret. Nobody believes me.' },
      ], true),
      fight('THE SHERIFF', 'xavier', 'sheriff', 'XAVIER\'S BARN', 5, 'The local sheriff wants the barn shut down. Xavier suggests they settle it in the cage. The sheriff agrees, which is the worst decision in the history of law enforcement.'),
      sc('THE HAT', 'warehouse', [{ who: 'xavier', fighter: 'xavier', name: 'XAVIER', x: 220, facing: 1 }], [
        { who: null, text: 'The barn is full. The goat is the commissioner. Xavier never fights again; he puts the hat on and promotes instead.' },
        { who: 'xavier', text: 'Four hundred bucks a fight, a hat, and soup if Ray is around. Best league in the world.' },
      ]),
    ],
  },
  {
    id: 'spadam', title: 'THE FALL OF THE WHITE BEAST', label: 'TAPE 3', unlock: 'Notebook page: THE WHITE BEAST',
    blurb: 'Two losses to Han. No Daniel Stinkovich. Spadam Biggs finds out what he can do on his own.',
    needs: (p) => p.includes('spadam'),
    steps: [
      sc('THE BANK RECORDS', 'office', [{ who: 'spadam', fighter: 'spadam', name: 'SPADAM BIGGS', x: 180, facing: 1 }, { who: 'daniel', name: 'DIRTY DANIEL', x: 300, facing: -1 }], [
        { who: null, text: 'The commission has the bank records. Twenty-four deposits from "Beast Mode Kickboxing LLC". One per fight.' },
        { who: 'daniel', text: 'I could still ref your next one. Off the books. As a friend.' },
        { who: 'spadam', text: 'Get out of my gym, Daniel.' },
      ]),
      fight('CLEAN SHEET', 'spadam', 'kicker', 'THE WAREHOUSE', 3, 'Spadam\'s first fight with a neutral referee in seven years. He is nervous. Six foot seven and nervous.'),
      sc('THE SOUP', 'gym', [{ who: 'spadam', fighter: 'spadam', name: 'SPADAM', x: 170, facing: 1 }, { who: 'ray', name: 'UNCLE RAY', x: 290, facing: -1 }], [
        { who: 'spadam', text: 'Can I hit the bag?' },
        { who: 'ray', text: 'The bag does not care who you were.' },
        { who: null, text: 'He hits it for an hour. Ray gives him soup. Spadam has two bowls, then a third, then asks if he can come back on Monday.' },
      ]),
      fight('THE EXHIBITION', 'spadam', 'daniel', 'THE WAREHOUSE', 3, 'A charity exhibition: Spadam Biggs against Daniel Stinkovich, for the kids\' program at Ray\'s. Daniel thought it was a joke. It is not a joke.'),
    ],
  },
  {
    id: 'alberto', title: 'ALBERTO DEL BURRITO', label: 'POST-GAME', unlock: 'Finish TALES OF LEGACY, and the notebook page ALBERTO',
    blurb: 'Mateo and Han take 1ton home to Guadalajara. Fifteen years after the cantina, the champion of Mexico fights again, under his own name.',
    needs: (p, finished) => finished && p.includes('alberto'),
    steps: [
      sc('THE AIRPORT', 'street', [{ who: 'han', name: 'HAN', x: 140, facing: 1 }, { who: 'alberto', fighter: 'alberto', name: 'ALBERTO', x: 250, facing: -1 }, { who: 'mateo', name: 'MATEO', x: 350, facing: -1 }], [
        { who: null, text: 'Guadalajara. Hot. Loud. A banner at arrivals that says WELCOME HOME CAMPEON, held by one very old man.' },
        { who: 'alberto', text: 'I have not been home in fifteen years.' },
        { who: 'mateo', text: 'Ray wrote it in the notebook. "Give him the second chance nobody else did."' },
        { who: 'han', text: 'So here it is. Under your name.' },
      ]),
      sc('THE CANTINA', 'lucha', [{ who: 'alberto', fighter: 'alberto', name: 'ALBERTO', x: 170, facing: 1 }, { who: 'reporter', name: 'THE ABUELA', x: 300, facing: -1 }], [
        { who: null, text: 'The same cantina. The same corner. The same seventy-four-year-old woman, now eighty-nine, with the same handbag.' },
        { who: 'reporter', text: 'Alberto. You still owe me eight hundred pesos.' },
        { who: 'alberto', text: 'Señora. With respect. I brought nine hundred.' },
        { who: null, text: 'She takes the money. She hugs him. Then she hits him with the handbag anyway, for old times.', shake: true, sfx: 'punch' },
      ]),
      fight('THE PRINCE OF POLANCO', 'alberto', 'prince', 'ARENA GUADALAJARA', 3, 'The comeback, against the golden boy whose father owns a television network. Mexico is watching. Some of Mexico is the abuela.'),
      sc('THE GRANDSON', 'presser', [{ who: 'alberto', fighter: 'alberto', name: 'ALBERTO', x: 170, facing: 1 }, { who: 'nieto', fighter: 'nieto', name: 'KEVIN "EL NIETO" RAMOS', x: 300, facing: -1 }], [
        { who: 'nieto', text: 'You made me cry when I was eight. My grandmother never let me forget it.' },
        { who: 'alberto', text: 'You are the boy from the tickets.' },
        { who: 'nieto', text: 'I am the champion of Mexico now. Your old belt. Come and get it.' },
      ]),
      fight('EL CAMPEON', 'alberto', 'nieto', 'ARENA GUADALAJARA', 5, 'Five rounds for his old belt, against the boy he made cry, with his grandmother in the front row and Mateo and Han in his corner.'),
      sc('HOME', 'lucha', [{ who: 'han', name: 'HAN', x: 130, facing: 1 }, { who: 'alberto', fighter: 'alberto', name: 'ALBERTO', x: 240, facing: -1 }, { who: 'mateo', name: 'MATEO', x: 340, facing: -1 }], [
        { who: null, text: 'Whatever the cards said, the arena chants his name. His real one. All of it.' },
        { who: 'alberto', text: 'When are you going to put a Mexican fighter in the main event?' },
        { who: 'mateo', text: 'Tonight.' },
        { who: 'han', text: 'Every night, if you want.' },
        { who: null, text: 'Somebody has made soup in the locker room. It has a little chile in it. Nobody tells anyone.' },
      ]),
    ],
  },
  {
    id: 'pete', title: 'COMMISSIONER PETE', label: 'TAPE 5', unlock: 'Notebook pages: THE COWBOY and THE BUYBACK',
    blurb: 'The true story of the most powerful official in Maritime combat sports. He is a goat. He has eaten four contracts and a judge\'s scorecard.',
    needs: (p) => p.includes('xavier') && p.includes('belt'),
    steps: [
      sc('THE CARD GAME', 'warehouse', [{ who: 'xavier', fighter: 'xavier', name: 'XAVIER, 26', x: 170, facing: 1 }, { who: 'ray', name: 'RAY (YOUNGER)', x: 300, facing: -1 }], [
        { who: null, text: 'A barn outside Sussex, twenty years ago. A card game. Xavier is out of money, so he bets the cage. He wins the cage, and the goat that lives in it.' },
        { who: 'xavier', text: 'Every league needs a commissioner, Ray.' },
        { who: 'ray', text: 'That is a goat.' },
        { who: 'xavier', text: 'That is Commissioner Pete. He is impartial. He has no idea what is happening.' },
        { who: 'ray', text: 'Most commissioners are like that.' },
      ], true),
      sc('THE BOUT SHEET', 'warehouse', [{ who: 'xavier', name: 'XAVIER "ALLSTAR" COCKETT', x: 160, facing: 1 }, { who: 'oneton', name: '1TON', x: 300, facing: -1 }], [
        { who: null, text: 'Allstar FC, card one. The goat walks into the cage, eats the bout sheet and sits in the middle of the canvas.' },
        { who: 'oneton', text: 'Who is fighting first?' },
        { who: 'xavier', text: 'Nobody knows. Pete has ruled. We go alphabetically.' },
        { who: 'oneton', text: 'My name starts with a number.' },
        { who: 'xavier', text: 'Then you are first, partner. The commissioner has spoken.' },
      ]),
      fight('CUSTODY', 'xavier', 'sheriff', 'XAVIER\'S BARN', 3, 'The sheriff says a goat cannot hold a sanctioning license. Xavier says the goat holds it fine, it just eats it sometimes. Winner keeps Pete.'),
      sc('THE OLD DOME', 'cage', [{ who: 'xavier', name: 'XAVIER "ALLSTAR" COCKETT', x: 150, facing: 1 }, { who: 'han', name: 'HAN', x: 280, facing: -1 }], [
        { who: null, text: 'The buyback. Eighteen thousand people. Commissioner Pete arrives at the Old Dome in his own horse trailer. Security does not stop him. Security has met him.' },
        { who: 'han', text: 'Is he allowed in here?' },
        { who: 'xavier', text: 'He is the most senior official in the building.' },
        { who: 'han', text: 'He is eating the ring card.' },
        { who: 'xavier', text: 'Then the round is over. Rules are rules.' },
      ]),
      sc('RETIREMENT', 'gym', [{ who: 'mateo', name: 'MATEO', x: 180, facing: 1 }, { who: 'han', name: 'HAN', x: 300, facing: -1 }], [
        { who: null, text: 'Ray\'s Boxing & Soup. Monday. Six a.m. There is a goat on the roof.' },
        { who: 'mateo', text: 'Xavier says Pete is retiring. He wants to be near the soup.' },
        { who: 'han', text: 'Ray would have let him stay.' },
        { who: 'mateo', text: 'Ray would have made him a bowl.' },
        { who: null, text: 'Somebody makes him a bowl. Commissioner Pete eats the bowl.' },
      ]),
    ],
  },
  {
    id: 'kid', title: 'THE KID AT THE DOOR', label: 'NEW GAME+', unlock: 'Finish TALES OF LEGACY with the torch ending',
    blurb: 'Mateo runs Ray\'s now. There is a kid in a hoodie three sizes too big standing at the door. He has been there a week.',
    needs: (_p, finished) => finished && loadStoryTrophy().endings.includes('torch'),
    steps: [
      sc('MONDAY. SIX A.M.', 'gym', [{ who: 'mateo', fighter: 'bigmateo', name: 'MATEO', x: 180, facing: 1 }, { who: 'kid', fighter: 'kid1', name: 'THE KID', x: 330, facing: -1 }], [
        { who: null, text: 'Ray\'s Boxing & Soup. A year after the torch. Mateo runs it now, with Han on Tuesdays and a goat on the roof.' },
        { who: null, text: 'There is a kid at the door. Hoodie three sizes too big. He has been standing there for a week.' },
        { who: 'mateo', text: 'You are letting the cold in.' },
        { who: 'kid', text: 'I am not coming in.' },
        { who: 'mateo', text: 'I know. I did not come in either. For a week.' },
        { who: null, text: 'Mateo holds out a mop. The kid looks at it for a long time. Then he takes it.', act: [{ do: 'meet', who: 'mateo', target: 'kid', pose: 'offer', prop: 'mop' }] },
        { who: 'mateo', text: 'Theo, right? Luc Arsenault\'s grandson. Shediac. Hands up. Chin down. Eat something.' },
      ]),
      fight('NO HARD SHOTS', 'kid1', 'chad', "RAY'S BOXING & SOUP", 3, 'Six months of mopping. His first rounds in Ray\'s ring, against a rich kid from Rothesay who came in for "content". Mateo is refereeing. Mateo says no hard shots.', 'Mateo Varga'),
      sc('TUESDAYS', 'gym', [{ who: 'han', fighter: 'han', name: 'HAN', x: 160, facing: 1 }, { who: 'kid', fighter: 'kid2', name: 'THEO', x: 300, facing: -1 }], [
        { who: null, text: 'Han teaches Tuesdays now. He is better at it than he thought. He is worse at the whiteboard than ever.' },
        { who: 'han', text: 'Left hook. Turn the hip, not the shoulder. A man called Butch did it to my uncle in 1987.' },
        { who: 'kid', text: 'Did your uncle win?' },
        { who: 'han', text: 'No. He got the soup. The soup is better than winning. Do not tell Mateo I said that.' },
      ]),
      fight('THE BARN', 'kid2', 'bull', "XAVIER'S BARN", 3, 'Allstar FC. Xavier has a new hat. Commissioner Pete has a new opinion about the bout sheet. Theo\'s first fight in front of people.'),
      sc('THE BACK ROW', 'warehouse', [{ who: 'oneton', name: 'GORDO "1TON" FUENTE', x: 150, facing: 1 }, { who: 'kid', fighter: 'kid3', name: 'THEO', x: 300, facing: -1 }], [
        { who: null, text: 'The warehouse. Third row from the back. A big man with a beard and a notebook.' },
        { who: 'oneton', text: 'I write for the Daily Clinch again. One question.' },
        { who: 'kid', text: 'Go on.' },
        { who: 'oneton', text: 'When are you going to put a kid from Shediac in the main event?' },
        { who: 'kid', text: 'Ask Mateo.' },
        { who: 'oneton', text: 'I did. He said: when one walks in the door.' },
      ]),
      fight('THE UNDERCARD', 'kid3', 'kicker', 'THE WAREHOUSE', 3, 'The warehouse undercard, against a Brazilian kickboxer who has never been taken down and has never met anyone who mops this hard.'),
      sc('THE CALL', 'office', [{ who: 'mateo', fighter: 'bigmateo', name: 'MATEO', x: 170, facing: 1 }, { who: 'kid', fighter: 'kid4', name: 'THEO "THE HOODIE" ARSENAULT', x: 310, facing: -1 }], [
        { who: null, text: 'Zenith calls. They have a new golden boy and a hole in their card at the Old Dome. They want a local kid to lose to him.' },
        { who: 'mateo', text: 'They want you to lose.' },
        { who: 'kid', text: 'I am not going to.' },
        { who: 'mateo', text: 'I know. That is why I said yes. The bucket goes in your corner.' },
      ]),
      fight('THE OLD DOME', 'kid4', 'synergy3', 'THE OLD DOME', 5, 'Five rounds at the Old Dome against Zenith\'s third "Synergy". Mateo in the corner with Ray\'s bucket. Han on the apron. A goat in the front row.'),
      sc('MONDAY. SIX A.M.', 'gym', [{ who: 'mateo', fighter: 'bigmateo', name: 'MATEO', x: 150, facing: 1 }, { who: 'kid', fighter: 'kid4', name: 'THEO', x: 260, facing: -1 }, { who: 'han', fighter: 'han', name: 'HAN', x: 370, facing: -1 }], [
        { who: null, text: 'Monday. Six a.m. The soup is on. Theo is at the door at 5:58.' },
        { who: 'kid', text: 'There is a kid outside. Hoodie three sizes too big. He has been there since Thursday.' },
        { who: 'mateo', text: 'Give him the mop.', photo: { id: 'ending_kid', title: 'THE KID AT THE DOOR' } },
        { who: 'han', text: 'Hands up.' },
        { who: 'kid', text: 'Chin down.' },
        { who: 'mateo', text: 'Eat something.' },
      ]),
    ],
  },
];

// ---------------------------------------------------------------- progress

const KEY = 'cageboss2.tapes';
export const tapeProgress = (): Record<string, number> => loadJSON<Record<string, number>>(KEY, {});
export function setTapeStep(id: string, step: number): void {
  storeJSON(KEY, { ...tapeProgress(), [id]: step });
}
export const tapeUnlocked = (t: Tape, finished: boolean): boolean => t.needs(notebookPages(), finished);
