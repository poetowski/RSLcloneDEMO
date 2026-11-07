// Extra Combat's hall (Jakub, 2026-11-07: "new screen for extra combat ...
// interior with candles and three doors horizontally on the screen", each
// barred by a stripe that says LOCKED; "player can click on first door and its
// LOCKED stripe would fall down and doors would get permanently open. two
// other doors stay locked for now"; "make first door LOCKED stripe to look
// almost fallen"). The hall is tools/art/extra.ts; here the candles flicker,
// the third door's runes light one by one in every colour, the second door's
// stars twinkle, and the first door's stripe, hanging by one nail, swings
// down, drops, topples onto the floor, and the door swings open, for good
// (the save keeps it). The two others shake their stripes and stay shut.
// What is behind the first door waits for his design.
import { H, W } from '../../engine/screen';
import { App } from '../app';
import { saveArchivist } from '../archivist';
import { DoorId, EXTRA_COMBAT, EXTRA_DOORS } from '../data/extra';
import { COLORS } from '../ui/ui';
import { blit } from '../view/assets';
import { BaseScreen } from './base';

/** the first door's stripe coming down, ms from the click: it swings on its nail, drops, topples flat; then the door opens */
const SWING = 520;
const SETTLE = 760;
const DROP_G = 0.0012;
const TOPPLE = 300;
const OPEN_MS = 760;
/** how flat a stripe lying on the floor looks (seen from above at a slant) */
const LYING = 0.42;
/** the colours the runes light up in, round and round */
const RUNE_COLORS = ['#ff4a5a', '#ffa23a', '#ffe85a', '#6aff7a', '#4ae2ff', '#5a7cff', '#c45aff', '#ff5ad6'];
const FLAME: Record<'red' | 'pale' | 'warm', { core: string; body: string; tip: string; glow: string }> = {
  warm: { core: '#fff4c8', body: '#ffc04a', tip: '#ff7a1a', glow: '#ff9a4a' },
  red: { core: '#ffd2a0', body: '#ff5a24', tip: '#c01810', glow: '#ff3a1a' },
  pale: { core: '#ffffff', body: '#d4e8ff', tip: '#8ab0ff', glow: '#a8c4ff' },
};
const NOTE_MS = 3800;

/** A stripe's pose: the world point it hangs on, which point of it hangs there, its angle (deg), how flat it lies. */
interface StripePose {
  px: number;
  py: number;
  ax: number;
  ay: number;
  angle: number;
  squash: number;
}

export class ExtraScreen extends BaseScreen {
  /** the first door coming open: since when */
  private opening: { t0: number; landT: number } | null = null;
  /** a locked door's stripe shaking: which and since when */
  private shake: { door: number; t0: number } | null = null;
  private note: { text: string; t: number } | null = null;
  private dust: { x: number; y: number; vx: number; vy: number; t: number }[] = [];
  /** the stripe with LOCKED on it, made once */
  private stripeImg: HTMLCanvasElement | null = null;

  constructor(app: App) {
    super(app);
    this.ui.focusId = 'door_demonic';
  }

  private get json() {
    return this.a.extra.json;
  }

  private isOpen(id: DoorId): boolean {
    return this.archivist.doors.includes(id);
  }

  protected back() {
    this.app.router.menu();
  }

  protected update(dt: number) {
    for (const d of this.dust) {
      d.t += dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 0.0002 * dt;
    }
    this.dust = this.dust.filter((d) => d.t < 700);
    if (this.note && this.t - this.note.t > NOTE_MS) this.note = null;
    if (this.opening && this.t - this.opening.t0 > this.doneAt()) this.opening = null;
  }

  private say(text: string) {
    this.note = { text, t: this.t };
  }

  /** When the first door's stripe lands and when the door stands open, ms from the click. */
  private fallTimes() {
    const s = this.json.stripe, d = this.json.doors[0];
    const fall = this.json.floor + 24 - (d.stripe.pivot[1] + s.nail[0]);
    const drop = Math.sqrt((2 * Math.max(0, fall)) / DROP_G);
    const land = SETTLE + drop;
    return { drop, land, flat: land + TOPPLE };
  }

