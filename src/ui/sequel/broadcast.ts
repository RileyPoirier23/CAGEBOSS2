/**
 * BROADCAST: after the show you produce the TV package. Pick the booth, the camera, the bout to
 * replay and the cut (highlights travel further, the full card earns more), watch the estimate
 * move, then AIR IT: the ratings pay out, and the replay plays the way you shot it.
 */
import { Container } from 'pixi.js';
import type { Game } from '../app';
import { text, button } from '../kit';
import { openWindow } from '../widgets';
import { sfx } from '../../audio/sfx';
import { II } from '../theme';
import { BOOTHS, CAMERAS, airBroadcast, rateBroadcast, type Booth, type BroadcastPlan, type Camera, type Cut } from '../../sequel/rivals';
import type { SeqRun } from '../../sequel/types';
import { money } from '../../core/format';
import { watchFight } from './watchfight';
import { currentVenue } from '../../sequel/model';

export function openBroadcast(g: Game, run: SeqRun, save: () => void, after: () => void): void {
  const show = run.lastShow;
  if (!show || !show.results.length) return after();
  // the best bout to replay, to start with: a finish if there was one
  const firstFinish = show.results.findIndex((r) => r.finish);
  const plan: BroadcastPlan = { booth: 'hype', camera: 'tv', replay: Math.max(0, firstFinish), cut: 'highlights' };
  const win = openWindow(g, 'BROADCAST  /  THE PRODUCTION TRUCK', 420, 236);
  const b = win.body;
  const body = new Container();
  b.addChild(body);
  const draw = () => {
    body.removeChildren().forEach((c) => c.destroy({ children: true }));
    let y = 2;
    const pickRow = <T extends string>(label: string, opts: [T, string][], cur: T, set: (v: T) => void, w: number) => {
      body.addChild(text(label, 6, y + 3, { small: true, color: II.gold }));
      opts.forEach(([v, l], i) => body.addChild(button(l, 70 + i * (w + 4), y, w, 13, () => { set(v); sfx('click'); draw(); }, { small: true, fill: cur === v ? II.blood : II.steel, border: cur === v ? II.sodium : undefined })));
      y += 17;
    };
    pickRow<Booth>('THE BOOTH', (Object.keys(BOOTHS) as Booth[]).map((k) => [k, BOOTHS[k].name]), plan.booth, (v) => (plan.booth = v), 110);
    body.addChild(text(BOOTHS[plan.booth].blurb, 70, y, { width: 340, small: true, color: II.ash, maxLines: 2 }));
    y += 14;
    pickRow<Camera>('CAMERA', (Object.keys(CAMERAS) as Camera[]).map((k) => [k, CAMERAS[k]]), plan.camera, (v) => (plan.camera = v), 110);
    pickRow<Cut>('THE CUT', [['highlights', 'HIGHLIGHTS (MORE PEOPLE)'], ['full', 'THE FULL CARD (MORE MONEY)']], plan.cut, (v) => (plan.cut = v), 168);
    body.addChild(text('THE REPLAY', 6, y + 3, { small: true, color: II.gold }));
    show.results.forEach((r, i) => {
      body.addChild(button(`${r.aName.split(' ').slice(-1)[0]} vs ${r.bName.split(' ').slice(-1)[0]}  (${r.method})`, 70, y, 340, 13, () => { plan.replay = i; sfx('click'); draw(); }, {
        small: true, align: 'left', fill: plan.replay === i ? II.blood : II.steel, border: plan.replay === i ? II.sodium : undefined,
      }));
      y += 15;
    });
    // the estimate moves as you change the package
    const est = rateBroadcast(run, plan);
    y += 4;
    body.addChild(text(`ESTIMATE: ${est.viewers.toLocaleString('en-US')} VIEWERS  /  ${money(est.cash)}  /  BUZZ ${est.buzz >= 0 ? '+' : ''}${est.buzz}`, 6, y, { small: true, color: II.sodium }));
    body.addChild(button('AIR IT', 150, 204, 120, 16, () => {
      const res = airBroadcast(run, plan);
      save();
      sfx('cash');
      win.close();
      const r = show.results[plan.replay];
      const tape = r?.replay;
      const tell = () => g.toast(`${res.viewers.toLocaleString('en-US')} WATCHED. +${money(res.cash)}. ${res.lines[res.lines.length - 1].toUpperCase()}`, II.gold);
      if (!tape) {
        tell();
        return after();
      }
      watchFight(g, {
        A: tape.A, B: tape.B, rounds: tape.rounds, ticker: tape.ticker, slot: 'THE REPLAY', venue: currentVenue(run).name.toUpperCase(),
        verdict: `${r.winner === 'a' ? r.aName : r.winner === 'b' ? r.bName : 'NOBODY'}  /  ${r.method} R${r.round}`, verdictColor: II.gold,
        camera: plan.camera, done: () => { tell(); after(); },
      });
    }, { fill: II.blood, border: II.sodium }));
  };
  draw();
}
