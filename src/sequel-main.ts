/**
 * CAGE BOSS II: THE BUYBACK, the standalone boot (sequel.html). The same engine as
 * src/main.ts, without the first game's front door: it opens on the sequel's title.
 */
import { Game } from './ui/app';
import { loadBrowserContent } from './content.browser';
import { installTouch, attachTouchCanvas } from './ui/touch';
import { installController } from './ui/controller';
import { installNative } from './native';
import { platform } from './core/platform';
import { installSaveFiles } from './desktopsync';
import { flushSaves } from './core/save';
import { openSettings } from './ui/scenes/settings';
import { openFightLab } from './ui/scenes/fightlab';
import { setSequelStandalone } from './sequel/standalone';
import { SequelTitleScene } from './ui/scenes/sequel';
import { setUiTheme } from './ui/theme';
import { setLoadingScreen } from './ui/loading';
import { LoadingScreenII } from './ui/sequel/loading2';
import { setTextExpander } from './ui/text';
import { openReadMore } from './ui/sequel/readmore';

async function boot() {
  setSequelStandalone(true);
  // the sequel's own look: the II kit (buttons, panels, windows) and its own loading screen
  setUiTheme('ii');
  setLoadingScreen((label) => new LoadingScreenII(label));
  installSaveFiles(); // desktop: saves mirrored to files in CAGE BOSS II's own profile
  loadBrowserContent();
  const game = new Game();
  document.body.dataset.platform = platform;
  document.body.dataset.game = 'cageboss2';
  installTouch();
  await game.init(document.getElementById('game')!);
  attachTouchCanvas(game.app.canvas);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSaves();
  });
  window.addEventListener('pagehide', () => flushSaves());
  game.app.canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    flushSaves();
    setTimeout(() => location.reload(), 200);
  });
  const pad = installController(game, {
    onMenu: () => openSettings(game),
    onFightLab: () => openFightLab(game),
  });
  void installNative({ onBack: () => pad.key('Escape', 'Escape') });
  // anything cut short with "..." opens in full on a tap
  setTextExpander((full) => openReadMore(game, full));
  (window as any).__game = game; // debug / automated testing hook
  (window as any).__pad = pad;
  game.loading('Opening the warehouse', () => game.goto(new SequelTitleScene(game)), 1.6);
}

boot().catch((e) => {
  console.error(e);
  document.body.innerHTML = `<pre style="color:#e6dcc4;padding:20px">CAGE BOSS II failed to start:\n${String(e?.stack ?? e)}</pre>`;
});
