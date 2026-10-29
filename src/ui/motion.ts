/**
 * CAGE BOSS II's motion kit: the curves, a tween that can be cancelled mid-flight, and the
 * reduced-motion switch. One set of curves for the whole sequel, so everything moves alike:
 *
 *   easeOut   cubic-bezier(0.23, 1, 0.32, 1)    things arriving or leaving (toasts, windows, menus)
 *   easeInOut cubic-bezier(0.77, 0, 0.175, 1)   things moving across the screen
 *
 * Never ease-in on UI (it delays the moment you're watching). UI stays under 300 ms.
 * Reduced motion (the OS setting, or REDUCE SHAKE in settings) keeps fades and drops movement.
 */
import { Ticker } from 'pixi.js';

/** A CSS-style cubic-bezier as a function of t (0..1), solved with Newton's method. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sy = (u: number) => ((ay * u + by) * u + cy) * u;
  const dx = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let u = t;
    for (let i = 0; i < 6; i++) {
      const e = sx(u) - t;
      const d = dx(u);
      if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break;
      u -= e / d;
    }
    return sy(Math.max(0, Math.min(1, u)));
  };
}

export const easeOut = cubicBezier(0.23, 1, 0.32, 1);
export const easeInOut = cubicBezier(0.77, 0, 0.175, 1);

/** Durations (seconds). */
export const DUR = { press: 0.12, toastIn: 0.18, toastOut: 0.2, modalIn: 0.2, modalOut: 0.14, scene: 0.22, menu: 0.2, stagger: 0.04 };

let reduceSetting = false;
const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
/** The game's REDUCE SHAKE setting also asks for less motion. */
export function setReduceMotion(on: boolean): void {
  reduceSetting = on;
}
/** Fewer, gentler animations: fades stay, movement and scaling go. */
export const reducedMotion = (): boolean => reduceSetting || !!mq?.matches;

/**
 * Run `step(k)` with k going 0..1 over `dur` seconds (eased), then `done`. Returns a cancel
 * function: a tween that's interrupted stops where it is (the next one starts from there).
 */
export function tween(dur: number, step: (k: number) => void, opts: { ease?: (t: number) => number; done?: () => void; delay?: number } = {}): () => void {
  const ease = opts.ease ?? easeOut;
  let t = -(opts.delay ?? 0);
  let live = true;
  const tick = (tk: Ticker) => {
    if (!live) return;
    t += Math.min(0.05, tk.deltaMS / 1000);
    if (t < 0) return;
    const k = dur <= 0 ? 1 : Math.min(1, t / dur);
    try {
      step(ease(k));
    } catch {
      // the thing it was moving is gone
      stop();
      return;
    }
    if (k >= 1) {
      stop();
      opts.done?.();
    }
  };
  const stop = () => {
    if (!live) return;
    live = false;
    Ticker.shared.remove(tick);
  };
  // the first frame is already the starting state
  step(ease(0));
  Ticker.shared.add(tick);
  return stop;
}
