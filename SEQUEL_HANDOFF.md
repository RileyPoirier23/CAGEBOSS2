# CAGE BOSS II: handoff log

Read `SKILLS.md` first. This file is the shared memory between assistants: **what state the sequel is in, what's
broken, and what to do next.** Add an entry to the turn log every turn (newest on top) and update the to-do list.

---

## Turn log

### Turn 2: Claude (2026-10-27)
Riley's asks this turn: run the sequel as its own exe; review OpenCode's work; write SKILLS.md and notes; overhaul
the cutscenes, animation, blood and bruising, fighter models and fight screen so they don't look like game 1;
make the stories follow game 1; Dane shouldn't fight; bring Han back; promoter mode needs WATCH and pressers;
text overflowing its boxes, with no way to read cut text; a full game needs its own loading screens and menus;
Han's chapter 9 injury, Mateo vs 1ton, the call-out-Han secret boss or a belt defense; and customization and
tattoos overhauled to match new, more realistic models.

Done:
- **Separate exe.** `sequel.html` + `src/sequel-main.ts` + `vite.sequel.config.ts` + `electron/sequel.cjs` +
  `electron-builder.sequel.json` and the npm scripts `dev:sequel`, `build:sequel`, `desktop:sequel` and
  `dist:sequel:win[:setup]`. Own app name, so saves are separate. The sequel billboard and Modes button were removed
  from game 1 (`title.ts` and `modes.ts` are back to their committed state). Sequel end screens' MAIN MENU goes to
  the sequel title, and the title has SETTINGS and QUIT when standalone.
- **II UI theme** (`src/ui/theme.ts`): chamfered steel buttons with a coloured edge and a sodium hover line,
  glass panels for `box({ bevel: true })`, and a hazard-stripe window title bar. Game 1 is untouched (`classic`).
- **New loading screen** (`src/ui/sequel/loading2.ts`): the warehouse at night, a backlit shadowboxer in the
  doorway, rain, 40 week-segments, sequel tips.
- **CINE II cutscene player** (`src/ui/sequel/cine.ts`), used by all of story mode and the presser: speaker
  framing camera, per-room grade, key light, light shafts and dust, rim light, long cast shadows, pose blending,
  breathing, talking hands, a real walk cycle, a live speaker close-up in the subtitle bar, an animated title
  card, typed lower-third captions, grain and gate weave, and fades. Same `Cutscene` data as game 1.
- **Promoter mode: WATCH.** Each bout keeps its tape on `lastShow` (`SeqBoutResult.replay`), and the show screen
  has `> WATCH` per bout (`src/ui/sequel/watchfight.ts`): full arena replay, broadcast strip, speed 1/2/4x, skip.
- **Promoter mode: Thursday PRESSER** before every show (`src/sequel/presser.ts` + `src/ui/sequel/presser2.ts`):
  8 questions (1ton, a Zenith plant, the local paper), 3 answers each, buzz/heat/locker effects.
- **Matchmaking bug:** women were being booked against men. `pickOpponent`/`cycleOpponent` now filter by
  `presentedGender`. The sim now uses the real ticker templates (the play-by-play was showing raw keys).
- **Story rewrite to Riley's spec** (`src/sequel/story.ts`, `storycuts.ts`, `sequelstory.ts`): Dane never fights;
  Han Tibular (95 OVR middleweight) returns in ch3 and fights Dane's old fights; his knee goes in ch9 after Rico;
  grown Mateo (LHW, build 2, tattoo 3, chain, koi) fights Cesar and then 1ton for the LHW title; the mic choice
  leads to secret ch11 (`han_legacy` boss or `defense`); 4 new endings (`torch`, `student`, `champion`,
  `onenight`); "Ray Whyte" is now Uncle Ray; ch9 outros only play after the last of its three fights; the corner's
  camp button reads HAN, then MATEO.
- **Text:** truncated text is tap-to-read-all in the sequel (`setTextExpander` + `src/ui/sequel/readmore.ts`). The
  story hub notebook no longer spills onto the MENU button. `→` renders as `>`.
- Fixed OpenCode's typecheck error (`chain: true` → `1`) and the outdated story test. Tests now play both roads.
- Read OpenCode's session export; findings are in §Notes on OpenCode's first session below.

Not done (see the to-do list): the realistic model/rig overhaul, blood and bruising, character customization and
tattoos, the fight HUD/controls layout, restyling every remaining screen, a sequel icon, and a packaged exe test.

### Turn 1: OpenCode (deepseek-v4.1-flash-free), ended by the free-tier limit
Built the sequel inside game 1 over 7 requests: the 40-week promoter roguelite (venues, gimmicks, cards, camps and
time skips, belts, quarters, Zenith clauses), the Papers-Please desk, after-show events, achievements, a 9- then
10-chapter story mode with 1ton as the trainee who turns, contract reviews, press days, an undercard, Ray's death
and the crew fights, a `mask` on the rig and `presentedGender`. It hit the usage limit right after Riley's
"overhaul the cutscenes" request, so that request was never started.

---

## To-do (priority order)

