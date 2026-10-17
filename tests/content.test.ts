// Content guardrails: every champion, stage, zone, status and codex page must
// agree with each other and with the generated assets in public/assets.
// These are the checks the new-champion and new-combat-background skills
// rely on; a failure here names exactly what is missing.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { allStages, LOCATIONS, recruitStage, STARTERS, WORLD_MAP } from '../src/game/data/campaign';
import { CHAMPIONS } from '../src/game/data/champions';
import { CHAPTERS } from '../src/game/data/codex';
import { AFFINITIES, FACTIONS, RARITIES, ROLES } from '../src/game/data/meta';
import { auditChampion } from '../src/game/data/norms';
import { STATUSES } from '../src/game/data/statuses';
import { ChampionDef, StatusId } from '../src/game/data/types';
import { ZONES } from '../src/game/data/zones';
import { cleared, frontier, isFresh, isUnlocked, locationOpen, newArchivist, readSave, recordClear, stageOpen, writeSave } from '../src/game/archivist';
import { PATTERN_IDS } from '../src/game/data/matrix';
import { threadSpool } from '../src/game/reliquary/matrix';

const json = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8'));
const fx = json('public/assets/fx/fx.json').anims as Record<string, unknown>;
const ui = json('public/assets/ui/ui.json') as { icons: Record<string, unknown>; status: Record<string, unknown>; portraits: Record<string, unknown>; parts: Record<string, unknown> };

describe('champions', () => {
  it('have unique ids and valid categories', () => {
    expect(new Set(CHAMPIONS.map((c) => c.id)).size).toBe(CHAMPIONS.length);
    for (const c of CHAMPIONS) {
      expect(RARITIES[c.rarity], c.id).toBeTruthy();
      expect(AFFINITIES[c.affinity], c.id).toBeTruthy();
      expect(FACTIONS[c.faction], c.id).toBeTruthy();
      expect(ROLES[c.role], c.id).toBeTruthy();
    }
  });

  it('respect the balance norms (src/game/data/norms.ts)', () => {
    for (const c of CHAMPIONS) expect(auditChampion(c), c.id).toEqual([]);
  });

  it('have generated art: atlas, portrait and one icon per skill', () => {
    for (const c of CHAMPIONS) {
      expect(fs.existsSync(`public/assets/champions/${c.id}.png`), `${c.id} atlas`).toBe(true);
      expect(ui.portraits[c.id], `${c.id} portrait`).toBeTruthy();
      for (const s of c.skills) expect(ui.icons[s.id], `${s.id} icon`).toBeTruthy();
    }
  });

  it('have every animation their skills use, with one hit frame per hit', () => {
    for (const c of CHAMPIONS) {
      const atlas = json(`public/assets/champions/${c.id}.json`);
      for (const anim of ['idle', 'run', 'hurt', 'death']) expect(atlas.anims[anim], `${c.id} ${anim}`).toBeTruthy();
      if (c.passive?.kind === 'undying') expect(atlas.anims.rise, `${c.id} rise (Undying)`).toBeTruthy();
      for (const s of c.skills) {
        const a = atlas.anims[s.anim];
        expect(a, `${s.id} anim ${s.anim}`).toBeTruthy();
        expect(a.hits.length, `${s.id}: hit frames in ${s.anim}`).toBe(s.hits.length);
        const events = Object.values(a.events);
        if (s.approach === 'leap') expect(events, `${s.id} leap needs a jump event`).toContain('jump');
        if (s.actorFx) expect(events, `${s.id} actorFx needs a cast event`).toContain('cast');
      }
    }
  });

  it('reference effects that exist', () => {
    for (const c of CHAMPIONS) {
      for (const s of c.skills) {
        for (const f of [...s.hits.map((h) => h.fx), s.projectile, s.castFx, s.actorFx, s.allyFx]) if (f) expect(fx[f], `${s.id} -> fx ${f}`).toBeTruthy();
        if (s.projectile) expect(c.muzzle, `${c.id} fires projectiles, needs a muzzle`).toBeTruthy();
      }
      for (const f of [c.passive?.fx, c.passive?.holderFx]) if (f) expect(fx[f], `${c.passive?.id} -> fx ${f}`).toBeTruthy();
      // a passive that acts in the flow of the fight shows on whom it reaches
      if (c.passive && ['tend', 'ward', 'retaliate', 'remedy'].includes(c.passive.kind)) expect(c.passive.fx, `${c.passive.id} needs an fx`).toBeTruthy();
    }
  });

  it('are all obtainable: starters or exactly one recruiting stage', () => {
    for (const c of CHAMPIONS) {
      const n = allStages().filter((s) => s.recruit === c.id).length;
      if (STARTERS.includes(c.id)) expect(n, c.id).toBe(0);
      else expect(n, `${c.id} recruited by ${n} stages`).toBe(1);
    }
  });
});

describe('statuses', () => {
  const ids = Object.keys(STATUSES) as StatusId[];
  it('each have an icon and an Academy entry', () => {
    const taught = new Set(CHAPTERS.flatMap((ch) => ch.blocks.flatMap((b) => (b.kind === 'statuses' ? b.ids : []))));
    for (const id of ids) {
      expect(ui.status[id], `${id} icon`).toBeTruthy();
      expect(taught.has(id), `${id} missing from the Academy`).toBe(true);
    }
  });
});

