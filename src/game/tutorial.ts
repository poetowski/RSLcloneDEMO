// The tutorial (Jakub, 2026-10-24: "create Tutorial. this is for new accounts.
// use driver.js to highlight spots and teach new plahyer basics. design and be
// creative. highlight where to click. tutorial should cobver basics and should
// be short."). It walks a new Archivist from the Sanctum through the campaign
// to a first battle at stage 1-1, its rewards, and the Challenges, where
// finishing it is the Journey's first quest. Words: data/tutorial.ts.
//
// driver.js draws the overlay with its cutout and places the popover. The game
// is one canvas, so what driver.js highlights is a plain element (the hole)
// laid over the canvas where the spot is and moved with it every frame;
// inside the cutout the canvas itself takes the click, outside it the overlay
// takes it. The popover's face is a card painted with the game's own font and
// panels at the game's pixel scale, and a layer over the overlay draws gold
// corners round the spot and, where to click, a gloved hand pointing at it.
//
// It is no fixed script: every frame it asks where the player is (which
// screen, what is open, whose turn) and shows the step that belongs there, so
// a retreat, a defeat or a wrong turn never lose it; while nothing is to be
// shown (an enemy's turn, the battle once its lessons are given) the game is
// the player's. Steps that teach once (the welcome, the turn meter, the first
// skill and target, a cooldown) remember they were shown. The first victory
// finishes it; the steps after it lead to the Challenges to claim that quest.
import { Alignment, Config, driver, Driver, PopoverDOM, Side } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../tutorial.css';
import { H, Screen as Canvas, W } from '../engine/screen';
import { App, TutorialControl } from './app';
import { saveArchivist } from './archivist';
import { Unit } from './battle/battle';
import { questState } from './challenges';
import { LOCATIONS } from './data/campaign';
import { JOURNEY } from './data/challenges';
import { TUTORIAL, TUTORIAL_PATH, TUTORIAL_SKIP, TutorialStepId } from './data/tutorial';
import { SkillDef } from './data/types';
import { BaseScreen } from './screens/base';
import { BattleScreen } from './screens/battle';
import { CampaignScreen } from './screens/campaign';
import { ChallengesScreen } from './screens/challenges';
import { MainMenu } from './screens/menu';
import { RecruitScreen } from './screens/recruit';
import { TeamScreen } from './screens/team';
import { COLORS, Region, Ui } from './ui/ui';
import { blit, nine, Rect4 } from './view/assets';
import { BattleScene } from './view/scene';

/** One step as it stands this frame. */
interface Step {
  id: TutorialStepId;
  /** the spot in game pixels; without one the card stands alone in the middle */
  spot?: Rect4;
  /** where the card goes beside the spot */
  side?: Side;
  align?: Alignment;
  /** the words filled into its text */
  vars?: Record<string, string>;
  /** a click on the spot is what it asks: the hand points there */
  click?: boolean;
  /** where in the spot the hand points, when not its middle (an enemy among several) */
  point?: [number, number];
  /** what Enter does on a click step: what the click would */
  act?: () => void;
  /** the work of its button, where nothing is to be clicked */
  next?: () => void;
  /** keys the screen still gets (the battle's own keys for choosing a target) */
  pass?: string[];
}

/** A button painted on the card, and where. */
interface CardButton {
  id: 'next' | 'skip' | 'stay' | 'confirm';
  label: string;
  /** a button in the game's style, or a faint link */
  kind: 'button' | 'link';
  r: Rect4;
}

const DRIVER: Config = {
  animate: true,
  duration: 320,
  overlayColor: '#04060e',
  overlayOpacity: 0.62,
  smoothScroll: false,
  allowClose: false,
  allowScroll: false,
  allowKeyboardControl: false,
  disableActiveInteraction: true,
  stagePadding: 0,
  stageRadius: 0,
  showButtons: [],
};

/** the card's inner margin and line height, game pixels */
const PAD = 9;
const LINE = 11;

