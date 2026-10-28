import { describe, it, expect, beforeEach } from 'vitest';
import { content } from './setup';
import {
  buyBackNow, buybackBuzz, buybackCash, canBuyBackNow, changeVenue, checkPhases, newSequelRun,
  skipWeeks, venueOpen, zenithClauses,
} from '../src/sequel/model';
import { availableVenues, currentVenue } from '../src/sequel/model';
import { BUYBACK_BUZZ, BUYBACK_CASH, SEASON_WEEKS, type SeqDeskDoc, type SeqRun } from '../src/sequel/types';
import { claimSeqAchievements, SEQ_ACHIEVEMENTS } from '../src/sequel/achievements';
import { addStoryTrophy, loadStoryTrophy } from '../src/sequel/storysession';
import { setStorage, type KV } from '../src/core/save';
import { Rng } from '../src/core/rng';
import { overall } from '../src/sim/fighters';
import {
  askVisitor, compareFields, delegateDesk, deskCleared, deskFingerprint, docInvalid, docMismatches,
  ensureDesk, flagKey, pendingCount, resolveDoc, takeBribe,
} from '../src/sequel/desk';
import {
  advanceStoryChapter, applyChapterChoice, applyPressAnswer, MAIN_CHAPTERS, buildHan, chapterWeeks, endStoryWeek, fightDue, storyWeek, talkedThisChapter, trainSession, sparSession, gradeFor, storyDate, DAYS_PER_WEEK, movesOf, buildMateoGrown, buildOneTon, chapterFights, chapterReady, STORY_CHAPTERS, finishPressDay, newStorySave,
  pressQuestions, recordSideFight, recordStoryFight, resolveStoryDoc, sideOffers, storyChapter,
  storyCorner, storyDoc, storyEnding, trainOneTon, onetonTurned, storyOverall,
} from '../src/sequel/story';