describe('campaign', () => {
  it('has unique stage ids, known champions and zones, and campaign nodes inside the world', () => {
    const stages = allStages();
    expect(new Set(stages.map((s) => s.id)).size).toBe(stages.length);
    const ids = new Set(CHAMPIONS.map((c) => c.id));
    const zones = new Set(ZONES.map((z) => z.id));
    for (const loc of LOCATIONS) {
      if (loc.requires) expect(stages.some((s) => s.id === loc.requires), `${loc.id} requires ${loc.requires}`).toBe(true);
      // the node, its banner and its progress line sit inside the world, clear of its frame and of the header
      expect(loc.map.x, `${loc.id} map x`).toBeGreaterThan(80);
      expect(loc.map.x, `${loc.id} map x`).toBeLessThan(WORLD_MAP.w - 80);
      expect(loc.map.y, `${loc.id} map y`).toBeGreaterThan(56);
      expect(loc.map.y, `${loc.id} map y`).toBeLessThan(WORLD_MAP.h - 60);
      // an area whose stages are designed is fought on a known zone and ends with its boss
      if (!loc.stages.length) continue;
      expect(loc.zone && zones.has(loc.zone), `${loc.id} zone ${loc.zone}`).toBe(true);
      expect(loc.stages[loc.stages.length - 1].enemies.some((e) => e.boss), `${loc.id} final stage boss`).toBe(true);
    }
    for (const s of stages) {
      expect(s.enemies.length).toBeGreaterThan(0);
      expect(s.enemies.length).toBeLessThanOrEqual(3);
      for (const e of s.enemies) expect(ids.has(e.champion), `${s.id} enemy ${e.champion}`).toBe(true);
      if (s.recruit) expect(ids.has(s.recruit), `${s.id} recruit`).toBe(true);
    }
  });

  it('has the parts the campaign screen draws: area nodes, their glow, stage nodes', () => {
    for (const k of ['camp_open', 'camp_cleared', 'camp_locked', 'camp_glow_0', 'node_open', 'node_cleared', 'node_locked', 'node_boss', 'node_glow_0']) expect(ui.parts[k], k).toBeTruthy();
  });

  it('has a world map and an overview of the size the campaign data assumes', () => {
    const size = (f: string) => {
      const b = fs.readFileSync(f);
      return [b.readUInt32BE(16), b.readUInt32BE(20)];
    };
    expect(size('public/assets/map/world.png')).toEqual([WORLD_MAP.w, WORLD_MAP.h]);
    expect(size('public/assets/map/overview.png')).toEqual([WORLD_MAP.w / WORLD_MAP.overview, WORLD_MAP.h / WORLD_MAP.overview]);
    // the overview shows the whole world on one screen: a map that grows past twice the screen needs a smaller overview
    expect(WORLD_MAP.w / WORLD_MAP.overview, 'overview width').toBeLessThanOrEqual(640);
  });

  it('runs its areas west to east, each node east of the one before', () => {
    for (let i = 1; i < LOCATIONS.length; i++) expect(LOCATIONS[i].map.x, LOCATIONS[i].id).toBeGreaterThan(LOCATIONS[i - 1].map.x + 200);
  });

});