/** A rect kept on the screen. */
function onScreen([x, y, w, h]: Rect4): Rect4 {
  const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
  return [x0, y0, Math.min(W, Math.round(x + w)) - x0, Math.min(H, Math.round(y + h)) - y0];
}

/** A region's rect, cut to the window it is clipped to. */
function rectOf(r: Region): Rect4 {
  if (!r.clip) return [r.x, r.y, r.w, r.h];
  const [cx, cy, cw, ch] = r.clip;
  const x0 = Math.max(r.x, cx), y0 = Math.max(r.y, cy);
  return [x0, y0, Math.min(r.x + r.w, cx + cw) - x0, Math.min(r.y + r.h, cy + ch) - y0];
}

/** The skill the first turn teaches: a stronger one that strikes the enemy and is ready, else the basic attack. */
function lessonSkill(sc: BattleScene, actor: Unit): SkillDef {
  const skills = actor.champion.skills;
  return skills.slice(1).find((k) => (k.target === 'enemy' || k.target === 'enemies') && sc.battle.ready(actor, k)) ?? skills[0];
}

export class Tutorial implements TutorialControl {
  private phase: 'core' | 'epilogue' | null = null;
  /** steps that teach once, shown already */
  private seen = new Set<string>();
  /** the skill the first turn teaches, and whose turn it was */
  private lesson: { actor: string; skill: SkillDef } | null = null;
  /** the battle's choice the target step was shown on: once it is made, the lesson is learnt */
  private targetChoice: object | null = null;
  /** campaign screens already asked to show the first area */
  private shownArea = new WeakSet<object>();
  private drv: Driver | null = null;
  /** the step on screen and its card's key; the skip question; the card's button under the pointer */
  private step: Step | null = null;
  private shownKey = '';
  private confirming = false;
  private hover: CardButton['id'] | null = null;
  private card: { el: HTMLDivElement; canvas: HTMLCanvasElement; buttons: CardButton[]; w: number; h: number; scale: number } | null = null;
  /** the element driver.js highlights, laid over the spot, and its last place */
  private hole: HTMLDivElement;
  private holeAt = '';
  /** the layer over the overlay: the corners and the hand */
  private fx: HTMLCanvasElement;
  /** where the corners stand, gliding after the spot */
  private fxRect: Rect4 | null = null;
  private ui: Ui;
  private t = 0;
  private last = 0;
  /** when the overlay was last clicked: the corners jump to show where to click */
  private nudgeT = -1e9;
  private still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(
    private app: App,
    private canvas: Canvas,
  ) {
    this.ui = new Ui(app.a);
    this.hole = document.createElement('div');
    this.hole.className = 'tut-hole';
    document.body.appendChild(this.hole);
    this.fx = document.createElement('canvas');
    this.fx.className = 'tut-fx';
    this.fx.hidden = true;
    document.body.appendChild(this.fx);
  }

  get running() {
    return this.phase !== null;
  }

  /** From the start, in the Sanctum; `here` stays on the screen shown (a deep link). */
  start(here = false) {
    this.phase = 'core';
    this.seen.clear();
    this.lesson = null;
    this.targetChoice = null;
    this.hide();
    if (!here && !(this.app.scene instanceof MainMenu)) this.app.router.menu();
  }

  /** From the first victory on: the steps that lead to the Challenges (deep links and screenshots). */
  startEpilogue() {
    this.phase = 'epilogue';
    this.hide();
  }

  frame(now: number) {
    const dt = this.last ? Math.min(100, now - this.last) : 16;
    this.last = now;
    this.t += dt;
    if (!this.phase) return;
    const step = this.situation();
    if (!step) {
      this.hide();
      return;
    }
    this.show(step);
    this.drawFx(step, dt);
  }

