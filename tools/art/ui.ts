// UI art: skill icons (40x40), status icons (12x12), panels, frames, markers
// and portraits. Icons reuse the hero renderer so a sword on an icon is shaded
// exactly like a sword in a hero's hand.
import path from 'node:path';
import { PIVOT } from './char.ts';
import { HEROES } from './heroes/index.ts';
import { writeJson } from './io.ts';
import { Material, MAT } from './palette.ts';
import { disc, dith, ellipseFill, ellipseRing, line, outline, polyFill, rampDither } from './paint.ts';
import { smear, sword } from './parts.ts';
import { Bitmap, hex, RGBA, rng, withAlpha } from './raster.ts';
import { Frame } from './render.ts';
import { at, Draw, solve, V, v } from './rig.ts';

const ICON = 40;

// ---------------------------------------------------------------------------
// icon helpers
// ---------------------------------------------------------------------------

/** Render shaded shapes in a 40x40 rig space (origin bottom-left, y up). */
function glyph(fn: (d: Draw) => void): Bitmap {
  const f = new Frame(ICON, ICON);
  const d = new Draw(f, 1, v(0, ICON));
  fn(d);
  return f.render();
}

const BG: Record<string, Material> = {
  knight: MAT.blue,
  warrior: MAT.red,
  archer: MAT.green,
  frostmage: MAT.ice,
  dreadknight: MAT.violet,
  monk: MAT.saffron,
};

const FRAME_GOLD = ['#120c08', '#5a3410', '#a8701e', '#e8b440', '#fff0a8'].map((h) => hex(h));

function iconBase(hero: string): Bitmap {
  const b = new Bitmap(ICON, ICON);
  const ramp = BG[hero].ramp;
  const r = [ramp[1], ramp[2], ramp[3], ramp[4]];
  for (let y = 2; y < ICON - 2; y++) {
    for (let x = 2; x < ICON - 2; x++) {
      const d = Math.hypot((x - 19) / 19, (y - 16) / 21);
      const streak = Math.max(0, 1 - Math.abs(x - y + 6) / 6) * 0.35;
      b.set(x, y, rampDither(r, 2.5 - d * 2.1 + streak, x, y));
    }
  }
  return b;
}

function iconFrame(b: Bitmap) {
  const g = FRAME_GOLD;
  for (let i = 0; i < ICON; i++) {
    b.set(i, 0, g[0]);
    b.set(i, ICON - 1, g[0]);
    b.set(0, i, g[0]);
    b.set(ICON - 1, i, g[0]);
  }
  for (let i = 1; i < ICON - 1; i++) {
    b.set(i, 1, g[3]);
    b.set(1, i, g[3]);
    b.set(i, ICON - 2, g[1]);
    b.set(ICON - 2, i, g[1]);
  }
  for (const [x, y] of [[1, 1], [ICON - 2, 1], [1, ICON - 2], [ICON - 2, ICON - 2]]) b.set(x, y, g[4]);
  for (const [x, y] of [[0, 0], [ICON - 1, 0], [0, ICON - 1], [ICON - 1, ICON - 1]]) b.set(x, y, 0);
  for (let i = 2; i < ICON - 2; i++) {
    b.blend(i, 2, withAlpha(g[0], 120));
    b.blend(2, i, withAlpha(g[0], 120));
  }
}

function compose(hero: string, art: Bitmap, extra?: (b: Bitmap) => void): Bitmap {
  const b = iconBase(hero);
  extra?.(b);
  b.blit(art, 0, 0);
  for (let y = 2; y < ICON - 2; y++) {
    for (let x = 2; x < ICON - 2; x++) {
      const d = Math.max(Math.abs(x - 19.5), Math.abs(y - 19.5));
      if (d > 15.5 && dith(x, y, (d - 15.5) / 3)) b.blend(x, y, withAlpha(hex('#05040a'), 90));
    }
  }
  iconFrame(b);
  return b;
}

const C = {
  white: hex('#ffffff'),
  pale: hex('#cfe9ff'),
  goldHot: hex('#fff0a0'),
  red: hex('#ff5a3a'),
  redHot: hex('#ffd0a0'),
  violet: hex('#c06cff'),
  violetHot: hex('#f4dcff'),
  green: hex('#7ff05a'),
  ice: hex('#a6ecff'),
  orange: hex('#ffa030'),
};

