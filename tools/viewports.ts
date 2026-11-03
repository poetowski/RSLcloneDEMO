// Opens the game at common window sizes (PC browser windows, a laptop at 125%
// Windows scaling, phones held either way, a tablet) with the system Edge/Chrome,
// captures each and reports how much of the window the game fills, at what scale.
//   npx tsx tools/viewports.ts [url] [outDir]
// A phone is emulated with touch and its device pixel ratio; the capture is in
// CSS pixels, as the page is laid out.
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const VIEWPORTS = [
  { name: 'pc-1080p-window', width: 1920, height: 969, dpr: 1 },
  { name: 'pc-1080p-fullscreen', width: 1920, height: 1080, dpr: 1 },
  { name: 'pc-1440p-window', width: 2560, height: 1305, dpr: 1 },
  { name: 'laptop-1366', width: 1366, height: 657, dpr: 1 },
  { name: 'laptop-125pct', width: 1536, height: 730, dpr: 1.25 },
  { name: 'mac-retina', width: 1440, height: 789, dpr: 2 },
  { name: 'pc-small-window', width: 900, height: 600, dpr: 1 },
  { name: 'phone-landscape', width: 844, height: 390, dpr: 3, mobile: true },
  { name: 'phone-portrait', width: 390, height: 844, dpr: 3, mobile: true },
  { name: 'android-landscape', width: 915, height: 356, dpr: 2.625, mobile: true },
  { name: 'tablet-landscape', width: 1180, height: 820, dpr: 2, mobile: true },
];

const [url = 'http://localhost:5173/?tutorial=0', outDir = 'viewports'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const channel = process.env.SHOT_CHANNEL ?? 'msedge';
const browser = await chromium.launch({ channel, headless: true });
for (const v of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: v.dpr, isMobile: !!v.mobile, hasTouch: !!v.mobile });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`[${v.name}] pageerror`, e.message));
  await page.goto(url);
  await page.waitForFunction(() => !!(window as unknown as { app?: unknown }).app, undefined, { timeout: 20000 });
  await page.waitForTimeout(1500);
  const g = await page.evaluate(() => {
    const c = (window as unknown as { app: { canvas: { grid: { ox: number; oy: number; scale: number; dpr: number }; display: HTMLCanvasElement } } }).app.canvas;
    return { ...c.grid, pw: c.display.width, ph: c.display.height };
  });
  const gw = (640 * g.scale) / g.dpr, gh = (360 * g.scale) / g.dpr;
  const fill = (100 * (gw * gh)) / (v.width * v.height);
  const file = `${outDir}/${v.name}.png`;
  await page.screenshot({ path: file });
  console.log(
    `${v.name.padEnd(20)} ${`${v.width}x${v.height}@${v.dpr}`.padEnd(16)} game ${Math.round(gw)}x${Math.round(gh)} css px, ` +
      `scale ${g.scale.toFixed(3)} device px per art px, fills ${fill.toFixed(0)}% of the window (canvas ${g.pw}x${g.ph})`,
  );
  await ctx.close();
}
await browser.close();
