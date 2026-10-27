/**
 * Tales of Legacy's office: fifteen chapters of five parts (and a secret one), one trainee, one notebook and a contract
 * on the desk that is always slightly worse than it looks.
 *
 * This is the room between the cutscenes. Everything that changes a number lives
 * in sequel/story.ts; this file only draws it and points at the next scene.
 */
import { Container, Graphics } from 'pixi.js';
import { Scene, type Game } from '../app';
import { PAL } from '../../art/palette';
import { W, H, SW, OX, text, button, box, meterBar, clearChildren } from '../kit';
import { openWindow, alertBox } from '../widgets';
import { isTouchDevice } from '../../core/platform';
import { money } from '../../core/format';
import { sfx } from '../../audio/sfx';
import { fighterPortrait } from '../sprites';
import { seqVenueArt } from '../sequelart';
import { playCine as playCutscene } from '../sequel/cine';
import { storyVenue, venueCrowd } from '../sequel/venues';
import { openDrill, type DrillKind } from '../sequel/drills';
import { openSpar } from '../sequel/spar';
import { II } from '../theme';
import { maybeLesson2 } from '../sequel/tutorial2';
import { openPhone } from '../sequel/phoneui';
import { ownerForStory } from '../../sequel/phone';
import { isSequelDemo, DEMO_STORY_CHAPTERS } from '../../sequel/standalone';
import { openLiveFight } from '../livefight';
import type { Bout, FightResult } from '../../core/types';
import { overall } from '../../sim/fighters';
import {
  STORY_CHAPTERS, buildOneTon, cornerFighter, cornerName, cornerKey, chapterFights, nextChapterFight, storyProgress, storyCorner, storyOverall, storyChapter, storyNextLabel,
  storyRecord, storyDoc, resolveStoryDoc, pressQuestions, applyPressAnswer, finishPressDay,
  canAct, mediaDay, dinnerWithOneTon, applyTalkChoice, applyChapterChoice, talkTo,
  dueBeat, movesOf, storyDate, storyPart, storyWeek, chapterWeeks, fightDue, fightThisWeek, endStoryWeek, restDay, talkedThisChapter, chapterReady,
  trainSession, gradeFor, xpForLevel, TRAIN_TIERS, DAYS_PER_WEEK, type TrainTier, type OneTonTrack,
  fightDone, recordStoryFight, advanceStoryChapter, sideOffers, sideFightReady,
  recordSideFight, type StoryFightDef, type StorySideOpponent, type StoryDocMode,
} from '../../sequel/story';
import { beatScene, chapterIntro, chapterOutro, fightHighlight, fightIntro, partScene, partTitle, storyEndingScene, talkScene } from './storycuts';
import { newStorySave } from '../../sequel/story';
import { readStory, writeStory, addStoryTrophy, forgetStory, takeNewPages } from '../../sequel/storysession';
import { openNotebook } from '../sequel/notebookui';
import { newSlot, listSlots } from '../../sequel/slots';
import type { StorySave } from '../../sequel/types';
import { StoryEndScene } from './storyend';

export function routeStory(g: Game): void {
  const save = readStory();
  if (!save) {
    void import('./sequel').then((m) => g.goto(new m.SequelTitleScene(g)));
    return;
  }
  if (save.status === 'ended') g.goto(new StoryEndScene(g));
  else g.goto(new SequelStoryHubScene(g));
}

/** A new Tales of Legacy save, in a new slot (the old one stays in LOAD SAVE). */
export function startNewStory(g: Game): void {
  const seed = Math.floor(Math.random() * 1e9);
  newSlot('story', `TALE ${listSlots('story').length + 1}`, false);
  forgetStory();
  g.loading('Opening the notebook', () => {
    const save = newStorySave(seed);
    writeStory(save);
    g.goto(new SequelStoryHubScene(g));
  }, 1.1);
}

export class SequelStoryHubScene extends Scene {
  music = 'office' as const;
  private t = 0;
  private flicker = new Graphics();

  build(): void {
    const save = readStory();
    if (!save) {
      void import('./sequel').then((m) => this.g.goto(new m.SequelTitleScene(this.g)));
      return;
    }
    if (save.status === 'ended') {
      this.enterEnding(save);
      return;
    }
    this.draw(save);
    // the first visit: the lesson, then the story
    maybeLesson2(this.g, 'legacy', () => setTimeout(() => this.maybeIntro(save), 260));
  }

  private draw(save: StorySave): void {
    const r = this.root;
    clearChildren(r);
    r.x = -OX;
    const ch = storyChapter(save);
    // clearChildren destroyed the old flicker
    this.flicker = new Graphics();
    r.addChild(seqVenueArt('warehouse', SW, H, save.seed + save.chapter * 17));
    r.addChild(new Graphics().rect(0, 0, SW, H).fill({ color: 0x08060c, alpha: 0.66 }));
    r.addChild(this.flicker);
    this.header(save, ch);
    this.chapterPanel(save, ch);
    this.menPanel(save);
    this.buttons(save, ch);
  }

