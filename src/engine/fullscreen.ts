// Fullscreen where the browser allows it: not on an iPhone, nor in a frame
// without the permission, so the Options row asks `canFullscreen` first. A
// touch press is not yet a gesture the browser accepts (its release is), so a
// request refused on the press is made again on the click that follows it. In
// fullscreen a phone is held sideways, where the browser can lock it (Android).
export const canFullscreen = () => !!document.fullscreenEnabled && typeof document.documentElement.requestFullscreen === 'function';

export const isFullscreen = () => !!document.fullscreenElement;

let wanted: boolean | null = null;
let busy = false;

export function setFullscreen(on: boolean) {
  wanted = on;
  apply();
}

function apply() {
  if (wanted === null || busy) return;
  if (wanted === isFullscreen()) {
    wanted = null;
    return;
  }
  busy = true;
  const done = () => {
    busy = false;
    if (wanted === isFullscreen()) wanted = null;
  };
  if (wanted) {
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => {
      done();
      const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      o?.lock?.('landscape').catch(() => {});
    }, done);
  } else document.exitFullscreen().then(done, done);
}

// the click after a touch's release carries the gesture its press did not
window.addEventListener('click', apply, true);
