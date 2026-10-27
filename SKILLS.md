# SKILLS.md: working on CAGE BOSS II

This is the working guide for any AI (OpenCode, Claude, anyone) building **CAGE BOSS II: THE BUYBACK**.
Riley switches between assistants turn by turn. **Read this file, then `SEQUEL_HANDOFF.md`, before you touch
anything.** When you finish a turn, add your entry to the turn log in `SEQUEL_HANDOFF.md`.

---

## 1. What this repo is

There are **two games in one source tree**:

| | CAGE BOSS (game 1) | CAGE BOSS II: THE BUYBACK (the sequel) |
|---|---|---|
| Page | `index.html` → `src/main.ts` | `sequel.html` → `src/sequel-main.ts` |
| Vite | `vite.config.ts` → `dist/` | `vite.sequel.config.ts` → `dist-sequel/` |
| Electron | `electron/main.cjs` | `electron/sequel.cjs` (sets `CAGEBOSS_GAME=sequel`, then loads main.cjs) |
| Packaging | `package.json` → `build` | `electron-builder.sequel.json` → `release-sequel/` |
| Saves | `cageboss.*` keys, "CAGE BOSS" profile | `cageboss2.*` keys, "CAGE BOSS II" profile |
| UI theme | `classic` | `ii` (set in `src/sequel-main.ts`) |

They share the engine: the rig (`src/ui/rig.ts`), the arena (`src/ui/arena.ts`), the fight sim
(`src/sim/fight.ts`), the hands-on fight engine (`src/sim/live.ts`, `src/ui/livefight.ts`), the content
(`data/**`) and the UI kit (`src/ui/kit.ts`, `src/ui/widgets.ts`, `src/ui/text.ts`).

**Game 1 is shipped and has players. Game 1 must not change** unless Riley asks for a game 1 change.
When you change a shared file, gate the new behaviour behind something only the sequel turns on:
- `isII()` from `src/ui/theme.ts` (the sequel sets `setUiTheme('ii')` at boot)
- `isSequelStandalone()` from `src/sequel/standalone.ts`
- an optional field or option that game 1 never passes (for example `Look2.mask`, `PixelText` `noExpand`)
- a registration hook the sequel calls at boot (`setLoadingScreen`, `setTextExpander`)

The sequel never appears inside game 1's menus any more. Riley wants it as a separate game.

## 2. Commands

Windows. The default shell may be PowerShell: there is **no `tail`, `head` or `grep`** there. Use the
npm scripts, or run through Git Bash.

```bash
npm run dev:sequel              # the sequel in a browser: http://localhost:5173/sequel.html (or next free port)
npm run dev                     # game 1
npm run typecheck               # tsc, both games
npx vitest run tests/sequel.test.ts
npm test                        # every test (about 50 s)
npm run build:sequel            # typecheck + dist-sequel/
npm run desktop:sequel          # build + open the sequel in Electron (add :windowed for a window)
npm run dist:sequel:win         # CAGE-BOSS-II-<v>-portable.exe in release-sequel/
npm run dist:sequel:win:setup   # NSIS installer
npm run sequel-sim              # headless balance sim of the promoter season
```

