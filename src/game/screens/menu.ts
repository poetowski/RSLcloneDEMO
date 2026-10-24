// Main menu: the Sanctum (Jakub, 2026-10-24: "instead of changing dioramas,
// only champions would be changing at each refresh of main menu, diorama would
// be new and static, designed just for main menu and instead of navigational
// buttons user can click on objects or building from diorama instead"). The
// island under the broken Loom (tools/art/sanctum.ts, view/sanctum.ts) with a
// few of your champions standing before the Reliquary, a different few each
// time the menu opens; its places lead on: the Starbridge Gate to the
// campaign, the Reliquary to the champions, the Weaver's Spire to Weaving, the
// Observatory to the Academy, the astrolabe to the options. A place lights up
// under the pointer (its own pixels, not a box) or the keyboard's focus, and
// its label carries what the old buttons said: the frontier, the roster, the
// spools, the unread chapters, the NEW badges.
import { H, W } from '../../engine/screen';
import { App } from '../app';
import { anyFresh, cleared, frontier, roster, spoolsHeld } from '../archivist';
import { CHAMPIONS } from '../data/champions';
import { CHAPTERS } from '../data/codex';
import { COLORS } from '../ui/ui';
import { MenuPlace, Rect4 } from '../view/assets';
import { SanctumView } from '../view/sanctum';
import { drawChampion, Facing, frameAt } from '../view/unit';
import { BaseScreen } from './base';

interface Figure {
  id: string;
  x: number;
  y: number;
  facing: Facing;
  phase: number;
}

interface Place {
  id: MenuPlace;
  label: string;
  note?: string;
  badge?: boolean;
  go: () => void;
}

export class MainMenu extends BaseScreen {
  private view: SanctumView;
  private figures: Figure[] = [];
  private shadow: HTMLCanvasElement;
  /** the labels' boxes as drawn, so a label leads on like its place */
  private labelBoxes: { id: MenuPlace; r: Rect4 }[] = [];

  constructor(app: App) {
    super(app);
    this.view = new SanctumView(app.a);
    // a few of the champions you own, a different few each time
    const own = [...roster(this.archivist)];
    for (let i = own.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [own[i], own[j]] = [own[j], own[i]];
    }
    own.slice(0, this.view.json.spots.length).forEach((id, i) => {
      const s = this.view.json.spots[i];
      this.figures.push({ id, x: s.x, y: s.y, facing: s.facing, phase: Math.floor(Math.random() * 4000) });
    });
    this.shadow = document.createElement('canvas');
    this.shadow.width = 30;
    this.shadow.height = 8;
    const g = this.shadow.getContext('2d')!;
    g.fillStyle = 'rgba(4,3,14,0.5)';
    g.beginPath();
    g.ellipse(15, 4, 15, 4, 0, 0, Math.PI * 2);
    g.fill();
    this.ui.focusId = 'm_campaign';
  }

  protected update(dt: number) {
    this.view.update(dt);
  }

  private places(): Place[] {
    const a = this.archivist;
    const r = this.app.router;
    const fr = frontier(a);
    const unread = CHAPTERS.filter((c) => !a.read.includes(c.id)).length;
    const held = spoolsHeld(a);
    return [
      { id: 'campaign', label: 'CAMPAIGN', note: cleared(a, fr) ? 'replay' : fr, go: () => r.campaign() },
      { id: 'champions', label: 'CHAMPIONS', note: `${roster(a).length}/${CHAMPIONS.length}`, badge: anyFresh(a), go: () => r.collection() },
      // the spool storage (Jakub, 2026-10-24: "Weaving Storage", then just WEAVING): how many spools, NEW while new finds wait
      { id: 'weaving', label: 'WEAVING', note: held ? String(held) : undefined, badge: a.reliquary.freshCount() > 0, go: () => r.weaving() },
      { id: 'academy', label: 'ACADEMY', note: unread ? `${unread} new` : undefined, go: () => r.academy() },
      { id: 'options', label: 'OPTIONS', go: () => r.options() },
    ];
  }

  /** The place the pointer is on or the keyboard has focused. */
  private hovered(): MenuPlace | null {
    const f = this.ui.focusId;
    return f?.startsWith('m_') ? (f.slice(2) as MenuPlace) : null;
  }

  private placeAt(x: number, y: number): MenuPlace | null {
    const box = this.labelBoxes.find(({ r }) => x >= r[0] && y >= r[1] && x < r[0] + r[2] && y < r[1] + r[3]);
    return box?.id ?? this.view.placeAt(x, y);
  }