  private header(save: StorySave, ch: ReturnType<typeof storyChapter>): void {
    const r = this.root;
    r.addChild(new Graphics().rect(0, 0, SW, 28).fill({ color: 0x0a080e, alpha: 0.95 }).rect(0, 27, SW, 1).fill({ color: PAL.gold, alpha: 0.55 }));
    r.addChild(text('CAGE BOSS II  /  TALES OF LEGACY', 6, 4, { small: true, color: PAL.gold }));
    r.addChild(text(`CHAPTER ${storyProgress(save)}  /  PART ${storyPart(save)}/5`, 150, 4, { small: true, color: PAL.bone }));
    r.addChild(text(`WEEK ${storyWeek(save)}/${chapterWeeks(ch)}  DAY ${Math.min(DAYS_PER_WEEK, DAYS_PER_WEEK + 1 - save.actionsLeft)}/${DAYS_PER_WEEK}`, 262, 4, { small: true, color: save.actionsLeft ? PAL.bone : PAL.ember }));
    r.addChild(text(storyDate(save), 262, 14, { small: true, color: PAL.ash }));
    r.addChild(text(`CASH ${money(save.cash)}`, 366, 4, { small: true, color: save.cash < 0 ? PAL.blood : PAL.bone }));
    r.addChild(text(`"${ch.title}"`, 6, 14, { small: true, color: PAL.ember, width: 250, maxLines: 1 }));
    r.addChild(text(storyNextLabel(save), 352, 14, { small: true, color: talkedThisChapter(save) ? PAL.ash : PAL.gold, width: 122, align: 'right', maxLines: 1 }));
  }

  private chapterPanel(save: StorySave, ch: ReturnType<typeof storyChapter>): void {
    const r = this.root;
    const c = new Container();
    c.position.set(6, 34);
    c.addChild(box(300, 202, 0x16121a, PAL.slate, { alpha: 0.95, bevel: true }));
    c.addChild(text('THE CHAPTER', 6, 4, { small: true, color: PAL.gold }));
    c.addChild(text(ch.title, 6, 15, { width: 288, color: PAL.bone, maxLines: 2 }));
    c.addChild(text(`PART ${storyPart(save)}: ${partTitle(ch.id, storyPart(save)) || ch.kicker}`, 6, 34, { small: true, color: PAL.ember, width: 288, maxLines: 1 }));
    c.addChild(text(ch.blurb, 6, 45, { width: 288, small: true, color: PAL.fog, maxLines: 3, lineGap: 0 }));
    c.addChild(new Graphics().rect(6, 74, 288, 1).fill({ color: PAL.slate, alpha: 0.7 }));

    const fights = chapterFights(ch, save);
    const fight = nextChapterFight(save) ?? fights[fights.length - 1];
    if (fight) {
      const done = fightDone(save, fight);
      const won = save.flags[`won_${fight.id}`] === true;
      const n = fights.length > 1 ? `  (${fights.indexOf(fight) + 1} OF ${fights.length})` : '';
      c.addChild(text(`THE FIGHT${n}`, 6, 80, { small: true, color: PAL.blood }));
      c.addChild(text(fight.hook, 6, 90, { small: true, color: PAL.bone, width: 288, maxLines: 1 }));
      c.addChild(text(fight.stakes, 6, 100, { small: true, color: PAL.slate, width: 288, maxLines: 2, lineGap: 0 }));
      const when = fightDue(save, fight) ? 'FIGHT WEEK. HE IS WALKING TO THE CAGE.' : `BOOKED FOR WEEK ${fight.week}.`;
      c.addChild(text(done ? (won ? 'WON. THE STORY REMEMBERS.' : 'LOST. THE STORY REMEMBERS THAT TOO.') : when, 6, 117, { small: true, color: done ? (won ? PAL.moss : PAL.blood) : fightDue(save, fight) ? PAL.gold : PAL.ash }));
    } else if (ch.id === 'legacy') {
      c.addChild(text('THE CHAMPION HAS NOT SAID WHAT HE WANTS YET.', 6, 84, { small: true, color: PAL.ash }));
    } else {
      c.addChild(text('NO FIGHT THIS CHAPTER. ONLY PEOPLE.', 6, 84, { small: true, color: PAL.ash }));
    }

    const doc = storyDoc(save);
    const grade = save.flags[`doc_${ch.id}`];
    c.addChild(new Graphics().rect(6, 130, 288, 1).fill({ color: PAL.slate, alpha: 0.7 }));
    c.addChild(text('THE PAPER', 6, 136, { small: true, color: PAL.blood }));
    c.addChild(text(
      doc ? 'UNREVIEWED. THE CLAUSES ARE WAITING.' : grade ? `GRADED ${String(grade).toUpperCase()}. THE INK IS DRY.` : 'NOTHING ON THE DESK THIS CHAPTER.',
      6, 146, { small: true, color: doc ? PAL.gold : PAL.slate, width: 288, maxLines: 1 },
    ));
    c.addChild(text(
      `PRESS DAYS ${save.stats.pressers}  /  UNDERCARD ${save.stats.sideWins}-${save.stats.sideLosses}  /  CONTRACTS ${save.stats.catches} CAUGHT`,
      6, 156, { small: true, color: PAL.ash, width: 288, maxLines: 1 },
    ));

    c.addChild(new Graphics().rect(6, 168, 288, 1).fill({ color: PAL.slate, alpha: 0.7 }));
    c.addChild(text('THE NOTEBOOK', 6, 173, { small: true, color: PAL.gold }));
    // two lines fit the box; tap a cut line to read it all
    const logs = save.log.slice(0, 2);
    if (!logs.length) logs.push('Nobody has written anything down yet. That is how it starts.');
    logs.forEach((line, i) => {
      c.addChild(text(`• ${line}`, 6, 183 + i * 9, { small: true, color: i === 0 ? PAL.fog : PAL.slate, width: 288, maxLines: 1 }));
    });
    r.addChild(c);
  }

