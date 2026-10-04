import './style.css';
import { H, Screen, W } from './engine/screen';
import { ALL_HEROES, ENEMY_TEAM, PLAYER_TEAM } from './game/data/heroes';
import { loadAssets } from './game/view/assets';
import { BattleScene } from './game/view/scene';

async function boot() {
  const root = document.getElementById('app')!;
  const screen = new Screen(root);
  const ctx = screen.ctx;

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
    screen.present();
    if (loading) requestAnimationFrame(drawLoading);
  };
  drawLoading();

  const assets = await loadAssets(
    ALL_HEROES.map((h) => h.id),
    (k) => (progress = k),
  );
  loading = false;

  const params = new URLSearchParams(location.search);
  const scene = new BattleScene(screen, assets, PLAYER_TEAM, ENEMY_TEAM, {
    seed: Number(params.get('seed') ?? Math.floor(Math.random() * 1e9)),
    auto: params.get('auto') === '1',
    speed: Number(params.get('speed') ?? 1),
  });

  const pos = (e: PointerEvent) => screen.toVirtual(e.clientX, e.clientY);
  screen.display.addEventListener('pointermove', (e) => {
    const p = pos(e);
    scene.pointerMove(p.x, p.y);
  });
  screen.display.addEventListener('pointerdown', (e) => {
    const p = pos(e);
    scene.click(p.x, p.y);
  });
  window.addEventListener('keydown', (e) => scene.key(e.key.length === 1 ? e.key.toLowerCase() : e.key));

  const loop = (now: number) => {
    scene.frame(now);
    screen.present();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  const demo = params.get('demo');
  if (demo) void scene.demo(demo, Number(params.get('target') ?? 0));
  else void scene.run();
  // handy for debugging and automated screenshots
  (window as unknown as { scene: BattleScene }).scene = scene;
}

void boot();
