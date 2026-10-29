/**
 * The replay theatre: every key cutscene you have seen in Tales of Legacy (chapter intros and
 * outros, story beats, the endings), kept across every save in cageboss2.theatre. A reel is a
 * recipe, not a recording: the seed, chapter, choices and flags the scene was played with, so
 * it can be rebuilt exactly (Ray's last stand, the torch, the abuela's handbag).
 */
import { loadJSON, storeJSON } from '../core/save';
import { newStorySave, STORY_CHAPTERS } from './story';
import type { StorySave } from './types';

export type ReelKind = 'intro' | 'outro' | 'beat' | 'ending';
export interface Reel {
  key: string;
  kind: ReelKind;
  title: string;
  chapter: number;
  /** the beat's id */
  ref?: string;
  seed: number;
  choices: StorySave['choices'];
  flags: StorySave['flags'];
  when: number;
}

const KEY = 'cageboss2.theatre';
const MAX = 80;

export const reels = (): Reel[] => loadJSON<Reel[]>(KEY, []);

/** Put a scene on the shelf (the newest version of it wins). Demo saves don't count. */
export function remember(save: StorySave, kind: ReelKind, title: string, ref?: string): void {
  if (save.flags.demo) return;
  const key = `${kind}:${save.chapter}:${ref ?? ''}`;
  const reel: Reel = { key, kind, title, chapter: save.chapter, ref, seed: save.seed, choices: { ...save.choices }, flags: { ...save.flags }, when: Date.now() };
  const list = reels().filter((r) => r.key !== key);
  list.push(reel);
  // keep them in story order
  list.sort((a, b) => a.chapter - b.chapter || order(a.kind) - order(b.kind));
  storeJSON(KEY, list.slice(-MAX));
}
const order = (k: ReelKind) => ({ intro: 0, beat: 1, outro: 2, ending: 3 })[k];

/** A save that looks like the one the scene was first played with. */
export function reelSave(r: Reel): StorySave {
  const save = newStorySave(r.seed);
  save.chapter = Math.min(r.chapter, STORY_CHAPTERS.length - 1);
  save.choices = { ...r.choices };
  save.flags = { ...r.flags };
  return save;
}