function memoryKV(): KV {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

beforeEach(() => {
  content();
});

describe('sequel promoter season', () => {
  it('starts a forty-week run in the warehouse', () => {
    const run = newSequelRun(1);
    expect(SEASON_WEEKS).toBe(40);
    expect(run.week).toBe(1);
    expect(run.status).toBe('plan');
    expect(currentVenue(run).id).toBe('warehouse');
    expect(run.roster.length).toBeGreaterThanOrEqual(8);
  });

  it('paces venues with buzz and a licence week', () => {
    const run = newSequelRun(2);
    run.buzz = 100;
    expect(availableVenues(run).map((v) => v.id)).toEqual(['warehouse']);
    expect(changeVenue(run, 5), 'dome is not licensed in week 1').toBeUndefined();
    expect(currentVenue(run).id).toBe('warehouse');

    run.week = 8;
    expect(availableVenues(run).map((v) => v.id)).toContain('vfw');
    expect(availableVenues(run).map((v) => v.id)).not.toContain('theater');
    expect(changeVenue(run, 0), 'warehouse is always open').toBeUndefined();

    run.week = 29;
    run.buzz = 82;
    const open = availableVenues(run).map((v) => v.id);
    expect(open).toContain('dome');
    expect(changeVenue(run, 5)).toBeUndefined();
    expect(currentVenue(run).id).toBe('dome');
    expect(venueOpen(run, availableVenues(run)[0])).toBe(true);
  });

  it('skips up to four weeks and heals a fighter at camp', () => {
    const run = newSequelRun(3);
    const fighter = run.roster[0];
    fighter.injuredUntil = 7;
    const before = run.cash;
    const res = skipWeeks(run, 2, 'medical', fighter.f.id);
    expect(res.ok).toBe(true);
    expect(res.skip?.weeks).toBe(2);
    expect(run.week).toBe(3);
    expect(run.cash).toBeLessThan(before);
    expect(run.stats.skips).toBe(2);
    expect(run.stats.camps).toBe(1);
    expect(fighter.injuredUntil).toBeLessThan(7);
    expect(res.notes.join(' ')).toMatch(/medical/i);
  });

  it('caps a skip at the end of the season', () => {
    const run = newSequelRun(4);
    run.week = 39;
    const res = skipWeeks(run, 99, 'rest');
    expect(res.ok).toBe(true);
    expect(run.week).toBe(SEASON_WEEKS);
    expect(skipWeeks(run, 1, 'rest').ok).toBe(false);
  });

  it('pays the four quarterly bonuses once', () => {
    const run = newSequelRun(5);
    run.cash = 50000;
    run.buzz = 40;
    run.week = 10;
    const notes = checkPhases(run);
    expect(run.flags.phase_1).toBe('won');
    expect(notes.length).toBe(1);
    expect(run.cash).toBe(65000);
    expect(checkPhases(run).length).toBe(0);

    run.cash = 200000;
    run.buzz = 55;
    run.week = 20;
    checkPhases(run);
    expect(run.flags.phase_2).toBe('won');

    run.cash = 500000;
    run.buzz = 70;
    run.stats.sellouts = 1;
    run.week = 30;
    checkPhases(run);
    expect(run.flags.phase_3).toBe('won');

    run.cash = 5000000;
    run.buzz = 85;
    run.week = 40;
    checkPhases(run);
    expect(run.flags.phase_4).toBe('won');
  });

  it('opens the early buyback only after week 34 and ends the run', () => {
    const run = newSequelRun(6);
    run.week = 34;
    run.cash = BUYBACK_CASH + 1;
    run.buzz = BUYBACK_BUZZ;
    expect(canBuyBackNow(run)).toBe(true);
    buyBackNow(run);
    expect(run.status).toBe('ended');
    expect(run.ending).toBe('buyback');

    const early = newSequelRun(7);
    early.week = 33;
    early.cash = BUYBACK_CASH + 1;
    early.buzz = BUYBACK_BUZZ;
    expect(canBuyBackNow(early)).toBe(false);
    buyBackNow(early);
    expect(early.status).toBe('plan');
  });

  it('unlocks and remembers sequel achievements', () => {
    setStorage(memoryKV());
    const run = newSequelRun(8);
    run.stats.shows = 10;
    run.stats.peakCash = BUYBACK_CASH;
    run.status = 'ended';
    run.ending = 'buyback';
    run.week = SEASON_WEEKS;
    const fresh = claimSeqAchievements(run);
    expect(fresh.map((a) => a.id)).toEqual(expect.arrayContaining(['seq_ten_shows', 'seq_end_buyback', 'seq_buyback_ready']));
    expect(claimSeqAchievements(run)).toEqual([]);
    expect(SEQ_ACHIEVEMENTS.every((a) => typeof a.test(run) === 'boolean')).toBe(true);
    expect(SEQ_ACHIEVEMENTS.length).toBe(45);
    expect(new Set(SEQ_ACHIEVEMENTS.map((a) => a.id)).size).toBe(45);
  });
});

describe('sequel desk', () => {
  const weekOne = (seed: number): { run: SeqRun; clean: SeqDeskDoc; trap: SeqDeskDoc } => {
    const run = newSequelRun(seed);
    const docs = run.desk!.docs;
    return { run, clean: docs[0], trap: docs[1] };
  };

  const flag = (run: SeqRun, doc: SeqDeskDoc) => {
    const link = docMismatches(doc)[0];
    const res = compareFields(run, doc.id, link.docKey, link.targetKey);
    return { link, res };
  };

  it('prints the same paperwork for the same seed', () => {
    const a = newSequelRun(21);
    const b = newSequelRun(21);
    expect(deskFingerprint(a)).toBe(deskFingerprint(b));
    expect(deskFingerprint(newSequelRun(22))).not.toBe(deskFingerprint(a));
    expect(a.desk!.docs.length).toBe(2);
    expect(pendingCount(a)).toBe(2);
    expect(deskCleared(a)).toBe(false);
  });

  it('teaches the desk with a clean bout and a tenfold purse', () => {
    const { trap, clean } = weekOne(21);
    expect(clean.type).toBe('bout');
    expect(trap.type).toBe('bout');
    expect(docInvalid(clean)).toBe(false);
    expect(docInvalid(trap)).toBe(true);
    const bad = docMismatches(trap);
    expect(bad.map((l) => l.label)).toEqual(['PURSE']);
    const link = bad[0];
    expect(link.docKey).toBe('doc.purse');
    const value = trap.fields.find((f) => f.key === link.docKey)!.value;
    const truth = trap.targets.find((t) => t.key === link.targetKey)!.value;
    expect(value).toBe(link.bad);
    expect(value).not.toBe(truth);
  });

  it('adds a second and third document as the season opens up', () => {
    const run = newSequelRun(23);
    run.week = 10;
    expect(ensureDesk(run)).toBe(true);
    expect(run.desk!.docs.length).toBe(3);
    run.week = 28;
    expect(ensureDesk(run)).toBe(true);
    expect(run.desk!.docs.length).toBe(4);
    expect(run.desk!.docs.some((d) => d.type === 'zenith')).toBe(true);
    expect(ensureDesk(run), 'same week does not reprint').toBe(false);
  });

  it('records a found discrepancy once, and knows a clean match', () => {
    const { run, clean, trap } = weekOne(22);
    const { link, res } = flag(run, trap);
    expect(res).toMatchObject({ relevant: true, mismatch: true, found: true });
    expect(trap.flagged).toContain(flagKey(link));
    const value = trap.fields.find((f) => f.key === link.docKey)!.value;
    expect(res.text).toContain(value);

    const again = compareFields(run, trap.id, link.docKey, link.targetKey);
    expect(again).toMatchObject({ relevant: true, mismatch: true, found: false });
    expect(trap.flagged.filter((k) => k === flagKey(link)).length).toBe(1);

    const ok = clean.links[0];
    const match = compareFields(run, clean.id, ok.docKey, ok.targetKey);
    expect(match).toMatchObject({ relevant: true, mismatch: false, found: false });

    const nonsense = compareFields(run, clean.id, 'doc.purse', 'doc.bout');
    expect(nonsense.relevant).toBe(false);
  });

  it('rewards a correct denial and punishes a wrong approval', () => {
    const { run, clean, trap } = weekOne(24);
    const good = resolveDoc(run, clean.id, 'approve')!;
    expect(good.correct).toBe(true);
    expect(good.citation).toBeNull();

    const bad = resolveDoc(run, trap.id, 'approve')!;
    expect(bad.correct).toBe(false);
    expect(bad.citation).not.toBeNull();
    expect(bad.citation!.fine).toBeGreaterThan(0);
    expect(run.desk!.misses).toBe(1);
    expect(run.desk!.cites).toBe(1);
    expect(run.desk!.done).toBe(true);
    expect(deskCleared(run)).toBe(true);
  });

  it('warns you for denying valid paper', () => {
    const { run, clean } = weekOne(25);
    const res = resolveDoc(run, clean.id, 'deny')!;
    expect(res.correct).toBe(false);
    expect(res.citation?.warning).toBe(true);
    expect(run.desk!.wrong).toBe(1);
    expect(run.desk!.fines).toBeGreaterThan(0);
  });

  it('pays a perfect week only when every stamp is right', () => {
    const { run, clean, trap } = weekOne(26);
    const cash = run.cash;
    const buzz = run.buzz;
    resolveDoc(run, clean.id, 'approve');
    resolveDoc(run, trap.id, 'deny');
    expect(run.desk!.perfect).toBe(true);
    expect(run.desk!.correct).toBe(2);
    expect(run.desk!.cites).toBe(0);
    expect(run.stats.deskPerfect).toBe(1);
    expect(run.cash).toBe(cash + 300 + (1000 + 50));
    expect(run.buzz).toBe(buzz + 4);

    const missed = weekOne(27);
    resolveDoc(missed.run, missed.clean.id, 'approve');
    resolveDoc(missed.run, missed.trap.id, 'approve');
    expect(missed.run.desk!.perfect).toBe(false);
    expect(missed.run.stats.deskPerfect).toBe(0);
  });

  it('lets a visitor fix the paper for a fee', () => {
    let found: { run: SeqRun; doc: SeqDeskDoc; cash: number; fixCost: number } | null = null;
    for (let seed = 0; seed < 200 && !found; seed++) {
      const { run, trap } = weekOne(28);
      flag(run, trap);
      const cash = run.cash;
      const res = askVisitor(run, trap.id, new Rng(seed));
      if (res?.outcome === 'fix') found = { run, doc: trap, cash, fixCost: trap.fixCost };
    }
    expect(found).not.toBeNull();
    expect(docInvalid(found!.doc)).toBe(false);
    expect(found!.doc.meta.fixed).toBe(1);
    expect(found!.run.cash).toBe(found!.cash - found!.fixCost);
  });

  it('lets a visitor buy the stamp, and leaves a mark', () => {
    let found: { run: SeqRun; doc: SeqDeskDoc; amount: number } | null = null;
    for (let seed = 0; seed < 400 && !found; seed++) {
      const { run, trap } = weekOne(29);
      run.cash = 0;
      flag(run, trap);
      const res = askVisitor(run, trap.id, new Rng(seed));
      if (res?.outcome === 'bribe' && res.amount) found = { run, doc: trap, amount: res.amount };
    }
    expect(found).not.toBeNull();
    const heat = found!.run.heat;
    const res = takeBribe(found!.run, found!.doc.id);
    expect(res.ok).toBe(true);
    expect(found!.run.cash).toBe(found!.amount);
    expect(found!.run.heat).toBe(heat + 6);
    expect(found!.run.desk!.bribes).toBe(1);
    expect(found!.doc.status).toBe('done');
    expect(found!.doc.correct).toBe(false);
  });

  it('keeps a clean visitor clean', () => {
    const { run, clean } = weekOne(30);
    const res = askVisitor(run, clean.id, new Rng(1));
    expect(res?.outcome).toBe('clean');
    expect(res?.line).toBe(clean.askClean);
  });

  it('lets the fixer clear the week, badly and for a fee', () => {
    const { run } = weekOne(31);
    const fee = 900 + 2 * 300;
    const cash = run.cash;
    const res = delegateDesk(run);
    expect(res.ok).toBe(true);
    expect(res.fee).toBe(fee);
    expect(run.desk!.done).toBe(true);
    expect(run.desk!.delegated).toBe(true);
    expect(run.desk!.perfect).toBe(false);
    expect(run.stats.deskDelegated).toBe(1);
    expect(run.cash).toBeLessThan(cash);
    expect(delegateDesk(run).ok).toBe(false);
  });

  it('raises the buyback for every Zenith clause signed', () => {
    const signed = newSequelRun(32);
    signed.week = 28;
    ensureDesk(signed);
    const z = signed.desk!.docs.find((d) => d.type === 'zenith')!;
    const before = buybackCash(signed);
    const res = resolveDoc(signed, z.id, 'approve')!;
    expect(res.correct).toBe(false);
    expect(zenithClauses(signed)).toBe(1);
    expect(buybackCash(signed)).toBe(before + 500_000);
    expect(buybackBuzz(signed)).toBe(BUYBACK_BUZZ + 2);
    expect(signed.flags['zenith_28']).toBe('approve');

    const refused = newSequelRun(33);
    refused.week = 28;
    ensureDesk(refused);
    const z2 = refused.desk!.docs.find((d) => d.type === 'zenith')!;
    const res2 = resolveDoc(refused, z2.id, 'deny')!;
    expect(res2.correct).toBe(true);
    expect(zenithClauses(refused)).toBe(0);
    expect(buybackCash(refused)).toBe(BUYBACK_CASH);
    expect(refused.flags['zenith_28']).toBe('deny');
  });

  it('unlocks the desk achievements from actual paperwork', () => {
    setStorage(memoryKV());
    const { run, clean, trap } = weekOne(34);
    resolveDoc(run, clean.id, 'approve');
    resolveDoc(run, trap.id, 'deny');
    const fresh = claimSeqAchievements(run).map((a) => a.id);
    expect(fresh).toEqual(expect.arrayContaining(['seq_desk_first', 'seq_desk_perfect']));
    expect(fresh).not.toContain('seq_desk_veteran');
    expect(fresh).not.toContain('seq_desk_catcher');
  });
});

describe('sequel story mode', () => {
  /** Play the whole story, winning every fight; at the title, Mateo takes `road`. */
  function playThrough(seed: number, road: 'callout_han' | 'defend_belt', mateoWinsLast = true) {
    const save = newStorySave(seed);
    let guard = 0;
    while (save.status !== 'ended' && guard++ < 40) {
      const ch = storyChapter(save);
      save.flags[`intro_${ch.id}`] = true;
      const doc = storyDoc(save);
      if (doc) {
        const bad = doc.clauses.filter((c) => c.bad).map((c) => c.id);
        expect(resolveStoryDoc(save, doc, bad, 'renegotiate').grade).toBe('A');
      }
      if (save.actionsLeft > 0) {
        for (const q of pressQuestions(save)) applyPressAnswer(save, q.options[0]);
        finishPressDay(save);
      }
      // the TALK has to happen before the chapter can move
      expect(talkedThisChapter(save)).toBe(false);
      save.flags[`talk_${ch.id}`] = true;
      const fightDueOnes = () => {
        for (const def of chapterFights(ch, save)) {
          if (save.flags[`fight_${def.id}`] || !fightDue(save, def)) continue;
          const corner = storyCorner(save, def);
          const last = def.id === 'han_legacy' || def.id === 'defense';
          const winner = last && !mateoWinsLast ? corner.opponent.id : corner.player.id;
          recordStoryFight(save, def, { winner, method: 'KO', round: 2, time: '1:11', detail: 'head kick' }, corner.player.id, corner.opponent.id);
        }
      };
      // live the chapter week by week: train the days, fight on fight week
      for (let w = 0; w < 20 && storyWeek(save) < chapterWeeks(ch); w++) {
        while (save.actionsLeft > 0) {
          const who = onetonTurned(save) ? 'corner' : 'oneton';
          const before = save.actionsLeft;
          trainSession(save, who, 'striking', 'light', 'C');
          if (save.actionsLeft >= before) break;
        }
        fightDueOnes();
        expect(endStoryWeek(save).ok).toBe(true);
      }
      fightDueOnes();
      // the new champion has to pick a road before the story moves
      if (ch.id === 'buyback') {
        expect(chapterReady(save)).toBe(false);
        applyChapterChoice(save, road);
      }
      expect(chapterReady(save)).toBe(true);
      expect(advanceStoryChapter(save)).toBe(true);
    }
    return save;
  }

  it('plays every chapter, through the secret one, to the torch', () => {
    const save = playThrough(11, 'callout_han');
    expect(save.status).toBe('ended');
    expect(storyChapter(save).id).toBe('legacy');
    expect(save.flags.hanInjured).toBe(true);
    expect(save.fights.map((f) => f.id)).toEqual(expect.arrayContaining(['crew_duke', 'crew_rico', 'crew_cesar', 'final', 'han_legacy']));
    expect(save.fights.find((f) => f.id === 'crew_rico')!.player).toBe('han');
    expect(save.fights.find((f) => f.id === 'crew_cesar')!.player).toBe('mateo');
    expect(save.fights.find((f) => f.id === 'final')!.player).toBe('mateo');
    expect(save.fights.some((f) => f.id === 'defense')).toBe(false);
    expect(storyEnding(save).id).toBe('torch');
    expect(save.ending).toBe('torch');
  });

  it('can defend the belt instead, and lose it', () => {
    const save = playThrough(12, 'defend_belt', false);
    expect(save.status).toBe('ended');
    expect(save.fights.some((f) => f.id === 'han_legacy')).toBe(false);
    expect(storyEnding(save).id).toBe('onenight');
  });

  it('ends at the title fight when Mateo loses to 1ton', () => {
    const save = newStorySave(13);
    save.chapter = STORY_CHAPTERS.findIndex((c) => c.id === 'buyback');
    save.week = chapterWeeks(storyChapter(save));
    save.flags.talk_buyback = true;
    const def = storyChapter(save).fight!;
    const corner = storyCorner(save, def);
    recordStoryFight(save, def, { winner: corner.opponent.id, method: 'KO', round: 4, time: '2:02', detail: 'overhand' }, corner.player.id, corner.opponent.id);
    expect(chapterReady(save)).toBe(true);
    advanceStoryChapter(save);
    expect(save.status).toBe('ended');
    expect(storyChapter(save).id).toBe('buyback');
    expect(['house', 'role', 'zenith']).toContain(save.ending);
  });

  it('gives seven days a week; tiers cost days, grades decide the xp, a sim is a C', () => {
    const save = newStorySave(21);
    expect(save.actionsLeft).toBe(DAYS_PER_WEEK);
    expect(gradeFor(65)).toBe('C');
    expect(gradeFor(96)).toBe('S');
    expect(gradeFor(30)).toBe('F');
    trainSession(save, 'oneton', 'striking', 'camp', 'S');
    expect(save.actionsLeft).toBe(4);
    const sXp = save.xp!['oneton.striking'];
    trainSession(save, 'oneton', 'grappling', 'camp', 'C');
    expect(save.xp!['oneton.grappling']).toBeLessThan(sXp);
    expect(save.actionsLeft).toBe(1);
    // not enough days left for a full session
    expect(trainSession(save, 'oneton', 'cardio', 'full', 'A')).toMatch(/Not enough days/);
    expect(save.actionsLeft).toBe(1);
    // fight week can't be skipped; other weeks end and refill the days
    expect(endStoryWeek(save).ok).toBe(true);
    expect(save.actionsLeft).toBe(DAYS_PER_WEEK);
    expect(storyWeek(save)).toBe(2);
  });

  it('sparring works every physical track and costs two days', () => {
    const save = newStorySave(22);
    sparSession(save, 'corner', 'A');
    expect(save.actionsLeft).toBe(DAYS_PER_WEEK - 2);
    for (const t of ['striking', 'grappling', 'cardio']) expect(save.xp![`corner.${t}`]).toBeGreaterThan(0);
  });

  it('teaches a special move for a B or better in sparring, never twice', () => {
    const save = newStorySave(24);
    sparSession(save, 'oneton', 'C');
    expect(movesOf(save, 'oneton')).toEqual([]);
    sparSession(save, 'oneton', 'A');
    expect(movesOf(save, 'oneton')).toEqual(['superman']);
    save.actionsLeft = DAYS_PER_WEEK;
    sparSession(save, 'oneton', 'S');
    expect(movesOf(save, 'oneton')).toEqual(['superman', 'butch']);
    expect(movesOf(save, 'corner')).toEqual([]);
  });

  it('takes 1ton out of the camp after the gold pen and writes his card to 90', () => {
    const signing = STORY_CHAPTERS.findIndex((c) => c.id === 'the_signing');
    const save = newStorySave(4242);
    save.chapter = signing;
    expect(onetonTurned(save)).toBe(false);
    trainSession(save, 'oneton', 'striking', 'light', 'A');
    expect(save.xp!['oneton.striking']).toBeGreaterThan(0);

    // the chapter after the signing: he is Zenith's, not yours
    save.chapter = signing + 1;
    save.actionsLeft = DAYS_PER_WEEK;
    expect(onetonTurned(save)).toBe(true);
    expect(trainSession(save, 'oneton', 'striking', 'light', 'S')).toMatch(/Zenith/);
    expect(sparSession(save, 'oneton', 'S')).toMatch(/Zenith/);
    expect(save.actionsLeft).toBe(DAYS_PER_WEEK);
    expect(storyOverall(save, 'oneton')).toBe(80);

    // by the title fight he is a 90 no matter what the player did with him, or how tired he is
    save.chapter = STORY_CHAPTERS.findIndex((c) => c.id === 'buyback');
    save.training = { striking: 10, grappling: 10, cardio: 10, media: 10 };
    save.fatigue = 100;
    expect(storyOverall(save, 'oneton')).toBe(90);
    save.training = { striking: 0, grappling: 0, cardio: 0, media: 0 };
    save.fatigue = 0;
    expect(storyOverall(save, 'oneton')).toBe(90);
  });

  it('books at least two key fights in every chapter before the crew', () => {
    for (const id of ['mexican_math', 'allstar', 'brick_by_brick', 'sparring_partner', 'audit', 'the_signing', 'brother']) {
      const ch = STORY_CHAPTERS.find((c) => c.id === id)!;
      expect(chapterFights(ch).length, id).toBeGreaterThanOrEqual(2);
    }
    expect(chapterFights(STORY_CHAPTERS.find((c) => c.id === 'street_justice')!).length).toBe(3);
  });

  it('has fifteen chapters of five parts (and the secret one)', () => {
    expect(MAIN_CHAPTERS).toBe(15);
    expect(STORY_CHAPTERS.length).toBe(16);
    expect(STORY_CHAPTERS.map((c) => c.no)).toEqual(STORY_CHAPTERS.map((_, i) => i + 1));
    expect(STORY_CHAPTERS.map((c) => c.id)).toEqual([
      'back_row', 'mexican_math', 'allstar', 'brick_by_brick', 'sparring_partner', 'audit',
      'the_signing', 'brother', 'the_wake', 'street_justice', 'homecoming', 'the_board',
      'rematch', 'the_camp', 'buyback', 'legacy',
    ]);
  });

  it('kills Ray at the end of chapter eight and puts the crew after the funeral', () => {
    const ids = STORY_CHAPTERS.map((c) => c.id);
    expect(ids.indexOf('brother')).toBe(7);
    expect(STORY_CHAPTERS[7].no).toBe(8);
    expect(ids.indexOf('the_wake')).toBe(8);
    expect(ids.indexOf('street_justice')).toBe(9);
    const save = newStorySave(31);
    save.chapter = ids.indexOf('brother');
    save.week = chapterWeeks(storyChapter(save));
    save.flags.talk_brother = true;
    for (const f of chapterFights(storyChapter(save))) save.flags[`fight_${f.id}`] = true;
    expect(chapterReady(save)).toBe(true);
    expect(save.flags.rayDead).toBeFalsy();
    advanceStoryChapter(save);
    expect(save.flags.rayDead).toBe(true);
    expect(storyChapter(save).id).toBe('the_wake');
  });

  it('gives Mateo and 1ton the fights after Ray dies, never Dane', () => {
    const find = (id: string) => STORY_CHAPTERS.find((c) => c.id === id)!;
    for (const id of ['homecoming', 'the_board', 'rematch', 'the_camp', 'buyback', 'legacy']) {
      const fights = chapterFights(find(id));
      expect(fights.length, id).toBeGreaterThan(0);
      for (const f of fights) expect(['mateo', 'oneton', 'han']).toContain(f.player);
    }
    expect(chapterFights(find('homecoming')).every((f) => f.player === 'mateo')).toBe(true);
    expect(chapterFights(find('the_board')).find((f) => f.id === 'han_spadam')!.player).toBe('mateo');
    expect(chapterFights(find('the_board')).find((f) => f.id === 'chairman')!.player).toBe('oneton');
    expect(chapterFights(find('rematch')).find((f) => f.id === 'cuchillo_rematch')!.player).toBe('mateo');
    expect(chapterFights(find('buyback'))[0].player).toBe('mateo');
  });

  it('runs the story over a few years of calendar', () => {
    const save = playThrough(23, 'callout_han');
    expect(storyDate(save)).toMatch(/^YEAR [3-9]/);
  });

  it('brings Han back at 95 overall, a middleweight; Dane never fights', () => {
    const save = newStorySave(14);
    const han = buildHan(save);
    expect(han.division).toBe('middle');
    expect(overall(han.skills)).toBeGreaterThanOrEqual(95);
    expect(STORY_CHAPTERS.flatMap((c) => chapterFights(c)).some((f) => (f.player as string) === 'dane')).toBe(false);
    const mateo = buildMateoGrown(save);
    expect(mateo.division).toBe('lightheavy');
    expect(mateo.look.build).toBe(2);
    expect(mateo.look.tattoo).toBe(3);
  });

  it('grades a paper correctly and remembers the grade', () => {
    const save = newStorySave(12);
    const doc = storyDoc(save)!;
    const bad = doc.clauses.filter((c) => c.bad).map((c) => c.id);
    const good = resolveStoryDoc(save, doc, bad, 'renegotiate');
    expect(good.grade).toBe('A');
    expect(save.flags[`doc_${storyChapter(save).id}`]).toBe('A');
    expect(storyDoc(save)).toBeNull();

    const save2 = newStorySave(13);
    const doc2 = storyDoc(save2)!;
    const badDeal = resolveStoryDoc(save2, doc2, [], 'sign');
    expect(badDeal.grade).toBe('F');
    expect(save2.cash).toBeLessThan(24000);
  });

  it('runs an undercard fight and pays a purse', () => {
    const save = newStorySave(14);
    const offer = sideOffers(save)[0];
    const player = buildOneTon(save);
    const cash = save.cash;
    const rec = recordSideFight(save, offer, {
      winner: player.id, method: 'SUB', round: 1, time: '2:22', detail: 'armbar',
    }, player.id, offer.fighter.id);
    expect(rec.result).toBe('W');
    expect(save.stats.sideWins).toBe(1);
    expect(save.cash).toBe(cash + offer.purse);
    expect(save.fatigue).toBeGreaterThan(0);
  });

  it('keeps story trophies between playthroughs', () => {
    setStorage(memoryKV());
    const save = newStorySave(15);
    save.status = 'ended';
    save.ending = 'buyback';
    save.chapter = 8;
    const trophy = addStoryTrophy(save);
    expect(trophy.endings.length).toBe(1);
    expect(loadStoryTrophy().playthroughs).toBe(1);
  });

  it('remembers the secret chapter once it is reached', () => {
    setStorage(memoryKV());
    const save = newStorySave(16);
    save.status = 'ended';
    save.ending = 'torch';
    save.chapter = MAIN_CHAPTERS;
    expect(addStoryTrophy(save).secret).toBe(true);
    expect(loadStoryTrophy().secret).toBe(true);

    setStorage(memoryKV());
    const early = newStorySave(17);
    early.status = 'ended';
    early.ending = 'buyback';
    early.chapter = 8;
    expect(addStoryTrophy(early).secret).toBe(false);
  });
});

describe('the phone', () => {
  it('rings once a week, posts once a week, and the plug costs money (and sometimes heat)', async () => {
    const { ownerForRun, callThisWeek, answerCall, bleetedThisWeek, postBleet, BLEETS, plugOffers, buyFromPlug } = await import('../src/sequel/phone');
    const run = newSequelRun(51);
    const o = ownerForRun(run, 'Riley Poirier');
    const call = callThisWeek(o)!;
    expect(call).toBeTruthy();
    answerCall(o, call, 0);
    expect(callThisWeek(o)).toBeNull();
    const buzz = run.buzz;
    postBleet(o, BLEETS[0]);
    expect(bleetedThisWeek(o)).toBe(true);
    expect(run.buzz).toBeGreaterThanOrEqual(buzz);
    const offer = plugOffers(o).find((x) => x.price > 0)!;
    const cash = run.cash;
    const heat = run.heat;
    const res = buyFromPlug(o, offer, 0); // 0 = always caught
    expect(res.ok).toBe(true);
    expect(run.cash).toBeLessThan(cash + (offer.fx.cash ?? 0) + 1);
    expect(run.heat).toBeGreaterThanOrEqual(Math.min(100, heat + (offer.fx.heat ?? 0)));
    expect(buyFromPlug(o, offer, 1).ok).toBe(false); // once a week
  });
});

describe('grudges, Zenith nights and the broadcast', () => {
  it('turns a rematch into a grudge match with bigger purses and its own presser', async () => {
    const { isGrudge, mainGrudge } = await import('../src/sequel/rivals');
    const { project, runShow, beginNextWeek, ensureCard } = await import('../src/sequel/model');
    const { presserFor } = await import('../src/sequel/presser');
    const run = newSequelRun(61);
    ensureCard(run);
    run.desk.done = true;
    const pair = { ...run.card.bouts[0] };
    const before = project(run).purses;
    runShow(run);
    expect(isGrudge(run, pair.a, pair.b)).toBe(true);
    run.event = null;
    beginNextWeek(run);
    run.card.bouts = [pair];
    run.desk.done = true;
    expect(mainGrudge(run)).toBeTruthy();
    expect(presserFor(run)!.question.id).toBe('grudge');
    expect(project(run).purses).toBeGreaterThan(Math.round(before / Math.max(1, 2)) - 1);
  });

  it('books Zenith against you on some Saturdays, and a broadcast pays', async () => {
    const { zenithCounter, rateBroadcast, airBroadcast } = await import('../src/sequel/rivals');
    const { runShow, ensureCard } = await import('../src/sequel/model');
    const run = newSequelRun(62);
    let nights = 0;
    for (let w = 6; w <= 40; w++) {
      run.week = w;
      if (zenithCounter(run)) nights++;
    }
    expect(nights).toBeGreaterThan(2);
    expect(nights).toBeLessThan(30);
    run.week = 3;
    ensureCard(run);
    run.desk.done = true;
    runShow(run);
    const cash = run.cash;
    const r = airBroadcast(run, { booth: 'hype', camera: 'tv', replay: 0, cut: 'full' });
    expect(r.viewers).toBeGreaterThan(0);
    expect(run.cash).toBe(cash + r.cash);
    expect(rateBroadcast(run, { booth: 'chaos', camera: 'side', replay: 0, cut: 'highlights' }).viewers).toBeGreaterThan(0);
  });
});

describe("Ray's notebook and the Legacy Tapes", () => {
  it('fills pages from what the story has done, and unlocks tapes from pages', async () => {
    setStorage(memoryKV());
    const { unlockPages, notebookPages, PAGES, notebookComplete } = await import('../src/sequel/notebook');
    const { TAPES, tapeUnlocked, tapeFighter } = await import('../src/sequel/tapes');
    const save = newStorySave(71);
    expect(unlockPages(save)).toEqual([]);
    save.flags.beat_first_day = true;
    save.flags.beat_xavier_league = true;
    expect(unlockPages(save).map((p) => p.id).sort()).toEqual(['first_day', 'xavier']);
    expect(notebookPages()).toContain('xavier');
    expect(tapeUnlocked(TAPES.find((t) => t.id === 'xavier')!, false)).toBe(true);
    expect(tapeUnlocked(TAPES.find((t) => t.id === 'alberto')!, false)).toBe(false);
    expect(notebookComplete()).toBe(false);
    expect(PAGES.length).toBeGreaterThanOrEqual(16);
    // every fighter a tape books is real, and every scene's cast exists
    for (const t of TAPES) for (const s of t.steps) {
      if (s.kind === 'fight') for (const k of [s.player, s.opponent]) expect(tapeFighter(k).first, `${t.id} ${k}`).toBeTruthy();
      else for (const a of s.cast) if (a.fighter) expect(tapeFighter(a.fighter).id).toBeTruthy();
    }
  });
});

describe('your creations in promoter mode', () => {
  it('walk in as free agents once, and sign like anybody else', async () => {
    const { offerCustomFighters, isCustom } = await import('../src/sequel/custom');
    const { newSequelRun, signFreeAgent } = await import('../src/sequel/model');
    const run = newSequelRun(12);
    const mine = JSON.parse(JSON.stringify(run.freeAgents[run.freeAgents.length - 1]));
    mine.id = 'cus_test';
    mine.first = 'Testy';
    expect(offerCustomFighters(run, [mine])).toBe(1);
    expect(run.freeAgents[0].id).toBe('cus_test');
    expect(isCustom(run, 'cus_test')).toBe(true);
    expect(offerCustomFighters(run, [mine])).toBe(0);
    run.cash = 1e7;
    expect(signFreeAgent(run, 'cus_test')).toContain('Testy');
    expect(run.roster.some((x) => x.f.id === 'cus_test')).toBe(true);
    // released or signed, he doesn't come back as a free agent on his own
    expect(offerCustomFighters(run, [mine])).toBe(0);
  });
});

describe('the theatre and the album', () => {
  it('remembers a scene as a recipe and rebuilds it the way it played', async () => {
    setStorage(memoryKV());
    const { remember, reels } = await import('../src/sequel/theatre');
    const { reelScene } = await import('../src/ui/sequel/theatreui');
    const { chapterOutro } = await import('../src/ui/scenes/storycuts');
    const save = newStorySave(31);
    save.chapter = STORY_CHAPTERS.findIndex((c) => c.id === 'brother');
    remember(save, 'outro', 'THE BROTHER YOU MADE');
    remember(save, 'outro', 'THE BROTHER YOU MADE');
    expect(reels()).toHaveLength(1);
    const again = reelScene(reels()[0])!;
    expect(again.choices).toBeUndefined();
    expect(again.shots.map((s) => s.lines.map((l) => l.text))).toEqual(chapterOutro(save).shots.map((s) => s.lines.map((l) => l.text)));
    // the demo doesn't fill the shelf
    save.flags.demo = true;
    remember(save, 'intro', 'X');
    expect(reels()).toHaveLength(1);
  });

  it('keeps the newest photo of a moment', async () => {
    setStorage(memoryKV());
    const { addPhoto, photos } = await import('../src/sequel/photos');
    addPhoto({ id: 'last_sunday', title: 'THE LAST SUNDAY', data: 'data:a', taken: 1 });
    addPhoto({ id: 'last_sunday', title: 'THE LAST SUNDAY', data: 'data:b', taken: 2 });
    expect(photos()).toEqual([{ id: 'last_sunday', title: 'THE LAST SUNDAY', data: 'data:b', taken: 2 }]);
  });
});

describe('the story in promoter mode', () => {
  it('sends the story characters in as free agents after a finished story, once', async () => {
    const { offerLegacyFighters, legacyFAOf, LEGACY_FAS } = await import('../src/sequel/legacyfa');
    const { newSequelRun } = await import('../src/sequel/model');
    const run = newSequelRun(14);
    expect(offerLegacyFighters(run, false)).toBe(0);
    expect(offerLegacyFighters(run, true)).toBe(LEGACY_FAS.length);
    expect(offerLegacyFighters(run, true)).toBe(0);
    const han = run.freeAgents.find((f) => legacyFAOf(run, f.id)?.key === 'han')!;
    expect(han.last).toBe('Tibular');
    // nobody's id clashes with anybody already in the promotion
    const ids = [...run.roster.map((x) => x.f.id), ...run.freeAgents.map((f) => f.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("Juiced Butler's week in review", () => {
  it('talks about the week that actually happened', async () => {
    const { radioPromoter, radioStory } = await import('../src/sequel/radio');
    const { newSequelRun } = await import('../src/sequel/model');
    const run = newSequelRun(5);
    expect(radioPromoter(run, 'DANE').map((l) => l.text).join(' ')).toContain('No show last week');
    run.lastShow = { week: 3, venue: 0, gimmick: '', ad: 0, results: [{ aName: 'Rico Ruiz', bName: 'Bo Kane', winner: 'a', method: 'KO', round: 2, finish: true } as never], gate: 9000, stream: 0, merch: 0, sponsor: 0, purses: 0, costs: 0, net: 0, fill: 1.03, buzzBefore: 10, buzzAfter: 20, heatBefore: 0, heatAfter: 10, lockerBefore: 0, lockerAfter: 0, headline: '', body: '', notes: [], raided: false };
    const said = radioPromoter(run, 'DANE').map((l) => l.text).join(' ');
    expect(said).toContain('Rico Ruiz, KO, round 2');
    expect(said).toContain('Sold out');
    const save = newStorySave(3);
    const story = radioStory(save, ['1TON full striking: grade A, +14 xp.', 'PRESS DAY: three questions.']).map((l) => l.text).join(' ');
    expect(story).toContain('an A in training');
    expect(story).toContain('Press day');
  });
});

describe('NEW GAME+: the kid at the door', () => {
  it('opens only after the torch ending, and the kid gets better fight by fight', async () => {
    setStorage(memoryKV());
    const { TAPES, tapeUnlocked, tapeFighter } = await import('../src/sequel/tapes');
    const { overall: ovr } = await import('../src/sim/fighters');
    const kid = TAPES.find((t) => t.id === 'kid')!;
    expect(tapeUnlocked(kid, true)).toBe(false);
    const save = newStorySave(8);
    save.ending = 'torch';
    addStoryTrophy(save);
    expect(tapeUnlocked(kid, true)).toBe(true);
    const ovrs = [1, 2, 3, 4].map((n) => ovr(tapeFighter(`kid${n}`).skills));
    expect([...ovrs].sort((a, b) => a - b)).toEqual(ovrs);
    expect(ovrs[3]).toBeGreaterThan(ovrs[0] + 10);
  });
});
