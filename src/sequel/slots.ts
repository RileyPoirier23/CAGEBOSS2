/**
 * Save slots for CAGE BOSS II: as many PROMOTER MODE saves and TALES OF LEGACY saves as you like,
 * each with a name, a one-line summary and a sandbox mark. One slot of each kind is "active":
 * readRun()/readStory() read it, writeRun()/writeStory() write it.
 *
 *   cageboss2.slots.<kind>    the index (SlotMeta[])
 *   cageboss2.active.<kind>   the active slot's id
 *   cageboss2.<kind>.<id>     the save itself
 *
 * Saves from before slots (cageboss2.run / cageboss2.story) become a slot called "THE FIRST SAVE".
 */
import { loadJSON, storeJSON } from '../core/save';

export type SlotKind = 'run' | 'story';

export interface SlotMeta {
  id: string;
  kind: SlotKind;
  name: string;
  /** sandbox saves sit with the others, marked; no achievements, no deadline */
  sandbox: boolean;
  createdAt: number;
  updatedAt: number;
  /** what the load screen says about it ("WEEK 12  /  $410K") */
  summary: string;
}

const LEGACY: Record<SlotKind, string> = { run: 'cageboss2.run', story: 'cageboss2.story' };
/**
 * Whose saves: the full game's ('cageboss2'), or the demo's inside the first game ('cageboss2demo').
 * In a browser both games share storage, so the demo never sees (or touches) the full game's saves.
 */
let NS = 'cageboss2';
export function setSlotNamespace(ns: 'cageboss2' | 'cageboss2demo'): void {
  NS = ns;
}
const indexKey = (k: SlotKind) => `${NS}.slots.${k}`;
const activeKey = (k: SlotKind) => `${NS}.active.${k}`;
export const slotKey = (k: SlotKind, id: string) => `${NS}.${k}.${id}`;

export function listSlots(kind: SlotKind): SlotMeta[] {
  let list = loadJSON<SlotMeta[] | null>(indexKey(kind), null);
  if (!list) {
    list = [];
    // a save from before slots: keep it, as the first slot (the full game's only)
    const old = NS === 'cageboss2' ? loadJSON<unknown>(LEGACY[kind], null) : null;
    if (old) {
      const id = 's1';
      storeJSON(slotKey(kind, id), old);
      list.push({ id, kind, name: 'THE FIRST SAVE', sandbox: false, createdAt: Date.now(), updatedAt: Date.now(), summary: '' });
      storeJSON(activeKey(kind), id);
    }
    storeJSON(indexKey(kind), list);
  }
  return list.slice().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function activeSlot(kind: SlotKind): SlotMeta | null {
  const id = loadJSON<string | null>(activeKey(kind), null);
  return listSlots(kind).find((s) => s.id === id) ?? null;
}

export function setActiveSlot(kind: SlotKind, id: string | null): void {
  storeJSON(activeKey(kind), id);
}

export function newSlot(kind: SlotKind, name: string, sandbox: boolean): SlotMeta {
  const list = listSlots(kind);
  let n = list.length + 1;
  while (list.some((s) => s.id === `s${n}`)) n++;
  const meta: SlotMeta = { id: `s${n}`, kind, name: name.trim().slice(0, 28) || `SAVE ${n}`, sandbox, createdAt: Date.now(), updatedAt: Date.now(), summary: '' };
  storeJSON(indexKey(kind), [...list, meta]);
  setActiveSlot(kind, meta.id);
  return meta;
}

export function deleteSlot(kind: SlotKind, id: string): void {
  storeJSON(indexKey(kind), listSlots(kind).filter((s) => s.id !== id));
  storeJSON(slotKey(kind, id), null);
  if (activeSlot(kind)?.id === id) setActiveSlot(kind, null);
}

/** Stamp the active slot after a save: when, and a line about where it's at. */
export function touchSlot(kind: SlotKind, summary: string): void {
  const id = loadJSON<string | null>(activeKey(kind), null);
  if (!id) return;
  const list = listSlots(kind).map((s) => (s.id === id ? { ...s, updatedAt: Date.now(), summary } : s));
  storeJSON(indexKey(kind), list);
}

/** The label a list shows: the name, and the sandbox mark. */
export const slotLabel = (s: SlotMeta): string => `${s.sandbox ? '[SANDBOX] ' : ''}${s.name}`;