  private menPanel(save: StorySave): void {
    const r = this.root;
    const c = new Container();
    c.position.set(312, 34);
    c.addChild(box(162, 202, 0x16121a, PAL.slate, { alpha: 0.95, bevel: true }));
    c.addChild(text('THE MEN', 6, 4, { small: true, color: PAL.gold }));

    const one = buildOneTon(save);
    // Dane promotes; the second man is whoever the corner's camp is building (Han, then Mateo)
    const corner = cornerFighter(save);
    const oneRec = storyRecord(save, 'oneton');
    const cornerRec = storyRecord(save, cornerKey(save));
    const row = (f: typeof one, rec: { w: number; l: number; d: number }, label: string, y: number) => {
      const po = fighterPortrait(f, 32);
      po.position.set(6, y);
      c.addChild(po);
      c.addChild(text(label, 42, y + 1, { small: true, color: PAL.bone, width: 112, maxLines: 1 }));
      c.addChild(text(`${f.first} ${f.last}`, 42, y + 10, { small: true, color: PAL.ash, width: 112, maxLines: 1 }));
      c.addChild(text(`OVR ${storyOverall(save, label === '1TON' ? 'oneton' : 'corner')}  /  ${rec.w}-${rec.l}${rec.d ? '-' + rec.d : ''}`, 42, y + 19, { small: true, color: PAL.ember, width: 112, maxLines: 1 }));
    };
    row(one, oneRec, '1TON', 15);
    row(corner, cornerRec, cornerName(save), 51);

    c.addChild(new Graphics().rect(6, 87, 150, 1).fill({ color: PAL.slate, alpha: 0.7 }));
    const meter = (label: string, value: number, y: number, color: number) => {
      c.addChild(text(label, 6, y, { small: true, color: PAL.ash }));
      const bar = meterBar(106, value, color, 4);
      bar.position.set(6, y + 8);
      c.addChild(bar);
      c.addChild(text(String(Math.round(value)), 116, y + 4, { small: true, color: PAL.bone, width: 38, align: 'right' }));
    };
    meter('TRUST', save.trust, 93, save.trust > 60 ? PAL.moss : save.trust < 35 ? PAL.blood : PAL.gold);
    meter('EGO', save.ego, 111, save.ego > 70 ? PAL.blood : PAL.gold);
    meter('BRAND', save.brand, 129, save.brand > 60 ? PAL.moss : PAL.gold);
    meter('HEAT', save.heat, 147, save.heat > 60 ? PAL.blood : PAL.gold);
    meter('FATIGUE', save.fatigue, 165, save.fatigue > 70 ? PAL.blood : PAL.moss);
    c.addChild(text(`CONTRACT ${save.stats.catches} / ${save.stats.catches + save.stats.missed}`, 6, 186, { small: true, color: save.stats.missed ? PAL.ember : PAL.moss }));
    c.addChild(text(`CASH ${money(save.cash)}`, 6, 194, { small: true, color: save.cash < 0 ? PAL.blood : PAL.ash }));
    r.addChild(c);
  }

  private buttons(save: StorySave, ch: ReturnType<typeof storyChapter>): void {
    const r = this.root;
    const touch = isTouchDevice();
    const y = touch ? 243 : 246;
    const h = touch ? 19 : 16;
    const gap = 4;
    const talked = talkedThisChapter(save);
    const defs: [string, number, () => void, number?][] = [
      ['TRAIN', 40, () => openStoryTraining(this.g, save, () => this.refresh())],
      ['SPAR', 36, () => this.doSpar(save)],
      ['MEDIA', 40, () => this.doMedia(save)],
      ['DINNER', 44, () => this.doDinner(save)],
      // the story will not move until you have talked: it glows until you do
      ['TALK', 36, () => this.doTalk(save), talked ? undefined : II.blood],
      ['PAPER', 40, () => openStoryDoc(this.g, save, () => this.refresh())],
      ['PRESS', 40, () => openStoryPress(this.g, save, () => this.refresh())],
      ['UNDERCARD', 54, () => openStoryUndercard(this.g, save, () => this.refresh())],
      ['END WEEK', 48, () => this.doEndWeek(save)],
    ];
    let x = 6;
    for (const [label, w, fn, fill] of defs) {
      r.addChild(button(label, x, y, w, h, fn, { small: true, fill: fill ?? PAL.shadow, border: fill ? II.sodium : undefined }));
      x += w + gap;
    }
    const due = fightThisWeek(save);
    const ready = !due && chapterReady(save);
    r.addChild(button(due ? 'FIGHT' : ready ? (save.flags[`outro_${ch.id}`] ? 'ADVANCE' : 'CONTINUE') : 'NEXT', x, y, 474 - x, h, () => this.doNext(save), {
      small: true, fill: due || ready ? PAL.blood : PAL.rust, border: PAL.gold,
    }));
    // the tiny title door sits on the ticker line, where it is hard to press by accident
    r.addChild(button('MENU', 6, 232, 34, 10, () => {
      void import('./sequel').then((m) => this.g.goto(new m.SequelTitleScene(this.g)));
    }, { small: true, fill: PAL.shadow }));
    r.addChild(button('NOTEBOOK', 88, 232, 50, 10, () => openNotebook(this.g), { small: true, fill: PAL.shadow, border: PAL.gold }));
    // a page of Ray's notebook filled in since the last look
    for (const title of takeNewPages()) setTimeout(() => this.g.toast(`RAY'S NOTEBOOK: NEW PAGE  /  ${title}`, PAL.gold), 600);
    r.addChild(button('PHONE', 44, 232, 40, 10, () => openPhone(this.g, ownerForStory(save), () => writeStory(save), () => this.refresh()), { small: true, fill: PAL.blood, border: PAL.gold }));
    void gap;
  }

