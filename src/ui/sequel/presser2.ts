/**
 * The Thursday presser, on screen: the folding table, the two fighters, Dane at the end of it,
 * the question from the back row and three answers. Played with the sequel's cutscene player.
 */
import type { Game } from '../app';
import { CAST, type Actor, type Cutscene } from '../cutscene';
import { playCine } from './cine';
import { applyPresser, type PresserCard } from '../../sequel/presser';
import type { SeqRun } from '../../sequel/types';

const ASKER: Record<PresserCard['question']['asker'], { id: string; name: string }> = {
  oneton: { id: 'oneton', name: '1TON' },
  plant: { id: 'reporter', name: 'BRYNN (INDEPENDENT, ALLEGEDLY)' },
  local: { id: 'reporter', name: 'THE DAILY CLINCH' },
};

export function playPresser(g: Game, run: SeqRun, card: PresserCard, done: () => void): void {
  const ask = ASKER[card.question.asker];
  const cast: Actor[] = [
    { id: 'dane', look: CAST.dane, name: 'DANE WHYTE', x: 90, facing: 1 },
    { id: 'a', fighter: card.A, clothes: { top: 0x1a1a22, bottom: 0x22222a }, name: `${card.A.first} ${card.A.last}`.toUpperCase(), x: 200, facing: 1, scale: 1.2 },
    { id: 'b', fighter: card.B, clothes: { top: 0x3a1418, bottom: 0x22222a }, name: `${card.B.first} ${card.B.last}`.toUpperCase(), x: 300, facing: -1, scale: 1.2 },
    { id: ask.id, look: CAST[ask.id as keyof typeof CAST], name: ask.name, x: 420, facing: -1, enter: 'right' },
  ];
  const scene: Cutscene = {
    film: true,
    shots: [{
      bg: 'presser',
      caption: `THURSDAY PRESS CONFERENCE  /  WEEK ${card.week}`,
      cast,
      lines: [
        { who: 'dane', text: card.title
          ? `Thanks for coming. Saturday: ${card.A.last} defends the ${card.A.division.toUpperCase()} belt against ${card.B.last}. Questions.`
          : `Thanks for coming. Saturday, main event: ${card.A.last} against ${card.B.last}. Questions. Keep them short.`, sfx: 'click' },
        { who: ask.id, text: card.question.text },
      ],
    }],
    choices: [...card.question.answers.map((a) => ({ id: a.id, label: a.label })), { id: 'skip', label: 'Say nothing. End the presser.' }],
  };
  playCine(g, scene, (choice) => {
    const pick = choice && choice !== 'skip' ? choice : null;
    const result = applyPresser(run, card, pick);
    const ans = card.question.answers.find((x) => x.id === pick);
    if (!ans) return done();
    playCine(g, {
      film: true,
      shots: [{ bg: 'presser', cast, lines: [{ who: null, text: ans.says, flash: true, sfx: 'crowd' }, { who: null, text: result }] }],
    }, () => done());
  });
}