Before you end a turn, these must pass: `npm run typecheck`, `npx vitest run`, `npm run build:sequel` and
`npx vite build` (the game 1 build, so you know you didn't break it).

## 3. Where the sequel lives

```
src/sequel-main.ts           boot: theme, loading screen, read-more, title
src/sequel/                  headless rules (no Pixi): safe to test in vitest
  types.ts                   SeqRun (promoter season), StorySave (story mode), constants
  model.ts                   the 40-week promoter season: venues, cards, runShow, buyback, endings
  desk.ts                    the Papers-Please desk: weekly documents, comparisons, stamps
  events.ts                  after-show events and their choices
  presser.ts                 Thursday press conference before every show (question bank + effects)
  story.ts                   STORY MODE: chapters, fights, builders (1ton, Han, Mateo, the crew), endings
  achievements.ts            the sequel's own trophy case
  session.ts / storysession.ts  save files
  standalone.ts              "am I running as my own exe?"
src/ui/sequel/               sequel-only presentation
  cine.ts                    CINE II, the remastered cutscene player (camera, light, rim, shadows, close-ups)
  watchfight.ts              promoter mode: WATCH a simulated bout in the arena
  presser2.ts                the presser on screen
  loading2.ts                the sequel's loading screen
  readmore.ts                tap any "..." text to read it all
src/ui/theme.ts              the II colours (II.*) and the theme switch
src/ui/sequelart.ts          venue art, title backdrop
src/ui/scenes/sequel*.ts     sequel screens (title, hub, desk, show, end, story hub, trophies)
src/ui/scenes/storycuts.ts   every story cutscene (words + who stands where)
src/ui/scenes/storyend.ts    story ending screen
tests/sequel.test.ts         sequel tests: keep them green, add to them
```

## 4. The canon (follow game 1; don't invent over it)

Get these right. Check `src/sim/fmstory.ts` (Road To Champion), `data/career/*.json` (promoter career) and
`src/sim/cast.ts` before you write story.

**Game 1, promoter career:** you are **Dane Whyte**, president of the **CBFC** (Cage Boss Fighting
Championship), owned by **Zenith Holdings Group**. Game 1 has a "Forced Out by the Board" ending: "Trent from
strategy" gets the office after a seven-minute board meeting. **1ton** is the bearded reporter in the back row
(Lucha Lowdown) who only asks about Mexican fighters. Commentators: Juiced Butler, Blow Hogan, Sandwich Cormier.

**Game 1, fighter story (Road To Champion):** you are **Han "The Pride Of The Maritimes" Tibular**, 21, from
Moncton, New Brunswick. He trains at **Ray's Boxing & Soup**, run by his **Uncle Ray** (70, grey ponytail,
cardigan; his late wife **Marie** started the soup). **Mateo** is the 12-year-old in the giant hoodie who hangs
around the door. **Gordon Vance** is the landlord and his son **Tyler "Trust Fund" Vance** is the rival who ends
up mopping at Ray's. Also: **Wyatt "LeproClepto" Smitt**, **Zac "The Attacker" Buna**, **Xavier "Allstar"
Cockett** (cowboy hat, starts a league), **Spadam "The White Beast" Biggs** (24-0 welterweight champion) and
**"Dirty" Daniel Stinkovich**, the referee Spadam paid. Han beats Spadam, Ray's gym is saved, and the catchphrase
is **"Hands up. Chin down. Eat something."**

**The sequel's story mode (as Riley directed, built from game 1):**
- Dane was voted out by Zenith. He runs a warehouse promotion. **Dane is the promoter. Dane never fights.**
- 1ton is the trainee you build into a fighter. He signs with Zenith, turns on you, and his crew kills Uncle Ray.
- **Han Tibular comes back** in chapter 3: now the CBFC **middleweight** champion at his peak (**95 OVR**). He walks
  out on Zenith to fight for the warehouse. He fights Brick, El Cuchillo II, Duke and Rico.
- Chapter 9: Ray is dead. Han moves up to **light heavyweight** for Cesar, and **tears his knee in camp halfway
  through the chapter**. **Mateo**, now 21, a jacked and tattooed light heavyweight, takes the Cesar fight.
- Chapter 10: **Mateo vs 1ton** for Zenith's light heavyweight belt, with the buyback riding on it.
- If Mateo wins, he picks a road on the microphone:
  - **call out Han** → secret chapter 11 boss fight **Mateo vs Han** → ending `torch` (Han hands down his
    legacy and buckles the belt on Mateo) or `student` (Han wins and says "not yet, kid")
  - **defend the belt** → **Mateo vs Cesar II** → `champion` or `onenight`
