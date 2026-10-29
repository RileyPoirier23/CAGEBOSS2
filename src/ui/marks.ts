/**
 * CAGE BOSS II: marks. The engine knows where the damage landed (the face, zone by zone, the
 * body and the legs); the rig knows how to draw it. This is the translation, plus a version
 * for bouts we only have a result line for (WATCH THE FIGHT) and a version that lets old
 * damage age from fresh red to purple to green.
 */
import type { Face } from '../sim/live';
import type { Marks } from './rig';

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** One face zone: either an open cut or the swelling left by it, whichever reads worse. */
const zone = (swell: number, cut: number): number => clamp01(Math.max(swell, cut * 0.85));

/**
 * The marks a fighter carries out of a live bout. `face` is the engine's per-zone record,
 * `hp`/`body`/`legs` are 0..100 tanks and `cuts` is the referee's count of open cuts.
 */
export function marksFromLive(face: Face, f: { hp: number; body: number; legs: number; cut: number }): Marks {
  const head = clamp01((100 - f.hp) / 100);
  const body = clamp01((100 - f.body) / 100);
  const legs = clamp01((100 - f.legs) / 100);
  const cut = clamp01(f.cut / 3);
  const blood = clamp01(Math.max(
    face.browL.cut, face.browR.cut, face.nose.cut, face.mouth.cut, face.eyeL.cut, face.eyeR.cut,
  ) * 1.1 + cut * 0.35);
  return {
    browL: zone(face.browL.swell, face.browL.cut),
    browR: zone(face.browR.swell, face.browR.cut),
    eyeL: zone(face.eyeL.swell, face.eyeL.cut),
    eyeR: zone(face.eyeR.swell, face.eyeR.cut),
    nose: Math.max(zone(face.nose.swell, face.nose.cut), head * 0.35),
    mouth: zone(face.mouth.swell, face.mouth.cut),
    ribs: body,
    liver: body * 0.9,
    thighL: legs,
    thighR: legs * 0.92,
    blood,
    age: 0,
  };
}

/**
 * A fighter we only saw the result of (the promoter's tape): spread the damage over the face
 * the way a real beating falls, with the round it ended telling us how much of it there was.
 */
export function marksFromResult(damage: number, cuts: number, round = 3): Marks {
  const d = clamp01(damage / 100);
  const late = clamp01((round - 1) / 8);
  const cut = clamp01(cuts / 3);
  const bleed = clamp01(d * 0.9 + cut * 0.55);
  return {
    browL: clamp01(d * 0.55 + late * 0.15 + cut * 0.18),
    browR: clamp01(d * 0.4 + cut * 0.32),
    eyeL: clamp01(d * 0.62 + cut * 0.2),
    eyeR: clamp01(d * 0.28 + late * 0.18),
    nose: clamp01(d * 0.5),
    mouth: clamp01(d * 0.4 + cut * 0.14),
    ribs: clamp01(d * 0.6),
    liver: clamp01(d * 0.45),
    thighL: clamp01(d * 0.4),
    thighR: clamp01(d * 0.32),
    blood: bleed,
    age: 0,
  };
}

/** How the same marks look after a while: 0 = fresh out of the cage, 1 = a week on. */
export function ageMarks(m: Partial<Marks>, age: number): Marks {
  return { ...EMPTY_MARKS, ...m, age: clamp01(age) };
}

/** Take the stronger mark in every zone (a man who has fought twice this week). */
export function mergeMarks(a: Partial<Marks> | undefined, b: Partial<Marks> | undefined): Marks {
  const A = { ...EMPTY_MARKS, ...a };
  const B = { ...EMPTY_MARKS, ...b };
  const out = { ...EMPTY_MARKS } as Marks;
  for (const k of Object.keys(EMPTY_MARKS) as (keyof Marks)[]) {
    if (k === 'age') out.age = Math.min(A.age, B.age);
    else out[k] = Math.max(A[k], B[k]);
  }
  return out;
}

export const EMPTY_MARKS: Marks = {
  browL: 0, browR: 0, eyeL: 0, eyeR: 0, nose: 0, mouth: 0,
  ribs: 0, liver: 0, thighL: 0, thighR: 0, blood: 0, age: 0,
};

/** A compact 0..1 score for the health bar / corner readout: the worst thing on him. */
export function marksSeverity(m: Partial<Marks> | undefined): number {
  if (!m) return 0;
  return clamp01(Math.max(
    m.browL ?? 0, m.browR ?? 0, m.eyeL ?? 0, m.eyeR ?? 0, m.nose ?? 0, m.mouth ?? 0,
    (m.ribs ?? 0) * 0.8, (m.liver ?? 0) * 0.8, (m.thighL ?? 0) * 0.6, (m.thighR ?? 0) * 0.6,
  ));
}
