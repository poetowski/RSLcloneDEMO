import './style.css';
import { H, Screen as Canvas, W } from './engine/screen';
import { App } from './game/app';
import { newArchivist, recordClear, saveArchivist, unlockEverything } from './game/archivist';
import { PATTERN_IDS, STAT_IDS } from './game/data/matrix';
import { Grade, rollSpool } from './game/reliquary/matrix';
import { CHAMPIONS } from './game/data/champions';
import { allStages, STARTERS } from './game/data/campaign';
import { ZONES } from './game/data/zones';
import { AcademyScreen } from './game/screens/academy';
import { BattleScreen } from './game/screens/battle';
import { CampaignScreen } from './game/screens/campaign';
import { ChampionScreen } from './game/screens/champion';
import { CollectionScreen } from './game/screens/collection';
import { MainMenu } from './game/screens/menu';
import { OptionsScreen } from './game/screens/options';
import { RecruitScreen } from './game/screens/recruit';
import { TeamScreen } from './game/screens/team';
import { loadAssets } from './game/view/assets';

async function boot() {
  const root = document.getElementById('app')!;
  const canvas = new Canvas(root);
  const ctx = canvas.ctx;

  // minimal loading bar (the pixel font is itself an asset being loaded)
  let progress = 0;
  let loading = true;
  const drawLoading = () => {
    ctx.fillStyle = '#0b0f1c';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1c2438';
    ctx.fillRect(W / 2 - 80, H / 2 - 3, 160, 6);
    ctx.fillStyle = '#f0c650';
    ctx.fillRect(W / 2 - 80, H / 2 - 3, Math.round(160 * progress), 6);
    canvas.present();
    if (loading) requestAnimationFrame(drawLoading);
  };
  drawLoading();

  const assets = await loadAssets(
    CHAMPIONS.map((c) => c.id),
    ZONES.map((z) => z.id),
    (k) => (progress = k),
  );
  loading = false;

  const app = new App(canvas, assets);
  const params = new URLSearchParams(location.search);
  if (params.get('reset') === '1') {
    Object.assign(app.archivist, newArchivist());
    saveArchivist(app.archivist);
  }
  if (params.get('unlockall') === '1') unlockEverything(app.archivist);
  // ?spools=1 adds 24 sample spools to the stock (development and screenshots: spools have no sources yet)
  if (params.get('spools') === '1') {
    let seed = 11;
    const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    for (let i = 0; i < 24; i++) app.archivist.reliquary.addSpool(rollSpool(PATTERN_IDS[i % PATTERN_IDS.length], (i % 3) as Grade, STAT_IDS[i % STAT_IDS.length], rnd));
    saveArchivist(app.archivist);
  }
  // ?progress=2-1 clears every stage up to and including 2-1 (3 stars, recruits included)
  const upTo = params.get('progress');
  if (upTo) {
    for (const s of allStages()) {
      recordClear(app.archivist, s.id, 3);
      if (s.id === upTo) break;
    }
  }

  app.router = {
    menu: () => app.go(() => new MainMenu(app)),
    campaign: (stageId) => app.go(() => new CampaignScreen(app, stageId)),
    team: (stageId) => app.go(() => new TeamScreen(app, stageId)),
    battle: (stageId, team) => app.go(() => new BattleScreen(app, { stageId, team })),
    collection: () => app.go(() => new CollectionScreen(app)),
    champion: (id, list) => app.go(() => new ChampionScreen(app, id, list)),
    academy: (chapter) => app.go(() => new AcademyScreen(app, chapter)),
    options: () => app.go(() => new OptionsScreen(app)),
    recruit: (id) => app.go(() => new RecruitScreen(app, id, () => app.router.campaign())),
    demo: (skill, back) => app.go(() => new BattleScreen(app, { demo: skill, back })),
  };

  // deep links: ?screen=campaign|team|battle|collection|champion|academy|options|recruit
  //   &stage=1-2 &team=knight,monk &champion=monk &chapter=buffs   ?demo=<skill id>
  const r = app.router;
  const demo = params.get('demo');
  const stageId = params.get('stage') ?? '1-1';
  switch (demo ? 'demo' : params.get('screen')) {
    case 'demo':
      r.demo(demo!, () => r.menu());
      break;
    case 'campaign':
      r.campaign(params.get('stage') ?? undefined);
      break;
    case 'team':
      r.team(stageId);
      break;
    case 'battle':
      r.battle(stageId, (params.get('team') ?? app.archivist.team.join(',') ?? STARTERS.join(',')).split(',').filter(Boolean));
      break;
    case 'collection':
      r.collection();
      break;
    case 'champion':
      r.champion(params.get('champion') ?? 'knight');
      break;
    case 'academy':
      r.academy(params.get('chapter') ?? undefined);
      break;
    case 'options':
      r.options();
      break;
    case 'recruit':
      r.recruit(params.get('champion') ?? 'monk');
      break;
    default:
      r.menu();
  }

  const pos = (e: PointerEvent | WheelEvent) => canvas.toVirtual(e.clientX, e.clientY);
  // on screens that can be dragged (the campaign map) a press becomes a click on
  // release, unless the pointer travelled more than a few pixels: then it was a drag
  let press: { x: number; y: number; moved: boolean } | null = null;
  canvas.display.addEventListener('pointermove', (e) => {
    const p = pos(e);
    if (press && app.scene?.drag) {
      if (!press.moved && Math.hypot(p.x - press.x, p.y - press.y) > 3) press.moved = true;
      if (press.moved) {
        app.scene.drag(p.x - press.x, p.y - press.y);
        press.x = p.x;
        press.y = p.y;
        canvas.display.style.cursor = 'grabbing';
        return;
      }
    }
    const hot = app.scene?.pointerMove(p.x, p.y) ?? false;
    canvas.display.style.cursor = hot ? 'pointer' : 'default';
  });
  canvas.display.addEventListener('pointerdown', (e) => {
    const p = pos(e);
    app.scene?.pointerMove(p.x, p.y);
    if (app.scene?.drag) {
      press = { x: p.x, y: p.y, moved: false };
      canvas.display.setPointerCapture(e.pointerId);
    } else app.scene?.click(p.x, p.y);
  });
  const release = (e: PointerEvent, cancelled: boolean) => {
    if (!press) return;
    const p = pos(e);
    if (!press.moved && !cancelled) app.scene?.click(p.x, p.y);
    press = null;
    canvas.display.style.cursor = (app.scene?.pointerMove(p.x, p.y) ?? false) ? 'pointer' : 'default';
  };
  canvas.display.addEventListener('pointerup', (e) => release(e, false));
  canvas.display.addEventListener('pointercancel', (e) => release(e, true));
  canvas.display.addEventListener('wheel', (e) => {
    e.preventDefault();
    // some browsers report lines or pages instead of pixels
    const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 320 : 1;
    app.scene?.wheel?.(e.deltaY * k, e.deltaX * k);
  }, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (e.key.startsWith('Arrow') || e.key === ' ' || e.key === 'PageUp' || e.key === 'PageDown' || e.key === 'Backspace') e.preventDefault();
    app.scene?.key(e.key.length === 1 ? e.key.toLowerCase() : e.key, { shift: e.shiftKey });
  });

  const loop = (now: number) => {
    app.frame(now);
    canvas.present();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  // handy for debugging and automated screenshots
  (window as unknown as { app: App }).app = app;
}

void boot();
