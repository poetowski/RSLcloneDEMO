// Pixel renderer for rigged sprites.
//
// Every shape is rasterized at native resolution by testing pixel centers (no
// anti-aliasing), lit with one fixed key light (LIGHT_DIR, top-left/front),
// and quantized into its material ramp. Afterwards three passes give the
// hand-made look: shade cleanup (no orphan pixels), separation lines between
// overlapping forms, and a colored 1px silhouette outline.
import { Bitmap, RGBA } from './raster.ts';
import { BANDS, BASE, DEEP, HIGHLIGHT, LIGHT, LIGHT_DIR, Material, OUTLINE, normalize3 } from './palette.ts';

export interface V {
  x: number;
  y: number;
}

export interface Hit {
  nx: number;
  ny: number;
  nz: number;
  /** Along the primitive's main axis, 0..1 (where meaningful). */
  u: number;
  /** Across the main axis, -1..1 (where meaningful). */
  v: number;
}

/** Texture hook: returns an integer offset added to the ramp index. */
export type Tex = (h: Hit, x: number, y: number) => number;

export interface PrimOpts {
  mat: Material;
  z: number;
  group: string;
  /** Constant ramp offset; far-side limbs use -1. */
  shade?: number;
  tex?: Tex;
  /** Separation line painted on forms behind this one. */
  line?: 'strong' | 'soft' | 'none';
  /** Whether the silhouette outline wraps this primitive (default true). */
  outline?: boolean;
  /** Overrides the outline color around this primitive. */
  outlineColor?: RGBA;
  /** Forces a ramp index instead of lighting. */
  flat?: number;
  /** Forces an exact color (decals, smears). */
  color?: RGBA;
  minIdx?: number;
  maxIdx?: number;
  /** Disable orphan-pixel cleanup for this primitive (fine details). */
  noClean?: boolean;
}