function axeHead(d: Draw, hand: V, ang: number, z: number, len = 15, scale = 1.3) {
  const f = d.frame(hand, ang);
  d.capsule({ mat: MAT.wood, z, group: 'axe' + z }, f(-6, 0), f(len, 0), 1.5, 1.4);
  const k = scale;
  const head = [f(len + 0.6, -0.8 * k), f(len + 3.2, -4.8 * k), f(len + 2.4, -10 * k), f(len - 1.6, -11 * k), f(len - 6.4, -10.2 * k), f(len - 9.4, -7.6 * k), f(len - 6.2, -3.6 * k), f(len - 4.6, -0.8 * k)];
  d.poly({ mat: MAT.iron, z: z + 0.1, group: 'axe' + z }, head, { kind: 'bevel', w: 2.4 });
  d.ribbon({ mat: MAT.silver, z: z + 0.15, group: 'axe' + z, line: 'none' }, [f(len + 2.9, -5.2 * k), f(len + 2.1, -9.6 * k), f(len - 1.7, -10.4 * k), f(len - 6.2, -9.7 * k)], [0.9, 0.9, 0.9, 0.9]);
  d.capsule({ mat: MAT.iron, z: z + 0.12, group: 'axe' + z }, f(len - 5, 0), f(len + 0.8, 0), 2.2, 2.2);
}

function arrowGlyph(d: Draw, from: V, to: V, z: number, head: Material = MAT.silver, fletch: Material = MAT.red) {
  const ang = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  d.capsule({ mat: MAT.wood, z, group: 'arrow' + z }, from, to, 0.9, 0.9);
  const hf = d.frame(to, ang);
  d.poly({ mat: head, z: z + 0.1, group: 'arrow' + z }, [hf(4.5, 0), hf(-1.6, 2.8), hf(-0.6, 0), hf(-1.6, -2.8)], { kind: 'bevel', w: 1.2 });
  const ff = d.frame(from, ang);
  d.poly({ mat: fletch, z: z + 0.05, group: 'arrow' + z }, [ff(5, 0.5), ff(0.5, 3.4), ff(-0.6, 3.2), ff(1.2, 0.5)], { kind: 'bevel', w: 1 });
  d.poly({ mat: fletch, z: z + 0.05, group: 'arrow' + z }, [ff(5, -0.5), ff(0.5, -3.4), ff(-0.6, -3.2), ff(1.2, -0.5)], { kind: 'bevel', w: 1 });
}

function speedLines(b: Bitmap, pts: [number, number, number, number][], c: RGBA) {
  for (const [x0, y0, x1, y1] of pts) line(b, x0, y0, x1, y1, c);
}

function crystal(d: Draw, base: V, tip: V, w: number, z: number, mat: Material = MAT.glowIce) {
  const ang = (Math.atan2(tip.y - base.y, tip.x - base.x) * 180) / Math.PI;
  const l = Math.hypot(tip.x - base.x, tip.y - base.y);
  const f = d.frame(base, ang);
  d.poly({ mat, z, group: 'cr' + z }, [f(0, 0), f(l * 0.25, w), f(l * 0.75, w * 0.8), f(l, 0), f(l * 0.75, -w * 0.8), f(l * 0.25, -w)], { kind: 'bevel', w: 2 });
}

function skull(d: Draw, c: V, s: number, z: number, mat: Material = MAT.bone, eye: RGBA = hex('#140c18')) {
  d.ellipse({ mat, z, group: 'skull' }, v(c.x, c.y + 1.5 * s), 6 * s, 5.6 * s, 0);
  d.poly({ mat, z: z + 0.05, group: 'skull' }, [v(c.x - 3.6 * s, c.y - 1 * s), v(c.x + 3.6 * s, c.y - 1 * s), v(c.x + 3 * s, c.y - 5 * s), v(c.x - 3 * s, c.y - 5 * s)], { kind: 'bevel', w: 1.4 });
  d.ellipse({ mat, z: z + 0.1, group: 'skull', color: eye, line: 'none' }, v(c.x - 2.3 * s, c.y + 0.6 * s), 1.7 * s, 1.9 * s, 0);
  d.ellipse({ mat, z: z + 0.1, group: 'skull', color: eye, line: 'none' }, v(c.x + 2.3 * s, c.y + 0.6 * s), 1.7 * s, 1.9 * s, 0);
  d.poly({ mat, z: z + 0.1, group: 'skull', color: eye, line: 'none' }, [v(c.x, c.y - 1.1 * s), v(c.x - 0.9 * s, c.y - 2.6 * s), v(c.x + 0.9 * s, c.y - 2.6 * s)]);
}

// ---------------------------------------------------------------------------
// the 18 skill icons
// ---------------------------------------------------------------------------

