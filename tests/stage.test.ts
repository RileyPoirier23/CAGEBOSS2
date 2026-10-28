/**
 * CINE II's stage directions: what the narration says happens, the actors do.
 */
import { describe, it, expect } from 'vitest';
import { content } from './setup';
import { readStage, type StageCtx } from '../src/ui/sequel/stage';
import { STORY_CHAPTERS, newStorySave } from '../src/sequel/story';
import { chapterIntro, chapterOutro } from '../src/ui/scenes/storycuts';

const fresh = (speaker: string | null = null): StageCtx => ({ speaker, subject: speaker, object: null });

describe('stage directions from narration', () => {
  it('the tryout: he takes off the blazer, walks up to the heckler, and one punch puts him down', () => {
    const cast = [{ id: 'dane', name: 'DANE' }, { id: 'oneton', name: '1TON' }, { id: 'promoter', name: 'A DRUNK HECKLER' }];
    const ctx = fresh('oneton');
    expect(readStage('He takes off his blazer, folds it twice, and steps into the cage. The heckler is a large man. Was.', cast, ctx)).toEqual([
      { do: 'strip', who: 'oneton' },
      { do: 'walk', who: 'oneton', to: 'promoter', x: undefined, gap: 40 },
    ]);
    expect(readStage('One punch. The folding chair does not move. The heckler does.', cast, ctx)).toEqual([
      { do: 'strike', who: 'oneton', target: 'promoter', pose: 'cross', ko: true },
    ]);
  });

  it('she is the woman in the shot; memories, crowds and people who are not there do nothing', () => {
    const tape = [{ id: 'alberto', name: 'ALBERTO' }, { id: 'abuela', name: 'THE ABUELA', female: true }];
    expect(readStage('She hits him with her handbag.', tape, fresh('alberto'))[0]).toMatchObject({ do: 'strike', who: 'abuela', target: 'alberto' });
    const home = [{ id: 'ray', name: 'UNCLE RAY' }, { id: 'han', name: 'HAN' }, { id: 'tyler', name: 'TYLER VANCE' }];
    expect(readStage('He stands in the ring where Butch hit him and laughs.', home, fresh('ray')).some((a) => a.do === 'strike')).toBe(false);
    expect(readStage('In the stands, Gordon Vance stands up. He claps.', home, fresh('tyler'))).toEqual([]);
    expect(readStage('Nobody is celebrating.', home, fresh('han'))).toEqual([]);
    expect(readStage('He does not throw it away either.', home, fresh('han'))).toEqual([]);
    expect(readStage("He doesn't throw it away either. He won't sit down.", home, fresh('han'))).toEqual([]);
    // two of them at once
    expect(readStage('Han and Tyler sit on the apron.', home, fresh()).filter((a) => a.do === 'pose').map((a) => a.do === 'pose' && a.who)).toEqual(['han', 'tyler']);
  });

  it('every story scene reads without falling over, and only names people who are in the shot', () => {
    content();
    let acted = 0;
    STORY_CHAPTERS.forEach((_, i) => {
      const save = newStorySave(5);
      save.chapter = i;
      for (const sc of [chapterIntro(save), chapterOutro(save)]) for (const sh of sc.shots) {
        const ids = new Set(sh.cast.map((a) => a.id));
        const ctx = fresh();
        for (const ln of sh.lines) {
          if (ln.who) {
            ctx.speaker = ctx.subject = ln.who;
            continue;
          }
          if (ln.poses || ln.act) continue;
          for (const a of readStage(ln.text, sh.cast.map((c) => ({ id: c.id, name: c.name })), ctx)) {
            acted++;
            if ('who' in a) expect(ids.has(a.who), ln.text).toBe(true);
            if ('target' in a) expect(ids.has(a.target), ln.text).toBe(true);
          }
        }
      }
    });
    expect(acted).toBeGreaterThan(10);
  });
});

describe('the parts of Tales of Legacy', () => {
  it('every part after the intro has a scene, and everyone in it is in the room', async () => {
    content();
    const { PARTS } = await import('../src/ui/scenes/storycuts');
    const { PART_LINES } = await import('../src/ui/scenes/partlines');
    const idOf: Record<string, string> = { verity: 'zenith', bigmateo: 'mateo' };
    let scenes = 0;
    for (const [ch, parts] of Object.entries(PARTS)) {
      parts.forEach((p, i) => {
        const rows = PART_LINES[ch]?.[i];
        if (!p.text) return;
        expect(rows?.length ?? 0, `${ch} part ${i + 1}`).toBeGreaterThan(1);
        const ids = new Set(p.who.map((w) => idOf[w] ?? w));
        for (const [who, , act] of rows ?? []) {
          if (who) expect(ids.has(who), `${ch} part ${i + 1}: ${who}`).toBe(true);
          for (const a of act ?? []) {
            if ('who' in a) expect(ids.has(a.who), `${ch} part ${i + 1}: ${a.who}`).toBe(true);
            if ('target' in a) expect(ids.has(a.target), `${ch} part ${i + 1}: ${a.target}`).toBe(true);
          }
        }
        scenes++;
      });
    }
    expect(scenes).toBeGreaterThan(60);
  });
});

describe('establishing shots', () => {
  it('reads the scene a line sets', async () => {
    const { sceneryTags } = await import('../src/ui/sequel/scenery');
    expect(sceneryTags('A barn outside Moncton. Bleachers for six hundred, a cage Xavier won in a card game and a goat called Commissioner Pete.')).toEqual(['bleachers', 'goat']);
    expect(sceneryTags('Moncton. Main Street in the rain.')).toEqual(['neon', 'rain']);
    expect(sceneryTags('The fortieth floor. Glass on three sides. The city very small underneath.')).toContain('skyline');
    expect(sceneryTags('Shediac wharf. Twelve years ago. A boat called the MARIE-ANNE.')).toEqual(['sea']);
    expect(sceneryTags('1ton is on his stool.')).toEqual([]);
  });
});

describe('the story holds together', () => {
  it('every chapter opens and closes on its own scenes, and Ray is only a memory after chapter 8', async () => {
    content();
    const C = await import('../src/ui/scenes/storycuts');
    const first = (sc: { shots: { lines: { text: string }[] }[] }) => sc.shots[0]?.lines[0]?.text;
    const save0 = newStorySave(5);
    save0.chapter = 0;
    const backRowIntro = first(C.chapterIntro(save0));
    const backRowOutro = first(C.chapterOutro(save0));
    const dead = STORY_CHAPTERS.findIndex((c) => c.id === 'brother');
    STORY_CHAPTERS.forEach((ch, i) => {
      const save = newStorySave(5);
      save.chapter = i;
      const intro = C.chapterIntro(save);
      const outro = C.chapterOutro(save);
      if (i > 0) {
        expect(first(intro), `${ch.id} intro`).not.toBe(backRowIntro);
        expect(first(outro), `${ch.id} outro`).not.toBe(backRowOutro);
      }
      if (i <= dead) return;
      const scenes = [intro, outro, C.talkScene(save), ...[1, 2, 3, 4, 5].map((p) => C.partScene(save, p))];
      for (const sc of scenes) for (const sh of sc?.shots ?? []) {
        if (sh.flashback) continue;
        expect(sh.cast.some((a) => a.id === 'ray'), `${ch.id}: Ray in a present-day cast`).toBe(false);
        expect(sh.lines.some((l) => l.who === 'ray'), `${ch.id}: Ray speaking in the present`).toBe(false);
      }
    });
  });
});
