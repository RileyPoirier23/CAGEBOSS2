/**
 * The look of the shared UI kit. CAGE BOSS uses 'classic'. CAGE BOSS II boots with 'ii'
 * (src/sequel-main.ts): the same pixel kit, re-dressed for the warehouse at night —
 * chamfered steel buttons with a coloured edge, glass panels, a striped title bar,
 * its own loading screen. Every button(), box({ bevel }) and openWindow() follows it.
 */
import { lerpColor, shade } from '../art/palette';

export type UiTheme = 'classic' | 'ii';

let current: UiTheme = 'classic';

export function setUiTheme(t: UiTheme): void {
  current = t;
}

export function uiTheme(): UiTheme {
  return current;
}

export const isII = (): boolean => current === 'ii';

/** CAGE BOSS II colours: sodium light on wet concrete, and the blood is real. */
export const II = {
  night: 0x09070c,
  panel: 0x141119,
  panelHi: 0x1f1a26,
  steel: 0x2a2632,
  edge: 0x3c3646,
  sodium: 0xf0a03a,
  gold: 0xe8c060,
  blood: 0xc4202c,
  bone: 0xece2cc,
  ash: 0x9a92a2,
  neon: 0x4ad0e0,
};

/** A button's body under the II theme: dark steel, tinted toward its colour. */
export function iiBody(fill: number, hover: boolean, disabled: boolean): number {
  const base = lerpColor(II.panel, fill, disabled ? 0.12 : hover ? 0.55 : 0.32);
  return disabled ? shade(base, -0.2) : base;
}

/** The outline of a chamfered rectangle (corners cut by `c` px). */
export function chamfer(w: number, h: number, c = 2): number[] {
  return [c, 0, w, 0, w, h - c, w - c, h, 0, h, 0, c];
}
