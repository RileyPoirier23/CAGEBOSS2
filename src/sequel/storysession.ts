/** Story mode's save file: one campaign, plus the endings you have found. */
import { loadJSON, storeJSON } from '../core/save';
import { STORY_VERSION, type StorySave, type StoryTrophy } from './types';
import { STORY_ENDINGS, migrateStorySave, storyChapter } from './story';
import { activeSlot, slotKey, touchSlot } from './slots';

export const STORY_KEY = 'cageboss2.story';
export const STORY_TROPHY_KEY = 'cageboss2.story.trophies';

let current: StorySave | null | undefined;

function valid(save: unknown): save is StorySave {
  if (!save || typeof save !== 'object') return false;
  const s = save as Partial<StorySave>;
  return s.version === STORY_VERSION && typeof s.chapter === 'number' && typeof s.trust === 'number' && !!s.training;
}

/** The active TALES OF LEGACY slot's save (slots.ts). */
export function readStory(): StorySave | null {
  if (current !== undefined) return current;
  const slot = activeSlot('story');
  const raw = slot ? loadJSON<unknown>(slotKey('story', slot.id), null) : null;
  current = valid(raw) ? migrateStorySave(raw) : null;
  return current;
}

export function forgetStory(): void {
  current = undefined;
}

export function hasStory(): boolean {
  return !!readStory();
}

export function writeStory(save: StorySave): void {
  current = save;
  const slot = activeSlot('story');
  if (!slot) return;
  storeJSON(slotKey('story', slot.id), save);
  const ch = storyChapter(save);
  touchSlot('story', save.status === 'ended' ? `FINISHED  /  ${String(save.ending ?? '').toUpperCase()}` : `CHAPTER ${ch.no}  /  ${ch.title}`);
}

export function clearStory(): void {
  current = null;
  const slot = activeSlot('story');
  if (slot) storeJSON(slotKey('story', slot.id), null);
}

export function loadStoryTrophy(): StoryTrophy {
  const t = loadJSON<Partial<StoryTrophy>>(STORY_TROPHY_KEY, {});
  return {
    endings: t.endings ?? [],
    bestRank: t.bestRank ?? '-',
    chapters: t.chapters ?? 0,
    trust: t.trust ?? 0,
    brand: t.brand ?? 0,
    catches: t.catches ?? 0,
    sideWins: t.sideWins ?? 0,
    playthroughs: t.playthroughs ?? 0,
  };
}

const RANK_ORDER: Record<string, number> = { '-': 0, F: 1, D: 2, C: 3, B: 4, A: 5, S: 6 };

export function addStoryTrophy(save: StorySave): StoryTrophy {
  const prev = loadStoryTrophy();
  // a sandbox replay doesn't count toward the trophy case
  if (save.flags.sandbox || save.flags.demo) return prev;
  const ending = STORY_ENDINGS.find((e) => e.id === save.ending);
  const endings = prev.endings.includes(save.ending ?? '') || !save.ending ? prev.endings : [...prev.endings, save.ending];
  const bestRank = ending && (RANK_ORDER[ending.rank] ?? 0) > (RANK_ORDER[prev.bestRank] ?? 0) ? ending.rank : prev.bestRank;
  const trophy: StoryTrophy = {
    endings,
    bestRank,
    chapters: Math.max(prev.chapters, save.chapter + 1),
    trust: Math.max(prev.trust, save.trust),
    brand: Math.max(prev.brand, save.brand),
    catches: Math.max(prev.catches, save.stats.catches),
    sideWins: Math.max(prev.sideWins, save.stats.sideWins),
    playthroughs: prev.playthroughs + (save.status === 'ended' ? 1 : 0),
  };
  storeJSON(STORY_TROPHY_KEY, trophy);
  return trophy;
}
