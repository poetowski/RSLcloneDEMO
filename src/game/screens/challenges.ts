// Challenges (Jakub, 2026-10-24: "It is a list of quests to accomplish. it has
// three parts. first part is Daily. second tab is Persistent. third tab is
// Journey."). Daily and Persistent are placeholders until he designs them. The
// Journey is a pathway across the screen: the Loom's thread runs through a
// knot for every quest, woven gold up to the quest the Journey stands at, a
// faint line of starlight beyond it, on past knots still to come; each knot
// carries its reward above it and its name below. The panel under the pathway
// reads the chosen quest out: what to do, how it stands, what it gives and the
// way to claim it. Claiming weaves the thread on to the next knot. A longer
// Journey scrolls sideways (wheel, drag, keyboard focus).
import { Particles } from '../../engine/particles';
import { W } from '../../engine/screen';
import { App } from '../app';
import { frontier } from '../archivist';
import { claimQuest, currentQuest, QuestFind, questState, QuestState } from '../challenges';
import { zoneOf } from '../data/campaign';
import { CHALLENGE_TABS, ChallengeTab, JOURNEY, QuestDef } from '../data/challenges';
import { GRADES, pattern, patternBonusText } from '../data/matrix';
import { FRAGMENTS_PER_SHARD, SUMMONING } from '../data/summoning';
import { summonsReady } from '../summoning';
import { Scroller } from '../ui/scroll';
import { PATTERN_TINT, patternName, spoolIcon, statText } from '../ui/spools';
import { STARDUST_TINT } from '../ui/stardust';
import { COLORS } from '../ui/ui';
import { blit, nine, Rect4 } from '../view/assets';
import { BaseScreen, Diorama } from './base';

/** the pathway's band and, inside it, where the knots sit */
const BAND: Rect4 = [12, 58, W - 24, 132];
const KNOT_Y = 122;
/** the first knot's distance from the band's left edge, and the step between knots */
const FIRST = 96;
const SPACING = 172;
/** how far the thread arcs between two knots */
const AMP = 9;
/** knots still to come, drawn faint beyond the last quest */
const GHOSTS = 2;
/** the chosen quest's panel */
const PANEL: Rect4 = [12, 196, W - 24, 156];
/** how long the thread takes to weave on to the next knot, ms */
const WEAVE_MS = 1400;

const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);

export class ChallengesScreen extends BaseScreen {
  tab: ChallengeTab;
  /** the quest the panel reads out */
  selected: QuestDef;
  private diorama: Diorama;
  private scroll = new Scroller();
  private sparks = new Particles();
  /** the thread weaving on from a claimed knot, since `t0` */
  private weave: { from: number; t0: number } | null = null;
  /** what the last claim found */
  private found: { quest: string; find: QuestFind } | null = null;

  constructor(app: App, tab: ChallengeTab = 'journey') {
    super(app);
    this.tab = tab;
    this.diorama = new Diorama(app, zoneOf(frontier(this.archivist)));
    this.selected = currentQuest(this.archivist) ?? JOURNEY[JOURNEY.length - 1];
    this.ui.focusId = this.tab === 'journey' ? 'q_' + this.selected.id : 'tab_' + this.tab;
    this.scroll.extent(this.contentW(), BAND[2]);
    this.scroll.reveal(this.knotX(JOURNEY.indexOf(this.selected)) - SPACING / 2, SPACING, BAND[2]);
    this.scroll.pos = this.scroll.target;
  }

  protected back() {
    this.app.router.menu();
  }

  protected update(dt: number) {
    this.diorama.update(dt);
    this.scroll.update(dt);
    this.sparks.update(dt);
    if (this.weave && this.t - this.weave.t0 > WEAVE_MS) {
      // the thread reached the next knot: it flares
      const next = this.weave.from + 1;
      if (next < JOURNEY.length) this.burst(next, 14);
      this.weave = null;
    }
  }

  wheel(dy: number, dx: number) {
    if (this.tab !== 'journey') return;
    const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    this.scroll.by(Math.sign(d) * Math.min(SPACING, Math.max(40, Math.abs(d))));
  }