const SKILL_ICONS: Record<string, [string, () => Bitmap]> = {
  valiant_strike: ['knight', () => compose('knight', glyph((d) => {
    smear(d, v(9, 9), 150, -20, 33, 9, { core: C.white, edge: C.pale }, 1);
    sword(d, v(11, 11), 45, { blade: MAT.silver, guard: MAT.gold, grip: MAT.leather, pommel: MAT.gold, len: 27, width: 5, guardW: 6.5, gripLen: 5, z: 10 });
  }))],
  shield_bash: ['knight', () => compose('knight', glyph((d) => {
    const f = d.frame(v(17, 20), 100);
    const pts = [f(13, -8), f(14.5, 0), f(13, 8), f(4, 9), f(-6, 7), f(-17, 0), f(-6, -7), f(4, -9)];
    const c = f(1, 0);
    d.poly({ mat: MAT.steel, z: 10, group: 'sh' }, pts, { kind: 'dome', c: f(3, -2), r: 18, bevel: 1.5 });
    d.poly({ mat: MAT.blue, z: 10.1, group: 'sh', line: 'none' }, pts.map((p) => ({ x: p.x + (c.x - p.x) * 0.16, y: p.y + (c.y - p.y) * 0.16 })), { kind: 'dome', c: f(3, -2), r: 18 });
    d.capsule({ mat: MAT.gold, z: 10.2, group: 'sh', line: 'none' }, f(11, 0), f(-13, 0), 1.4, 1.1);
    d.capsule({ mat: MAT.gold, z: 10.2, group: 'sh', line: 'none' }, f(4, -6), f(4, 6), 1.4, 1.4);
    d.circle({ mat: MAT.gold, z: 10.3, group: 'sh' }, f(4, 0), 2.4);
  }), (b) => {
    for (let i = 0; i < 7; i++) {
      const a = -1.2 + (i / 6) * 2.4;
      line(b, 31, 19, 31 + Math.cos(a) * 7, 19 + Math.sin(a) * 7, i % 2 ? C.goldHot : C.white);
    }
    speedLines(b, [[3, 12, 8, 12], [3, 26, 7, 26], [4, 30, 8, 30]], C.pale);
  })],
  aegis_oath: ['knight', () => compose('knight', glyph((d) => {
    sword(d, v(20, 10), 90, { blade: MAT.silver, guard: MAT.gold, grip: MAT.leather, pommel: MAT.gold, len: 26, width: 5, guardW: 7, gripLen: 5, z: 10 });
  }), (b) => {
    const glow = MAT.glowGold.ramp.slice(2);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const len = i % 2 ? 11 : 17;
      polyFill(b, [[20 + Math.cos(a + 0.18) * 4, 24 + Math.sin(a + 0.18) * 4], [20 + Math.cos(a) * len, 24 + Math.sin(a) * len], [20 + Math.cos(a - 0.18) * 4, 24 + Math.sin(a - 0.18) * 4]], (x, y) => rampDither(glow, 2.6 - Math.hypot(x - 20, y - 24) / 8, x, y));
    }
    disc(b, 20, 24, 5, (x, y, dd) => rampDither(glow, 3.6 - dd * 1.5, x, y));
  })],

  rending_chop: ['warrior', () => compose('warrior', glyph((d) => {
    axeHead(d, v(9, 7), 52, 10, 21, 1.5);
  }), (b) => {
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < 18; i++) {
        const x = 8 + i + k * 4, y = 7 + i * 1.3 - k * 1;
        const c = i < 3 || i > 15 ? MAT.red.ramp[3] : i % 5 === 0 ? C.redHot : C.red;
        b.set(Math.round(x), Math.round(y), c);
        if (i > 2 && i < 16) b.set(Math.round(x) + 1, Math.round(y), MAT.red.ramp[2]);
      }
    }
  })],
  whirlwind: ['warrior', () => compose('warrior', glyph((d) => {
    smear(d, v(20, 20), 90, -180, 17, 5, { core: C.white, edge: C.redHot }, 1);
    axeHead(d, v(8, 8), 45, 10, 18, 1.15);
    axeHead(d, v(32, 8), 135, 11, 18, 1.15);
  }))],
  skullsplitter: ['warrior', () => compose('warrior', glyph((d) => {
    skull(d, v(17, 12), 1.25, 10);
    axeHead(d, v(34, 34), 205, 12, 15, 1.35);
  }), (b) => {
    line(b, 19, 21, 17, 25, hex('#140c18'));
    line(b, 17, 25, 19, 28, hex('#140c18'));
    for (const [x, y] of [[8, 14], [30, 16], [10, 30], [29, 30]]) b.set(x, y, C.redHot);
  })],

  swift_shot: ['archer', () => compose('archer', glyph((d) => {
    arrowGlyph(d, v(6, 10), v(30, 31), 10);
  }), (b) => speedLines(b, [[4, 22, 11, 16], [8, 32, 15, 26], [15, 37, 20, 33], [3, 15, 6, 12]], C.white))],
  venom_arrow: ['archer', () => compose('archer', glyph((d) => {
    arrowGlyph(d, v(6, 31), v(28, 13), 10, MAT.glowGreen, MAT.green);
  }), (b) => {
    for (const [x, y, r] of [[30, 30, 1.6], [27, 35, 1.2], [34, 34, 1.0]]) disc(b, x, y, r, (xx, yy, dd) => (dd < 0.5 ? C.green : MAT.glowGreen.ramp[2]));
    disc(b, 32, 27, 4.5, (x, y, dd) => (dith(x, y, (1 - dd) * 0.5) ? withAlpha(C.green, 120) : 0));
  })],
  arrow_rain: ['archer', () => compose('archer', glyph((d) => {
    for (const [x, y] of [[6, 36], [15, 39], [24, 37], [11, 25], [21, 27]]) arrowGlyph(d, v(x, y), v(x + 7, y - 14), 10 + x * 0.01);
  }))],

  ice_shard: ['frostmage', () => compose('frostmage', glyph((d) => {
    crystal(d, v(10, 12), v(33, 30), 5, 10);
  }), (b) => {
    const r = rng(3);
    for (let i = 0; i < 14; i++) {
      const t = r();
      b.set(Math.round(4 + t * 10 + r() * 3), Math.round(32 - t * 8 + r() * 6 - 3), r() < 0.5 ? C.white : C.ice);
    }
  })],
  blizzard: ['frostmage', () => compose('frostmage', glyph((d) => {
    const c = v(20, 20);
    for (let i = 0; i < 6; i++) {
      const a = i * 60 + 90;
      d.capsule({ mat: MAT.glowIce, z: 10, group: 'flake' }, c, at(c, a, 15), 1.6, 1.1);
      for (const s of [-1, 1]) d.capsule({ mat: MAT.glowIce, z: 10, group: 'flake' }, at(c, a, 9), at(at(c, a, 9), a + s * 45, 5), 1.0, 0.8);
    }
    d.circle({ mat: MAT.glowIce, z: 10.1, group: 'flake' }, c, 3.2);
  }), (b) => {
    ellipseRing(b, 20, 20, 18, 18, 1, (x, y, a) => (Math.sin(a * 3) > 0.3 ? withAlpha(C.white, 140) : 0));
  })],
  glacial_prison: ['frostmage', () => compose('frostmage', glyph((d) => {
    d.poly({ mat: MAT.glowIce, z: 10, group: 'block', shade: -1 }, [v(7, 4), v(6, 26), v(13, 33), v(30, 32), v(34, 25), v(33, 4)], { kind: 'bevel', w: 3, n: [-0.3, 0.2, 1] });
    // the frozen victim, a dark silhouette inside the ice
    const fig = { mat: MAT.glowIce, z: 10.1, group: 'block', flat: 1, line: 'none' as const };
    d.circle(fig, v(20, 23.5), 3.6);
    d.poly(fig, [v(15, 19.5), v(25, 19.5), v(24, 9), v(16, 9)]);
    d.capsule(fig, v(15.5, 18.5), v(12, 11), 1.6, 1.4);
    d.capsule(fig, v(24.5, 18.5), v(28, 12), 1.6, 1.4);
    d.capsule(fig, v(17.5, 9), v(17, 5), 1.7, 1.5);
    d.capsule(fig, v(22.5, 9), v(23, 5), 1.7, 1.5);
    // facet glints across the front of the block
    const glint = { mat: MAT.glowIce, z: 10.2, group: 'block', line: 'none' as const, outline: false };
    d.line(glint, v(9, 25), v(14, 30), C.white);
    d.line(glint, v(9, 18), v(19, 28), hex('#d8f6ff'));
    d.line(glint, v(26, 8), v(31, 13), hex('#d8f6ff'));
    crystal(d, v(11, 30), v(8, 37), 2.4, 11);
    crystal(d, v(20, 32), v(21, 39), 2.8, 11);
    crystal(d, v(29, 30), v(33, 37), 2.4, 11);
  }))],
  cursed_cleave: ['dreadknight', () => compose('dreadknight', glyph((d) => {
    smear(d, v(8, 8), 160, -20, 34, 9, { core: C.violetHot, edge: C.violet }, 1);
    sword(d, v(10, 10), 45, { blade: MAT.darksteel, guard: MAT.darksteel, grip: MAT.darkleather, pommel: MAT.darksteel, len: 28, width: 6, guardW: 7, gripLen: 5, z: 10, rune: MAT.glowViolet });
  }))],
  soul_rend: ['dreadknight', () => compose('dreadknight', glyph((d) => {
    skull(d, v(20, 21), 1.35, 10, MAT.glowViolet, hex('#2a0a3a'));
  }), (b) => {
    const r = rng(9);
    for (let k = 0; k < 4; k++) {
      let x = 20 + (r() - 0.5) * 8, y = 31;
      for (let i = 0; i < 9; i++) {
        b.set(Math.round(x), Math.round(y), i < 3 ? C.violetHot : MAT.glowViolet.ramp[3 - Math.floor(i / 4)]);
        x += (k - 1.5) * 0.9;
        y += 0.8;
      }
    }
  })],
  dread_sweep: ['dreadknight', () => compose('dreadknight', glyph((d) => {
    smear(d, v(20, 6), 172, 8, 31, 12, { core: C.violetHot, edge: C.violet }, 2);
    sword(d, v(7, 17), 8, { blade: MAT.darksteel, guard: MAT.darksteel, grip: MAT.darkleather, pommel: MAT.darksteel, len: 27, width: 6, guardW: 7, gripLen: 4, z: 10, rune: MAT.glowViolet });
  }), (b) => {
    ellipseRing(b, 20, 33, 16, 4, 1.4, (x, y, a) => (a > 0 ? withAlpha(C.violet, 230) : withAlpha(C.violetHot, 200)));
    ellipseRing(b, 20, 33, 9, 2.2, 1, () => withAlpha(C.violet, 170));
  })],
  flurry: ['monk', () => compose('monk', glyph((d) => {
    // wrapped forearm + clenched fist seen from the side, punching right
    d.capsule({ mat: MAT.wrap, z: 10, group: 'fist', tex: (h) => (Math.floor(h.u * 6) % 2 === 0 ? -1 : 0) }, v(3, 15), v(17, 19), 4.4, 4.6);
    d.poly({ mat: MAT.skinBrown, z: 10.2, group: 'fist' }, [v(15, 12.5), v(16, 26.5), v(26, 27.5), v(30.5, 25), v(31, 15), v(28, 12)], { kind: 'bevel', w: 2.4 });
    // finger joints and thumb
    const k = MAT.skinBrown.ramp[1];
    d.line({ mat: MAT.skinBrown, z: 10.3, group: 'fist', line: 'none' }, v(26, 24.5), v(30, 24.5), k);
    d.line({ mat: MAT.skinBrown, z: 10.3, group: 'fist', line: 'none' }, v(26, 21), v(30.5, 21), k);
    d.line({ mat: MAT.skinBrown, z: 10.3, group: 'fist', line: 'none' }, v(26, 17.5), v(30.5, 17.5), k);
    d.line({ mat: MAT.skinBrown, z: 10.3, group: 'fist', line: 'none' }, v(25.5, 27), v(25.5, 13), k);
    d.ellipse({ mat: MAT.skinBrown, z: 10.4, group: 'thumb', line: 'soft' }, v(21.5, 14.5), 4.6, 2.4, 8);
  }), (b) => {
    speedLines(b, [[2, 12, 9, 12], [3, 20, 7, 20], [2, 28, 9, 28], [4, 24, 8, 24]], C.white);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r1 = i % 2 ? 4 : 7;
      line(b, 34 + Math.cos(a) * 2, 19 + Math.sin(a) * 2, 34 + Math.cos(a) * r1, 19 + Math.sin(a) * r1, i % 2 ? C.orange : C.goldHot);
    }
  })],
  serenity: ['monk', () => compose('monk', glyph((d) => {
    const petal = (ang: number, len: number, z: number, mat: Material) => {
      const f = d.frame(v(20, 10), ang);
      d.poly({ mat, z, group: 'p' + z }, [f(0, 0), f(len * 0.45, 3.4), f(len, 0), f(len * 0.45, -3.4)], { kind: 'bevel', w: 2 });
    };
    petal(150, 13, 10, MAT.wrap);
    petal(30, 13, 10.1, MAT.wrap);
    petal(120, 15, 10.2, MAT.saffron);
    petal(60, 15, 10.3, MAT.saffron);
    petal(90, 17, 10.4, MAT.glowGold);
  }), (b) => {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      line(b, 20 + Math.cos(a) * 12, 22 + Math.sin(a) * 12, 20 + Math.cos(a) * 17, 22 + Math.sin(a) * 17, i % 2 ? withAlpha(C.green, 200) : C.goldHot);
    }
  })],
  dragon_kick: ['monk', () => compose('monk', glyph((d) => {
    smear(d, v(8, 6), 200, 40, 30, 10, { core: hex('#fff6c0'), edge: hex('#ff9a30') }, 2);
    // baggy pant leg, wrapped ankle, big bare foot kicking up-right
    d.capsule({ mat: MAT.saffron, z: 10, group: 'leg' }, v(4, 8), v(15, 19), 5.2, 4.4);
    d.capsule({ mat: MAT.wrap, z: 10.1, group: 'leg', tex: (h) => (Math.floor(h.u * 5) % 2 === 0 ? -1 : 0) }, v(14, 18), v(20, 24), 3.4, 3.1);
    const f = d.frame(v(21, 25), 40);
    d.poly({ mat: MAT.skinBrown, z: 10.2, group: 'leg' }, [f(-2.5, 3.6), f(-3.4, -3.2), f(9.5, -3.6), f(12.4, -0.6), f(10, 2.4), f(2, 4)], { kind: 'bevel', w: 1.8 });
  }), (b) => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      line(b, 31 + Math.cos(a) * 2, 9 + Math.sin(a) * 2, 31 + Math.cos(a) * (i % 2 ? 4 : 7), 9 + Math.sin(a) * (i % 2 ? 4 : 7), i % 2 ? C.orange : C.goldHot);
    }
  })],
};

