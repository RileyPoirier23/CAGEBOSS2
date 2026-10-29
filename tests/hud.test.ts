/**
 * CAGE BOSS II's broadcast health bar: twenty chunks, lit while any of the chunk is left.
 */
import { describe, it, expect } from 'vitest';
import { hudChunks } from '../src/ui/hud';

describe('hudChunks', () => {
  it('turns a 0..100 tank into twenty lit chunks', () => {
    expect(hudChunks(100)).toBe(20);
    expect(hudChunks(99)).toBe(20);
    expect(hudChunks(51)).toBe(11);
    expect(hudChunks(50)).toBe(10);
    expect(hudChunks(49.9)).toBe(10);
    expect(hudChunks(1)).toBe(1);
    expect(hudChunks(0)).toBe(0);
  });

  it('clamps bad numbers instead of drawing outside the bar', () => {
    expect(hudChunks(-5)).toBe(0);
    expect(hudChunks(150)).toBe(20);
    expect(hudChunks(50, 10)).toBe(5);
    expect(hudChunks(1, 10)).toBe(1);
    expect(hudChunks(100, 0)).toBe(0);
  });
});
