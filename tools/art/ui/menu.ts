// Menu and meta-game art: the OATHBOUND logo, big buttons, rarity card
// frames, affinity gems, faction emblems, role icons, stars, locks, crowns,
// campaign map nodes, tabs and menu glyphs. Same rules as the battle art:
// light from the top-left, 1px dark outlines, ramps from palette.ts (UIR).
// Layout and usage of every part: docs/UI_GUIDE.md.
import { MAT, UIR } from '../palette.ts';
import { dith, ellipseFill, ellipseRing, outline, polyFill, rampDither } from '../paint.ts';
import { sword } from '../parts.ts';
import { Bitmap, RGBA, withAlpha } from '../raster.ts';
import { Frame } from '../render.ts';
import { Draw, v, V } from '../rig.ts';

const G = UIR.gold;
const DARK = UIR.fill[0];

/** Paints a 1-bit mask in one color at (x, y). */
function mask(b: Bitmap, x: number, y: number, rows: string[], c: RGBA) {
  rows.forEach((row, yy) => [...row].forEach((ch, xx) => ch === '#' && b.set(x + xx, y + yy, c)));
}

// ---------------------------------------------------------------------------
// Logo: OATHBOUND in shaded gold strokes over a sworn blade
// ---------------------------------------------------------------------------

type Stroke = V[];
const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 10): V[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return v(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  });

// letter cells are 10 wide, 14 tall, y up
const LETTERS: Record<string, Stroke[]> = {
  O: [arc(5, 7, 4.4, 6.4, 0, 360, 28)],
  A: [[v(0.6, 0), v(5, 14)], [v(5, 14), v(9.4, 0)], [v(2.6, 5), v(7.4, 5)]],
  T: [[v(0, 13.4), v(10, 13.4)], [v(5, 13.4), v(5, 0)]],
  H: [[v(0.8, 0), v(0.8, 14)], [v(9.2, 0), v(9.2, 14)], [v(0.8, 7), v(9.2, 7)]],
  B: [[v(0.8, 0), v(0.8, 14)], [v(0.8, 13.6), v(5.4, 13.6), ...arc(5.4, 10.45, 3.15, 3.15, 90, -90, 8), v(0.8, 7.3)], [v(0.8, 7.3), v(5.8, 7.3), ...arc(5.8, 3.85, 3.45, 3.45, 90, -90, 8), v(0.8, 0.4)]],
  U: [[v(0.8, 14), ...arc(5, 4.6, 4.2, 4.2, 180, 360, 12), v(9.2, 14)]],
  N: [[v(0.8, 0), v(0.8, 14)], [v(0.8, 14), v(9.2, 0)], [v(9.2, 0), v(9.2, 14)]],
  D: [[v(0.8, 0), v(0.8, 14)], [v(0.8, 13.6), v(3.6, 13.6), ...arc(3.6, 7, 5.6, 6.6, 90, -90, 14), v(0.8, 0.4)]],
};

/** Distance from p to segment ab. */
function segDist(px: number, py: number, a: V, b: V): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1e-6;
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l2));
  return Math.hypot(px - a.x - dx * t, py - a.y - dy * t);
}

/**
 * The title: letters rasterized from strokes into a crisp mask, then shaded
 * like cast gold — a lit bevel on the top-left edges, a dark bevel on the
 * bottom-right, a face that darkens downward with a specular band — over the
 * oath-blade, with a drop shadow away from the key light.
 */
