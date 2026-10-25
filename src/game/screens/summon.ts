// The Wishing Star (summoning; Jakub, 2026-10-25: "new object in main menu,
// somewhere on the sky, where people can click and merge fragments dropped
// from campaing nodes and then summon heroes"). Under the Sanctum's sky the
// star hangs at twice its size on its thread; on the left the Stardust and the
// Soulstars merged from it, on the right the wish (a faction, a role) and the
// odds it makes, below the star the summon, along the bottom the champions
// still scattered, those the wish names lit. A merge sends the dust into a
// Soulstar; a summon draws motes in from all round, the star's light turns
// the colour of the rarity that answers, a flash, and the champion's
// ceremony (screens/recruit.ts). Rules: src/game/summoning.ts.
import { H, W } from '../../engine/screen';
import { App } from '../app';
import { saveArchivist } from '../archivist';
import { FACTIONS, RARITIES } from '../data/meta';
import { FRAGMENTS_PER_SHARD, SUMMONING, Wish } from '../data/summoning';
import { ChampionDef, FactionId, Rarity, Role } from '../data/types';
import { canMerge, mergeShard, rarityOdds, summon, Summoned, summonChances, summonPool, wishChance, wished } from '../summoning';
import { fragmentsText, shardsText, SOULSTAR_TINT, STARDUST_TINT } from '../ui/stardust';
import { COLORS, Tip } from '../ui/ui';
import { blit, nine, Rect4 } from '../view/assets';
import { champion } from '../data/champions';
import { BaseScreen } from './base';

/** where the star's heart stands; it is drawn at twice its size in the Sanctum */
const STAR = { x: W / 2, y: 104 };
const LEFT: Rect4 = [14, 40, 180, 232];
const RIGHT: Rect4 = [W - 194, 40, 180, 232];
/** the strip of champions still scattered */
const STRIP: Rect4 = [14, 280, W - 28, 66];
/** a summon's call: motes rush in, the light turns at `REVEAL`, the flash rises from `FLASH`, the ceremony at the end */
const CALL_MS = 1500;
const REVEAL = 650;
const FLASH = 1100;
const FACTION_IDS: readonly FactionId[] = ['azure_crown', 'sanguine_dominion', 'court_of_root', 'ashveil_reign'];
const ROLE_IDS: readonly Role[] = ['Tank', 'Damage', 'Support'];
const SHOWN: readonly Rarity[] = ['common', 'elite', 'heroic'];

const pct = (p: number) => `${p > 0 && p < 0.01 ? '<1' : Math.round(p * 100)}%`;

/** A mote on its way: from where to where, how far along, how long its way. */
interface Mote {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** how far it bows aside on the way */
  bow: number;
  t: number;
  life: number;
  color: string;
}

export class SummonScreen extends BaseScreen {
  private motes: Mote[] = [];
  /** the summon under way: what answers, since when, and the pool as it stood (shown until the ceremony, so nothing gives it away) */
  private calling: { s: Summoned; t0: number; pool: ChampionDef[] } | null = null;
  /** when the last Soulstar was merged: its count flares */
  private mergedT = -1e9;
  private soulT = 600;

  /** the wish's panel and the Stardust's (where the tutorial points) */
  readonly wishSpot: Rect4 = RIGHT;
  readonly dustSpot: Rect4 = LEFT;

  constructor(app: App) {
    super(app);
    const a = this.archivist;
    this.ui.focusId = a.shards > 0 && summonPool(a).length ? 'summon' : canMerge(a) ? 'merge' : 'back';
  }

  /** A summon is calling: until its ceremony, nothing else happens here. */
  get summoning(): boolean {
    return !!this.calling;
  }

  protected back() {
    if (!this.calling) this.app.router.menu();
  }

  key(k: string) {
    if (this.calling) return;
    super.key(k);
  }

  click(x: number, y: number) {
    if (this.calling) return;
    super.click(x, y);
  }

