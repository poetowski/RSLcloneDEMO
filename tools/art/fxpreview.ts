// Dev tool: npx tsx tools/art/fxpreview.ts <out.png> [scale] [name,name]
import { fxPreview } from './fx/index.ts';
const [out = 'fx_preview.png', scale = '2', only] = process.argv.slice(2);
fxPreview(only ? only.split(',') : undefined).scaled(Number(scale)).save(out);
console.log('wrote', out);
