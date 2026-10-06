// Battle HUD parts: panels, buttons, skill frames, foot rings, chevrons, the
// skill-name banner and control glyphs. Nine-slice parts keep their corners
// in the outer 4-8px so the runtime can stretch them (src/game/view/assets.ts nine()).
import { UIR } from '../palette.ts';
import { dith, ellipseRing, outline, polyFill, rampDither } from '../paint.ts';
import { Bitmap, hex, RGBA, withAlpha } from '../raster.ts';

// ---------------------------------------------------------------------------
// panels, frames and markers
// ---------------------------------------------------------------------------

export function panel(variant: 'dark' | 'gold' | 'red'): Bitmap {
  const b = new Bitmap(24, 24);
  const fill = variant === 'red' ? hex('#2a0c14') : hex('#0d1220');
  const rim =
    variant === 'gold'
      ? UIR.gold
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

export function button(state: 'up' | 'hover' | 'down' | 'off'): Bitmap {
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
export function skillFrame(state: 'idle' | 'sel' | 'off'): Bitmap {
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
export function footRing(color: string[], dashed: boolean, phase: number): Bitmap {
  const b = new Bitmap(56, 20);
  const cols = color.map((h) => hex(h));
  ellipseRing(b, 28, 10, 26, 8.5, 2, (x, y, a) => {
    if (dashed && Math.floor(((a + Math.PI + phase) / (Math.PI * 2)) * 16) % 2 === 1) return 0;
    return a < 0 ? cols[1] : cols[2];
  });
  ellipseRing(b, 28, 10, 23, 7, 1, (x, y) => (dith(x, y, 0.5) ? withAlpha(cols[0], 160) : 0));
  return b;
}

export function chevron(color: string[]): Bitmap {
  const b = new Bitmap(11, 9);
  const c = color.map((h) => hex(h));
  polyFill(b, [[0, 0], [11, 0], [5.5, 8]], (x, y) => (y < 3 ? c[2] : c[1]));
  polyFill(b, [[3, 1], [8, 1], [5.5, 5]], c[3] ?? c[2]);
  return outline(b, hex('#0b0a10'));
}

export function banner(): Bitmap {
  // 3-slice horizontal ribbon: left cap 12px, middle 8px, right cap 12px
  const b = new Bitmap(32, 18);
  const R = ['#1a0610', '#4a0e1e', '#7a1a2c', '#a8283a', '#d8505a'].map((h) => hex(h));
  const G = UIR.gold;
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

export const GLYPHS: Record<string, string[]> = {
  auto: ['..###..', '.#...#.', '#.....#', '#..#..#', '#.###.#', '#.#.#.#', '.#...#.', '..###..'],
  speed: ['#...#..', '##..##.', '###.###', '#######', '###.###', '##..##.', '#...#..'],
  pause: ['##.##', '##.##', '##.##', '##.##', '##.##', '##.##', '##.##'],
  restart: ['..###..', '.#...##', '#....##', '#......', '#......', '#.....#', '.#...#.', '..###..'],
  play: ['#....', '##...', '###..', '####.', '###..', '##...', '#....'],
};

export function smallGlyph(rows: string[]): Bitmap {
  const w = Math.max(...rows.map((r) => r.length));
  const b = new Bitmap(w, rows.length);
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch === '#' && b.set(x, y, hex('#ffffff'))));
  return b;
}