  /** A key while a step is up: the card's buttons and Enter on the spot work, Escape asks to skip, the screen gets only what the step lets through. Returns whether the tutorial took it. */
  key(e: KeyboardEvent): boolean {
    const st = this.step;
    if (!st) return false;
    if ((e.target as Element | null)?.closest?.('.driver-popover')) return true;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k.startsWith('Arrow') || k === ' ' || k === 'Backspace') e.preventDefault();
    if (this.confirming) {
      if (k === 'Escape') this.press('stay');
      return true;
    }
    if (k === 'Escape') {
      this.press('skip');
      return true;
    }
    if (st.pass?.includes(k)) return false;
    if (k === 'Enter' || k === ' ') {
      if (st.next) st.next();
      else st.act?.();
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // where the player is

  /** The step for this moment, or none (a dissolve, an enemy's turn, the battle's free play). */
  private situation(): Step | null {
    const s = this.app.scene;
    if (!this.app.settled || !s) return null;
    const epilogue = this.phase === 'epilogue';
    if (s instanceof BattleScreen) return this.inBattle(s.scene);
    if (s instanceof MainMenu) {
      if (epilogue) return { id: 'board', spot: s.spotOf('challenges'), point: s.middleOf('challenges'), side: 'right', click: true, act: this.region('m_challenges')?.click };
      if (!this.seen.has('welcome')) return { id: 'welcome', next: () => this.seen.add('welcome') };
      return { id: 'gate', spot: s.spotOf('campaign'), side: 'right', click: true, act: this.region('m_campaign')?.click };
    }
    if (s instanceof CampaignScreen) {
      if (epilogue) return this.at('home', 'back', 'bottom');
      const first = LOCATIONS[0];
      if (!s.openArea) {
        if (!this.shownArea.has(s)) {
          this.shownArea.add(s);
          s.showArea(first.id);
        }
        return this.at('area', 'loc_' + first.id, 'bottom', { area: first.name });
      }
      if (s.openArea !== first) return null;
      if (s.selectedStage !== first.stages[0]) return this.at('stage', 'st_' + first.stages[0].id, 'right');
      return this.at('prepare', 'p_go', 'left');
    }
    if (s instanceof TeamScreen && !epilogue) return this.at('fight', 'fight', 'left', { team: this.teamLine() });
    if (s instanceof RecruitScreen && epilogue) return this.at('recruit', 'go', 'top', { recruit: s.c.name });
    if (s instanceof ChallengesScreen && epilogue) {
      const first = JOURNEY[0], second = JOURNEY[1];
      const st = questState(this.app.archivist, first);
      if (st === 'claimed') {
        const r = second && this.region('q_' + second.id);
        return { id: 'farewell', spot: r ? rectOf(r) : undefined, side: 'bottom', vars: { next: second?.title ?? '' }, next: () => this.stop('end') };
      }
      if (s.tab !== 'journey') return this.at('journeyTab', 'tab_journey', 'bottom');
      if (st !== 'ready') return null;
      s.selected = first;
      return this.at('claim', 'q_act', 'left');
    }
    return null;
  }

  /** In battle: the turn meter, the first skill and target, a cooldown, then the result. */
  private inBattle(sc: BattleScene): Step | null {
    if (sc.demoSkill) return null;
    const res = sc.results;
    if (res) {
      if (!res.victory) return this.at('defeat', 'r_retry', 'bottom');
      this.finish();
      const recruit = res.recruit?.name;
      return this.at(recruit ? 'victoryRecruit' : 'victory', 'r_next', 'bottom', { recruit: recruit ?? '', button: recruit ? 'MEET THEM' : 'CONTINUE' });
    }
    const c = sc.choice;
    if (this.phase !== 'core' || !c || sc.paused) return null;
    if (this.targetChoice && this.targetChoice !== c) {
      this.seen.add('target');
      this.targetChoice = null;
    }
    if (!this.seen.has('meter')) return { id: 'meter', spot: [186, 0, 268, 62], side: 'bottom', next: () => this.seen.add('meter') };
    const skillAt = (i: number) => sc.hud.regions.find((r) => r.id === 'skill' + i);
    if (!this.seen.has('target')) {
      if (this.lesson?.actor !== c.actor.uid) this.lesson = { actor: c.actor.uid, skill: lessonSkill(sc, c.actor) };
      const sk = this.lesson.skill;
      const i = c.actor.champion.skills.indexOf(sk);
      if (c.skill !== sk) {
        const r = skillAt(i);
        if (!r) return null;
        return { id: 'skill', spot: rectOf(r), side: 'top', align: 'end', vars: { actor: c.actor.champion.name, skill: sk.name }, click: true, act: () => sc.pickSkill(sk), pass: [String(i + 1)] };
      }
      const aim = this.targetsSpot(sc);
      if (!aim) return null;
      this.targetChoice = c;
      const id = sk.target === 'enemies' ? 'targetAll' : sk.target === 'enemy' ? 'target' : 'targetAlly';
      return { id, spot: aim.spot, point: aim.point, side: 'left', vars: { skill: sk.name }, click: true, pass: ['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] };
    }
    if (!this.seen.has('cooldown')) {
      const i = c.actor.champion.skills.findIndex((k) => (c.actor.cooldowns[k.id] ?? 0) > 0);
      const r = i >= 0 ? skillAt(i) : undefined;
      if (r) return { id: 'cooldown', spot: rectOf(r), side: 'top', align: 'end', vars: { skill: c.actor.champion.skills[i].name }, next: () => this.seen.add('cooldown') };
    }
    return null;
  }

  /** A click step on one of the screen's regions; none until the screen has drawn it. */
  private at(id: TutorialStepId, region: string, side: Side, vars?: Record<string, string>, align?: Alignment): Step | null {
    const r = this.region(region);
    return r ? { id, spot: rectOf(r), side, align, vars, click: true, act: r.click } : null;
  }

  private region(id: string): Region | undefined {
    const s = this.app.scene;
    const ui = s instanceof BaseScreen ? s.ui : s instanceof BattleScreen ? s.scene.hud : null;
    return ui?.regions.find((r) => r.id === id);
  }

  /** Every champion the chosen skill can be aimed at, in one rect with room for their bars; the hand points at the nearest. */
  private targetsSpot(sc: BattleScene): { spot: Rect4; point: [number, number] } | null {
    const c = sc.choice!;
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    let point: [number, number] | null = null;
    const views = sc.battle.validTargets(c.actor, c.skill).map((u) => sc.views.get(u.uid)).filter((v) => v && !v.dead);
    for (const v of views.sort((p, q) => p!.x - q!.x)) {
      const b = v!.bounds();
      x0 = Math.min(x0, b.x);
      y0 = Math.min(y0, b.y);
      x1 = Math.max(x1, b.x + b.w);
      y1 = Math.max(y1, b.y + b.h);
      if (!point) {
        const ch = v!.chest();
        point = [Math.round(ch.x), Math.round(ch.y)];
      }
    }
    return point ? { spot: [x0 - 4, y0 - 14, x1 - x0 + 8, y1 - y0 + 20], point } : null;
  }

  /** "Captain Gareth stands ready." or the team's names. */
  private teamLine(): string {
    const s = this.app.scene;
    const names = (s instanceof TeamScreen ? s.picked : this.app.archivist.team).map((id) => this.app.a.champions[id]?.json.name ?? id);
    if (names.length === 1) return `${names[0]} stands ready.`;
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} stand ready.`;
  }

  /** The first victory: the tutorial is done, and the Journey's first quest with it. */
  private finish() {
    if (this.phase !== 'core') return;
    this.phase = 'epilogue';
    const a = this.app.archivist;
    if (a.tutorial !== 'done') {
      a.tutorial = 'done';
      saveArchivist(a);
    }
  }

  private stop(how: 'skip' | 'end') {
    const a = this.app.archivist;
    if (how === 'skip' && a.tutorial !== 'done') {
      a.tutorial = 'skipped';
      saveArchivist(a);
    }
    this.phase = null;
    this.hide();
  }

  // ---------------------------------------------------------------------------
  // driver.js and the card

  private hide() {
    if (this.drv) this.drv.destroy();
    this.drv = null;
    this.step = null;
    this.shownKey = '';
    this.card = null;
    this.confirming = false;
    this.hover = null;
    this.holeAt = '';
    this.fxRect = null;
    this.fx.hidden = true;
  }

  private show(step: Step) {
    const g = this.canvas.grid;
    const scale = g.scale / g.dpr;
    const key = `${step.id}|${JSON.stringify(step.vars ?? {})}|${this.confirming}|${scale}|${!!step.spot}`;
    this.step = step;
    const moved = this.placeHole(step.spot);
    if (key !== this.shownKey || !this.drv) {
      // a new step: what the pointer hovered for the last one lets go (the pointer is over the overlay now)
      if (key.split('|')[0] !== this.shownKey.split('|')[0]) this.app.scene?.pointerMove(-99, -99);
      this.shownKey = key;
      this.highlight(step);
    } else if (moved && !this.drv.getState('__transitionCallback')) this.drv.refresh();
  }

  /** Lays the hole over the spot; returns whether it moved. */
  private placeHole(spot?: Rect4): boolean {
    if (!spot) return false;
    const [x, y, w, h] = onScreen(spot);
    const a = this.canvas.toClient(x, y), b = this.canvas.toClient(x + w, y + h);
    const at = `${a.x}|${a.y}|${b.x}|${b.y}`;
    if (at === this.holeAt) return false;
    this.holeAt = at;
    const st = this.hole.style;
    st.left = `${a.x}px`;
    st.top = `${a.y}px`;
    st.width = `${b.x - a.x}px`;
    st.height = `${b.y - a.y}px`;
    return true;
  }

  private highlight(step: Step) {
    const g = this.canvas.grid;
    const config: Config = { ...DRIVER, popoverOffset: Math.round((9 * g.scale) / g.dpr), overlayClickBehavior: () => (this.nudgeT = this.t) };
    if (!this.drv) this.drv = driver(config);
    else this.drv.setConfig(config);
    this.card = this.buildCard(step);
    const t = this.confirming ? TUTORIAL_SKIP : TUTORIAL[step.id];
    this.drv.highlight({
      element: step.spot ? this.hole : undefined,
      popover: {
        title: t.title,
        description: this.fill(t.text, step),
        side: step.side,
        align: step.align ?? 'center',
        showButtons: [],
        popoverClass: 'tut-pop',
        onPopoverRender: (pop: PopoverDOM) => this.card && pop.wrapper.appendChild(this.card.el),
      },
    });
  }

  private fill(s: string, step: Step): string {
    return s.replace(/\{(\w+)\}/g, (_, k: string) => step.vars?.[k] ?? '');
  }

  /** The card: its words, the pips of the way through, its buttons; painted in game pixels, with an element over every button for the pointer and the keyboard. */
  private buildCard(step: Step) {
    const font = this.app.a.font;
    const g = this.canvas.grid;
    const scale = g.scale / g.dpr;
    const buttons: CardButton[] = [];
    let title: string, lines: string[], act: string | undefined, w: number;
    if (this.confirming) {
      w = 200;
      title = TUTORIAL_SKIP.title;
      lines = font.wrap(TUTORIAL_SKIP.text, w - 2 * PAD);
      buttons.push({ id: 'stay', label: TUTORIAL_SKIP.stay, kind: 'button', r: [0, 0, 0, 0] }, { id: 'confirm', label: TUTORIAL_SKIP.skip, kind: 'button', r: [0, 0, 0, 0] });
    } else {
      const t = TUTORIAL[step.id];
      w = step.spot ? 196 : 236;
      title = t.title;
      lines = font.wrap(this.fill(t.text, step), w - 2 * PAD);
      act = t.act ? this.fill(t.act, step) : undefined;
      if (step.next) buttons.push({ id: 'next', label: t.next ?? 'NEXT', kind: 'button', r: [0, 0, 0, 0] });
      if (step.id !== 'farewell') buttons.push({ id: 'skip', label: this.phase === 'epilogue' ? TUTORIAL_SKIP.close : TUTORIAL_SKIP.link, kind: 'link', r: [0, 0, 0, 0] });
    }
    let y = 20 + lines.length * LINE;
    if (act) y += 3 + LINE;
    const fy = y + 4;
    const h = fy + 16 + 7;
    // the buttons, right to left from the corner; a link sits a little apart
    let rx = w - PAD;
    for (const b of [...buttons].reverse()) {
      const bw = b.kind === 'button' ? font.measure(b.label) + 18 : font.measure(b.label) + 4;
      rx -= bw;
      b.r = [rx, fy, bw, 16];
      rx -= b.kind === 'link' ? 6 : 4;
    }
    const el = document.createElement('div');
    el.className = 'tut-card';
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * g.scale);
    canvas.height = Math.round(h * g.scale);
    canvas.style.width = `${w * scale}px`;
    canvas.style.height = `${h * scale}px`;
    el.appendChild(canvas);
    const card = { el, canvas, buttons, w, h, scale: g.scale };
    for (const b of buttons) {
      // links are not buttons to the focus: Enter on a click step must not skip
      const btn = document.createElement(b.kind === 'button' ? 'button' : 'span');
      btn.className = 'tut-btn';
      if (b.kind === 'button') (btn as HTMLButtonElement).type = 'button';
      else btn.setAttribute('role', 'button');
      btn.setAttribute('aria-label', b.label);
      Object.assign(btn.style, { left: `${b.r[0] * scale}px`, top: `${b.r[1] * scale}px`, width: `${b.r[2] * scale}px`, height: `${b.r[3] * scale}px` });
      btn.addEventListener('click', () => this.press(b.id));
      const lit = (on: boolean) => {
        this.hover = on ? b.id : this.hover === b.id ? null : this.hover;
        this.paint(card, title, lines, act, step);
      };
      btn.addEventListener('pointerenter', () => lit(true));
      btn.addEventListener('pointerleave', () => lit(false));
      btn.addEventListener('focus', () => lit(true));
      btn.addEventListener('blur', () => lit(false));
      el.appendChild(btn);
    }
    this.paint(card, title, lines, act, step);
    return card;
  }

  private paint(card: NonNullable<Tutorial['card']>, title: string, lines: string[], act: string | undefined, step: Step) {
    const ui = this.ui;
    const ctx = card.canvas.getContext('2d')!;
    ctx.setTransform(card.scale, 0, 0, card.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, card.w, card.h);
    nine(ctx, this.app.a.ui.img, ui.part('panel_gold'), 0, 0, card.w, card.h, 6);
    ui.text(ctx, title, PAD, 7, { color: COLORS.goldHi, variant: 'bold' });
    lines.forEach((l, i) => ui.text(ctx, l, PAD, 20 + i * LINE, { color: COLORS.text }));
    if (act) {
      // a small gold arrow before what to click
      const ay = 23 + lines.length * LINE;
      ctx.fillStyle = COLORS.goldHi;
      for (let i = 0; i < 3; i++) ctx.fillRect(PAD + i, ay + 1 + i, 1, 7 - 2 * i);
      ui.text(ctx, act, PAD + 6, ay, { color: COLORS.goldHi });
    }
    // the pips: the way through, passed, here, still to come
    if (!this.confirming) {
      let at = TUTORIAL_PATH.indexOf(step.id);
      if (at < 0) at = TUTORIAL_PATH.indexOf(({ stage: 'area', targetAll: 'target', targetAlly: 'target', cooldown: 'target', victoryRecruit: 'victory', defeat: 'victory', recruit: 'victory', journeyTab: 'board' } as Partial<Record<TutorialStepId, TutorialStepId>>)[step.id] ?? 'welcome');
      const py = card.h - 7 - 10;
      TUTORIAL_PATH.forEach((_, i) => {
        const x = PAD + 1 + i * 6;
        ctx.fillStyle = i < at ? '#a8701e' : i === at ? COLORS.goldHi : '#2c3854';
        ctx.fillRect(x, py, 1, 3);
        ctx.fillRect(x - 1, py + 1, 3, 1);
      });
    }
    for (const b of card.buttons) {
      const hot = this.hover === b.id;
      const [x, y, bw, bh] = b.r;
      if (b.kind === 'button') {
        nine(ctx, this.app.a.ui.img, ui.part(hot ? 'btn_hover' : 'btn_up'), x, y, bw, bh, 4);
        ui.text(ctx, b.label, x + bw / 2, y + 4, { color: hot ? COLORS.goldHi : COLORS.text, align: 'center' });
      } else ui.text(ctx, b.label, x + 2, y + 4, { color: hot ? COLORS.text : COLORS.faint });
    }
  }

  /** A button on the card. */
  private press(id: CardButton['id']) {
    const st = this.step;
    if (!st) return;
    if (id === 'next') st.next?.();
    else if (id === 'skip') {
      if (this.phase === 'epilogue') this.stop('end');
      else this.confirming = true;
    } else if (id === 'stay') this.confirming = false;
    else if (id === 'confirm') this.stop('skip');
    this.hover = null;
  }

  // ---------------------------------------------------------------------------
  // the layer over the overlay

  /** Gold corners round the spot, breathing, gliding after it as it moves; and on a click step the hand, pointing at it. */
  private drawFx(step: Step, dt: number) {
    const fx = this.fx;
    const d = this.canvas.display;
    if (fx.width !== d.width || fx.height !== d.height) {
      fx.width = d.width;
      fx.height = d.height;
    }
    fx.hidden = false;
    const ctx = fx.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, fx.width, fx.height);
    if (!step.spot || this.confirming) {
      this.fxRect = null;
      return;
    }
    const g = this.canvas.grid;
    ctx.setTransform(g.scale, 0, 0, g.scale, g.ox, g.oy);
    ctx.imageSmoothingEnabled = false;
    const to = onScreen(step.spot);
    const k = Math.min(1, dt / 70);
    this.fxRect = this.fxRect ? (this.fxRect.map((v, i) => v + (to[i] - v) * k) as Rect4) : to;
    const [x, y, w, h] = this.fxRect.map(Math.round);
    const nudge = Math.max(0, 1 - (this.t - this.nudgeT) / 450);
    const out = 3 + (this.still ? 0 : Math.round(Math.sin(this.t / 290))) + Math.round(nudge * 4);
    this.ui.corners(ctx, x - out, y - out, w + 2 * out, h + 2 * out, 6);
    if (!step.click) return;
    // the hand: under the spot pointing up, or over it pointing down when the card or the screen's edge is below;
    // at a point in the spot (an enemy among several) it points there from under it
    const hand = this.ui.part('tut_hand');
    const bob = this.still ? 0 : Math.round((1 - Math.cos(this.t / 190)) * 1.5 + nudge * 3);
    if (step.point) {
      blit(ctx, this.app.a.ui.img, hand, step.point[0] - 7, step.point[1] + 2 + bob);
      return;
    }
    const cx = Math.round(x + w / 2) - 7;
    const below = step.side !== 'bottom' ? y + h + 24 <= H : y - 24 < 0;
    if (below) blit(ctx, this.app.a.ui.img, hand, cx, y + h + 2 + bob);
    else {
      ctx.save();
      ctx.translate(0, y - 2 - bob);
      ctx.scale(1, -1);
      blit(ctx, this.app.a.ui.img, hand, cx, 0);
      ctx.restore();
    }
  }
}
