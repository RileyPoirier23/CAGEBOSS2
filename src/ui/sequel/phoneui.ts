/**
 * The phone, on screen: a handset in the middle of the screen with three tabs. CALLS (one a
 * week; pick up or don't), BLEETER (post once a week, watch the replies come in) and DMs (the
 * plug's three offers). Everything it does goes through sequel/phone.ts.
 */
import { Container, Graphics } from 'pixi.js';
import type { Game } from '../app';
import { W, H, text, button } from '../kit';
import { sfx } from '../../audio/sfx';
import { II } from '../theme';
import { BLEETS, answerCall, bleetedThisWeek, buyFromPlug, callThisWeek, plugOffers, postBleet, type PhoneOwner } from '../../sequel/phone';
import { money } from '../../core/format';

type Tab = 'calls' | 'bleeter' | 'dms';

export function openPhone(g: Game, owner: PhoneOwner, save: () => void, after: () => void): void {
  const PW = 190;
  const PH = 250;
  const x0 = Math.round((W - PW) / 2);
  const y0 = Math.round((H - PH) / 2);
  const root = new Container();
  const wrap = g.modal(root, { dim: 0.75, closeOnDim: true });
  let tab: Tab = callThisWeek(owner) ? 'calls' : 'bleeter';
  const body = new Container();
  const close = () => {
    g.closeModal(wrap);
    after();
  };
  const draw = () => {
    root.removeChildren().forEach((c) => c.destroy({ children: true }));
    // the handset
    const hs = new Graphics();
    hs.roundRect(x0 - 2, y0 - 2, PW + 4, PH + 4, 12).fill(0x050407);
    hs.roundRect(x0, y0, PW, PH, 10).fill(0x121016).stroke({ color: II.edge, width: 1 });
    hs.roundRect(x0 + PW / 2 - 18, y0 + 4, 36, 5, 2).fill(0x000000); // the notch
    hs.roundRect(x0 + 6, y0 + 14, PW - 12, PH - 40, 4).fill(0x0c0b12);
    root.addChild(hs);
    root.addChild(text('9:41', x0 + 10, y0 + 4, { small: true, color: II.ash }));
    root.addChild(text('4G', x0 + PW - 24, y0 + 4, { small: true, color: II.ash }));
    // tabs
    const tabs: [Tab, string][] = [['calls', callThisWeek(owner) ? 'CALLS (1)' : 'CALLS'], ['bleeter', 'BLEETER'], ['dms', 'DMS']];
    tabs.forEach(([id, label], i) => {
      root.addChild(button(label, x0 + 8 + i * 59, y0 + PH - 22, 56, 14, () => { tab = id; sfx('click'); draw(); }, { small: true, fill: tab === id ? II.blood : II.steel, border: tab === id ? II.sodium : undefined }));
    });
    root.addChild(button('X', x0 + PW - 18, y0 + 16, 12, 10, close, { small: true, fill: II.steel }));
    body.removeChildren().forEach((c) => c.destroy({ children: true }));
    root.addChild(body);
    const bx = x0 + 10;
    let by = y0 + 30;
    const say = (s: string, color: number = II.bone, small = true) => {
      const t = text(s, bx, by, { width: PW - 20, small, color, maxLines: 8 });
      body.addChild(t);
      by += t.textHeight + 5;
    };
    if (tab === 'calls') {
      const call = callThisWeek(owner);
      if (!call) {
        say('NO CALLS. EVERYBODY IS BUSY OR ASLEEP.', II.ash);
        return;
      }
      say(`INCOMING: ${call.from}`, II.gold);
      say(call.text);
      call.choices.forEach((c) => {
        body.addChild(button(c.label, bx, by, PW - 20, 14, () => {
          const reply = answerCall(owner, call, call.choices.indexOf(c));
          save();
          sfx('click');
          body.removeChildren().forEach((ch) => ch.destroy({ children: true }));
          by = y0 + 30;
          say(`${call.from}`, II.gold);
          say(reply);
        }, { small: true, fill: II.steel, align: 'left' }));
        by += 17;
      });
    } else if (tab === 'bleeter') {
      say('BLEETER  /  @' + owner.boss.replace(/\s+/g, '').toLowerCase(), II.neon);
      if (bleetedThisWeek(owner)) {
        say('You have posted this week. Let it breathe. (Bradie says the algorithm hates a double post.)', II.ash);
        return;
      }
      say('ONE POST A WEEK. WHAT ARE WE SAYING?', II.ash);
      BLEETS.forEach((b) => {
        body.addChild(button(b.label, bx, by, PW - 20, 14, () => {
          const res = postBleet(owner, b);
          save();
          sfx('click');
          body.removeChildren().forEach((ch) => ch.destroy({ children: true }));
          by = y0 + 30;
          say('@' + owner.boss.replace(/\s+/g, '').toLowerCase(), II.neon);
          say(res.post);
          for (const [who, r] of res.replies) {
            say(who, II.gold);
            say(r, II.ash);
          }
        }, { small: true, fill: II.steel, align: 'left' }));
        by += 17;
      });
    } else {
      say('THE PLUG  /  (no name, no photo)', II.blood);
      say(`you have ${money(owner.cash)}. heres whats on this week`, II.ash);
      for (const o of plugOffers(owner)) {
        say(`${o.name}${o.price ? `  /  ${money(o.price)}` : ''}`, II.gold);
        say(o.text, II.ash);
        body.addChild(button(o.price ? 'BUY' : 'DO IT', bx + PW - 64, by - 4, 44, 12, () => {
          const res = buyFromPlug(owner, o, Math.random());
          save();
          sfx(res.ok ? 'cash' : 'error');
          g.toast(res.text.toUpperCase(), res.ok ? II.gold : II.blood);
          draw();
        }, { small: true, fill: II.blood }));
        by += 12;
      }
    }
  };
  draw();
}