  private doneAt() {
    return this.fallTimes().flat + 120 + OPEN_MS;
  }

  private clickDoor(i: number) {
    const door = EXTRA_DOORS[i];
    if (this.opening) return;
    if (this.isOpen(door.id)) {
      this.say(`What lies beyond ${door.name.replace(/^The /, 'the ')} is still to come.`);
      return;
    }
    if (!door.opens) {
      this.shake = { door: i, t0: this.t };
      this.say(`${door.name} is locked.`);
      return;
    }
    // it opens for good the moment it is pulled: the save keeps it even if the hall is left mid-fall
    this.archivist.doors.push(door.id);
    saveArchivist(this.archivist);
    this.opening = { t0: this.t, landT: -1 };
  }

  // ---------------------------------------------------------------------------
  // drawing

  protected draw(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    const x = this.a.extra;
    ctx.drawImage(x.hall, 0, 0);
    this.firstDoor(ctx);
    this.lights(ctx);
    this.runes(ctx);
    this.stars(ctx);
    this.candles(ctx);
    // the doors: their stripes, hover, the click
    EXTRA_DOORS.forEach((door, i) => {
      const [bx, by, bw, bh] = this.json.doors[i].box;
      const id = 'door_' + door.id;
      const hot = ui.hot(id, bx, by, bw, bh);
      if (hot && !this.opening) {
        ctx.globalCompositeOperation = 'lighter';
        ui.glow(ctx, bx + bw / 2, by + bh / 2 + 20, Math.round(bw / 2) + 6, Math.round(bh / 2), '#ffd8a0', 0.12);
        ctx.globalCompositeOperation = 'source-over';
      }
      this.drawStripe(ctx, i);
      const open = this.isOpen(door.id);
      ui.regions.push({
        id, x: bx, y: by, w: bw, h: bh,
        click: () => this.clickDoor(i),
        tip: () => ({
          title: door.name,
          body: `${door.look} ${open ? 'Open.' : door.opens ? 'Its stripe hangs by one nail: pull it down.' : 'Locked.'}`,
          color: open ? COLORS.goldHi : undefined,
        }),
      });
    });
    this.drawDust(ctx);
    this.header(ctx, EXTRA_COMBAT.name.toUpperCase(), 'The hall under the Arena');
    // the bottom line: what a door said, or how to go on
    ctx.fillStyle = 'rgba(5,6,12,0.6)';
    ctx.fillRect(0, H - 20, W, 20);
    if (this.note) ui.text(ctx, this.note.text, W / 2, H - 14, { color: COLORS.goldHi, align: 'center' });
    else ui.text(ctx, this.isOpen('demonic') ? 'The first door stands open.' : 'Three doors, all locked. One of them is giving way.', W / 2, H - 14, { color: COLORS.faint, align: 'center' });
  }

  /** The first door as it opens, or open; the light from beyond it. */
  private firstDoor(ctx: CanvasRenderingContext2D) {
    const o = this.json.opening;
    let k = this.isOpen('demonic') ? 1 : 0;
    if (this.opening) {
      const u = (this.t - this.opening.t0 - this.fallTimes().flat - 120) / OPEN_MS;
      k = Math.max(0, Math.min(1, u));
    }
    if (k <= 0) return;
    const frame = o.frames[Math.min(o.frames.length - 1, Math.floor(k * o.frames.length - 0.001))];
    blit(ctx, this.a.extra.img, frame, o.at[0], o.at[1]);
    ctx.globalCompositeOperation = 'lighter';
    const d = this.json.doors[0];
    this.ui.glow(ctx, d.cx, this.json.floor - 10, 44, 34, '#ff3a1a', k * (0.32 + 0.06 * Math.sin(this.t / 600)));
    this.ui.glow(ctx, d.cx, this.json.floor + 6, 60, 10, '#ff3a1a', k * 0.3);
    ctx.globalCompositeOperation = 'source-over';
  }