export abstract class Prim {
  constructor(public o: PrimOpts) {}
  abstract bbox(): [number, number, number, number];
  abstract hit(px: number, py: number): Hit | null;
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

function sphereHit(dx: number, dy: number, r: number): [number, number, number] {
  const sx = dx / r, sy = dy / r;
  const s2 = sx * sx + sy * sy;
  const nz = Math.sqrt(Math.max(0, 1 - Math.min(1, s2)));
  return normalize3(sx, sy, nz);
}

// ---------------------------------------------------------------------------
// Primitives (all coordinates in screen space, pixel centers at +0.5)
// ---------------------------------------------------------------------------

/** Tapered capsule from a (radius ra) to b (radius rb); shaded as a tube. */
export class Capsule extends Prim {
  constructor(
    o: PrimOpts,
    public a: V,
    public b: V,
    public ra: number,
    public rb: number,
    /** Flatten the tube (0 = round, 1 = flat slab). */
    public flatness = 0,
  ) {
    super(o);
  }
  bbox(): [number, number, number, number] {
    const r = Math.max(this.ra, this.rb) + 1;
    return [
      Math.floor(Math.min(this.a.x, this.b.x) - r),
      Math.floor(Math.min(this.a.y, this.b.y) - r),
      Math.ceil(Math.max(this.a.x, this.b.x) + r),
      Math.ceil(Math.max(this.a.y, this.b.y) + r),
    ];
  }
  hit(px: number, py: number): Hit | null {
    const abx = this.b.x - this.a.x, aby = this.b.y - this.a.y;
    const l2 = abx * abx + aby * aby || 1e-6;
    const t = clamp(((px - this.a.x) * abx + (py - this.a.y) * aby) / l2, 0, 1);
    const cx = this.a.x + abx * t, cy = this.a.y + aby * t;
    const r = this.ra + (this.rb - this.ra) * t;
    const dx = px - cx, dy = py - cy;
    const d = Math.hypot(dx, dy);
    if (d > r) return null;
    let [nx, ny, nz] = sphereHit(dx, dy, r);
    if (this.flatness) [nx, ny, nz] = normalize3(nx * (1 - this.flatness), ny * (1 - this.flatness), nz + this.flatness);
    // signed across-axis coordinate
    const len = Math.sqrt(l2);
    const side = (dx * -aby + dy * abx) / len;
    return { nx, ny, nz, u: t, v: clamp(side / r, -1, 1) };
  }
}

/** Rotated ellipse shaded as a dome. */
export class Ellipse extends Prim {
  constructor(
    o: PrimOpts,
    public c: V,
    public rx: number,
    public ry: number,
    public rot = 0,
    public flatness = 0,
  ) {
    super(o);
  }
  bbox(): [number, number, number, number] {
    const r = Math.max(this.rx, this.ry) + 1;
    return [Math.floor(this.c.x - r), Math.floor(this.c.y - r), Math.ceil(this.c.x + r), Math.ceil(this.c.y + r)];
  }
  hit(px: number, py: number): Hit | null {
    const cs = Math.cos(-this.rot), sn = Math.sin(-this.rot);
    const dx = px - this.c.x, dy = py - this.c.y;
    const lx = dx * cs - dy * sn, ly = dx * sn + dy * cs;
    const qx = lx / this.rx, qy = ly / this.ry;
    const s = qx * qx + qy * qy;
    if (s > 1) return null;
    // back to screen orientation
    const c2 = Math.cos(this.rot), s2 = Math.sin(this.rot);
    let nx = qx * c2 - qy * s2, ny = qx * s2 + qy * c2;
    let nz = Math.sqrt(Math.max(0, 1 - s));
    if (this.flatness) {
      nx *= 1 - this.flatness;
      ny *= 1 - this.flatness;
      nz += this.flatness;
    }
    [nx, ny, nz] = normalize3(nx, ny, nz);
    return { nx, ny, nz, u: (qy + 1) / 2, v: qx };
  }
}

export type NormalMode =
  | { kind: 'flat'; n: [number, number, number] }
  | { kind: 'bevel'; w: number; n?: [number, number, number]; k?: number }
  | { kind: 'cyl'; a: V; b: V; r: number; bevel?: number }
  | { kind: 'dome'; c: V; r: number; ry?: number; bevel?: number };

/** Arbitrary polygon with a configurable normal field. */
export class Poly extends Prim {
  private bb: [number, number, number, number];
  constructor(
    o: PrimOpts,
    public pts: V[],
    public nm: NormalMode = { kind: 'bevel', w: 2 },
  ) {
    super(o);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) {
      x0 = Math.min(x0, p.x);
      y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x);
      y1 = Math.max(y1, p.y);
    }
    this.bb = [Math.floor(x0) - 1, Math.floor(y0) - 1, Math.ceil(x1) + 1, Math.ceil(y1) + 1];
  }
  bbox() {
    return this.bb;
  }
  private inside(px: number, py: number): boolean {
    let c = false;
    const p = this.pts;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      if (p[i].y > py !== p[j].y > py && px < ((p[j].x - p[i].x) * (py - p[i].y)) / (p[j].y - p[i].y) + p[i].x) c = !c;
    }
    return c;
  }
  /** Distance to boundary and outward normal of the closest edge. */
  private edge(px: number, py: number): [number, number, number] {
    let best = Infinity, ex = 0, ey = 0;
    const p = this.pts;
    // polygon orientation decides which side is "out"
    let area = 0;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) area += (p[j].x - p[i].x) * (p[j].y + p[i].y);
    const sgn = area > 0 ? 1 : -1;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const ax = p[j].x, ay = p[j].y, bx = p[i].x, by = p[i].y;
      const dx = bx - ax, dy = by - ay;
      const l2 = dx * dx + dy * dy || 1e-6;
      const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
      const qx = ax + dx * t, qy = ay + dy * t;
      const d = Math.hypot(px - qx, py - qy);
      if (d < best) {
        best = d;
        const l = Math.sqrt(l2);
        ex = (dy / l) * sgn;
        ey = (-dx / l) * sgn;
      }
    }
    return [best, ex, ey];
  }
  hit(px: number, py: number): Hit | null {
    if (!this.inside(px, py)) return null;
    const nm = this.nm;
    let n: [number, number, number];
    let u = 0, v = 0;
    let bevel = 0;
    if (nm.kind === 'flat') {
      n = normalize3(...nm.n);
    } else if (nm.kind === 'bevel') {
      n = nm.n ? normalize3(...nm.n) : [0, 0, 1];
      bevel = nm.w;
    } else if (nm.kind === 'cyl') {
      const ax = nm.b.x - nm.a.x, ay = nm.b.y - nm.a.y;
      const l = Math.hypot(ax, ay) || 1e-6;
      const ux = ax / l, uy = ay / l;
      const rx = px - nm.a.x, ry = py - nm.a.y;
      u = (rx * ux + ry * uy) / l;
      // perpendicular pointing to the right of the axis direction (screen)
      const s = clamp((rx * -uy + ry * ux) / nm.r, -0.97, 0.97);
      v = s;
      n = normalize3(-uy * s, ux * s, Math.sqrt(1 - s * s));
      bevel = nm.bevel ?? 0;
    } else {
      const ry = nm.ry ?? nm.r;
      n = sphereHit(px - nm.c.x, (py - nm.c.y) * (nm.r / ry), nm.r);
      u = (py - nm.c.y) / ry;
      v = (px - nm.c.x) / nm.r;
      bevel = nm.bevel ?? 0;
    }
    if (bevel > 0) {
      const [d, ex, ey] = this.edge(px, py);
      if (d < bevel) {
        const k = (nm.kind === 'bevel' ? nm.k ?? 1.2 : 1) * (1 - d / bevel);
        n = normalize3(n[0] + ex * k, n[1] + ey * k, n[2]);
      }
    }
    return { nx: n[0], ny: n[1], nz: n[2], u, v };
  }
}