  private maybeIntro(save: StorySave): void {
    if (save.status === 'ended' || this.g.modals.length) return;
    const ch = storyChapter(save);
    if (save.flags[`intro_${ch.id}`]) {
      // a new part of the chapter opens with its card
      const part = storyPart(save);
      if (part >= 2 && !save.flags[`part_${ch.id}_${part}`]) {
        save.flags[`part_${ch.id}_${part}`] = true;
        const card = partScene(save, part);
        if (card) {
          playCutscene(this.g, card, () => { writeStory(save); this.refresh(); setTimeout(() => this.maybeIntro(save), 200); });
          return;
        }
      }
      // the story between the fights: a scene when its week comes round
      const beat = dueBeat(save);
      const scene = beat ? beatScene(save, beat) : null;
      if (beat) save.flags[`beat_${beat}`] = true;
      if (scene) playCutscene(this.g, scene, () => { writeStory(save); this.refresh(); });
      return;
    }
    const intro = chapterIntro(save);
    playCutscene(this.g, intro, (choice) => {
      const after = () => {
        save.flags[`intro_${ch.id}`] = true;
        writeStory(save);
        if (storyDoc(save)) this.g.toast('A CONTRACT IS ON THE DESK. READ IT BEFORE YOU SIGN IT.', PAL.gold);
        this.refresh();
      };
      if (!choice) return after();
      const msg = applyChapterChoice(save, choice);
      this.playChoiceBeat(save, intro, choice, msg, after);
    });
  }

  private doMedia(save: StorySave): void {
    if (!canAct(save)) return alertBox(this.g, 'No sessions', 'The cameras have gone home. Some of them were never here.');
    sfx('click');
    const msg = mediaDay(save);
    writeStory(save);
    this.g.toast(msg, PAL.moss);
    this.refresh();
  }

  private doDinner(save: StorySave): void {
    if (!canAct(save)) return alertBox(this.g, 'No sessions', 'The tacos are cold and the conversation is colder.');
    if (save.cash < 1500) return alertBox(this.g, 'No dinner', 'You cannot afford dinner. You can afford a folding chair and a serious talk.');
    sfx('click');
    const msg = dinnerWithOneTon(save);
    writeStory(save);
    this.g.toast(msg, PAL.moss);
    this.refresh();
  }

  private doTalk(save: StorySave): void {
    if (!canAct(save)) return alertBox(this.g, 'No sessions', 'He is already in the cage, or already gone.');
    const scene = talkScene(save);
    if (!scene) {
      const msg = talkTo(save);
      writeStory(save);
      this.g.toast(msg, PAL.moss);
      this.refresh();
      return;
    }
    playCutscene(this.g, scene, (choice) => {
      // the reply already played inside the scene; the talk counts once it's had
      const msg = choice ? applyTalkChoice(save, choice) : 'You listened.';
      save.actionsLeft = Math.max(0, save.actionsLeft - 1);
      save.flags[`talk_${storyChapter(save).id}`] = true;
      writeStory(save);
      this.g.toast(msg, PAL.moss);
      this.refresh();
    });
  }

  private doNext(save: StorySave): void {
    sfx('click');
    const ch = storyChapter(save);
    const due = fightThisWeek(save);
    if (due) {
      this.startStoryFight(save, due);
      return;
    }
    if (chapterReady(save)) {
      this.playOutroAndAdvance(save);
      return;
    }
    if (!talkedThisChapter(save)) {
      alertBox(this.g, 'Talk first', 'Somebody needs a word before the story moves on. Press TALK.');
      return;
    }
    if (ch.id === 'buyback' && save.flags.finalWinner === 'player' && !save.choices.ch_buyback) {
      this.playOutroAndAdvance(save);
      return;
    }
    const next = nextChapterFight(save);
    alertBox(this.g, `Week ${storyWeek(save)} of ${chapterWeeks(ch)}`, next
      ? `${next.hook} is booked for week ${next.week}. Train, spar, take a meeting, then END WEEK to move time on.`
      : `The chapter runs ${chapterWeeks(ch)} weeks. Use the days, then END WEEK.`);
  }

  private doEndWeek(save: StorySave): void {
    const res = endStoryWeek(save);
    if (!res.ok) {
      alertBox(this.g, 'Not yet', res.msg);
      return;
    }
    writeStory(save);
    sfx('bell');
    this.g.toast(res.msg, PAL.gold);
    this.refresh();
    setTimeout(() => this.maybeIntro(save), 280);
  }

  private doSpar(save: StorySave): void {
    if (!canAct(save, 2)) return alertBox(this.g, 'Not enough days', 'Sparring takes two days. End the week and start fresh.');
    openSpar(this.g, save, 'corner', (msg) => {
      if (msg) {
        writeStory(save);
        this.g.toast(msg, PAL.moss);
      }
      this.refresh();
    });
  }

  private startStoryFight(save: StorySave, def: StoryFightDef): void {
    sfx('bell');
    playCutscene(this.g, fightIntro(save, def), () => {
      const corner = storyCorner(save, def);
      const player = corner.player;
      const opponent = corner.opponent;
      const bout = storyBout(def.id, player, opponent, def.rounds);
      const seed = (save.seed + save.chapter * 977 + save.fights.length * 131) >>> 0;
      // the fight happens where the story says it does: Ray's ring, an alley, the warehouse, the Old Dome
      const where = storyVenue(def.venue);
      openLiveFight(this.g, {
        bout, A: player, B: opponent, skills: [player.skills, opponent.skills], player: 0,
        plan: 'balanced', oppPlan: 'balanced', cutTier: 3, seed,
        event: def.venue, judges: ['Lenny Pratt', 'Marla Cross', 'Dexter Bell'], referee: where.referee,
        canvas: where.canvas, refLook: where.refLook, bare: where.bare,
        rules: { moves: { 0: movesOf(save, def.player === 'oneton' ? 'oneton' : 'corner') } }, crowd: venueCrowd(where),
        done: (r) => this.afterStoryFight(save, def, player.id, opponent.id, r),
      });
    });
  }

