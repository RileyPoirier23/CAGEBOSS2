/**
 * CAGE BOSS II's tutorial: the first game's lesson cards, re-done for the sequel. The first time you
 * reach a screen, its lesson opens (a few pages, BACK / NEXT / GOT IT); you never see it twice
 * unless you replay them from HOW TO PLAY. Seen lessons live in their own key (cageboss2.tutorial).
 */
import { Container, Graphics } from 'pixi.js';
import type { Game } from '../app';
import { W, H, text, button } from '../kit';
import { loadJSON, storeJSON } from '../../core/save';
import { isTouchDevice } from '../../core/platform';
import { sfx } from '../../audio/sfx';
import { II } from '../theme';

interface Page { title: string; pc: string; phone?: string }
interface Lesson2 { key: string; title: string; pages: Page[] }

const LESSONS: Lesson2[] = [
  { key: 'modes', title: 'WELCOME TO THE WAREHOUSE', pages: [
    { title: 'THREE DOORS', pc: 'PROMOTER MODE: you\'re the promoter. Forty Saturdays to buy the company back. TALES OF LEGACY: fifteen chapters at Ray\'s Boxing & Soup, with hands-on fights. QUICK FIGHT: pick two fighters and go.' },
    { title: 'SAVES', pc: 'Every mode keeps as many named saves as you want. CONTINUE on the title plays the one you touched last. SANDBOX saves are marked in the list: no trophies, no pressure.' },
    { title: 'READ IT ALL', pc: 'Any text that ends in "..." can be clicked to read in full. Nobody misses anything here.', phone: 'Any text that ends in "..." can be tapped to read in full. Nobody misses anything here.' },
  ] },
  { key: 'promoter', title: 'PROMOTER MODE', pages: [
    { title: 'THE WEEK', pc: 'Every week: clear the DESK (the paperwork), book up to three fights, pick a room, a stunt and an ad spend, then RUN THE SHOW. The money, the buzz, the heat and the locker room all move.' },
    { title: 'THE FOUR NUMBERS', pc: 'CASH pays for everything (below zero and it\'s over). BUZZ fills the seats and fades. HEAT brings the commission (at 100, the van). LOCKER is how your fighters feel about you.' },
    { title: 'THE PHONE', pc: 'PHONE (bottom right): one call a week, one post a week on Bleeter, and the plug in your DMs. The plug is cheap. The plug is never free.' },
    { title: 'THE BUYBACK', pc: 'Hit the buyback number in cash and buzz by week forty and the company is yours again. Every Zenith clause you sign makes it more expensive.' },
  ] },
  { key: 'desk', title: 'THE DESK', pages: [
    { title: 'PAPERS, PLEASE', pc: 'Every paper has fields. Click a field, then the record it has to match (the file, the licence, the rulebook). A red string means somebody has been at it with a photocopier.', phone: 'Every paper has fields. Tap a field, then the record it has to match (the file, the licence, the rulebook). A red string means somebody has been at it with a photocopier.' },
    { title: 'THE STAMPS', pc: 'APPROVE good paper, DENY forged paper. ESCALATE the ones above your pay grade, BURY the ones you can afford to lose (it costs heat). ASK the person in front of you: they lie, but differently.' },
  ] },
  { key: 'show', title: 'THE SHOW', pages: [
    { title: 'THE PRESSER', pc: 'Thursday, before every show: one question from the back row, three answers. Your answer moves the buzz, the heat and the locker room.' },
    { title: 'WATCH', pc: 'After the show, press WATCH on any bout to see it in the cage, with the booth calling it. 1X, 2X, 4X, or skip to the end.' },
  ] },
  { key: 'legacy', title: 'TALES OF LEGACY', pages: [
    { title: 'THE WEEK', pc: 'Seven days a week. TRAIN (1, 2 or 3 days), SPAR (2 days), MEDIA, DINNER, PRESS, the UNDERCARD: each takes days. END WEEK when you\'re done. Fight week ends when the fight does.' },
    { title: 'THE PARTS', pc: 'Every chapter is ten weeks in five parts. Each part opens with its own scene. The fights are booked on their weeks: NEXT tells you when.' },
    { title: 'TALK', pc: 'TALK glows until you have used it. The story won\'t move on without it. Every answer has its own reply, so pick the one you mean.' },
  ] },
  { key: 'training', title: 'THE CAMP', pages: [
    { title: 'TIERS', pc: 'LIGHT is one day, FULL two, CAMP three. Bigger sessions, more xp, more fatigue. Thirty xp is a level; ten levels a track.' },
    { title: 'GRADES', pc: 'PLAY the drill and your score sets the grade, S to F. SIM it and it goes down as 65%: a C. Hit the calls as they cross the line: J K L (or 1 2 3, or the pad buttons).', phone: 'PLAY the drill and your score sets the grade, S to F. SIM it and it goes down as 65%: a C. Tap the lanes as the calls cross the line.' },
  ] },
  { key: 'spar', title: 'SPARRING AT RAY\'S', pages: [
    { title: 'ONE ROUND', pc: 'One hard round in Ray\'s ring, Uncle Ray refereeing. It works striking, grappling and cardio at once. Play it, or sim it for a C.' },
    { title: 'NEW MOVES', pc: 'A B or better in sparring and Ray shows you something new: the superman punch, his Butch hook, the flying knee, the calf kick, the spinning elbow. They replace an input you already know.' },
  ] },
  { key: 'quick', title: 'QUICK FIGHT', pages: [
    { title: 'PICK TWO', pc: 'A/D picks the red corner, LEFT/RIGHT the blue. Choose the division, the room, the rounds and CPU or two players. READY, and they square up.', phone: 'Tap the portraits to pick each corner. Choose the division, the room, the rounds and CPU or two players. READY, and they square up.' },
  ] },
];