/** Chain of tapered capsules (capes, braids, plumes, bows). */
export class Ribbon extends Prim {
  private segs: Capsule[] = [];
  private cum: number[] = [];
  private total = 0;
  constructor(
    o: PrimOpts,
    public pts: V[],
    public radii: number[],
    flatness = 0,
  ) {
    super(o);
    let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      this.segs.push(new Capsule(o, pts[i], pts[i + 1], radii[i], radii[i + 1], flatness));
      this.cum.push(acc);
      acc += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    }
    this.total = acc || 1;
  }
  bbox(): [number, number, number, number] {
    const b: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const s of this.segs) {
      const sb = s.bbox();
      b[0] = Math.min(b[0], sb[0]);
      b[1] = Math.min(b[1], sb[1]);
      b[2] = Math.max(b[2], sb[2]);
      b[3] = Math.max(b[3], sb[3]);
    }
    return b;
  }
  hit(px: number, py: number): Hit | null {
    let best: Hit | null = null, bestD = Infinity;
    for (let i = 0; i < this.segs.length; i++) {
      const h = this.segs[i].hit(px, py);
      if (!h) continue;
      const d = Math.abs(h.v);
      if (d < bestD) {
        bestD = d;
        const s = this.segs[i];
        const segLen = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
        best = { ...h, u: (this.cum[i] + h.u * segLen) / this.total };
      }
    }
    return best;
  }
}

/** Annular sector used for weapon smears. */
export class Arc extends Prim {
  constructor(
    o: PrimOpts,
    public c: V,
    public r0: number,
    public r1: number,
    /** Screen-space angles in radians; sweep goes from a0 to a1 (either direction). */
    public a0: number,
    public a1: number,
    /** Inner radius at the trailing end grows toward r1 (taper 0..1). */
    public taper = 0.7,
    /** Vertical squash (1 = circle) for flat horizontal swirls. */
    public sy = 1,
  ) {
    super(o);
  }
  bbox(): [number, number, number, number] {
    const r = this.r1 + 1;
    return [Math.floor(this.c.x - r), Math.floor(this.c.y - r * this.sy - 1), Math.ceil(this.c.x + r), Math.ceil(this.c.y + r * this.sy + 1)];
  }
  hit(px: number, py: number): Hit | null {
    const dx = px - this.c.x, dy = (py - this.c.y) / this.sy;
    const d = Math.hypot(dx, dy);
    if (d > this.r1) return null;
    const a = Math.atan2(dy, dx);
    const sweep = this.a1 - this.a0;
    let rel = a - this.a0;
    // wrap into the sweep direction
    if (sweep >= 0) {
      while (rel < 0) rel += Math.PI * 2;
      while (rel >= Math.PI * 2) rel -= Math.PI * 2;
    } else {
      while (rel > 0) rel -= Math.PI * 2;
      while (rel <= -Math.PI * 2) rel += Math.PI * 2;
    }
    const t = sweep === 0 ? 0 : rel / sweep; // 0 at trailing end, 1 at leading edge
    if (t < 0 || t > 1) return null;
    const inner = this.r1 - (this.r1 - this.r0) * (1 - this.taper + this.taper * t);
    if (d < inner) return null;
    const across = (d - inner) / Math.max(0.001, this.r1 - inner); // 0 inner .. 1 outer
    return { nx: 0, ny: 0, nz: 1, u: t, v: across };
  }
}

