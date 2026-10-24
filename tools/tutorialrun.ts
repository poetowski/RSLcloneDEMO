// Plays the tutorial through in a fresh browser (a new account) and captures
// every step it shows, so the whole run can be reviewed at once.
//   npx tsx tools/tutorialrun.ts [url] [outPrefix] [start]
// `start` starts it as the Journey's START TUTORIAL does (a returning Archivist's save, e.g. ?progress=1-10).
// Each new step: a screenshot (<outPrefix>_<n>_<step>.png); then its button
// (a step that teaches) or a real click where its hand points (a step that
// asks for one; if the step is still up after a while, Enter, as a keyboard
// player would). While no step is up in battle, the player's turns are played with
// Enter (the chosen skill at the first target).
import { chromium } from 'playwright-core';

const [url = 'http://localhost:5173/?hp=0.1', out = 'tutorial', start] = process.argv.slice(2);
const browser = await chromium.launch({ channel: process.env.SHOT_CHANNEL ?? 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('[console.error]', m.text()));
await page.goto(url);
if (start) {
  await page.waitForTimeout(3000);
  await page.evaluate(() => (window as unknown as { app: any }).app.tutorial.start());
}

type State = { id: string | null; spot: number[] | null; point: number[] | null; next: boolean; running: boolean; scene: string; choice: boolean };
const state = () =>
  page.evaluate((): State => {
    const app = (window as unknown as { app: any }).app;
    const t = app?.tutorial;
    const st = t?.step;
    return { id: st?.id ?? null, spot: st?.spot ?? null, point: st?.point ?? null, next: !!st?.next, running: !!t?.running, scene: app?.scene?.constructor?.name ?? '', choice: !!app?.scene?.scene?.choice };
  });

let n = 0, lastKey = '', lastAct = 0, idle = 0, tries = 0;
const t0 = Date.now();
while (Date.now() - t0 < 180000) {
  await page.waitForTimeout(250);
  const s = await state();
  if (!s.running && n > 0) {
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}_${n++}_end.png` });
    console.log('ended on', s.scene);
    break;
  }
  if (!s.id) {
    // free play in battle: the player's turn, played with Enter
    if (s.scene === 'BattleScreen' && s.choice && ++idle > 3) {
      await page.keyboard.press('Enter');
      idle = 0;
    }
    continue;
  }
  idle = 0;
  const key = s.id + '|' + s.scene;
  if (key === lastKey && Date.now() - lastAct < 2500) continue;
  if (key !== lastKey) {
    tries = 0;
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}_${n++}_${s.id}.png` });
    console.log('step', s.id, s.scene, s.spot?.join(','));
  } else tries++;
  lastKey = key;
  lastAct = Date.now();
  if (s.next) await page.click('.tut-card button');
  else if (tries > 0) {
    console.log('  still up: Enter');
    await page.keyboard.press('Enter');
  } else if (s.point) await page.mouse.click(s.point[0] * 2, s.point[1] * 2);
  else if (s.spot) {
    const [x, y, w, h] = s.spot;
    await page.mouse.click((x + w / 2) * 2, (y + h / 2) * 2);
  }
}
await browser.close();