  private afterStoryFight(save: StorySave, def: StoryFightDef, playerId: string, opponentId: string, r: FightResult): void {
    const rec = recordStoryFight(save, def, {
      winner: r.winner, method: r.method, round: r.round, time: r.time, detail: r.detail,
    }, playerId, opponentId);
    writeStory(save);
    const won = rec.result === 'W';
    const drawn = rec.result === 'D';
    const line = won
      ? `${def.name}: WON. ${r.method} R${r.round} ${r.time}. The building makes a sound you will remember.`
      : drawn
        ? `${def.name}: DRAW. ${r.method} R${r.round} ${r.time}. Nobody gets what they came for.`
        : `${def.name}: LOST. ${r.method} R${r.round} ${r.time}. The building makes a different sound.`;
    sfx(won ? 'roar' : 'thud');
    // the moment, shot like a broadcast package, then the card
    playCutscene(this.g, fightHighlight(save, def, won, r.method, r.round), () => {
      alertBox(this.g, won ? 'WON' : drawn ? 'DRAW' : 'LOST', line, () => this.playOutroAndAdvance(save));
    });
  }

  private playOutroAndAdvance(save: StorySave): void {
    const ch = storyChapter(save);
    // chapter nine has three fights: the outro waits for the last of them
    if (nextChapterFight(save)) {
      this.refresh();
      return;
    }
    if (save.flags[`outro_${ch.id}`]) {
      this.advance(save);
      return;
    }
    const outro = chapterOutro(save);
    playCutscene(this.g, outro, (choice) => {
      const after = () => {
        save.flags[`outro_${ch.id}`] = true;
        writeStory(save);
        this.advance(save);
      };
      if (!choice) return after();
      const msg = applyChapterChoice(save, choice);
      this.playChoiceBeat(save, outro, choice, msg, after);
    });
  }

  /**
   * What your choice did, on screen: the same room and the same people, what happened next (the
   * story log's line) and what it moved. Skipped when the choice had its own reply in the scene.
   */
  private playChoiceBeat(save: StorySave, from: ReturnType<typeof chapterIntro>, id: string, msg: string, then: () => void): void {
    const c = from.choices?.find((x) => x.id === id);
    const last = from.shots[from.shots.length - 1];
    if (!c || c.reply?.length || !last) {
      if (msg) this.g.toast(msg, PAL.moss);
      return then();
    }
    playCutscene(this.g, {
      film: true,
      shots: [{ bg: last.bg, cast: last.cast, caption: c.label, lines: [{ who: null, text: save.log[0] ?? c.label }, ...(msg ? [{ who: null, text: msg }] : [])] }],
    }, () => then());
  }

  private advance(save: StorySave): void {
    if (isSequelDemo() && save.chapter + 1 >= DEMO_STORY_CHAPTERS && chapterReady(save)) {
      void import('../sequel/demo').then((m) => m.demoToPromoter(this.g));
      return;
    }
    if (!advanceStoryChapter(save)) {
      this.refresh();
      return;
    }
    writeStory(save);
    if (save.status === 'ended') {
      this.enterEnding(save);
      return;
    }
    sfx('click');
    this.refresh();
    setTimeout(() => this.maybeIntro(save), 280);
  }

  private enterEnding(save: StorySave): void {
    if (!save.flags.trophySaved) {
      addStoryTrophy(save);
      save.flags.trophySaved = true;
      writeStory(save);
    }
    playCutscene(this.g, storyEndingScene(save), () => {
      this.g.goto(new StoryEndScene(this.g));
    });
  }

  update(dt: number): void {
    this.t += dt;
    const g = this.flicker;
    g.clear();
    const a = Math.sin(this.t * 2.3) * 0.5 + 0.5;
    g.circle(36, 9, 2).fill({ color: 0xffd890, alpha: 0.35 + a * 0.55 });
    g.circle(36, 9, 8).fill({ color: 0xffd890, alpha: 0.02 + a * 0.05 });
    if (Math.sin(this.t * 12.7) > 0.97) g.rect(0, 0, SW, H).fill({ color: 0x000000, alpha: 0.06 });
  }
}

// ---------------------------------------------------------------- shared fight glue

function storyBout(id: string, a: { id: string; division: string }, b: { id: string }, rounds: number): Bout {
  return {
    id: `story_${id}_${Date.now()}`,
    a: a.id,
    b: b.id,
    division: a.division,
    title: null,
    // a spar is one round: the live engine just counts rounds, the type only knows title-fight lengths
    rounds: rounds as Bout['rounds'],
    position: 0,
    catchweight: false,
    shortNotice: false,
    status: 'scheduled',
    purse: [0, 0],
    finePct: 0,
    missedBy: null,
  };
}

function fightSummary(r: FightResult): string {
  return r.winner ? `${r.method} at ${r.time} of round ${r.round}. ${r.detail}` : `A draw. ${r.method}. ${r.detail}`;
}

// ---------------------------------------------------------------- training

