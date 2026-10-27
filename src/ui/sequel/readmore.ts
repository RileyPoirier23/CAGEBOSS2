/**
 * READ MORE: any text CAGE BOSS II had to cut short with "..." opens here in full, in a
 * scrolling window (registered at boot with setTextExpander).
 */
import type { Game } from '../app';
import { text, button, ScrollBox } from '../kit';
import { openWindow } from '../widgets';
import { II } from '../theme';

export function openReadMore(g: Game, full: string): void {
  // nothing stacks: a second tap while one is open is ignored
  if (g.modals.some((m) => (m as { readMore?: boolean }).readMore)) return;
  const W2 = 320;
  const probe = text(full, 0, 0, { width: W2 - 24, color: II.bone });
  const bodyH = Math.min(150, Math.max(24, probe.textHeight + 6));
  probe.destroy();
  const win = openWindow(g, 'READ IT ALL', W2, bodyH + 44);
  (g.modals[g.modals.length - 1] as { readMore?: boolean }).readMore = true;
  const sb = new ScrollBox(W2 - 12, bodyH);
  sb.position.set(6, 4);
  sb.content.addChild(text(full, 0, 0, { width: W2 - 24, color: II.bone, noExpand: true }));
  sb.refresh();
  win.body.addChild(sb);
  win.body.addChild(button('GOT IT', (W2 - 70) / 2, bodyH + 10, 70, 14, () => win.close(), { small: true, fill: II.blood }));
}
