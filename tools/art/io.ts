import fs from 'node:fs';
import path from 'node:path';

export function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 1) + '\n');
}