// ---------------------------------------------------------------------------
// status icons (12x12): mask + background color + arrow badge
// ---------------------------------------------------------------------------

// prettier-ignore
const MASKS: Record<string, string[]> = {
  sword: ['.......#', '......##', '.....##.', '#...##..', '.####...', '..##....', '.#.#....', '#.......'],
  shield: ['.######.', '########', '########', '########', '.######.', '.######.', '..####..', '...##...'],
  boot: ['..####..', '..####..', '..####..', '..#####.', '.######.', '########', '########', '........'],
  bubble: ['..####..', '.#....#.', '#..#...#', '#.#....#', '#......#', '#......#', '.#....#.', '..####..'],
  taunt: ['...##...', '..####..', '..####..', '..####..', '...##...', '........', '...##...', '...##...'],
  cross: ['..####..', '..####..', '########', '########', '########', '########', '..####..', '..####..'],
  stun: ['..####..', '.#....#.', '#..##..#', '#.#..#.#', '#.#.##.#', '#..#...#', '.#....#.', '..####..'],
  flake: ['...##...', '.#.##.#.', '..####..', '########', '########', '..####..', '.#.##.#.', '...##...'],
  drop: ['...##...', '...##...', '..####..', '..####..', '.######.', '.######.', '.##.###.', '..####..'],
  skull: ['.######.', '########', '#..##..#', '#..##..#', '########', '.######.', '.#.##.#.', '........'],
};

