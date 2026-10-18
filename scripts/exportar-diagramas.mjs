import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const nextDirectory = dirname(require.resolve('next/package.json'));
const sharp = require(require.resolve('sharp', { paths: [nextDirectory] }));
let count = 0;
async function exportDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await exportDirectory(path);
    else if (entry.name.endsWith('.svg') && entry.name !== 'modelo-chen-completo.svg') {
      await sharp(path).png().toFile(path.replace(/\.svg$/, '.png'));
      count++;
    }
  }
}
await exportDirectory('docs');
console.log(`${count} diagramas exportados a PNG junto a sus fuentes SVG.`);
