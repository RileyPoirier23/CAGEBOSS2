# CAGE BOSS II: handoff log

Read `SKILLS.md` first. This file is the shared memory between assistants: **what state the sequel is in, what's
broken, and what to do next.** Add an entry to the turn log every turn (newest on top) and update the to-do list.

---

## Turn log

### Turn 12: OpenCode (2026-10-27)
Finished the post-humanizer pass and the story lock:
- **1ton is out of the camp after the gold pen.** `onetonTurned(save)` is true from chapter 8 on; TRAIN and SPAR refuse him, the camp window drops the 1TON tab and defaults to the corner. His OVR is written to the story target after fatigue (`ONETON_TURNED_OVR`, 80 at chapter 8 to 90 at chapter 15), so earlier training and fatigue cannot change the final number.
- **Chapter order after Ray's death** is homecoming (Moncton tribute; Mateo vs Lobster and Mateo vs Tyler on one card), the_board (funeral debt and foreclosure; Mateo vs Spadam, 1ton vs Chairman), rematch (Cuchillo at light heavyweight; Mateo vs Cuchillo, Han on crutches). The intros, outros, part scenes and outro choices in `storycuts.ts` and `partlines.ts` were rewritten to match. The signing outro's duplicate choice ids are now `call_him` / `let_go`.
- **The II fight HUD no longer collides with the arena.** An opaque full-width top scoreboard band covers the old names, HP bars and clock, the crowd signs moved below it, the lower stats strap and engine-ticker fallback sit in the panel, and the LIVE label is inside the frame.
- **Desk and title text fit.** Memo and Zenith field labels got 42 px, the rulebook card can use 12 lines and scrolls, and the cover blurb was shortened. The title, story hub, desk rulebook, memo labels, fight HUD and post-betrayal camp window were checked by rendering the stage manually.
- **Story polish:** Ray's death moved to the end of chapter 8, post-death press questions no longer have Ray switching off the interview, the living-Ray branch in `storyEndingScene` is gone, the secret sixteenth chapter is tracked in the trophy case, and the humanizer pass covered `story.ts`, `storycuts.ts` and `partlines.ts` (contractions for everyone but 1ton, no em dashes, no fragment rows or "not X, it's Y").
- **Earlier in this pass:** men no longer wear women's tops (`presentedGender` is used by the rig, sprites, arena and editor), the marks system carries cuts, bruises, swelling and blood from live fights into WATCH and cutscenes, the creator has per-zone ink plus head, eye and iris controls, and the sequel screens use the II palette.
- **Tests:** chapter order, Ray's death, post-death fight players, the 1ton lock and 90 OVR, secret trophy, marks, HUD chunks and creator ink/head/eyes/iris. `npm run typecheck` clean; `npm test -- --run` 183/183 in 20 files; `npm run build:sequel` and `npm run build` pass.
- **Moved and rebuilt:** the project now lives at `C:\Users\User\Documents\Default Project` with the `sequel` branch and the uncommitted work intact. Typecheck, tests and both web builds were re-run there, and `npm run dist:sequel:win` rebuilt `release-sequel/CAGE-BOSS-II-0.9.0-portable.exe` from the final source. Nothing was committed or pushed.

### Turn 11: Claude (2026-10-27)
Humanizer pass over the sequel's text (Riley's humanizer skill; rules now in SKILLS.md section 5):
- 606 strings contracted the way people talk (1ton keeps his formal English). The narration reader now treats
  "doesn't"/"won't" as negatives (`NEG` in stage.ts).
- About 50 lines rewritten by hand: one-line closers and sayings ("That's the point", "That's the whole job",
  "Nobody says anything"), filler "for the first time", stock similes ("like it owes him money", twice), rows of
  fragments in establishing narration, part scenes that repeated their own card, and the catchphrase where it was
  a sign-off (radio, signings, a soup joke). It stays at Ray's big moments.
- Em dashes in document titles and logs became the game's "  /  ".
Not re-read in the game itself: the rewrite was checked by reading the diff and by the tests.

### Turn 10: Claude (2026-10-27)
Motion pass with Riley's new animation skills (Emil Kowalski's rules: strong ease-out for things arriving, never
ease-in on UI, UI under 300 ms, nothing from scale 0, no animation on constant actions, interruptible, reduced motion).
All sequel-only (`isII()`), shared kit in `src/ui/motion.ts` (`easeOut` = cubic-bezier(0.23, 1, 0.32, 1),
`easeInOut` = (0.77, 0, 0.175, 1), `DUR`, `tween()`, `reducedMotion()`):
- Toasts rise 6 px and fade in (180 ms), drop and fade out (200 ms), and the stack glides into the gap.
- Windows: the dimmer fades up and the window grows from 96% (200 ms); closing fades in 140 ms. Full-screen
  cutscenes only fade; phones (fit-to-screen) only fade.