  /** The hall's own glows: under and on the first door, the arcane circle, the winged sun. */
  private lights(ctx: CanvasRenderingContext2D) {
    ctx.globalCompositeOperation = 'lighter';
    const open = this.isOpen('demonic') && !this.opening;
    for (const l of this.json.lights) {
      // the pentagram's glow goes with the leaves it was on
      if (open && l.door === 0 && l.y < this.json.floor - 40) continue;
      const k = l.k * (0.82 + 0.18 * Math.sin((this.t / 1000) * l.rate * Math.PI * 2 + l.x));
      const hex = '#' + l.rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
      this.ui.glow(ctx, l.x, l.y, l.rx, l.ry, hex, k);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /** The runes light up one by one, each on its own slow beat, each time in the next colour. */
  private runes(ctx: CanvasRenderingContext2D) {
    this.json.runes.forEach((px, i) => {
      const period = 2200 + ((i * 977) % 2600);
      const phase = (i * 613) % period;
      const cyc = (this.t + phase) / period;
      const u = cyc - Math.floor(cyc);
      // lit for the first 55% of its beat, rising and falling
      const k = u < 0.55 ? Math.sin((u / 0.55) * Math.PI) : 0;
      if (k < 0.05) return;
      const color = RUNE_COLORS[(Math.floor(cyc) + i * 3) % RUNE_COLORS.length];
      let cx = 0, cy = 0;
      for (const [x, y] of px) {
        cx += x;
        cy += y;
      }
      cx /= px.length;
      cy /= px.length;
      ctx.globalCompositeOperation = 'lighter';
      this.ui.glow(ctx, Math.round(cx), Math.round(cy), 9, 11, color, k * 0.45);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = k;
      ctx.fillStyle = color;
      for (const [x, y] of px) ctx.fillRect(x, y, 1, 1);
      if (k > 0.7) {
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = (k - 0.7) * 2;
        for (const [x, y] of px) if ((x + y) % 3 === 0) ctx.fillRect(x, y, 1, 1);
      }
      ctx.globalAlpha = 1;
    });
  }

  /** The second door's stars twinkle now and then. */
  private stars(ctx: CanvasRenderingContext2D) {
    this.json.stars.forEach(([x, y], i) => {
      const k = Math.sin(this.t / (900 + (i % 5) * 230) + i * 1.9);
      if (k < 0.75) return;
      ctx.globalAlpha = (k - 0.75) * 4;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, 1, 1);
      ctx.fillStyle = '#ffe9a0';
      ctx.fillRect(x - 2, y, 1, 1);
      ctx.fillRect(x + 2, y, 1, 1);
      ctx.fillRect(x, y - 2, 1, 1);
      ctx.fillRect(x, y + 2, 1, 1);
      ctx.globalAlpha = 1;
    });
  }

  /** Every candle's flame: a core, a body and a tip, swaying and stretching on its own slow flicker, its light round it. */
  private candles(ctx: CanvasRenderingContext2D) {
    for (const c of this.json.candles) {
      const f = FLAME[c.tone];
      const ph = c.x * 7.3 + c.y * 3.1;
      const flick = Math.sin(this.t / 170 + ph) + Math.sin(this.t / 410 + ph * 0.7) * 0.6;
      const h = (c.small ? 3 : 4) + (flick > 0.6 ? 1 : 0);
      const sway = Math.sin(this.t / 620 + ph) > 0.7 ? 1 : 0;
      ctx.globalCompositeOperation = 'lighter';
      this.ui.glow(ctx, c.x, c.y - 3, c.small ? 9 : 13, c.small ? 8 : 11, f.glow, 0.16 + 0.04 * flick);
      ctx.globalCompositeOperation = 'source-over';
      const top = c.y - h;
      ctx.fillStyle = f.tip;
      ctx.fillRect(c.x + sway, top, 1, 1);
      ctx.fillStyle = f.body;
      ctx.fillRect(c.x - 1, top + 1, 3, h - 2);
      ctx.fillRect(c.x + sway, top + 1, 1, 1);
      ctx.fillStyle = f.core;
      ctx.fillRect(c.x, c.y - 2, 1, 2);
    }
  }

  /** The stripe with LOCKED written on it, made once from the hall's sprite and the game's font. */
  private stripe(): HTMLCanvasElement {
    if (this.stripeImg) return this.stripeImg;
    const s = this.json.stripe;
    const c = document.createElement('canvas');
    c.width = s.w;
    c.height = s.h;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    blit(g, this.a.extra.img, s.rect, 0, 0);
    this.a.font.draw(g, 'LOCKED', s.w / 2, 3, { variant: 'display', color: '#f6c85a', gradient: '#d88a2a', outline: '#120406', align: 'center' });
    this.stripeImg = c;
    return c;
  }

  /** Where a door's stripe is now. */
  private stripePose(i: number): StripePose {
    const d = this.json.doors[i], s = this.json.stripe;
    const [px, py] = d.stripe.pivot;
    const hang: StripePose = { px, py, ax: s.nail[0], ay: s.nail[1], angle: d.stripe.angle, squash: 1 };
    // a locked stripe shakes a moment when its door is tried
    if (this.shake && this.shake.door === i) {
      const u = (this.t - this.shake.t0) / 420;
      if (u < 1) return { ...hang, px: px + Math.round(Math.sin(u * Math.PI * 7) * 2.5 * (1 - u)) };
    }
    if (i !== 0) return hang;
    // the first door's: hanging askew by one nail, swaying a little, until it is pulled
    const lying: StripePose = { px, py: this.json.floor + 24, ax: 0, ay: s.h / 2, angle: -180, squash: LYING };
    if (!this.opening) {
      if (this.isOpen('demonic')) return lying;
      return { ...hang, angle: hang.angle + Math.sin(this.t / 1400) * 1.5 };
    }
    const k = this.t - this.opening.t0;
    const { land, flat } = this.fallTimes();
    if (k < SWING) {
      // it swings down on its nail, faster as it goes
      const u = k / SWING;
      return { ...hang, angle: hang.angle + (-90 - hang.angle) * u * u };
    }
    if (k < SETTLE) {
      // a bounce at the bottom of the swing, then it hangs straight down
      const u = (k - SWING) / (SETTLE - SWING);
      return { ...hang, angle: -90 + Math.sin(u * Math.PI * 2) * 8 * (1 - u) };
    }
    if (k < land) {
      // the nail gives: it drops
      const u = k - SETTLE;
      return { ...hang, py: py + 0.5 * DROP_G * u * u, angle: -90 };
    }
    if (this.opening.landT < 0) {
      this.opening.landT = k;
      this.puff(px, this.json.floor + 24, 6);
    }
    if (k < flat) {
      // it topples over its foot and lies down flat on the floor
      const u = (k - land) / TOPPLE;
      return { ...lying, angle: -90 - 90 * u * u, squash: 1 - (1 - LYING) * u * u };
    }
    if (this.opening.landT < land + TOPPLE) {
      this.opening.landT = land + TOPPLE + 1;
      this.puff(px - s.w / 2, this.json.floor + 24, 12);
    }
    return lying;
  }

  private drawStripe(ctx: CanvasRenderingContext2D, i: number) {
    const p = this.stripePose(i);
    const img = this.stripe();
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(p.px), Math.round(p.py));
    ctx.scale(1, p.squash);
    ctx.rotate((p.angle * Math.PI) / 180);
    // a stripe lying on the floor is in the dark of the floor
    if (p.squash < 0.99) ctx.globalAlpha = 0.9;
    ctx.drawImage(img, -p.ax, -p.ay);
    ctx.restore();
  }

  private puff(x: number, y: number, n: number) {
    for (let k = 0; k < n; k++) {
      const a = Math.PI + (k / Math.max(1, n - 1)) * Math.PI;
      this.dust.push({ x: x + (k - n / 2) * 4, y, vx: Math.cos(a) * 0.03, vy: Math.sin(a) * 0.025, t: 0 });
    }
  }

  private drawDust(ctx: CanvasRenderingContext2D) {
    const r = this.json.dust;
    for (const d of this.dust) {
      ctx.globalAlpha = 1 - d.t / 700;
      blit(ctx, this.a.extra.img, r, d.x, d.y);
    }
    ctx.globalAlpha = 1;
  }
}