  protected update(dt: number) {
    for (const m of this.motes) m.t += dt;
    this.motes = this.motes.filter((m) => m.t < m.life);
    // now and then a soul drifts up into the star, as in the Sanctum
    if ((this.soulT -= dt) <= 0) {
      this.soulT = 1500 + Math.random() * 2000;
      const a = Math.PI * (0.2 + Math.random() * 0.6), d = 90 + Math.random() * 60;
      this.motes.push({ x0: STAR.x + Math.cos(a) * d, y0: STAR.y + Math.sin(a) * d, x1: STAR.x, y1: STAR.y, bow: (Math.random() - 0.5) * 40, t: 0, life: 3600 + Math.random() * 1600, color: '#e6dcff' });
    }
    const c = this.calling;
    if (!c) return;
    const k = this.t - c.t0;
    if (k < 900 && Math.random() < dt / 22) this.rushIn();
    if (k >= CALL_MS) {
      this.calling = null;
      this.app.router.summoned(c.s.champion, c.s.wished);
    }
  }

  /** A mote from the edge of the sky, rushing into the star. */
  private rushIn() {
    const a = Math.random() * Math.PI * 2, d = 150 + Math.random() * 120;
    this.motes.push({ x0: STAR.x + Math.cos(a) * d, y0: STAR.y + Math.sin(a) * d * 0.7, x1: STAR.x, y1: STAR.y, bow: (Math.random() - 0.5) * 60, t: 0, life: 500 + Math.random() * 400, color: Math.random() < 0.5 ? '#ffffff' : '#c8bcf0' });
  }

  private setWish(w: Wish) {
    if (this.calling) return;
    const a = this.archivist;
    a.wish = { ...(w.faction ? { faction: w.faction } : {}), ...(w.role ? { role: w.role } : {}) };
    saveArchivist(a);
  }

  /** Merges a Soulstar: the dust streams from its count into the Soulstars'. */
  private merge() {
    if (!mergeShard(this.archivist)) return;
    const [x, y] = LEFT;
    for (let i = 0; i < 18; i++) {
      this.motes.push({ x0: x + 22 + Math.random() * 10, y0: y + 30 + Math.random() * 10, x1: x + 24, y1: y + 148, bow: 18 + Math.random() * 30, t: -i * 22, life: 520 + Math.random() * 260 + i * 22, color: i % 3 ? STARDUST_TINT : '#ffffff' });
    }
    this.mergedT = this.t + 600;
  }

  /** Spends a Soulstar: the star calls, and what answers comes to the ceremony. */
  private call() {
    if (this.calling) return;
    const pool = summonPool(this.archivist);
    const s = summon(this.archivist);
    if (!s) return;
    this.calling = { s, t0: this.t, pool };
    for (let i = 0; i < 20; i++) this.rushIn();
  }

  // ---------------------------------------------------------------------------
  // drawing