const KEY = 'cageboss2.tutorial';
const seen = (): Record<string, boolean> => loadJSON<Record<string, boolean>>(KEY, {});

/** The lesson for this screen, the first time. `after` runs when it's closed (or straight away). */
export function maybeLesson2(g: Game, key: string, after?: () => void): void {
  const s = seen();
  const l = LESSONS.find((x) => x.key === key);
  if (!l || s[key]) return after?.();
  setTimeout(() => {
    if (g.modals.length) return after?.(); // something else is up; next visit
    s[key] = true;
    storeJSON(KEY, s);
    showLesson(g, l, after);
  }, 450);
}

export function replayTutorial2(): void {
  storeJSON(KEY, {});
}

function showLesson(g: Game, l: Lesson2, after?: () => void): void {
  const touch = isTouchDevice();
  const root = new Container();
  const wrap = g.modal(root, { dim: 0.7 });
  let i = 0;
  const bw = 300;
  const bh = 138;
  const x0 = Math.round((W - bw) / 2);
  const y0 = Math.round((H - bh) / 2);
  const draw = () => {
    root.removeChildren().forEach((c) => c.destroy({ children: true }));
    const p = l.pages[i];
    root.addChild(new Graphics().rect(x0, y0, bw, bh).fill({ color: II.panel, alpha: 0.98 }).rect(x0, y0, bw, bh).stroke({ color: II.sodium, width: 1 }).rect(x0, y0, bw, 14).fill(II.night).rect(x0, y0 + 13, bw, 1).fill(II.blood).rect(x0, y0, 3, bh).fill(II.sodium));
    root.addChild(text(`${l.title}  /  ${i + 1} OF ${l.pages.length}`, x0 + 8, y0 + 4, { small: true, color: II.gold }));
    root.addChild(text(p.title, x0 + 10, y0 + 22, { color: II.bone }));
    root.addChild(text(touch && p.phone ? p.phone : p.pc, x0 + 10, y0 + 36, { width: bw - 20, small: true, color: II.bone, maxLines: 9 }));
    if (i > 0) root.addChild(button('< BACK', x0 + 10, y0 + bh - 20, 54, 14, () => { i--; sfx('click'); draw(); }, { small: true, fill: II.steel }));
    const last = i === l.pages.length - 1;
    root.addChild(button(last ? 'GOT IT' : 'NEXT >', x0 + bw - 74, y0 + bh - 20, 64, 14, () => {
      sfx('click');
      if (last) {
        g.closeModal(wrap);
        after?.();
      } else {
        i++;
        draw();
      }
    }, { small: true, fill: II.blood, border: II.sodium }));
  };
  draw();
}