- Screen changes fade up from black (220 ms) after the switch, so input never waits.
- Buttons go down a pixel while held (no tween; they're clicked constantly).
- Mode menus stagger in (40 ms apart, 8 px) on first entry only; cutscene choices rise in the same way.
- Fights: the HEAD bar leaves a pale damage chip that holds 0.4 s and drains.
- Reduced motion: the OS setting or REDUCE SHAKE keeps the fades and drops the movement.
Not judged on screen (pane hidden): step-checked frame by frame instead. Feel-check the window grow and the toast
glide at normal speed; if the grow reads as a wobble, drop it to a fade.

### Turn 9: Claude (2026-10-27)
Riley's list, all done:
- **Version**: the sequel is `sequelVersion` 0.9.0 in package.json (Vite's `__APP_VERSION__`, the build's
  `extraMetadata.version`, and `stamp-exe.mjs` takes it as a third argument). Game 1 stays 2.2.0.
- **Story press day is a cutscene** (`src/ui/sequel/storypress.ts`): the table, Dane and the chapter's fighter, the
  Daily Clinch in the back row; each answer is Dane saying it and the room reacting; the last shot is what ran.
- **Sequel look**: `panel2()` (`src/ui/sequel/panel2.ts`) replaces game 1's newsprint on the season end and story end;
  the trophy case is steel, and its cabinet and detail box are positioned (they used to sit over the title).
- **Establishing shots** (`src/ui/sequel/scenery.ts`): narration that sets a scene puts it on screen (rain, snow, a
  storm, Commissioner Pete wandering through, the horse trailer, the skyline through Zenith's glass, the crowd, the
  bleachers, soup steam, camera flashes, the sea and the MARIE-ANNE, neon, sirens).
- **Voices**: every speaker blips while their line types (`VOICES` in cine.ts; `blip()` in sfx.ts).
- **The album**: `Line.photo` snapshots the scene (no subtitles) into `cageboss2.photos`; PHOTOS in Ray's notebook.
  Taken at the last Sunday, the torch, every secret-chapter outcome and the endings.
- **THE THEATRE** (Tales of Legacy menu): `src/sequel/theatre.ts` stores a recipe per scene (seed, chapter, choices,
  flags) for intros, outros, beats and endings; `theatreui.ts` rebuilds and replays them.
- **The story in Promoter Mode** (`src/sequel/legacyfa.ts`): after a finished story, Han, Mateo, Tyler, Spadam and
  1ton walk in as free agents (FROM THE STORY); signing one plays a short office scene with lines that remember.
- **Commissioner Pete**: his own tape (TAPE 5), a Xavier phone call, POST THE GOAT on Bleeter and replies, and he
  arrives at the Old Dome for the buyback. The tape shelf is re-spaced for five.
- **Juiced Butler's week in review** (`src/sequel/radio.ts`, `radioui.ts`): a booth segment after every show in
  Promoter Mode and every END WEEK in the story, about what actually happened.
- **NEW GAME+: THE KID AT THE DOOR** (tape id `kid`, unlocked by the torch ending; a banner in the tapes window):
  Mateo runs Ray's, Theo Arsenault (Luc's grandson) stands at the door for a week, takes the mop, and fights four
  times (Ray's ring with Mateo refereeing, the barn, the warehouse, the Old Dome against Synergy III), better each time.

Not checked on screen: the browser pane was hidden for most of this turn, so the new screens were smoke-run (they
open and draw with no errors) rather than looked at. Worth a look: press day, the radio booth, the theatre list, the
album, the season-end panel. The radio plays every week in the story; if it feels like too much, make it every
other week in `doEndWeek`.

### Turn 8: Claude (2026-10-27)
- **The Windows exe builds.** `npm run dist:sequel:win` now runs `tools/dist-sequel-win.mjs`: Electron is unpacked once
  from electron's download cache into `.electron-dist/` (`tools/electron-dist.mjs`, gitignored) and passed as
  `electronDist`, which skips the zip-extract-and-rename that failed with EPERM here. Output:
  `release-sequel/CAGE-BOSS-II-2.2.0-portable.exe` (icon stamped). Smoke-tested: it opens "CAGE BOSS II: THE BUYBACK".
  The version is still package.json's (2.2.0, game 1's); give the sequel its own in `extraMetadata` if you want.