export function logo(word = 'OATHBOUND'): Bitmap {
  const S = 2.15, adv = 12.4, R = 2.9;
  const pad = 14;
  const w = Math.ceil(word.length * adv * S + pad * 2), h = 58;
  const top = 8, base = top + 14 * S; // letter cap line and baseline in px
  const m = new Uint8Array(w * h);
  [...word].forEach((ch, i) => {
    const strokes = (LETTERS[ch] ?? []).map((st) => st.map((p) => v(pad + i * adv * S + p.x * S, base - p.y * S)));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        for (const st of strokes) {
          for (let k = 0; k < st.length - 1; k++) {
            if (segDist(x + 0.5, y + 0.5, st[k], st[k + 1]) <= R) m[y * w + x] = 1;
          }
        }
      }
    }
  });
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < w && y < h ? m[y * w + x] : 0);
  const letters = new Bitmap(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;
      const litEdge = !at(x - 1, y) || !at(x, y - 1) || !at(x - 1, y - 1);
      const darkEdge = !at(x + 1, y) || !at(x, y + 1) || !at(x + 1, y + 1);
      const lit2 = !at(x - 2, y) || !at(x, y - 2);
      const dark2 = !at(x + 2, y) || !at(x, y + 2);
      const k = (y - top) / (base - top); // 0 cap line .. 1 baseline
      let c: RGBA;
      if (litEdge && !darkEdge) c = G[4];
      else if (darkEdge && !litEdge) c = G[1];
      else if (litEdge && darkEdge) c = G[2];
      else if (lit2 && !dark2) c = MAT.gold.ramp[4];
      else if (dark2 && !lit2) c = MAT.gold.ramp[2];
      else {
        // face: hard bands, bright at the cap line, a specular streak, darker toward the baseline
        c = k < 0.22 ? MAT.gold.ramp[4] : k < 0.36 ? G[4] : k < 0.66 ? MAT.gold.ramp[3] : MAT.gold.ramp[2];
      }
      letters.set(x, y, c);
    }
  }
  const outlined = outline(letters, G[0]);
  // the oath-blade lies under the word, point to the right
  const f = new Frame(w, h);
  const d = new Draw(f, 1, v(0, h));
  sword(d, v(4, h - base - 3), 0, { blade: MAT.silver, guard: MAT.gold, grip: MAT.leather, pommel: MAT.gold, len: w - 16, width: 3.6, guardW: 8, gripLen: 7, z: 1 });
  const blade = f.render({ selout: true });
  const out = new Bitmap(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (outlined.get(x - 2, y - 2) & 255) out.set(x, y, withAlpha(UIR.ink[0], 190));
  out.blit(blade, 0, 0);
  out.blit(outlined, 0, 0);
  return out;
}

// ---------------------------------------------------------------------------
// Buttons, wells, tabs, card frames (nine-slice sources)
// ---------------------------------------------------------------------------

/** 24x24 nine-slice (edge 8): navy fill, double gold bevel, corner studs. */
export function bigButton(state: 'up' | 'hover' | 'down' | 'off'): Bitmap {
  const S = 24;
  const b = new Bitmap(S, S);
  const rim = state === 'off' ? UIR.stone : G;
  const fill = state === 'off' ? [UIR.stone[1], UIR.stone[1], UIR.stone[2]] : state === 'hover' ? [UIR.fill[3], UIR.fill[4], UIR.navy[2]] : state === 'down' ? [UIR.fill[1], UIR.fill[1], UIR.fill[2]] : [UIR.fill[2], UIR.fill[3], UIR.fill[4]];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if ((x === 0 || x === S - 1) && (y === 0 || y === S - 1)) continue;
      const e = Math.min(x, y, S - 1 - x, S - 1 - y);
      const tl = x <= y ? x === e : y === e; // which side of the bevel
      const lit = (y === e && y < S / 2) || (x === e && x < S / 2);
      void tl;
      let c: RGBA;
      if (e === 0) c = rim[0];
      else if (e === 1) c = state === 'down' ? (lit ? rim[1] : rim[3]) : lit ? rim[4] : rim[2];
      else if (e === 2) c = state === 'down' ? rim[2] : lit ? rim[3] : rim[1];
      else if (e === 3) c = rim[0];
      else c = rampDither(fill, 2 - (y / S) * 2 + (state === 'hover' ? 0.3 : 0), x, y);
      b.set(x, y, c);
    }
  }
  // corner studs
  for (const [x, y] of [[4, 4], [S - 5, 4], [4, S - 5], [S - 5, S - 5]]) {
    b.set(x, y, rim[state === 'hover' ? 4 : 3]);
  }
  if (state === 'hover') for (let x = 5; x < S - 5; x += 2) b.set(x, 4, G[4]);
  return b;
}

