/**
 * MONCTON: walk Main Street between home, Ray's, the diner, the warehouse, the Coliseum and the
 * bus station. Each door holds the hub's actions for that place; the story's next beat waits behind
 * the door with the bouncing marker. The time of day follows the days you have left this week, and
 * it snows in the winter months.
 *
 *   walk   : arrows / A,D / left stick / hold either side of the screen (or tap a building)
 *   enter  : Enter / Space / A (or tap the door)
 *   leave  : Esc / B / the X
 */
import { Container, Graphics, Ticker } from 'pixi.js';
import type { Game } from '../app';
import type { Fighter } from '../../core/types';
import { PAL, shade, lerpColor } from '../../art/palette';
import { W, H, SW, OX, text, button } from '../kit';
import { drawRig, lerpRig, lookFor, POSES, type Look2 } from '../rig';
import { CAST } from '../cutscene';
import { II } from '../theme';
import { input } from '../../core/input';
import { setPadUiMode } from '../controller';
import { sfx } from '../../audio/sfx';
import { PLACES, STREET_W, place, type PlaceId } from '../../sequel/moncton';

export interface MapAct { label: string; fn: () => void; hot?: boolean }

export interface MonctonOpts {
  walker: Fighter;
  acts: Record<PlaceId, MapAct[]>;
  marker: { place: PlaceId; label: string } | null;
  /** 0 (morning) .. 1 (night) */
  dusk: number;
  snow: boolean;
  /** a line for the top bar (the date, the days left) */
  status: string;
  /** where you came in (the door you left by last time) */
  from?: PlaceId;
}

const GROUND = 214; // the sidewalk
let lastDoor: PlaceId = 'home';