function openStoryTraining(g: Game, save: StorySave, after: () => void): void {
  if (!canAct(save)) {
    alertBox(g, 'No days left', 'The week is spent. END WEEK and start again on Monday.');
    return;
  }
  let who: 'oneton' | 'corner' = 'oneton';
  let tier: TrainTier = 'full';
  maybeLesson2(g, 'training');
  const win = openWindow(g, 'THE CAMP', 400, 232);
  const b = win.body;
  const draw = () => {
    b.removeChildren().forEach((c) => c.destroy({ children: true }));
    const f = who === 'oneton' ? buildOneTon(save) : cornerFighter(save);
    const tr = (who === 'oneton' ? save.training : save.daneTraining) as unknown as Record<string, number>;
    b.addChild(text(`${save.actionsLeft} DAY${save.actionsLeft === 1 ? '' : 'S'} LEFT THIS WEEK  /  FATIGUE ${Math.round(save.fatigue)}`, 6, 2, { small: true, color: II.sodium }));
    // who: 1ton, or the corner's man (Han, then Mateo)
    (['oneton', 'corner'] as const).forEach((w, i) => {
      b.addChild(button(w === 'oneton' ? '1TON' : cornerName(save), 6 + i * 64, 12, 60, 14, () => { who = w; draw(); }, { small: true, fill: who === w ? II.blood : II.steel, border: who === w ? II.sodium : undefined }));
    });
    // how hard: light (1 day), full (2), camp (3)
    (Object.keys(TRAIN_TIERS) as TrainTier[]).forEach((t, i) => {
      const def = TRAIN_TIERS[t];
      b.addChild(button(`${def.label} ${def.days}D`, 150 + i * 82, 12, 78, 14, () => { tier = t; draw(); }, {
        small: true, fill: tier === t ? II.blood : II.steel, border: tier === t ? II.sodium : undefined, disabled: !canAct(save, def.days),
      }));
    });
    b.addChild(text(TRAIN_TIERS[tier].blurb + ' Play the drill for your own grade, or sim it for a C.', 6, 30, { width: 386, small: true, color: II.ash, maxLines: 2 }));
    const tracks: [OneTonTrack, string, DrillKind][] = [
      ['striking', 'STRIKING', 'striking'],
      ['grappling', 'GRAPPLING', 'grappling'],
      ['cardio', 'CARDIO', 'cardio'],
      ...(who === 'oneton' ? [['media', 'MEDIA', 'media'] as [OneTonTrack, string, DrillKind]] : []),
    ];
    tracks.forEach(([track, label, kind], i) => {
      const y = 48 + i * 38;
      const lv = tr[track] ?? 0;
      const xp = (save.xp ?? {})[`${who}.${track}`] ?? xpForLevel(lv);
      // how far into this level, out of what it costs
      const into = xp - xpForLevel(lv);
      const need = xpForLevel(lv + 1) - xpForLevel(lv);
      b.addChild(box(388, 34, II.panelHi, II.edge, { bevel: true })).position.set(0, y);
      b.addChild(text(label, 8, y + 4, { small: true, color: II.gold }));
      b.addChild(text(`LEVEL ${lv}/10`, 8, y + 13, { small: true, color: II.bone }));
      const bar = new Graphics().rect(8, y + 23, 120, 4).fill(0x221e28).rect(8, y + 23, Math.round(120 * Math.min(1, into / need)), 4).fill(lv >= 10 ? II.gold : II.sodium);
      b.addChild(bar);
      b.addChild(text(lv >= 10 ? 'MAXED' : `${into}/${need} XP TO LEVEL ${lv + 1}`, 134, y + 21, { small: true, color: II.ash }));
      b.addChild(button('TRAIN', 316, y + 9, 64, 16, () => {
        const days = TRAIN_TIERS[tier].days;
        if (!canAct(save, days)) return alertBox(g, 'Not enough days', `A ${TRAIN_TIERS[tier].label} session takes ${days} day${days === 1 ? '' : 's'}.`);
        win.close();
        openDrill(g, { kind, tier, fighter: f, title: `${f.first.toUpperCase()}  /  ${label}  /  ${TRAIN_TIERS[tier].label}` }, (pct) => {
          if (pct === null) return openStoryTraining(g, save, after);
          const msg = trainSession(save, who, track, tier, gradeFor(pct));
          writeStory(save);
          g.toast(msg, PAL.moss);
          after();
        });
      }, { small: true, fill: II.blood, border: II.sodium }));
    });
  };
  draw();
}

// ---------------------------------------------------------------- contract review

