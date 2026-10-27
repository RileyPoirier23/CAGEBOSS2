/**
 * Moncton, as a street you walk: home, Ray's, the diner, the warehouse, the Coliseum and the bus
 * out of town. Every hub action lives in a building, and the story marks the door it wants you at
 * next (the fight's venue, Ray for the talk, the gym when the chapter's ready to move).
 */
import { chapterReady, fightThisWeek, talkedThisChapter } from './story';
import type { StorySave } from './types';

export type PlaceId = 'home' | 'rays' | 'diner' | 'warehouse' | 'coliseum' | 'bus';

export interface Place { id: PlaceId; name: string; x: number; w: number; blurb: string }

/** Left to right along Main Street (x is the building's left edge, in street pixels). */
export const PLACES: Place[] = [
  { id: 'home', name: 'HOME', x: 40, w: 120, blurb: 'Apartment 2B, over the laundromat. The radiator works on Tuesdays.' },
  { id: 'rays', name: "RAY'S BOXING & SOUP", x: 220, w: 210, blurb: 'Open six a.m. The soup is on. Ray is always here, and so is the bucket.' },
  { id: 'diner', name: 'THE MAGNETIC DINER', x: 490, w: 170, blurb: 'Booths, pie, a waitress called Denise who has seen every fighter in Moncton cry.' },
  { id: 'warehouse', name: 'THE WAREHOUSE', x: 720, w: 230, blurb: 'Forty Saturdays, one cage, a few hundred folding chairs. The undercard lives here.' },
  { id: 'coliseum', name: 'MONCTON COLISEUM', x: 1010, w: 270, blurb: 'Where Ray lost to Butch in 1987. Her seat in the third row is the same colour.' },
  { id: 'bus', name: 'MARITIME BUS', x: 1340, w: 140, blurb: 'Out of town: the barn, Guadalajara, a parking level that Zenith owns.' },
];
export const STREET_W = 1520;

export const place = (id: PlaceId): Place => PLACES.find((p) => p.id === id)!;

/** Which door a story venue is behind. */
export function placeFor(venue: string): PlaceId {
  const v = venue.toUpperCase();
  if (v.includes("RAY'S")) return 'rays'; // the ring, and the alley behind it
  if (v.includes('WAREHOUSE') || v.includes('LOADING BAY')) return 'warehouse';
  if (v.includes('COLISEUM') || v.includes('OLD DOME')) return 'coliseum';
  if (v.includes('DINER')) return 'diner';
  return 'bus';
}

/** Where the story wants you now, and what for (null: nowhere in particular, use the week). */
export function storyMarker(save: StorySave): { place: PlaceId; label: string } | null {
  if (save.status === 'ended') return null;
  const due = fightThisWeek(save);
  if (due) return { place: placeFor(due.venue), label: 'FIGHT' };
  if (!talkedThisChapter(save)) return { place: 'rays', label: 'TALK' };
  if (chapterReady(save)) return { place: 'rays', label: 'CONTINUE' };
  return null;
}
