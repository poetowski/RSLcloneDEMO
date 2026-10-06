// Status icons (12x12): a dark tile in the status color, a 1-bit glyph, a
// colored rim (blue = buff, red = debuff) and an up/down badge for stat
// modifiers. Every StatusId in src/game/data/statuses.ts needs an entry here
// (tests/content.test.ts checks it).
import { Bitmap, hex, RGBA } from '../raster.ts';
import { rampDither } from '../paint.ts';
import { INK } from '../palette.ts';

// prettier-ignore
const MASKS: Record<string, string[]> = {
  sword: ['.......#', '......##', '.....##.', '#...##..', '.####...', '..##....', '.#.#....', '#.......'],
  shield: ['.######.', '########', '########', '########', '.######.', '.######.', '..####..', '...##...'],
  cracked: ['.##.###.', '###.####', '###.####', '####.###', '####.###', '.##.###.', '..#.##..', '...##...'],
  boot: ['..####..', '..####..', '..####..', '..#####.', '.######.', '########', '########', '........'],
  bubble: ['..####..', '.#....#.', '#..#...#', '#.#....#', '#......#', '#......#', '.#....#.', '..####..'],
  taunt: ['...##...', '..####..', '..####..', '..####..', '...##...', '........', '...##...', '...##...'],
  cross: ['..####..', '..####..', '########', '########', '########', '########', '..####..', '..####..'],
  stun: ['..####..', '.#....#.', '#..##..#', '#.#..#.#', '#.#.##.#', '#..#...#', '.#....#.', '..####..'],
  flake: ['...##...', '.#.##.#.', '..####..', '########', '########', '..####..', '.#.##.#.', '...##...'],
  drop: ['...##...', '...##...', '..####..', '..####..', '.######.', '.######.', '.##.###.', '..####..'],
  flame: ['...#....', '...##...', '..####..', '..#####.', '.###.##.', '.##..##.', '.##.###.', '..####..'],
  swords: ['#......#', '.#....#.', '..#..#..', '...##...', '...##...', '.##..##.', '.#....#.', '#......#'],
  slash: ['#.......', '.#......', '..#.....', '...#....', '....#...', '.....#..', '......#.', '.......#'],
};

interface StatusIconDef {
  mask: string;
  bg: string;
  fg: string;
  /** a second glyph drawn on top in another color (heal block's strike-through) */
  mask2?: string;
  fg2?: string;
  badge?: 'up' | 'down';
  buff: boolean;
}

export const STATUS_ICONS: Record<string, StatusIconDef> = {
  atk_up: { mask: 'sword', bg: '#8e2230', fg: '#ffe4c8', badge: 'up', buff: true },
  def_up: { mask: 'shield', bg: '#24508e', fg: '#e8f2ff', badge: 'up', buff: true },
  spd_up: { mask: 'boot', bg: '#2a7a3a', fg: '#e8ffe0', badge: 'up', buff: true },
  shield: { mask: 'bubble', bg: '#8a6a1a', fg: '#fff3b0', buff: true },
  taunt: { mask: 'taunt', bg: '#a8481a', fg: '#ffe9c0', buff: true },
  regen: { mask: 'cross', bg: '#2a8a4a', fg: '#eaffe8', buff: true },
  counter: { mask: 'swords', bg: '#7a4a12', fg: '#ffe890', buff: true },
  stun: { mask: 'stun', bg: '#8a7a1a', fg: '#fff8c0', buff: false },
  freeze: { mask: 'flake', bg: '#1f5f9a', fg: '#e4fbff', buff: false },
  poison: { mask: 'drop', bg: '#2f5a1e', fg: '#b6ff7a', buff: false },
  burn: { mask: 'flame', bg: '#9a3a10', fg: '#ffd060', buff: false },
  def_down: { mask: 'shield', bg: '#4a2a6a', fg: '#e6d4ff', badge: 'down', buff: false },
  spd_down: { mask: 'boot', bg: '#2a3a6a', fg: '#d4ddff', badge: 'down', buff: false },
  atk_down: { mask: 'sword', bg: '#5a1a2a', fg: '#ffd0d0', badge: 'down', buff: false },
  weaken: { mask: 'cracked', bg: '#6a1a3a', fg: '#ffc0d8', buff: false },
  heal_block: { mask: 'cross', bg: '#2a1418', fg: '#7ad06a', mask2: 'slash', fg2: '#ff5a3a', buff: false },
};

export function statusIcon(s: StatusIconDef): Bitmap {
  const b = new Bitmap(12, 12);
  const bg = hex(s.bg), fg = hex(s.fg);
  const border = s.buff ? hex('#9ad8ff') : hex('#ff8a8a');
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
      const edge = x === 0 || y === 0 || x === 11 || y === 11;
      if ((x === 0 || x === 11) && (y === 0 || y === 11)) continue;
      b.set(x, y, edge ? INK.black : y < 6 ? bg : rampDither([bg, INK.black], 0.25, x, y));
    }
  }
  for (let i = 1; i < 11; i++) {
    b.set(i, 1, border);
    b.set(1, i, border);
  }
  const stampMask = (name: string, c: RGBA) => MASKS[name].forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && b.set(2 + x, 2 + y, c)));
  stampMask(s.mask, fg);
  if (s.mask2 && s.fg2) stampMask(s.mask2, hex(s.fg2));
  if (s.badge) {
    const c = s.badge === 'up' ? hex('#7dff6a') : hex('#ff5a5a');
    const pts = s.badge === 'up' ? [[9, 6], [8, 7], [9, 7], [10, 7], [9, 8], [9, 9]] : [[9, 6], [9, 7], [8, 8], [9, 8], [10, 8], [9, 9]];
    for (const [x, y] of pts) b.set(x, y, c);
  }
  return b;
}
