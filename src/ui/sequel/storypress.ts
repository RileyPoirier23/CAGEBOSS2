/**
 * Tales of Legacy's press day, on screen like Promoter Mode's: the folding table, Dane and the
 * chapter's fighter behind it, a reporter in the back row. Three questions; each answer is Dane
 * saying it and the room reacting, and the last shot is what the papers ran.
 */
import type { Game } from '../app';
import { CAST, type Actor, type Line } from '../cutscene';
import { playCine } from './cine';
import { applyPressAnswer, buildOneTon, cornerFighter, cornerName, finishPressDay, pressQuestions, STORY_CHAPTERS } from '../../sequel/story';
import type { StorySave } from '../../sequel/types';

/** "THE FIRE EXITS ARE A METAPHOR." -> "The fire exits are a metaphor." (names keep their capitals) */
const NAMES = ['Zenith', 'Dane', 'Ray', 'Han', 'Mateo', 'Verity', 'Kane', 'Xavier', 'Moncton', 'CBFC', 'Spadam', 'Cuchillo', 'Mexican', 'Mexico', 'Gordon', 'Tyler', 'I'];
export function speakable(label: string): string {
  let s = label.toLowerCase().replace(/(^|[.!?]\s+)([a-z])/g, (_m, p: string, c: string) => p + c.toUpperCase());
  for (const n of NAMES) s = s.replace(new RegExp(`\\b${n.toLowerCase()}\\b`, 'g'), n);
  return s.replace(/\b1ton\b/gi, '1ton');
}

export function playStoryPress(g: Game, save: StorySave, after: () => void): void {
  const qs = pressQuestions(save);
  const signed = STORY_CHAPTERS.findIndex((c) => c.id === 'the_signing');
  const early = save.chapter < signed;
  const f = early ? buildOneTon(save) : cornerFighter(save);
  const fid = early ? 'oneton' : cornerName(save).toLowerCase();
  const cast: Actor[] = [
    { id: 'dane', look: CAST.dane, name: 'DANE WHYTE', x: 110, facing: 1 },
    { id: fid, fighter: f, clothes: { top: 0x1a1a22, bottom: 0x22222a }, name: early ? '1TON' : cornerName(save), x: 210, facing: 1, scale: 1.2 },
    { id: 'reporter', look: CAST.reporter, name: 'THE DAILY CLINCH', x: 400, facing: -1, enter: 'right' },
  ];
  const ran: string[] = [];
  const ask = (i: number) => {
    if (i >= qs.length) {
      finishPressDay(save);
      const paid = 1200 + save.brand * 12;
      const lines: Line[] = [
        { who: null, text: `The next morning. What they ran: ${ran.join(' ')}` },
        { who: null, text: `Brand ${save.brand}. Trust ${save.trust}. Heat ${save.heat}. The paperwork paid $${paid.toLocaleString('en-US')}. The quotes cost more.` },
      ];
      playCine(g, { film: true, shots: [{ bg: 'presser', cast: cast.map((a) => ({ ...a, enter: undefined })), lines, caption: 'THE DAY AFTER' }] }, () => after());
      return;
    }
    const q = qs[i];
    const lines: Line[] = [
      ...(i === 0 ? [{ who: null, text: 'Press day. One folding table, two microphones, and a room that isn\'t your friend.', sfx: 'click' as const }] : []),
      { who: 'reporter', text: q.q.replace(/^"|"$/g, '') },
    ];
    playCine(g, {
      film: true,
      shots: [{ bg: 'presser', caption: i === 0 ? `PRESS DAY  /  QUESTION 1 OF ${qs.length}` : `QUESTION ${i + 1} OF ${qs.length}`, cast: cast.map((a) => (i ? { ...a, enter: undefined } : a)), lines }],
      choices: q.options.map((o) => ({
        id: o.id,
        label: o.label,
        reply: [
          { who: 'dane', text: speakable(o.label) },
          { who: null, text: o.reply, flash: o.heat >= 3, sfx: o.heat >= 3 ? ('crowd' as const) : undefined },
        ],
      })),
    }, (choice) => {
      const o = q.options.find((x) => x.id === choice) ?? q.options[0];
      applyPressAnswer(save, o);
      ran.push(o.reply);
      ask(i + 1);
    });
  };
  ask(0);
}