  drag(dx: number) {
    if (this.tab === 'journey') this.scroll.shift(-dx);
  }

  /** A knot's x in the pathway's content (before scrolling). */
  private knotX(i: number): number {
    return FIRST + i * SPACING;
  }

  private contentW(): number {
    return this.knotX(JOURNEY.length) + SPACING / 2;
  }

  /** The thread's height at content x: level through every knot, arcing up and down between them. */
  private threadY(cx: number): number {
    return KNOT_Y + Math.round(Math.sin(((cx - FIRST) / SPACING) * Math.PI) * AMP);
  }

  /** How far the thread is woven: to the knot the Journey stands at (on past the last when all are claimed), mid-weave between two. */
  private wovenTo(): number {
    const a = this.archivist;
    if (this.weave) {
      const k = ease(Math.min(1, (this.t - this.weave.t0) / WEAVE_MS));
      return this.knotX(this.weave.from) + SPACING * k * (this.weave.from + 1 < JOURNEY.length ? 1 : 0.5);
    }
    const cur = currentQuest(a);
    return cur ? this.knotX(JOURNEY.indexOf(cur)) : this.knotX(JOURNEY.length - 1) + SPACING / 2;
  }

  private setTab(t: ChallengeTab) {
    this.tab = t;
  }

  /** Claims the chosen quest: its spool goes to storage or its Stardust to the Wishing Star, the thread weaves on, sparks fly off the knot. */
  private claim(q: QuestDef) {
    const find = claimQuest(this.archivist, q.id);
    if (!find) return;
    const i = JOURNEY.indexOf(q);
    this.found = { quest: q.id, find };
    this.weave = { from: i, t0: this.t };
    this.burst(i, 26);
  }

  private burst(i: number, n: number) {
    const x = BAND[0] + this.knotX(i) - this.scroll.offset;
    this.sparks.burst(x, KNOT_Y, n, ['#fffbe8', '#ffe070', '#f0c650', '#a8701e'], { speed: 60, up: 30, gravity: 40, life: 900, size: 1, additive: true });
  }

  // ---------------------------------------------------------------------------
  // drawing

  protected draw(ctx: CanvasRenderingContext2D) {
    this.diorama.draw(ctx, this.t, 0.72);
    const a = this.archivist;
    const claimed = a.claimed.length;
    this.header(ctx, 'CHALLENGES', `Journey: ${claimed} of ${JOURNEY.length} claimed`);
    this.tabs(ctx);
    if (this.tab === 'journey') {
      this.pathway(ctx);
      this.panel(ctx);
    } else this.placeholder(ctx, this.tab);
  }

  /** DAILY, PERSISTENT and JOURNEY, in his order; NEW on the Journey while a quest waits to be claimed. */
  private tabs(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    let tx = 12;
    for (const t of CHALLENGE_TABS) {
      const id = 'tab_' + t.id;
      const w = ui.measure(t.name) + 16;
      const on = this.tab === t.id;
      const hot = ui.hot(id, tx, 36, w, 16);
      nine(ctx, this.a.ui.img, ui.part(on ? 'tab_on' : 'tab_off'), tx, 36, w, 16, 5);
      ui.text(ctx, t.name, tx + 8, 40, { color: on || hot ? COLORS.goldHi : COLORS.dim });
      if (t.id === 'journey' && JOURNEY.some((q) => questState(this.archivist, q) === 'ready')) ui.blit(ctx, 'new', tx + w - 12, 31);
      ui.regions.push({ id, x: tx, y: 36, w, h: 16, click: () => this.setTab(t.id) });
      tx += w + 4;
    }
    if (this.tab === 'journey') ui.text(ctx, 'Claim a quest to open the next.', W - 14, 40, { color: COLORS.faint, align: 'right' });
  }

