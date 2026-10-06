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
  bronze: m('bronze', 'metal', ['#2a1606', '#5a3410', '#8a5418', '#ba7e2a', '#e2aa48', '#fff0a8']),
  jackal: m('jackal', 'metal', ['#060408', '#100c18', '#1c1628', '#2c2440', '#463c60', '#8a80b0']),

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
  linen: m('linen', 'cloth', ['#2a2620', '#6a5e4c', '#a49478', '#d8ccb2', '#f2ead8', '#fffaf0']),
  bandage: m('bandage', 'cloth', ['#1e140e', '#3e3022', '#6a5a42', '#9a8a68', '#c4b490', '#e8dcc0']),
  turquoise: m('turquoise', 'matte', ['#082a2a', '#0e4a48', '#16756a', '#2aa890', '#6ad8bc', '#c0fff0']),
  lapis: m('lapis', 'matte', ['#0a1030', '#16205a', '#24368c', '#3a58c0', '#6a8ae0', '#b0c8ff']),
  indigo: m('indigo', 'cloth', ['#070a1a', '#0e1430', '#18224c', '#24346c', '#384c90', '#5a72b8']),
  sandstone: m('sandstone', 'matte', ['#2a140c', '#5a2e18', '#8a4e2c', '#bc7c48', '#e0aa6c', '#f6d8a0']),
  sand: m('sand', 'matte', ['#3a1c0e', '#7a4220', '#b06a34', '#d89850', '#f0c478', '#fff0c0']),

  // --- furs ----------------------------------------------------------------
  furWhite: m('furWhite', 'fur', ['#262838', '#4b5068', '#7a849c', '#b0bccc', '#dbe4ee', '#fbfdff']),
  furBrown: m('furBrown', 'fur', ['#15100e', '#2a201d', '#43342d', '#615043', '#85725e', '#ab9a82']),

  // --- skins -------------------------------------------------------------
  skinLight: m('skinLight', 'skin', ['#2e1512', '#5c2a24', '#934c3c', '#d08262', '#f0ad86', '#ffd6b5']),
  skinTan: m('skinTan', 'skin', ['#2a140f', '#4f281d', '#7a4430', '#a8674a', '#c98a66', '#e8b08a']),
  skinBrown: m('skinBrown', 'skin', ['#24100c', '#452018', '#6a3524', '#985035', '#be704b', '#e09a70']),
  skinDeep: m('skinDeep', 'skin', ['#1a0c08', '#2e1810', '#4a2a1c', '#6a3e28', '#8a5638', '#ac7450']),
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
  glowAmber: m('glowAmber', 'glow', ['#3a1a04', '#7a3a08', '#c06a10', '#f0a020', '#ffd060', '#fff4c0']),
} as const;

export type MatName = keyof typeof MAT;

/**
 * Named accent colors for decals, smears, strings and icon glyphs. Art code
 * never writes a literal hex: it uses a ramp from MAT, INK or ACCENT, so the
 * palette audit (npm run audit) can prove every pixel belongs to the palette.
 */
export const ACCENT = {
  white: hex('#ffffff'),
  string: hex('#efe6d2'),
  eyeGreen: hex('#1f4a2a'),
  eyeAmber: hex('#ffb030'),
  fletchRed: hex('#c83c3c'),
  sparkGold: hex('#ffe58a'),
  chiGold: hex('#ffd060'),
  speedGold: hex('#ffe0a0'),
  bindi: hex('#c0303a'),
  mouthRed: hex('#5a1414'),
  frostEye: hex('#8ff0ff'),
  smearSteel: hex('#9fd0ff'),
  smearPeach: hex('#ffc9a0'),
  swirlPeach: hex('#ffd2ae'),
  smearLilac: hex('#fbe4ff'),
  smearViolet: hex('#9a4cff'),
  smearGold: hex('#ffd860'),
  smearSun: hex('#fff6c0'),
  smearIndigo: hex('#8aa8ff'),
  kohl: hex('#1a1020'),
  pale: hex('#cfe9ff'),
  goldHot: hex('#fff0a0'),
  red: hex('#ff5a3a'),
  redHot: hex('#ffd0a0'),
  violet: hex('#c06cff'),
  violetHot: hex('#f4dcff'),
  green: hex('#7ff05a'),
  ice: hex('#a6ecff'),
  orange: hex('#ffa030'),
  iceGlint: hex('#d8f6ff'),
  deepViolet: hex('#2a0a3a'),
  lipRose: hex('#b0524a'),
};

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

/**
 * Effect ramps: 5 steps from the darkest edge to the white-hot core. Combat
 * effects (tools/art/fx.ts) use only these, so every flash on screen belongs
 * to one of the game's elements.
 */
