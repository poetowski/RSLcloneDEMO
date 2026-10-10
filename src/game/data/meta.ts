// Rarities, affinities, factions and roles: the categories every champion
// card, filter and codex page is built from. The four enums are Jakub's
// design decisions (docs/DESIGN_DECISIONS.md sections 2 and 3); colors,
// descriptions of rules and the strong-hit bonus are proof-of-concept
// placeholders until he decides them.
import { Affinity, AffinityDef, FactionDef, FactionId, Rarity, RarityDef, Role, RoleDef } from './types';

export const RARITIES: Record<Rarity, RarityDef> = {
  common: { id: 'common', name: 'Common', color: '#b8c0cc', deep: '#3a404c', rank: 1 },
  elite: { id: 'elite', name: 'Elite', color: '#5aa8ff', deep: '#163a6e', rank: 2 },
  heroic: { id: 'heroic', name: 'Heroic', color: '#c070ff', deep: '#3e1866', rank: 3 },
  mythic: { id: 'mythic', name: 'Mythic', color: '#ffb340', deep: '#5a3208', rank: 4 },
};

/** Ember beats Bloom, Bloom beats Tide, Tide beats Ember. */
export const AFFINITIES: Record<Affinity, AffinityDef> = {
  ember: { id: 'ember', name: 'Ember', color: '#ff5a4a', beats: 'bloom', desc: 'Strong against Bloom, weak against Tide.' },
  bloom: { id: 'bloom', name: 'Bloom', color: '#5ad05a', beats: 'tide', desc: 'Strong against Tide, weak against Ember.' },
  tide: { id: 'tide', name: 'Tide', color: '#5aa8ff', beats: 'ember', desc: 'Strong against Ember, weak against Bloom.' },
};

/** Damage multiplier for strong / weak hits (what an affinity edge does is not decided yet; this is the proof of concept's rule). */
export const AFFINITY_BONUS = 0.2;

/** +1 strong hit, -1 weak hit, 0 neutral. */
export function affinityEdge(attacker: Affinity, defender: Affinity): -1 | 0 | 1 {
  if (AFFINITIES[attacker].beats === defender) return 1;
  if (AFFINITIES[defender].beats === attacker) return -1;
  return 0;
}

export const FACTIONS: Record<FactionId, FactionDef> = {
  azure_crown: {
    id: 'azure_crown',
    name: 'Azure Crown',
    color: '#4f8ae6',
    desc: 'An established power from a world of its own. It can never meet the Sanguine Dominion naturally: the two clash only where the broken loom connects their warriors.',
    standard: 'Blue, with a gold crown.',
  },
  sanguine_dominion: {
    id: 'sanguine_dominion',
    name: 'Sanguine Dominion',
    color: '#e0505a',
    desc: 'An established power from a world of its own. Sanguine means blood: they are alive. It meets the Azure Crown only where the broken loom connects their warriors.',
    standard: 'Black, with a red hexagon inside.',
  },
  court_of_root: {
    id: 'court_of_root',
    name: 'Court of Root',
    color: '#6cb85a',
    desc: 'Everything with no crown, no dominion and no reign: semi-wild tribes, animals and very intelligent feral entities. They share a nature, not a hierarchy, fight each other as readily as outsiders, and hide in jungle and forest.',
    standard: 'Green, with a brown claw.',
  },
  ashveil_reign: {
    id: 'ashveil_reign',
    name: 'Ashveil Reign',
    color: '#d8d0bc',
    desc: 'An occult power, undead or demonic or both, that rules rather than worships.',
    standard: 'Dark grey, with one white bone laid across.',
  },
};

export const ROLES: Record<Role, RoleDef> = {
  Tank: { id: 'Tank', desc: 'Stands in front: high HP and Defense, taunts, shields and protects allies.' },
  Damage: { id: 'Damage', desc: 'Kills fast: high Attack, Speed and critical rate, low Defense.' },
  Support: { id: 'Support', desc: 'Keeps the team alive: heals, cleanses and buffs.' },
};
