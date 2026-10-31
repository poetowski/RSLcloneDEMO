// Content guardrails: every champion, stage, zone, status and codex page must
// agree with each other and with the generated assets in public/assets.
// These are the checks the new-champion and new-combat-background skills
// rely on; a failure here names exactly what is missing.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { allStages, LOCATIONS, recruitStage, STARTERS, WORLD_MAP } from '../src/game/data/campaign';
import { ALL_CHAMPIONS, champion, CHAMPIONS, ENEMIES } from '../src/game/data/champions';
import { CHAPTERS } from '../src/game/data/codex';
import { AFFINITIES, FACTIONS, RARITIES, ROLES } from '../src/game/data/meta';
import { auditChampion, totalMult } from '../src/game/data/norms';
import { STATUSES } from '../src/game/data/statuses';
import { ChampionDef, StatusId } from '../src/game/data/types';
import { ZONES } from '../src/game/data/zones';
import { cleared, frontier, isFresh, isUnlocked, locationOpen, newArchivist, readSave, recordClear, recordVictory, spoolsHeld, stageOpen, stockSample, tutorialDue, writeSave } from '../src/game/archivist';
import { claimQuest, currentQuest, questState, readyCount } from '../src/game/challenges';
import { CHALLENGE_TABS, JOURNEY } from '../src/game/data/challenges';
import { PATTERN_IDS, SPOOL_STATS } from '../src/game/data/matrix';
import { SUMMON_LESSON_PATH, TUTORIAL, TUTORIAL_PATH, TUTORIAL_SKIP } from '../src/game/data/tutorial';
import { FRAGMENT_DROPS, FRAGMENTS_PER_SHARD, SUMMON_ODDS, SUMMONING } from '../src/game/data/summoning';
import { fragmentDrop } from '../src/game/reliquary/drops';
import { threadSpool } from '../src/game/reliquary/matrix';
import { canMerge, drawSummon, joinsBy, mergeShard, rarityOdds, summon, summonChances, summonLessonDue, summonPool, summonsReady, wishChance, wished } from '../src/game/summoning';
import { roseMark } from '../src/game/ui/spools';

const json = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8'));
const fx = json('public/assets/fx/fx.json').anims as Record<string, unknown>;
const ui = json('public/assets/ui/ui.json') as { icons: Record<string, unknown>; status: Record<string, unknown>; portraits: Record<string, unknown>; parts: Record<string, unknown> };