  protected draw(ctx: CanvasRenderingContext2D) {
    const a = this.archivist;
    const pool = this.calling?.pool ?? summonPool(a);
    this.sky(ctx);
    this.star(ctx);
    this.header(ctx, 'SUMMON', `The Wishing Star  -  ${a.summons} summoned`);
    this.stardust(ctx);
    this.wishPanel(ctx, pool);
    this.center(ctx, pool);
    this.strip(ctx, pool);
    this.drawMotes(ctx);
    // the call's flash, rising to white as the champion comes
    if (this.calling) {
      const k = this.t - this.calling.t0;
      if (k > FLASH) {
        ctx.fillStyle = `rgba(255,250,240,${Math.min(1, (k - FLASH) / (CALL_MS - FLASH))})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
  }

  /** The Sanctum's sky, dimmed, its stars twinkling; the thread the star hangs from. */
  private sky(ctx: CanvasRenderingContext2D) {
    const m = this.a.menu;
    ctx.drawImage(m.sky, 0, 0);
    ctx.fillStyle = 'rgba(5,6,14,0.5)';
    ctx.fillRect(0, 0, W, H);
    const s = this.t / 1000;
    ctx.fillStyle = '#ffffff';
    m.json.twinkles.forEach(([x, y], i) => {
      const k = Math.max(0, Math.sin(s * (0.35 + (i % 7) * 0.09) + i * 1.7));
      if (k < 0.2) return;
      ctx.globalAlpha = k * 0.6;
      ctx.fillRect(x, y, 1, 1);
    });
    ctx.globalAlpha = 1;
    // the thread, down from above to the star's upper point
    const top = STAR.y - 2 * 19;
    for (let y = 30; y < top; y++) {
      ctx.fillStyle = y % 9 === 0 ? '#e6dcff' : '#8a7cb8';
      ctx.fillRect(STAR.x - 1, y, 2, 1);
    }
  }

  /** The star at twice its size: its halo, its crystal and ring as they turn; while it calls, its light swells and turns the colour of what answers. */
  private star(ctx: CanvasRenderingContext2D) {
    const m = this.a.menu;
    const [cx, cy] = m.json.wish;
    const draw = (key: string, frame: number, alpha: number) => {
      const s = m.json.sprites[key];
      const r = s.frames[frame];
      ctx.globalAlpha = alpha;
      ctx.drawImage(m.scene, r[0], r[1], r[2], r[3], STAR.x + (s.x - cx) * 2, STAR.y + (s.y - cy) * 2, r[2] * 2, r[3] * 2);
      ctx.globalAlpha = 1;
    };
    const c = this.calling;
    const k = c ? Math.min(1, (this.t - c.t0) / CALL_MS) : 0;
    const ready = this.archivist.shards > 0;
    const glowColor = c && this.t - c.t0 > REVEAL ? RARITIES[champion(c.s.champion).rarity].color : '#b6a8e6';
    this.ui.glow(ctx, STAR.x, STAR.y, 64 + Math.round(k * 50), 64 + Math.round(k * 50), glowColor, (ready ? 0.55 : 0.35) + 0.1 * Math.sin(this.t / 900) + k * 0.6);
    this.ui.glow(ctx, STAR.x, STAR.y, 30, 30, '#e0d8fa', 0.3 + 0.1 * Math.sin(this.t / 700) + k * 0.7);
    const loop = m.json.sprites.wish;
    const speed = c ? 1 + k * 5 : 1;
    draw('wish', Math.floor((this.t * speed) / (loop.ms ?? 300)) % loop.frames.length, 1);
    // what answers shows in two rings of light running out from the star, in its rarity's colour
    if (c && this.t - c.t0 > REVEAL) {
      ctx.fillStyle = glowColor;
      for (const delay of [0, 160]) {
        const u = (this.t - c.t0 - REVEAL - delay) / 480;
        if (u < 0 || u > 1) continue;
        const rad = 12 + u * 130;
        ctx.globalAlpha = 1 - u;
        for (let i = 0, n = Math.round(rad * 4); i < n; i++) {
          const ang = (i / n) * Math.PI * 2;
          ctx.fillRect(Math.round(STAR.x + Math.cos(ang) * rad), Math.round(STAR.y + Math.sin(ang) * rad * 0.8), 1, 1);
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  /** The left panel: the Stardust, the way to the next Soulstar and MERGE, the Soulstars. */
  private stardust(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    const a = this.archivist;
    const [x, y, w, h] = LEFT;
    ui.panel(ctx, 'dark', x, y, w, h);
    ui.text(ctx, SUMMONING.fragment.toUpperCase(), x + 12, y + 10, { color: COLORS.dim, variant: 'bold' });
    ui.blit(ctx, 'bigstardust', x + 12, y + 24);
    this.a.font.draw(ctx, String(a.fragments), x + 44, y + 27, { color: STARDUST_TINT, variant: 'display', outline: COLORS.ink });
    ui.bar(ctx, x + 12, y + 56, w - 24, 3, Math.min(1, a.fragments / FRAGMENTS_PER_SHARD), '#c8a048', '#fff0b0');
    const more = FRAGMENTS_PER_SHARD - a.fragments;
    ui.text(ctx, more > 0 ? `${more} more for a ${SUMMONING.shard}.` : `${FRAGMENTS_PER_SHARD} merge into a ${SUMMONING.shard}.`, x + 12, y + 64, { color: COLORS.faint });
    ui.button(ctx, 'merge', x + 12, y + 80, w - 24, 24, `MERGE ${FRAGMENTS_PER_SHARD}`, { click: () => this.merge(), icon: 'soulstar', disabled: !canMerge(a) || !!this.calling });
    ui.divider(ctx, x + 10, y + 114, w - 20);
    ui.text(ctx, SUMMONING.shards.toUpperCase(), x + 12, y + 126, { color: COLORS.dim, variant: 'bold' });
    const flare = Math.max(0, 1 - Math.abs(this.t - this.mergedT) / 400);
    if (flare > 0) ui.glow(ctx, x + 24, y + 152, 22, 22, SOULSTAR_TINT, flare);
    ui.blit(ctx, 'bigsoulstar', x + 12, y + 140);
    this.a.font.draw(ctx, String(a.shards), x + 44, y + 143, { color: SOULSTAR_TINT, variant: 'display', outline: COLORS.ink });
    ui.para(ctx, `Each ${SUMMONING.shard} summons one champion.`, x + 12, y + 172, w - 24, { color: COLORS.faint });
    ui.para(ctx, `Every victory in the campaign finds ${SUMMONING.fragment}.`, x + 12, y + h - 30, w - 24, { color: COLORS.faint });
  }

  /** The right panel: the wish (a faction, a role), the odds, and what the wish makes of them. */
  private wishPanel(ctx: CanvasRenderingContext2D, pool: ChampionDef[]) {
    const ui = this.ui;
    const a = this.archivist;
    const w0 = a.wish;
    const [x, y, w, h] = RIGHT;
    ui.panel(ctx, 'dark', x, y, w, h);
    ui.text(ctx, 'YOUR WISH', x + 12, y + 10, { color: COLORS.dim, variant: 'bold' });
    // a faction: any, or one of the four standards
    let bx = x + 12;
    this.toggle(ctx, 'wf_any', bx, y + 24, 28, 22, !w0.faction, () => this.setWish({ role: w0.role }), { label: 'ANY', tip: () => ({ title: 'Any faction', body: 'Every faction as likely as the others.' }) });
    for (const f of FACTION_IDS) {
      bx += 30;
      const fac = FACTIONS[f];
      this.toggle(ctx, 'wf_' + f, bx, y + 24, 28, 22, w0.faction === f, () => this.setWish({ faction: f, role: w0.role }), { icon: 'emblem_' + f, tip: () => ({ title: fac.name, body: `Wish for the ${fac.name}: each of its champions twice as likely.`, color: fac.color }) });
    }
    ui.text(ctx, w0.faction ? FACTIONS[w0.faction].name : 'Any faction', x + 12, y + 51, { color: w0.faction ? FACTIONS[w0.faction].color : COLORS.faint });
    // a role: any, or one of the three
    bx = x + 12;
    this.toggle(ctx, 'wr_any', bx, y + 66, 37, 22, !w0.role, () => this.setWish({ faction: w0.faction }), { label: 'ANY', tip: () => ({ title: 'Any role', body: 'Every role as likely as the others.' }) });
    for (const r of ROLE_IDS) {
      bx += 39;
      this.toggle(ctx, 'wr_' + r, bx, y + 66, 37, 22, w0.role === r, () => this.setWish({ faction: w0.faction, role: r }), { icon: 'role_' + r, tip: () => ({ title: r, body: `Wish for a ${r}: each one twice as likely.` }) });
    }
    ui.text(ctx, w0.role ?? 'Any role', x + 12, y + 93, { color: w0.role ? COLORS.text : COLORS.faint });
    ui.divider(ctx, x + 10, y + 108, w - 20);
    // the odds of each rarity, as they stand with what is left to find
    ui.text(ctx, 'ODDS', x + 12, y + 120, { color: COLORS.dim, variant: 'bold' });
    const odds = rarityOdds(pool);
    SHOWN.forEach((r, i) => {
      const ry = y + 134 + i * 11;
      ui.text(ctx, RARITIES[r].name, x + 12, ry, { color: RARITIES[r].color });
      ui.text(ctx, pct(odds[r]), x + w - 12, ry, { color: odds[r] ? COLORS.text : COLORS.faint, align: 'right' });
    });
    // what the wish makes of them
    const cy = y + 176;
    if (w0.faction || w0.role) {
      ui.text(ctx, `Your wish: ${pct(wishChance(pool, w0))}`, x + 12, cy, { color: COLORS.goldHi });
      ui.text(ctx, `${pct(wishChance(pool, w0, false))} without wishing`, x + 12, cy + 11, { color: COLORS.faint });
    } else ui.para(ctx, 'Wish for a faction, a role, or both.', x + 12, cy, w - 24, { color: COLORS.faint });
    ui.para(ctx, 'A wish is no promise, only a better chance.', x + 12, y + h - 30, w - 24, { color: COLORS.faint });
  }

  /** A wish's choice: a small button with its standard, role or ANY, gold corners round the one chosen. */
  private toggle(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, w: number, h: number, on: boolean, click: () => void, o: { label?: string; icon?: string; tip?: () => Tip }) {
    const ui = this.ui;
    const hot = !this.calling && ui.hot(id, x, y, w, h);
    nine(ctx, this.a.ui.img, ui.part(on || hot ? 'btn_hover' : 'btn_up'), x, y, w, h, 4);
    if (o.icon) {
      const r = ui.part(o.icon);
      ctx.globalAlpha = on || hot ? 1 : 0.7;
      blit(ctx, this.a.ui.img, r, x + Math.floor((w - r[2]) / 2), y + Math.floor((h - r[3]) / 2));
      ctx.globalAlpha = 1;
    }
    if (o.label) ui.text(ctx, o.label, x + w / 2, y + h / 2 - 4, { color: on || hot ? COLORS.goldHi : COLORS.dim, align: 'center' });
    if (on) ui.corners(ctx, x - 1, y - 1, w + 2, h + 2, 3);
    ui.regions.push({ id, x, y, w, h, click, tip: o.tip });
  }

  /** Under the star: SUMMON, and how it stands. */
  private center(ctx: CanvasRenderingContext2D, pool: ChampionDef[]) {
    const ui = this.ui;
    const a = this.archivist;
    const can = a.shards > 0 && pool.length > 0 && !this.calling;
    ui.button(ctx, 'summon', W / 2 - 78, 196, 156, 28, 'SUMMON', { click: () => this.call(), icon: 'mi_summon', disabled: !can });
    const line = this.calling
      ? 'The star calls, and a soul answers...'
      : !pool.length
      ? 'Every champion is in your Reliquary.'
      : a.shards > 0
        ? `${shardsText(a.shards)} to spend.`
        : canMerge(a)
          ? `Merge ${fragmentsText(FRAGMENTS_PER_SHARD)} into a ${SUMMONING.shard} first.`
          : `No ${SUMMONING.shard} yet: win battles for ${SUMMONING.fragment}.`;
    ui.text(ctx, line, W / 2, 230, { color: can ? COLORS.text : COLORS.dim, align: 'center' });
    ui.text(ctx, 'A champion you do not have yet answers.', W / 2, 242, { color: COLORS.faint, align: 'center' });
  }

  /** The champions still scattered, the ones the wish names lit, each with its chance on the next summon. */
  private strip(ctx: CanvasRenderingContext2D, pool: ChampionDef[]) {
    const ui = this.ui;
    const a = this.archivist;
    const [x, y, w, h] = STRIP;
    ui.panel(ctx, 'dark', x, y, w, h);
    const left = SHOWN.map((r) => [r, pool.filter((c) => c.rarity === r).length] as const).filter(([, n]) => n > 0);
    ui.text(ctx, 'STILL SCATTERED', x + 12, y + 8, { color: COLORS.dim, variant: 'bold' });
    let tx = x + 18 + ui.measure('STILL SCATTERED', 'bold');
    for (const [r, n] of left) {
      const s = `${n} ${RARITIES[r].name}`;
      ui.text(ctx, s, tx, y + 8, { color: RARITIES[r].color });
      tx += ui.measure(s) + 8;
    }
    if (!pool.length) {
      ui.text(ctx, 'None: every soul has been recollected.', x + w / 2, y + 34, { color: COLORS.text, align: 'center' });
      return;
    }
    const chances = new Map(summonChances(pool, a.wish).map((e) => [e.c.id, e.p]));
    const any = !!a.wish.faction || !!a.wish.role;
    // one portrait each, as large as the strip allows (28 px at most), its rarity in a bar under it
    const step = Math.min(31, Math.floor((w - 24) / pool.length));
    const size = Math.min(28, step - 3);
    const x0 = Math.round(x + w / 2 - (step * pool.length - (step - size - 2)) / 2);
    const portraits = this.a.ui.json.portraits;
    pool.forEach((c, i) => {
      const px = x0 + i * step, py = y + 22;
      const lit = !any || wished(c, a.wish);
      const r = portraits[c.id], cut = (28 - size) / 2;
      ctx.fillStyle = COLORS.ink;
      ctx.fillRect(px, py, size + 2, size + 5);
      ctx.drawImage(this.a.ui.img, r[0] + Math.floor(cut), r[1] + Math.floor(cut), size, size, px + 1, py + 1, size, size);
      // still scattered: dim, and dimmer when the wish names others
      ctx.fillStyle = `rgba(6,7,16,${lit ? (any ? 0 : 0.3) : 0.7})`;
      ctx.fillRect(px + 1, py + 1, size, size);
      ctx.fillStyle = RARITIES[c.rarity].color;
      ctx.globalAlpha = lit ? 1 : 0.45;
      ctx.fillRect(px + 1, py + size + 2, size, 2);
      ctx.globalAlpha = 1;
      if (any && lit) ui.corners(ctx, px - 1, py - 1, size + 4, size + 7, 3);
      ui.regions.push({ x: px, y: py, w: size + 2, h: size + 5, tip: () => ({ title: c.name, sub: `${RARITIES[c.rarity].name} ${c.role}, ${FACTIONS[c.faction].name}`, body: `Chance on the next summon: ${pct(chances.get(c.id) ?? 0)}.`, color: RARITIES[c.rarity].color }) });
    });
  }

  private drawMotes(ctx: CanvasRenderingContext2D) {
    ctx.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      if (m.t < 0) continue;
      const u = m.t / m.life;
      const e = u * u;
      const nx = -(m.y1 - m.y0), ny = m.x1 - m.x0, nl = Math.hypot(nx, ny) || 1;
      const bow = Math.sin(u * Math.PI) * m.bow;
      const x = Math.round(m.x0 + (m.x1 - m.x0) * e + (nx / nl) * bow), y = Math.round(m.y0 + (m.y1 - m.y0) * e + (ny / nl) * bow);
      const k = Math.min(1, u * 6) * Math.min(1, (1 - u) * 6);
      ctx.globalAlpha = k;
      ctx.fillStyle = m.color;
      ctx.fillRect(x, y, 1, 1);
      ctx.globalAlpha = k * 0.4;
      ctx.fillRect(x - 1, y, 3, 1);
      ctx.fillRect(x, y - 1, 1, 3);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
