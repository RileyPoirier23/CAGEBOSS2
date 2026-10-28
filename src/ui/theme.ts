/**
 * The look of the shared UI kit. CAGE BOSS uses 'classic'. CAGE BOSS II boots with 'ii'
 * (src/sequel-main.ts): the same pixel kit, re-dressed for the warehouse at night —
 * chamfered steel buttons with a coloured edge, glass panels, a striped title bar,
 * its own loading screen. Every button(), box({ bevel }) and openWindow() follows it.
 */
import { lerpColor, shade, PAL as BASE_PAL } from '../art/palette';

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

/**
 * The first game's palette, re-graded for CAGE BOSS II: the same names, so a screen can be
 * moved over by changing one import, but the inks are the warehouse at night and the paper
 * is still paper (the desk has to be readable). Sequel screens use this; game one keeps
 * the original.
 */
export const PAL: typeof BASE_PAL = {
  ...BASE_PAL,
  ink: 0x120f16,
  night: 0x1b1620,
  shadow: 0x2b2533,
  slate: 0x3d3646,
  grey: 0x6f6678,
  ash: 0x9a92a2,
  fog: 0xc9c0cc,
  bone: 0xece2cc,
  paper: 0xd8ccb2,
  paperDark: 0xb5a78c,
  wood: 0x4a3328,
  woodDark: 0x32231c,
  woodLight: 0x6a4a37,
  rust: 0xb04a34,
  blood: 0xc4202c,
  ember: 0xd07a34,
  gold: 0xe8c060,
  olive: 0x7a8248,
  moss: 0x4e7a4a,
  teal: 0x4ad0e0,
  steel: 0x4a5a70,
  sky: 0x86a6c0,
  plum: 0x7a4c86,
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