// Jakub's locked decisions (docs/DESIGN_DECISIONS.md sections 2 and 4): a
// change here is a change to his design, not a fix.
describe('design decisions', () => {
  it('has the four category enums', () => {
    expect(Object.keys(AFFINITIES)).toEqual(['ember', 'bloom', 'tide']);
    expect(Object.values(AFFINITIES).map((a) => `${a.id}>${a.beats}`)).toEqual(['ember>bloom', 'bloom>tide', 'tide>ember']);
    expect(Object.values(RARITIES).map((r) => [r.name, r.rank])).toEqual([['Common', 1], ['Elite', 2], ['Heroic', 3], ['Mythic', 4]]);
    expect(Object.keys(ROLES)).toEqual(['Tank', 'Damage', 'Support']);
    expect(Object.values(FACTIONS).map((f) => f.name)).toEqual(['Azure Crown', 'Sanguine Dominion', 'Court of Root', 'Ashveil Reign']);
  });

  it('starts with Captain Gareth and brings the Rime Scholar after the first battle (the Starter Heroes record)', () => {
    const [first] = CHAMPIONS, second = CHAMPIONS[1];
    expect([first.name, first.rarity, first.role, first.faction, first.affinity]).toEqual(['Captain Gareth', 'elite', 'Damage', 'azure_crown', 'ember']);
    expect([second.name, second.rarity, second.role, second.faction, second.affinity]).toEqual(['Rime Scholar', 'elite', 'Support', 'sanguine_dominion', 'tide']);
    expect(STARTERS).toEqual([first.id]);
    expect(allStages()[0].recruit).toBe(second.id);
    // his kit: Line Cut, Iron Blow (ATK Up on himself after the hit, no crit gate), Wide Sweep (damage only), no passive
    expect(first.skills.map((k) => k.name)).toEqual(['Line Cut', 'Iron Blow', 'Wide Sweep']);
    expect(first.skills[1]?.statuses).toEqual([{ status: 'atk_up', turns: 2, to: 'self' }]);
    expect(first.skills[2]?.target).toBe('enemies');
    expect(first.skills[2]?.statuses ?? []).toEqual([]);
    expect(first.passive).toBeUndefined();
    // no subtitles (Jakub, 2026-10-11)
    for (const c of CHAMPIONS) expect('title' in c, `${c.id} has a subtitle`).toBe(false);
    // hers: Pale Strike (plain), Rimebind (Slow on every enemy), no A3, Cold Rebuke
    expect(second.skills.map((k) => k.name)).toEqual(['Pale Strike', 'Rimebind']);
    expect(second.skills[0].statuses ?? []).toEqual([]);
    expect(second.skills[1]?.target).toBe('enemies');
    expect(second.skills[1]?.statuses?.map((x) => x.status)).toEqual(['spd_down']);
    expect(STATUSES.spd_down.name).toBe('Slow');
    expect(second.passive && [second.passive.name, second.passive.kind, second.passive.value, second.passive.statuses]).toEqual(['Cold Rebuke', 'rebuke', 0.35, [{ status: 'freeze', turns: 1 }]]);
  });

  it('has the Skirmisher of his brief: a Common of the Azure Crown, Damage, Bloom, one A1 that always hits twice, no A2', () => {
    const s = CHAMPIONS.find((c) => c.id === 'skirmisher');
    expect(s && [s.name, s.rarity, s.role, s.faction, s.affinity]).toEqual(['Skirmisher', 'common', 'Damage', 'azure_crown', 'bloom']);
    expect(s?.skills).toHaveLength(1);
    expect(s?.skills[0].hits).toHaveLength(2);
    expect(s?.skills[0].statuses ?? []).toEqual([]);
    expect(s?.passive).toBeUndefined();
  });

  it('has the Lineholder of his brief: a Common of the Azure Crown, Tank, Tide; A1 Guard Cut, A2 Brace (DEF Up on himself for 2 turns)', () => {
    const l = CHAMPIONS.find((c) => c.id === 'lineholder');
    expect(l && [l.name, l.rarity, l.role, l.faction, l.affinity]).toEqual(['Lineholder', 'common', 'Tank', 'azure_crown', 'tide']);
    expect(l?.skills.map((s) => [s.slot, s.name])).toEqual([[1, 'Guard Cut'], [2, 'Brace']]);
    const brace = l?.skills[1];
    expect(brace && [brace.target, brace.statuses]).toEqual(['self', [{ status: 'def_up', turns: 2, to: 'self' }]]);
    expect(brace?.hits.every((h) => h.mult === 0)).toBe(true);
    expect(l?.passive).toBeUndefined();
  });

  it("has the Quartermaster of his brief: a Common Support of the Azure Crown, Bloom; A2 heals every ally by 15% of his max HP, then 15% Turn Meter to the ally lowest on HP", () => {
    const q = CHAMPIONS.find((c) => c.id === 'quartermaster');
    expect(q && [q.name, q.rarity, q.role, q.faction, q.affinity]).toEqual(['Quartermaster', 'common', 'Support', 'azure_crown', 'bloom']);
    expect(q?.skills).toHaveLength(2);
    const a2 = q?.skills[1];
    expect(a2 && [a2.target, a2.healAllies, a2.healOf, a2.tmLowestAlly]).toEqual(['allies', 0.15, 'caster', 15]);
    expect(a2?.hits.every((h) => h.mult === 0)).toBe(true);
    expect(q?.passive).toBeUndefined();
  });

  it('has the Bloodhound of his brief: a Common Tank of the Sanguine Dominion, Ember; A2 a 1-turn Taunt on himself, cooldown 4', () => {
    const b = CHAMPIONS.find((c) => c.id === 'bloodhound');
    expect(b && [b.name, b.rarity, b.role, b.faction, b.affinity]).toEqual(['Bloodhound', 'common', 'Tank', 'sanguine_dominion', 'ember']);
    expect(b?.skills).toHaveLength(2);
    const a2 = b?.skills[1];
    expect(a2 && [a2.slot, a2.target, a2.cooldown, a2.statuses]).toEqual([2, 'self', 4, [{ status: 'taunt', turns: 1, to: 'self' }]]);
    expect(a2?.hits.every((h) => h.mult === 0)).toBe(true);
    expect(b?.passive).toBeUndefined();
  });

  it('has the Dominion Medic of his brief: a Common Support, Tide; one skill, an A1 healing every ally by 10% of his max HP, nothing else', () => {
    const m = CHAMPIONS.find((c) => c.id === 'dominion_medic');
    expect(m && [m.name, m.rarity, m.role, m.affinity]).toEqual(['Dominion Medic', 'common', 'Support', 'tide']);
    expect(m?.skills).toHaveLength(1);
    const a1 = m?.skills[0];
    expect(a1 && [a1.slot, a1.target, a1.healAllies, a1.healOf, a1.statuses ?? []]).toEqual([1, 'allies', 0.1, 'caster', []]);
    expect(a1?.hits.every((h) => h.mult === 0)).toBe(true);
    expect(m?.passive).toBeUndefined();
  });

  it('has the Enforcer of his brief: a Common of the Sanguine Dominion, Damage, Ember; an A1 and +10% C.RATE, always on', () => {
    const e = CHAMPIONS.find((c) => c.id === 'enforcer');
    expect(e && [e.name, e.rarity, e.role, e.faction, e.affinity]).toEqual(['Enforcer', 'common', 'Damage', 'sanguine_dominion', 'ember']);
    expect(e?.skills).toHaveLength(1);
    expect(e?.passive && [e.passive.kind, e.passive.stat, e.passive.value]).toEqual(['stat', 'crit', 0.1]);
  });

  it('has the Follower of his brief: a Common of the Court of Root, Damage, Tide; A1 a single-target attack, A2 a single-target attack with a 50% chance of DEF Down for 2 turns, cooldown 4', () => {
    const f = CHAMPIONS.find((c) => c.id === 'follower');
    expect(f && [f.name, f.rarity, f.role, f.faction, f.affinity]).toEqual(['Follower', 'common', 'Damage', 'court_of_root', 'tide']);
    expect(f?.skills).toHaveLength(2);
    const a1 = f?.skills[0], a2 = f?.skills[1];
    expect(a1 && [a1.slot, a1.target, a1.statuses ?? []]).toEqual([1, 'enemy', []]);
    expect(a1?.hits.some((h) => h.mult > 0)).toBe(true);
    expect(a2 && [a2.slot, a2.target, a2.cooldown, a2.statuses]).toEqual([2, 'enemy', 4, [{ status: 'def_down', turns: 2, chance: 0.5, to: 'targets' }]]);
    expect(a2?.hits.some((h) => h.mult > 0)).toBe(true);
    expect(f?.passive).toBeUndefined();
  });

  it('has the Walking Bush of his brief: a Common Tank of the Court of Root, Bloom; A1 a single-target attack, A2 DEF Up on himself and one chosen ally for 1 turn, cooldown 3', () => {
    const w = CHAMPIONS.find((c) => c.id === 'walking_bush');
    expect(w && [w.name, w.rarity, w.role, w.faction, w.affinity]).toEqual(['Walking Bush', 'common', 'Tank', 'court_of_root', 'bloom']);
    expect(w?.skills).toHaveLength(2);
    const a1 = w?.skills[0], a2 = w?.skills[1];
    expect(a1 && [a1.slot, a1.target, a1.statuses ?? []]).toEqual([1, 'enemy', []]);
    expect(a1?.hits.some((h) => h.mult > 0)).toBe(true);
    expect(a2 && [a2.slot, a2.target, a2.cooldown, a2.statuses]).toEqual([2, 'ally', 3, [{ status: 'def_up', turns: 1, to: 'targets' }, { status: 'def_up', turns: 1, to: 'self' }]]);
    expect(a2?.hits.every((h) => h.mult === 0)).toBe(true);
    expect(w?.passive).toBeUndefined();
  });

  it('has the Wild Speaker of his brief: a Common Support of the Court of Root, Ember; A1 a single-target attack, A2 a single-target attack with, after it, a 50% chance of ATK Down for 2 turns, cooldown 4', () => {
    const w = CHAMPIONS.find((c) => c.id === 'wild_speaker');
    expect(w && [w.name, w.rarity, w.role, w.faction, w.affinity]).toEqual(['Wild Speaker', 'common', 'Support', 'court_of_root', 'ember']);
    expect(w?.skills).toHaveLength(2);
    const a1 = w?.skills[0], a2 = w?.skills[1];
    expect(a1 && [a1.slot, a1.target, a1.statuses ?? []]).toEqual([1, 'enemy', []]);
    expect(a1?.hits.some((h) => h.mult > 0)).toBe(true);
    expect(a2 && [a2.slot, a2.target, a2.cooldown, a2.statuses]).toEqual([2, 'enemy', 4, [{ status: 'atk_down', turns: 2, chance: 0.5, to: 'targets' }]]);
    expect(a2?.hits.some((h) => h.mult > 0)).toBe(true);
    expect(w?.passive).toBeUndefined();
  });

  it('has the Jungle Herder of his proposal: an Elite Tank of the Court of Root; A1 a single-target attack, A2 Taunt for 1 turn and Counterattack for 2 on himself, no attack, cooldown 4; a passive Shield of 10% of his max HP for 1 turn on the ally with the lowest max HP at the end of his turn, every second turn', () => {
    const h = CHAMPIONS.find((c) => c.id === 'jungle_herder');
    expect(h && [h.name, h.rarity, h.role, h.faction]).toEqual(['Jungle Herder', 'elite', 'Tank', 'court_of_root']);
    expect(h?.skills).toHaveLength(2);
    const a1 = h?.skills[0], a2 = h?.skills[1];
    expect(a1 && [a1.slot, a1.target, a1.statuses ?? []]).toEqual([1, 'enemy', []]);
    expect(a1?.hits.some((x) => x.mult > 0)).toBe(true);
    expect(a2 && [a2.slot, a2.target, a2.cooldown, a2.statuses]).toEqual([2, 'self', 4, [{ status: 'taunt', turns: 1, to: 'self' }, { status: 'counter', turns: 2, to: 'self' }]]);
    expect(a2?.hits.every((x) => x.mult === 0)).toBe(true);
    // his answers of 2026-10-17: the lowest max HP in the team, himself included, from his first turn (cooldown 1: every second turn)
    expect(h?.passive && [h.passive.kind, h.passive.value, h.passive.statuses, h.passive.cooldown]).toEqual(['tend', 0.1, [{ status: 'shield', turns: 1 }], 1]);
  });

  it('has Emissary Handlings of his proposal: an Elite Tank of the Azure Crown; A1 Banner Strike with a 20% chance of Stun, A2 Rallying Standard (DEF Up on all allies for 2 turns, no attack, cooldown 5), the passive Unbroken Flag (a 50% chance of a Shield of 15% of his max HP for 1 turn on an ally an enemy attacks, after the hit)', () => {
    const e = CHAMPIONS.find((c) => c.id === 'emissary_handlings');
    expect(e && [e.name, e.rarity, e.role, e.faction]).toEqual(['Emissary Handlings', 'elite', 'Tank', 'azure_crown']);
    expect(e?.skills.map((x) => [x.slot, x.name])).toEqual([[1, 'Banner Strike'], [2, 'Rallying Standard']]);
    const a1 = e?.skills[0], a2 = e?.skills[1];
    expect(a1 && [a1.target, a1.statuses]).toEqual(['enemy', [{ status: 'stun', turns: 1, chance: 0.2, to: 'targets' }]]);
    expect(a2 && [a2.target, a2.cooldown, a2.statuses]).toEqual(['allies', 5, [{ status: 'def_up', turns: 2, to: 'allies' }]]);
    expect(a2?.hits.every((x) => x.mult === 0)).toBe(true);
    expect(e?.passive && [e.passive.name, e.passive.kind, e.passive.value, e.passive.chance, e.passive.statuses]).toEqual(['Unbroken Flag', 'ward', 0.15, 0.5, [{ status: 'shield', turns: 1 }]]);
  });

  it('has Red Cloak of his proposal: an Elite of the Sanguine Dominion, Damage; A1 a single-target attack, A2 Crimson Blade (one Burn for 2 turns at 50%, cooldown 3), A3 an attack on one enemy with SPD Up on all allies for 2 turns, cooldown 5', () => {
    const r = CHAMPIONS.find((c) => c.id === 'red_cloak');
    expect(r && [r.name, r.rarity, r.role, r.faction]).toEqual(['Red Cloak', 'elite', 'Damage', 'sanguine_dominion']);
    expect(r?.skills).toHaveLength(3);
    const [a1, a2, a3] = r!.skills as [ChampionDef['skills'][0], ChampionDef['skills'][0], ChampionDef['skills'][0]];
    expect([a1.slot, a1.target, a1.statuses ?? []]).toEqual([1, 'enemy', []]);
    expect([a2.slot, a2.name, a2.target, a2.cooldown, a2.statuses]).toEqual([2, 'Crimson Blade', 'enemy', 3, [{ status: 'burn', turns: 2, chance: 0.5, to: 'targets' }]]);
    expect([a3.slot, a3.target, a3.cooldown, a3.statuses]).toEqual([3, 'enemy', 5, [{ status: 'spd_up', turns: 2, to: 'allies' }]]);
    for (const k of [a1, a2, a3]) expect(k.hits.some((x) => x.mult > 0), k.id).toBe(true);
    expect(r?.passive).toBeUndefined();
  });

  it('has Big Ears of his proposal: an Elite of the Court of Root, Damage; A1 an attack with a 35% chance of Poison for 1 turn, A2 Dart Volley on all enemies with Heal Block for 2 turns, cooldown 5, the passive Hidden in the Undergrowth (+15% C.RATE for each dead ally, up to +30%)', () => {
    const b = CHAMPIONS.find((c) => c.id === 'big_ears');
    expect(b && [b.name, b.rarity, b.role, b.faction]).toEqual(['Big Ears', 'elite', 'Damage', 'court_of_root']);
    expect(b?.skills).toHaveLength(2);
    const a1 = b?.skills[0], a2 = b?.skills[1];
    expect(a1 && [a1.slot, a1.target, a1.statuses]).toEqual([1, 'enemy', [{ status: 'poison', turns: 1, chance: 0.35, to: 'targets' }]]);
    expect(a2 && [a2.slot, a2.name, a2.target, a2.cooldown, a2.statuses]).toEqual([2, 'Dart Volley', 'enemies', 5, [{ status: 'heal_block', turns: 2, to: 'targets' }]]);
    expect(a2?.hits.some((x) => x.mult > 0)).toBe(true);
    expect(b?.passive && [b.passive.name, b.passive.kind, b.passive.stat, b.passive.value, b.passive.max]).toEqual(['Hidden in the Undergrowth', 'fallen', 'crit', 0.15, 0.3]);
    // like a stat passive, extra: his own stats stay on the Elite budget
    expect(b?.stats.crit).toBeLessThanOrEqual(0.15);
  });

  it('has the Associate of his proposal: an Elite Support of the Azure Crown; A1 an attack with a 50% chance of ATK Down for 1 turn, A2 SPD Up for 2 turns and ATK Up for 1 on all allies, cooldown 5, a passive answering a hit on her with a 35% chance of Poison on that enemy for 1 turn', () => {
    const a = CHAMPIONS.find((c) => c.id === 'associate');
    expect(a && [a.name, a.rarity, a.role, a.faction]).toEqual(['Associate', 'elite', 'Support', 'azure_crown']);
    expect(a?.skills).toHaveLength(2);
    const a1 = a?.skills[0], a2 = a?.skills[1];
    expect(a1 && [a1.slot, a1.target, a1.statuses]).toEqual([1, 'enemy', [{ status: 'atk_down', turns: 1, chance: 0.5, to: 'targets' }]]);
    expect(a1?.hits.some((x) => x.mult > 0)).toBe(true);
    expect(a2 && [a2.slot, a2.target, a2.cooldown, a2.statuses]).toEqual([2, 'allies', 5, [{ status: 'spd_up', turns: 2, to: 'allies' }, { status: 'atk_up', turns: 1, to: 'allies' }]]);
    expect(a2?.hits.every((x) => x.mult === 0)).toBe(true);
    expect(a?.passive && [a.passive.kind, a.passive.chance, a.passive.statuses]).toEqual(['retaliate', 0.35, [{ status: 'poison', turns: 1 }]]);
  });

  it('has the Black Rhino of his proposal: an Elite Tank of the Sanguine Dominion; A1 an attack with a 20% chance of Stun for 1 turn, A2 DEF Up on all allies for 2 turns and Counterattack on himself for 2, cooldown 5, a passive Shield of 10% of his max HP on himself for 1 turn after an enemy hits him', () => {
    const r = CHAMPIONS.find((c) => c.id === 'black_rhino');
    expect(r && [r.name, r.rarity, r.role, r.faction]).toEqual(['Black Rhino', 'elite', 'Tank', 'sanguine_dominion']);
    expect(r?.skills).toHaveLength(2);
    const a1 = r?.skills[0], a2 = r?.skills[1];
    expect(a1 && [a1.slot, a1.target, a1.statuses]).toEqual([1, 'enemy', [{ status: 'stun', turns: 1, chance: 0.2, to: 'targets' }]]);
    expect(a1?.hits.some((x) => x.mult > 0)).toBe(true);
    expect(a2 && [a2.slot, a2.target, a2.cooldown, a2.statuses]).toEqual([2, 'allies', 5, [{ status: 'def_up', turns: 2, to: 'allies' }, { status: 'counter', turns: 2, to: 'self' }]]);
    expect(a2?.hits.every((x) => x.mult === 0)).toBe(true);
    // every hit, on himself alone
    expect(r?.passive && [r.passive.kind, r.passive.self, r.passive.value, r.passive.chance, r.passive.statuses]).toEqual(['ward', true, 0.1, undefined, [{ status: 'shield', turns: 1 }]]);
  });

  it('has the Grove Keeper of his proposal: an Elite Support of the Court of Root; A1 an attack that heals him by 7% of his max HP, A2 removing every debuff from one ally, cooldown 3, a passive with a 35% chance of Regen for 1 turn on an ally an enemy debuffs', () => {
    const g = CHAMPIONS.find((c) => c.id === 'grove_keeper');
    expect(g && [g.name, g.rarity, g.role, g.faction]).toEqual(['Grove Keeper', 'elite', 'Support', 'court_of_root']);
    expect(g?.skills).toHaveLength(2);
    const a1 = g?.skills[0], a2 = g?.skills[1];
    expect(a1 && [a1.slot, a1.target, a1.healSelf, a1.statuses ?? []]).toEqual([1, 'enemy', 0.07, []]);
    expect(a1?.hits.some((x) => x.mult > 0)).toBe(true);
    expect(a2 && [a2.slot, a2.target, a2.cooldown, a2.cleanseAll, a2.statuses ?? []]).toEqual([2, 'ally', 3, true, []]);
    expect(a2?.hits.every((x) => x.mult === 0)).toBe(true);
    expect(g?.passive && [g.passive.kind, g.passive.chance, g.passive.statuses]).toEqual(['remedy', 0.35, [{ status: 'regen', turns: 1 }]]);
  });

  it('opens with a ten-stage first zone', () => {
    expect(LOCATIONS[0].stages).toHaveLength(10);
  });
});