interface StatusDef {
  mask: string;
  bg: string;
  fg: string;
  badge?: 'up' | 'down';
  buff: boolean;
}

export const STATUS: Record<string, StatusDef> = {
  atk_up: { mask: 'sword', bg: '#8e2230', fg: '#ffe4c8', badge: 'up', buff: true },
  def_up: { mask: 'shield', bg: '#24508e', fg: '#e8f2ff', badge: 'up', buff: true },
  spd_up: { mask: 'boot', bg: '#2a7a3a', fg: '#e8ffe0', badge: 'up', buff: true },
  shield: { mask: 'bubble', bg: '#8a6a1a', fg: '#fff3b0', buff: true },
  taunt: { mask: 'taunt', bg: '#a8481a', fg: '#ffe9c0', buff: true },
  regen: { mask: 'cross', bg: '#2a8a4a', fg: '#eaffe8', buff: true },
  stun: { mask: 'stun', bg: '#8a7a1a', fg: '#fff8c0', buff: false },
  freeze: { mask: 'flake', bg: '#1f5f9a', fg: '#e4fbff', buff: false },
  poison: { mask: 'drop', bg: '#2f5a1e', fg: '#b6ff7a', buff: false },
  def_down: { mask: 'shield', bg: '#4a2a6a', fg: '#e6d4ff', badge: 'down', buff: false },
  spd_down: { mask: 'boot', bg: '#2a3a6a', fg: '#d4ddff', badge: 'down', buff: false },
  atk_down: { mask: 'sword', bg: '#5a1a2a', fg: '#ffd0d0', badge: 'down', buff: false },
  doom: { mask: 'skull', bg: '#3a1050', fg: '#e8b4ff', buff: false },
};

