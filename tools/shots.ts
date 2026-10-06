// Captures screenshots of the running game with the system Edge/Chrome.
//   npx tsx tools/shots.ts <url> <outPrefix> <steps> [width] [height]
// steps: comma-separated list of
//   w<ms>      wait
//   s          screenshot (<outPrefix>_<n>.png)
//   c<x>:<y>   click at game coordinates (640x360 space)
//   m<x>:<y>   move the mouse to game coordinates
//   k<key>     press a key
//   B<n>:<ms>  burst: n captures of the raw 640x360 game buffer, every ms
// Console errors and page errors are echoed.
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const [url = 'http://localhost:5173/', out = 'shot', steps = 'w3000,s', w = '1280', h = '720'] = process.argv.slice(2);
const channel = process.env.SHOT_CHANNEL ?? 'msedge';
const browser = await chromium.launch({ channel, headless: true });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1 });
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') console.log(`[console.${m.type()}]`, m.text());
});
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(url);
const scale = Math.floor(Math.min(Number(w) / 640, Number(h) / 360));
const ox = (Number(w) - 640 * scale) / 2, oy = (Number(h) - 360 * scale) / 2;
const at = (s: string) => {
  const [x, y] = s.split(':').map(Number);
  return [ox + x * scale, oy + y * scale] as const;
};
let n = 0;
for (const st of steps.split(',')) {
  const op = st[0], arg = st.slice(1);
  if (op === 'w') await page.waitForTimeout(Number(arg));
  else if (op === 's') {
    const file = `${out}_${n++}.png`;
    await page.screenshot({ path: file });
    console.log('shot', file);
  } else if (op === 'c') await page.mouse.click(...at(arg));
  else if (op === 'm') await page.mouse.move(...at(arg));
  else if (op === 'k') await page.keyboard.press(arg);
  else if (op === 'B') {
    const [count, every] = arg.split(':').map(Number);
    for (let i = 0; i < count; i++) {
      const data = await page.evaluate(() => (window as unknown as { app: { canvas: { buf: HTMLCanvasElement } } }).app.canvas.buf.toDataURL('image/png'));
      const file = `${out}_${n++}.png`;
      fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
      await page.waitForTimeout(every);
    }
    console.log('burst', count, 'frames');
  }
}
await browser.close();