/** Explicit pixels (faces, emblems, rune glyphs). */
export class Pixels extends Prim {
  private map = new Map<number, RGBA>();
  constructor(
    o: PrimOpts,
    pts: { x: number; y: number; c: RGBA }[],
  ) {
    super(o);
    for (const p of pts) this.map.set(Math.floor(p.y) * 4096 + Math.floor(p.x), p.c);
  }
  bbox(): [number, number, number, number] {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const k of this.map.keys()) {
      const x = k % 4096, y = Math.floor(k / 4096);
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    return [x0, y0, x1, y1];
  }
  hit(px: number, py: number): Hit | null {
    const c = this.map.get(Math.floor(py) * 4096 + Math.floor(px));
    if (c === undefined) return null;
    return { nx: 0, ny: 0, nz: 1, u: 0, v: c };
  }
}

/** 1px Bresenham line (bowstrings, thin staves). */
export function linePixels(a: V, b: V): V[] {
  let x0 = Math.floor(a.x), y0 = Math.floor(a.y);
  const x1 = Math.floor(b.x), y1 = Math.floor(b.y);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  const out: V[] = [];
  for (;;) {
    out.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Frame rendering
// ---------------------------------------------------------------------------

export interface RenderOptions {
  /** Lighter outline on edges that face the key light (sel-out). */
  selout?: boolean;
}

export class Frame {
  prims: Prim[] = [];
  constructor(
    readonly w: number,
    readonly h: number,
  ) {}

  add<T extends Prim>(p: T): T {
    this.prims.push(p);
    return p;
  }

  render(opts: RenderOptions = {}): Bitmap {
    const { w, h } = this;
    const N = w * h;
    const mat: (Material | null)[] = new Array(N).fill(null);
    const idx = new Int8Array(N);
    const prim = new Int32Array(N).fill(-1);
    const group = new Int32Array(N).fill(-1);
    const zbuf = new Float32Array(N);
    const color = new Uint32Array(N); // exact color override (0 = none)
    const groups = new Map<string, number>();
    const gid = (g: string) => {
      let id = groups.get(g);
      if (id === undefined) groups.set(g, (id = groups.size));
      return id;
    };

    const order = this.prims.map((p, i) => ({ p, i })).sort((a, b) => a.p.o.z - b.p.o.z || a.i - b.i);
    const [Lx, Ly, Lz] = LIGHT_DIR;
    const [Hx, Hy, Hz] = normalize3(Lx, Ly, Lz + 1);

    for (const { p, i } of order) {
      const o = p.o;
      const [x0, y0, x1, y1] = p.bbox();
      const g = gid(o.group);
      for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) {
        for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) {
          const hit = p.hit(x + 0.5, y + 0.5);
          if (!hit) continue;
          const k = y * w + x;
          if (p instanceof Pixels) {
            // decal: keep the underlying material for outline purposes
            color[k] = hit.v >>> 0;
            if (!mat[k]) mat[k] = o.mat;
            prim[k] = i;
            group[k] = g;
            zbuf[k] = o.z;
            continue;
          }
          let ri: number;
          if (o.color !== undefined) {
            color[k] = o.color;
            ri = BASE;
          } else {
            color[k] = 0;
            if (o.flat !== undefined) ri = o.flat;
            else {
              const d = hit.nx * Lx + hit.ny * Ly + hit.nz * Lz;
              const b = BANDS[o.mat.kind];
              ri = d < b[0] ? DEEP : d < b[1] ? 2 : d < b[2] ? BASE : d < b[3] ? LIGHT : HIGHLIGHT;
              if (o.mat.kind === 'metal') {
                const s = hit.nx * Hx + hit.ny * Hy + hit.nz * Hz;
                ri = Math.min(ri, LIGHT);
                if (s > 0.985) ri = HIGHLIGHT;
              } else if (ri === HIGHLIGHT && o.mat.kind !== 'glow' && o.mat.kind !== 'hair') {
                ri = LIGHT;
              }
            }
            ri += o.shade ?? 0;
            if (o.tex) ri += o.tex(hit, x, y);
            ri = clamp(ri, o.minIdx ?? DEEP, o.maxIdx ?? HIGHLIGHT);
          }
          mat[k] = o.mat;
          idx[k] = ri;
          prim[k] = i;
          group[k] = g;
          zbuf[k] = o.z;
        }
      }
    }

    const P = this.prims;
    const nb = [-1, 1, -w, w];

    // 1) orphan cleanup: a lit pixel with no same-shade neighbour inside its
    //    own primitive adopts the majority shade around it.
    const idx2 = idx.slice();
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const k = y * w + x;
        const pi = prim[k];
        if (pi < 0 || color[k] || P[pi].o.noClean || idx[k] === HIGHLIGHT) continue;
        let same = 0;
        const counts = new Map<number, number>();
        let inPrim = 0;
        for (const d of nb) {
          const q = k + d;
          if (prim[q] !== pi || color[q]) continue;
          inPrim++;
          if (idx[q] === idx[k]) same++;
          else counts.set(idx[q], (counts.get(idx[q]) ?? 0) + 1);
        }
        if (same === 0 && inPrim >= 3) {
          let bestI = idx[k], bestC = 0;
          for (const [ci, cc] of counts) if (cc > bestC) [bestI, bestC] = [ci, cc];
          if (bestC >= 2) idx2[k] = bestI;
        }
      }
    }
    idx.set(idx2);

    // 2) separation lines: pixels of a form directly behind another form get darkened.
    const lineMark = new Uint8Array(N); // 1 strong, 2 soft
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const k = y * w + x;
        if (prim[k] < 0) continue;
        for (const d of nb) {
          const q = k + d;
          if ((d === -1 && x === 0) || (d === 1 && x === w - 1) || q < 0 || q >= N) continue;
          if (prim[q] < 0 || group[q] === group[k] || zbuf[q] <= zbuf[k]) continue;
          const mode = P[prim[q]].o.line ?? 'strong';
          if (mode === 'none') continue;
          const m = mode === 'strong' ? 1 : 2;
          if (lineMark[k] === 0 || m < lineMark[k]) lineMark[k] = m;
        }
      }
    }

    // 3) compose
    const out = new Bitmap(w, h);
    for (let k = 0; k < N; k++) {
      const m = mat[k];
      if (!m || prim[k] < 0) continue;
      let c: RGBA;
      if (color[k]) c = color[k];
      else if (lineMark[k] === 1) c = m.ramp[OUTLINE];
      else if (lineMark[k] === 2) c = m.ramp[Math.max(DEEP, idx[k] - 2)];
      else c = m.ramp[idx[k]];
      out.set(k % w, (k / w) | 0, c);
    }

    // 4) silhouette outline (4-neighbourhood), colored by the frontmost neighbour
    const final = out.clone();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const k = y * w + x;
        if (prim[k] >= 0) continue;
        let best = -1, bestZ = -Infinity, dirs = 0;
        for (let di = 0; di < 4; di++) {
          const d = nb[di];
          const q = k + d;
          if ((d === -1 && x === 0) || (d === 1 && x === w - 1) || q < 0 || q >= N) continue;
          if (prim[q] < 0) continue;
          const o = P[prim[q]].o;
          if (o.outline === false) continue;
          dirs |= 1 << di;
          if (zbuf[q] > bestZ) {
            bestZ = zbuf[q];
            best = q;
          }
        }
        if (best < 0) continue;
        const o = P[prim[best]].o;
        const m = mat[best]!;
        let c = o.outlineColor ?? (m.kind === 'glow' ? m.ramp[DEEP] : m.ramp[OUTLINE]);
        // sel-out: the outline softens where it borders a lit pixel on the light side
        if (opts.selout && m.kind !== 'glow' && !o.outlineColor) {
          // filled neighbour only to the right/below => this edge faces up-left (toward the light)
          const litSide = dirs & 0b1010 && !(dirs & 0b0101);
          if (litSide && idx[best] >= LIGHT) c = m.ramp[DEEP];
        }
        final.set(x, y, c);
      }
    }
    return final;
  }
}