export const FXR = {
  steel: fx(['#2b4a7a', '#4f8ae6', '#9fd0ff', '#dff2ff', '#ffffff']),
  fire: fx(['#7a1a10', '#d0401a', '#f2861e', '#ffd060', '#fff6d0']),
  violet: fx(['#3a0f5a', '#6d2aa8', '#a44cff', '#d89cff', '#fbe8ff']),
  gold: fx(['#7a4a12', '#c08a28', '#f0c650', '#ffe890', '#fffbe0']),
  ice: fx(['#1e4f86', '#2f86c0', '#5cc4ea', '#a6ecff', '#f2feff']),
  green: fx(['#155a1e', '#22922c', '#4cd43a', '#a2f56a', '#eaffc8']),
  chi: fx(['#8a2a10', '#d8581a', '#ffa030', '#ffe070', '#fffbe0']),
  dust: fx(['#3a3d52', '#555c75', '#717a93', '#949db3', '#c3cad8']),
  smoke: fx(['#2a2d41', '#3e435a', '#555c75', '#717a93', '#949db3']),
  amber: fx(['#3a1a04', '#c06a10', '#f0a020', '#ffd060', '#fff4c0']),
  sand: fx(['#5a2e18', '#8a4e2c', '#bc7c48', '#e0aa6c', '#f6d8a0']),
  turquoise: fx(['#0e4a48', '#16756a', '#2aa890', '#6ad8bc', '#c0fff0']),
  tomb: fx(['#0a2410', '#155a1e', '#2fae4a', '#8af07a', '#e4ffd8']),
  curse: fx(['#120a1c', '#2a1440', '#4a2468', '#3f8a3a', '#9af07a']),
  blood: fx(['#3a0a10', '#7a1420', '#c02a30', '#ff6a5a', '#ffd0c0']),
};

function fx(colors: string[]): RGBA[] {
  return colors.map((c) => hex(c));
}

/**
 * Interface ramps (dark to light). Card frames use the rarity ramps, whose
 * base entry [3] equals the rarity color in src/game/data/meta.ts; affinity
 * gems use the affinity ramps likewise.
 */
export const UIR = {
  gold: fx(['#120c08', '#5a3410', '#a8701e', '#e8b440', '#fff0a8']),
  navy: fx(['#05070c', '#2a3348', '#4a5674', '#7a88a8', '#c0cbe0']),
  red: fx(['#120408', '#5a1420', '#a02a36', '#e0505a', '#ffb0a0']),
  steel: fx(['#0b0d14', '#2c3346', '#55607a', '#9aa6c0', '#e4ecf8']),
  stone: fx(['#0e0f18', '#2a2d41', '#4a4f68', '#717a93', '#b0b8cc']),
  fill: fx(['#070910', '#0d1220', '#141c30', '#1c2840', '#26364f']),
  ink: fx(['#07080e', '#1a1210', '#2a1e14', '#3a2a18', '#4a3820']),
  parchment: fx(['#3a2814', '#7a5a34', '#b8946a', '#e2c89c', '#f8ecd0']),
  rarity: {
    common: fx(['#1a1c22', '#3a404c', '#6a7280', '#b8c0cc', '#eef2f8']),
    uncommon: fx(['#0a1a0c', '#1c4a22', '#2f8a3a', '#6fd36a', '#d0ffc8']),
    rare: fx(['#081428', '#163a6e', '#2a6ac0', '#5aa8ff', '#d0e8ff']),
    epic: fx(['#160828', '#3e1866', '#7a34b8', '#c070ff', '#f0d8ff']),
    legendary: fx(['#2a1404', '#5a3208', '#b06a10', '#ffb340', '#fff0c0']),
  },
  affinity: {
    force: fx(['#2a0606', '#7a1410', '#c0302a', '#ff5a4a', '#ffd0c0']),
    wild: fx(['#06200a', '#145a1c', '#2a9a32', '#5ad05a', '#d8ffc8']),
    arcane: fx(['#06142e', '#143a7a', '#2a6ac8', '#5aa8ff', '#d8ecff']),
    void: fx(['#14062a', '#3e1270', '#7a34c0', '#c070ff', '#f4dcff']),
  },
  /** [field, glyph] per faction; glyph = the faction color in meta.ts */
  faction: {
    dawn: fx(['#1c2a5a', '#f0c650']),
    clans: fx(['#3a1012', '#d9443f']),
    wildwood: fx(['#10301a', '#5ad05a']),
    coven: fx(['#0e2440', '#7fd8ff']),
    temple: fx(['#3a1a08', '#f39432']),
    sunscar: fx(['#2a1a3a', '#ffb340']),
  },
  role: {
    Tank: hex('#8fc0ff'),
    Bruiser: hex('#ff8a6a'),
    Damage: hex('#ffd060'),
    Support: hex('#8cff9a'),
    Control: hex('#d89cff'),
  },
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
