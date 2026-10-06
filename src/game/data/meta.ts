// Rarities, affinities, factions and roles: the categories every champion
// card, filter and codex page is built from.
import { Affinity, AffinityDef, FactionDef, FactionId, Rarity, RarityDef, Role, RoleDef } from './types';

export const RARITIES: Record<Rarity, RarityDef> = {
  common: { id: 'common', name: 'Common', color: '#b8c0cc', deep: '#3a404c', rank: 1 },
  uncommon: { id: 'uncommon', name: 'Uncommon', color: '#6fd36a', deep: '#1c4a22', rank: 2 },
  rare: { id: 'rare', name: 'Rare', color: '#5aa8ff', deep: '#163a6e', rank: 3 },
  epic: { id: 'epic', name: 'Epic', color: '#c070ff', deep: '#3e1866', rank: 4 },
  legendary: { id: 'legendary', name: 'Legendary', color: '#ffb340', deep: '#5a3208', rank: 5 },
};

/** Force beats Wild, Wild beats Arcane, Arcane beats Force. Void stands outside the cycle. */
export const AFFINITIES: Record<Affinity, AffinityDef> = {
  force: { id: 'force', name: 'Force', color: '#ff5a4a', beats: 'wild', desc: 'Raw might and steel. Strong against Wild.' },
  wild: { id: 'wild', name: 'Wild', color: '#5ad05a', beats: 'arcane', desc: 'The untamed world. Strong against Arcane.' },
  arcane: { id: 'arcane', name: 'Arcane', color: '#5aa8ff', beats: 'force', desc: 'Spellcraft and faith. Strong against Force.' },
  void: { id: 'void', name: 'Void', color: '#c070ff', desc: 'Outside the cycle: no strong or weak hits, dealt or taken.' },
};

/** Damage multiplier for strong / weak hits. */
export const AFFINITY_BONUS = 0.2;

/** +1 strong hit, -1 weak hit, 0 neutral. */
export function affinityEdge(attacker: Affinity, defender: Affinity): -1 | 0 | 1 {
  if (AFFINITIES[attacker].beats === defender) return 1;
  if (AFFINITIES[defender].beats === attacker) return -1;
  return 0;
}

export const FACTIONS: Record<FactionId, FactionDef> = {
  dawn: { id: 'dawn', name: 'Order of Dawn', color: '#f0c650', desc: 'Knights sworn to hold the light at the edge of the realm.' },
  clans: { id: 'clans', name: 'Clans of the North', color: '#d9443f', desc: 'Fur-clad warbands of the ice fields.' },
  wildwood: { id: 'wildwood', name: 'Wildwood', color: '#5ad05a', desc: 'Rangers and druids of the great forest.' },
  coven: { id: 'coven', name: 'Frostfang Coven', color: '#7fd8ff', desc: 'Witches and oath-breakers who rule the frozen ruins.' },
  temple: { id: 'temple', name: 'Temple of the Still Peak', color: '#f39432', desc: 'Warrior-monks of the high mountain monastery.' },
  sunscar: { id: 'sunscar', name: 'Sunscar Dynasty', color: '#ffb340', desc: 'The undying court of the desert sun kings.' },
};

export const ROLES: Record<Role, RoleDef> = {
  Tank: { id: 'Tank', desc: 'Stands in front: high HP and Defense, taunts, shields and protects allies.' },
  Bruiser: { id: 'Bruiser', desc: 'Hits hard and takes hits back: balanced stats and sustain.' },
  Damage: { id: 'Damage', desc: 'Kills fast: high Attack, Speed and critical rate, low Defense.' },
  Support: { id: 'Support', desc: 'Keeps the team alive: heals, cleanses and buffs.' },
  Control: { id: 'Control', desc: 'Decides who gets to act: stuns, freezes, slows and curses.' },
};