- **Props drawn properly** (outlined, shaded, steam off the soup) and new ones: crutches. `{ do: 'drop' }` sets a thing
  down and it stays on the floor for the shot (Han's bucket in the corner, Ray setting 1ton's empty place).
- **More narration acts** (69 to 97 lines): laughing (new `laugh` pose), counting/reading, stools, drawing on the
  whiteboard, crutches, making soup (ladle), setting the empty place, putting things away, taping hands (names in the
  possessive count as the object now), "they stare at each other", "everybody has two bowls". The ~150 quiet lines left
  are scenery and backstory.
- Bystanders step further aside (50 px) when someone walks into their spot, on plain walks too.

### Turn 7: Claude (2026-10-27)
Riley: "work on everything". Done:
- **Every part has a scene.** `src/ui/scenes/partlines.ts` (`PART_LINES`): 60+ parts that were one narrated card now play
  4 to 9 lines in the room after the card, with stage actions (Ray hands 1ton the bowl, Mateo and 1ton trade hard shots
  on "no hard shots" Thursday, the weigh-in face-off, the mullet poster). New canon in there: Gordon Vance has been
  quietly paying Ray's rent since 2011 ("tax thing" on every cheque); Mateo's nana adopts 1ton. Foreshadowing still
  starts at THE AUDIT (ch 6). `tests/stage.test.ts` checks every speaker and actor is in the part's cast.
- **Cutscene props**: `{ do: 'prop' }` and `meet` with `prop` (bowl, mop, bucket, belt, card, envelope, paper, notebook,
  clipboard, mask, phone, mic, ladle, pen, photo, tape, pot), drawn at the hand; the reader picks them up from the text
  ("holding a bucket", "hands him the mop"). A new `offer` pose (hand out at chest height) for handovers and handshakes,
  and bystanders step aside so nobody walks through anybody.
- **Portraits** for hairstyles 10 (mullet), 11 (high fade + curls), 12 (slick back), 13 (afro); 14 uses the mohawk.
- **Your creations in Promoter Mode**: `src/sequel/custom.ts`. Creator fighters walk in at the top of FREE AGENTS
  (once each), marked YOUR CREATION.
- **Balance**: story levels cost more as they climb (`xpForLevel`, `levelForXp`; level 10 is 637 xp in all, was 300),
  so a grinder no longer maxes everyone by chapter 6 of 15. The crowd chants about every 25-30 s now, not every 10.
- **Sequel icon**: `tools/make-sequel-icon.mjs` (`npm run icon:sequel`) draws `build/icon-sequel.{png,ico}` and the
  1024 png; the sequel's window, electron-builder config and `dist:sequel:win` (now stamping the exe like game 1) use it.
- **`npm run dist:sequel:win` does not finish here**: electron-builder fails with EPERM renaming
  `release-sequel/win-unpacked.tmp` (twice). Probably the `%TEMP%` location or antivirus. Run it from a normal folder.

### Turn 6: Claude (2026-10-27)
- **Cutscenes do what the narration says.** Riley's example: "He takes off his blazer... steps into the cage" / "One
  punch... The heckler does" had everyone standing still. Now 1ton's jacket comes off, he walks up, throws it, and the
  heckler is knocked back onto the floor. The narration reader (`src/ui/sequel/stage.ts`) covers every story scene and
  the tapes; key fights have hand-written `act` lines. About 40 narrated lines now act; most of the rest are mood.
- Old cutman corner restored (the redone one is deleted).

To do: write `act` by hand for any scene where the reader is wrong or too quiet (fight intros and highlights already
use `poses`), and props (a bucket, a mask, a belt) so "hands him the mop" shows the mop.

### Turn 5: Claude (2026-10-27)
Riley picked nine ideas; seven are in (the map and the new corner were cut):
- **Rivalry heat maps** (`src/sequel/rivals.ts`): grudges build from results, pressers and weigh-in face-offs; a
  grudge match sells more and pays bigger purses; the presser asks about it.
- **Zenith counter-promotion**: Zenith books against your big nights; you get a warning and a toast.
- **Broadcast mode** (`src/ui/sequel/broadcast.ts`): PRODUCE THE BROADCAST on show night (booth, cameras, rating).
- **Ray's notebook** (17 pages, across every save) and **RAY, 1987**, the Golden Gloves final against Butch.
- **Legacy Tapes**: Tyler, Xavier, Spadam, and ALBERTO (the post-game Mexican circuit: the cantina, the abuela, the
  Prince of Polanco, El Nieto for his old belt).
- **Live crowd** in hands-on fights: signs in the rows, chants for whoever it's behind, boos when nothing happens,
  a second wind on big moments, and a lean on close rounds. Home crowd in Moncton, Zenith's crowd in the parking level.
