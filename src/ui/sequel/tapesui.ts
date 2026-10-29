/**
 * The LEGACY TAPES shelf: VHS boxes, a label, a blurb, what unlocks them. Play a tape and its steps
 * run in order (scenes in CINE II, fights hands-on in the right room); it remembers where you got to.
 * A fight has to be won to roll the tape on. Lose and you can run it back.
 */
import { Container, Graphics } from 'pixi.js';
import type { Game } from '../app';
import { W, H, text, button } from '../kit';
import { alertBox, confirm } from '../widgets';
import { sfx } from '../../audio/sfx';
import { II } from '../theme';
import { CAST, type Actor } from '../cutscene';
import { playCine } from './cine';
import { openLiveFight } from '../livefight';
import { storyVenue, venueCrowd } from './venues';
import { TAPES, setTapeStep, tapeFighter, tapeProgress, tapeUnlocked, type Tape, type TapeActor } from '../../sequel/tapes';
import { loadStoryTrophy } from '../../sequel/storysession';
import type { Bout } from '../../core/types';
import type { Pose } from '../rig';

export function openTapes(g: Game): void {
  const root = new Container();
  const wrap = g.modal(root, { dim: 0.85, closeOnDim: true });
  const finished = loadStoryTrophy().playthroughs > 0;
  const prog = tapeProgress();
  root.addChild(new Graphics().rect(30, 26, W - 60, H - 52).fill({ color: 0x1a1210, alpha: 0.98 }).rect(30, 26, W - 60, H - 52).stroke({ color: II.edge, width: 1 }));
  root.addChild(text('LEGACY TAPES', 42, 34, { scale: 2, color: II.gold }));
  root.addChild(text('Side stories on VHS. Ray\'s notebook unlocks them.', 42, 52, { small: true, color: II.ash }));
  // NEW GAME+ isn't a tape on the shelf: it gets its own banner
  const kid = TAPES.find((t) => t.id === 'kid');
  if (kid && tapeUnlocked(kid, finished)) {
    const at = prog[kid.id] ?? 0;
    root.addChild(button(at >= kid.steps.length ? 'NEW GAME+: PLAY AGAIN' : at ? `NEW GAME+: RESUME ${at}/${kid.steps.length}` : 'NEW GAME+: THE KID AT THE DOOR', W - 200, 32, 160, 14, () => {
      g.closeModal(wrap);
      if (at >= kid.steps.length) setTapeStep(kid.id, 0);
      runTape(g, kid);
    }, { small: true, fill: II.blood, border: II.gold }));
  }
  TAPES.filter((t) => t.id !== 'kid').forEach((t, i) => {
    // five boxes across the shelf
    const x = 36 + i * 82;
    const y = 66;
    const open = tapeUnlocked(t, finished);
    const step = prog[t.id] ?? 0;
    const done = step >= t.steps.length;
    // the VHS box
    const box = new Graphics();
    box.rect(x, y, 78, 140).fill(open ? 0x0c0a0e : 0x262028).stroke({ color: open ? II.sodium : II.edge, width: 1 });
    box.rect(x + 5, y + 8, 68, 70).fill(open ? [0x8a1a1a, 0x5a3a1a, 0x2a3a6a, 0x1e5a3a, 0x7a6a3a][i % 5] : 0x1a161e);
    box.rect(x + 5, y + 82, 68, 2).fill(open ? II.gold : II.edge);
    root.addChild(box);
    root.addChild(text(t.label, x + 6, y + 12, { small: true, color: open ? II.bone : II.ash }));
    root.addChild(text(open ? t.title : '???', x + 6, y + 24, { width: 66, color: open ? II.gold : II.ash, maxLines: 4 }));
    root.addChild(text(open ? t.blurb : `LOCKED. ${t.unlock}`, x + 4, y + 88, { width: 72, small: true, color: II.ash, maxLines: 6 }));
    if (open) root.addChild(button(done ? 'WATCH AGAIN' : step ? `RESUME ${step}/${t.steps.length}` : 'PLAY', x + 4, y + 146, 70, 14, () => {
      g.closeModal(wrap);
      if (done) setTapeStep(t.id, 0);
      runTape(g, t);
    }, { small: true, fill: II.blood, border: II.sodium }));
  });
  root.addChild(button('CLOSE', W / 2 - 30, H - 44, 60, 14, () => g.closeModal(wrap), { small: true, fill: II.steel }));
}

const actor = (a: TapeActor): Actor => a.fighter
  ? { id: a.who, fighter: tapeFighter(a.fighter), name: a.name, x: a.x, facing: a.facing, pose: a.pose as Pose | undefined }
  : { id: a.who, look: CAST[a.who as keyof typeof CAST] ?? CAST.dane, name: a.name, x: a.x, facing: a.facing, pose: a.pose as Pose | undefined };

/** Play a tape from wherever it was left. */
export function runTape(g: Game, t: Tape): void {
  const i = tapeProgress()[t.id] ?? 0;
  const s = t.steps[i];
  if (!s) {
    sfx('roar');
    alertBox(g, `${t.title}: THE END`, 'The tape runs out. The VCR clicks. Somewhere, Ray is making soup.');
    return;
  }
  const next = () => {
    setTapeStep(t.id, i + 1);
    runTape(g, t);
  };
  if (s.kind === 'scene') {
    playCine(g, { title: i === 0 ? t.title : undefined, film: true, shots: [{ bg: s.bg, flashback: s.flashback, caption: s.title, cast: s.cast.map(actor), lines: s.lines }] }, () => next());
    return;
  }
  const A = tapeFighter(s.player);
  const B = tapeFighter(s.opponent);
  const where = storyVenue(s.venue);
  playCine(g, { title: s.title, film: true, shots: [{ bg: 'cage', caption: s.venue, cast: [{ id: 'a', fighter: A, name: `${A.first} ${A.last}`.toUpperCase(), x: 190, facing: 1 }, { id: 'b', fighter: B, name: `${B.first} ${B.last}`.toUpperCase(), x: 290, facing: -1 }], lines: [{ who: null, text: s.stakes }] }] }, () => {
    const bout = { id: `tape_${t.id}_${i}`, a: A.id, b: B.id, division: A.division, title: null, rounds: s.rounds, position: 0, catchweight: false, shortNotice: false, status: 'scheduled', purse: [0, 0] } as unknown as Bout;
    openLiveFight(g, {
      bout, A, B, skills: [A.skills, B.skills], player: 0, plan: 'balanced', oppPlan: 'balanced', cutTier: 2, seed: (i * 7919 + t.id.length * 131) >>> 0,
      event: s.venue, judges: ['Marla Cross', 'Dexter Bell', 'Lenny Pratt'], referee: s.referee ?? where.referee, refLook: s.referee ? undefined : where.refLook, canvas: where.canvas, bare: where.bare,
      // Mexico came to see Alberto
      crowd: s.player === 'alberto' ? { home: 0, chants: ['DEL BUR-RI-TO', B.last.toUpperCase()], signs: ['DEL BURRITO!', 'EL CAMPEON', 'PERDON ABUELA', 'BIENVENIDO', 'ALBERTO #1'] } : venueCrowd(where),
      done: (r) => {
        if (r.winner === A.id) {
          sfx('roar');
          return next();
        }
        confirm(g, `${s.title}: the tape stops here. Run it back?`, () => runTape(g, t), 'RUN IT BACK', 'LATER');
      },
    });
  });
}
