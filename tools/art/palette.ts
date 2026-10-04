// The master palette. Every pixel of every character, effect, tile and icon
// comes from one of these ramps. See docs/ART_GUIDE.md ("Palette").
//
// A ramp is always 6 entries:  [outline, deep, shadow, base, light, highlight]
//   outline   - silhouette + separation lines (never pure black)
//   deep      - occlusion / far-side core shadow
//   shadow    - form shadow
//   base      - local color, what the material "is"
//   light     - lit plane facing the key light (top-left)
//   highlight - specular / brightest accent, used sparingly
// Shadows hue-shift toward blue/violet, highlights toward warm yellow.
import { hex, RGBA } from './raster.ts';

export type MatKind = 'matte' | 'metal' | 'cloth' | 'skin' | 'glow' | 'hair' | 'fur';

export interface Material {
  name: string;
  kind: MatKind;
  /** [outline, deep, shadow, base, light, highlight] */
  ramp: RGBA[];
}

export const OUTLINE = 0, DEEP = 1, SHADOW = 2, BASE = 3, LIGHT = 4, HIGHLIGHT = 5;

function m(name: string, kind: MatKind, colors: string[]): Material {
  if (colors.length !== 6) throw new Error(`ramp ${name} needs 6 colors`);
  return { name, kind, ramp: colors.map((c) => hex(c)) };
}

export const MAT = {
  // --- metals -------------------------------------------------------------
  steel: m('steel', 'metal', ['#1a1c2c', '#2b3048', '#48506e', '#7a85a3', '#b4bfd6', '#f0f6ff']),
  darksteel: m('darksteel', 'metal', ['#0b0710', '#17111e', '#251c30', '#392e48', '#5b4f6e', '#a697ba']),
  iron: m('iron', 'metal', ['#16161c', '#2a2b33', '#464852', '#6e717c', '#a4a7b0', '#e2e4e8']),
  gold: m('gold', 'metal', ['#2b1608', '#5a2f0e', '#8c5214', '#c88a22', '#efc04a', '#fff3a8']),
  silver: m('silver', 'metal', ['#20222e', '#3c4256', '#646d84', '#98a3b8', '#cfd8e6', '#ffffff']),

  // --- leathers / woods ----------------------------------------------------
  leather: m('leather', 'matte', ['#1f120d', '#36201a', '#573323', '#7e4e30', '#a97245', '#cf9d6a']),
  darkleather: m('darkleather', 'matte', ['#140c0c', '#241615', '#38231e', '#523428', '#724a36', '#966a4c']),
  wood: m('wood', 'matte', ['#1c100a', '#34200f', '#523218', '#774b24', '#9d6935', '#c28d4f']),
  bone: m('bone', 'matte', ['#2a2420', '#5a4e44', '#8f8070', '#c8b9a4', '#e8dcc8', '#fff8ea']),

  // --- cloths (one signature hue per hero) --------------------------------
  blue: m('blue', 'cloth', ['#0e1030', '#182059', '#213a8f', '#2f5cc4', '#4f8ae6', '#8fc0ff']),
  red: m('red', 'cloth', ['#1e0710', '#420c1c', '#74142a', '#ad2234', '#d9443f', '#f88a68']),
  green: m('green', 'cloth', ['#0b1610', '#142a1c', '#1f4428', '#2e6334', '#4a8c40', '#85bb5c']),
  moss: m('moss', 'cloth', ['#10140c', '#1f2716', '#323d20', '#4a5a2c', '#6b7d3c', '#93a557']),
  saffron: m('saffron', 'cloth', ['#2a0f08', '#57200e', '#8f3a14', '#cf641c', '#f39432', '#ffcd6e']),
  maroon: m('maroon', 'cloth', ['#1c0710', '#370d1d', '#561629', '#7a2236', '#a13a48', '#c9625f']),
  violet: m('violet', 'cloth', ['#0f0717', '#1f0e30', '#33174f', '#4c2373', '#6d3a9c', '#9d64c8']),
  ice: m('ice', 'cloth', ['#0b1530', '#142a58', '#1f4789', '#3270b8', '#56a2dc', '#9ad4f2']),
  wrap: m('wrap', 'cloth', ['#2a2420', '#5a4e44', '#8f8070', '#c8b9a4', '#e8dcc8', '#fff8ea']),
  charcoal: m('charcoal', 'cloth', ['#0d0d14', '#191a24', '#272a38', '#3a3e50', '#545a70', '#7c849c']),

  // --- furs ----------------------------------------------------------------
  furWhite: m('furWhite', 'fur', ['#262838', '#4b5068', '#7a849c', '#b0bccc', '#dbe4ee', '#fbfdff']),
  furBrown: m('furBrown', 'fur', ['#15100e', '#2a201d', '#43342d', '#615043', '#85725e', '#ab9a82']),

  // --- skins -------------------------------------------------------------
  skinLight: m('skinLight', 'skin', ['#2e1512', '#5c2a24', '#934c3c', '#d08262', '#f0ad86', '#ffd6b5']),
  skinTan: m('skinTan', 'skin', ['#2a140f', '#4f281d', '#7a4430', '#a8674a', '#c98a66', '#e8b08a']),
  skinBrown: m('skinBrown', 'skin', ['#24100c', '#452018', '#6a3524', '#985035', '#be704b', '#e09a70']),
  skinPale: m('skinPale', 'skin', ['#2a1a2a', '#54405a', '#86708a', '#c2aab8', '#e4d0d8', '#fbf0f2']),

  // --- hair ----------------------------------------------------------------
  hairBlonde: m('hairBlonde', 'hair', ['#2e1c0c', '#5c3a14', '#946222', '#cf9a3a', '#efcb6a', '#fff0a8']),
  hairGinger: m('hairGinger', 'hair', ['#250a08', '#4f140c', '#7f2412', '#b33a1c', '#dc5d2c', '#f88f4a']),
  hairSilver: m('hairSilver', 'hair', ['#24263a', '#4f5878', '#8794b4', '#c2cee6', '#e6eef9', '#ffffff']),
  hairDark: m('hairDark', 'hair', ['#0e0a10', '#1c1520', '#2c2230', '#3e3244', '#56475c', '#7a6880']),

  // --- emissive (unlit, glow outward) --------------------------------------
  glowViolet: m('glowViolet', 'glow', ['#2a0a3a', '#5a1a8a', '#8a2ad0', '#b84cff', '#df9aff', '#fbe4ff']),
  glowIce: m('glowIce', 'glow', ['#10284a', '#1e4f86', '#2f86c0', '#5cc4ea', '#a6ecff', '#f2feff']),
  glowGold: m('glowGold', 'glow', ['#3a1a06', '#7a3c0a', '#c06a12', '#f0a81e', '#ffd860', '#fffbd0']),
  glowGreen: m('glowGreen', 'glow', ['#0a2410', '#155a1e', '#22922c', '#4cd43a', '#a2f56a', '#eaffc8']),
  glowRed: m('glowRed', 'glow', ['#3a0a0a', '#7a1010', '#c02020', '#f04a30', '#ff9a6a', '#ffe0c8']),
  glowCyan: m('glowCyan', 'glow', ['#062a2a', '#0e5a5a', '#18908a', '#36d0c0', '#90f5e2', '#e8fff8']),
} as const;

