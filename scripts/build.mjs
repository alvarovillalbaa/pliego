import { mkdir, lstat, copyFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_FILES } from './public-files.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(process.env.PLIEGO_OUTPUT_DIR || join(root, 'dist'));
if (output === resolve(root)) throw new Error('Build output cannot replace the source folder');
await mkdir(output, { recursive: true });
for (const name of PUBLIC_FILES) {
  const source = join(root, name), stat = await lstat(source);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Only regular source files may be published: ${name}`);
  await copyFile(source, join(output, name));
}
console.log(JSON.stringify({ publicFiles: PUBLIC_FILES.length, output }));