/** Inset well (edge 6) for lists and text blocks. */
export function well(): Bitmap {
  const S = 16;
  const b = new Bitmap(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if ((x === 0 || x === S - 1) && (y === 0 || y === S - 1)) continue;
      const e = Math.min(x, y, S - 1 - x, S - 1 - y);
      const shadowSide = x === e || y === e; // inner shadow on the top-left (light comes from there)
      let c: RGBA;
      if (e === 0) c = UIR.navy[1];
      else if (e === 1) c = shadowSide ? UIR.fill[0] : UIR.navy[1];
      else c = withAlpha(UIR.fill[1], 235);
      b.set(x, y, c);
    }
  }
  return b;
}

/** Tab (edge 5): rounded top, open bottom when active. */
export function tab(on: boolean): Bitmap {
  const W = 16, H = 14;
  const b = new Bitmap(W, H);
  const rim = on ? G : UIR.navy;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (y === 0 && (x < 2 || x > W - 3)) continue;
      if (y === 1 && (x === 0 || x === W - 1)) continue;
      const edge = x === 0 || x === W - 1 || y === 0 || (y === 1 && (x === 1 || x === W - 2));
      if (!on && y === H - 1) {
        b.set(x, y, rim[0]);
        continue;
      }
      if (edge) b.set(x, y, rim[0]);
      else if (y === 1 || x === 1) b.set(x, y, rim[on ? 4 : 3]);
      else if (x === W - 2) b.set(x, y, rim[on ? 2 : 1]);
      else b.set(x, y, on ? rampDither([UIR.fill[3], UIR.fill[4]], 1 - y / H, x, y) : rampDither([UIR.fill[1], UIR.fill[2]], 1 - y / H, x, y));
    }
  }
  return b;
}

/** Card frame (24x24, edge 8) in a rarity ramp: bevel, inner line, corner gems. Center is transparent. */
export function cardFrame(ramp: RGBA[]): Bitmap {
  const S = 24;
  const b = new Bitmap(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if ((x === 0 || x === S - 1) && (y === 0 || y === S - 1)) continue;
      const e = Math.min(x, y, S - 1 - x, S - 1 - y);
      const lit = (y === e && y < S / 2) || (x === e && x < S / 2);
      if (e === 0) b.set(x, y, ramp[0]);
      else if (e === 1) b.set(x, y, lit ? ramp[4] : ramp[2]);
      else if (e === 2) b.set(x, y, lit ? ramp[3] : ramp[1]);
      else if (e === 3) b.set(x, y, ramp[0]);
    }
  }
  for (const [cx, cy] of [[3, 3], [S - 4, 3], [3, S - 4], [S - 4, S - 4]]) {
    for (const [dx, dy, k] of [[0, -1, 4], [-1, 0, 4], [0, 0, 4], [1, 0, 2], [0, 1, 2]] as const) b.set(cx + dx, cy + dy, ramp[k]);
  }
  return b;
}

// ---------------------------------------------------------------------------
// Small icons
// ---------------------------------------------------------------------------

/** Shades a filled shape lit from the top-left inside a ramp. */
function litFill(ramp: RGBA[], cx: number, cy: number, r: number, bias = 0) {
  return (x: number, y: number) => rampDither(ramp, 2.6 + bias - ((x + 0.5 - cx) / r) * 1.1 - ((y + 0.5 - cy) / r) * 1.1, x, y);
}