- The redone corner was built and then **removed at Riley's request**: game 1's cutman corner is back.
- The Moncton map was built and then **removed at Riley's request** ("lowkey ass"). Don't bring it back.

Left for the next turn (Riley's plan: polish, then fill out the game):
- **Polish pass:** the crowd's chant timing over a full five-rounder.
- **Fill out:** most of the 80 parts are still only cards. Give them scenes of their own.

### Turn 4: Claude (2026-10-27)
Done (Riley's open list, in order):
- **Kits per fighter** (`kitII` in `src/ui/rig.ts`, II only): cut from style (Muay Thai / fight shorts / board shorts),
  colours from the flag, pattern from traits and nickname (flames, stars, tiger, camo, split, chevron, stripes,
  checker), waistband, ankle wraps, champion gold. The creator can override them (`Look.kit2`).
- **Tales of Legacy is 15 chapters of 5 parts** (+ the secret Torch chapter as 16th). New chapters: ALLSTAR FC,
  HOMECOMING (Moncton), THE GOLD PEN (1ton signs with Zenith), THE WAKE, THE CAMP. Each chapter is 10 weeks; every
  part has a card (`PARTS` in `storycuts.ts`: a title, a scene, who is there). Two key fights in every chapter before
  Ray dies; new guests (Pruitt, Arsenault, Kane, Hale, Sandoval). Each new chapter has an intro, an outro and a talk.
- **Promoter mode has a promoter**: the new-save flow asks for your name (`run.flags.boss`, `bossName()`), and
  `src/ui/sequel/promotercuts.ts` plays the season's scenes (the seven-minute board meeting flashback, the first
  sellout, the first belt, Verity's car each quarter, the raid, Zenith's letter, the last Saturday) using that name.
- **The phone** (`src/sequel/phone.ts`, `src/ui/sequel/phoneui.ts`), in both hubs: one call a week, one Bleeter post a
  week (with replies), and the plug's three offers a week (with a chance it blows back as heat).
- **Tutorial** (`src/ui/sequel/tutorial2.ts`): lesson cards the first time you reach the modes, promoter, desk, show,
  Tales of Legacy, the camp, sparring and Quick Fight. REPLAY TUTORIALS is in HOW TO PLAY.
- **Character creator** (`src/ui/scenes/sequelcreate.ts`): from Quick Fight. Build, skin, division, height, style;
  15 hairstyles, colour, fade, beard; brows, nose, ears, scars, mask, chain; ink per zone; kit cut, pattern, colours.
  Saved fighters appear in Quick Fight under CUSTOM.
- Promoter hub header and card counter no longer overlap. A refresh bug (scenes re-adding destroyed graphics) is
  fixed in Quick Fight, the creator, the title and the menus.

Left for the next turn (and for OpenCode):
- **Writing:** the 80 parts have cards; most still need full scenes (talks, beats, fights) of their own. Start with
  the new chapters' parts 2 to 5.
- **Portraits** for hairstyles 10-14 (they draw as the nearest old style), and the creator's ink and kit in portraits.
- Custom fighters in PROMOTER MODE (sign your own) and as a Tales of Legacy sandbox fighter.
- A balance pass over the longer story (fifteen chapters of training is a lot of xp).

### Turn 3 (cont.): Claude (2026-10-27)
Done since the turn 3 notes below:
- **Menus and saves:** GAME MODES → PROMOTER MODE (new / load / sandbox) and TALES OF LEGACY (new / load / sandbox
  once finished). Unlimited named save slots per mode, sandbox-marked, CONTINUE plays the latest. NEW RUN is gone.
- **Story mode is now TALES OF LEGACY** everywhere it shows.
- **1ton is Gordo "1ton" Fuente, really Alberto Del Burrito**, with a chapter-10 reveal beat (with a flashback of the
  cantina and the abuela).
- **Xavier's league opening:** 1ton and Mateo sign with Allstar FC (chapter 2); 1ton signs with Dane in chapter 5.
- **A second key fight in chapters 2–8** (Allstar FC debut, the Allstar title, Han vs Tyler, the first warehouse main
  event, Han vs Spadam II, a Zenith prospect, Han vs Dos Caras), each with intro lines, and a **highlight cinematic
  after every key fight**.
- **Special moves from sparring** (superman punch, Butch hook, flying knee, calf kick, spinning elbow) in the engine,
  with a new superman pose; tested.
- **Body and tattoo pass, five new hair styles** (II only).
- **Foreshadowing audit, chapters 1–5:** the chapter 4 spar and the chapter 5 black card no longer hint at the betrayal.
- **Camera:** an impact punch-in and tilt, and a different opening angle per shot.
- **Quick Fight:** a new select screen with live models, the face-off after READY (fighters stop a forehead apart),
  and Tales of Legacy fighters.
- **Demo:** its own saves; prologue → chapters 1–2 → 4 promoter weeks → poster → back to game 1.
- Fixed game 1's Quick Fight random pick (the same welterweight bug).

Still open from Riley's list (next):
1. **Fighter kits, one per fighter from their bio** (`COUNTRY_KIT` in rig.ts is all there is): a kit generator
   (base, trim, pattern, waistband logo, gloves) from country, styles, traits, nickname and id.
2. **The tutorial** from game 1 (`src/ui/tutorial.ts`, `guidelessons.ts`), re-done in II style for the sequel's modes.
3. **Re-do everything carried over from game 1** (hub, desk, show and end screens still hard-code `PAL.*`).
4. **Dane's cutscenes in PROMOTER MODE**, using the player's chosen name (the promoter mode has no name entry yet:
   add one to the new-save flow; `{boss}` substitution in the lines).
5. **A much longer story:** more beats per chapter, more chapters or chapter parts, more side stories (the Tales).
6. **The phone:** calls (Ray, Xavier, Verity, the plug), Bleeter posting (game 1 has `src/sim/bleets.ts`), DMs to the plug.
7. **The character creator** for the new bodies, hair and tattoos (portrait hair for styles 10–14 too).

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

### P1: the visual overhaul (done in this pass)
1. **Blood and bruising:** `Look2.marks`, `src/ui/marks.ts` and the live/watch/cutscene wiring. Bruises age, eyes shut, noses break, lips split, blood runs, and body and leg kicks leave rib and thigh marks.
2. **Models:** II muscle shading, hands, feet, ears, hair strands and two-tone skin; Mateo reads as the grown, tatted light heavyweight.
3. **Creator and tattoos:** per-zone ink (sleeves, chest, back, ribs, knuckles, neck, script, colour), head, eye shape, iris colour, scars, hair and beard, and kit overrides.
4. **II fight screen:** broadcast plates, segmented health and gas, body-damage silhouette, centre clock, larger prompts, stats strap, engine-ticker fallback, opaque top band, and the arena signs below it.
5. **Remaining screens:** all eight sequel scenes use `PAL`; the title, hub, desk, show, end, story hub, trophies and creator have the II layout.
6. **Men's tops:** six male welterweights corrected and `presentedGender` used by the rig, sprites, arena and editor.

### P2: story and content
7. **Story achievements:** the trophy case tracks the four endings and the secret chapter; `SEQ_ACHIEVEMENTS` is promoter-mode only. Add story achievements if the trophy case is not enough.
8. **Balance:** 1ton's final OVR is fixed at 90; check Mateo and Han across the later chapters with `npm run sequel-sim` or a story sim.
9. **WATCH booth:** the tape has the broadcast strip and marks but no commentary; `src/sim/commentary.ts` is what game 1 uses.
10. **Optional cameos:** Han in chapters 4–6, Tyler mopping, Xavier's league and Zac's Tuesday class. Han already appears in 1–3 and 7–16.

### P3: shipping
11. (Done) The sequel icon, version stamps and the portable exe.
12. (Done) The project is in `C:\Users\User\Documents\Default Project` with the `sequel` branch and the uncommitted work intact. Nothing was committed or pushed.

## Known issues
- `Look2.mask` and `presentedGender` touch game 1's shared files (`rig.ts`, `sprites.ts`, `arena.ts`, `editor_fighter.ts`). They are harmless for game 1, but they are game 1 changes.
- In promoter mode the WATCH tape is snapshotted after the records update, so the walkout record is off by the result. Cosmetic.
- The browser screenshot tool still fails when the desktop tab is hidden; the working check is to render the stage manually and extract the canvas.

## Notes on OpenCode's first session (from Riley's export)
- It worked from 15 context compactions. Each summary kept the requirements but lost details, which is why the
  comments drifted ("twenty weeks" next to `SEASON_WEEKS = 40`, "nine chapters" with ten).
- It deliberately reused game 1's cutscene player and live fight "to avoid touching the engine deeply". That's why
  the sequel looked like game 1.
- It made Dane fight because "it's easiest to create Dane as a standalone Fighter". That was a shortcut, not a
  story choice. Its research of game 1 was a feature checklist (watch every fight, pressers, the booth, Bleeter,
  Legacy, weight-class move-ups). It never read Han's story, so it invented "Ray Whyte".
- It planned the separate exe and a game 1 demo (sequel.html with a flag) but deprioritized both for the desk.