describe('zones', () => {
  it('have generated art and consistent prop kinds', () => {
    for (const z of ZONES) {
      const dir = `public/assets/zones/${z.id}`;
      for (const f of ['tiles.png', 'backdrop.png', 'props.png', 'zone.json']) expect(fs.existsSync(`${dir}/${f}`), `${dir}/${f}`).toBe(true);
      const zj = json(`${dir}/zone.json`);
      expect(zj.id).toBe(z.id);
      for (const p of zj.props) {
        const k = zj.kinds[p.kind];
        expect(k, `${z.id} prop ${p.kind}`).toBeTruthy();
        expect(k.frames, `${z.id} ${p.kind} frames`).toBeGreaterThan(0);
        if (k.mode === 'pulse') expect(k.frames, `${z.id} ${p.kind} pulse needs 2 frames`).toBeGreaterThanOrEqual(2);
        if (k.fire && k.fire.flame !== false) expect(zj.kinds.flame, `${z.id} fire props need flame frames`).toBeTruthy();
        if (p.layer === 'far') expect(k.fire, `${z.id} ${p.kind}: nothing burns in the far layer`).toBeFalsy();
      }
      // spark emitters run along lines inside the screen
      for (const e of zj.sparks ?? []) {
        expect(e.path.length, `${z.id} spark path`).toBeGreaterThanOrEqual(2);
        for (const [x, y] of e.path) expect(x >= 0 && x < 640 && y >= 0 && y < 360, `${z.id} spark point ${x},${y}`).toBe(true);
        expect(e.colors.length).toBeGreaterThan(0);
      }
      if (z.birds) expect(zj.kinds.bird, `${z.id} birds need bird frames`).toBeTruthy();
      // rare events stay rare (Jakub's calm motion: a flash every 10-25 s at most)
      if (z.flash) expect(z.flash.every[0], `${z.id} flash`).toBeGreaterThanOrEqual(10000);
      if (z.shootingStars) {
        expect(z.shootingStars[0], `${z.id} shooting stars`).toBeGreaterThanOrEqual(10000);
        expect(z.shootingStars[1]).toBeGreaterThan(z.shootingStars[0]);
      }
      expect(zj.spawns.player.length).toBe(3);
      expect(zj.spawns.enemy.length).toBe(3);
    }
  });
});

