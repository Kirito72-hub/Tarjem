import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseDir = path.join(root, 'release');

if (!fs.existsSync(releaseDir)) {
  process.exit(0);
}

try {
  fs.rmSync(releaseDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
} catch (err) {
  console.warn(
    '[prebuild:clean] Could not remove release/. Close Tarjem/Electron and any Explorer window on that folder.',
  );
  console.warn(
    'Use `npm run build:win:staging` to build into ./out instead, or delete release/ manually and retry.',
  );
  console.warn(err instanceof Error ? err.message : err);
}