export function openStoryDoc(g: Game, save: StorySave, after: () => void): void {
  const doc = storyDoc(save);
  if (!doc) {
    alertBox(g, 'No paper', 'There is nothing on the desk this chapter. That is either a good sign or a trap.');
    return;
  }
  const flagged = new Set<number>();
  let resolved = false;
  const win = openWindow(g, 'READ BEFORE SIGNING', 430, 238, { paper: 'news' });
  const b = win.body;
  b.addChild(text(doc.title, 6, 1, { small: true, color: PAL.blood, width: 414, maxLines: 1 }));
  b.addChild(text(doc.kicker, 6, 10, { small: true, color: PAL.slate, width: 414, maxLines: 1 }));
  b.addChild(text(doc.intro, 6, 20, { small: true, color: PAL.ink, width: 414, maxLines: 2, lineGap: 0 }));
  b.addChild(text('FLAG THE CLAUSES THAT ARE WRONG. DO NOT FLAG THE ONES THAT ARE JUST UGLY.', 6, 34, { small: true, color: PAL.ember, width: 414, maxLines: 1 }));

  const list = new Container();
  list.position.set(6, 45);
  b.addChild(list);
  const drawList = (): void => {
    clearChildren(list);
    doc.clauses.forEach((c, i) => {
      const row = new Container();
      row.position.set(0, i * 23);
      const on = flagged.has(c.id);
      row.addChild(box(414, 21, on ? 0xe4d4b0 : 0xd4c9aa, on ? PAL.blood : 0xb3a685));
      row.addChild(text(on ? '[X]' : '[ ]', 4, 6, { small: true, color: on ? PAL.blood : PAL.slate }));
      row.addChild(text(c.text, 24, 4, { small: true, color: PAL.ink, width: 384, maxLines: 2 }));
      row.eventMode = 'static';
      row.cursor = 'pointer';
      row.hitArea = { contains: (x: number, y: number) => x >= 0 && x < 414 && y >= 0 && y < 21 };
      row.on('pointertap', () => {
        if (resolved) return;
        sfx('click');
        if (flagged.has(c.id)) flagged.delete(c.id);
        else flagged.add(c.id);
        drawList();
      });
      list.addChild(row);
    });
  };
  drawList();
  b.addChild(text('CAUGHT: ' + flagged.size + ' FLAGGED. THE PAPER DOES NOT CARE YET.', 6, 186, { small: true, color: PAL.slate }));
  const act = (mode: StoryDocMode) => {
    if (resolved) return;
    resolved = true;
    const res = resolveStoryDoc(save, doc, [...flagged], mode);
    writeStory(save);
    win.close();
    showDocResult(g, save, res.grade, res.caught, res.bad, res.missed, res.wrong, res.cash, res.trust, res.brand, res.heat, res.text, doc.reward, after);
  };
  b.addChild(button('SIGN IT', 6, 202, 86, 16, () => act('sign'), { small: true, fill: PAL.rust, border: PAL.ink }));
  b.addChild(button('RENEGOTIATE', 96, 202, 112, 16, () => act('renegotiate'), { small: true, fill: PAL.moss, border: PAL.ink }));
  b.addChild(button('WALK AWAY', 212, 202, 96, 16, () => act('walk'), { small: true, fill: PAL.shadow }));
  b.addChild(button('CLOSE', 346, 202, 68, 16, () => win.close(), { small: true, fill: PAL.shadow }));
}

function showDocResult(
  g: Game, save: StorySave, grade: string, caught: number, bad: number, missed: number, wrong: number,
  cash: number, trust: number, brand: number, heat: number, verdict: string, reward: string, after: () => void,
): void {
  const win = openWindow(g, 'THE PAPER, GRADED', 392, 218, { paper: 'cream' });
  const b = win.body;
  b.addChild(text(grade, 6, 2, { scale: 3, color: grade === 'A' ? PAL.moss : grade === 'F' ? PAL.blood : PAL.ember }));
  b.addChild(text(`CAUGHT ${caught} OF ${bad} BAD CLAUSES  /  ${missed} MISSED  /  ${wrong} WRONG FLAGS`, 66, 10, { small: true, color: PAL.ink, width: 310, maxLines: 2 }));
  b.addChild(new Graphics().rect(6, 42, 378, 1).fill(PAL.paperDark));
  b.addChild(text(verdict, 6, 50, { width: 378, small: true, color: PAL.ink, maxLines: 4 }));
  b.addChild(text(reward, 6, 92, { width: 378, small: true, color: PAL.slate, maxLines: 2 }));
  const delta = (label: string, n: number, x: number, y: number) => {
    b.addChild(text(label, x, y, { small: true, color: PAL.slate }));
    b.addChild(text(`${n >= 0 ? '+' : ''}${n}`, x + 42, y, { small: true, color: n >= 0 ? PAL.moss : PAL.blood }));
  };
  delta('CASH', cash, 6, 122);
  delta('TRUST', trust, 90, 122);
  delta('BRAND', brand, 170, 122);
  delta('HEAT', heat, 250, 122);
  b.addChild(text(`CONTRACTS CAUGHT ALL SEASON: ${save.stats.catches}  /  MISSED: ${save.stats.missed}`, 6, 138, { small: true, color: PAL.ink }));
  b.addChild(text('THE PAPER IS NOT THE FIGHT. IT IS THE REASON THERE IS A FIGHT.', 6, 154, { small: true, color: PAL.slate }));
  b.addChild(button('BACK TO THE OFFICE', 120, 184, 148, 16, () => { win.close(); after(); }, { small: true, fill: PAL.moss, border: PAL.ink }));
}

// ---------------------------------------------------------------- press day

export function openStoryPress(g: Game, save: StorySave, after: () => void): void {
  if (!canAct(save)) {
    alertBox(g, 'No sessions', 'The cameras have gone home. Some of them were never here.');
    return;
  }
  const qs = pressQuestions(save);
  const replies: string[] = [];
  const ask = (i: number): void => {
    if (i >= qs.length) {
      finishPressDay(save);
      writeStory(save);
      showPressReport(g, save, replies, after);
      return;
    }
    const q = qs[i];
    const win = openWindow(g, `PRESS DAY ${i + 1} / ${qs.length}`, 430, 232, { paper: 'cream' });
    const b = win.body;
    b.addChild(text('THE MICROPHONE IS ON. THE ROOM IS NOT YOUR FRIEND.', 6, 2, { small: true, color: PAL.blood }));
    b.addChild(text(q.q, 6, 14, { width: 414, color: PAL.ink, maxLines: 3 }));
    q.options.forEach((o, k) => {
      const y = 57 + k * 48;
      const bg = box(414, 44, 0xd8cdae, 0xb3a685);
      bg.position.set(0, y);
      b.addChild(bg);
      b.addChild(text(o.label, 6, y + 4, { small: true, width: 400, color: PAL.ink, maxLines: 2 }));
      b.addChild(text(`TRUST ${o.trust >= 0 ? '+' : ''}${o.trust}  EGO ${o.ego >= 0 ? '+' : ''}${o.ego}  BRAND ${o.brand >= 0 ? '+' : ''}${o.brand}  HEAT ${o.heat >= 0 ? '+' : ''}${o.heat}`, 6, y + 20, { small: true, color: PAL.slate }));
      const hit = button('ANSWER', 330, y + 14, 78, 16, () => {
        sfx('click');
        applyPressAnswer(save, o);
        replies.push(o.reply);
        writeStory(save);
        win.close();
        ask(i + 1);
      }, { small: true, fill: i === 0 ? PAL.rust : PAL.shadow, border: PAL.ink });
      b.addChild(hit);
    });
    b.addChild(button('LEAVE THE ROOM', 6, 208, 116, 14, () => win.close(), { small: true, fill: PAL.shadow }));
  };
  ask(0);
}

