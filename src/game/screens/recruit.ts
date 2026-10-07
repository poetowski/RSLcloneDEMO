// Recruit ceremony: after a first clear the defeated guardian joins you. A
// beam of light falls, the champion appears at double size over a slowly
// turning sunburst in its rarity color, and its card is read out.
import { H, W } from '../../engine/screen';
import { Particles } from '../../engine/particles';
import { App } from '../app';
import { champion } from '../data/champions';
import { AFFINITIES, FACTIONS, RARITIES } from '../data/meta';
import { ChampionDef } from '../data/types';
import { COLORS } from '../ui/ui';
import { drawChampion, frameAt } from '../view/unit';
import { BaseScreen } from './base';

export class RecruitScreen extends BaseScreen {
  private c: ChampionDef;
  private burst: HTMLCanvasElement;
  private sparks = new Particles();
  private landed = false;

  constructor(
    app: App,
    id: string,
    private then: () => void,
  ) {
    super(app);
    this.c = champion(id);
    this.burst = makeBurst(420, RARITIES[this.c.rarity].color);
    this.ui.focusId = 'view';
  }

  protected back() {
    this.then();
  }

  protected update(dt: number) {
    this.sparks.update(dt);
    if (!this.landed && this.t > 650) {
      this.landed = true;
      const col = RARITIES[this.c.rarity].color;
      this.sparks.burst(W / 2, 236, 40, ['#ffffff', col, '#7a4a12'], { speed: 120, up: 60, gravity: 120, life: 1200, size: 2 });
    }
  }

  protected draw(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    const c = this.c;
    const rar = RARITIES[c.rarity];
    ctx.fillStyle = '#070910';
    ctx.fillRect(0, 0, W, H);
    // the sunburst turns slowly behind everything
    ctx.save();
    ctx.translate(W / 2, 170);
    ctx.rotate(this.t * 0.00018);
    ctx.globalAlpha = Math.min(1, this.t / 600) * 0.55;
    ctx.drawImage(this.burst, -210, -210);
    ctx.restore();
    ctx.globalAlpha = 1;
    ui.glow(ctx, W / 2, 200, 120, 90, rar.color, 0.6);

    // the beam falls first, then narrows to nothing as the champion lands
    const bt = this.t;
    if (bt < 900) {
      const grow = Math.min(1, bt / 380);
      const half = bt < 600 ? 10 + grow * 8 : 18 * (1 - (bt - 600) / 300);
      for (let k = 3; k >= 0; k--) {
        ctx.fillStyle = k === 0 ? '#ffffff' : k === 1 ? '#fff4c0' : rar.color;
        ctx.globalAlpha = k >= 2 ? 0.35 : 0.9;
        const w = Math.max(1, Math.round(half * (1 - k * 0.22)));
        ctx.fillRect(Math.round(W / 2 - w), 0, w * 2, Math.round(250 * grow));
      }
      ctx.globalAlpha = 1;
    }
    if (bt > 600 && bt < 760) {
      ctx.fillStyle = `rgba(255,250,235,${1 - (bt - 600) / 160})`;
      ctx.fillRect(0, 0, W, H);
    }
    // podium and champion
    const pod = ui.part('podium');
    ctx.drawImage(this.a.ui.img, pod[0], pod[1], pod[2], pod[3], W / 2 - pod[2], 232, pod[2] * 2, pod[3] * 2);
    if (bt > 600) {
      const art = this.a.champions[c.id];
      const anim = bt < 2200 && art.json.anims.skill ? 'skill' : 'idle';
      drawChampion(ctx, art, anim, frameAt(art, anim, bt - 600), W / 2, 250, { facing: 'R', scale: 2 });
    }
    this.sparks.draw(ctx);

    // the card
    const a = Math.min(1, Math.max(0, (bt - 800) / 300));
    ctx.globalAlpha = a;
    this.a.font.draw(ctx, 'NEW CHAMPION', W / 2, 18, { color: '#fff6c0', gradient: '#f0a020', variant: 'display', align: 'center', outline: COLORS.ink, shadow: '#3a1e06' });
    ui.text(ctx, c.name, W / 2, 268, { color: c.color, variant: 'display', align: 'center' });
    ui.text(ctx, c.title, W / 2, 288, { color: COLORS.dim, align: 'center' });
    const aff = AFFINITIES[c.affinity], fac = FACTIONS[c.faction];
    const line = `${rar.name}   ${aff.name}   ${c.role}   ${fac.name}`;
    const lw = ui.measure(line) + 30;
    let lx = Math.round(W / 2 - lw / 2);
    ui.text(ctx, rar.name, lx, 302, { color: rar.color, variant: 'bold' });
    lx += ui.measure(rar.name, 'bold') + 8;
    ui.blit(ctx, 'gem_' + c.affinity, lx, 301);
    ui.text(ctx, aff.name, lx + 13, 302, { color: aff.color });
    lx += 13 + ui.measure(aff.name) + 8;
    ui.blit(ctx, 'role_' + c.role, lx, 301);
    ui.text(ctx, c.role, lx + 11, 302, { color: COLORS.text });
    lx += 11 + ui.measure(c.role) + 8;
    ui.blit(ctx, 'emblem_' + c.faction, lx, 298);
    ui.text(ctx, fac.name, lx + 17, 302, { color: fac.color });
    ctx.globalAlpha = 1;
    if (bt > 1400) {
      ui.button(ctx, 'view', W / 2 - 130, H - 34, 124, 24, 'VIEW CHAMPION', { click: () => this.app.router.champion(c.id), icon: 'mi_champions' });
      ui.button(ctx, 'go', W / 2 + 6, H - 34, 124, 24, 'CONTINUE', { click: () => this.then(), icon: 'mi_play' });
    }
  }
}

/** Hard-edged sunburst: 24 wedges, alternating, banded fade toward the rim. */
function makeBurst(size: number, color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  const n = parseInt(color.slice(1), 16);
  const r0 = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - r0, dy = y + 0.5 - r0;
      const d = Math.hypot(dx, dy) / r0;
      if (d > 1) continue;
      const wedge = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * 24) % 2;
      if (wedge) continue;
      const k = Math.floor((1 - d) * 4 + 1) / 4;
      const i = (y * size + x) * 4;
      img.data[i] = (n >> 16) & 255;
      img.data[i + 1] = (n >> 8) & 255;
      img.data[i + 2] = n & 255;
      img.data[i + 3] = Math.round(k * 110);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}