describe('champions', () => {
  it('have unique ids and valid categories', () => {
    expect(new Set(ALL_CHAMPIONS.map((c) => c.id)).size).toBe(ALL_CHAMPIONS.length);
    for (const c of ALL_CHAMPIONS) {
      expect(RARITIES[c.rarity], c.id).toBeTruthy();
      expect(AFFINITIES[c.affinity], c.id).toBeTruthy();
      expect(FACTIONS[c.faction], c.id).toBeTruthy();
      expect(ROLES[c.role], c.id).toBeTruthy();
    }
  });

  it('respect the balance norms (src/game/data/norms.ts)', () => {
    for (const c of ALL_CHAMPIONS) expect(auditChampion(c), c.id).toEqual([]);
  });

  it('have generated art: atlas, portrait and one icon per skill', () => {
    for (const c of ALL_CHAMPIONS) {
      expect(fs.existsSync(`public/assets/champions/${c.id}.png`), `${c.id} atlas`).toBe(true);
      expect(ui.portraits[c.id], `${c.id} portrait`).toBeTruthy();
      for (const s of c.skills) expect(ui.icons[s.id], `${s.id} icon`).toBeTruthy();
    }
  });

  it('have every animation their skills use, with one hit frame per hit', () => {
    for (const c of ALL_CHAMPIONS) {
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
    for (const c of ALL_CHAMPIONS) {
      for (const s of c.skills) {
        for (const f of [...s.hits.map((h) => h.fx), s.projectile, s.castFx, s.actorFx, s.allyFx]) if (f) expect(fx[f], `${s.id} -> fx ${f}`).toBeTruthy();
        if (s.projectile) expect(c.muzzle, `${c.id} fires projectiles, needs a muzzle`).toBeTruthy();
      }
      for (const f of [c.passive?.fx, c.passive?.holderFx]) if (f) expect(fx[f], `${c.passive?.id} -> fx ${f}`).toBeTruthy();
      // a passive that acts in the flow of the fight shows on whom it reaches
      if (c.passive && ['tend', 'ward', 'retaliate', 'remedy', 'purge', 'brace'].includes(c.passive.kind)) expect(c.passive.fx, `${c.passive.id} needs an fx`).toBeTruthy();
    }
  });

  // Jakub, 2026-10-25: "all champions are being spawned like in rsl from a special currency ... rime scholar is guaranteed champion drop from stage 1-1. this is only exception."
  it('are all obtainable: Gareth from the start, the Rime Scholar from 1-1, every other champion summoned', () => {
    expect(allStages().filter((s) => s.recruit).map((s) => [s.id, s.recruit])).toEqual([['1-1', 'rime_scholar']]);
    const pool = summonPool(newArchivist()).map((c) => c.id);
    for (const c of CHAMPIONS) {
      if (STARTERS.includes(c.id) || c.id === 'rime_scholar') expect(pool, c.id).not.toContain(c.id);
      else expect(pool, `${c.id} cannot be summoned`).toContain(c.id);
    }
  });

  it('keeps the enemies only out of the roster and the summons, and puts each in a stage', () => {
    const pool = summonPool(newArchivist()).map((c) => c.id);
    const fought = new Set(allStages().flatMap((s) => s.enemies.map((e) => e.champion)));
    for (const c of ENEMIES) {
      expect(CHAMPIONS.some((x) => x.id === c.id), `${c.id} in the roster`).toBe(false);
      expect(pool, `${c.id} summoned`).not.toContain(c.id);
      expect(allStages().some((s) => s.recruit === c.id), `${c.id} recruited`).toBe(false);
      expect(fought.has(c.id), `${c.id} fights in no stage`).toBe(true);
    }
    expect(ALL_CHAMPIONS.length).toBe(CHAMPIONS.length + ENEMIES.length);
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
    const ids = new Set(ALL_CHAMPIONS.map((c) => c.id));
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

  // Jakub, 2026-10-24: "Each campaign area has exactly 2 sets which can drop from every stage of that specific area."
  it('gives every area with stages exactly two Weave Patterns to drop, and drops every pattern somewhere', () => {
    for (const loc of LOCATIONS) {
      if (!loc.stages.length) continue;
      expect(loc.patterns, `${loc.id} patterns`).toBeTruthy();
      const [a, b] = loc.patterns!;
      expect(loc.patterns, loc.id).toHaveLength(2);
      expect(a, `${loc.id} holds one pattern twice`).not.toBe(b);
      for (const p of loc.patterns!) expect(PATTERN_IDS, `${loc.id} pattern ${p}`).toContain(p);
    }
    for (const p of PATTERN_IDS) expect(LOCATIONS.some((l) => l.patterns?.includes(p)), `${p} drops nowhere`).toBe(true);
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
    for (const c of ALL_CHAMPIONS) expect('title' in c, `${c.id} has a subtitle`).toBe(false);
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

  it("has the Skeleton of his brief: the Ashveil Reign's first champion, a Common, Damage, Tide; an A1 on one enemy and +20 RES, always on", () => {
    const s = CHAMPIONS.find((c) => c.id === 'skeleton');
    expect(s && [s.name, s.rarity, s.role, s.faction, s.affinity]).toEqual(['Skeleton', 'common', 'Damage', 'ashveil_reign', 'tide']);
    expect(s?.skills).toHaveLength(1);
    const a1 = s?.skills[0];
    expect(a1 && [a1.slot, a1.target, a1.statuses ?? []]).toEqual([1, 'enemy', []]);
    expect(a1?.hits.some((h) => h.mult > 0)).toBe(true);
    expect(s?.passive && [s.passive.kind, s.passive.stat, s.passive.value]).toEqual(['stat', 'res', 20]);
    // his RES outside battle is his own: the passive is extra (Jakub, 2026-10-12)
    expect(s?.stats.res).toBe(0);
  });

  it('has the Rot Hulk of his brief: a Common Tank of the Ashveil Reign, Ember; one skill, an A1 on one enemy with a 25% chance of Poison for 2 turns, nothing else', () => {
    const r = CHAMPIONS.find((c) => c.id === 'rot_hulk');
    expect(r && [r.name, r.rarity, r.role, r.faction, r.affinity]).toEqual(['Rot Hulk', 'common', 'Tank', 'ashveil_reign', 'ember']);
    expect(r?.skills).toHaveLength(1);
    const a1 = r?.skills[0];
    expect(a1 && [a1.slot, a1.target, a1.statuses]).toEqual([1, 'enemy', [{ status: 'poison', turns: 2, chance: 0.25, to: 'targets' }]]);
    expect(a1?.hits.some((h) => h.mult > 0)).toBe(true);
    expect(r?.passive).toBeUndefined();
  });

  it('has the Bellringer of his brief: a Common Support of the Ashveil Reign, Ember (Bloom in the brief, Ember on his word the same day); an A1 that shields one ally by 10% of his max HP for 1 turn and heals him by 10%; a passive of DEF Up for 2 turns the first time he drops below 50% HP', () => {
    const r = CHAMPIONS.find((c) => c.id === 'bellringer');
    expect(r && [r.name, r.rarity, r.role, r.faction, r.affinity]).toEqual(['Bellringer', 'common', 'Support', 'ashveil_reign', 'ember']);
    expect(r?.skills).toHaveLength(1);
    const a1 = r?.skills[0];
    expect(a1 && [a1.slot, a1.target, a1.statuses, a1.healSelf]).toEqual([1, 'ally', [{ status: 'shield', turns: 1, value: 0.1, to: 'targets' }], 0.1]);
    expect(a1?.hits.every((h) => h.mult === 0)).toBe(true);
    expect(r?.passive && [r.passive.kind, r.passive.value, r.passive.statuses]).toEqual(['overdrive', 0.5, [{ status: 'def_up', turns: 2 }]]);
  });

  it('has the Necromancer of his brief: an Elite Support of the Ashveil Reign, Bloom; an A1 with a 35% chance of Slow for 1 turn; an A2 of Poison for 2 turns and SPD Up on all allies for 2, cooldown 4; an A3 that raises one fallen ally at random, cooldown 6', () => {
    const n = CHAMPIONS.find((c) => c.id === 'necromancer');
    expect(n && [n.name, n.rarity, n.role, n.faction, n.affinity]).toEqual(['Necromancer', 'elite', 'Support', 'ashveil_reign', 'bloom']);
    const [a1, a2, a3] = n?.skills ?? [];
    expect(a1 && [a1.slot, a1.target, a1.statuses]).toEqual([1, 'enemy', [{ status: 'spd_down', turns: 1, chance: 0.35, to: 'targets' }]]);
    expect(a2 && [a2.slot, a2.target, a2.cooldown, a2.statuses]).toEqual([2, 'enemy', 4, [{ status: 'poison', turns: 2, to: 'targets' }, { status: 'spd_up', turns: 2, to: 'allies' }]]);
    expect(a1 && a2 && totalMult(a1) > 0 && totalMult(a2) > 0).toBe(true);
    expect(a3 && [a3.slot, a3.target, a3.cooldown, totalMult(a3), a3.revive! > 0]).toEqual([3, 'fallen', 6, 0, true]);
    expect(n?.passive).toBeUndefined();
  });

  it('has the Automated Soul of his brief: an Elite of the Ashveil Reign, Damage, Tide; an A1 on one enemy; an A2 on all enemies with DEF Down for 2 turns, cooldown 4; an A3 on one enemy that first places ATK Up on him for 2 turns, then Stun on it for 1 turn, cooldown 4; every skill looses arrows', () => {
    const a = CHAMPIONS.find((c) => c.id === 'automated_soul');
    expect(a && [a.name, a.rarity, a.role, a.faction, a.affinity]).toEqual(['Automated Soul', 'elite', 'Damage', 'ashveil_reign', 'tide']);
    const [a1, a2, a3] = a?.skills ?? [];
    expect(a1 && [a1.slot, a1.target, a1.statuses, totalMult(a1) > 0]).toEqual([1, 'enemy', undefined, true]);
    expect(a2 && [a2.slot, a2.target, a2.cooldown, a2.statuses, totalMult(a2) > 0]).toEqual([2, 'enemies', 4, [{ status: 'def_down', turns: 2, to: 'targets' }], true]);
    expect(a3 && [a3.slot, a3.target, a3.cooldown, a3.statuses, totalMult(a3) > 0]).toEqual([3, 'enemy', 4, [{ status: 'atk_up', turns: 2, to: 'self', before: true }, { status: 'stun', turns: 1, to: 'targets' }], true]);
    expect(a?.skills.every((s) => s.projectile)).toBe(true);
    expect(a?.passive).toBeUndefined();
  });

  it('has Irving Wellbington of his brief: an Elite Tank of the Ashveil Reign, Bloom; an A1 with a 35% chance of Slow for 1 turn; an A2 that places DEF Up for 2 turns and Counterattack for 1 on himself, cooldown 4; a passive that answers a critical hit on him with Taunt for 1 turn and a heal of 20% of his max HP', () => {
    const w = CHAMPIONS.find((c) => c.id === 'irving_wellbington');
    expect(w && [w.name, w.rarity, w.role, w.faction, w.affinity]).toEqual(['Irving Wellbington', 'elite', 'Tank', 'ashveil_reign', 'bloom']);
    expect(w?.skills).toHaveLength(2);
    const [a1, a2] = w?.skills ?? [];
    expect(a1 && [a1.slot, a1.target, a1.statuses, totalMult(a1) > 0]).toEqual([1, 'enemy', [{ status: 'spd_down', turns: 1, chance: 0.35, to: 'targets' }], true]);
    expect(a2 && [a2.slot, a2.target, a2.cooldown, a2.statuses, totalMult(a2) > 0]).toEqual([2, 'enemy', 4, [{ status: 'def_up', turns: 2, to: 'self' }, { status: 'counter', turns: 1, to: 'self' }], true]);
    expect(w?.passive && [w.passive.kind, w.passive.value, w.passive.statuses]).toEqual(['defy', 0.2, [{ status: 'taunt', turns: 1 }]]);
  });

  it('has Chief Engineer CJ of his brief: a Heroic Tank of the Sanguine Dominion, Bloom; an A1 of two hits, a 25% chance of Stun on each (50% in the brief) and 10% of the Turn Meter; an A2 of DEF Up for 2 turns and Regen for 1 on all allies and 7% of every enemy\'s Turn Meter, cooldown 4; an A3 on all enemies, a 35% chance of Stun for 1 turn on each (2 in the brief) and a Shield of 15% of his max HP for 2 turns on the ally with the lowest max HP, cooldown 4; a passive lifting one random debuff from every ally at the start of his turn', () => {
    const c = CHAMPIONS.find((x) => x.id === 'chief_engineer_cj');
    expect(c && [c.name, c.rarity, c.role, c.faction, c.affinity]).toEqual(['Chief Engineer CJ', 'heroic', 'Tank', 'sanguine_dominion', 'bloom']);
    expect(c?.skills).toHaveLength(3);
    const [a1, a2, a3] = c?.skills ?? [];
    expect(a1 && [a1.slot, a1.target, a1.hits.length, a1.statuses, a1.tmTargets]).toEqual([1, 'enemy', 2, [{ status: 'stun', turns: 1, chance: 0.25, to: 'targets', perHit: true }], -10]);
    expect(a2 && [a2.slot, a2.target, a2.cooldown, totalMult(a2), a2.statuses, a2.tmTargets]).toEqual([2, 'enemies', 4, 0, [{ status: 'def_up', turns: 2, to: 'allies' }, { status: 'regen', turns: 1, to: 'allies' }], -7]);
    expect(a3 && [a3.slot, a3.target, a3.cooldown, a3.statuses, totalMult(a3) > 0]).toEqual([3, 'enemies', 4, [{ status: 'stun', turns: 1, chance: 0.35, to: 'targets' }, { status: 'shield', turns: 2, value: 0.15, to: 'lowestMaxHp' }], true]);
    expect(c?.passive?.kind).toBe('purge');
  });

  it('has the Forest Gargoyle of his brief: a Heroic Tank; an A1 with a 35% chance of Heal Block for 2 turns; an A2 on all enemies with ATK Down for 1 turn, cooldown 3; an A3 on one enemy with Slow for 2 turns that empties its Turn Meter, cooldown 4; a passive of DEF Up for 1 turn at the start of his turns', () => {
    const c = CHAMPIONS.find((x) => x.id === 'forest_gargoyle');
    expect(c && [c.name, c.rarity, c.role, c.affinity]).toEqual(['Forest Gargoyle', 'heroic', 'Tank', 'tide']);
    expect(c?.skills).toHaveLength(3);
    const [a1, a2, a3] = c?.skills ?? [];
    expect(a1 && [a1.slot, a1.target, a1.statuses, totalMult(a1) > 0]).toEqual([1, 'enemy', [{ status: 'heal_block', turns: 2, chance: 0.35, to: 'targets' }], true]);
    expect(a2 && [a2.slot, a2.target, a2.cooldown, a2.statuses, totalMult(a2) > 0]).toEqual([2, 'enemies', 3, [{ status: 'atk_down', turns: 1, to: 'targets' }], true]);
    expect(a3 && [a3.slot, a3.target, a3.cooldown, a3.statuses, a3.tmTargets, totalMult(a3) > 0]).toEqual([3, 'enemy', 4, [{ status: 'spd_down', turns: 2, to: 'targets' }], -100, true]);
    expect(c?.passive && [c.passive.kind, c.passive.statuses]).toEqual(['brace', [{ status: 'def_up', turns: 1 }]]);
  });

  it('has Dead Knight Amstron of his brief: a Heroic Tank of the Ashveil Reign, Ember; an A1 with Slow for 1 turn; an A2 with ATK Down and DEF Down for 2 turns and a 40% chance of Stun for 1 (50% in the brief), cooldown 3; an A3 of DEF Up for 2 turns, a heal of 15% of each ally\'s max HP and a Shield of 20% of his max HP for 2 turns on all allies, cooldown 4; a passive of immunity to DEF Down', () => {
    const c = CHAMPIONS.find((x) => x.id === 'dead_knight_amstron');
    expect(c && [c.name, c.rarity, c.role, c.faction, c.affinity]).toEqual(['Dead Knight Amstron', 'heroic', 'Tank', 'ashveil_reign', 'ember']);
    expect(c?.skills).toHaveLength(3);
    const [a1, a2, a3] = c?.skills ?? [];
    expect(a1 && [a1.slot, a1.target, a1.statuses, totalMult(a1) > 0]).toEqual([1, 'enemy', [{ status: 'spd_down', turns: 1, to: 'targets' }], true]);
    expect(a2 && [a2.slot, a2.target, a2.cooldown, a2.statuses, totalMult(a2) > 0]).toEqual([2, 'enemy', 3, [{ status: 'atk_down', turns: 2, to: 'targets' }, { status: 'def_down', turns: 2, to: 'targets' }, { status: 'stun', turns: 1, chance: 0.4, to: 'targets' }], true]);
    expect(a3 && [a3.slot, a3.target, a3.cooldown, a3.statuses, a3.healAllies, a3.healOf, totalMult(a3)]).toEqual([3, 'allies', 4, [{ status: 'def_up', turns: 2, to: 'allies' }, { status: 'shield', turns: 2, value: 0.2, to: 'allies' }], 0.15, undefined, 0]);
    expect(c?.passive && [c.passive.kind, c.passive.immuneTo]).toEqual(['immune', 'def_down']);
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

  it('names the areas as Jakub did, the Snowy Mesa the easternmost with ten placeholder stages after 4-10', () => {
    expect(LOCATIONS.map((l) => [l.chapter, l.name, l.zone])).toEqual([
      ['I', 'Fracture Reach', 'zone1'],
      ['II', 'Verdant Grove', 'zone2'],
      ['III', 'Moonlit Basin', 'zone3'],
      ['IV', 'Earth Scars', 'zone4'],
      ['V', 'Snowy Mesa', 'zone5'],
    ]);
    const scars = LOCATIONS[3];
    expect([scars.requires, scars.stages.map((s) => s.id)]).toEqual(['3-10', ['4-1', '4-2', '4-3', '4-4', '4-5', '4-6', '4-7', '4-8', '4-9', '4-10']]);
    const mesa = LOCATIONS[4];
    expect([mesa.requires, mesa.stages.map((s) => s.id)]).toEqual(['4-10', ['5-1', '5-2', '5-3', '5-4', '5-5', '5-6', '5-7', '5-8', '5-9', '5-10']]);
    // none of its stages brings a champion: since summoning (2026-10-25) the Paladin is summoned like the rest
    expect(mesa.stages.filter((s) => s.recruit)).toEqual([]);
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
        // an animal that roams has its walk cycle and its grazing, and walks calmly
        if (k.roam) {
          expect(k.frames, `${z.id} ${p.kind} walk and graze frames`).toBeGreaterThan(k.roam.walk);
          expect(k.roam.speed > 0 && k.roam.speed <= 12 && k.roam.pause >= 2000, `${z.id} ${p.kind} roams calmly`).toBe(true);
        }
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
    const skills = new Set(ALL_CHAMPIONS.flatMap((c) => c.skills.map((s) => s.id)));
    for (const ch of CHAPTERS) if (ch.demo) expect(skills.has(ch.demo.skill), `${ch.id} demo ${ch.demo.skill}`).toBe(true);
  });

  it('quotes the turn-meter numbers of the skills it names ("Resonance: -15%")', () => {
    const text = CHAPTERS.flatMap((ch) => ch.blocks.flatMap((b) => ('text' in b ? [b.text] : b.kind === 'list' ? b.items : []))).join(' ');
    for (const s of ALL_CHAMPIONS.flatMap((c) => c.skills)) {
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
      // the Challenges and the tutorial (its {braces} are filled with names the rest of this list holds)
      ...CHALLENGE_TABS.flatMap((t) => [t.name, t.placeholder ?? '']),
      ...JOURNEY.flatMap((q) => [q.title, q.text]),
      ...Object.values(TUTORIAL).flatMap((t) => [t.title, t.text, t.act ?? '', t.next ?? ''].map((x) => x.replace(/\{\w+\}/g, ''))),
      ...Object.values(TUTORIAL_SKIP),
      "CHALLENGES Journey: 0 of 2 claimed Quest 1 of 2 REWARD TAKEN Silver Gilded Ashen spool Found: in Weaving now. Taken, into Weaving. Its main stat is drawn when you claim it.",
      'Done! Claim the reward. Opens once "Finish Tutorial" is claimed. The tutorial was skipped: play it to the end. The tutorial is not finished yet. No spool is woven into a matrix yet.',
      'CLAIM CLAIMED LOCKED START TUTORIAL REPLAY TUTORIAL OPEN WEAVING TO THE JOURNEY Claimed Ready to claim In progress Locked The Journey goes on. Claim a quest to open the next.',
      "Your quests wait on the Journey meanwhile. The Herald's Board 1 ready",
      // summoning: its names, the Wishing Star's screen, the ceremony, the results, the stage list, the Journey's Stardust
      ...Object.values(SUMMONING),
      'SUMMON The Wishing Star - 0 summoned STARDUST SOULSTARS MERGE 100 70 more for a Soulstar. 100 merge into a Soulstar. Each Soulstar summons one champion. Every victory in the campaign finds Stardust.',
      'YOUR WISH ANY Any faction Any role ODDS Your wish: 20% <1% 8% without wishing Wish for a faction, a role, or both. A wish is no promise, only a better chance.',
      'Wish for the Court of Root: each of its champions twice as likely. Wish for a Support: each one twice as likely. Every faction as likely as the others. Every role as likely as the others.',
      '1 Soulstar to spend. 2 Soulstars to spend. Merge 100 Stardust into a Soulstar first. No Soulstar yet: win battles for Stardust. Every champion is in your Reliquary. The star calls, and a soul answers...',
      'A champion you do not have yet answers. STILL SCATTERED 12 Common 10 Elite 1 Heroic None: every soul has been recollected. Chance on the next summon: 3%.',
      'Your wish came true! Summoned at the Wishing Star. +30 Stardust 20 Stardust a victory, 30 when nobody falls.',
      'Every 100 Stardust merge into a Soulstar at the Wishing Star, and a Soulstar summons a champion. Every victory finds Stardust. 100 of it merge into a Soulstar at the Wishing Star.',
      '100 Stardust Found: at the Wishing Star now. Taken, to the Wishing Star. Every 100 merge into a Soulstar. A Soulstar summons a champion you do not have yet.',
      'Stage 1-3 is not cleared yet. TO THE CAMPAIGN TO THE WISHING STAR Summon at the Wishing Star At the Wishing Star Comes when summoned at the Wishing Star.',
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

// Jakub, 2026-10-24: the main menu's own diorama, its places clicked instead of buttons, only the champions changing
describe('main menu sanctum', () => {
  const menu = json('public/assets/menu/menu.json') as {
    sprites: Record<string, { frames: number[][]; layer: string; mode: string; bob?: unknown }>;
    order: string[];
    hotspots: { id: string; sprites: string[]; outline: number[]; label: number[] }[];
    spots: { x: number; y: number }[];
    warp: unknown[];
    thread: unknown[];
    lights: unknown[];
  };

  it('has a place for every way on from the menu, each made of sprites that exist, with its outline and label', () => {
    expect(menu.hotspots.map((h) => h.id).sort()).toEqual(['academy', 'campaign', 'challenges', 'champions', 'options', 'summon', 'weaving']);
    for (const h of menu.hotspots) {
      expect(h.sprites.length, h.id).toBeGreaterThan(0);
      for (const s of h.sprites) expect(menu.sprites[s], `${h.id} -> ${s}`).toBeTruthy();
      expect(h.outline[2] * h.outline[3], `${h.id} outline`).toBeGreaterThan(0);
      expect(h.label[0] >= 0 && h.label[0] <= 640 && h.label[1] >= 0 && h.label[1] <= 360, `${h.id} label`).toBe(true);
    }
  });

  it('draws every sprite once, with its frames, and its motion on whole frames', () => {
    expect([...menu.order].sort()).toEqual(Object.keys(menu.sprites).sort());
    for (const [k, s] of Object.entries(menu.sprites)) {
      expect(s.frames.length, k).toBeGreaterThan(0);
      if (s.mode === 'loop') expect(s.frames.length, `${k} loops`).toBeGreaterThan(1);
      expect(['far', 'island', 'building', 'front'], k).toContain(s.layer);
    }
    expect(fs.existsSync('public/assets/menu/sky.png') && fs.existsSync('public/assets/menu/scene.png')).toBe(true);
  });

  it('has room for champions, and the paths its light runs along', () => {
    expect(menu.spots.length).toBeGreaterThanOrEqual(3);
    for (const s of menu.spots) expect(s.y, 'a champion stands on the island').toBeGreaterThan(240);
    expect(menu.warp.length).toBeGreaterThan(0);
    expect(menu.thread.length).toBeGreaterThan(1);
    expect(menu.lights.length).toBeGreaterThan(0);
  });
});

// Jakub, 2026-10-24: Challenges (Daily, Persistent, the Journey of quests unlocked one after another) and a tutorial for new accounts
describe('challenges and the tutorial', () => {
  const weave = (p: ReturnType<typeof newArchivist>) => {
    const s = threadSpool('pattern_ward', 0, 'atk', [['hpPct', 1]]);
    p.reliquary.addSpool(s);
    p.reliquary.equip(STARTERS[0], 0, s);
  };

  it("has the Journey's knots, the tutorial's hand and the Herald's Board", () => {
    for (const k of ['open', 'ready', 'done', 'locked']) expect(ui.parts['quest_' + k], 'quest_' + k).toBeTruthy();
    expect(ui.parts.tut_hand).toBeTruthy();
    for (const q of JOURNEY) {
      const r = q.reward;
      if (r.kind === 'spool') expect(ui.parts[`spool_${r.pattern}_${r.grade}`] && ui.parts[`bigspool_${r.pattern}_${r.grade}`], q.id).toBeTruthy();
      else expect(ui.parts.stardust && ui.parts.bigstardust, q.id).toBeTruthy();
    }
    expect(CHALLENGE_TABS.map((t) => t.id)).toEqual(['daily', 'persistent', 'journey']);
    expect(JOURNEY[0].title).toBe('Finish Tutorial');
    // Jakub, 2026-10-25: "new journey quest: beat campaign 1-3. reward can be 100 summoning fragments", then
    // "swap quests: weave a spool make sooner and after that make beat campaign 1-3 ... swap also rewards"
    expect(JOURNEY.map((q) => q.title)).toEqual(['Finish Tutorial', 'Weave a Spool', 'Beat Campaign 1-3']);
    expect([JOURNEY[1].goal, JOURNEY[1].reward]).toEqual([{ kind: 'weave' }, { kind: 'fragments', amount: 100 }]);
    expect([JOURNEY[2].goal, JOURNEY[2].reward.kind]).toEqual([{ kind: 'stage', stage: '1-3' }, 'spool']);
  });

  it('opens the Journey one quest at a time, and a claim gives its spool or its Stardust once', () => {
    const p = newArchivist();
    const [first, second, third] = JOURNEY;
    expect([questState(p, first), questState(p, second), questState(p, third)]).toEqual(['open', 'locked', 'locked']);
    // a goal met before its quest opens waits for it
    weave(p);
    expect(questState(p, second)).toBe('locked');
    expect(claimQuest(p, first.id)).toBeNull();
    p.tutorial = 'done';
    expect(questState(p, first)).toBe('ready');
    expect(readyCount(p)).toBe(1);
    expect(claimQuest(p, second.id)).toBeNull();
    const before = p.reliquary.spools().length;
    const find = claimQuest(p, first.id)!;
    expect(find.kind === 'spool' && first.reward.kind === 'spool' && [find.spool.pattern, find.spool.grade]).toEqual([first.reward.kind === 'spool' && first.reward.pattern, first.reward.kind === 'spool' && first.reward.grade]);
    expect(p.reliquary.spools()).toHaveLength(before + 1);
    expect(p.reliquary.freshCount()).toBe(1);
    expect(claimQuest(p, first.id)).toBeNull();
    // Weave a Spool, its goal met before it opened, is ready the moment it opens; its Stardust is a summon
    expect([questState(p, first), questState(p, second)]).toEqual(['claimed', 'ready']);
    expect(currentQuest(p)).toBe(second);
    const dust = p.fragments;
    expect(claimQuest(p, second.id)).toEqual({ kind: 'fragments', amount: 100 });
    expect(p.fragments).toBe(dust + 100);
    // Beat Campaign 1-3 waits for its stage, then gives its spool
    expect(questState(p, third)).toBe('open');
    for (const s of allStages().slice(0, 3)) recordClear(p, s.id, 2);
    expect(questState(p, third)).toBe('ready');
    expect(claimQuest(p, third.id)?.kind).toBe('spool');
    expect(p.claimed).toEqual(JOURNEY.slice(0, 3).map((q) => q.id));
    expect(readyCount(p)).toBe(0);
  });

  it('keeps the tutorial and the claims through a save; an older save reads them as never done, and claims stay in order', () => {
    const p = newArchivist();
    p.tutorial = 'done';
    claimQuest(p, JOURNEY[0].id);
    const q = readSave(writeSave(p));
    expect([q.tutorial, q.claimed]).toEqual(['done', [JOURNEY[0].id]]);
    const save = JSON.parse(writeSave(newArchivist())) as Record<string, unknown>;
    delete save.tutorial;
    delete save.claimed;
    const old = readSave(JSON.stringify(save));
    expect([old.tutorial, old.claimed]).toEqual(['todo', []]);
    // a quest no longer in the Journey, or claimed past one that is not, drops out
    const odd = readSave(JSON.stringify({ ...save, tutorial: 'skipped', claimed: ['gone', JOURNEY[1].id] }));
    expect([odd.tutorial, odd.claimed]).toEqual(['skipped', []]);
    expect(readSave(JSON.stringify({ ...save, tutorial: 'maybe' })).tutorial).toBe('todo');
  });

  it('starts the tutorial on its own for a new account only', () => {
    const p = newArchivist();
    expect(tutorialDue(p)).toBe(true);
    recordClear(p, allStages()[0].id, 1);
    expect(tutorialDue(p)).toBe(false);
    for (const t of ['skipped', 'done'] as const) {
      const q = newArchivist();
      q.tutorial = t;
      expect(tutorialDue(q), t).toBe(false);
    }
  });

  it('has words for every step, each leading on by a click or a button', () => {
    for (const [id, t] of Object.entries(TUTORIAL)) {
      expect(t.title && t.text, id).toBeTruthy();
      expect(!!t.act !== !!t.next, `${id}: a click or a button`).toBe(true);
    }
    for (const id of [...TUTORIAL_PATH, ...SUMMON_LESSON_PATH]) expect(TUTORIAL[id], id).toBeTruthy();
  });
});

// Jakub, 2026-10-25: champions are summoned with fragments from the campaign, 100 to a shard, a shard a summon,
// 70% Common, 25% Elite, 5% Heroic, a wish of a faction and a role "just a better chance"
describe('summoning', () => {
  /** a seeded random, the same every run */
  const seeded = (seed: number) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  it('keeps his numbers: 100 fragments to a shard, 70 / 25 / 5% by rarity', () => {
    expect(FRAGMENTS_PER_SHARD).toBe(100);
    expect(SUMMON_ODDS).toEqual({ common: 0.7, elite: 0.25, heroic: 0.05, mythic: 0 });
    expect(Object.values(rarityOdds(summonPool(newArchivist()))).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  });

  it('has its parts: Stardust, the Soulstar, the SUMMON glyph and the Wishing Star in the Sanctum', () => {
    for (const p of ['stardust', 'bigstardust', 'soulstar', 'bigsoulstar', 'mi_summon']) expect(ui.parts[p], p).toBeTruthy();
    const menu = json('public/assets/menu/menu.json') as { sprites: Record<string, unknown>; wish: number[]; hotspots: { id: string; sprites: string[] }[] };
    expect(menu.sprites.wish && menu.sprites.wish_glow).toBeTruthy();
    expect(menu.hotspots.find((h) => h.id === 'summon')?.sprites).toEqual(['wish']);
    expect(menu.wish).toHaveLength(2);
  });

  it('finds Stardust in every victory, more in later areas and when nobody falls; a recorded clear finds none', () => {
    let last = 0;
    for (const loc of LOCATIONS) {
      const s = loc.stages[0].id;
      expect(fragmentDrop(s, 1), loc.id).toBeGreaterThan(last);
      expect(fragmentDrop(s, 3), loc.id).toBe(fragmentDrop(s, 1) + FRAGMENT_DROPS.flawless);
      last = fragmentDrop(s, 1);
    }
    const p = newArchivist();
    const won = recordVictory(p, '1-1', 3, seeded(1));
    expect(won.fragments).toBe(fragmentDrop('1-1', 3));
    expect(p.fragments).toBe(won.fragments);
    recordClear(p, '1-2', 3);
    expect(p.fragments).toBe(won.fragments);
    // the first battle alone stays short of a summon: the third champion comes with the Journey's Stardust (his design)
    expect(fragmentDrop('1-1', 3)).toBeLessThan(FRAGMENTS_PER_SHARD);
    expect(JOURNEY.flatMap((q) => (q.reward.kind === 'fragments' ? [q.reward.amount] : []))).toEqual([FRAGMENTS_PER_SHARD]);
  });

  it('merges 100 Stardust into a Soulstar, and spends a Soulstar on a champion not yet owned', () => {
    const p = newArchivist();
    recordClear(p, '1-1', 3);
    expect([canMerge(p), mergeShard(p), summon(p)]).toEqual([false, false, null]);
    p.fragments = 230;
    expect(summonsReady(p)).toBe(2);
    expect(mergeShard(p)).toBe(true);
    expect([p.fragments, p.shards]).toEqual([130, 1]);
    const owned = new Set(p.reliquary.files().map((f) => f.champion));
    const s = summon(p, seeded(7))!;
    expect(owned.has(s.champion)).toBe(false);
    expect([STARTERS[0], 'rime_scholar']).not.toContain(s.champion);
    expect(isUnlocked(p, s.champion) && isFresh(p, s.champion)).toBe(true);
    expect([p.shards, p.summons, s.wished]).toEqual([0, 1, false]);
    expect(summon(p)).toBeNull();
  });

  it('never brings a champion twice, and gives a found-out rarity\'s share to the others', () => {
    const p = newArchivist();
    p.shards = 999;
    const seen = new Set<string>();
    const rng = seeded(3);
    let s;
    while ((s = summon(p, rng))) {
      expect(seen.has(s.champion), s.champion).toBe(false);
      seen.add(s.champion);
    }
    expect(seen.size).toBe(CHAMPIONS.length - 2);
    expect(summonPool(p)).toEqual([]);
    expect(summonsReady(p)).toBe(0);
    // with every Heroic found, the 5% goes to Common and Elite in proportion
    const q = newArchivist();
    q.reliquary.recruit('paladin');
    q.reliquary.recruit('chief_engineer_cj');
    q.reliquary.recruit('forest_gargoyle');
    q.reliquary.recruit('dead_knight_amstron');
    const odds = rarityOdds(summonPool(q));
    expect(odds.heroic).toBe(0);
    expect(odds.common).toBeCloseTo(0.7 / 0.95, 9);
    expect(odds.elite).toBeCloseTo(0.25 / 0.95, 9);
  });

  it('draws the rarities at his odds', () => {
    const pool = summonPool(newArchivist());
    const rng = seeded(11);
    const n = 20000;
    const got: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      const c = drawSummon(pool, {}, rng)!;
      got[c.rarity] = (got[c.rarity] ?? 0) + 1;
    }
    expect(got.common / n).toBeCloseTo(0.7, 1);
    expect(got.elite / n).toBeCloseTo(0.25, 1);
    expect(Math.abs(got.heroic / n - 0.05)).toBeLessThan(0.01);
  });

  it('makes what a wish names likelier but never certain, and leaves the rarity odds alone', () => {
    const pool = summonPool(newArchivist());
    const wish = { faction: 'court_of_root', role: 'Support' } as const;
    const plain = new Map(summonChances(pool, {}).map((e) => [e.c.id, e.p]));
    const chances = summonChances(pool, wish);
    expect(chances.reduce((s, e) => s + e.p, 0)).toBeCloseTo(1, 9);
    const byRarity = (list: typeof chances, r: string) => list.filter((e) => e.c.rarity === r).reduce((s, e) => s + e.p, 0);
    for (const r of ['common', 'elite', 'heroic']) expect(byRarity(chances, r), r).toBeCloseTo(SUMMON_ODDS[r as 'common'], 9);
    // within a rarity, both named: four times as likely as one named in neither, one named: twice
    const commons = chances.filter((e) => e.c.rarity === 'common');
    const p = (id: string) => commons.find((e) => e.c.id === id)!.p;
    expect(p('wild_speaker') / p('enforcer')).toBeCloseTo(4, 9);
    expect(p('follower') / p('enforcer')).toBeCloseTo(2, 9);
    expect(p('quartermaster') / p('enforcer')).toBeCloseTo(2, 9);
    expect(wished(champion('wild_speaker'), wish) && !wished(champion('follower'), wish)).toBe(true);
    const chance = wishChance(pool, wish);
    expect(chance).toBeGreaterThan(wishChance(pool, wish, false));
    expect(chance).toBeLessThan(1);
    expect(plain.get('wild_speaker')).toBeCloseTo(0.7 / 16, 9);
    expect(wishChance(pool, {})).toBe(0);
  });

  it('keeps the Stardust, the Soulstars, the wish, the summons and the lessons through a save; an older save holds none', () => {
    const p = newArchivist();
    Object.assign(p, { fragments: 42, shards: 2, wish: { faction: 'ashveil_reign', role: 'Tank' }, summons: 3, lessons: ['summon'] });
    const q = readSave(writeSave(p));
    expect([q.fragments, q.shards, q.wish, q.summons, q.lessons]).toEqual([42, 2, { faction: 'ashveil_reign', role: 'Tank' }, 3, ['summon']]);
    const save = JSON.parse(writeSave(newArchivist())) as Record<string, unknown>;
    for (const k of ['fragments', 'shards', 'wish', 'summons', 'lessons']) delete save[k];
    const old = readSave(JSON.stringify(save));
    expect([old.fragments, old.shards, old.wish, old.summons, old.lessons]).toEqual([0, 0, {}, 0, []]);
    // nonsense is cleaned: counts never negative or broken, a wish only of what exists
    const odd = readSave(JSON.stringify({ ...save, fragments: -5, shards: 'x', wish: { faction: 'nowhere', role: 'Bard' } }));
    expect([odd.fragments, odd.shards, odd.wish]).toEqual([0, 0, {}]);
  });

  it('is taught in the Academy with the numbers it uses', () => {
    const blocks = CHAPTERS.flatMap((ch) => ch.blocks);
    const text = blocks.flatMap((b) => ('text' in b ? [b.text] : b.kind === 'list' ? b.items : [])).join(' ');
    const odds = (['common', 'elite', 'heroic'] as const).map((r) => `${RARITIES[r].name}: ${Math.round(SUMMON_ODDS[r] * 100)}%.`);
    expect(blocks.some((b) => b.kind === 'list' && JSON.stringify(b.items) === JSON.stringify(odds)), odds.join(' ')).toBe(true);
    expect(text).toContain(`${FRAGMENTS_PER_SHARD} ${SUMMONING.fragment} merge into a ${SUMMONING.shard}`);
    // the drops step evenly from area to area, as the Academy says
    const [first, second] = FRAGMENT_DROPS.byArea;
    FRAGMENT_DROPS.byArea.forEach((v, i) => expect(v, `area ${i + 1}`).toBe(first + i * (second - first)));
    expect(text).toContain(`${first} in the Fracture Reach and ${second - first} more in each area beyond it, ${FRAGMENT_DROPS.flawless} more when nobody falls`);
  });

  it('tells how each champion comes, and when the lesson on summoning is due', () => {
    expect(joinsBy(STARTERS[0])).toEqual({ kind: 'start' });
    expect(joinsBy('rime_scholar')).toEqual({ kind: 'stage', stage: '1-1' });
    expect(joinsBy('paladin')).toEqual({ kind: 'summon' });
    const p = newArchivist();
    expect(summonLessonDue(p)).toBe(false);
    p.fragments = 100;
    expect(summonLessonDue(p)).toBe(true);
    p.lessons = ['summon'];
    expect(summonLessonDue(p)).toBe(false);
    p.lessons = [];
    p.tutorial = 'skipped';
    expect(summonLessonDue(p)).toBe(false);
  });
});

describe('weaver matrix art', () => {
  it('has the rose, the slot rings and a spool icon for every pattern and grade', () => {
    for (const p of ['matrix_rose', 'lobe_sel', 'lobe_attune']) expect(ui.parts[p], p).toBeTruthy();
    for (const id of PATTERN_IDS) for (const g of [0, 1, 2]) expect(ui.parts[`spool_${id}_${g}`], `spool_${id}_${g}`).toBeTruthy();
  });

  it('has what Weaving draws: a large spool for every pattern and grade, the grade frames, a small rose for every slot mark, its glyph', () => {
    for (const id of PATTERN_IDS) for (const g of [0, 1, 2]) expect(ui.parts[`bigspool_${id}_${g}`], `bigspool_${id}_${g}`).toBeTruthy();
    for (const p of ['card_ashen', 'card_silver', 'card_gilded', 'mi_weaving']) expect(ui.parts[p], p).toBeTruthy();
    // every spool's mark (the slots it fits) has its rose
    for (const stat of SPOOL_STATS) {
      const mark = roseMark(threadSpool(PATTERN_IDS[0], 0, stat, [[stat === 'crit' ? 'spd' : 'crit', 1]]));
      expect(ui.parts[mark], `${stat}: ${mark}`).toBeTruthy();
    }
    for (let i = 0; i < 6; i++) expect(ui.parts['rose_' + i], `rose_${i}`).toBeTruthy();
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

  it('records a victory: its stars, its recruit, and the spools it finds as new finds, kept through a save', () => {
    const p = newArchivist();
    const [first] = allStages();
    let k = 0;
    const rng = () => ((k = (k * 9301 + 49297) % 233280) / 233280);
    const won = recordVictory(p, first.id, 3, rng);
    expect(won.recruited).toBe(first.recruit);
    expect(p.stars[first.id]).toBe(3);
    expect(won.spools).toHaveLength(2); // flawless: a second spool
    expect(p.reliquary.freshCount()).toBe(2);
    expect(spoolsHeld(p)).toBe(2);
    const q = readSave(writeSave(p));
    expect(q.reliquary.freshCount()).toBe(2);
    expect(q.reliquary.spools()).toEqual(won.spools);
    // a replay finds more, and recruits nobody again
    const again = recordVictory(p, first.id, 1, rng);
    expect(again.recruited).toBeUndefined();
    expect(again.spools).toHaveLength(1);
    expect(spoolsHeld(p)).toBe(3);
  });

  it('adds the sample stock (?spools=1) once, however often it is asked for', () => {
    const p = newArchivist();
    stockSample(p);
    expect(spoolsHeld(p)).toBe(24);
    const s = p.reliquary.spools().find((x) => x.main.stat === 'atk')!;
    p.reliquary.equip(STARTERS[0], 0, s);
    stockSample(p);
    stockSample(p);
    expect(spoolsHeld(p)).toBe(24);
    expect(p.reliquary.freshCount()).toBe(0);
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
