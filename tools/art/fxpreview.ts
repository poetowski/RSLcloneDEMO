// Dev tool: npx tsx tools/art/fxpreview.ts <out.png> [scale]
import { fxPreview } from './fx.ts';
const [out = 'fx_preview.png', scale = '2'] = process.argv.slice(2);
fxPreview().scaled(Number(scale)).save(out);
console.log('wrote', out);
