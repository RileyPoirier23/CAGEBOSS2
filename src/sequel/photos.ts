/**
 * The photo album at the back of Ray's notebook: snapshots taken during the story's big moments
 * (the last Sunday dinner, the torch, every ending), kept in cageboss2.photos across every save.
 * A photo is a small JPEG data URL; retaking one replaces it.
 */
import { loadJSON, storeJSON } from '../core/save';

export interface Photo { id: string; title: string; data: string; taken: number }

const KEY = 'cageboss2.photos';
/** room for a full set: the dinner, the torch and every ending, plus a few spare */
const MAX = 16;

export const photos = (): Photo[] => loadJSON<Photo[]>(KEY, []);

export function addPhoto(p: Photo): void {
  const list = photos().filter((x) => x.id !== p.id);
  list.push(p);
  storeJSON(KEY, list.slice(-MAX));
}