describe('academy', () => {
  it('demos replay skills that exist', () => {
    const skills = new Set(CHAMPIONS.flatMap((c) => c.skills.map((s) => s.id)));
    for (const ch of CHAPTERS) if (ch.demo) expect(skills.has(ch.demo.skill), `${ch.id} demo ${ch.demo.skill}`).toBe(true);
  });

  it('quotes the turn-meter numbers of the skills it names ("Resonance: -15%")', () => {
    const text = CHAPTERS.flatMap((ch) => ch.blocks.flatMap((b) => ('text' in b ? [b.text] : b.kind === 'list' ? b.items : []))).join(' ');
    for (const s of CHAMPIONS.flatMap((c) => c.skills)) {
      const tm = s.tmTargets ?? s.tmAllies;
      const quoted = text.match(new RegExp(`${s.name}: ([+-]\\d+)%`));
      if (tm !== undefined && quoted) expect(Number(quoted[1]), `${s.name} in the Academy`).toBe(tm);
    }
  });

  it('uses icons that exist', () => {
    for (const ch of CHAPTERS) {
      const ok = ch.icon.startsWith('status_') ? !!ui.status[ch.icon.slice(7)] : !!ui.parts[ch.icon];
      expect(ok, `${ch.id} icon ${ch.icon}`).toBe(true);
    }
  });
});

