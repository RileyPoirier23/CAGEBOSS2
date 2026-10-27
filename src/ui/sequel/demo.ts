/**
 * CAGE BOSS II's demo, played from inside CAGE BOSS: straight into the TALES OF LEGACY prologue,
 * through chapter two, then four weeks of PROMOTER MODE, then a poster for the full game and back
 * to the first game's street. Its saves live apart from the full game's (slots namespace
 * 'cageboss2demo'), and it never touches the trophy case.
 */
import type { Game } from '../app';
import { setUiTheme } from '../theme';
import { setLoadingScreen, LoadingScreen } from '../loading';
import { setTextExpander } from '../text';
import { setSequelDemo } from '../../sequel/standalone';
import { setSlotNamespace, listSlots, deleteSlot, newSlot } from '../../sequel/slots';
import { forgetRun, writeRun } from '../../sequel/session';
import { forgetStory, writeStory } from '../../sequel/storysession';
import { newSequelRun } from '../../sequel/model';
import { newStorySave } from '../../sequel/story';
import { LoadingScreenII } from './loading2';
import { openReadMore } from './readmore';
import { alertBox } from '../widgets';

export function enterSequelDemo(g: Game): void {
  setSequelDemo(true);
  setSlotNamespace('cageboss2demo');
  // every demo starts fresh
  for (const k of ['run', 'story'] as const) for (const s of listSlots(k)) deleteSlot(k, s.id);
  forgetRun();
  forgetStory();
  setUiTheme('ii');
  setLoadingScreen((label) => new LoadingScreenII(label));
  setTextExpander((full) => openReadMore(g, full));
  g.loading('CAGE BOSS II: THE DEMO', () => {
    newSlot('story', 'DEMO', false);
    const save = newStorySave(Math.floor(Math.random() * 1e9));
    save.flags.demo = true;
    writeStory(save);
    void import('../scenes/sequel').then((m) => m.openStoryMode(g));
  }, 1.4);
}

/** Chapter two done: on to four weeks behind the desk. */
export function demoToPromoter(g: Game): void {
  alertBox(g, 'TALES OF LEGACY: END OF THE DEMO', 'That was chapter two. In the full game, Han Tibular walks through the roller door next. Now: four weeks behind the desk in PROMOTER MODE.', () => {
    g.loading('Opening the warehouse', () => {
      newSlot('run', 'DEMO', false);
      forgetRun();
      const run = newSequelRun(Math.floor(Math.random() * 1e9));
      run.flags.demo = true;
      writeRun(run);
      void import('../scenes/sequelhub').then((m) => g.goto(new m.SequelHubScene(g)));
    }, 1.2);
  });
}

/** Four weeks done: the poster, then home. */
export function demoOver(g: Game): void {
  alertBox(g, 'END OF THE DEMO', 'CAGE BOSS II: THE BUYBACK is its own game: TALES OF LEGACY (fifteen chapters, five parts each, and a secret one, Han Tibular, Mateo, 1ton), PROMOTER MODE (forty weeks, the desk, the buyback) and QUICK FIGHT.', () => exitSequelDemo(g));
}

export function exitSequelDemo(g: Game): void {
  setSequelDemo(false);
  setSlotNamespace('cageboss2');
  forgetRun();
  forgetStory();
  setUiTheme('classic');
  setLoadingScreen((label) => new LoadingScreen(label));
  setTextExpander(null);
  void import('../scenes/title').then((m) => g.goto(new m.TitleScene(g)));
}
