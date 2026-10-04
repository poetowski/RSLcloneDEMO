const base = import.meta.env.BASE_URL;

export function url(path: string): string {
  return base + path.replace(/^\//, '');
}

export function loadImage(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('failed to load ' + path));
    img.src = url(path);
  });
}

export async function loadJson<T>(path: string): Promise<T> {
  const r = await fetch(url(path));
  if (!r.ok) throw new Error('failed to load ' + path);
  return (await r.json()) as T;
}

/** Solid-color silhouette of an image (hit flashes, freeze tint). */
export function silhouette(img: CanvasImageSource & { width: number; height: number }, color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}
