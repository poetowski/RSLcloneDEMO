// The application shell: owns the canvas, the loaded assets and the player's
// profile, routes input to the current screen and switches screens with a
// dithered dissolve. Screens are created through the navigation helpers at
// the bottom so every route (and every URL deep link) goes through one place.
import { H, Screen as Canvas, W } from '../engine/screen';
import { loadProfile, Profile, saveProfile } from './profile';
import { Assets } from './view/assets';

/** One full-screen state of the game (menu, map, battle...). */
export interface Screen {
  /** update and draw into the app canvas */
  frame(now: number): void;
  /** returns true when the pointer is over something clickable */
  pointerMove(x: number, y: number): boolean;
  click(x: number, y: number): void;
  key(k: string): void;
  /** mouse wheel (scrolling lists) */
  wheel?(dy: number): void;
  leave?(): void;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export class App {
  scene: Screen | null = null;
  profile: Profile;
  private pending: (() => Screen) | null = null;
  private trans = 0; // 0 = idle, >0 = covering (ms), <0 = revealing (ms)
  private patterns: CanvasPattern[] = [];
  private lastNow = 0;
  /** registered by main.ts: builds screens by route name */
  router!: Router;

  constructor(
    readonly canvas: Canvas,
    readonly a: Assets,
  ) {
    this.profile = loadProfile();
    const ctx = canvas.ctx;
    for (let k = 0; k <= 16; k++) {
      const c = document.createElement('canvas');
      c.width = c.height = 4;
      const g = c.getContext('2d')!;
      g.fillStyle = '#05060a';
      for (let i = 0; i < 16; i++) if (BAYER[i] < k) g.fillRect(i % 4, Math.floor(i / 4), 1, 1);
      this.patterns.push(ctx.createPattern(c, 'repeat')!);
    }
  }

  get ctx() {
    return this.canvas.ctx;
  }

  save() {
    saveProfile(this.profile);
  }

  /** Switch screens through a dissolve (instant when `now` is true). */
  go(make: () => Screen, now = false) {
    if (now || !this.scene) {
      this.scene?.leave?.();
      this.scene = make();
      this.trans = -1;
      return;
    }
    this.pending = make;
    this.trans = 1;
  }

  frame(now: number) {
    const dt = this.lastNow ? Math.min(100, now - this.lastNow) : 16;
    this.lastNow = now;
    this.scene?.frame(now);
    const D = 170;
    if (this.trans > 0) {
      this.trans += dt;
      this.cover(Math.min(1, this.trans / D));
      if (this.trans >= D && this.pending) {
        this.scene?.leave?.();
        this.scene = this.pending();
        this.pending = null;
        this.trans = -1;
      }
    } else if (this.trans < 0) {
      this.trans -= dt;
      const k = 1 - Math.min(1, -this.trans / (D + 60));
      this.cover(k);
      if (k <= 0) this.trans = 0;
    }
  }

  private cover(k: number) {
    if (k <= 0) return;
    const ctx = this.ctx;
    ctx.fillStyle = this.patterns[Math.round(k * 16)];
    ctx.fillRect(0, 0, W, H);
  }

  get busy() {
    return this.trans > 0;
  }
}

export interface Router {
  menu(): void;
  campaign(stageId?: string): void;
  team(stageId: string): void;
  battle(stageId: string, team: string[]): void;
  collection(): void;
  champion(id: string, list?: string[]): void;
  academy(chapter?: string): void;
  options(): void;
  recruit(id: string): void;
  demo(skillId: string, back: () => void): void;
}
