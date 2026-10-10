// UI atlas: skill icons (from each champion's art module), status icons, HUD
// parts, menu parts and portraits, packed into public/assets/ui/ui.png with
// a JSON index. Runtime lookups: src/game/view/assets.ts (UiJson).
import path from 'node:path';
import { PIVOT } from '../char.ts';
import { CHAMPION_ART } from '../champions/index.ts';
import { writeJson } from '../io.ts';
import { UIR } from '../palette.ts';
import { rampDither } from '../paint.ts';
import { Bitmap, hex } from '../raster.ts';
import { solve } from '../rig.ts';
import { banner, button, chevron, footRing, GLYPHS, panel, skillFrame, smallGlyph } from './kit.ts';
import { arrow, bigButton, cardFrame, check, crown, divider, emblem, gem, lock, logo, mapNode, MENU_ICONS, newBadge, nodeGlow, podium, roleIcon, star, tab, well } from './menu.ts';
import { matrixParts } from './matrix.ts';
import { STATUS_ICONS, statusIcon } from './status.ts';

type Rect4 = [number, number, number, number];

export interface UiJson {
  icons: Record<string, Rect4>;
  status: Record<string, { rect: Rect4; buff: boolean }>;
  parts: Record<string, Rect4>;
  portraits: Record<string, Rect4>;
}

/** Head-and-shoulders portrait (28x28) from idle frame 0, always facing right. */
function portrait(id: string, frame: Bitmap): Bitmap {
  const art = CHAMPION_ART[id];
  const c = art.char;
  const s = solve(c.anims.idle.frames[0].pose, c.dims);
  const hx = Math.round(PIVOT.x + s.head.x), hy = Math.round(PIVOT.y - s.head.y);
  const S = 28;
  const out = new Bitmap(S, S);
  const ramp = art.iconBg.ramp;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) out.set(x, y, rampDither([ramp[1], ramp[2], ramp[3]], 1.8 - Math.hypot(x - 14, y - 10) / 12, x, y));
  out.blit(frame, 0, 0, { src: { x: hx - 13, y: hy - 11, w: S, h: S } });
  return out;
}

/** All menu and HUD parts by name. */
export function allParts(): Record<string, Bitmap> {
  const parts: Record<string, Bitmap> = {
    panel: panel('dark'),
    panel_gold: panel('gold'),
    panel_red: panel('red'),
    btn_up: button('up'),
    btn_hover: button('hover'),
    btn_down: button('down'),
    btn_off: button('off'),
    frame_idle: skillFrame('idle'),
    frame_sel: skillFrame('sel'),
    frame_off: skillFrame('off'),
    ring_ally: footRing(['#0a2a4a', '#2f86c0', '#7fd8ff'], false, 0),
    ring_enemy: footRing(['#3a0a0a', '#c02020', '#ff6a5a'], false, 0),
    banner: banner(),
    chevron_red: chevron(['#3a0a0a', '#c02020', '#ff6a5a', '#ffd0c0']),
    chevron_gold: chevron(['#3a2a06', '#c09020', '#ffe070', '#fffbe0']),
    chevron_green: chevron(['#0a3a14', '#30b050', '#a8ffa0', '#f0fff0']),
    // menus
    logo: logo(),
    big_up: bigButton('up'),
    big_hover: bigButton('hover'),
    big_down: bigButton('down'),
    big_off: bigButton('off'),
    well: well(),
    tab_on: tab(true),
    tab_off: tab(false),
    card_locked: cardFrame(UIR.stone),
    lock: lock(),
    crown: crown(),
    check: check(),
    new: newBadge(),
    arrow_l: arrow(-1),
    arrow_r: arrow(1),
    star_s: star(9, true),
    star_s_off: star(9, false),
    star_m: star(13, true),
    star_m_off: star(13, false),
    star_l: star(25, true),
    star_l_off: star(25, false),
    podium: podium(),
    divider: divider(),
  };
  for (const [r, ramp] of Object.entries(UIR.rarity)) parts['card_' + r] = cardFrame(ramp);
  for (const a of Object.keys(UIR.affinity) as (keyof typeof UIR.affinity)[]) parts['gem_' + a] = gem(a);
  for (const f of Object.keys(UIR.faction) as (keyof typeof UIR.faction)[]) parts['emblem_' + f] = emblem(f);
  for (const r of Object.keys(UIR.role) as (keyof typeof UIR.role)[]) parts['role_' + r] = roleIcon(r);
  for (const k of ['open', 'cleared', 'locked', 'boss'] as const) parts['node_' + k] = mapNode(k);
  for (let i = 0; i < 3; i++) {
    parts['ring_active_' + i] = footRing(['#3a2a06', '#c09020', '#ffe070'], true, i * 0.13);
    parts['ring_target_' + i] = footRing(['#3a0a0a', '#e03a2a', '#ffb090'], true, i * 0.13);
    parts['ring_heal_' + i] = footRing(['#0a3a14', '#30b050', '#a8ffa0'], true, i * 0.13);
    parts['node_glow_' + i] = nodeGlow(i * 0.67);
  }
  for (const [k, g] of Object.entries(GLYPHS)) parts['g_' + k] = smallGlyph(g);
  for (const [k, make] of Object.entries(MENU_ICONS)) parts['mi_' + k] = make();
  Object.assign(parts, matrixParts());
  return parts;
}

