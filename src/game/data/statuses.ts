import { StatusDef, StatusId } from './types';

/** Every buff and debuff in the game. Icons: tools/art/ui.ts STATUS. Codex: Academy chapters. */
export const STATUSES: Record<StatusId, StatusDef> = {
  atk_up: { id: 'atk_up', name: 'ATK Up', buff: true, desc: '+25% Attack.', color: '#ffb070' },
  def_up: { id: 'def_up', name: 'DEF Up', buff: true, desc: '+40% Defense.', color: '#8fc0ff' },
  spd_up: { id: 'spd_up', name: 'SPD Up', buff: true, desc: '+25% Speed.', color: '#9dff8a' },
  shield: { id: 'shield', name: 'Shield', buff: true, desc: 'Absorbs incoming damage until broken.', color: '#ffe48a' },
  taunt: { id: 'taunt', name: 'Taunt', buff: true, desc: 'Enemies must aim single-target skills at this champion.', color: '#ffa060' },
  regen: { id: 'regen', name: 'Regen', buff: true, desc: 'Heals 7.5% max HP at the start of each turn.', color: '#8cff9a' },
  counter: { id: 'counter', name: 'Counterattack', buff: true, desc: 'Strikes back with the basic skill when hit by an enemy skill.', color: '#ffd27a' },
  stun: { id: 'stun', name: 'Stun', buff: false, desc: 'Skips the next turn.', color: '#fff070' },
  freeze: { id: 'freeze', name: 'Freeze', buff: false, desc: 'Encased in ice: skips the next turn.', color: '#a6ecff' },
  poison: { id: 'poison', name: 'Poison', buff: false, desc: 'Loses 5% max HP at the start of each turn. Ignores shields.', color: '#9dff5a' },
  burn: { id: 'burn', name: 'Burn', buff: false, desc: 'Loses 6% max HP at the start of each turn. Ignores shields.', color: '#ff9a40' },
  def_down: { id: 'def_down', name: 'DEF Down', buff: false, desc: '-30% Defense.', color: '#d0a0ff' },
  spd_down: { id: 'spd_down', name: 'SPD Down', buff: false, desc: '-25% Speed.', color: '#a0b4ff' },
  atk_down: { id: 'atk_down', name: 'ATK Down', buff: false, desc: '-25% Attack.', color: '#ff9a9a' },
  weaken: { id: 'weaken', name: 'Weaken', buff: false, desc: 'Takes 25% more damage from every hit.', color: '#ff8ab0' },
  heal_block: { id: 'heal_block', name: 'Heal Block', buff: false, desc: 'Cannot be healed, including Regen and lifesteal.', color: '#ff6a6a' },
};
