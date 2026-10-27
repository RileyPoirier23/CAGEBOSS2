/**
 * CAGE BOSS II ships as its own game (sequel.html / its own exe). When it boots on its own,
 * the sequel's title screen is the front door: BACK quits instead of walking out to the
 * first game's street.
 */
let standalone = false;

export function setSequelStandalone(on: boolean): void {
  standalone = on;
}

export function isSequelStandalone(): boolean {
  return standalone;
}

/**
 * The demo inside the first game (its title street has a CAGE BOSS II billboard): the first two
 * story chapters and the first four promoter weeks, then a poster for the full game.
 */
let demo = false;
export const DEMO_STORY_CHAPTERS = 2;
export const DEMO_WEEKS = 4;

export function setSequelDemo(on: boolean): void {
  demo = on;
}

export function isSequelDemo(): boolean {
  return demo;
}