export function buildUi(out: string, frames: { id: string; bmp: Bitmap }[]) {
  const json: UiJson = { icons: {}, status: {}, parts: {}, portraits: {} };
  const sheet = new Bitmap(1024, 1024);
  let x = 0, y = 0, rowH = 0;
  const put = (bmp: Bitmap, rec: (r: Rect4) => void) => {
    if (x + bmp.w > sheet.w) {
      x = 0;
      y += rowH + 1;
      rowH = 0;
    }
    sheet.blit(bmp, x, y);
    rec([x, y, bmp.w, bmp.h]);
    x += bmp.w + 1;
    rowH = Math.max(rowH, bmp.h);
  };
  const newRow = () => {
    x = 0;
    y += rowH + 2;
    rowH = 0;
  };
  for (const art of Object.values(CHAMPION_ART)) for (const [id, make] of Object.entries(art.icons)) put(make(), (r) => (json.icons[id] = r));
  newRow();
  for (const [id, def] of Object.entries(STATUS_ICONS)) put(statusIcon(def), (r) => (json.status[id] = { rect: r, buff: def.buff }));
  newRow();
  const parts = allParts();
  // big parts first so the shelf rows stay tight
  const order = Object.entries(parts).sort((a, b) => b[1].h - a[1].h);
  for (const [id, bmp] of order) put(bmp, (r) => (json.parts[id] = r));
  newRow();
  for (const f of frames) put(portrait(f.id, f.bmp), (r) => (json.portraits[f.id] = r));
  const used = sheet.crop({ x: 0, y: 0, w: sheet.w, h: y + rowH + 1 });
  used.save(path.join(out, 'ui', 'ui.png'));
  writeJson(path.join(out, 'ui', 'ui.json'), json);

  // docs showcase (2x): one row per champion, A1..A3 left to right
  const ids = Object.keys(CHAMPION_ART);
  const show = new Bitmap(3 * 44 + 4, ids.length * 44 + 4);
  show.fill(hex('#141a28'));
  ids.forEach((cid, ri) => {
    Object.keys(CHAMPION_ART[cid].icons).forEach((sid, ci) => {
      const r = json.icons[sid];
      show.blit(used, 4 + ci * 44, 4 + ri * 44, { src: { x: r[0], y: r[1], w: r[2], h: r[3] } });
    });
  });
  show.scaled(2).save(path.join('docs', 'images', 'skill_icons.png'));
  console.log(`  ui: ${Object.keys(json.icons).length} skill icons, ${Object.keys(STATUS_ICONS).length} status icons, ${Object.keys(parts).length} parts, ${frames.length} portraits -> ${used.w}x${used.h}`);
}
