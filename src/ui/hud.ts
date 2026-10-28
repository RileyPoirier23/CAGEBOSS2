/**
 * CAGE BOSS II's broadcast HUD maths, kept out of the drawing code so it can be tested:
 * a bar is twenty chunks, and a chunk is lit while any of it is left.
 */
export function hudChunks(v: number, n = 20): number {
  const chunks = Math.ceil((Math.max(0, Math.min(100, v)) / 100) * n);
  return Math.max(0, Math.min(n, chunks));
}
