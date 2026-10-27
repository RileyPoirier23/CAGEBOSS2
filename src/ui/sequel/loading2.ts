/**
 * CAGE BOSS II loading screen: the warehouse at night, the roller door half up, sodium light
 * spilling onto wet concrete and somebody inside still shadowboxing. Forty segments of
 * theatre for a progress bar (one per Saturday) and a tip that is mostly a threat.
 */
import { Container, Graphics } from 'pixi.js';
import { W, H, SW, OX, text } from '../kit';
import { pixelArtResolution, type PixelText } from '../text';
import { POSES, drawRig, lerpRig, type Rig, type Look2, type Pose } from '../rig';
import { II } from '../theme';
import { shade } from '../../art/palette';

const TIPS = [
  'TIP: Zenith Holdings does not lose. It "realigns". Read the realignment.',
  'TIP: The desk opens before the cage does. Forged paper is still paper.',
  'TIP: Heat at 100 means the commission brings a van. The van is not for you. It is also for you.',
  'TIP: 1ton has a notebook. 1ton has always had a notebook. Mind what you say near the notebook.',
  'TIP: A fighter in camp is a fighter not selling tickets. A fighter not in camp is a fighter in hospital.',
  'TIP: Verity Kane signs everything in gold ink. It is not ink.',
  'TIP: Every clause you sign with Zenith costs half a million on the way out. Every one.',
  'TIP: The warehouse roof leaks onto the canvas. Call it "home advantage".',
  'TIP: Trent from strategy now runs the CBFC. He has replaced the cage with "an immersive fan journey".',
  'TIP: Cuts close faster with pressure and Vaseline. Swelling closes eyes faster with nothing.',
  'TIP: A bruise goes purple, then green, then yellow. Your sponsors go away in the same order.',
  'TIP: The Old Dome parking level has a capacity of 900 and a fire code of 300. Pick one.',
  'TIP: Belts you invent are real if the crowd says so. The crowd says a lot of things.',
  'TIP: Uncle Ray says hands up, chin down, eat something. Uncle Ray is usually right.',
  'TIP: A bribe is a fee with a guilty conscience. The commission charges for both.',
  'TIP: Mateo is not a kid anymore. Stop booking him like one.',
  'TIP: Blood on the canvas stays until somebody mops. Nobody here mops.',
  'TIP: Zenith matching-rights letters arrive in weeks 28, 34 and 38. Like a cold.',
  'TIP: A body shot you do not see coming is still a body shot. Watch his hips.',
  'TIP: You can buy back early from week 34. You cannot buy back your dignity at all.',
  'TIP: The Pride of the Maritimes still trains at Ray\'s. Ask nicely. Bring soup.',
  'TIP: Gordon Vance owns the block. Gordon Vance always owns the block.',
  'TIP: When a fighter says "it\'s just a scratch", it is a cut. When he says "it\'s a cut", call the doctor.',
];

const STATUS = [
  'Rolling up the door', 'Wiping down the fence', 'Hiding the eviction notice', 'Mopping last week off the canvas',
  'Taping the good gloves', 'Shredding the Zenith letter', 'Bribing the sodium lamp', 'Counting the folding chairs',
  'Stitching the brow', 'Icing the cheekbone', 'Waking up the cutman', 'Arguing with the generator',
  'Reading the fine print (twice)', 'Locking the notebook in the safe', 'Draining the puddle by the cage',
];

const SHADOW: Look2 = {
  skin: 0x8a5a3a, hairStyle: 0, hairColor: 0x161214, beard: 2, build: 2, trunks: 0x1a1a22, trim: II.blood, glove: 0x7a1010,
  stance: 'bouncy', female: false, tattoo: 0,
};

const SEQ: Pose[] = ['guard', 'jab', 'guard', 'jab', 'cross', 'guard', 'hook', 'guard', 'body', 'guard', 'legkick', 'guard', 'uppercut', 'guard'];

export class LoadingScreenII extends Container {
  private sceneG = new Graphics();
  private fx = new Graphics();
  private bar = new Graphics();
  private rig: Rig = { ...POSES.guard };
  private status: PixelText;
  private t = 0;
  private pose: Pose = 'guard';
  private poseT = 0;
  done = false;
  fade = 1;

  constructor(label: string) {
    super();
    this.eventMode = 'static';
    this.hitArea = { contains: () => true };
    this.addChild(this.backdrop());
    this.addChild(this.sceneG, this.fx, this.bar);
    this.sceneG.cacheAsTexture({ resolution: pixelArtResolution(), antialias: false });
    const logo = text('CAGE BOSS', 18, 18, { scale: 3, color: II.blood, shadow: 0x000000 });
    this.addChild(logo);
    this.addChild(text('II', 18 + logo.textWidth + 8, 18, { scale: 3, color: II.gold, shadow: 0x000000 }));
    this.addChild(text('THE BUYBACK', 20, 44, { color: II.sodium, shadow: 0x000000 }));
    this.addChild(new Graphics().rect(20, 55, 122, 1).fill(II.blood));
    this.addChild(text(label.toUpperCase(), 20, 60, { small: true, color: II.bone, width: 200, maxLines: 2 }));
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    this.addChild(text(tip, 20, H - 30, { width: W - 40, color: II.ash, small: true, maxLines: 2 }));
    this.addChild(text('THE WAREHOUSE', 282, 52, { width: 150, align: 'center', small: true, color: 0xffe8e0 }));
    this.status = text('', 20, H - 52, { color: II.sodium, small: true });
    this.addChild(this.status);
  }

