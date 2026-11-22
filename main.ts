// The Halcyon Vault — entrypoint.
// Copies game/ and screenshots/ from this repository to the output directory
// and writes /output/dossier.json with buildDossier from vendor/makefun-game.ts.
// Node 22 standard library only. Deterministic: the same input bytes always
// produce the same output bytes (sorted directory walk, no timestamps).
import { buildDossier } from './vendor/makefun-game.ts';
import { cp, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const OUT = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const ROOT = resolve(import.meta.dirname);

async function copyTreeSorted(src: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const e of entries) {
    const from = join(src, e.name);
    const to = join(dest, e.name);
    if (e.isDirectory()) {
      await copyTreeSorted(from, to);
    } else if (e.isFile()) {
      await cp(from, to);
    }
  }
}

async function main(): Promise<void> {
  const outDir = resolve(OUT);
  await mkdir(outDir, { recursive: true });
  const gameSrc = join(ROOT, 'game');
  const shotsSrc = join(ROOT, 'screenshots');
  const gameStat = await stat(gameSrc);
  if (!gameStat.isDirectory()) throw new Error('game/ is missing');
  await copyTreeSorted(gameSrc, join(outDir, 'game'));
  await copyTreeSorted(shotsSrc, join(outDir, 'screenshots'));
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 48 * 1024 * 1024,
    game_path_max_bytes: 1000,
  });
  await writeFile(join(outDir, 'dossier.json'), dossier);
}

await main();
