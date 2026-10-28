/**
 * CAGE BOSS II: the fight's damage, carried out of the cage and into the cutscenes.
 */
import { describe, it, expect } from 'vitest';
import { freshFace } from '../src/sim/live';
import {
  EMPTY_MARKS, ageMarks, marksFromLive, marksFromResult, marksSeverity, mergeMarks,
} from '../src/ui/marks';

describe('marks', () => {
  it('a clean fighter leaves the cage clean', () => {
    const clean = marksFromLive(freshFace(), { hp: 100, body: 100, legs: 100, cut: 0 });
    expect(clean).toEqual(EMPTY_MARKS);
    expect(marksSeverity(clean)).toBe(0);
    expect(marksSeverity(marksFromResult(0, 0, 1))).toBe(0);
  });

  it('a live beating lands on the face, the ribs, the liver and the legs', () => {
    const face = freshFace();
    face.browL.swell = 0.7;
    face.browL.cut = 0.4;
    face.nose.cut = 0.5;
    const m = marksFromLive(face, { hp: 35, body: 20, legs: 10, cut: 2 });
    expect(m.browL).toBeGreaterThan(0.6);
    expect(m.nose).toBeGreaterThan(0.2);
    expect(m.ribs).toBeCloseTo(0.8);
    expect(m.liver).toBeCloseTo(0.72);
    expect(m.thighL).toBeCloseTo(0.9);
    expect(m.thighR).toBeCloseTo(0.828);
    expect(m.blood).toBeGreaterThan(0.5);
    expect(marksSeverity(m)).toBeGreaterThan(0.65);
  });

  it('a result line becomes a believable face, worse the later it ended', () => {
    const early = marksFromResult(40, 0, 1);
    const late = marksFromResult(80, 2, 5);
    expect(late.browL).toBeGreaterThan(early.browL);
    expect(late.eyeL).toBeGreaterThan(early.eyeL);
    expect(late.blood).toBeGreaterThan(early.blood);
    expect(late.ribs).toBeGreaterThan(0);
    expect(marksSeverity(marksFromResult(100, 3, 9))).toBeGreaterThan(0.85);
  });

  it('ages, merges, and keeps the worst of two fights', () => {
    const aged = ageMarks({ browL: 0.8, blood: 0.4 }, 0.5);
    expect(aged.browL).toBe(0.8);
    expect(aged.blood).toBe(0.4);
    expect(aged.eyeL).toBe(0);
    expect(aged.age).toBe(0.5);

    const merged = mergeMarks({ browL: 0.2, ribs: 0.9, age: 0.8 }, { browL: 0.7, liver: 0.5, age: 0.2 });
    expect(merged.browL).toBe(0.7);
    expect(merged.ribs).toBe(0.9);
    expect(merged.liver).toBe(0.5);
    expect(merged.age).toBe(0.2);
    expect(mergeMarks(undefined, undefined)).toEqual(EMPTY_MARKS);
  });
});