/** Affinity gems (11x11): a distinct cut per affinity so color is never the only cue. */
export function gem(aff: 'force' | 'wild' | 'arcane' | 'void'): Bitmap {
  const b = new Bitmap(11, 11);
  const r = UIR.affinity[aff];
  const c = 5.5;
  if (aff === 'force') {
    polyFill(b, [[5.5, 0.6], [10.4, 5.5], [5.5, 10.4], [0.6, 5.5]], litFill(r, c, c, 5));
    polyFill(b, [[5.5, 2.4], [8.6, 5.5], [5.5, 8.6], [2.4, 5.5]], litFill(r, c, c, 5, 0.6));
  } else if (aff === 'wild') {
    polyFill(b, [[9.8, 0.8], [10, 5], [7.6, 8.6], [3.6, 10.2], [1, 9.6], [1.2, 6], [3.6, 2.8], [6.8, 1.2]], litFill(r, c, c, 5));
    for (let k = 0; k < 7; k++) b.set(2 + k, 9 - k, r[1]);
  } else if (aff === 'arcane') {
    ellipseFill(b, c, c, 5, 5, (x, y) => litFill(r, c, c, 5)(x, y));
    for (const [x, y] of [[5, 2], [5, 3], [5, 7], [5, 8], [2, 5], [3, 5], [7, 5], [8, 5], [5, 5], [4, 4], [6, 6], [4, 6], [6, 4]]) b.set(x, y, r[4]);
  } else {
    polyFill(b, [[3, 0.8], [8, 0.8], [10.4, 5.5], [8, 10.2], [3, 10.2], [0.6, 5.5]], litFill(r, c, c, 5));
    ellipseFill(b, c, c, 2.4, 2.4, () => r[0]);
    b.set(5, 5, r[3]);
  }
  b.set(3, 3, r[4]);
  return outline(b, r[0]);
}

const EMBLEMS: Record<string, string[]> = {
  dawn: ['...#...', '.#.#.#.', '..###..', '#######', '..###..', '.#.#.#.', '...#...'],
  clans: ['.##.#..', '####.#.', '#####..', '####.#.', '.##.#..', '....#..', '....#..'],
  wildwood: ['.....##', '...####', '..#####', '.####.#', '.###.##', '.#.###.', '#......'],
  coven: ['...#...', '.#.#.#.', '..###..', '#######', '..###..', '.#.#.#.', '...#...'],
  temple: ['...#...', '..###..', '#.###.#', '##.#.##', '###.###', '.#####.', '..###..'],
  sunscar: ['..###..', '.#...#.', '.#...#.', '..###..', '#######', '...#...', '...#...'],
};

/** Faction medallion (15x15): gold rim, field color, glyph. */
export function emblem(faction: keyof typeof UIR.faction): Bitmap {
  const b = new Bitmap(15, 15);
  const [field, glyph] = UIR.faction[faction];
  ellipseFill(b, 7.5, 7.5, 7, 7, (x, y, d) => (d > 0.8 ? rampDither(G, 3.4 - (x + y - 14) / 9, x, y) : field));
  // the coven's flake has a crescent moon behind it to set it apart from dawn's sun
  if (faction === 'coven') ellipseRing(b, 7.5, 7.5, 4.6, 4.6, 1, (x, y, a) => (a > 0.6 && a < 2.6 ? UIR.navy[2] : 0));
  mask(b, 4, 4, EMBLEMS[faction], glyph);
  return outline(b, G[0]);
}

const ROLES: Record<string, string[]> = {
  Tank: ['#######', '#######', '#######', '#######', '.#####.', '..###..', '...#...'],
  Bruiser: ['###.###', '#######', '###.###', '...#...', '...#...', '...#...', '...#...'],
  Damage: ['......#', '.....##', '....##.', '#..##..', '.###...', '..##...', '.#..#..'],
  Support: ['..###..', '..###..', '#######', '#######', '#######', '..###..', '..###..'],
  Control: ['.#####.', '#.....#', '#.###.#', '#.#.#.#', '#.#...#', '#..###.', '.#.....'],
};

/** Role glyph (9x9) in the role color with a dark outline. */
export function roleIcon(role: keyof typeof UIR.role): Bitmap {
  const b = new Bitmap(9, 9);
  mask(b, 1, 1, ROLES[role], UIR.role[role]);
  return outline(b, DARK);
}

