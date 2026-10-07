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
import { StatusId } from '../src/game/data/types';
import { ZONES } from '../src/game/data/zones';
import { cleared, defaultProfile, frontier, isUnlocked, locationOpen, recordClear, stageOpen } from '../src/game/profile';

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
        for (const f of [...s.hits.map((h) => h.fx), s.projectile, s.castFx, s.actorFx]) if (f) expect(fx[f], `${s.id} -> fx ${f}`).toBeTruthy();
        if (s.projectile) expect(c.muzzle, `${c.id} fires projectiles, needs a muzzle`).toBeTruthy();
      }
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
  it('has unique stage ids, known champions and zones, and sane map positions', () => {
    const stages = allStages();
    expect(new Set(stages.map((s) => s.id)).size).toBe(stages.length);
    const ids = new Set(CHAMPIONS.map((c) => c.id));
    const zones = new Set(ZONES.map((z) => z.id));
    for (const loc of LOCATIONS) {
      expect(zones.has(loc.zone), `${loc.id} zone ${loc.zone}`).toBe(true);
      if (loc.requires) expect(stages.some((s) => s.id === loc.requires), `${loc.id} requires ${loc.requires}`).toBe(true);
      // every location ends with its boss
      expect(loc.stages[loc.stages.length - 1].enemies.some((e) => e.boss), `${loc.id} final stage boss`).toBe(true);
    }
    for (const s of stages) {
      expect(s.enemies.length).toBeGreaterThan(0);
      expect(s.enemies.length).toBeLessThanOrEqual(3);
      for (const e of s.enemies) expect(ids.has(e.champion), `${s.id} enemy ${e.champion}`).toBe(true);
      if (s.recruit) expect(ids.has(s.recruit), `${s.id} recruit`).toBe(true);
      // inside the world, clear of its frame and of the header when scrolled to the top
      expect(s.map.x, `${s.id} map x`).toBeGreaterThan(24);
      expect(s.map.x, `${s.id} map x`).toBeLessThan(WORLD_MAP.w - 24);
      expect(s.map.y, `${s.id} map y`).toBeGreaterThan(48);
      expect(s.map.y, `${s.id} map y`).toBeLessThan(WORLD_MAP.h - 24);
    }
  });

  it('has a world map and an overview of the size the campaign data assumes', () => {
    const size = (f: string) => {
      const b = fs.readFileSync(f);
      return [b.readUInt32BE(16), b.readUInt32BE(20)];
    };
    expect(size('public/assets/map/world.png')).toEqual([WORLD_MAP.w, WORLD_MAP.h]);
    expect(size('public/assets/map/overview.png')).toEqual([WORLD_MAP.w / WORLD_MAP.overview, WORLD_MAP.h / WORLD_MAP.overview]);
  });

  it('only recruits champions the player faced in that stage', () => {
    for (const s of allStages()) if (s.recruit) expect(s.enemies.map((e) => e.champion), s.id).toContain(s.recruit);
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
        if (k.fire) expect(zj.kinds.flame, `${z.id} fire props need flame frames`).toBeTruthy();
      }
      if (z.birds) expect(zj.kinds.bird, `${z.id} birds need bird frames`).toBeTruthy();
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

  it('uses icons that exist', () => {
    for (const ch of CHAPTERS) {
      const ok = ch.icon.startsWith('status_') ? !!ui.status[ch.icon.slice(7)] : !!ui.parts[ch.icon];
      expect(ok, `${ch.id} icon ${ch.icon}`).toBe(true);
    }
  });
});

describe('font', () => {
  const font = json('public/assets/ui/font.json') as { faces: Record<'regular' | 'bold' | 'display', { cellH: number; cap: number; caps: boolean; glyphs: Record<string, unknown> }> };
  const missing = (face: 'regular' | 'bold' | 'display', texts: string[]) => {
    const f = font.faces[face];
    const chars = new Set(texts.flatMap((t) => [...(f.caps ? t.toUpperCase() : t)]));
    return [...chars].filter((ch) => !f.glyphs[ch]);
  };

  it('has a glyph in regular and bold for every character of the game text', () => {
    const texts = [
      ...CHAMPIONS.flatMap((c) => [c.name, c.title, c.lore, ...c.skills.flatMap((s) => [s.name, s.tag, s.desc]), c.passive?.name ?? '', c.passive?.desc ?? '']),
      ...Object.values(STATUSES).flatMap((s) => [s.name, s.desc]),
      ...[RARITIES, AFFINITIES, FACTIONS].flatMap((m) => Object.values(m).flatMap((d) => [d.name, 'desc' in d ? d.desc : ''])),
      ...Object.values(ROLES).flatMap((r) => [r.id, r.desc]),
      ...LOCATIONS.flatMap((l) => [l.chapter, l.name, l.blurb, ...l.stages.flatMap((s) => [s.id, s.name, s.blurb])]),
      ...ZONES.flatMap((z) => [z.name, z.subtitle]),
      ...CHAPTERS.flatMap((ch) => [ch.title, ch.demo?.label ?? '', ...ch.blocks.flatMap((b) => ('text' in b ? [b.text] : b.kind === 'list' ? b.items : []))]),
    ];
    expect(missing('regular', texts)).toEqual([]);
    expect(missing('bold', texts)).toEqual([]);
  });

  it('has a title-face glyph for every title, name and big number', () => {
    const titles = [...CHAMPIONS.map((c) => c.name), ...CHAPTERS.map((ch) => ch.title), 'NEW CHAMPION', 'VICTORY', 'DEFEAT', 'BOSS', 'FIGHT!', 'PAUSED', 'UNDYING!', 'OVERDRIVE!', '0123456789+'];
    expect(missing('display', titles)).toEqual([]);
  });

  it('keeps the metrics the screens are laid out for', () => {
    for (const f of [font.faces.regular, font.faces.bold]) expect([f.cap, f.cellH]).toEqual([7, 9]);
    // a title occupies exactly the cell of bold text drawn at 2x
    expect(font.faces.display.cellH).toBe(2 * font.faces.bold.cellH);
  });
});

describe('profile', () => {
  it('opens stages in order and recruits on the first clear only', () => {
    const p = defaultProfile();
    const stages = allStages();
    expect(frontier(p)).toBe(stages[0].id);
    expect(stageOpen(p, stages[0].id)).toBe(true);
    expect(stageOpen(p, stages[1].id)).toBe(false);
    const recruit = recordClear(p, stages[0].id, 2);
    expect(recruit).toBe(stages[0].recruit);
    expect(isUnlocked(p, recruit!)).toBe(true);
    expect(p.fresh).toContain(recruit);
    expect(recordClear(p, stages[0].id, 3)).toBeUndefined();
    expect(p.stars[stages[0].id]).toBe(3);
    expect(recordClear(p, stages[0].id, 1)).toBeUndefined();
    expect(p.stars[stages[0].id]).toBe(3);
    expect(stageOpen(p, stages[1].id)).toBe(true);
    expect(frontier(p)).toBe(stages[1].id);
  });

  it('opens a location only after the stage it requires', () => {
    const p = defaultProfile();
    const second = LOCATIONS[1];
    expect(locationOpen(p, second)).toBe(false);
    for (const s of LOCATIONS[0].stages) recordClear(p, s.id, 1);
    expect(locationOpen(p, second)).toBe(true);
    expect(cleared(p, LOCATIONS[0].stages[0].id)).toBe(true);
    expect(recruitStage(second.stages[0].recruit!)?.id).toBe(second.stages[0].id);
  });
});
