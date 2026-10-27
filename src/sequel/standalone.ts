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
