// Sprite gallery: plays every hero animation, effect and icon from the
// generated atlases so the art can be reviewed without starting a battle.
import './gallery.css';
import { ALL_HEROES } from './game/data/heroes';
import { Assets, loadAssets } from './game/view/assets';

const root = document.getElementById('root')!;
const flipEl = document.getElementById('flip') as HTMLInputElement;
const zoomEl = document.getElementById('zoom') as HTMLSelectElement;
const speedEl = document.getElementById('speed') as HTMLSelectElement;

interface Cell {
  canvas: HTMLCanvasElement;
  draw: (t: number) => void;
}
const cells: Cell[] = [];

function section(title: string, sub: string, color = '#ffe070'): HTMLElement {
  const s = document.createElement('section');
  s.innerHTML = `<h2 style="color:${color}">${title}</h2><p>${sub}</p>`;
  const grid = document.createElement('div');
  grid.className = 'grid';
  s.appendChild(grid);
  root.appendChild(s);
  return grid;
}

function cell(grid: HTMLElement, label: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, t: number, c: HTMLCanvasElement) => void) {
  const fig = document.createElement('figure');
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const cap = document.createElement('figcaption');
  cap.textContent = label;
  fig.append(c, cap);
  grid.appendChild(fig);
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  cells.push({ canvas: c, draw: (t) => draw(g, t, c) });
}

function heroes(a: Assets) {
  for (const h of ALL_HEROES) {
    const art = a.heroes[h.id];
    const grid = section(`${h.name}, ${h.title}`, `${h.role} - ${h.faction}. Sprite height ${art.json.pivotY - art.json.frames['R/idle/0'][5]}px, frame box ${art.json.frameW}x${art.json.frameH}.`, h.color);
    for (const [name, an] of Object.entries(art.json.anims)) {
      const total = an.ms.reduce((s, m) => s + m, 0);
      const skill = h.skills.find((s) => s.anim === name);
      const label = `${name}${skill ? ` - ${skill.name}` : ''} (${an.ms.length}f)`;
      const W = 168, H = 120;
      cell(grid, label, W, H, (g, t) => {
        const face = flipEl.checked ? 'L' : 'R';
        const loopT = an.loop ? t % total : t % (total + 600);
        let i = 0, acc = 0;
        while (i < an.ms.length - 1 && acc + an.ms[i] <= loopT) acc += an.ms[i++];
        g.fillStyle = '#2c3648';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#232b3a';
        g.fillRect(0, H - 12, W, 12);
        const f = art.json.frames[`${face}/${name}/${i}`];
        const px = W / 2, py = H - 12;
        g.drawImage(art.img, f[0], f[1], f[2], f[3], Math.round(px - art.json.pivotX + f[4]), Math.round(py - art.json.pivotY + f[5]), f[2], f[3]);
        if (an.hits.includes(i)) {
          g.strokeStyle = '#ffd040';
          g.strokeRect(0.5, 0.5, W - 1, H - 1);
        }
      });
    }
  }
}

function effects(a: Assets) {
  const grid = section('Effects', 'Combat effects from public/assets/fx/fx.png, each with its anchor marked.');
  for (const [name, an] of Object.entries(a.fx.json.anims)) {
    const W = Math.max(64, an.w + 8), H = Math.max(48, an.h + 8);
    cell(grid, `${name} (${an.frames.length}f)`, W, H, (g, t) => {
      const total = an.frames.length * an.ms + 300;
      const i = Math.min(an.frames.length - 1, Math.floor((t % total) / an.ms));
      g.fillStyle = '#1c2230';
      g.fillRect(0, 0, W, H);
      const r = an.frames[i];
      const ox = Math.round((W - an.w) / 2), oy = Math.round((H - an.h) / 2);
      g.drawImage(a.fx.img, r[0], r[1], r[2], r[3], ox + r[4], oy + r[5], r[2], r[3]);
      g.fillStyle = '#ff4a4a';
      g.fillRect(ox + Math.round(an.w * an.ax), oy + Math.round(an.h * an.ay), 1, 1);
    });
  }
}

function icons(a: Assets) {
  const grid = section('Skill icons', 'A1 / A2 / A3 for every hero (40x40, gold frame, signature-color background).');
  for (const h of ALL_HEROES) {
    for (const s of h.skills) {
      const r = a.ui.json.icons[s.id];
      cell(grid, `${s.name} (A${s.slot})`, 48, 48, (g) => {
        g.fillStyle = '#141a28';
        g.fillRect(0, 0, 48, 48);
        g.drawImage(a.ui.img, r[0], r[1], r[2], r[3], 4, 4, r[2], r[3]);
      });
    }
  }
  const sg = section('Status icons', 'Buffs have a blue rim, debuffs a red rim (12x12).');
  for (const [id, st] of Object.entries(a.ui.json.status)) {
    cell(sg, id, 24, 24, (g) => {
      g.fillStyle = '#141a28';
      g.fillRect(0, 0, 24, 24);
      g.drawImage(a.ui.img, st.rect[0], st.rect[1], 12, 12, 6, 6, 12, 12);
    });
  }
}

function applyZoom() {
  const z = Number(zoomEl.value);
  for (const c of cells) {
    c.canvas.style.width = c.canvas.width * z + 'px';
    c.canvas.style.height = c.canvas.height * z + 'px';
  }
}

async function main() {
  const a = await loadAssets(ALL_HEROES.map((h) => h.id));
  heroes(a);
  effects(a);
  icons(a);
  applyZoom();
  zoomEl.addEventListener('change', applyZoom);
  let t = 0, last = performance.now();
  const loop = (now: number) => {
    t += (now - last) * Number(speedEl.value);
    last = now;
    for (const c of cells) c.draw(t);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

void main();
