/**
 * CAGE BOSS II's demo, played from inside CAGE BOSS: the sequel's look while you're in it, the
 * first game's look back when you leave. The full game is its own exe (sequel.html).
 */
import type { Game } from '../app';
import { setUiTheme } from '../theme';
import { setLoadingScreen, LoadingScreen } from '../loading';
import { setTextExpander } from '../text';
import { setSequelDemo } from '../../sequel/standalone';
import { LoadingScreenII } from './loading2';
import { openReadMore } from './readmore';
import { alertBox } from '../widgets';

export function enterSequelDemo(g: Game): void {
  setSequelDemo(true);
  setUiTheme('ii');
  setLoadingScreen((label) => new LoadingScreenII(label));
  setTextExpander((full) => openReadMore(g, full));
  g.loading('Opening the warehouse (demo)', () => {
    void import('../scenes/sequel').then((m) => g.goto(new m.SequelTitleScene(g)));
  }, 1.2);
}

export function exitSequelDemo(g: Game): void {
  setSequelDemo(false);
  setUiTheme('classic');
  setLoadingScreen((label) => new LoadingScreen(label));
  setTextExpander(null);
  void import('../scenes/title').then((m) => g.goto(new m.TitleScene(g)));
}

/** The end of the demo: a poster, then back to the sequel's title. */
export function demoOver(g: Game, what: string, then: () => void): void {
  alertBox(g, 'END OF THE DEMO', `${what} CAGE BOSS II: THE BUYBACK is its own game: ten chapters (and a secret one), Han Tibular, Mateo, the forty-week buyback. Your demo save carries over.`, then);
}
