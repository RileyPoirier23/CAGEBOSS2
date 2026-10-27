/**
 * Ray's notebook: a journal that fills in as you play Tales of Legacy, across every playthrough.
 * Every flashback, the recipe, old fight cards and the people he wrote about become pages, in
 * his handwriting. A full book unlocks RAY, 1987: the Golden Gloves final against Butch, yours
 * to fight. Pages live in cageboss2.notebook (not in a save), so they never go away.
 */
import { loadJSON, storeJSON } from '../core/save';
import type { StorySave } from './types';

export interface NotebookPage { id: string; title: string; text: string; hint: string; has: (s: StorySave) => boolean }

const won = (s: StorySave, id: string) => s.flags[`won_${id}`] === true;
const seen = (s: StorySave, flag: string) => !!s.flags[flag];

export const PAGES: NotebookPage[] = [
  { id: 'gloves', title: 'GOLDEN GLOVES, 1987', hint: 'Hear about Butch from Ray himself.', has: (s) => seen(s, 'talk_allstar'),
    text: 'Final. Moncton Coliseum. Butch (mullet, left hook, no mercy). Lost on the cards. Marie at the bus with two bowls of soup. Best night of my life. Don\'t tell Butch.' },
  { id: 'recipe', title: 'MARIE\'S SOUP', hint: 'Find the recipe in the cutlery drawer.', has: (s) => seen(s, 'part_the_wake_2'),
    text: 'Onions first, slow. Carrots, celery, the bones from Sunday. Salt like you mean it. (A little chile. Don\'t tell anyone. - R.)' },
  { id: 'first_day', title: 'THE REPORTER', hint: 'Get 1ton to the gym at six.', has: (s) => seen(s, 'beat_first_day'),
    text: 'Big beard. Bad jab. Shows up two minutes early. Never seen that before. Gave him soup. He said it was six in the morning. It\'s always six in the morning somewhere.' },
  { id: 'cuchillo', title: 'FIGHT CARD: THE MEXICAN MATH', hint: 'Win 1ton\'s first real fight.', has: (s) => won(s, 'cuchillo'),
    text: '1ton vs El Cuchillo. The warehouse. Gordo won and then cried in the shower and pretended it was the water. It wasn\'t the water.' },
  { id: 'han', title: 'THE NEPHEW', hint: 'Bring Han home.', has: (s) => seen(s, 'intro_brick_by_brick'),
    text: 'Han came back. Middleweight champion of the world, and he still asks before he takes the last bowl. Marc would be so proud he wouldn\'t be able to speak.' },
  { id: 'mateo12', title: 'THE KID AT THE DOOR', hint: 'Remember Mateo at twelve.', has: (s) => seen(s, 'beat_mop_years'),
    text: 'Kid in a hoodie three sizes too big. Stood at the door a week. Gave him a mop. He slept on the bench. Left him a blanket. Don\'t tell him I knew.' },
  { id: 'tyler', title: 'THE VANCE BOY', hint: 'Watch Tyler fight for Ray\'s rent.', has: (s) => seen(s, 'fight_han_tyler'),
    text: 'Tyler mops every Monday. Gordon\'s boy. Better mopper than his father ever was a landlord. Gave the whole purse to the rent. I cried. The mop didn\'t.' },
  { id: 'xavier', title: 'THE COWBOY', hint: 'Sign with Allstar FC.', has: (s) => seen(s, 'beat_xavier_league'),
    text: 'Xavier owes everybody four hundred dollars. He also paid for Mateo\'s gloves and never said. Crossed out the livestock clause. Twice.' },
  { id: 'coliseum', title: 'THE THIRD ROW', hint: 'Go home to Moncton.', has: (s) => seen(s, 'intro_homecoming'),
    text: 'Back in the Coliseum. Her seat is the same colour. I could still hear her over three thousand people. I always will.' },
  { id: 'envelope', title: 'THE GOLD ENVELOPE', hint: 'See the first crack.', has: (s) => seen(s, 'talk_audit'),
    text: 'Gordo has an envelope in his jacket. The inside pocket. The one by his heart. I have seen that look on fighters before. I set his place anyway.' },
  { id: 'empty_chair', title: 'SUNDAYS', hint: 'Set the empty place.', has: (s) => seen(s, 'talk_the_board'),
    text: 'Set a place for Gordo. Third Sunday. Soup went cold. I\'ll set it next week. You don\'t stop setting the place just because nobody sits in it.' },
  { id: 'last_dinner', title: 'THE LAST SUNDAY', hint: 'Sit down for Sunday dinner.', has: (s) => seen(s, 'beat_last_dinner'),
    text: 'Two champions and a promoter at my table. Han took a photo. Marie, if you\'re reading this: you were right. I filled the place.' },
  { id: 'marc', title: 'MARC', hint: 'Hear about the MARIE-ANNE.', has: (s) => seen(s, 'talk_street_justice'),
    text: 'My brother-in-law. Named the boat for my wife\'s sister. Never saw his boy fight. I sat in the front row for both of us. I still do.' },
  { id: 'alberto', title: 'ALBERTO', hint: 'Learn 1ton\'s real name.', has: (s) => seen(s, 'beat_true_name'),
    text: '(This page is in Han\'s handwriting.) Ray knew. He knew the whole time. He wrote it on the inside of the cover: "Alberto. Give him the second chance nobody else did."' },
  { id: 'spadam', title: 'THE WHITE BEAST', hint: 'Beat Spadam Biggs a second time.', has: (s) => won(s, 'han_spadam'),
    text: 'Spadam came to the gym after. Alone. No Daniel. Asked if he could hit the bag. I said the bag doesn\'t care who you were. He hit it for an hour. I gave him soup.' },
  { id: 'belt', title: 'THE BUYBACK', hint: 'Win the light heavyweight title.', has: (s) => won(s, 'final'),
    text: '(Mateo\'s handwriting.) We bought it back, Ray. The bucket was in my corner. It still smells like onions. Hands up. Chin down. I ate something.' },
  { id: 'torch', title: 'THE TORCH', hint: 'Finish the secret chapter.', has: (s) => seen(s, 'fight_han_legacy') || seen(s, 'fight_defense'),
    text: '(Both of them.) Monday. Six a.m. The soup is on. Somebody new is standing at the door, in a hoodie three sizes too big.' },
];

const KEY = 'cageboss2.notebook';
export const notebookPages = (): string[] => loadJSON<string[]>(KEY, []);
export const notebookComplete = (): boolean => PAGES.every((p) => notebookPages().includes(p.id));

/** Add any pages this save has earned. Returns the new ones (for the toast). */
export function unlockPages(save: StorySave): NotebookPage[] {
  if (save.flags.demo) return [];
  const have = new Set(notebookPages());
  const fresh = PAGES.filter((p) => !have.has(p.id) && p.has(save));
  if (fresh.length) storeJSON(KEY, [...have, ...fresh.map((p) => p.id)]);
  return fresh;
}