  /** The pathway: the band, its stars, the thread, the knots with their rewards and names. */
  private pathway(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    const [bx, by, bw, bh] = BAND;
    this.scroll.extent(this.contentW(), bw);
    const focused = JOURNEY.findIndex((q) => 'q_' + q.id === ui.focusId);
    if (ui.keyboard && focused >= 0) this.scroll.reveal(this.knotX(focused) - SPACING / 2, SPACING, bw);
    const off = this.scroll.offset;
    ui.panel(ctx, 'well', bx, by, bw, bh);
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx + 2, by + 2, bw - 4, bh - 4);
    ctx.clip();
    this.stars(ctx, off);
    this.thread(ctx, off);
    const all = JOURNEY.length + GHOSTS;
    for (let i = 0; i < all; i++) {
      const x = bx + this.knotX(i) - off;
      if (x < bx - 60 || x > bx + bw + 60) continue;
      if (i >= JOURNEY.length) this.ghost(ctx, x, i - JOURNEY.length);
      else this.knot(ctx, JOURNEY[i], i, x);
    }
    this.sparks.draw(ctx);
    ctx.restore();
    this.edgeArrows(ctx);
  }

  /** Arrows at the band's ends while the pathway runs on past them. */
  private edgeArrows(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    const [bx, by, bw, bh] = BAND;
    for (const [part, ax, more, d] of [['arrow_l', bx + 4, this.scroll.before, -1], ['arrow_r', bx + bw - 14, this.scroll.after, 1]] as const) {
      if (!more) continue;
      const ay = by + bh / 2 - 7;
      ui.blit(ctx, part, ax, ay);
      ui.regions.push({ x: ax - 4, y: ay - 6, w: 18, h: 27, click: () => this.scroll.by(d * SPACING) });
    }
  }

  /** A few faint stars in the band, twinkling slowly, scrolling a little slower than the pathway. */
  private stars(ctx: CanvasRenderingContext2D, off: number) {
    const [bx, by, bw, bh] = BAND;
    for (let i = 0; i < 40; i++) {
      const h1 = Math.sin(i * 127.1) * 43758.5453, h2 = Math.sin(i * 311.7) * 12543.2341;
      const fx = h1 - Math.floor(h1), fy = h2 - Math.floor(h2);
      const x = bx + 4 + Math.round(((fx * (bw + 200) - off * 0.5) % (bw - 8) + (bw - 8)) % (bw - 8));
      const y = by + 6 + Math.round(fy * (bh - 12));
      const k = 0.5 + 0.5 * Math.sin(this.t / (1400 + (i % 5) * 330) + i);
      ctx.globalAlpha = 0.15 + k * 0.35;
      ctx.fillStyle = i % 7 === 0 ? '#c8b8f0' : '#8a9ad8';
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  /** The thread: woven gold to `wovenTo`, a dotted line of starlight beyond it that fades past the last quest; motes climbing the woven part. */
  private thread(ctx: CanvasRenderingContext2D, off: number) {
    const [bx, , bw] = BAND;
    const woven = this.wovenTo();
    const last = this.knotX(JOURNEY.length - 1);
    for (let x = bx + 2; x < bx + bw - 2; x++) {
      const cx = x - bx + off;
      const y = this.threadY(cx);
      if (cx <= woven) {
        ctx.fillStyle = 'rgba(4,3,10,0.6)';
        ctx.fillRect(x, y + 2, 1, 1);
        ctx.fillStyle = '#ffe070';
        ctx.fillRect(x, y, 1, 1);
        ctx.fillStyle = '#b07a22';
        ctx.fillRect(x, y + 1, 1, 1);
        if ((cx * 7) % 23 === 0) {
          ctx.fillStyle = '#fffbe8';
          ctx.fillRect(x, y, 1, 1);
        }
      } else if (cx % 3 === 0) {
        ctx.globalAlpha = Math.max(0.12, Math.min(0.85, 1 - (cx - last) / (SPACING * 2.2)));
        ctx.fillStyle = '#7a6cb8';
        ctx.fillRect(x, y, 1, 1);
        ctx.globalAlpha = 1;
      }
    }
    // motes running along the woven thread, each on its own phase
    if (woven > 20) {
      for (let i = 0; i < 4; i++) {
        const cx = (this.t / 1000) * 22 + i * 61;
        const u = cx % woven;
        const x = bx + Math.round(u) - off, y = this.threadY(u);
        if (x < bx + 3 || x > bx + bw - 4) continue;
        const k = Math.sin((u / woven) * Math.PI);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.4 + k * 0.6;
        ctx.fillStyle = '#fff6d0';
        ctx.fillRect(x, y - 1, 1, 1);
        ctx.globalAlpha = (0.4 + k * 0.6) * 0.5;
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }

  /** A quest's knot on the thread: its reward above, its name and how it stands below; click to read it out. */
  private knot(ctx: CanvasRenderingContext2D, q: QuestDef, i: number, x: number) {
    const ui = this.ui;
    const st = this.weave && this.weave.from + 1 === i && this.t - this.weave.t0 < WEAVE_MS ? 'locked' : questState(this.archivist, q);
    const id = 'q_' + q.id;
    const sel = this.selected === q;
    const hot = ui.hot(id, x - 44, BAND[1] + 4, 88, BAND[3] - 8, BAND);
    const current = st === 'ready' || st === 'open';
    if (current) {
      const g = ui.part('camp_glow_' + (Math.floor(this.t / 160) % 3));
      blit(ctx, this.a.ui.img, g, x - Math.floor(g[2] / 2), KNOT_Y - Math.floor(g[3] / 2));
    }
    const part = st === 'claimed' ? 'quest_done' : st === 'ready' ? 'quest_ready' : st === 'open' ? 'quest_open' : 'quest_locked';
    const r = ui.part(part);
    const lift = hot && !sel ? 1 : 0;
    blit(ctx, this.a.ui.img, r, x - Math.floor(r[2] / 2), KNOT_Y - Math.floor(r[3] / 2) - lift);
    if (sel) ui.corners(ctx, x - 20, KNOT_Y - 20 - lift, 40, 40);
    // the reward on a plate above the knot: bobbing while it waits, checked once taken
    const bob = st === 'ready' ? Math.round(Math.sin(this.t / 420)) : 0;
    const py = KNOT_Y - 52 + bob;
    ui.panel(ctx, 'well', x - 13, py, 26, 26);
    ctx.globalAlpha = st === 'claimed' ? 0.45 : st === 'locked' ? 0.6 : 1;
    if (q.reward.kind === 'spool') ui.blit(ctx, `spool_${q.reward.pattern}_${q.reward.grade}`, x - 9, py + 4);
    else {
      const r = ui.part('stardust');
      blit(ctx, this.a.ui.img, r, x - Math.floor(r[2] / 2), py + 13 - Math.floor(r[3] / 2));
    }
    ctx.globalAlpha = 1;
    if (st === 'claimed') ui.blit(ctx, 'check', x + 6, py - 2);
    // the name on a banner, how it stands under it
    const label = q.title;
    const w = ui.measure(label, 'bold') + 30;
    const bx = Math.round(x - w / 2), by = KNOT_Y + 21;
    const b = ui.part('banner');
    ctx.globalAlpha = sel || hot ? 1 : st === 'locked' ? 0.6 : 0.85;
    ctx.drawImage(this.a.ui.img, b[0], b[1], 12, b[3], bx, by, 12, b[3]);
    ctx.drawImage(this.a.ui.img, b[0] + 12, b[1], 8, b[3], bx + 12, by, w - 24, b[3]);
    ctx.drawImage(this.a.ui.img, b[0] + b[2] - 12, b[1], 12, b[3], bx + w - 12, by, 12, b[3]);
    ctx.globalAlpha = 1;
    ui.text(ctx, label, x, by + 5, { color: sel || hot ? COLORS.goldHi : st === 'locked' ? '#b0a0a0' : '#ffe9a0', variant: 'bold', align: 'center' });
    const [status, color] = STATUS[st];
    ui.text(ctx, status, x, by + 22, { color, align: 'center' });
    ui.regions.push({ id, x: x - 44, y: BAND[1] + 4, w: 88, h: BAND[3] - 8, clip: BAND, click: () => (this.selected = q) });
  }

  /** A knot still to come: faint, nameless. */
  private ghost(ctx: CanvasRenderingContext2D, x: number, k: number) {
    const r = this.ui.part('quest_locked');
    ctx.globalAlpha = k === 0 ? 0.32 : 0.16;
    blit(ctx, this.a.ui.img, r, x - Math.floor(r[2] / 2), KNOT_Y - Math.floor(r[3] / 2));
    ctx.globalAlpha = 1;
    if (k === 0) this.ui.text(ctx, 'The Journey goes on.', x, KNOT_Y + 26, { color: COLORS.faint, align: 'center' });
  }

  /** The chosen quest read out: what to do and how it stands on the left, the reward on the right, the way on at the bottom. */
  private panel(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    const a = this.archivist;
    const q = this.selected;
    const i = JOURNEY.indexOf(q);
    const st = questState(a, q);
    const [px, py, pw, ph] = PANEL;
    ui.panel(ctx, 'dark', px, py, pw, ph);
    // left: the quest
    const title = q.title.toUpperCase();
    ui.text(ctx, title, px + 14, py + 11, { color: COLORS.goldHi, variant: 'bold' });
    ui.text(ctx, `Quest ${i + 1} of ${JOURNEY.length}`, px + 24 + ui.measure(title, 'bold'), py + 11, { color: COLORS.dim });
    let cy = py + 28;
    cy += ui.para(ctx, q.text, px + 14, cy, 380, { color: COLORS.text }) + 8;
    const [line, color] = this.standing(q, st);
    ui.para(ctx, line, px + 14, cy, 380, { color });
    // right: the reward
    const rx = px + 424;
    ctx.fillStyle = '#a8701e';
    ctx.fillRect(rx - 12, py + 10, 1, ph - 20);
    ui.text(ctx, st === 'claimed' ? 'REWARD TAKEN' : 'REWARD', rx, py + 11, { color: COLORS.dim, variant: 'bold' });
    const found = this.found?.quest === q.id ? this.found.find : null;
    const rw = q.reward;
    if (rw.kind === 'spool') {
      const p = pattern(rw.pattern);
      ui.blit(ctx, `bigspool_${rw.pattern}_${rw.grade}`, rx, py + 27);
      ui.text(ctx, `${GRADES[rw.grade]} ${patternName(rw.pattern)} spool`, rx + 30, py + 30, { color: PATTERN_TINT[rw.pattern] });
      if (found?.kind === 'spool') {
        ui.blit(ctx, spoolIcon(found.spool), rx + 30, py + 42);
        ui.text(ctx, statText(found.spool.main.stat, found.spool.main.value), rx + 51, py + 47, { color: COLORS.text });
        ui.text(ctx, 'Found: in Weaving now.', rx + 30, py + 63, { color: COLORS.good });
      } else ui.para(ctx, st === 'claimed' ? 'Taken, into Weaving.' : 'Its main stat is drawn when you claim it.', rx + 30, py + 42, 152, { color: COLORS.faint });
      if (p) ui.para(ctx, `${p.pieces} ${p.name} spools in a matrix weave ${patternBonusText(p)}.`, rx, py + 82, 180, { color: COLORS.faint });
    } else {
      ui.blit(ctx, 'bigstardust', rx, py + 27);
      ui.text(ctx, `${rw.amount} ${SUMMONING.fragment}`, rx + 30, py + 30, { color: STARDUST_TINT });
      if (found) ui.text(ctx, 'Found: at the Wishing Star now.', rx + 30, py + 44, { color: COLORS.good });
      else ui.para(ctx, st === 'claimed' ? 'Taken, to the Wishing Star.' : `Every ${FRAGMENTS_PER_SHARD} merge into a ${SUMMONING.shard}.`, rx + 30, py + 44, 152, { color: COLORS.faint });
      ui.para(ctx, `A ${SUMMONING.shard} summons a champion you do not have yet.`, rx, py + 82, 180, { color: COLORS.faint });
    }
    // the way on
    const bw = 150, bh = 24, bx = px + pw - 14 - bw, by = py + ph - 14 - bh;
    const act = this.action(q, st);
    if (act.second) ui.button(ctx, 'q_alt', bx - bw - 8, by, bw, bh, act.second.label, { click: act.second.click, kind: 'small' });
    ui.button(ctx, 'q_act', bx, by, bw, bh, act.label, { click: act.click ?? (() => {}), icon: act.icon, disabled: !act.click });
  }

  /** How a quest stands, in words and a colour. */
  private standing(q: QuestDef, st: QuestState): [string, string] {
    if (st === 'claimed') return ['Claimed.', COLORS.good];
    if (st === 'ready') return ['Done! Claim the reward.', COLORS.goldHi];
    if (st === 'locked') {
      const prev = JOURNEY[JOURNEY.indexOf(q) - 1];
      return [`Opens once "${prev.title}" is claimed.`, COLORS.dim];
    }
    const g = q.goal;
    if (g.kind === 'tutorial') return [this.archivist.tutorial === 'skipped' ? 'The tutorial was skipped: play it to the end.' : 'The tutorial is not finished yet.', COLORS.dim];
    if (g.kind === 'stage') return [`Stage ${g.stage} is not cleared yet.`, COLORS.dim];
    return ['No spool is woven into a matrix yet.', COLORS.dim];
  }

  /** The panel's button: claim the reward, or the way to the quest's goal (and the tutorial again once it is done, the Wishing Star once its Stardust is in). */
  private action(q: QuestDef, st: QuestState): { label: string; icon?: string; click?: () => void; second?: { label: string; click: () => void } } {
    const r = this.app.router;
    const tutorial = () => this.app.tutorial?.start();
    const replay = q.goal.kind === 'tutorial' && st !== 'open' ? { label: 'REPLAY TUTORIAL', click: tutorial } : undefined;
    const star = q.reward.kind === 'fragments' && st === 'claimed' && summonsReady(this.archivist) > 0 ? { label: 'TO THE WISHING STAR', click: () => r.summon() } : undefined;
    if (st === 'ready') return { label: 'CLAIM', icon: 'mi_play', click: () => this.claim(q), second: replay };
    if (st === 'claimed') return { label: 'CLAIMED', second: replay ?? star };
    if (st === 'locked') return { label: 'LOCKED' };
    if (q.goal.kind === 'tutorial') return { label: 'START TUTORIAL', icon: 'mi_play', click: tutorial };
    if (q.goal.kind === 'stage') return { label: 'TO THE CAMPAIGN', icon: 'mi_campaign', click: () => r.campaign() };
    return { label: 'OPEN WEAVING', icon: 'mi_weaving', click: () => r.weaving({ back: () => r.challenges() }) };
  }

  /** Daily and Persistent: rows of quests still to be written, and the word that they wait. */
  private placeholder(ctx: CanvasRenderingContext2D, tab: ChallengeTab) {
    const ui = this.ui;
    const def = CHALLENGE_TABS.find((t) => t.id === tab)!;
    const x = 130, w = W - 260;
    for (let i = 0; i < 4; i++) {
      const y = 70 + i * 48;
      ctx.globalAlpha = 0.5 - i * 0.1;
      ui.panel(ctx, 'dark', x, y, w, 40);
      blit(ctx, this.a.ui.img, ui.part('quest_locked'), x + 4, y + 4);
      ctx.fillStyle = '#26364f';
      ctx.fillRect(x + 46, y + 11, 120 - i * 14, 5);
      ctx.fillRect(x + 46, y + 23, 190 + i * 9, 3);
      ctx.fillRect(x + w - 70, y + 14, 56, 12);
      ctx.globalAlpha = 1;
    }
    ui.text(ctx, def.placeholder ?? '', W / 2, 282, { color: COLORS.text, align: 'center', variant: 'bold' });
    ui.text(ctx, 'Your quests wait on the Journey meanwhile.', W / 2, 297, { color: COLORS.dim, align: 'center' });
    ui.button(ctx, 'to_journey', W / 2 - 70, 316, 140, 24, 'TO THE JOURNEY', { click: () => this.setTab('journey'), kind: 'small' });
  }
}

/** What a knot says under its name, and in which colour. */
const STATUS: Record<QuestState, [string, string]> = {
  claimed: ['Claimed', COLORS.good],
  ready: ['Ready to claim', COLORS.goldHi],
  open: ['In progress', COLORS.text],
  locked: ['Locked', COLORS.faint],
};