  pointerMove(x: number, y: number) {
    this.ui.pointer(x, y);
    const p = this.placeAt(x, y);
    this.ui.focusId = p ? 'm_' + p : null;
    return !!p;
  }

  click(x: number, y: number) {
    if (this.app.busy) return;
    const p = this.placeAt(x, y);
    if (p) this.places().find((q) => q.id === p)?.go();
  }

  protected draw(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    const hover = this.hovered();
    this.view.drawBack(ctx, hover && hover !== 'options' ? hover : null);
    // the champions before the Reliquary, back to front
    for (const f of [...this.figures].sort((p, q) => p.y - q.y)) {
      const art = this.a.champions[f.id];
      ctx.drawImage(this.shadow, f.x - 15, f.y - 4);
      drawChampion(ctx, art, 'idle', frameAt(art, 'idle', this.t + f.phase), f.x, f.y, { facing: f.facing });
    }
    this.view.drawFront(ctx, hover);

    // the title: the logo with a slow shine sweeping across it, the subtitle between two dividers
    const logo = ui.part('logo');
    const lx = Math.round(W / 2 - logo[2] / 2), ly = 12;
    ui.blit(ctx, 'logo', lx, ly);
    const sweep = (this.t / 9) % (logo[2] + 400) - 40;
    if (sweep < logo[2]) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(lx + sweep, ly, 10, logo[3]);
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35;
      ui.blit(ctx, 'logo', lx, ly);
      ctx.restore();
    }
    const sub = 'RELIQUARY OF LEGENDS';
    const sy = ly + logo[3] + 3, sw = ui.measure(sub, 'display');
    ui.text(ctx, sub, W / 2, sy, { color: COLORS.gold, align: 'center', variant: 'display' });
    ui.divider(ctx, Math.round(W / 2 - sw / 2 - 52), sy + 6, 44);
    ui.divider(ctx, Math.round(W / 2 + sw / 2 + 8), sy + 6, 44);

    // each place's label, and a region for the keyboard
    this.labelBoxes = [];
    const spots = new Map(this.view.json.hotspots.map((h) => [h.id, h]));
    for (const p of this.places()) {
      const h = spots.get(p.id)!;
      const hot = hover === p.id;
      this.label(ctx, p, h.label[0], h.label[1], hot, h.name);
      const [bx, by, bw, bh] = this.view.boxOf(p.id);
      ui.regions.push({ id: 'm_' + p.id, x: bx, y: by, w: bw, h: bh, click: p.go });
    }
    ui.text(ctx, 'Choose a place on the island.  Arrows + Enter work too.', W / 2, H - 12, { color: COLORS.faint, align: 'center' });
  }

  /** A place's label: a banner with its name and what it holds; lit, with the place's own name under it, while it is hot. */
  private label(ctx: CanvasRenderingContext2D, p: Place, cx: number, top: number, hot: boolean, name: string) {
    const ui = this.ui;
    const tw = ui.measure(p.label, 'bold'), nw = p.note ? ui.measure(p.note) + 6 : 0;
    const w = tw + nw + 26;
    const x = Math.round(Math.min(W - 4 - w, Math.max(4, cx - w / 2)));
    const b = ui.part('banner');
    ctx.globalAlpha = hot ? 1 : 0.88;
    ctx.drawImage(this.a.ui.img, b[0], b[1], 12, b[3], x, top, 12, b[3]);
    ctx.drawImage(this.a.ui.img, b[0] + 12, b[1], 8, b[3], x + 12, top, w - 24, b[3]);
    ctx.drawImage(this.a.ui.img, b[0] + b[2] - 12, b[1], 12, b[3], x + w - 12, top, 12, b[3]);
    ctx.globalAlpha = 1;
    ui.text(ctx, p.label, x + 13, top + 5, { color: hot ? COLORS.goldHi : '#e8d9a0', variant: 'bold' });
    if (p.note) ui.text(ctx, p.note, x + 13 + tw + 6, top + 5, { color: hot ? COLORS.text : COLORS.dim });
    if (p.badge) ui.blit(ctx, 'new', x + w - 14, top - 5);
    if (hot) ui.text(ctx, name, x + w / 2, top + b[3] + 1, { color: '#c8b8f0', align: 'center' });
    this.labelBoxes.push({ id: p.id, r: [x, top, w, b[3]] });
  }
}
