// Wraps the battle scene for the app: builds the setup from a campaign stage
// (or an Academy demonstration), records the result in the save and
// routes onward — recruit ceremony, next stage, retry or back to the map.
import { App, Screen } from '../app';
import { battleStats, recordClear } from '../archivist';
import { allStages, locationOf, stage } from '../data/campaign';
import { champion, CHAMPIONS } from '../data/champions';
import { homeZone, zone } from '../data/zones';
import { BattleScene, BattleSetup } from '../view/scene';

export class BattleScreen implements Screen {
  readonly scene: BattleScene;
  private recruited?: string;

  constructor(
    private app: App,
    o: { stageId: string; team: string[] } | { demo: string; back: () => void },
  ) {
    const p = app.archivist;
    if ('stageId' in o) {
      const st = stage(o.stageId);
      const setup: BattleSetup = {
        player: o.team.map(champion),
        playerStats: o.team.map((id) => battleStats(p, id)),
        enemy: st.enemies,
        zone: zone(locationOf(st.id).zone),
        stage: st,
        seed: Math.floor(Math.random() * 1e9),
        auto: p.settings.auto,
        speed: p.settings.speed,
        enemyHp: Number(new URLSearchParams(location.search).get('hp')) || undefined,
      };
      this.scene = new BattleScene(app.ctx, app.a, setup, {
        finish: (out) => {
          const victory = out.winner === 'player';
          const first = victory && !(p.stars[st.id] > 0);
          if (victory) this.recruited = recordClear(p, st.id, out.stars);
          return { victory, stars: out.stars, stageId: st.id, stageName: st.name, recruit: this.recruited ? champion(this.recruited) : undefined, firstClear: first, turns: out.turns };
        },
        next: () => {
          if (this.recruited) app.router.recruit(this.recruited);
          else {
            const list = allStages();
            const i = list.findIndex((s) => s.id === st.id);
            app.router.campaign(list[Math.min(list.length - 1, i + 1)].id);
          }
        },
        retry: () => app.router.battle(st.id, o.team),
        exit: () => app.router.campaign(st.id),
        settings: (auto, speed) => {
          p.settings = { auto, speed };
          app.save();
        },
      });
      void this.scene.run();
    } else {
      const owner = CHAMPIONS.find((c) => c.skills.some((s) => s.id === o.demo));
      if (!owner) throw new Error(`no champion has skill "${o.demo}"`);
      // the owner and two companions against three others from the far end of the roster
      const others = CHAMPIONS.filter((c) => c.id !== owner.id);
      const player = [owner, ...others.slice(0, 2)];
      const enemy = others.slice(2).reverse().slice(0, 3).map((c) => ({ champion: c.id }));
      const setup: BattleSetup = {
        player,
        enemy,
        zone: homeZone(owner.faction),
        seed: 7,
        auto: true,
        speed: 1,
      };
      this.scene = new BattleScene(app.ctx, app.a, setup, { exit: o.back });
      void this.scene.demo(o.demo, 0);
    }
  }

  frame(now: number) {
    this.scene.frame(now);
  }

  pointerMove(x: number, y: number) {
    return this.scene.pointerMove(x, y);
  }

  click(x: number, y: number) {
    if (this.app.busy) return;
    this.scene.click(x, y);
  }

  key(k: string) {
    if (this.app.busy) return;
    this.scene.key(k);
  }

  leave() {
    this.scene.stop();
  }
}