### P1: the visual overhaul Riley asked for (not started, except the cutscenes)
1. **Blood and bruising.** `Look2.wear` (`src/ui/rig.ts`, around lines 669 and 981) is one cut, one swell and one
   blood line. Add a sequel-only `Look2.marks` (per-zone bruises that age purple → green → yellow, a shut eye per
   side, a broken nose, a split lip, blood running down the face and chest, rib and thigh bruising from body and
   leg kicks, drips). Feed it from the live engine's per-part damage in `livefight.ts` and from `FightResult.damage`
   in `watchfight.ts`, and let cutscene actors carry marks after fights (the outros should show the damage).
   The arena already leaves blood stains on the canvas (`arena.ts` around line 3160); make them heavier under II.
2. **More realistic character models.** The rig is a 13-joint stick rig drawn with polys at ~1.3 scale. Under
   `isII()`, add muscle shading (pecs, delts, abs and quad lines by `build`), proper hands and feet, ears, hair
   strands, a two-tone skin light, and a bigger head-to-body ratio for cutscenes. Mateo has to read as **jacked
   and tatted**. Keep game 1's look when classic.
3. **Character customization and tattoos.** `src/ui/scenes/editor_fighter.ts` and `Look`. A sequel creator with
   sliders for build, frame and height, per-zone tattoo slots (sleeves L/R, chest, back, neck, knuckles, script)
   with designs, colours and fade, scars, hair and beard. It should match the new models.
4. **Fight screen layout and controls (II).** `openLiveFight` takes options. Add `theme: 'ii'` so it draws a
   broadcast HUD (name plates and health/gas segments over the arena, the body-damage silhouette, the clock centre
   top), bigger move prompts, damage flashes, slow motion on knockdowns and a cleaner touch pad. Keep the
   controls in `src/core/fightinput.ts`. Story fights in `sequelstory.ts` (`openLiveFight` around lines 292 and
   616) and `watchfight.ts` should use it.
5. **Remaining screens in II style.** The hub, desk, show, end, story hub, trophies and title still hard-code
   `PAL.*` panel colours. Move them to `II.*` and give the title screen a proper sequel layout (animated
   warehouse, a logo lockup, a menu column).

### P2: story and content
6. In ch4–8, Mateo is still drawn with `CAST.mateo` (the 12-year-old in the hoodie). He's 19 there: give him a
   teen look, and use `bigMateo` from ch9 on.
7. Han is in ch3, ch7, ch8 and ch9–11. Consider a beat with him in ch4–6 (he's the gym's champion; he'd be
   around), and a cameo for Tyler Vance mopping, Xavier's league and Zac's Tuesday class.
8. Achievements for the four new endings (`src/sequel/achievements.ts`, the story category) and for the secret
   chapter. `storyend.ts` shows ranks; check that `torch` (S) displays right.
9. Balance: Han (95) makes ch3/ch7/ch9 easy, which suits a power fantasy until the knee goes. Check 1ton's final
   overall against Mateo's (both roughly 75–85 with training) with `npm run sequel-sim` or a story sim.
10. The presser in story mode (`openStoryPress`) still uses the old window UI. Move it to `playCine` like the
    promoter presser.
11. WATCH could use the booth: `src/sim/commentary.ts` (`commentate`, Juiced Butler) is what game 1 uses on
    broadcasts.

### P3: shipping
12. A sequel icon (`build/icon.ico` is game 1's) and the `stamp-exe` step for the sequel exe.
13. Test `npm run dist:sequel:win` end to end on Windows (not run yet).
14. **Move the project out of `%TEMP%` and commit it.** Nothing from either assistant is committed.

## Known issues
- **Game 1 test failing:** `tests/fighter.test.ts` "the whole road" fails because OpenCode changed six welterweights
  from `gender: "W"` to `"M"` in `data/roster/ranked.json`. The data fix is correct, but it reshuffles the seeded
  Road To Champion run. Either re-seed or adjust that test, or revert the JSON (`presentedGender` already fixes the
  visuals). This is Riley's call because it's game 1 data.
- `Look2.mask` and `presentedGender` changes touch game 1's shared files (`rig.ts`, `sprites.ts`, `arena.ts`,
  `editor_fighter.ts`). They're harmless for game 1, but they are game 1 changes.
- In promoter mode the WATCH tape is snapshotted after the records update, so the walkout record is off by the
  result. Cosmetic.

## Notes on OpenCode's first session (from Riley's export)
- It worked from 15 context compactions. Each summary kept the requirements but lost details, which is why the
  comments drifted ("twenty weeks" next to `SEASON_WEEKS = 40`, "nine chapters" with ten).
- It deliberately reused game 1's cutscene player and live fight "to avoid touching the engine deeply". That's why
  the sequel looked like game 1.
- It made Dane fight because "it's easiest to create Dane as a standalone Fighter". That was a shortcut, not a
  story choice. Its research of game 1 was a feature checklist (watch every fight, pressers, the booth, Bleeter,
  Legacy, weight-class move-ups). It never read Han's story, so it invented "Ray Whyte".
- It planned the separate exe and a game 1 demo (sequel.html with a flag) but deprioritized both for the desk.