/** Five-point star; filled gold or an empty socket. */
export function star(size: number, filled: boolean): Bitmap {
  const b = new Bitmap(size, size);
  const c = size / 2, R = size / 2 - 0.6, r = R * 0.45;
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r : R;
    pts.push([c + Math.cos(a) * rr, c + 0.4 + Math.sin(a) * rr]);
  }
  polyFill(b, pts, filled ? litFill(G, c, c, R * 0.8, 0.4) : (x, y) => rampDither([UIR.fill[2], UIR.fill[3], UIR.navy[1]], 1.4 - (y / size) * 1.2, x, y));
  if (filled && size >= 13) b.set(Math.round(c - 1), Math.round(c - 2), G[4]);
  return outline(b, filled ? G[0] : DARK);
}

export function lock(): Bitmap {
  const b = new Bitmap(11, 13);
  // shackle
  ellipseRing(b, 5.5, 4.5, 3.6, 3.8, 1.4, (x, y, a) => (a > 0 ? 0 : x < 5 ? UIR.steel[4] : UIR.steel[2]));
  for (let y = 4; y < 6; y++) {
    b.set(2, y, UIR.steel[3]);
    b.set(8, y, UIR.steel[2]);
  }
  // body
  for (let y = 6; y < 12; y++) for (let x = 1; x < 10; x++) b.set(x, y, rampDither(G, 3.4 - (x - 1) / 7 - (y - 6) / 7, x, y));
  b.set(5, 8, DARK);
  b.set(5, 9, DARK);
  b.set(5, 10, G[1]);
  return outline(b, DARK);
}

/** Boss crown (13x10). */
export function crown(): Bitmap {
  const b = new Bitmap(13, 10);
  polyFill(b, [[0.5, 9], [0.5, 2.5], [3.5, 5.5], [6.5, 0.6], [9.5, 5.5], [12.5, 2.5], [12.5, 9]], litFill(G, 6.5, 5, 6, 0.3));
  for (let x = 1; x < 12; x++) b.set(x, 8, G[1]);
  b.set(6, 5, UIR.affinity.force[3]);
  b.set(3, 7, UIR.affinity.arcane[3]);
  b.set(9, 7, UIR.affinity.wild[3]);
  return outline(b, G[0]);
}

export function check(): Bitmap {
  const b = new Bitmap(9, 8);
  mask(b, 0, 0, ['.......#', '......##', '.....##.', '#...##..', '##.##...', '.###....', '..#.....'], UIR.affinity.wild[4]);
  return outline(b, DARK);
}

/** Red "NEW" pill (19x9) with the letters painted in. */
export function newBadge(): Bitmap {
  const b = new Bitmap(19, 9);
  const R = UIR.red;
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 19; x++) {
      if ((x === 0 || x === 18) && (y < 2 || y > 6)) continue;
      if ((x === 1 || x === 17) && (y === 0 || y === 8)) continue;
      const edge = x === 0 || x === 18 || y === 0 || y === 8 || ((x === 1 || x === 17) && (y === 1 || y === 7));
      b.set(x, y, edge ? R[0] : y < 4 ? R[3] : R[2]);
    }
  }
  mask(b, 3, 2, ['#..#.###.#...#', '##.#.#...#...#', '#.##.##..#.#.#', '#..#.#...##.##', '#..#.###.#...#'], R[4]);
  return b;
}

/** Arrows (10x15) for cycling pages. */
export function arrow(dir: 1 | -1): Bitmap {
  const b = new Bitmap(10, 15);
  const pts: [number, number][] = dir > 0 ? [[1, 0.6], [9.4, 7.5], [1, 14.4], [3.4, 7.5]] : [[9, 0.6], [0.6, 7.5], [9, 14.4], [6.6, 7.5]];
  polyFill(b, pts, litFill(G, 5, 7.5, 6, 0.4));
  return outline(b, G[0]);
}

// ---------------------------------------------------------------------------
// Campaign map nodes
// ---------------------------------------------------------------------------

