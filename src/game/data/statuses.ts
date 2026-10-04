import { StatusDef, StatusId } from './types';

export const STATUSES: Record<StatusId, StatusDef> = {
  atk_up: { id: 'atk_up', name: 'ATK Up', buff: true, desc: '+25% Attack.', color: '#ffb070' },
  def_up: { id: 'def_up', name: 'DEF Up', buff: true, desc: '+40% Defense.', color: '#8fc0ff' },
  spd_up: { id: 'spd_up', name: 'SPD Up', buff: true, desc: '+25% Speed.', color: '#9dff8a' },
  shield: { id: 'shield', name: 'Shield', buff: true, desc: 'Absorbs incoming damage.', color: '#ffe48a' },
  taunt: { id: 'taunt', name: 'Taunt', buff: true, desc: 'Enemies must target this hero.', color: '#ffa060' },
  regen: { id: 'regen', name: 'Regen', buff: true, desc: 'Heals 7.5% max HP each turn.', color: '#8cff9a' },
  stun: { id: 'stun', name: 'Stun', buff: false, desc: 'Skips the next turn.', color: '#fff070' },
  freeze: { id: 'freeze', name: 'Freeze', buff: false, desc: 'Frozen solid: skips the next turn.', color: '#a6ecff' },
  poison: { id: 'poison', name: 'Poison', buff: false, desc: 'Loses 5% max HP each turn.', color: '#9dff5a' },
  def_down: { id: 'def_down', name: 'DEF Down', buff: false, desc: '-30% Defense.', color: '#d0a0ff' },
  spd_down: { id: 'spd_down', name: 'SPD Down', buff: false, desc: '-25% Speed.', color: '#a0b4ff' },
  atk_down: { id: 'atk_down', name: 'ATK Down', buff: false, desc: '-25% Attack.', color: '#ff9a9a' },
};