  /** The street, the building and the door: drawn once. */
  private backdrop(): Graphics {
    const g = new Graphics();
    // sky: night, a sodium glow on the clouds
    for (let y = 0; y < H; y += 2) {
      const k = y / H;
      g.rect(-OX, y, SW, 2).fill(shade(0x0c0a14, -0.1 + k * 0.18));
    }
    // the warehouse: corrugated wall from x 230 to the right edge
    const wx = 226;
    g.rect(wx, 40, SW - OX - wx, 160).fill(0x16141c);
    for (let x = wx; x < SW - OX; x += 4) g.rect(x, 40, 1, 160).fill({ color: 0x000000, alpha: 0.35 });
    g.rect(wx, 36, SW - OX - wx, 5).fill(0x0c0a10);
    // the sign over the door
    g.rect(282, 50, 150, 16).fill(0x0c0a10).stroke({ color: II.edge, width: 1 });
    // the roller door, half up: the inside is lit
    g.rect(292, 70, 130, 130).fill(0x1c1812);
    for (let y = 70; y < 112; y += 3) g.rect(292, y, 130, 2).fill(0x2a2630).rect(292, y + 2, 130, 1).fill(0x111016);
    g.rect(292, 112, 130, 88).fill(0x3a2a16);
    // the cage inside: chain-link diamonds against the light
    for (let x = 296; x < 420; x += 6) for (let y = 116; y < 196; y += 6) g.rect(x + ((y / 6) % 2 ? 3 : 0), y, 1, 1).fill({ color: 0x000000, alpha: 0.5 });
    g.rect(292, 112, 130, 2).fill({ color: 0xffd080, alpha: 0.5 });
    // pavement
    g.rect(-OX, 200, SW, H - 200).fill(0x0c0b10);
    for (let y = 202; y < H; y += 5) g.rect(-OX, y, SW, 1).fill({ color: 0xffffff, alpha: 0.02 });
    // the light spilling out of the door onto the wet street
    for (let k = 0; k < 10; k++) {
      const a = 0.11 - k * 0.01;
      g.poly([292 - k * 6, 200 + k * 7, 422 + k * 6, 200 + k * 7, 430 + k * 7, 207 + k * 7, 284 - k * 7, 207 + k * 7]).fill({ color: II.sodium, alpha: Math.max(0.01, a) });
    }
    // a streetlight on the left
    g.rect(196, 60, 2, 140).fill(0x1c1a22).rect(196, 60, 14, 2).fill(0x1c1a22).rect(206, 62, 6, 3).fill(II.sodium);
    g.poly([209, 65, 170, 200, 250, 200]).fill({ color: II.sodium, alpha: 0.05 });
    return g;
  }

  update(dt: number): boolean {
    this.t += dt;
    this.poseT -= dt;
    if (this.poseT <= 0) {
      this.pose = SEQ[Math.floor(this.t * 3) % SEQ.length];
      this.poseT = this.pose === 'guard' ? 0.2 : 0.28;
    }
    this.rig = lerpRig(this.rig, POSES[this.pose], Math.min(1, dt * 16));
    const g = this.sceneG;
    g.clear();
    // the shadowboxer, backlit in the doorway, his shadow thrown long toward us
    const x = Math.round(354 + Math.sin(this.t * 1.7) * 3);
    g.ellipse(x, 197, 18, 3).fill({ color: 0x000000, alpha: 0.6 });
    g.poly([x - 8, 198, x + 8, 198, x + 26, 226, x - 26, 226]).fill({ color: 0x000000, alpha: 0.28 });
    drawRig(g, this.rig, x, 196, -1, SHADOW, 0.95);
    g.updateCacheTexture();

    // rain, the sign flicker, steam off the grate
    const f = this.fx;
    f.clear();
    let s = 77;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 110; i++) {
      const rx = (rnd() * SW - this.t * 30) % SW;
      const ry = (rnd() * H + this.t * (150 + rnd() * 80)) % H;
      f.rect(Math.round((rx < 0 ? rx + SW : rx) - OX), Math.round(ry), 1, 3).fill({ color: 0x9ab0c8, alpha: 0.28 });
    }
    // splashes in the puddle of light
    for (let i = 0; i < 6; i++) {
      const p = (this.t * 1.3 + i * 0.37) % 1;
      f.ellipse(300 + ((i * 53) % 120), 206 + ((i * 17) % 30), 1 + p * 4, 0.5 + p).stroke({ color: II.sodium, width: 1, alpha: 0.4 * (1 - p) });
    }
    const flick = Math.sin(this.t * 23) > -0.9 || Math.sin(this.t * 3.1) > 0.4;
    f.rect(286, 54, 142, 8).fill({ color: II.blood, alpha: flick ? 0.9 : 0.25 });
    f.rect(286, 54, 142, 8).fill({ color: 0xff6060, alpha: flick ? 0.08 : 0 });

    // progress: forty segments, one per Saturday (theatre)
    const p = this.done ? 1 : Math.min(0.92, 1 - Math.exp(-this.t * 2.2));
    const b = this.bar;
    b.clear();
    const lit = Math.round(40 * p);
    for (let k = 0; k < 40; k++) b.rect(20 + k * 5, H - 40, 4, 4).fill(k < lit ? (k === lit - 1 ? II.gold : II.sodium) : 0x221e28);
    this.status.setText(STATUS[Math.floor(this.t * 1.4) % STATUS.length].toUpperCase() + '...');
    if (this.done) {
      this.fade -= dt * 4;
      this.alpha = Math.max(0, this.fade);
    }
    return this.fade > 0;
  }
}
