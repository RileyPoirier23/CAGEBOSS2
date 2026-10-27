/**
 * Ray's notebook, open on the table: two pages at a time on cream paper, his handwriting (the pixel
 * font, slightly crooked), a hint where a page is still blank. A full book: RAY, 1987.
 */
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { photos } from '../../sequel/photos';
import type { Game } from '../app';
import { W, H, text, button } from '../kit';
import { sfx } from '../../audio/sfx';
import { II } from '../theme';
import { PAGES, notebookComplete, notebookPages } from '../../sequel/notebook';
import { buildButch1987, buildRay1987 } from '../../sequel/story';
import { openLiveFight } from '../livefight';
import { storyVenue } from './venues';
import { playCine } from './cine';
import { alertBox } from '../widgets';
import type { Bout } from '../../core/types';

export function openNotebook(g: Game): void {
  const root = new Container();
  const wrap = g.modal(root, { dim: 0.8, closeOnDim: true });
  let spread = 0;
  const have = new Set(notebookPages());
  const draw = () => {
    root.removeChildren().forEach((c) => c.destroy({ children: true }));
    const x0 = Math.round((W - 420) / 2);
    const y0 = Math.round((H - 220) / 2);
    const book = new Graphics();
    book.rect(x0 - 6, y0 - 6, 432, 232).fill(0x3a2014); // the cover
    for (const side of [0, 1]) {
      const px = x0 + side * 212;
      book.rect(px, y0, 208, 220).fill(0xe8dcc0);
      for (let y = y0 + 22; y < y0 + 214; y += 9) book.rect(px + 8, y, 192, 1).fill({ color: 0x7a8aa8, alpha: 0.35 }); // ruled lines
      book.rect(px + 22, y0, 1, 220).fill({ color: 0xc84a4a, alpha: 0.4 }); // the margin
    }
    book.rect(x0 + 208, y0, 4, 220).fill(0x2a160e); // the spine
    root.addChild(book);
    root.addChild(text(`RAY'S NOTEBOOK  /  ${have.size} OF ${PAGES.length} PAGES`, x0, y0 - 16, { small: true, color: II.gold }));
    for (const side of [0, 1]) {
      const p = PAGES[spread * 2 + side];
      if (!p) continue;
      const px = x0 + side * 212 + 28;
      const got = have.has(p.id);
      const t = text(got ? p.title : '???', px, y0 + 8, { color: got ? 0x2a2a6a : 0x8a8478 });
      t.rotation = -0.012;
      root.addChild(t);
      const body = text(got ? p.text : `(This page is blank. ${p.hint})`, px, y0 + 24, { width: 172, small: true, color: got ? 0x1a2a5a : 0x8a8478, maxLines: 20, noExpand: true });
      body.rotation = -0.008;
      root.addChild(body);
      root.addChild(text(String(spread * 2 + side + 1), x0 + side * 212 + 190, y0 + 206, { small: true, color: 0x8a8478 }));
    }
    const spreads = Math.ceil(PAGES.length / 2);
    if (spread > 0) root.addChild(button('<', x0 - 4, y0 + 230, 20, 14, () => { spread--; sfx('paper'); draw(); }, { small: true, fill: II.steel }));
    if (spread < spreads - 1) root.addChild(button('>', x0 + 410, y0 + 230, 20, 14, () => { spread++; sfx('paper'); draw(); }, { small: true, fill: II.steel }));
    root.addChild(button('CLOSE', x0 + 186, y0 + 230, 60, 14, () => g.closeModal(wrap), { small: true, fill: II.steel }));
    const pics = photos().length;
    root.addChild(button(`PHOTOS (${pics})`, x0 + 30, y0 + 230, 80, 14, () => openPhotoAlbum(g), { small: true, fill: pics ? II.blood : II.steel, border: pics ? II.gold : undefined }));
    if (notebookComplete()) root.addChild(button('PLAY: RAY, 1987', x0 + 260, y0 + 230, 130, 14, () => { g.closeModal(wrap); playRay1987(g); }, { small: true, fill: II.blood, border: II.sodium }));
  };
  draw();
}