function statusIcon(s: StatusDef): Bitmap {
  const b = new Bitmap(12, 12);
  const bg = hex(s.bg), fg = hex(s.fg);
  const border = s.buff ? hex('#9ad8ff') : hex('#ff8a8a');
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
      const edge = x === 0 || y === 0 || x === 11 || y === 11;
      const corner = (x === 0 || x === 11) && (y === 0 || y === 11);
      if (corner) continue;
      b.set(x, y, edge ? hex('#0b0a10') : y < 6 ? bg : rampDither([bg, hex('#000000')], 0.25, x, y));
    }
  }
  for (let i = 1; i < 11; i++) {
    b.set(i, 1, border);
    b.set(1, i, border);
  }
  MASKS[s.mask].forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && b.set(2 + x, 2 + y, fg)));
  if (s.badge) {
    const c = s.badge === 'up' ? hex('#7dff6a') : hex('#ff5a5a');
    const pts = s.badge === 'up' ? [[9, 6], [8, 7], [9, 7], [10, 7], [9, 8], [9, 9]] : [[9, 6], [9, 7], [8, 8], [9, 8], [10, 8], [9, 9]];
    for (const [x, y] of pts) b.set(x, y, c);
  }
  return b;
}

// ---------------------------------------------------------------------------
// panels, frames and markers
// ---------------------------------------------------------------------------