export type NodeKind = 'open' | 'cleared' | 'locked' | 'boss';

export function mapNode(kind: NodeKind): Bitmap {
  const b = new Bitmap(21, 21);
  const rim = kind === 'cleared' ? G : kind === 'locked' ? UIR.stone : kind === 'boss' ? UIR.red : UIR.steel;
  const core = kind === 'cleared' ? [G[1], G[2], G[3]] : kind === 'locked' ? [UIR.fill[1], UIR.stone[1], UIR.stone[1]] : kind === 'boss' ? [UIR.red[0], UIR.red[1], UIR.red[2]] : [UIR.fill[2], UIR.fill[3], UIR.navy[2]];
  ellipseFill(b, 10.5, 10.5, 9.6, 9.6, (x, y, d) => {
    if (d > 0.78) return rampDither(rim, 3.6 - ((x + y) / 21) * 2.2, x, y);
    return rampDither(core, 2.2 - d * 1.4 - ((x + y) / 21) * 0.6, x, y);
  });
  if (kind === 'locked') {
    const l = lock();
    b.blit(l, 5, 4);
  }
  if (kind === 'boss') mask(b, 6, 6, ['.#####.', '#######', '#..#..#', '#######', '.##.##.', '.#.#.#.', '.......'].slice(0, 7), UIR.red[4]);
  return outline(b, DARK);
}

/** Pulsing selection ring around the frontier node (3 frames). */
export function nodeGlow(phase: number): Bitmap {
  const b = new Bitmap(31, 31);
  ellipseRing(b, 15.5, 15.5, 14.5, 14.5, 2, (x, y, a) => (Math.floor(((a + Math.PI) / (Math.PI * 2)) * 16 + phase) % 2 === 0 ? G[4] : G[2]));
  return b;
}

// ---------------------------------------------------------------------------
// Menu glyphs (16x16), shaded with the champion renderer
// ---------------------------------------------------------------------------

function glyph16(fn: (d: Draw) => void): Bitmap {
  const f = new Frame(16, 16);
  fn(new Draw(f, 1, v(0, 16)));
  return f.render();
}