export type MatName = keyof typeof MAT;

/** Single accent colors used for decals (eyes, mouths, paint). */
export const INK = {
  eye: hex('#140c18'),
  eyeWhite: hex('#f4efe8'),
  blush: hex('#c0504a'),
  lip: hex('#8a3a3a'),
  warpaint: hex('#9e1c2a'),
  frostLip: hex('#4a6fb0'),
  black: hex('#0a0810'),
  white: hex('#ffffff'),
};

/** Lighting setup shared by every generated asset. Screen space: +x right, +y down, +z toward viewer. */
export const LIGHT_DIR = normalize3(-0.5, -0.65, 0.58);

/** Thresholds on n·L that select ramp entries deep|shadow|base|light|highlight. */
export const BANDS: Record<MatKind, [number, number, number, number]> = {
  //          deep<  shadow<  base<  light<  else highlight
  matte: [-0.55, 0.22, 0.64, 0.95],
  cloth: [-0.55, 0.24, 0.66, 0.97],
  skin: [-0.6, 0.2, 0.62, 0.93],
  hair: [-0.5, 0.25, 0.66, 0.93],
  fur: [-0.55, 0.2, 0.62, 0.9],
  metal: [-0.4, 0.28, 0.62, 0.86],
  glow: [-2, -2, 0.0, 0.6],
};

export function normalize3(x: number, y: number, z: number): [number, number, number] {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}