- If Mateo loses or draws with 1ton, the story ends on the older endings (`house`, `role`, `zenith`, `draw`).
- Ray is **Uncle Ray** (Han's uncle). Never "Ray Whyte". He is the heart of the story: lovable, funny, a mentor to Han,
  Mateo **and 1ton** (soup at six a.m., "Hands up. Chin down. Eat something."). Make players love him before chapter 8.
- **1ton's betrayal is foreshadowed from chapter 6 only** (the gold envelope talk, the Zenith-tower photo beat). Before
  chapter 6 he is warm, funny and loyal (in chapter 5 he tears up Verity's black card himself). Don't add hints earlier.
- **1ton's identity:** his press name is **Gordo "1ton" Fuente**. His real name is **Alberto Del Burrito**, once
  middleweight champion of Mexico (22-0). He lost the belt, got drunk, and lost a fistfight in a cantina to a fan's
  abuela; it went viral. He moved north, changed his name and became a sportswriter. His question ("When are you going
  to put a Mexican fighter in the main event?") meant *himself*, every week for twelve years. Revealed in chapter 10
  (beat `true_name`). Nobody knows before that.
- **The opening:** 1ton starts training at Ray's (chapter 1), signs with **Xavier's Allstar Fighting Championship**
  (chapter 2, beat `xavier_league`), and Mateo signs too. 1ton only signs with Dane in chapter 5 (beat `dane_contract`).
- Han is **30-1**, hair in a **bun with a fade** (`look.hair = 7`, `look.fade = 1`).

**Sequel-established canon:** Ray lost the **1987 Golden Gloves final** to **Butch** (the mullet). Han's father **Marc
Tibular** fished lobster out of **Shediac** on the **MARIE-ANNE** and was lost in a November gale when Han was 15.
**Tyler Vance** mops at Ray's, **Zac Buna** runs the Tuesday class, and **Xavier Cockett** runs Allstar FC out of a barn.
In 1987 Ray was **Ray "The Electrician" Tibodeau**, 33; Butch is **Butch "The Mullet" Comeau** from Dieppe. The final
was at the **Moncton Coliseum**; Marie met Ray at the bus with two bowls of soup.

Content rule from game 1 (see `CONTENT_GUIDE.md`): parodies of real people never get crime, doping or abuse
storylines. Original characters (1ton, the crew, Zenith) can.

## 4b. Systems added in II (where they live)

- **Menus:** `src/ui/scenes/sequelmenus.ts`. Title → GAME MODES → PROMOTER MODE / TALES OF LEGACY / QUICK FIGHT.
- **Save slots:** `src/sequel/slots.ts`. Any number of named saves per mode, an active slot, a sandbox flag (marked in
  the list). `readRun`/`writeRun`/`readStory`/`writeStory` go through the active slot. The demo uses its own namespace
  (`setSlotNamespace('cageboss2demo')`). **Sandbox:** promoter = no deadline, +$1M, no achievements
  (`makeSandbox`, `seasonLength`); story = pick a chapter (unlocked after one finished story).
- **The clock:** chapters last `weeks`, 7 days a week (`actionsLeft`), fights booked by week, END WEEK, `storyDate`.
- **Training:** tiers LIGHT/FULL/CAMP (1/2/3 days), letter grades (play the drill or sim for a C), 30 xp a level.
  Drills: `src/ui/sequel/drills.ts`. Sparring: `src/ui/sequel/spar.ts` (a live round at Ray's, Ray refs).
- **Special moves:** `SPECIAL_MOVES` in `src/sim/live.ts`. A B+ spar teaches the next one (`save.moves`); fights pass
  `rules.moves`. Add a move: a spec in `specialPunch`/`specialKick`, a name in `strikeReach`, a pose in `rig.ts`, and
  `PUNCH_POSE`/`JOINT` entries in `livefight.ts`.
- **TALK** is required each chapter. Every choice can carry `reply` lines; chapter choices without one get a narrated beat.
- **Beats** (`STORY_BEATS` + `beatScene`), **flashbacks** (`Shot.flashback`), **highlights** after every key fight
  (`fightHighlight`), **guests** (`GUESTS` in story.ts: Xavier's barn, Spadam, Zenith's prospect, Dos Caras).
- **Venues:** `src/ui/sequel/venues.ts` and `CanvasInfo.enclosure` ('cage' | 'ring' | 'none'), plus the `rays` room.
- **Bodies (II only):** muscle definition, aging bruises, blood running down the chest, per-fighter tattoo layouts
  (`tattooLayout`, `Look2.tats`), and five new hair styles (10 mullet, 11 high fade + curls, 12 slick back, 13 afro,
  14 mohawk). Portraits draw those five as their nearest old style for now.
- **Quick Fight:** `src/ui/scenes/sequelquick.ts`; **creator:** `src/ui/scenes/sequelcreate.ts` (custom fighters in
  `cageboss2.custom`).
- **Tales of Legacy is 15 chapters of 5 parts.** A chapter is 10 weeks (`CHAPTER_WEEKS`), a part 2 weeks
  (`storyPart`, `partWeek`). Part cards: `PARTS` in `storycuts.ts`. Add a chapter: an entry in `STORY_CHAPTERS`
  (the order sets `no`), its five `PARTS`, its intro/outro in the `chapterIntroRaw`/`chapterOutro` switches, a talk.
- **Promoter mode's promoter:** `bossName(run)`; its scenes live in `src/ui/sequel/promotercuts.ts` (`CUTS`).
- **Kits:** `kitII` (from the bio) or `Look.kit2` (the creator's). **Ink:** `tattooLayout` or `Look.ink2`.
- **The phone:** `src/sequel/phone.ts` (calls, Bleeter, the plug), `src/ui/sequel/phoneui.ts`.
- **Tutorial:** `src/ui/sequel/tutorial2.ts` (`maybeLesson2(g, key)`).
- **Grudges, Zenith nights, the broadcast (promoter):** `src/sequel/rivals.ts` (`run.rivalries`, `isGrudge`,
  `grudgeBoost`, `zenithCounter`, `rateBroadcast`), the truck UI in `src/ui/sequel/broadcast.ts`.
- **Ray's notebook:** `src/sequel/notebook.ts` (`PAGES`, kept in `cageboss2.notebook` across every save). A full book
  unlocks RAY, 1987 (`playRay1987` in `src/ui/sequel/notebookui.ts`). **Legacy Tapes:** `src/sequel/tapes.ts` (steps:
  scenes and fights; progress in `cageboss2.tapes`), shelf in `src/ui/sequel/tapesui.ts`. ALBERTO is the post-game
  Mexican circuit.
- **The live crowd (II):** `LiveRules.crowd` in `src/sim/live.ts`: `L.crowd` energy/lean from events, a second wind for
  the side it's behind, and a close round (diff < 3) leans its way on the cards (`rcrowd`). `livefight.ts` turns it
  on for II (not at Ray's, not in a lot) and draws signs and chants (`arena.setSigns`, `arena.crowdChant`). Pass
  `crowd: { home, signs, chants }` on `openLiveFight`; venues say `crowd: 'home' | 'away'` (`venueCrowd`).
- **The face and the corner (II):** `LiveRules.face`: `L.face[side]` tracks swelling, cut and seal for six zones
  (brows, eyes, nose, mouth) from where shots land (`faceHit`, its own RNG so game 1 fights don't change). A swollen
  spot takes more, a swollen nose breathes worse. Between rounds `src/ui/sequel/corner2.ts` (ENSWELL, ICE, GAUZE,
  VASELINE; SIM = C) works it and sets `faceWorked`; the CPU's corner is the automatic version in `nextRound`.
- **Scenes and refresh:** `Scene.refresh()` destroys the root's children. A Graphics kept on a field must be made
  new in `build()`, or the next refresh re-adds a destroyed object (pointer events then crash).

## 5. Tone

R-rated satire with heart: cutthroat jokes, deadpan narration, then something that lands emotionally. Short
lines. Every character has one running bit (Ray's soup, 1ton's question, Cuchillo's "metaphorical knife"). Swear
when it's funny, not as filler.

## 6. Screen and text rules (Riley has complained about these)

- Every screen is **480×270 design pixels**. Wide phones add `OX`/`SW`; full-width screens use `SW` and `-OX`.
- **Words must fit their boxes.** Use `width` + `maxLines`. Measure before you place
  (`text(...).textHeight`). Long text drops to `small: true`, or goes in a ScrollBox.
- Anything cut with `"..."` is **tap-to-read-all** in the sequel (`setTextExpander`). Don't put important rules
  in cut text; give them room.
- **The pixel font has no arrows or fancy glyphs.** `→` is mapped to `>`; anything else unknown renders as `?`.
  Stick to ASCII.
- Don't hard-code `PAL.*` colours on new sequel UI. Use `II.*` from `src/ui/theme.ts`, or the kit
  (`button`, `box({ bevel: true })`, `openWindow`), which picks up the II theme automatically.

## 7. How to...

- **Add a story chapter or fight:** add it to `STORY_CHAPTERS` in `src/sequel/story.ts` (`fight` or `fights`, and
  `when` for conditional fights), a builder in `buildOpponent`, then the intro/outro in `storycuts.ts`
  (`chapterIntro`/`chapterOutro` switch) and a `fightIntro` branch. Add a test in `tests/sequel.test.ts`.
- **Add a cutscene:** a `Cutscene` is shots → cast + lines (+ choices). Play it with `playCine` (`src/ui/sequel/cine.ts`),
  never game 1's `playCutscene`. Use `bg` values `cine.ts` has lighting for (`LIGHT` table), and add one if you add a bg.
- **Add a presser question:** add it to `BANK` in `src/sequel/presser.ts`. Keep the effects small (±1..9).
- **Show a sim fight:** pass `res.ticker` (needs `ticker: content().templates.ticker, keepTicker: true` in the
  sim options) to `watchFight` from `src/ui/sequel/watchfight.ts`.
- **Test in the browser:** `npm run dev:sequel`, then in the console: `window.__game` is the Game, and
  `await import('/src/...')` loads any module. Jump straight to a screen:
  `const m = await import('/src/ui/sequel/cine.ts')`. Canvas clicks are 480×270 design pixels times the CSS scale.
  `requestAnimationFrame` stops in a background tab, so the loading screen never finishes there.

## 8. House rules

- Match the code style around you: comment density, naming, the short deadpan comments.
- Headless rules go in `src/sequel/` (no Pixi imports), and the UI goes in `src/ui/`.
- New save fields: add them to `migrateRun` / `migrateStorySave` with defaults so old saves load.
- Don't commit, push or publish unless Riley asks.
- Don't delete or rewrite someone else's work wholesale. Fix it, and say why in the handoff.
- **The project folder is in `%TEMP%`** (`C:\Users\User\AppData\Local\Temp\opencode\CAGEBOSS`). Windows can clean
  that folder. Remind Riley to commit or move it if that still hasn't happened.