function panel(variant: 'dark' | 'gold' | 'red'): Bitmap {
  const b = new Bitmap(24, 24);
  const fill = variant === 'red' ? hex('#2a0c14') : hex('#0d1220');
  const rim =
    variant === 'gold'
      ? FRAME_GOLD
      : variant === 'red'
        ? ['#120408', '#5a1420', '#a02a36', '#e0505a', '#ffb0a0'].map((h) => hex(h))
        : ['#05070c', '#2a3348', '#4a5674', '#7a88a8', '#c0cbe0'].map((h) => hex(h));
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const e = Math.min(x, y, 23 - x, 23 - y);
      if ((x === 0 || x === 23) && (y === 0 || y === 23)) continue;
      if (e === 0) b.set(x, y, rim[0]);
      else if (e === 1) b.set(x, y, x === 1 || y === 1 ? rim[3] : rim[1]);
      else if (e === 2) b.set(x, y, rim[0]);
      else b.set(x, y, withAlpha(fill, 232));
    }
  }
  for (const [x, y] of [[1, 1], [22, 1], [1, 22], [22, 22]]) b.set(x, y, rim[4]);
  return b;
}

function button(state: 'up' | 'hover' | 'down' | 'off'): Bitmap {
  const b = new Bitmap(16, 16);
  const base =
    state === 'hover' ? ['#2a3a5a', '#3e5682', '#5a78aa'] : state === 'down' ? ['#141c2c', '#1e2a42', '#2a3a5a'] : state === 'off' ? ['#1c1c22', '#2a2a32', '#3a3a44'] : ['#1e2a44', '#2c3e62', '#46608e'];
  const cols = base.map((h) => hex(h));
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if ((x === 0 || x === 15) && (y === 0 || y === 15)) continue;
      const e = Math.min(x, y, 15 - x, 15 - y);
      if (e === 0) b.set(x, y, hex('#06080e'));
      else if (e === 1) b.set(x, y, state === 'down' ? cols[0] : y === 1 || x === 1 ? cols[2] : cols[0]);
      else b.set(x, y, rampDither(cols, 1.6 - (y / 16) * 1.2, x, y));
    }
  }
  return b;
}

/** Frame drawn around a skill icon: idle, selected glow, disabled. */
function skillFrame(state: 'idle' | 'sel' | 'off'): Bitmap {
  const S = 48;
  const b = new Bitmap(S, S);
  const ramp = state === 'sel' ? ['#3a1e00', '#c07a10', '#ffd040', '#fff6c0'] : state === 'off' ? ['#0a0a0e', '#2a2a32', '#4a4a54', '#6a6a74'] : ['#0a0a10', '#3a2a14', '#7a5a2a', '#c09a50'];
  const cols = ramp.map((h) => hex(h));
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const e = Math.min(x, y, S - 1 - x, S - 1 - y);
      if (e > 3) continue;
      if ((x < 2 || x > S - 3) && (y < 2 || y > S - 3)) continue;
      b.set(x, y, e === 0 ? cols[0] : e === 1 ? cols[2] : e === 2 ? cols[1] : cols[0]);
    }
  }
  if (state === 'sel') {
    for (let i = 4; i < S - 4; i += 3) {
      b.set(i, 1, cols[3]);
      b.set(1, i, cols[3]);
      b.set(i, S - 2, cols[3]);
      b.set(S - 2, i, cols[3]);
    }
  }
  return b;
}

/** Ellipse marker drawn under a unit's feet. */
function footRing(color: string[], dashed: boolean, phase: number): Bitmap {
  const b = new Bitmap(56, 20);
  const cols = color.map((h) => hex(h));
  ellipseRing(b, 28, 10, 26, 8.5, 2, (x, y, a) => {
    if (dashed && Math.floor(((a + Math.PI + phase) / (Math.PI * 2)) * 16) % 2 === 1) return 0;
    return a < 0 ? cols[1] : cols[2];
  });
  ellipseRing(b, 28, 10, 23, 7, 1, (x, y) => (dith(x, y, 0.5) ? withAlpha(cols[0], 160) : 0));
  return b;
}

function chevron(color: string[]): Bitmap {
  const b = new Bitmap(11, 9);
  const c = color.map((h) => hex(h));
  polyFill(b, [[0, 0], [11, 0], [5.5, 8]], (x, y) => (y < 3 ? c[2] : c[1]));
  polyFill(b, [[3, 1], [8, 1], [5.5, 5]], c[3] ?? c[2]);
  return outline(b, hex('#0b0a10'));
}

function banner(): Bitmap {
  // 3-slice horizontal ribbon: left cap 12px, middle 8px, right cap 12px
  const b = new Bitmap(32, 18);
  const R = ['#1a0610', '#4a0e1e', '#7a1a2c', '#a8283a', '#d8505a'].map((h) => hex(h));
  const G = FRAME_GOLD;
  for (let y = 0; y < 18; y++) {
    for (let x = 0; x < 32; x++) {
      const capL = x < 12, capR = x >= 20;
      const lx = capL ? x : capR ? 31 - x : 6;
      if ((capL || capR) && lx < 5 && Math.abs(y - 8.5) < 5 - lx) continue;
      if ((capL || capR) && lx < 4 && (y < 3 || y > 14)) continue;
      let c: RGBA;
      if (y === 0 || y === 17) c = R[0];
      else if (y === 2 || y === 15) c = G[2];
      else if (y === 1) c = G[3];
      else if (y === 16) c = G[1];
      else c = rampDither([R[2], R[3], R[4]], 1.7 - Math.abs(y - 7) / 6, x, y);
      b.set(x, y, c);
    }
  }
  return outline(b, R[0]);
}

