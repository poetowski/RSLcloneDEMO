// Dev tool: lists effect frames whose pixels touch the edge of their box
// (the effect is cut off there), and frames that are completely empty. The
// same rule runs in `npm run audit`.
//   npx tsx tools/art/fxcheck.ts
import { FX } from './fx/index.ts';
import { fxEdges } from './fx/kit.ts';

for (const [name, d] of Object.entries(FX)) {
  const issues = fxEdges(d).map((e) => `[${e.frame}] ${e.empty ? 'empty' : Object.entries(e.cut).map(([k, n]) => `${k} ${n}`).join(', ')}`);
  if (issues.length) console.log(`${name.padEnd(16)} ${issues.join('; ')}`);
}
