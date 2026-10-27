/**
 * The booth: Juiced Butler and Sandwich Cormier on the radio, once a week in both modes, talking
 * about what you did (src/sequel/radio.ts writes it). SKIP works like any scene.
 */
import type { Game } from '../app';
import type { Look2 } from '../rig';
import { playCine } from './cine';
import type { RadioLine } from '../../sequel/radio';

// the legend: silver hair slicked back, black tux, bow tie, built like a fridge (the arena's Butler)
const BUTLER: Look2 = {
  skin: 0xc98d5e, hairStyle: 2, hairColor: 0xc8c4bc, beard: 0, build: 3, trunks: 0x111111, trim: 0x111111, glove: 0xc98d5e,
  stance: 'upright', female: false, tattoo: 0, brows: 1,
  outfit: { top: 0x101014, bottom: 0x101014, shirt: 0xf6f3ea, tie: 0x0a0a0c, bulk: 4, mic: true },
};
// Sandwich: a big man in a short-sleeved shirt, a napkin tucked in, always mid-wing
const SANDWICH: Look2 = {
  skin: 0xe0b090, hairStyle: 1, hairColor: 0x3a2a1a, beard: 2, build: 3, trunks: 0x222222, trim: 0x222222, glove: 0xe0b090,
  stance: 'upright', female: false, tattoo: 0,
  outfit: { top: 0xc8a040, bottom: 0x2a2a30, shirt: 0xf0ece0, bulk: 4, shortSleeves: true, mic: true },
};

export function playRadio(g: Game, lines: RadioLine[], title: string, after: () => void): void {
  playCine(g, {
    film: true,
    shots: [{
      bg: 'booth',
      caption: title,
      cast: [
        { id: 'butler', look: BUTLER, name: 'JUICED BUTLER', x: 170, facing: 1 },
        { id: 'sandwich', look: SANDWICH, name: 'SANDWICH CORMIER', x: 300, facing: -1 },
      ],
      lines: [{ who: null, text: 'ON AIR. A red light, two microphones, a plate of wings that is not going to survive the segment.', sfx: 'click' }, ...lines],
    }],
  }, () => after());
}