describe('font', () => {
  type FaceId = 'regular' | 'bold' | 'display' | 'micro';
  const font = json('public/assets/ui/font.json') as { faces: Record<FaceId, { cellH: number; cap: number; caps: boolean; glyphs: Record<string, unknown> }> };
  const missing = (face: FaceId, texts: string[]) => {
    const f = font.faces[face];
    const chars = new Set(texts.flatMap((t) => [...(f.caps ? t.toUpperCase() : t)]));
    return [...chars].filter((ch) => !f.glyphs[ch]);
  };

  it('has a glyph in regular and bold for every character of the game text', () => {
    const texts = [
      ...CHAMPIONS.flatMap((c) => [c.name, c.lore, ...c.skills.flatMap((s) => [s.name, s.tag, s.desc]), c.passive?.name ?? '', c.passive?.desc ?? '']),
      ...Object.values(STATUSES).flatMap((s) => [s.name, s.desc]),
      ...[RARITIES, AFFINITIES, FACTIONS].flatMap((m) => Object.values(m).flatMap((d) => [d.name, 'desc' in d ? d.desc : ''])),
      ...Object.values(ROLES).flatMap((r) => [r.id, r.desc]),
      ...LOCATIONS.flatMap((l) => [l.chapter, l.name, l.blurb, ...l.stages.flatMap((s) => [s.id, s.blurb])]),
      ...ZONES.map((z) => z.name),
      ...CHAPTERS.flatMap((ch) => [ch.title, ch.demo?.label ?? '', ...ch.blocks.flatMap((b) => ('text' in b ? [b.text] : b.kind === 'list' ? b.items : []))]),
    ];
    expect(missing('regular', texts)).toEqual([]);
    expect(missing('bold', texts)).toEqual([]);
  });

  it('has a title-face glyph for every title, name and big number', () => {
    const titles = [...CHAMPIONS.map((c) => c.name), ...CHAPTERS.map((ch) => ch.title), ...LOCATIONS.map((l) => l.chapter), 'NEW CHAMPION', 'VICTORY', 'DEFEAT', 'BOSS', 'FIGHT!', 'PAUSED', 'UNDYING!', 'OVERDRIVE!', '0123456789+'];
    expect(missing('display', titles)).toEqual([]);
  });

  it('has micro digits that fit the status icon counters', () => {
    expect(missing('micro', ['0123456789'])).toEqual([]);
    // a badge (digit + 1 px border) must fit the lower corner of a 12 px status icon
    expect(font.faces.micro.cellH + 2).toBeLessThanOrEqual(7);
  });

  it('keeps the metrics the screens are laid out for', () => {
    for (const f of [font.faces.regular, font.faces.bold]) expect([f.cap, f.cellH]).toEqual([7, 9]);
    // a title occupies exactly the cell of bold text drawn at 2x
    expect(font.faces.display.cellH).toBe(2 * font.faces.bold.cellH);
  });
});