function showPressReport(g: Game, save: StorySave, replies: string[], after: () => void): void {
  const win = openWindow(g, 'THE DAY AFTER THE PRESSER', 396, 216, { paper: 'news' });
  const b = win.body;
  b.addChild(text('WHAT THEY RAN', 6, 2, { small: true, color: PAL.blood }));
  replies.slice(0, 3).forEach((line, i) => {
    b.addChild(text(`• ${line}`, 6, 14 + i * 25, { width: 382, small: true, color: PAL.ink, maxLines: 2, lineGap: 0 }));
  });
  b.addChild(new Graphics().rect(6, 92, 382, 1).fill(PAL.paperDark));
  b.addChild(text(`BRAND ${save.brand}  /  TRUST ${save.trust}  /  HEAT ${save.heat}`, 6, 100, { small: true, color: PAL.ink }));
  b.addChild(text(`THE PAPERWORK PAID $${(1200 + save.brand * 12).toLocaleString('en-US')}. THE QUOTES COST MORE.`, 6, 114, { width: 382, small: true, color: PAL.slate, maxLines: 2 }));
  b.addChild(button('BACK TO THE OFFICE', 118, 184, 160, 16, () => { win.close(); after(); }, { small: true, fill: PAL.moss, border: PAL.ink }));
}

// ---------------------------------------------------------------- undercard

export function openStoryUndercard(g: Game, save: StorySave, after: () => void): void {
  if (!sideFightReady(save)) {
    alertBox(g, 'Too tired', 'The body is a business expense, and this one is overdrawn. Rest, train, or move the story.');
    return;
  }
  const offers = sideOffers(save);
  const win = openWindow(g, 'THE UNDERCARD', 430, 238, { paper: 'cream' });
  const b = win.body;
  b.addChild(text('NOBODY IS WRITING A CHAPTER ABOUT THESE PEOPLE. THE RENT DOES NOT CARE.', 6, 1, { small: true, color: PAL.blood }));
  offers.forEach((o, i) => {
    const y = 12 + i * 66;
    const bg = box(414, 62, i === 0 ? 0xdad0b2 : 0xd4c9aa, 0xb3a685);
    bg.position.set(0, y);
    b.addChild(bg);
    b.addChild(text(`${o.label}  /  ${o.rounds} ROUNDS  /  ${o.risk}`, 6, y + 3, { small: true, color: o.risk === 'DANGER' ? PAL.blood : o.risk === 'LIVE' ? PAL.ember : PAL.moss }));
    b.addChild(text(`${o.name}  "${o.nick}"`, 6, y + 13, { small: true, color: PAL.ink, width: 270, maxLines: 1 }));
    b.addChild(text(o.blurb, 6, y + 22, { small: true, color: PAL.slate, width: 280, maxLines: 2, lineGap: 0 }));
    b.addChild(text(`PURSE ${money(o.purse)}  /  1TON OVR ${storyOverall(save, 'oneton')} vs ${overall(o.fighter.skills)}`, 6, y + 40, { small: true, color: PAL.ember, width: 300, maxLines: 1 }));
    b.addChild(button('TAKE IT', 314, y + 34, 84, 16, () => {
      sfx('bell');
      win.close();
      startSideFight(g, save, o, after);
    }, { small: true, fill: PAL.rust, border: PAL.ink }));
  });
  b.addChild(button('BACK', 166, 220, 84, 12, () => win.close(), { small: true, fill: PAL.shadow }));
}

function startSideFight(g: Game, save: StorySave, opp: StorySideOpponent, after: () => void): void {
  const player = buildOneTon(save);
  const bout = storyBout(`side_${save.stats.sideFights}`, player, opp.fighter, opp.rounds);
  const seed = (save.seed + save.stats.sideFights * 313 + save.chapter * 61) >>> 0;
  openLiveFight(g, {
    bout, A: player, B: opp.fighter, skills: [player.skills, opp.fighter.skills], player: 0,
    plan: 'balanced', oppPlan: 'balanced', cutTier: 2, seed,
    event: 'THE WAREHOUSE UNDERCARD', judges: ['Marla Cross', 'Dexter Bell', 'Lenny Pratt'], referee: storyVenue('THE WAREHOUSE').referee,
    canvas: storyVenue('THE WAREHOUSE').canvas,
    done: (r) => {
      const rec = recordSideFight(save, opp, {
        winner: r.winner, method: r.method, round: r.round, time: r.time, detail: r.detail,
      }, player.id, opp.fighter.id);
      writeStory(save);
      const won = rec.result === 'W';
      alertBox(g, won ? 'THE UNDERCARD PAYS' : rec.result === 'D' ? 'THE UNDERCARD SHRUGS' : 'THE UNDERCARD COSTS', `${opp.name}: ${rec.result}. ${fightSummary(r)} Payout ${money(won ? opp.purse : Math.round(opp.purse * 0.55))}.`, () => after());
    },
  });
}

export { fightSummary, storyBout };