const GLYPHS: Record<string, string[]> = {
  auto: ['..###..', '.#...#.', '#.....#', '#..#..#', '#.###.#', '#.#.#.#', '.#...#.', '..###..'],
  speed: ['#...#..', '##..##.', '###.###', '#######', '###.###', '##..##.', '#...#..'],
  pause: ['##.##', '##.##', '##.##', '##.##', '##.##', '##.##', '##.##'],
  restart: ['..###..', '.#...##', '#....##', '#......', '#......', '#.....#', '.#...#.', '..###..'],
  play: ['#....', '##...', '###..', '####.', '###..', '##...', '#....'],
};

function smallGlyph(rows: string[]): Bitmap {
  const w = Math.max(...rows.map((r) => r.length));
  const b = new Bitmap(w, rows.length);
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch === '#' && b.set(x, y, hex('#ffffff'))));
  return b;
}

/** Head-and-shoulders portrait from idle frame 0 (always facing right). */
function portrait(id: string, frame: Bitmap): Bitmap {
  const c = HEROES[id];
  const s = solve(c.anims.idle.frames[0].pose, c.dims);
  const hx = Math.round(PIVOT.x + s.head.x), hy = Math.round(PIVOT.y - s.head.y);
  const S = 28;
  const out = new Bitmap(S, S);
  const ramp = BG[id].ramp;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) out.set(x, y, rampDither([ramp[1], ramp[2], ramp[3]], 1.8 - Math.hypot(x - 14, y - 10) / 12, x, y));
  out.blit(frame, 0, 0, { src: { x: hx - 13, y: hy - 11, w: S, h: S } });
  return out;
}

// ---------------------------------------------------------------------------

export interface UiJson {
  icons: Record<string, [number, number, number, number]>;
  status: Record<string, { rect: [number, number, number, number]; buff: boolean }>;
  parts: Record<string, [number, number, number, number]>;
  portraits: Record<string, [number, number, number, number]>;
}

export function buildUi(out: string, frames: { id: string; bmp: Bitmap }[]) {
  const json: UiJson = { icons: {}, status: {}, parts: {}, portraits: {} };
  const sheet = new Bitmap(512, 512);
  let x = 0, y = 0, rowH = 0;
  const put = (bmp: Bitmap, rec: (r: [number, number, number, number]) => void) => {
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
  for (const [id, [, make]] of Object.entries(SKILL_ICONS)) put(make(), (r) => (json.icons[id] = r));
  newRow();
  for (const [id, def] of Object.entries(STATUS)) put(statusIcon(def), (r) => (json.status[id] = { rect: r, buff: def.buff }));
  newRow();
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
  };
  for (let i = 0; i < 3; i++) {
    parts['ring_active_' + i] = footRing(['#3a2a06', '#c09020', '#ffe070'], true, i * 0.13);
    parts['ring_target_' + i] = footRing(['#3a0a0a', '#e03a2a', '#ffb090'], true, i * 0.13);
    parts['ring_heal_' + i] = footRing(['#0a3a14', '#30b050', '#a8ffa0'], true, i * 0.13);
  }
  for (const [k, g] of Object.entries(GLYPHS)) parts['g_' + k] = smallGlyph(g);
  for (const [id, bmp] of Object.entries(parts)) put(bmp, (r) => (json.parts[id] = r));
  newRow();
  for (const f of frames) put(portrait(f.id, f.bmp), (r) => (json.portraits[f.id] = r));
  const used = sheet.crop({ x: 0, y: 0, w: sheet.w, h: y + rowH + 1 });
  used.save(path.join(out, 'ui', 'ui.png'));
  writeJson(path.join(out, 'ui', 'ui.json'), json);

  // icon showcase for the docs (2x): one column per hero, A1..A3 top to bottom
  const show = new Bitmap(6 * 44 + 4, 3 * 44 + 4);
  show.fill(hex('#141a28'));
  const heroOrder = ['knight', 'warrior', 'archer', 'frostmage', 'dreadknight', 'monk'];
  heroOrder.forEach((h, hi) => {
    Object.keys(SKILL_ICONS)
      .filter((i) => SKILL_ICONS[i][0] === h)
      .forEach((id, si) => {
        const r = json.icons[id];
        show.blit(used, 4 + hi * 44, 4 + si * 44, { src: { x: r[0], y: r[1], w: r[2], h: r[3] } });
      });
  });
  show.scaled(2).save(path.join('docs', 'images', 'skill_icons.png'));
  console.log(`  ui: ${Object.keys(SKILL_ICONS).length} skill icons, ${Object.keys(STATUS).length} status icons, ${Object.keys(parts).length} parts, ${frames.length} portraits`);
}