export const MENU_ICONS: Record<string, () => Bitmap> = {
  campaign: () =>
    glyph16((d) => {
      sword(d, v(2.5, 2.5), 45, { blade: MAT.silver, guard: MAT.gold, grip: MAT.leather, pommel: MAT.gold, len: 11, width: 1.8, guardW: 3, gripLen: 2.4, z: 1 });
      sword(d, v(13.5, 2.5), 135, { blade: MAT.silver, guard: MAT.gold, grip: MAT.leather, pommel: MAT.gold, len: 11, width: 1.8, guardW: 3, gripLen: 2.4, z: 2 });
    }),
  champions: () =>
    glyph16((d) => {
      d.poly({ mat: MAT.steel, z: 1, group: 'helm' }, [v(3, 1.5), v(2.6, 9), v(4.6, 13.6), v(8, 14.8), v(11.4, 13.6), v(13.4, 9), v(13, 1.5)], { kind: 'dome', c: v(7, 10), r: 9, bevel: 1.2 });
      d.capsule({ mat: MAT.steel, z: 1.1, group: 'helm', color: UIR.fill[0], line: 'none' }, v(4.4, 7.4), v(11.6, 7.4), 0.8, 0.8);
      d.capsule({ mat: MAT.steel, z: 1.1, group: 'helm', color: UIR.fill[0], line: 'none' }, v(8, 7.4), v(8, 2.6), 0.7, 0.7);
      d.ribbon({ mat: MAT.blue, z: 0.5, group: 'plume' }, [v(8, 14), v(10.5, 15.2), v(13.6, 13.8), v(15, 11)], [1.4, 1.6, 1.3, 0.8]);
    }),
  academy: () =>
    glyph16((d) => {
      d.poly({ mat: MAT.linen, z: 1, group: 'book' }, [v(8, 2.5), v(1, 4), v(1, 13.5), v(8, 12)], { kind: 'bevel', w: 1 });
      d.poly({ mat: MAT.linen, z: 1.1, group: 'book2', shade: -1 }, [v(8, 2.5), v(15, 4), v(15, 13.5), v(8, 12)], { kind: 'bevel', w: 1 });
      d.poly({ mat: MAT.red, z: 0.5, group: 'cover' }, [v(8, 1.2), v(0.2, 2.8), v(0.2, 4.2), v(8, 2.6), v(15.8, 4.2), v(15.8, 2.8)], { kind: 'bevel', w: 1 });
      for (const y of [6, 8, 10]) {
        d.line({ mat: MAT.linen, z: 1.2, group: 'book', line: 'none' }, v(2.5, y + 0.4), v(6.5, y - 0.4), MAT.linen.ramp[2]);
        d.line({ mat: MAT.linen, z: 1.2, group: 'book2', line: 'none' }, v(9.5, y - 0.4), v(13.5, y + 0.4), MAT.linen.ramp[1]);
      }
    }),
  options: () =>
    glyph16((d) => {
      const c = v(8, 8);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        d.capsule({ mat: MAT.iron, z: 1, group: 'gear' }, v(c.x + Math.cos(a) * 4.5, c.y + Math.sin(a) * 4.5), v(c.x + Math.cos(a) * 6.6, c.y + Math.sin(a) * 6.6), 1.3, 1.3);
      }
      d.circle({ mat: MAT.iron, z: 1.1, group: 'gear' }, c, 5);
      d.circle({ mat: MAT.iron, z: 1.2, group: 'gear', color: UIR.fill[0], line: 'none' }, c, 1.9);
    }),
  back: () =>
    glyph16((d) => {
      d.poly({ mat: MAT.gold, z: 1, group: 'arrow' }, [v(1.5, 8), v(7.5, 14), v(7.5, 10.4), v(14.5, 10.4), v(14.5, 5.6), v(7.5, 5.6), v(7.5, 2)], { kind: 'bevel', w: 1.4 });
    }),
  fight: () =>
    glyph16((d) => {
      sword(d, v(3, 3), 45, { blade: MAT.silver, guard: MAT.gold, grip: MAT.leather, pommel: MAT.gold, len: 13, width: 2.2, guardW: 3.6, gripLen: 2.6, z: 1 });
    }),
  play: () =>
    glyph16((d) => {
      d.poly({ mat: MAT.gold, z: 1, group: 'tri' }, [v(4, 2), v(13.5, 8), v(4, 14)], { kind: 'bevel', w: 1.4 });
    }),
};

// ---------------------------------------------------------------------------
// Team-select podium
// ---------------------------------------------------------------------------

/** Stone podium (64x22) the formation stands on: lit top, gold inlay ring. */
export function podium(): Bitmap {
  const b = new Bitmap(64, 22);
  const st = UIR.stone;
  ellipseFill(b, 32, 12, 30, 9, (x, y) => rampDither(st, 1.2 - (y - 12) / 9, x, y));
  ellipseFill(b, 32, 9, 30, 8, (x, y, d) => rampDither(st, 3.2 - ((x - 32) / 30) * 0.8 - ((y - 9) / 8) * 0.8 - d * 0.4, x, y));
  ellipseRing(b, 32, 9, 22, 5.5, 1, (x, y) => (dith(x, y, 0.7) ? G[3] : G[2]));
  return outline(b, DARK);
}

/** Ornamental divider (3-slice, 40x7): thin gold rule with a center diamond. */
export function divider(): Bitmap {
  const b = new Bitmap(40, 7);
  for (let x = 2; x < 38; x++) {
    b.set(x, 3, G[3]);
    b.set(x, 4, G[1]);
  }
  polyFill(b, [[20, 0], [23.5, 3.5], [20, 7], [16.5, 3.5]], litFill(G, 20, 3.5, 3.5, 0.5));
  for (const x of [1, 38]) b.set(x, 3, G[4]);
  return b;
}