export function openMoncton(g: Game, o: MonctonOpts): void {
  const root = new Container();
  const wrap = g.modal(root, { dim: 1, fit: false });
  setPadUiMode('game');
  const sky = new Graphics();
  const far = new Graphics();
  const world = new Container();
  const street = new Graphics();
  const people = new Graphics();
  const fx = new Graphics();
  const hud = new Container();
  root.addChild(sky, far, world, fx, hud);
  world.addChild(street, people);
  for (const c of [sky, far, world, fx]) c.eventMode = 'none';

  const look: Look2 = (() => {
    const L = lookFor(o.walker, 0);
    // street clothes: a hoodie and jeans in Moncton weather
    return { ...L, outfit: { top: 0x3a3440, bottom: 0x2a3448, bulk: 1, hands: L.skin } };
  })();
  const startAt = place(o.from ?? lastDoor);
  let x = startAt.x + startAt.w / 2;
  let facing: 1 | -1 = 1;
  let walkPh = 0;
  let rig = { ...POSES.stand };
  let t = 0;
  let target: number | null = null;
  let menu: Container | null = null;
  const keys = new Set<string>();
  const flakes = Array.from({ length: o.snow ? 70 : 0 }, () => ({ x: Math.random() * SW, y: Math.random() * H, v: 10 + Math.random() * 14 }));
  const cars: { x: number; v: number; c: number }[] = [{ x: 200, v: 60, c: 0x6a1a1a }, { x: 900, v: -48, c: 0x2a3a5a }, { x: 1300, v: 54, c: 0x8a8a7a }];

  // ---------------------------------------------------------------- the city
  const night = o.dusk;
  const skyTop = lerpColor(0x5a7ab0, 0x0a0c1c, night);
  const skyBot = lerpColor(0xe0b088, 0x2a1a30, night);
  const lit = night > 0.45;

  const drawSky = () => {
    sky.clear();
    for (let i = 0; i < 12; i++) sky.rect(-OX, (i * H) / 12, SW, H / 12 + 1).fill(lerpColor(skyTop, skyBot, i / 11));
    if (lit) for (let i = 0; i < 40; i++) sky.rect(((i * 131) % SW) - OX, (i * 29) % 80, 1, 1).fill({ color: 0xffffff, alpha: 0.6 });
    // the moon or the sun
    if (lit) sky.circle(W - 60, 34, 10).fill(0xf0ecd8);
    else sky.circle(W - 70, 40 + night * 60, 12).fill(0xfff0c0);
  };

  const drawFar = (cam: number) => {
    far.clear();
    // the skyline and the Petitcodiac's bridge, slower than the street
    const off = cam * 0.3;
    const col = lerpColor(0x5a6078, 0x14121e, night);
    for (let i = 0; i < 30; i++) {
      const bx = i * 70 - (off % 70) - OX - 70;
      const h = 40 + ((i * 37 + Math.floor(off / 70) * 13) % 60);
      far.rect(bx, GROUND - 40 - h, 52, h + 40).fill(col);
      if (lit) for (let k = 0; k < 6; k++) if (((i + k) * 7) % 3 === 0) far.rect(bx + 6 + (k % 3) * 15, GROUND - 30 - h + Math.floor(k / 3) * 14, 4, 5).fill({ color: 0xf0c060, alpha: 0.7 });
    }
  };

  const sign = (s: string, cx: number, y: number, fill: number, color: number) => {
    const c = text(s, 0, y + 3, { small: true, color });
    const w = c.textWidth + 10;
    street.rect(cx - w / 2, y, w, 12).fill(fill).stroke({ color: 0x0a0808, width: 1 });
    c.x = Math.round(cx - c.textWidth / 2);
    world.addChild(c);
  };

  // buildings are drawn once (their signs are text); people and cars every frame
  const drawStreet = () => {
    street.clear();
    // road, curb, sidewalk
    street.rect(-200, GROUND, STREET_W + 400, H - GROUND).fill(lerpColor(0x5a5a60, 0x1e1e24, night));
    street.rect(-200, GROUND, STREET_W + 400, 3).fill(lerpColor(0x8a8a90, 0x3a3a44, night));
    street.rect(-200, GROUND + 26, STREET_W + 400, H - GROUND - 26).fill(lerpColor(0x3a3a40, 0x121216, night));
    for (let lx = 0; lx < STREET_W; lx += 60) street.rect(lx, GROUND + 40, 26, 2).fill(lerpColor(0xd8c070, 0x6a5a30, night));
    if (o.snow) street.rect(-200, GROUND, STREET_W + 400, 4).fill(0xe8eef4);
    for (const p of PLACES) {
      const bx = p.x;
      const w = p.w;
      const dark = night * 0.6;
      const door = bx + w / 2;
      const win = (wx: number, wy: number, ww: number, wh: number) => street.rect(wx, wy, ww, wh).fill(lit ? 0xf0c868 : lerpColor(0x8ab0d0, 0x2a3a4a, dark)).stroke({ color: 0x0a0808, width: 1 });
      switch (p.id) {
        case 'home': {
          street.rect(bx, GROUND - 110, w, 110).fill(shade(0x8a6a50, -dark));
          for (let k = 0; k < 4; k++) win(bx + 12 + (k % 2) * 60, GROUND - 100 + Math.floor(k / 2) * 36, 34, 22);
          street.rect(bx + w / 2 - 12, GROUND - 34, 24, 34).fill(0x3a2a20);
          street.rect(bx, GROUND - 46, w, 6).fill(shade(0x2a6a8a, -dark)); // the laundromat awning
          sign('LAUNDROMAT  /  APT 2B', door, GROUND - 60, 0x1a2a3a, 0xc8e0f0);
          break;
        }
        case 'rays': {
          street.rect(bx, GROUND - 120, w, 120).fill(shade(0x8a3a2a, -dark));
          for (let k = 0; k < 18; k++) street.rect(bx + (k % 6) * 35, GROUND - 120 + Math.floor(k / 6) * 12, 34, 1).fill({ color: 0x000000, alpha: 0.2 });
          win(bx + 14, GROUND - 74, 56, 40);
          win(bx + w - 70, GROUND - 74, 56, 40);
          // the soup steaming in the window
          street.rect(bx + 30, GROUND - 46, 22, 10).fill(0xc8c0b0).rect(bx + 30, GROUND - 48, 22, 2).fill(0x8a8070);
          street.rect(door - 14, GROUND - 40, 28, 40).fill(0x2a1a14).rect(door - 14, GROUND - 40, 28, 2).fill(II.blood);
          sign("RAY'S BOXING & SOUP", door, GROUND - 108, II.blood, 0xfff0d0);
          // the glove over the door
          street.roundRect(door - 7, GROUND - 92, 14, 12, 4).fill(0xc4202c).rect(door - 2, GROUND - 80, 4, 6).fill(0xe8e4d8);
          // the alley behind it
          street.rect(bx + w, GROUND - 90, 50, 90).fill(lerpColor(0x2a2224, 0x0a0808, night));
          break;
        }
        case 'diner': {
          street.rect(bx, GROUND - 74, w, 74).fill(shade(0xb8bcc4, -dark));
          street.rect(bx, GROUND - 30, w, 4).fill(shade(0x2aa8a0, -dark));
          for (let k = 0; k < 4; k++) win(bx + 10 + k * 40, GROUND - 64, 30, 26);
          street.rect(door - 10, GROUND - 34, 20, 34).fill(0x3a4a50);
          sign('THE MAGNETIC DINER', door, GROUND - 92, lit ? 0x2a0a2a : 0x3a1a3a, lit ? 0xff6ad0 : 0xf0b0e0);
          break;
        }
        case 'warehouse': {
          street.rect(bx, GROUND - 104, w, 104).fill(shade(0x5a5a52, -dark));
          for (let k = 0; k < w; k += 6) street.rect(bx + k, GROUND - 104, 1, 104).fill({ color: 0x000000, alpha: 0.18 });
          street.rect(door - 40, GROUND - 60, 80, 60).fill(0x2a2a26).stroke({ color: 0x0a0a08, width: 1 });
          for (let k = 0; k < 8; k++) street.rect(door - 40, GROUND - 60 + k * 7, 80, 1).fill(0x4a4a44);
          street.rect(bx + 20, GROUND - 98, w - 40, 22).fill(0x1a1414);
          sign('THE WAREHOUSE  /  CAGE BOSS II', door, GROUND - 93, 0xc4202c, 0xfff0d0);
          break;
        }
        case 'coliseum': {
          street.rect(bx, GROUND - 130, w, 130).fill(shade(0xa89880, -dark));
          street.poly([bx - 10, GROUND - 130, bx + w / 2, GROUND - 160, bx + w + 10, GROUND - 130]).fill(shade(0x8a7a64, -dark));
          for (let k = 0; k < 6; k++) street.rect(bx + 14 + k * 42, GROUND - 120, 24, 70).fill(shade(0x6a5a48, -dark));
          // the marquee
          street.rect(door - 70, GROUND - 46, 140, 16).fill(0x1a1410).stroke({ color: 0xf0c060, width: 1 });
          for (let k = 0; k < 14; k++) street.circle(door - 66 + k * 10, GROUND - 48, 1.2).fill(lit && Math.sin(t * 6 + k) > 0 ? 0xfff0a0 : 0x8a7040);
          street.rect(door - 30, GROUND - 30, 60, 30).fill(0x2a2018);
          sign('MONCTON COLISEUM', door, GROUND - 146, 0x1a1410, 0xf0c060);
          break;
        }
        case 'bus': {
          street.rect(bx, GROUND - 70, w, 70).fill(shade(0x2a4a7a, -dark));
          win(bx + 10, GROUND - 60, w - 20, 26);
          street.rect(door - 12, GROUND - 30, 24, 30).fill(0x1a2a3a);
          sign('MARITIME BUS', door, GROUND - 88, 0x1a2a4a, 0xf0f0f0);
          break;
        }
      }
    }
  };

  // ---------------------------------------------------------------- people, the marker, the HUD
  const rayLook = { ...CAST.ray };
  const doorX = (id: PlaceId) => place(id).x + place(id).w / 2;
  const atDoor = (): PlaceId | null => {
    for (const p of PLACES) if (Math.abs(x - doorX(p.id)) < 28) return p.id;
    return null;
  };

  const drawPeople = () => {
    people.clear();
    // Ray on his step, waving when he wants a word
    const rx = doorX('rays') + 26;
    const wave = o.marker?.place === 'rays' && Math.sin(t * 4) > 0;
    drawRig(people, wave ? lerpRig(POSES.stand, POSES.jab, 0.6) : POSES.stand, rx, GROUND, -1, rayLook, 0.6);
    // traffic
    for (const c of cars) {
      people.roundRect(c.x, GROUND + 14, 44, 12, 4).fill(c.c).rect(c.x + 8, GROUND + 9, 26, 7).fill(shade(c.c, -0.3));
      people.circle(c.x + 10, GROUND + 26, 4).fill(0x0a0a0a).circle(c.x + 34, GROUND + 26, 4).fill(0x0a0a0a);
      if (lit) people.rect(c.v > 0 ? c.x + 44 : c.x - 6, GROUND + 17, 6, 3).fill({ color: 0xfff0c0, alpha: 0.8 });
    }
    // you
    people.ellipse(x, GROUND + 1, 10, 2).fill({ color: 0x000000, alpha: 0.4 });
    const bob = Math.abs(Math.sin(walkPh)) * -1.2;
    drawRig(people, rig, Math.round(x), Math.round(GROUND + bob), facing, look, 0.64);
    // the story's marker: a bouncing pin over its door
    if (o.marker) {
      const mx = doorX(o.marker.place);
      const my = GROUND - (o.marker.place === 'coliseum' ? 176 : 132) + Math.sin(t * 4) * 3;
      people.poly([mx - 8, my, mx + 8, my, mx, my + 10]).fill(II.blood).stroke({ color: II.gold, width: 1 });
    }
  };

  const markerLabel = text('', 0, 0, { small: true, color: II.gold });
  world.addChild(markerLabel);
  const tag = text('', 0, 0, { small: true, color: PAL.bone });
  world.addChild(tag);

  const drawHud = () => {
    hud.removeChildren().forEach((c) => c.destroy({ children: true }));
    hud.addChild(new Graphics().rect(-OX, 0, SW, 14).fill({ color: 0x000000, alpha: 0.7 }));
    hud.addChild(text(`MONCTON  /  ${o.status}`, 6, 3, { small: true, color: II.gold }));
    const d = atDoor();
    const hint = d ? `ENTER: ${place(d).name}` : 'WALK: ARROWS / A,D   ENTER: ENTER   LEAVE: ESC';
    hud.addChild(text(hint, 0, H - 11, { small: true, color: d ? II.gold : PAL.ash, width: W, align: 'center' }));
    // the marker is off the screen: an arrow at the edge says which way
    if (o.marker) {
      const mx = doorX(o.marker.place) + world.x;
      if (mx < 0 || mx > W) {
        const left = mx < 0;
        hud.addChild(new Graphics().poly(left ? [8, 120, 20, 112, 20, 128] : [W - 8, 120, W - 20, 112, W - 20, 128]).fill(II.blood).stroke({ color: II.gold, width: 1 }));
        hud.addChild(text(o.marker.label, left ? 24 : W - 24 - 30, 116, { small: true, color: II.gold }));
      }
    }
  };
  const leaveBtn = button('X', W - 18, 1, 14, 12, () => close(), { small: true, fill: PAL.shadow });
  root.addChild(leaveBtn);

  // ---------------------------------------------------------------- entering a door
  const enter = (id: PlaceId) => {
    if (menu) return;
    sfx('click');
    lastDoor = id;
    const p = place(id);
    const acts = [...(o.acts[id] ?? [])].sort((a, b) => Number(!!b.hot) - Number(!!a.hot));
    menu = new Container();
    const mw = 220;
    const rows = Math.max(1, acts.length);
    const mh = 66 + rows * 18;
    const mx = Math.round((W - mw) / 2);
    const my = Math.round((H - mh) / 2) - 10;
    menu.addChild(new Graphics().rect(mx, my, mw, mh).fill({ color: 0x120c10, alpha: 0.97 }).stroke({ color: II.edge, width: 1 }));
    menu.addChild(text(p.name, mx + 8, my + 6, { color: II.gold }));
    menu.addChild(text(p.blurb, mx + 8, my + 18, { small: true, width: mw - 16, color: PAL.ash, maxLines: 3 }));
    acts.forEach((a, i) => {
      menu!.addChild(button(a.hot ? `${a.label}  <` : a.label, mx + 8, my + 44 + i * 18, mw - 16, 15, () => {
        close();
        a.fn();
      }, { small: true, fill: a.hot ? II.blood : PAL.shadow, border: a.hot ? II.gold : undefined }));
    });
    if (!acts.length) menu.addChild(text('Nothing on here this week.', mx + 8, my + 44, { small: true, color: PAL.grey }));
    menu.addChild(button('BACK OUTSIDE', mx + 8, my + 48 + rows * 18, mw - 16, 12, () => {
      menu?.destroy({ children: true });
      menu = null;
    }, { small: true, fill: PAL.shadow }));
    root.addChild(menu);
  };

  // tap / click: on a building walks there and goes in; held on an empty edge walks that way
  const hit = new Graphics().rect(-OX, 14, SW, H - 14).fill({ color: 0xffffff, alpha: 0.001 });
  hit.eventMode = 'static';
  hit.on('pointerdown', (e) => {
    if (menu) return;
    const p = root.toLocal(e.global);
    const wx = p.x - world.x;
    const b = PLACES.find((pl) => wx >= pl.x && wx <= pl.x + pl.w && p.y < GROUND + 4);
    target = b ? doorX(b.id) : wx;
  });
  root.addChildAt(hit, 3);

  const keyDown = (e: KeyboardEvent) => {
    if (e.defaultPrevented || g.modals[g.modals.length - 1] !== wrap) return;
    keys.add(e.key);
    if (menu) {
      if (e.key === 'Escape') {
        menu.destroy({ children: true });
        menu = null;
      }
      return;
    }
    if (e.key === 'Escape') close();
    if (e.key === 'Enter' || e.key === ' ') {
      const d = atDoor();
      if (d) enter(d);
    }
  };
  const keyUp = (e: KeyboardEvent) => keys.delete(e.key);
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    Ticker.shared.remove(tick);
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    setPadUiMode('cursor');
    g.closeModal(wrap);
  };
  wrap.once('destroyed', () => {
    if (closed) return;
    closed = true;
    Ticker.shared.remove(tick);
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    setPadUiMode('cursor');
  });

  // automation hook (tests / tours)
  (window as unknown as { __moncton?: unknown }).__moncton = { walkTo: (id: PlaceId) => (target = doorX(id)), enter, get x() { return x; }, atDoor };

  const tick = (tk: Ticker) => {
    if (closed || g.modals[g.modals.length - 1] !== wrap) return;
    const dt = Math.min(0.05, tk.deltaMS / 1000);
    t += dt;
    let dir = 0;
    if (!menu) {
      if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) dir -= 1;
      if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) dir += 1;
      const st = input.stick('left');
      if (Math.abs(st.x) > 0.3) dir = Math.sign(st.x);
      if (input.buttonPressed('A')) {
        const d = atDoor();
        if (d) enter(d);
      }
      if (input.buttonPressed('B')) return close();
      if (dir) target = null;
      else if (target !== null) {
        if (Math.abs(target - x) < 3) {
          // walked up to a door you tapped: go in
          const d = atDoor();
          target = null;
          if (d && Math.abs(doorX(d) - x) < 4) enter(d);
        }
        else dir = Math.sign(target - x);
      }
    }
    else if (input.buttonPressed('B')) {
      menu.destroy({ children: true });
      menu = null;
    }
    const speed = 92;
    x = Math.max(20, Math.min(STREET_W - 20, x + dir * speed * dt));
    if (dir) {
      facing = dir > 0 ? 1 : -1;
      walkPh += dt * 7.5;
      rig = lerpRig(rig, lerpRig(POSES.walk1, POSES.walk2, (Math.sin(walkPh) + 1) / 2), 1 - Math.exp(-dt * 30));
    }
    else rig = lerpRig(rig, POSES.stand, 1 - Math.exp(-dt * 11));
    for (const c of cars) {
      c.x += c.v * dt;
      if (c.x > STREET_W + 200) c.x = -200;
      if (c.x < -200) c.x = STREET_W + 200;
    }
    const cam = Math.max(0, Math.min(STREET_W - W, x - W / 2));
    world.x = -Math.round(cam);
    drawFar(cam);
    drawPeople();
    // labels that follow their doors
    if (o.marker) {
      markerLabel.setText(o.marker.label);
      markerLabel.x = Math.round(doorX(o.marker.place) - markerLabel.textWidth / 2);
      markerLabel.y = GROUND - (o.marker.place === 'coliseum' ? 188 : 144) + Math.round(Math.sin(t * 4) * 3);
    }
    const d = atDoor();
    tag.setText(d ? 'ENTER' : '');
    tag.x = Math.round(x - 12);
    tag.y = GROUND - 62;
    fx.clear();
    for (const f of flakes) {
      f.y += f.v * dt;
      f.x += Math.sin(t + f.y * 0.05) * 6 * dt;
      if (f.y > H) f.y = 0;
      fx.rect(Math.round(f.x) - OX, Math.round(f.y), 1, 1).fill(0xffffff);
    }
    drawHud();
  };

  drawSky();
  drawStreet();
  Ticker.shared.add(tick);
}