/** The album taped in the back of the notebook: four photos to a page, a caption under each. */
export function openPhotoAlbum(g: Game): void {
  const root = new Container();
  const wrap = g.modal(root, { dim: 0.85, closeOnDim: true });
  const all = photos();
  let page = 0;
  const draw = () => {
    root.removeChildren().forEach((c) => c.destroy({ children: true }));
    const x0 = Math.round((W - 420) / 2);
    const y0 = Math.round((H - 228) / 2);
    root.addChild(new Graphics().rect(x0 - 6, y0 - 6, 432, 240).fill(0x3a2014).rect(x0, y0, 420, 228).fill(0x2a2420));
    root.addChild(text(`THE BACK OF THE NOTEBOOK  /  ${all.length} PHOTO${all.length === 1 ? '' : 'S'}`, x0, y0 - 16, { small: true, color: II.gold }));
    if (!all.length) root.addChild(text('Nothing taped in yet. Somebody always takes a photo at the big moments. Keep going.', x0 + 20, y0 + 100, { width: 380, small: true, color: II.ash, align: 'center' }));
    all.slice(page * 4, page * 4 + 4).forEach((p, i) => {
      const px = x0 + 14 + (i % 2) * 204;
      const py = y0 + 8 + Math.floor(i / 2) * 110;
      const tilt = (i % 2 ? 0.02 : -0.018) + (i > 1 ? 0.01 : 0);
      const frame = new Container();
      frame.position.set(px + 96, py + 48);
      frame.rotation = tilt;
      frame.addChild(new Graphics().rect(-96, -48, 192, 100).fill(0xf0ece0).rect(-30, -52, 24, 8).fill({ color: 0xe8dcb0, alpha: 0.8 }).rect(20, -52, 24, 8).fill({ color: 0xe8dcb0, alpha: 0.8 }));
      root.addChild(frame);
      const img = new Image();
      img.onload = () => {
        if (frame.destroyed) return;
        const sp = new Sprite(Texture.from(img));
        sp.width = 184;
        sp.height = 82;
        sp.position.set(-92, -44);
        frame.addChildAt(sp, 1);
      };
      img.src = p.data;
      frame.addChild(text(p.title, -92, 40, { small: true, color: 0x1a2a5a, width: 184, align: 'center' }));
    });
    const pages = Math.max(1, Math.ceil(all.length / 4));
    if (page > 0) root.addChild(button('<', x0 - 4, y0 + 236, 20, 14, () => { page--; draw(); }, { small: true, fill: II.steel }));
    if (page < pages - 1) root.addChild(button('>', x0 + 404, y0 + 236, 20, 14, () => { page++; draw(); }, { small: true, fill: II.steel }));
    root.addChild(button('CLOSE', x0 + 180, y0 + 236, 60, 14, () => g.closeModal(wrap), { small: true, fill: II.steel }));
  };
  draw();
}

/** The notebook's reward: the Golden Gloves final, Moncton Coliseum, 1987. You are Ray. */
export function playRay1987(g: Game): void {
  const ray = buildRay1987();
  const butch = buildButch1987();
  playCine(g, {
    title: 'RAY, 1987',
    film: true,
    shots: [{ bg: 'cage', flashback: true, caption: 'MONCTON COLISEUM  /  GOLDEN GLOVES FINAL  /  1987', cast: [
      { id: 'ray87', fighter: ray, name: 'RAY', x: 180, facing: 1 }, { id: 'butch', fighter: butch, name: 'BUTCH', x: 300, facing: -1 },
    ], lines: [
      { who: null, text: 'Three thousand people. A thirty-three-year-old electrician with a right hand, and a wife in the third row with a voice like a fire alarm.' },
      { who: 'butch', text: 'Nice moustache, old man.' },
      { who: 'ray87', text: 'Nice haircut. Is there a cat in it?' },
      { who: null, text: 'Somewhere in the third row, Marie laughs louder than anybody has ever laughed at a boxing match.' },
    ] }],
  }, () => {
    const where = storyVenue("RAY'S BOXING & SOUP");
    const bout = { id: 'ray_1987', a: ray.id, b: butch.id, division: 'middle', title: null, rounds: 3, position: 0, catchweight: false, shortNotice: false, status: 'scheduled', purse: [0, 0] } as unknown as Bout;
    openLiveFight(g, {
      bout, A: ray, B: butch, skills: [ray.skills, butch.skills], player: 0, plan: 'pressure', oppPlan: 'counter', cutTier: 2, seed: 1987,
      event: 'GOLDEN GLOVES FINAL  /  1987', judges: ['A man called Lou', 'Mrs. Leblanc', 'A priest'], referee: 'Father Doucet',
      canvas: { ...where.canvas, room: 'hall', logo: 'GOLDEN GLOVES 1987' },
      crowd: { home: 0, chants: ['RAY', 'BUTCH'], signs: ['RAY!', 'MONCTON', 'BUTCH!', 'GOLDEN GLOVES', 'GO RAY'] },
      done: (r) => {
        const won = r.winner === ray.id;
        alertBox(g, won ? 'RAY WINS' : 'BUTCH WINS', won
          ? 'You beat Butch. In the notebook it still says he lost on the cards. Ray never told the story the other way. Marie met him at the bus with soup either way.'
          : 'Butch wins, the way he always did. Marie meets Ray at the bus with two bowls of soup. Six months later they open a gym.');
      },
    });
  });
}
