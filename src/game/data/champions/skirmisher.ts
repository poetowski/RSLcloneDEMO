import { ChampionDef } from '../types';

// The Skirmisher (docs/DESIGN_DECISIONS.md section 12, Jakub's brief of
// 2026-10-11): a Common of the Azure Crown, Damage, Bloom, a light-armoured
// man who looks weaker than the starters. One skill: an A1 that always hits
// twice, one cut with each short sword; no A2. Stand-ins until Jakub sets
// them: the stats (on the Common budget), the skill's name, text and
// multipliers, the lore line and the stage whose first clear brings him.
export const skirmisher: ChampionDef = {
  id: 'skirmisher',
  name: 'Skirmisher',
  role: 'Damage',
  rarity: 'common',
  affinity: 'bloom',
  faction: 'azure_crown',
  color: '#86aee8',
  stats: { hp: 960, atk: 108, def: 57, spd: 110, crit: 0.035, critDmg: 1, acc: 0, res: 0 },
  lore: 'A skirmisher of the Azure Crown, a power from a world of its own: light armour of blue leather with the Crown\'s insignia, a leather helmet and two short swords. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'twin_cut', name: 'Twin Cut', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Two quick cuts at one enemy, one with each short sword. It always hits twice.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 0.6, fx: 'leaf_cut' }, { mult: 0.6, fx: 'leaf_cut_rise' }],
      ai: { priority: 1 },
    },
  ],
};