describe('weaver matrix art', () => {
  it('has the rose, the slot rings and a spool icon for every pattern and grade', () => {
    for (const p of ['matrix_rose', 'lobe_sel', 'lobe_attune']) expect(ui.parts[p], p).toBeTruthy();
    for (const id of PATTERN_IDS) for (const g of [0, 1, 2]) expect(ui.parts[`spool_${id}_${g}`], `spool_${id}_${g}`).toBeTruthy();
  });
});

describe('save', () => {
  it('opens stages in order and recruits on the first clear only', () => {
    const p = newArchivist();
    const stages = allStages();
    expect(frontier(p)).toBe(stages[0].id);
    expect(stageOpen(p, stages[0].id)).toBe(true);
    expect(stageOpen(p, stages[1].id)).toBe(false);
    const recruit = recordClear(p, stages[0].id, 2);
    expect(recruit).toBe(stages[0].recruit);
    expect(isUnlocked(p, recruit!)).toBe(true);
    expect(isFresh(p, recruit!)).toBe(true);
    expect(recordClear(p, stages[0].id, 3)).toBeUndefined();
    expect(p.stars[stages[0].id]).toBe(3);
    expect(recordClear(p, stages[0].id, 1)).toBeUndefined();
    expect(p.stars[stages[0].id]).toBe(3);
    expect(stageOpen(p, stages[1].id)).toBe(true);
    expect(frontier(p)).toBe(stages[1].id);
  });

  it('opens the first location at once and every other only after the stage it requires', () => {
    const p = newArchivist();
    expect(locationOpen(p, LOCATIONS[0])).toBe(true);
    for (const loc of LOCATIONS.slice(1)) {
      expect(loc.requires, loc.id).toBeTruthy();
      expect(locationOpen(p, loc), loc.id).toBe(false);
    }
    for (const s of allStages()) {
      recordClear(p, s.id, 1);
      for (const loc of LOCATIONS) if (loc.requires === s.id) expect(locationOpen(p, loc), loc.id).toBe(true);
    }
    expect(cleared(p, allStages()[0].id)).toBe(true);
    for (const s of allStages()) if (s.recruit) expect(recruitStage(s.recruit)?.id).toBe(s.id);
  });

  it('starts with a soul file and an empty Weaver Matrix for every starter', () => {
    const p = newArchivist();
    expect(p.reliquary.files().map((f) => f.champion)).toEqual(STARTERS);
    for (const f of p.reliquary.files()) {
      expect(f.fresh, f.champion).toBe(false);
      expect(f.matrix.slots).toHaveLength(6);
      expect(f.matrix.spools()).toEqual([]);
    }
  });

  it('carries only the settings and the Academy reading over from an older save', () => {
    const [first] = allStages();
    const old = (version: number) =>
      JSON.stringify({
        version,
        unlocked: ['knight', 'monk'],
        stars: { [first.id]: 3, '2-4': 2 },
        team: ['knight', 'monk'],
        fresh: ['monk'],
        read: [CHAPTERS[0].id],
        settings: { speed: 3, auto: true },
        reliquary: { files: [{ champion: 'knight', fresh: false, slots: [] }], stock: [] },
      });
    for (const version of [1, 2]) {
      const p = readSave(null, old(version));
      expect(p.reliquary.files().map((f) => f.champion), `v${version}`).toEqual(STARTERS);
      expect(p.stars).toEqual({});
      expect(p.team).toEqual(STARTERS);
      expect(p.read).toEqual([CHAPTERS[0].id]);
      expect(p.settings).toEqual({ speed: 3, auto: true });
    }
    // once a current save exists, an older one is never read again
    expect(readSave(writeSave(newArchivist()), old(2)).read).toEqual([]);
  });

  it('gives every cleared stage its champion, also when the stage changed what it brings', () => {
    const [first] = allStages();
    const text = JSON.stringify({ version: 3, stars: { [first.id]: 2 }, team: [...STARTERS, first.recruit], read: [], settings: { speed: 1, auto: false }, reliquary: {} });
    const p = readSave(text);
    expect(isUnlocked(p, first.recruit!)).toBe(true);
    expect(p.team).toEqual([...STARTERS, first.recruit]);
  });

  it('starts the team over from the starters when the saved team is gone (the stand-in champions renamed)', () => {
    const text = JSON.stringify({ version: 3, stars: {}, team: ['azure_warrior', 'sanguine_support'], read: [], settings: { speed: 1, auto: false }, reliquary: {} });
    const p = readSave(text);
    expect(p.team).toEqual([...STARTERS]);
    expect(isUnlocked(p, STARTERS[0])).toBe(true);
  });

  it('keeps everything through a save and a load, spools included', () => {
    const p = newArchivist();
    recordClear(p, allStages()[0].id, 2);
    p.read.push(CHAPTERS[0].id);
    p.settings = { speed: 2, auto: true };
    const spool = threadSpool('pattern_needle', 2, 'crit', [['spd', 1], ['atkPct', 3], ['hpPct', 2]]);
    p.reliquary.addSpool(spool);
    p.reliquary.addSpool(threadSpool('pattern_vigor', 0, 'hp', [['defPct', 1]]));
    p.reliquary.equip(STARTERS[0], 3, spool);
    const text = writeSave(p);
    const q = readSave(text);
    expect(writeSave(q)).toBe(text);
    expect(q.reliquary.file(STARTERS[0]).matrix.slots[3].spool).toEqual(spool);
    expect(q.reliquary.spools()).toHaveLength(1);
  });

  it('drops spools of the placeholder patterns the core Weave Patterns replaced', () => {
    const p = newArchivist();
    p.reliquary.addSpool(threadSpool('pattern_ward', 1, 'def', [['hpPct', 1], ['crit', 2]]));
    const save = JSON.parse(writeSave(p)) as { reliquary: { stock: { pattern: string }[] } };
    save.reliquary.stock.push({ ...save.reliquary.stock[0], pattern: 'lifethread' });
    const q = readSave(JSON.stringify(save));
    expect(q.reliquary.spools().map((s) => s.pattern)).toEqual(['pattern_ward']);
  });

  it('starts a new game from another version or unreadable text', () => {
    const fresh = writeSave(newArchivist());
    const saves: [string | null, string | null][] = [
      [JSON.stringify({ version: 4 }), null],
      [JSON.stringify({ version: 2, stars: { '1-1': 3 } }), null],
      ['{oops', null],
      [JSON.stringify({ version: 3, team: 5 }), null],
      [null, JSON.stringify({ version: 1, unlocked: 7 })],
      [null, JSON.stringify({ version: 7 })],
      [null, '{oops'],
      [null, null],
    ];
    for (const [raw, rawV1] of saves) expect(writeSave(readSave(raw, rawV1)), `${raw} ${rawV1}`).toBe(fresh);
  });
});
